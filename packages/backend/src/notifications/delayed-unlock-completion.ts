import { and, eq, isNull, lte, notExists, or, sql } from "drizzle-orm";
import { findLaProduct, type CurrentActor, type DelayedUnlockCompletedEmailRequest } from "@lasoviet/contracts";
import {
  notificationDeliveries, authUsers, birthProfiles, commerceOrders, commerceEntitlements, walletTransactions, walletPurchaseIntents, walletTopUpContinuations,
  ziweiCharts, type Database,
} from "@lasoviet/database";
import { dailyReadingDate, readPurchasedDailyReading } from "../commerce/daily-wallet-unlock.service.js";
import { readTopUpContinuation } from "../commerce/wallet-topup-continuation.js";
import { createDatabaseReportQueryRepository } from "../reports/report-query.repository.js";
import { createReportQueryService, ReportQueryDataError } from "../reports/report-query.service.js";

export const DELAYED_UNLOCK_WAIT_MS = 5 * 60_000;

/** Presence is an owned command; payment return callbacks and GET polling remain read-only. */
export async function acknowledgeTopUpPresence(database: Database, actor: CurrentActor, orderId: string, now = new Date()): Promise<boolean> {
  if (actor.kind !== "account" || !/^[0-9a-f-]{36}$/i.test(orderId)) return false;
  const [row] = await database.select({ order: commerceOrders, continuation: walletTopUpContinuations })
    .from(walletTopUpContinuations)
    .innerJoin(commerceOrders, and(eq(commerceOrders.id, walletTopUpContinuations.orderId), eq(commerceOrders.ownerId, actor.userId), eq(commerceOrders.kind, "wallet_topup")))
    .innerJoin(authUsers, and(eq(authUsers.id, actor.userId), eq(authUsers.emailVerified, true), eq(authUsers.isAnonymous, false)))
    .where(and(eq(walletTopUpContinuations.orderId, orderId), eq(walletTopUpContinuations.ownerId, actor.userId))).limit(1);
  if (!row) return false;
  await database.update(walletTopUpContinuations).set({
    lastCustomerSeenAt: now,
    ...(row.order.status === "paid" && row.continuation.status === "completed" ? { completionSeenAt: now } : {}),
  }).where(and(eq(walletTopUpContinuations.orderId, orderId), eq(walletTopUpContinuations.ownerId, actor.userId)));
  return true;
}

export function createDelayedUnlockCompletionService(database: Database, options: { now?: () => Date } = {}) {
  const clock = options.now ?? (() => new Date());
  async function requestFor(orderId: string): Promise<DelayedUnlockCompletedEmailRequest | null> {
    const now = clock();
    const cutoff = new Date(now.getTime() - DELAYED_UNLOCK_WAIT_MS);
    const [row] = await database.select({ continuation: walletTopUpContinuations, intent: walletPurchaseIntents, user: authUsers })
      .from(walletTopUpContinuations)
      .innerJoin(commerceOrders, and(eq(commerceOrders.id, walletTopUpContinuations.orderId), eq(commerceOrders.ownerId, walletTopUpContinuations.ownerId), eq(commerceOrders.kind, "wallet_topup"), eq(commerceOrders.status, "paid")))
      .innerJoin(walletPurchaseIntents, and(eq(walletPurchaseIntents.id, walletTopUpContinuations.purchaseIntentId), eq(walletPurchaseIntents.ownerId, walletTopUpContinuations.ownerId), eq(walletPurchaseIntents.status, "completed")))
      .innerJoin(authUsers, and(eq(authUsers.id, walletTopUpContinuations.ownerId), eq(authUsers.emailVerified, true), eq(authUsers.isAnonymous, false)))
      .innerJoin(ziweiCharts, eq(ziweiCharts.id, walletPurchaseIntents.chartId))
      .innerJoin(birthProfiles, and(eq(birthProfiles.id, ziweiCharts.profileId), eq(birthProfiles.userId, authUsers.id), isNull(birthProfiles.deletedAt)))
      .where(and(eq(walletTopUpContinuations.orderId, orderId), eq(walletTopUpContinuations.status, "completed"), isNull(walletTopUpContinuations.completionSeenAt),
        lte(walletTopUpContinuations.completedAt, cutoff), or(isNull(walletTopUpContinuations.lastCustomerSeenAt), lte(walletTopUpContinuations.lastCustomerSeenAt, cutoff)),
      )).limit(1);
    if (!row || !row.continuation.reportId) return null;
    const product = findLaProduct(row.intent.sku);
    if (!product || (row.intent.locale !== "vi" && row.intent.locale !== "en")) return null;
    const { user, intent, continuation } = row;
    const locale = row.intent.locale as "vi" | "en";
    if (intent.sku === "ZIWEI-TODAY-P0") {
      const reading = await readPurchasedDailyReading(database, user.id, intent.chartId, dailyReadingDate(now), now);
      if (!reading || reading.id !== continuation.reportId || reading.chartVersionId !== intent.chartVersionId) return null;
    } else {
      const repository = createDatabaseReportQueryRepository(database, clock);
      const authority = await repository.readAuthorizedReport(user.id, continuation.reportId!);
      const [purchase] = await database.select({ id: commerceEntitlements.id }).from(commerceEntitlements)
        .innerJoin(walletTransactions, and(eq(walletTransactions.id, commerceEntitlements.ledgerSpendId), eq(walletTransactions.purchaseIntentId, intent.id)))
        .where(and(eq(commerceEntitlements.ownerId, user.id), eq(commerceEntitlements.chartId, intent.chartId), eq(commerceEntitlements.sku, intent.sku))).limit(1);
      // The selected purchase itself must still authorize this report, even if another part remains owned.
      if (!authority || authority.reservation.chartVersionId !== intent.chartVersionId ||
        !purchase || !authority.entitlements.some((item) => item.active && item.id === purchase.id)) return null;
      try {
        const result = await createReportQueryService({ repository, now: clock }).getReport({ kind: "account", userId: user.id, sessionId: "delayed-unlock", requestId: `delayed-unlock:${orderId}` }, continuation.reportId!);
        if (!result.ok || !("state" in result.value) || result.value.state !== "ready") return null;
      } catch (error) {
        if (error instanceof ReportQueryDataError) return null;
        throw error;
      }
    }
    const view = await readTopUpContinuation(database, orderId, user.id);
    if (!view) return null;
    return {
      version: 1, kind: "delayed_unlock_completed", idempotencyKey: `delayed-unlock:${orderId}`,
      recipient: user.email.trim().toLowerCase(), locale, actionUrl: new URL(view.returnPath, "https://lasoviet.net").href,
      requestId: `delayed-unlock:${orderId}`, userId: user.id, orderId, sku: intent.sku,
      itemName: product.name[locale],
    };
  }
  return {
    requestFor,
    async isEligible(request: DelayedUnlockCompletedEmailRequest) {
      const current = await requestFor(request.orderId);
      // Retry cannot send an old recipient, unowned link, SKU, or altered payload.
      return current !== null && Object.keys(current).every((key) => current[key as keyof typeof current] === request[key as keyof typeof request]);
    },
    async scan(send: (request: DelayedUnlockCompletedEmailRequest) => Promise<unknown>, limit = 25) {
      const now = clock();
      const rows = await database.select({ orderId: walletTopUpContinuations.orderId }).from(walletTopUpContinuations)
        .where(and(eq(walletTopUpContinuations.status, "completed"), isNull(walletTopUpContinuations.completionSeenAt), lte(walletTopUpContinuations.completedAt, new Date(now.getTime() - DELAYED_UNLOCK_WAIT_MS)),
          notExists(database.select({ id: notificationDeliveries.id }).from(notificationDeliveries).where(eq(notificationDeliveries.idempotencyKey, sql`'delayed-unlock:' || ${walletTopUpContinuations.orderId}`)))))
        .orderBy(sql`${walletTopUpContinuations.lastNoticeCheckAt} nulls first`, walletTopUpContinuations.completedAt)
        .limit(Math.max(1, Math.min(limit, 100)));
      let queued = 0;
      for (const row of rows) {
        await database.update(walletTopUpContinuations).set({ lastNoticeCheckAt: now }).where(eq(walletTopUpContinuations.orderId, row.orderId));
        const request = await requestFor(row.orderId);
        if (request) { await send(request); queued += 1; }
      }
      return queued;
    },
  };
}
