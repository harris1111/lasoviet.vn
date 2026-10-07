import { randomUUID } from "node:crypto";
import { and, desc, eq, gt, isNull, lte, notExists, or, sql } from "drizzle-orm";
import { findLaProduct, WalletTopUpCatalogV1 } from "@lasoviet/contracts";
import {
  authUsers, birthProfiles, commerceOrders, consents, deletionRequests,
  lockFreeAiCoordination, lockRecoveryCaptureCoordination, notificationDeliveries, notificationPreferences,
  outbox, walletPurchaseIntents, walletTopUpContinuations, ziweiCharts,
  ziweiChartVersions, type Database,
} from "@lasoviet/database";
import { fingerprintEmail } from "./notification-preference.js";
import { renderPendingTopUpRecoveryEmail } from "./pending-topup-recovery-email.js";

export const RECOVERY_CAPTURE_EVENT_TYPE = "notification.recovery.captured.v1";
export const PENDING_TOPUP_RECOVERY_DELAY_MS = 30 * 60 * 1000;

/** Private test captures only: this service cannot send mail or mutate commerce. */
export function createPendingTopUpRecoveryCaptureService(options: {
  database: Database;
  mode?: "disabled" | "capture";
  tokenSecret: string;
  orderTtlSeconds: number;
  now?: () => Date;
}) {
  const { database } = options;
  if (!Number.isSafeInteger(options.orderTtlSeconds) || options.orderTtlSeconds <= 0) {
    throw new Error("RECOVERY_ORDER_TTL_INVALID");
  }
  const nowValue = options.now ?? (() => new Date());
  return {
    async scanAndCapture(limit = 25): Promise<number> {
      if (options.mode !== "capture" || options.orderTtlSeconds * 1000 <= PENDING_TOPUP_RECOVERY_DELAY_MS) return 0;
      if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new Error("RECOVERY_LIMIT_INVALID");
      return database.transaction(async (transaction) => {
        // Always acquire the purge/preference fence before reading eligibility.
        await lockFreeAiCoordination(transaction);
        await lockRecoveryCaptureCoordination(transaction);
        const now = nowValue();
        const cutoff = new Date(now.getTime() - PENDING_TOPUP_RECOVERY_DELAY_MS);
        const expiresBefore = new Date(now.getTime() - options.orderTtlSeconds * 1000);
        const candidates = await transaction.select({ id: commerceOrders.id }).from(commerceOrders)
          .innerJoin(walletTopUpContinuations, eq(walletTopUpContinuations.orderId, commerceOrders.id))
          .where(and(eq(commerceOrders.kind, "wallet_topup"), eq(commerceOrders.status, "pending"),
            isNull(commerceOrders.paidAt), lte(commerceOrders.createdAt, cutoff), gt(commerceOrders.createdAt, expiresBefore),
            eq(walletTopUpContinuations.status, "pending"),
            notExists(transaction.select({ id: notificationDeliveries.id }).from(notificationDeliveries)
              .where(eq(notificationDeliveries.idempotencyKey, sql`'recovery-pending-topup:' || ${commerceOrders.id}`)))))
          .orderBy(commerceOrders.createdAt, commerceOrders.id).limit(limit);
        let captured = 0;
        for (const candidate of candidates) {
          // Respect settlement's order -> continuation -> intent lock order. Busy
          // rows are skipped instead of waiting on a wallet/account authority lock.
          const [order] = await transaction.select().from(commerceOrders).where(eq(commerceOrders.id, candidate.id))
            .for("update", { skipLocked: true });
          if (!order || order.kind !== "wallet_topup" || order.status !== "pending" || order.paidAt ||
              order.createdAt > cutoff || order.createdAt <= expiresBefore ||
              (order.creditExpiresAt !== null && order.creditExpiresAt <= now)) continue;
          const [continuation] = await transaction.select().from(walletTopUpContinuations)
            .where(eq(walletTopUpContinuations.orderId, order.id)).for("update", { skipLocked: true });
          if (!continuation || continuation.status !== "pending" || continuation.ownerId !== order.ownerId) continue;
          const [intent] = await transaction.select().from(walletPurchaseIntents)
            .where(eq(walletPurchaseIntents.id, continuation.purchaseIntentId)).for("share", { skipLocked: true });
          if (!intent || intent.ownerId !== order.ownerId || intent.status !== "pending" ||
              intent.stateVersion !== continuation.intentStateVersion || intent.priceLa !== continuation.confirmedPriceLa ||
              intent.locale !== order.locale || intent.periodKey !== "lifetime") continue;
          const product = findLaProduct(intent.sku);
          // Timed rollover/member quotes need their own deadline proof. This bounded
          // milestone conservatively excludes every discounted or held intent.
          if (!product || product.availability !== "active" || intent.priceLa !== product.priceLa ||
              (intent.locale !== "vi" && intent.locale !== "en") || !product.locales.includes(intent.locale)) continue;
          const pack = WalletTopUpCatalogV1.find(item => item.id === order.sku);
          if (!pack || order.amount !== pack.vndAmount || order.currency !== "VND") continue;
          const [user] = await transaction.select().from(authUsers).where(eq(authUsers.id, order.ownerId))
            .for("share", { skipLocked: true });
          if (!user || !user.emailVerified || user.isAnonymous) continue;
          const [deletion] = await transaction.select({ status: deletionRequests.status }).from(deletionRequests)
            .where(eq(deletionRequests.userId, user.id));
          if (deletion && deletion.status !== "cancelled") continue;
          const [consent] = await transaction.select().from(consents)
            .where(and(eq(consents.userId, user.id), eq(consents.purpose, "offers")))
            .orderBy(desc(consents.grantedAt), desc(consents.id)).limit(1).for("share", { skipLocked: true });
          if (!consent || consent.revokedAt !== null) continue;
          const recipientFingerprint = fingerprintEmail(user.email, options.tokenSecret);
          const preferences = await transaction.select().from(notificationPreferences)
            .where(or(eq(notificationPreferences.userId, user.id), eq(notificationPreferences.emailFingerprint, recipientFingerprint)));
          if (preferences.some(item => item.unsubscribedAll || !item.nurtureEmailsAllowed)) continue;
          const [chart] = await transaction.select({ profileId: ziweiCharts.profileId }).from(ziweiCharts)
            .where(eq(ziweiCharts.id, intent.chartId));
          if (!chart) continue;
          const [profile] = await transaction.select().from(birthProfiles).where(eq(birthProfiles.id, chart.profileId))
            .for("share", { skipLocked: true });
          if (!profile || profile.userId !== user.id || profile.deletedAt !== null) continue;
          const [version] = await transaction.select({ id: ziweiChartVersions.id }).from(ziweiChartVersions)
            .where(eq(ziweiChartVersions.chartId, intent.chartId)).orderBy(desc(ziweiChartVersions.createdAt), desc(ziweiChartVersions.id)).limit(1);
          if (version?.id !== intent.chartVersionId) continue;
          const [count] = await transaction.select({ count: sql<number>`count(*)::integer` }).from(notificationDeliveries)
            .where(and(eq(notificationDeliveries.kind, "recovery_pending_topup"),
              sql`${notificationDeliveries.requestPayload}->>'chartId' = ${intent.chartId}`));
          if ((count?.count ?? 0) >= 2) continue;
          const idempotencyKey = `recovery-pending-topup:${order.id}`;
          const deliveryId = randomUUID();
          const message = renderPendingTopUpRecoveryEmail({
            userId: user.id, email: user.email, orderId: order.id, deliveryId,
            locale: intent.locale, productSku: intent.sku, amountLa: intent.priceLa,
            topUpSku: order.sku, topUpVnd: order.amount, tokenSecret: options.tokenSecret, now,
          });
          const [delivery] = await transaction.insert(notificationDeliveries).values({
            id: deliveryId, idempotencyKey, kind: "recovery_pending_topup", status: "captured",
            recipientFingerprint, attemptCount: 0, lastErrorCode: "RECOVERY_CAPTURE_ONLY",
            requestPayload: { version: 1, userId: user.id, chartId: intent.chartId, chartVersionId: intent.chartVersionId,
              orderId: order.id, intentId: intent.id, intentStateVersion: intent.stateVersion,
              locale: intent.locale, productTitle: product.name[intent.locale], amountLa: intent.priceLa,
              topUpVnd: order.amount, ...message,
            }, createdAt: now, updatedAt: now,
          }).onConflictDoNothing().returning({ id: notificationDeliveries.id });
          if (!delivery) continue;
          // This records completed capture, never queued or delivered email.
          await transaction.insert(outbox).values({ schemaVersion: 1, eventType: RECOVERY_CAPTURE_EVENT_TYPE,
            eventId: idempotencyKey, idempotencyKey, occurredAt: now, traceId: idempotencyKey,
            actorId: user.id, aggregateType: "account", aggregateId: user.id,
            payload: { deliveryId: delivery.id, orderId: order.id, chartVersionId: intent.chartVersionId },
            status: "processed", processedAt: now, availableAt: now, createdAt: now, updatedAt: now,
          });
          captured += 1;
        }
        return captured;
      });
    },
  };
}
