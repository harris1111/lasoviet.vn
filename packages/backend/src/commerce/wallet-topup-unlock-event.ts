import { and, eq, sql } from "drizzle-orm";
import { LaSkuSchema, WalletTransactionReceiptV1Schema, z } from "@lasoviet/contracts";
import { reportReservationAuthority } from "../reports/natal-report-authority.js";
import {
  commerceEntitlements, reportReservations, commerceOrders, dailyReadingUnlocks, outbox, walletAccounts, walletCommandReceipts, walletLedgerEntries,
  walletPurchaseIntents, walletTopUpContinuations, walletTransactions, type Database,
} from "@lasoviet/database";

export const WALLET_TOPUP_UNLOCK_EVENT_TYPE = "wallet.topup.unlock.committed.v1";
export const WalletTopUpUnlockEventPayloadSchema = z.object({orderId: z.string().uuid(), transactionId: z.string().uuid()}).strict();
const historicalReportContinuation = z.object({
  entitlementId: z.string().uuid(), reservationId: z.string().uuid(), reportId: z.string().uuid(),
  reportVersionId: z.string().uuid(), outboxId: z.string().uuid(), intentId: z.string().uuid(),
  intentStateVersion: z.number().int().positive(), creditProof: z.unknown().optional(), annual: z.unknown().optional(),
}).strict();

/** Historical confirmed fulfillment, independent of subsequent wallet activity/refunds. */
export async function projectCommittedTopUpUnlock(db: Database, ownerId: string, orderId: string) {
  const key = `topup-unlock:${orderId}`;
  const [source] = await db.select({continuation: walletTopUpContinuations, order: commerceOrders,
    receipt: walletCommandReceipts, spend: walletTransactions, wallet: walletAccounts, intent: walletPurchaseIntents})
    .from(walletTopUpContinuations)
    .innerJoin(commerceOrders, eq(commerceOrders.id, walletTopUpContinuations.orderId))
    .innerJoin(walletPurchaseIntents, eq(walletPurchaseIntents.id, walletTopUpContinuations.purchaseIntentId))
    .innerJoin(walletTransactions, and(eq(walletTransactions.purchaseIntentId, walletPurchaseIntents.id), eq(walletTransactions.idempotencyKey, key)))
    .innerJoin(walletAccounts, eq(walletAccounts.id, walletTransactions.walletId))
    .innerJoin(walletCommandReceipts, and(eq(walletCommandReceipts.transactionId, walletTransactions.id), eq(walletCommandReceipts.walletId, walletAccounts.id)))
    .where(and(eq(walletTopUpContinuations.orderId, orderId), eq(walletTopUpContinuations.ownerId, ownerId),
      eq(commerceOrders.ownerId, ownerId), eq(commerceOrders.kind, "wallet_topup"), eq(commerceOrders.status, "paid"),
      eq(walletTopUpContinuations.status, "completed"), eq(walletPurchaseIntents.ownerId, ownerId), eq(walletPurchaseIntents.status, "completed"),
      eq(walletAccounts.ownerId, ownerId), eq(walletTransactions.kind, "spend"),
      sql`COALESCE((SELECT sum(${walletLedgerEntries.amountLa}) FROM ${walletLedgerEntries} WHERE ${walletLedgerEntries.transactionId} = ${walletTransactions.id}), 0) = -${walletPurchaseIntents.priceLa}`)).limit(1);
  if (!source) return null;
  const parsed = WalletTransactionReceiptV1Schema.safeParse((source.receipt.result as {receipt?: unknown})?.receipt);
  const sku = LaSkuSchema.safeParse(source.intent.sku);
  if (!parsed.success || !sku.success || !source.intent.completedAt || !source.continuation.completedAt ||
      source.continuation.intentStateVersion + 1 !== source.intent.stateVersion || source.continuation.confirmedPriceLa !== source.intent.priceLa ||
      source.receipt.idempotencyKey !== key || source.receipt.fingerprint !== source.spend.fingerprint ||
      parsed.data.commandId !== key || parsed.data.transactionId !== source.spend.id || parsed.data.status !== "completed" ||
      parsed.data.balance.totalLa !== source.continuation.remainingLa) return null;
  // These clocks are sampled separately; the immutable posted receipt defines the event time.
  const occurredAt = new Date(parsed.data.completedAt);
  if (source.spend.createdAt.getTime() > occurredAt.getTime() ||
      source.intent.completedAt.getTime() > source.continuation.completedAt.getTime() ||
      occurredAt.getTime() > source.continuation.completedAt.getTime()) return null;
  if (source.intent.sku === "ZIWEI-TODAY-P0") {
    const stored = source.receipt.result as {continuation?: {readingId?: string}};
    const [daily] = await db.select().from(dailyReadingUnlocks).where(and(
      eq(dailyReadingUnlocks.id, stored.continuation?.readingId ?? "00000000-0000-0000-0000-000000000000"),
      eq(dailyReadingUnlocks.ownerId, ownerId), eq(dailyReadingUnlocks.chartId, source.intent.chartId),
      eq(dailyReadingUnlocks.chartVersionId, source.intent.chartVersionId), eq(dailyReadingUnlocks.ledgerSpendId, source.spend.id))).limit(1);
    const date = new Intl.DateTimeFormat("en-CA", {timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit"}).format(source.intent.completedAt);
    if (!daily || daily.readingDate !== date || source.continuation.reportId !== daily.id) return null;
  } else {
    const fulfillment = historicalReportContinuation.safeParse((source.receipt.result as {continuation?: unknown})?.continuation);
    if (!fulfillment.success || fulfillment.data.intentId !== source.intent.id ||
        fulfillment.data.intentStateVersion !== source.intent.stateVersion ||
        fulfillment.data.reportId !== source.continuation.reportId) return null;
    const proof = fulfillment.data;
    // Historical authority survives refunds and revocation; current read access is checked separately.
    const [lineage] = await db.select({entitlement: commerceEntitlements, reservation: reportReservations})
      .from(commerceEntitlements).innerJoin(reportReservations, reportReservationAuthority(db))
      .where(and(eq(commerceEntitlements.id, proof.entitlementId), eq(commerceEntitlements.ownerId, ownerId),
        eq(commerceEntitlements.ledgerSpendId, source.spend.id), eq(commerceEntitlements.chartId, source.intent.chartId),
        eq(reportReservations.id, proof.reservationId), eq(reportReservations.reportId, proof.reportId),
        eq(reportReservations.reportVersionId, proof.reportVersionId), eq(reportReservations.chartVersionId, source.intent.chartVersionId),
        eq(reportReservations.locale, source.intent.locale))).limit(1);
    const entitlementSku = source.intent.sku === "ZIWEI-COMBO-2026-P0" ? "ZIWEI-IDENTITY-P0" : source.intent.sku;
    if (!lineage || lineage.entitlement.sku !== entitlementSku ||
        (source.intent.sku !== "ZIWEI-COMBO-2026-P0" && lineage.entitlement.periodKey !== source.intent.periodKey)) return null;
  }
  // Zero-price regular receipts legitimately have a posted zero transaction and no allocations.
  const allocations = await db.select({amount: walletLedgerEntries.amountLa}).from(walletLedgerEntries).where(eq(walletLedgerEntries.transactionId, source.spend.id));
  if (source.intent.priceLa === 0 ? allocations.length !== 0 : allocations.length === 0 || allocations.some(entry => entry.amount >= 0)) return null;
  return {transactionId: source.spend.id, sku: sku.data, amount: source.intent.priceLa,
    balanceAfter: parsed.data.balance.totalLa, occurredAt};
}

export async function enqueueCommittedTopUpUnlock(db: Database, ownerId: string, orderId: string) {
  const proof = await projectCommittedTopUpUnlock(db, ownerId, orderId);
  if (!proof) throw new Error("WALLET_TOPUP_UNLOCK_PROOF_INVALID");
  await db.insert(outbox).values({schemaVersion: 1, eventType: WALLET_TOPUP_UNLOCK_EVENT_TYPE,
    eventId: `wallet-topup-unlock:${proof.transactionId}`, occurredAt: proof.occurredAt,
    traceId: `topup-continuation:${orderId}`, actorId: ownerId, aggregateType: "account", aggregateId: ownerId,
    idempotencyKey: `wallet-topup-unlock:${proof.transactionId}`, payload: {orderId, transactionId: proof.transactionId},
    availableAt: proof.occurredAt, createdAt: proof.occurredAt, updatedAt: proof.occurredAt});
}

/** Prefixes are hints only: require the owned completed receipt and its actual outbox. */
export async function hasDurableTopUpUnlock(db: Database, ownerId: string, intentId: string, commandKey: string) {
  const [row] = await db.select({orderId: walletTopUpContinuations.orderId}).from(walletTopUpContinuations)
    .where(and(eq(walletTopUpContinuations.ownerId, ownerId), eq(walletTopUpContinuations.purchaseIntentId, intentId),
      eq(walletTopUpContinuations.status, "completed"))).limit(1);
  if (!row || commandKey !== `topup-unlock:${row.orderId}`) return false;
  const proof = await projectCommittedTopUpUnlock(db, ownerId, row.orderId);
  if (!proof) return false;
  const [event] = await db.select().from(outbox).where(and(
    eq(outbox.eventType, WALLET_TOPUP_UNLOCK_EVENT_TYPE), eq(outbox.actorId, ownerId),
    eq(outbox.eventId, `wallet-topup-unlock:${proof.transactionId}`))).limit(1);
  const payload = WalletTopUpUnlockEventPayloadSchema.safeParse(event?.payload);
  return Boolean(event && payload.success && payload.data.orderId === row.orderId && payload.data.transactionId === proof.transactionId &&
    event.schemaVersion === 1 && event.aggregateType === "account" && event.aggregateId === ownerId &&
    event.idempotencyKey === event.eventId && event.occurredAt.getTime() === proof.occurredAt.getTime());
}
