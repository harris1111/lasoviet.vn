import { enqueueCommittedTopUpUnlock } from "./wallet-topup-unlock-event.js";
import { and, eq, isNull } from "drizzle-orm";
import {
  WalletTopUpContinuationRequestV1Schema,
  type WalletTopUpContinuationRequestV1,
  type WalletTopUpContinuationViewV1,
} from "@lasoviet/contracts";
import {
  birthProfiles, deletionRequests, walletAccounts, walletPurchaseIntents, walletTopUpContinuations, ziweiCharts,
  lockFreeAiCoordination, type Database,
} from "@lasoviet/database";
import { createDatabaseWalletRepository } from "../wallet/wallet.repository.js";
import { createWalletService } from "../wallet/wallet.service.js";
import { createWalletUnlockService } from "./wallet-unlock.service.js";

export async function validateTopUpContinuation(database: Database, ownerId: string, locale: string, value: unknown) {
  const parsed = WalletTopUpContinuationRequestV1Schema.safeParse(value);
  if (!parsed.success) return null;
  const request = parsed.data;
  const [intent] = await database.select({ id: walletPurchaseIntents.id }).from(walletPurchaseIntents)
    .innerJoin(ziweiCharts, eq(ziweiCharts.id, walletPurchaseIntents.chartId))
    .innerJoin(birthProfiles, and(eq(birthProfiles.id, ziweiCharts.profileId), eq(birthProfiles.userId, ownerId), isNull(birthProfiles.deletedAt)))
    .where(and(
      eq(walletPurchaseIntents.id, request.purchaseIntentId), eq(walletPurchaseIntents.ownerId, ownerId),
      eq(walletPurchaseIntents.locale, locale), eq(walletPurchaseIntents.status, "pending"),
      eq(walletPurchaseIntents.stateVersion, request.expectedIntentVersion), eq(walletPurchaseIntents.priceLa, request.confirmedPriceLa),
    )).limit(1);
  return intent ? request : null;
}

export function matchesTopUpContinuation(row: typeof walletTopUpContinuations.$inferSelect | undefined, request: WalletTopUpContinuationRequestV1 | undefined) {
  if (!row || !request) return !row && !request;
  return row.purchaseIntentId === request.purchaseIntentId && row.intentStateVersion === request.expectedIntentVersion &&
    row.confirmedPriceLa === request.confirmedPriceLa && row.returnTab === request.returnTab && row.returnOpen === (request.returnOpen ?? null);
}

class ContinuationBlocked extends Error {}

/** Credit is committed even when the separately confirmed unlock is no longer valid. */
export async function completeTopUpContinuation(database: Database, orderId: string, ownerId: string, options: NonNullable<Parameters<typeof createWalletUnlockService>[2]> & {beforeCommit?: () => Promise<void>}) {
  const now = options.now ?? (() => new Date());
  try {
    await database.transaction(async (transaction) => {
      // Standalone calls fence before locks; settlement already holds this reentrant fence.
      await lockFreeAiCoordination(transaction);
      const [continuation] = await transaction.select().from(walletTopUpContinuations)
        .where(and(eq(walletTopUpContinuations.orderId, orderId), eq(walletTopUpContinuations.ownerId, ownerId))).limit(1).for("update");
      if (!continuation || continuation.status !== "pending") return;
      const [deletion] = await transaction.select({status: deletionRequests.status}).from(deletionRequests).where(eq(deletionRequests.userId, ownerId)).limit(1);
      if (deletion?.status === "purged") throw new ContinuationBlocked("WALLET_ACCOUNT_INELIGIBLE");
      const [intent] = await transaction.select().from(walletPurchaseIntents).where(and(eq(walletPurchaseIntents.id, continuation.purchaseIntentId), eq(walletPurchaseIntents.ownerId, ownerId))).limit(1);
      if (!intent || intent.status !== "pending" || intent.stateVersion !== continuation.intentStateVersion || intent.priceLa !== continuation.confirmedPriceLa) throw new ContinuationBlocked("INTENT_TERMS_CHANGED");
      const [account] = await transaction.select().from(walletAccounts).where(eq(walletAccounts.ownerId, ownerId)).limit(1);
      if (!account) throw new ContinuationBlocked("WALLET_UNAVAILABLE");
      const service = createWalletUnlockService(transaction, createWalletService(createDatabaseWalletRepository(transaction, { now })), options);
      const result = await service.unlock({ kind: "account", userId: ownerId, requestId: `topup-continuation:${orderId}`, sessionId: `topup:${orderId}` }, {
        purchaseIntentId: continuation.purchaseIntentId, expectedIntentVersion: continuation.intentStateVersion,
        expectedWalletVersion: account.stateVersion, idempotencyKey: `topup-unlock:${orderId}`,
      });
      if (!result.ok) throw new ContinuationBlocked(result.code);
      const outcome = result.value;
      await transaction.update(walletTopUpContinuations).set({ status: "completed", reportId: outcome.reportId, remainingLa: outcome.balance.totalLa, completedAt: now() })
        .where(and(eq(walletTopUpContinuations.orderId, orderId), eq(walletTopUpContinuations.ownerId, ownerId), eq(walletTopUpContinuations.status, "pending")));
      await enqueueCommittedTopUpUnlock(transaction, ownerId, orderId);
      await options.beforeCommit?.();
    });
  } catch (error) {
    await database.update(walletTopUpContinuations).set({ status: "blocked", errorCode: error instanceof ContinuationBlocked ? error.message : "UNLOCK_UNAVAILABLE", completedAt: now() })
      .where(and(eq(walletTopUpContinuations.orderId, orderId), eq(walletTopUpContinuations.ownerId, ownerId), eq(walletTopUpContinuations.status, "pending")));
  }
}

export async function readTopUpContinuation(database: Database, orderId: string, ownerId: string): Promise<WalletTopUpContinuationViewV1 | null> {
  const [row] = await database.select({ continuation: walletTopUpContinuations, intent: walletPurchaseIntents })
    .from(walletTopUpContinuations).innerJoin(walletPurchaseIntents, and(eq(walletPurchaseIntents.id, walletTopUpContinuations.purchaseIntentId), eq(walletPurchaseIntents.ownerId, ownerId)))
    .where(and(eq(walletTopUpContinuations.orderId, orderId), eq(walletTopUpContinuations.ownerId, ownerId))).limit(1);
  if (!row) return null;
  const prefix = row.intent.locale === "en" ? "/en" : "";
  const params = new URLSearchParams({ tab: row.continuation.returnTab, topupOrder: orderId });
  if (row.continuation.returnOpen) params.set("open", row.continuation.returnOpen);
  return {
    status: row.continuation.status as WalletTopUpContinuationViewV1["status"],
    unlockedSku: row.intent.sku,
    purchaseIntentId: row.intent.id,
    chartVersionId: row.intent.chartVersionId,
    returnPath: `${prefix}/la-so/${encodeURIComponent(row.intent.chartId)}?${params}`,
    reportId: row.intent.sku === "ZIWEI-TODAY-P0" ? null : row.continuation.reportId,
    remainingLa: row.continuation.remainingLa, errorCode: row.continuation.errorCode,
  };
}
