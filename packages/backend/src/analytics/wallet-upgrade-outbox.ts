import { createHash } from "node:crypto";
import { and, asc, eq, lte, or, sql } from "drizzle-orm";
import { WalletTransactionReceiptV1Schema } from "@lasoviet/contracts";
import {
  analyticsEvents, authUsers, deletionRequests, outbox, walletAccounts,
  walletCommandReceipts, walletLedgerEntries, walletPurchaseIntents, walletTransactions,
  lockFreeAiCoordination, type Database,
} from "@lasoviet/database";
import {
  projectCommittedWalletUpgrade, WALLET_UPGRADE_EVENT_TYPE, WalletUpgradeEventPayloadSchema,
} from "../commerce/wallet-upgrade-event.js";
import { createDatabaseAnalyticsRepository } from "./analytics.repository.js";

type Lease = {id: string; attempt: number};
class InvalidUpgradeEvent extends Error {}
const eligible = (current: Date) => and(eq(outbox.eventType, WALLET_UPGRADE_EVENT_TYPE), or(
  and(eq(outbox.status, "pending"), lte(outbox.availableAt, current)),
  and(eq(outbox.status, "leased"), lte(outbox.leasedUntil, current)),
));
const stableProperties = (value: unknown): string => JSON.stringify(value, (key, item) =>
  item && typeof item === "object" && !Array.isArray(item)
    ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);

/** First-party account business events: never borrow a browser visitor or invent consent. */
export function createWalletUpgradeOutboxRunner(database: Database, options: {
  workerId: string; now?: () => Date; limit?: number;
  beforeRecord?: () => Promise<void>;
  afterRecord?: () => Promise<void>;
} ) {
  const now = options.now ?? (() => new Date());
  let active: Promise<{dispatched: number}> | undefined;
  const owned = (lease: Lease) => and(eq(outbox.id, lease.id), eq(outbox.status, "leased"),
    eq(outbox.leasedBy, options.workerId), eq(outbox.attemptCount, lease.attempt));

  async function claim(): Promise<Lease | null> {
    return database.transaction(async tx => {
      const current = now();
      const [candidate] = await tx.select().from(outbox).where(eligible(current))
        .orderBy(asc(outbox.availableAt), asc(outbox.id)).limit(1).for("update", {skipLocked: true});
      if (!candidate) return null;
      const [row] = await tx.update(outbox).set({status: "leased", leasedBy: options.workerId,
        leasedUntil: new Date(current.getTime() + 60_000), attemptCount: candidate.attemptCount + 1,
        updatedAt: current}).where(eq(outbox.id, candidate.id)).returning();
      return {id: row!.id, attempt: row!.attemptCount};
    });
  }

  async function deliver(lease: Lease): Promise<void> {
    // Read only the owner before locking the purge marker. Purge locks that marker
    // before deleting analytics/outbox; acquiring outbox first would invert that order.
    const [candidate] = await database.select({ownerId: outbox.actorId}).from(outbox).where(owned(lease));
    if (!candidate) return;
    if (!candidate.ownerId) throw new InvalidUpgradeEvent();
    const ownerId = candidate.ownerId;
    await database.transaction(async tx => {
      // Purge acquires this established coordination lock before its marker and
      // analytics/outbox deletes. A missing marker alone cannot fence a new request.
      await lockFreeAiCoordination(tx);
      const [deletion] = await tx.select().from(deletionRequests)
        .where(eq(deletionRequests.userId, ownerId)).limit(1).for("update");
      const [account] = await tx.select({id: authUsers.id, verified: authUsers.emailVerified})
        .from(authUsers).where(eq(authUsers.id, ownerId)).limit(1).for("share");
      const [event] = await tx.select().from(outbox).where(owned(lease)).limit(1).for("update");
      if (!event) return;
      if (deletion?.status === "purged" || !account) {
        await tx.delete(outbox).where(owned(lease));
        return;
      }
      const parsed = WalletUpgradeEventPayloadSchema.safeParse(event.payload);
      if (!account.verified || !parsed.success || event.schemaVersion !== 1 || event.actorId !== ownerId ||
          event.aggregateType !== "account" || event.aggregateId !== ownerId) throw new InvalidUpgradeEvent();
      const {transactionId, upgrade} = parsed.data;
      const [source] = await tx.select({receipt: walletCommandReceipts, spend: walletTransactions,
        wallet: walletAccounts, intent: walletPurchaseIntents}).from(walletCommandReceipts)
        .innerJoin(walletTransactions, eq(walletTransactions.id, walletCommandReceipts.transactionId))
        .innerJoin(walletAccounts, eq(walletAccounts.id, walletTransactions.walletId))
        .innerJoin(walletPurchaseIntents, eq(walletPurchaseIntents.id, walletTransactions.purchaseIntentId))
        .where(and(eq(walletTransactions.id, transactionId), eq(walletTransactions.kind, "spend"),
          eq(walletAccounts.ownerId, ownerId), eq(walletPurchaseIntents.ownerId, ownerId),
          eq(walletPurchaseIntents.status, "completed"),
          sql`COALESCE((SELECT sum(${walletLedgerEntries.amountLa}) FROM ${walletLedgerEntries} WHERE ${walletLedgerEntries.transactionId} = ${walletTransactions.id}), 0) = -${walletPurchaseIntents.priceLa}`)).limit(1);
      const stored = source?.receipt.result as {receipt?: unknown; continuation?: {creditProof?: unknown; intentId?: string; intentStateVersion?: number}} | undefined;
      const receipt = WalletTransactionReceiptV1Schema.safeParse(stored?.receipt);
      if (!source || !receipt.success || receipt.data.transactionId !== transactionId || receipt.data.status !== "completed" ||
          source.receipt.walletId !== source.wallet.id || source.receipt.idempotencyKey !== source.spend.idempotencyKey ||
          receipt.data.commandId !== source.spend.idempotencyKey || stored?.continuation?.intentId !== source.intent.id ||
          stored.continuation.intentStateVersion !== source.intent.stateVersion) throw new InvalidUpgradeEvent();
      const authoritative = await projectCommittedWalletUpgrade(tx, {
        ownerId, transactionId, intent: source.intent, creditProof: stored.continuation.creditProof,
      });
      if (!authoritative || stableProperties(authoritative) !== stableProperties(upgrade) ||
          event.eventId !== `wallet-upgrade:${transactionId}` || event.idempotencyKey !== `upgrade-purchased:${upgrade.eventKey}` ||
          event.occurredAt.toISOString() !== new Date(upgrade.occurredAt).toISOString()) throw new InvalidUpgradeEvent();
      const properties = {source_sku: upgrade.sourceSku, source_skus: upgrade.sourceSkus,
        target_sku: upgrade.targetSku, amount: upgrade.chargedLa, credit_amount: upgrade.creditLa, currency: upgrade.currency};
      const [existing] = await tx.select().from(analyticsEvents).where(eq(analyticsEvents.idempotencyKey, event.idempotencyKey)).limit(1);
      if (existing) {
        // A previous web instance may have emitted this exact committed receipt.
        // Preserve its original visitor/profile/time rather than rewriting attribution.
        if (existing.userId !== ownerId || existing.name !== "upgrade_purchased" ||
            existing.occurredAt.getTime() !== event.occurredAt.getTime() ||
            stableProperties(existing.properties) !== stableProperties(properties)) throw new InvalidUpgradeEvent();
      } else {
        await options.beforeRecord?.();
        const visitorId = `business_${createHash("sha256").update(`wallet-upgrade:${ownerId}`).digest("hex").slice(0, 32)}`;
        const result = await createDatabaseAnalyticsRepository(tx).recordEvent({
          idempotencyKey: event.idempotencyKey, visitorId, userId: ownerId,
          name: "upgrade_purchased", properties, occurredAt: event.occurredAt, now: now(),
        });
        if (!result.ok) {
          // A rolling web instance can race the first insert; retry and compare its exact receipt.
          throw new Error("UPGRADE_ANALYTICS_RETRY");
        }
      }
      await options.afterRecord?.();
      await tx.update(outbox).set({status: "processed", processedAt: now(), leasedBy: null,
        leasedUntil: null, lastErrorCode: null, updatedAt: now()}).where(owned(lease));
    });
  }

  return {
    runOnce(): Promise<{dispatched: number}> {
      if (active) return active;
      active = (async () => {
        let dispatched = 0;
        for (let count = 0; count < (options.limit ?? 20); count++) {
          const lease = await claim();
          if (!lease) break;
          try {
            await deliver(lease);
            dispatched++;
          } catch (error) {
            const current = now();
            const invalid = error instanceof InvalidUpgradeEvent;
            await database.update(outbox).set({status: invalid ? "failed" : "pending", leasedBy: null,
              leasedUntil: null, availableAt: new Date(current.getTime() + 60_000),
              lastErrorCode: invalid ? "WALLET_UPGRADE_EVENT_INVALID" : "WALLET_UPGRADE_DELIVERY_RETRY",
              updatedAt: current}).where(owned(lease));
          }
        }
        return {dispatched};
      })().finally(() => {active = undefined;});
      return active;
    },
  };
}
