import { and, desc, eq, gt, isNull, or } from "drizzle-orm";
import { findLaProduct, PendingUnlockHintV1Schema, type CurrentActor, type PendingUnlockHintV1 } from "@lasoviet/contracts";
import { authUsers, birthProfiles, commerceOrders, deletionRequests, lockFreeAiCoordination,
  walletPurchaseIntents, walletTopUpContinuations, ziweiCharts, ziweiChartVersions, type Database } from "@lasoviet/database";
import { createWalletService } from "../wallet/wallet.service.js";
import { createDatabaseWalletRepository } from "../wallet/wallet.repository.js";
import { createWalletUnlockService } from "./wallet-unlock.service.js";
import { currentReportVersions, type ReportVersionResolver } from "../reports/identity-report-config.js";

/** Read-only recovery: never creates an intent, order, wallet grant or notification. */
export async function readPendingUnlockHint(database: Database, actor: CurrentActor, locale: "vi" | "en", options: {
  now?: () => Date; reportVersionResolver?: ReportVersionResolver; orderTtlSeconds?: number;
} = {}): Promise<PendingUnlockHintV1 | null> {
  if (actor.kind !== "account") return null;
  const now = options.now ?? (() => new Date());
  const ttl = options.orderTtlSeconds ?? 86400;
  if (!Number.isSafeInteger(ttl) || ttl <= 0) throw new Error("PENDING_UNLOCK_TTL_INVALID");
  return database.transaction(async transaction => {
    await lockFreeAiCoordination(transaction);
    const [user] = await transaction.select().from(authUsers).where(eq(authUsers.id, actor.userId));
    if (!user || !user.emailVerified || user.isAnonymous) return null;
    const [deletion] = await transaction.select({ status: deletionRequests.status }).from(deletionRequests).where(eq(deletionRequests.userId, user.id));
    if (deletion && deletion.status !== "cancelled") return null;
    const candidates = await transaction.select({ intent: walletPurchaseIntents }).from(walletPurchaseIntents)
      .innerJoin(ziweiCharts, eq(ziweiCharts.id, walletPurchaseIntents.chartId))
      .innerJoin(birthProfiles, and(eq(birthProfiles.id, ziweiCharts.profileId), eq(birthProfiles.userId, user.id), isNull(birthProfiles.deletedAt)))
      .where(and(eq(walletPurchaseIntents.ownerId, user.id), eq(walletPurchaseIntents.status, "pending"), eq(walletPurchaseIntents.locale, locale)))
      .orderBy(desc(walletPurchaseIntents.createdAt), desc(walletPurchaseIntents.id)).limit(20);
    const wallet = createWalletService(createDatabaseWalletRepository(transaction, { now }));
    const balance = await wallet.readBalance(actor);
    if (!balance.ok) return null;
    const unlock = createWalletUnlockService(transaction, wallet, { now, reportVersionResolver: options.reportVersionResolver ?? currentReportVersions });
    for (const { intent } of candidates) {
      const product = findLaProduct(intent.sku);
      if (!product || product.availability !== "active" || !product.locales.includes(locale)) continue;
      const [version] = await transaction.select({ id: ziweiChartVersions.id }).from(ziweiChartVersions)
        .where(eq(ziweiChartVersions.chartId, intent.chartId)).orderBy(desc(ziweiChartVersions.createdAt), desc(ziweiChartVersions.id)).limit(1);
      if (version?.id !== intent.chartVersionId) continue;
      const [payment] = await transaction.select({ id: commerceOrders.id }).from(commerceOrders)
        .innerJoin(walletTopUpContinuations, eq(walletTopUpContinuations.orderId, commerceOrders.id))
        .where(and(eq(commerceOrders.ownerId, user.id), eq(walletTopUpContinuations.purchaseIntentId, intent.id),
          eq(walletTopUpContinuations.status, "pending"), or(eq(commerceOrders.status, "paid"), and(eq(commerceOrders.status, "pending"), gt(commerceOrders.createdAt, new Date(now().getTime() - ttl * 1000)))))).limit(1);
      if (payment) continue;
      const quotes = await unlock.readQuotes(actor, { chartId: intent.chartId, chartVersionId: intent.chartVersionId, locale });
      if (!quotes.ok) continue;
      const quote = quotes.value.quotes.find(item => item.sku === intent.sku);
      if (quote?.state !== "available" || quote.priceLa !== intent.priceLa || balance.value.totalLa >= intent.priceLa) continue;
      const hint = PendingUnlockHintV1Schema.safeParse({ version: 1, ownerId: user.id, intentId: intent.id,
        chartId: intent.chartId, chartVersionId: intent.chartVersionId, sku: intent.sku, locale,
        priceLa: intent.priceLa, balanceLa: balance.value.totalLa, gapLa: intent.priceLa - balance.value.totalLa });
      if (hint.success) return hint.data;
    }
    return null;
  });
}
