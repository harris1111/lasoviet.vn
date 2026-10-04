import {and, eq, sql} from "drizzle-orm";
import {findLaProduct, WalletTransactionReceiptV1Schema} from "@lasoviet/contracts";
import {
  commerceEntitlements, outbox, walletAccounts, walletCommandReceipts, walletCreditLots, walletLedgerEntries,
  walletPurchaseIntents, walletRestorationAllocations, walletSpendAllocations, walletTransactions,
  type Database, type reportReservations,
} from "@lasoviet/database";

export type Reservation = typeof reportReservations.$inferSelect;
export type ReportEntitlement = typeof commerceEntitlements.$inferSelect;

/** Original debit proof is distinct from current entitlement availability. */
export async function readReportWalletSpendProof(database: Database, reservation: Reservation, entitlement: ReportEntitlement) {
  if (!entitlement.ledgerSpendId || entitlement.orderId !== null) return null;
  const [row] = await database.select({spend: walletTransactions, wallet: walletAccounts,
    intent: walletPurchaseIntents, command: walletCommandReceipts})
    .from(walletTransactions)
    .innerJoin(walletAccounts, eq(walletAccounts.id, walletTransactions.walletId))
    .innerJoin(walletPurchaseIntents, eq(walletPurchaseIntents.id, walletTransactions.purchaseIntentId))
    .innerJoin(walletCommandReceipts, eq(walletCommandReceipts.transactionId, walletTransactions.id))
    .where(and(eq(walletTransactions.id, entitlement.ledgerSpendId), eq(walletTransactions.kind, "spend"))).limit(1);
  if (!row || row.wallet.ownerId !== entitlement.ownerId || row.intent.ownerId !== entitlement.ownerId ||
      row.intent.chartId !== entitlement.chartId || row.intent.chartVersionId !== reservation.chartVersionId ||
      row.intent.locale !== reservation.locale || row.intent.sku !== entitlement.sku ||
      row.intent.periodKey !== entitlement.periodKey || row.intent.status !== "completed" || !row.intent.completedAt ||
      row.spend.reversalOfTransactionId !== null || row.command.walletId !== row.wallet.id ||
      row.command.idempotencyKey !== row.spend.idempotencyKey || row.command.fingerprint !== row.spend.fingerprint) return null;
  const product = findLaProduct(row.intent.sku);
  if (!product || !(["natal", "palace", "topic"].includes(product.category) ||
      ["ZIWEI-MONTHLY-P0", "ZIWEI-YEAR-2026-P0"].includes(product.sku)) ||
      !Number.isSafeInteger(row.intent.priceLa) || row.intent.priceLa < 0) return null;
  const stored = row.command.result as {receipt?: unknown; continuation?: {intentId?: string; intentStateVersion?: number; entitlementId?: string; reservationId?: string; reportId?: string; reportVersionId?: string; outboxId?: string}};
  const receipt = WalletTransactionReceiptV1Schema.safeParse(stored.receipt);
  if (!receipt.success || receipt.data.status !== "completed" || receipt.data.transactionId !== row.spend.id ||
      receipt.data.commandId !== row.spend.idempotencyKey || stored.continuation?.intentId !== row.intent.id ||
      stored.continuation.intentStateVersion !== row.intent.stateVersion ||
      stored.continuation.entitlementId !== entitlement.id || stored.continuation.reservationId !== reservation.id ||
      stored.continuation.reportId !== reservation.reportId || ![stored.continuation.reportVersionId, stored.continuation.outboxId].every(id =>
        typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))) return null;
  // Current-version recovery preserves reservation/report identity; the receipt
  // remains bound to its original durable generation request, not the replacement version.
  const [request] = await database.select().from(outbox).where(eq(outbox.id, stored.continuation.outboxId!)).limit(1);
  const payload = request?.payload as {reportId?: string; reportVersionId?: string; entitlementId?: string; chartVersionId?: string} | undefined;
  if (!request || request.eventType !== "report.generation.requested.v1" && request.eventType !== "report.generation.requested.v2" ||
      request.actorId !== entitlement.ownerId || request.aggregateType !== "report" || request.aggregateId !== reservation.reportId ||
      request.idempotencyKey !== `report-request:${stored.continuation.reportVersionId}` ||
      payload?.reportId !== reservation.reportId || payload.reportVersionId !== stored.continuation.reportVersionId ||
      payload.entitlementId !== reservation.entitlementId || payload.chartVersionId !== reservation.chartVersionId) return null;
  const allocations = await database.select({allocation: walletSpendAllocations, lot: walletCreditLots})
    .from(walletSpendAllocations).innerJoin(walletCreditLots, eq(walletCreditLots.id, walletSpendAllocations.creditLotId))
    .where(eq(walletSpendAllocations.spendTransactionId, row.spend.id));
  const debits = {purchased: 0, promotional: 0};
  for (const {allocation, lot} of allocations) {
    if (lot.walletId !== row.wallet.id || allocation.bucket !== lot.bucket || allocation.amountLa <= 0 ||
        !["purchased", "promotional"].includes(allocation.bucket) ||
        allocation.purchasedLa !== (allocation.bucket === "purchased" ? allocation.amountLa : 0)) return null;
    debits[allocation.bucket as keyof typeof debits] += allocation.amountLa;
  }
  if (debits.purchased + debits.promotional !== row.intent.priceLa) return null;
  const ledger = await database.select().from(walletLedgerEntries).where(eq(walletLedgerEntries.transactionId, row.spend.id));
  if (ledger.some(item => item.amountLa !== -debits[item.bucket as keyof typeof debits]) ||
      ledger.reduce((sum, item) => sum + item.amountLa, 0) !== -row.intent.priceLa) return null;
  return {...row, allocations, debits};
}

/** The posted reversal and receipt must restore every original allocation exactly. */
export async function readReportWalletRestorationProof(database: Database, proof: NonNullable<Awaited<ReturnType<typeof readReportWalletSpendProof>>>) {
  const [row] = await database.select({restoration: walletTransactions, command: walletCommandReceipts})
    .from(walletTransactions).innerJoin(walletCommandReceipts, eq(walletCommandReceipts.transactionId, walletTransactions.id))
    .where(and(eq(walletTransactions.kind, "restoration"), eq(walletTransactions.reversalOfTransactionId, proof.spend.id))).limit(1);
  if (!row || row.restoration.walletId !== proof.wallet.id || row.command.walletId !== proof.wallet.id ||
      row.command.idempotencyKey !== row.restoration.idempotencyKey || row.command.fingerprint !== row.restoration.fingerprint) return null;
  const receipt = WalletTransactionReceiptV1Schema.safeParse(row.command.result.receipt);
  if (!receipt.success || receipt.data.status !== "completed" || receipt.data.transactionId !== row.restoration.id ||
      receipt.data.commandId !== row.restoration.idempotencyKey) return null;
  const restored = await database.select().from(walletRestorationAllocations)
    .where(eq(walletRestorationAllocations.restorationTransactionId, row.restoration.id));
  if (restored.length !== proof.allocations.length || !proof.allocations.every(item =>
      restored.some(restoration => restoration.spendAllocationId === item.allocation.id))) return null;
  const ledger = await database.select().from(walletLedgerEntries).where(eq(walletLedgerEntries.transactionId, row.restoration.id));
  if (ledger.some(item => item.amountLa !== proof.debits[item.bucket as keyof typeof proof.debits]) ||
      ledger.reduce((sum, item) => sum + item.amountLa, 0) !== proof.intent.priceLa) return null;
  return row;
}

export async function hasRecordedReportCompensation(database: Database, reservationId: string): Promise<boolean> {
  const result = await database.execute(sql`select 1 from report_wallet_compensations where reservation_id = ${reservationId}::uuid limit 1`);
  return result.length > 0;
}
