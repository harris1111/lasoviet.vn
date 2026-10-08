import { freezePurchaseCommercialTerms } from "./purchase-commercial-terms.js";
import { and, desc, eq, gt, isNull, notExists, sql } from "drizzle-orm";
import { findLaProduct, getLaPrice, WalletPurchaseIntentV1Schema, type CurrentActor } from "@lasoviet/contracts";
import { authUsers, membershipSubscriptions, walletAccounts, walletPurchaseIntents, walletSpendAllocations, walletTransactions, type Database } from "@lasoviet/database";
import { abortWalletSpendContinuation } from "../wallet/wallet.repository.js";
import type { WalletService } from "../wallet/wallet.service.js";
import type { WalletUnlockRequest } from "./wallet-unlock.service.js";

function catalogPrice(sku: string): number {
  const price = getLaPrice(sku);
  if (price === undefined) throw new Error("MEMBERSHIP_CATALOG_PRICE_MISSING");
  return price;
}
export const MEMBERSHIP_PLANS = {
  "MEMBERSHIP-MONTHLY-P0": { priceLa: catalogPrice("MEMBERSHIP-MONTHLY-P0"), days: 30 },
  "MEMBERSHIP-YEARLY-P0": { priceLa: catalogPrice("MEMBERSHIP-YEARLY-P0"), days: 365 },
} as const;
export type MembershipSku = keyof typeof MEMBERSHIP_PLANS;
export const isMembershipSku = (sku: string): sku is MembershipSku => Object.hasOwn(MEMBERSHIP_PLANS, sku);
const scope = (ownerId: string) => `membership:${ownerId}`;
const projectIntent = (row: typeof walletPurchaseIntents.$inferSelect) => WalletPurchaseIntentV1Schema.parse({
  id: row.id, sku: row.sku, chartVersionId: row.chartVersionId, locale: row.locale,
  amountLa: row.priceLa, status: row.status, stateVersion: row.stateVersion, createdAt: row.createdAt.toISOString(),
});

/** Verify the original paid terms on every access; later restoration immediately removes all benefits. */
export async function readMembershipPeriods(database: Database, ownerId: string, now: Date) {
  const rows = await database.select({ subscription: membershipSubscriptions, intent: walletPurchaseIntents })
    .from(membershipSubscriptions)
    .innerJoin(walletTransactions, and(eq(walletTransactions.id, membershipSubscriptions.ledgerSpendId), eq(walletTransactions.kind, "spend"), isNull(walletTransactions.reversalOfTransactionId)))
    .innerJoin(walletAccounts, and(eq(walletAccounts.id, walletTransactions.walletId), eq(walletAccounts.ownerId, ownerId)))
    .innerJoin(walletPurchaseIntents, and(eq(walletPurchaseIntents.id, walletTransactions.purchaseIntentId), eq(walletPurchaseIntents.ownerId, ownerId), eq(walletPurchaseIntents.status, "completed"), eq(walletPurchaseIntents.chartId, scope(ownerId)), eq(walletPurchaseIntents.chartVersionId, scope(ownerId)), eq(walletPurchaseIntents.sku, membershipSubscriptions.sku)))
    .where(and(eq(membershipSubscriptions.ownerId, ownerId), gt(membershipSubscriptions.expiresAt, now), notExists(database.select({ id: walletTransactions.id }).from(walletTransactions).where(and(eq(walletTransactions.kind, "restoration"), eq(walletTransactions.reversalOfTransactionId, membershipSubscriptions.ledgerSpendId))))))
    .orderBy(desc(membershipSubscriptions.expiresAt));
  const valid: Array<typeof membershipSubscriptions.$inferSelect> = [];
  for (const { subscription, intent } of rows) {
    if (!isMembershipSku(subscription.sku) || intent.priceLa !== MEMBERSHIP_PLANS[subscription.sku].priceLa ||
      subscription.expiresAt.getTime() - subscription.startsAt.getTime() !== MEMBERSHIP_PLANS[subscription.sku].days * 86_400_000) continue;
    const [allocation] = await database.select({ amount: sql<number>`coalesce(sum(${walletSpendAllocations.amountLa}), 0)` }).from(walletSpendAllocations).where(eq(walletSpendAllocations.spendTransactionId, subscription.ledgerSpendId));
    if (Number(allocation?.amount) === intent.priceLa) valid.push(subscription);
  }
  return valid;
}
export function membershipCoverage(periods: Array<typeof membershipSubscriptions.$inferSelect>, now: Date) {
  const active = periods.find((period) => period.startsAt <= now && period.expiresAt > now);
  if (!active) return null;
  let final = active;
  for (const period of [...periods].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())) {
    if (period.startsAt <= final.expiresAt && period.expiresAt > final.expiresAt) final = period;
  }
  return { active, final, expiresAt: final.expiresAt };
}
export async function readActiveMembership(database: Database, ownerId: string, now: Date) {
  return (await readMembershipPeriods(database, ownerId, now)).find((period) => period.startsAt <= now) ?? null;
}
export function membershipPrice(basePriceLa: number, rolloverPriceLa: number | undefined, active: boolean) {
  return Math.min(active ? Math.ceil(basePriceLa * 0.8) : basePriceLa, rolloverPriceLa ?? basePriceLa);
}

export function createMembershipService(database: Database, wallet: WalletService, options: { now?: () => Date; catalog?: typeof findLaProduct } = {}) {
  const now = options.now ?? (() => new Date());
  const catalog = options.catalog ?? findLaProduct;
  const fail = (code: string) => ({ ok: false as const, code });
  async function verified(actor: CurrentActor) {
    if (actor.kind !== "account") return false;
    const [user] = await database.select().from(authUsers).where(eq(authUsers.id, actor.userId)).limit(1);
    return user?.emailVerified === true && user.isAnonymous === false;
  }
  return {
    async read(actor: CurrentActor) {
      if (actor.kind !== "account" || !await verified(actor)) return fail("WALLET_ACCOUNT_INELIGIBLE");
      const current = now();
      const periods = await readMembershipPeriods(database, actor.userId, current);
      const coverage = membershipCoverage(periods, current);
      const active = coverage?.active;
      return { ok: true as const, value: {
        active: !!active, expiresAt: coverage?.expiresAt.toISOString() ?? null,
        automaticRenewal: false, discountPercent: active ? 20 : 0,
        plans: Object.entries(MEMBERSHIP_PLANS).map(([sku, terms]) => ({ sku, ...terms, available: catalog(sku)?.availability === "active" })),
        benefits: { daily: !!active, monthly: !!active && catalog("ZIWEI-MONTHLY-P0")?.availability === "active", paidTools: false },
      } };
    },
    async createIntent(actor: CurrentActor, request: { sku: string; locale: "vi" | "en" }) {
      if (actor.kind !== "account" || !await verified(actor)) return fail("WALLET_ACCOUNT_INELIGIBLE");
      if (!isMembershipSku(request.sku) || catalog(request.sku)?.availability !== "active") return fail("WALLET_INTENT_INVALID");
      const sku = request.sku;
      return database.transaction(async (transaction) => {
        // Match wallet.spend's account-first order before advisory or intent locks.
        const [account] = await transaction.select().from(authUsers).where(eq(authUsers.id, actor.userId)).limit(1).for("update");
        if (!account?.emailVerified || account.isAnonymous) return fail("WALLET_ACCOUNT_INELIGIBLE");
        await transaction.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${scope(actor.userId)}))`);
        const [pending] = await transaction.select().from(walletPurchaseIntents).where(and(eq(walletPurchaseIntents.ownerId, actor.userId), eq(walletPurchaseIntents.chartId, scope(actor.userId)), eq(walletPurchaseIntents.sku, sku), eq(walletPurchaseIntents.status, "pending"))).limit(1);
        if (pending && pending.priceLa === MEMBERSHIP_PLANS[sku].priceLa && pending.locale === request.locale) return { ok: true as const, value: projectIntent(pending) };
        if (pending) await transaction.update(walletPurchaseIntents).set({ status: "expired", stateVersion: pending.stateVersion + 1 }).where(eq(walletPurchaseIntents.id, pending.id));
        const createdAt = now();
        const terms = {ownerId: actor.userId, chartId: scope(actor.userId), chartVersionId: scope(actor.userId),
          sku, locale: request.locale, periodKey: "lifetime", priceLa: MEMBERSHIP_PLANS[sku].priceLa, createdAt};
        const [intent] = await transaction.insert(walletPurchaseIntents).values({...terms,
          commercialTerms: freezePurchaseCommercialTerms(terms)}).returning();
        if (!intent) throw new Error("MEMBERSHIP_INTENT_CREATE_FAILED");
        return { ok: true as const, value: projectIntent(intent) };
      });
    },
    async purchase(actor: CurrentActor, request: WalletUnlockRequest) {
      if (actor.kind !== "account" || !await verified(actor)) return fail("WALLET_ACCOUNT_INELIGIBLE");
      const [intent] = await database.select().from(walletPurchaseIntents).where(and(eq(walletPurchaseIntents.id, request.purchaseIntentId), eq(walletPurchaseIntents.ownerId, actor.userId))).limit(1);
      if (!intent || !isMembershipSku(intent.sku) || intent.chartId !== scope(actor.userId) || intent.chartVersionId !== scope(actor.userId) || intent.priceLa !== MEMBERSHIP_PLANS[intent.sku].priceLa || catalog(intent.sku)?.availability !== "active") return fail("WALLET_INTENT_INVALID");
      const terms = MEMBERSHIP_PLANS[intent.sku];
      const result = await wallet.spend<{ subscriptionId: string }>({
        actor, spend: { kind: "spend", actorId: actor.userId, reasonCode: "wallet.membership.purchase", requestId: actor.requestId, traceId: actor.requestId, idempotencyKey: request.idempotencyKey, purchaseIntentId: intent.id, amountLa: terms.priceLa, expectedWalletVersion: request.expectedWalletVersion },
        continuationOperation: `wallet.membership.purchase.v1.intent-v${request.expectedIntentVersion}`,
        continuationResultCodec: { safeParse(value) { return value && typeof value === "object" && "subscriptionId" in value && typeof value.subscriptionId === "string" ? { success: true, data: { subscriptionId: value.subscriptionId } } : { success: false }; } },
        continuation: async (transaction, metadata) => {
          await transaction.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${scope(actor.userId)}))`);
          const [locked] = await transaction.select().from(walletPurchaseIntents).where(eq(walletPurchaseIntents.id, intent.id)).for("update");
          if (!locked || locked.status !== "pending" || locked.stateVersion !== request.expectedIntentVersion || locked.priceLa !== terms.priceLa || catalog(locked.sku)?.availability !== "active") return abortWalletSpendContinuation("WALLET_INVALID_INTENT");
          const current = now();
          const periods = await readMembershipPeriods(transaction, actor.userId, current);
          const startsAt = periods[0]?.expiresAt ?? current;
          const [saved] = await transaction.insert(membershipSubscriptions).values({ ownerId: actor.userId, sku: locked.sku, ledgerSpendId: metadata.spendTransactionId, startsAt, expiresAt: new Date(startsAt.getTime() + terms.days * 86_400_000), createdAt: current }).returning();
          if (!saved) throw new Error("MEMBERSHIP_SUBSCRIPTION_CREATE_FAILED");
          await transaction.update(walletPurchaseIntents).set({ status: "completed", completedAt: current, stateVersion: locked.stateVersion + 1 }).where(eq(walletPurchaseIntents.id, locked.id));
          return { subscriptionId: saved.id };
        },
      });
      if (!result.ok) return fail(result.error.code);
      if (!result.value.continuation) return fail("WALLET_RECONCILIATION_FAILED");
      const [saved] = await database.select().from(membershipSubscriptions).where(and(
        eq(membershipSubscriptions.id, result.value.continuation.subscriptionId),
        eq(membershipSubscriptions.ownerId, actor.userId), eq(membershipSubscriptions.sku, intent.sku),
        eq(membershipSubscriptions.ledgerSpendId, result.value.transactionId),
      )).limit(1);
      const [completed] = await database.select().from(walletPurchaseIntents).where(eq(walletPurchaseIntents.id, intent.id)).limit(1);
      if (!saved || completed?.status !== "completed") return fail("WALLET_RECONCILIATION_FAILED");
      return { ok: true as const, value: { subscriptionId: saved.id, balance: result.value.balance } };
    },
  };
}
