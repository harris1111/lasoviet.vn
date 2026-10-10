import { creditProofSchema, type CreditProof, readPurchaseCommercialTerms, matchesPurchaseCreditProof } from "./purchase-commercial-terms.js";
import { createHash } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { ROLLOVER_WINDOW_MS, WalletUpgradePurchaseV1Schema, z, type WalletUpgradePurchaseV1 } from "@lasoviet/contracts";
import { outbox, walletAccounts, walletLedgerEntries, walletPurchaseIntents, walletTransactions, type Database } from "@lasoviet/database";

export const WALLET_UPGRADE_EVENT_TYPE = "wallet.upgrade.committed.v1";
export const WalletUpgradeEventPayloadSchema = z.object({transactionId: z.string().uuid(), upgrade: WalletUpgradePurchaseV1Schema}).strict();
export { creditProofSchema, type CreditProof } from "./purchase-commercial-terms.js";
const compareCreditCode = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;


/** Reconstruct historical credit from posted spends, independently of later refunds/access changes. */
export async function projectCommittedWalletUpgrade(db: Database, input: {
  ownerId: string; transactionId: string; intent: typeof walletPurchaseIntents.$inferSelect; creditProof: unknown;
}): Promise<WalletUpgradePurchaseV1 | null> {
    const parsed = creditProofSchema.safeParse(input.creditProof);
    const completedAt = input.intent.completedAt;
    const terms = readPurchaseCommercialTerms(input.intent);
    if (!parsed.success || !terms || !matchesPurchaseCreditProof(input.intent, parsed.success ? parsed.data : undefined) || input.intent.sku !== "ZIWEI-IDENTITY-P0" || completedAt === null ||
        parsed.data.creditLa + input.intent.priceLa !== terms.basePriceLa) return null;
    const proof = parsed.data;
    // This is historical proof: later source revocation/restoration cannot erase
    // the credit that was applied to this still-authorized target at commit.
    const original = await db.select({spendId: walletTransactions.id, sku: walletPurchaseIntents.sku,
      amountLa: walletPurchaseIntents.priceLa, spentAt: walletTransactions.createdAt})
      .from(walletTransactions).innerJoin(walletAccounts, eq(walletAccounts.id, walletTransactions.walletId))
      .innerJoin(walletPurchaseIntents, eq(walletPurchaseIntents.id, walletTransactions.purchaseIntentId))
      .where(and(inArray(walletTransactions.id, proof.sources.map(source => source.spendId)),
        eq(walletTransactions.kind, "spend"), eq(walletAccounts.ownerId, input.ownerId),
        eq(walletPurchaseIntents.ownerId, input.ownerId), eq(walletPurchaseIntents.chartId, input.intent.chartId),
        eq(walletPurchaseIntents.status, "completed"),
        sql`COALESCE((SELECT sum(${walletLedgerEntries.amountLa}) FROM ${walletLedgerEntries} WHERE ${walletLedgerEntries.transactionId} = ${walletTransactions.id}), 0) = -${walletPurchaseIntents.priceLa}`));
    if (original.length !== proof.sources.length || proof.sources.some(source => {
      const row = original.find(item => item.spendId === source.spendId);
      return !row || row.sku !== source.sku || row.amountLa !== source.amountLa || row.spentAt.toISOString() !== source.spentAt;
    })) return null;
    const ordered = [...proof.sources].sort((a, b) => Date.parse(a.spentAt) - Date.parse(b.spentAt) || compareCreditCode(a.sku, b.sku) || compareCreditCode(a.spendId, b.spendId));
    const openedAt = Date.parse(ordered[0]!.spentAt);
    if (completedAt.getTime() < openedAt || completedAt.getTime() >= openedAt + ROLLOVER_WINDOW_MS ||
        ordered.some(source => Date.parse(source.spentAt) > completedAt.getTime())) return null;
    let remaining = proof.creditLa;
    for (const source of ordered) {
      const expected = Math.min(remaining, source.amountLa);
      if (source.creditedLa !== expected || expected <= 0) return null;
      remaining -= expected;
    }
    if (remaining !== 0) return null;
    const primary = [...proof.sources].sort((a, b) => b.creditedLa - a.creditedLa || compareCreditCode(a.sku, b.sku) || compareCreditCode(a.spendId, b.spendId))[0]!;
    const projected = WalletUpgradePurchaseV1Schema.safeParse({version: terms.basePriceLa === 960 ? 1 : 2,
      eventKey: `upg_${createHash("sha256").update(input.transactionId).digest("hex").slice(0, 32)}`,
      occurredAt: completedAt.toISOString(), targetSku: "ZIWEI-IDENTITY-P0", sourceSku: primary.sku,
      sourceSkus: [...new Set(proof.sources.map(source => source.sku))].sort(),
      chargedLa: input.intent.priceLa, creditLa: proof.creditLa, currency: "LA"});
    if (!projected.success) return null;
    return projected.data;
}

export async function enqueueCommittedWalletUpgrade(db: Database, input: {
  ownerId: string; transactionId: string; intent: typeof walletPurchaseIntents.$inferSelect; creditProof?: CreditProof; traceId: string;
}): Promise<void> {
  if (!input.creditProof) return;
  const upgrade = await projectCommittedWalletUpgrade(db, {...input, creditProof: input.creditProof});
  if (!upgrade) throw new Error("WALLET_UPGRADE_PROOF_INVALID");
  const committedAt = new Date(upgrade.occurredAt);
  await db.insert(outbox).values({
    schemaVersion: 1, eventType: WALLET_UPGRADE_EVENT_TYPE,
    eventId: `wallet-upgrade:${input.transactionId}`, occurredAt: committedAt,
    traceId: input.traceId, actorId: input.ownerId, aggregateType: "account", aggregateId: input.ownerId,
    idempotencyKey: `upgrade-purchased:${upgrade.eventKey}`,
    payload: {transactionId: input.transactionId, upgrade},
    availableAt: committedAt, createdAt: committedAt, updatedAt: committedAt,
  });
}
