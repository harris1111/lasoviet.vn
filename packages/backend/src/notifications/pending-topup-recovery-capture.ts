import { randomUUID } from "node:crypto";
import { and, eq, gt, isNull, lte, notExists, sql } from "drizzle-orm";
import {
  commerceOrders,
  lockFreeAiCoordination, lockRecoveryCaptureCoordination, notificationDeliveries,
  outbox, walletTopUpContinuations, type Database,
} from "@lasoviet/database";
import { PENDING_TOPUP_RECOVERY_DELAY_MS, readPendingTopUpRecoveryEligibility } from "./pending-topup-recovery-eligibility.js";
import { renderPendingTopUpRecoveryEmail } from "./pending-topup-recovery-email.js";

import { recoveryChartHasCapacity } from "./recovery-capture-cap.js";

export const RECOVERY_CAPTURE_EVENT_TYPE = "notification.recovery.captured.v1";
export { PENDING_TOPUP_RECOVERY_DELAY_MS } from "./pending-topup-recovery-eligibility.js";

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
          const source = await readPendingTopUpRecoveryEligibility(transaction, options, candidate.id, now);
          if (!source) continue;
          const { order, intent, product, user, recipientFingerprint } = source;
          if (!await recoveryChartHasCapacity(transaction, intent.chartId)) continue;
          const idempotencyKey = `recovery-pending-topup:${order.id}`;
          const deliveryId = randomUUID();
          const message = renderPendingTopUpRecoveryEmail({
            userId: user.id, email: user.email, orderId: order.id, deliveryId,
            locale: intent.locale as "vi" | "en", productSku: intent.sku, amountLa: intent.priceLa,
            topUpSku: order.sku, topUpVnd: order.amount, tokenSecret: options.tokenSecret, now,
          });
          const [delivery] = await transaction.insert(notificationDeliveries).values({
            id: deliveryId, idempotencyKey, kind: "recovery_pending_topup", status: "captured",
            recipientFingerprint, attemptCount: 0, lastErrorCode: "RECOVERY_CAPTURE_ONLY",
            requestPayload: { version: 1, userId: user.id, chartId: intent.chartId, chartVersionId: intent.chartVersionId,
              orderId: order.id, intentId: intent.id, intentStateVersion: intent.stateVersion,
              locale: intent.locale, productTitle: product.name[intent.locale as "vi" | "en"], amountLa: intent.priceLa,
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
