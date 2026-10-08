import { freezePurchaseCommercialTerms } from "./purchase-commercial-terms.js";
import { createDatabaseDailyReadingAccess } from "./personal-daily-reading.service.js";
import { and, desc, eq, gt, isNull, notExists, sql } from "drizzle-orm";
import {
  findLaProduct, NormalizedBirthProfileV1Schema, PersonalDailyReadingV1Schema, WalletPurchaseIntentV1Schema,
  type CurrentActor, type NormalizedBirthProfileV1, type PersonalDailyReadingV1, type WalletQuoteV1,
} from "@lasoviet/contracts";
import {
  authUsers, commerceEntitlements, dailyReadingUnlocks, walletAccounts, walletPurchaseIntents,
  walletSpendAllocations, walletTransactions, type Database,
} from "@lasoviet/database";
import type { WalletService } from "../wallet/wallet.service.js";
import { abortWalletSpendContinuation } from "../wallet/wallet.repository.js";
import { createDatabaseZiweiQueryRepository } from "../ziwei/ziwei-query.repository.js";
import type { WalletPurchaseIntentRequest, WalletResult, WalletUnlockRequest, WalletUnlockOutcome } from "./wallet-unlock.service.js";

export const DAILY_SKU = "ZIWEI-TODAY-P0";
export type DailyReadingWriter = (profile: NormalizedBirthProfileV1, options: {
  chartId: string; chartVersionId: string; asOfDate: string; now: () => Date;
}) => PersonalDailyReadingV1;
export function dailyReadingDate(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
function endOfReadingDate(date: string): Date {
  return new Date(new Date(`${date}T00:00:00+07:00`).getTime() + 86_400_000);
}
function projectIntent(row: typeof walletPurchaseIntents.$inferSelect) {
  return WalletPurchaseIntentV1Schema.parse({
    id: row.id, sku: row.sku, chartVersionId: row.chartVersionId, locale: row.locale,
    amountLa: row.priceLa, status: row.status, stateVersion: row.stateVersion, createdAt: row.createdAt.toISOString(),
  });
}

export async function readPurchasedDailyReading(database: Database, ownerId: string, chartId: string, date: string, now: Date) {
  const [row] = await database.select({ reading: dailyReadingUnlocks, intent: walletPurchaseIntents })
    .from(dailyReadingUnlocks)
    .innerJoin(commerceEntitlements, and(eq(commerceEntitlements.id, dailyReadingUnlocks.id), isNull(commerceEntitlements.revokedAt), eq(commerceEntitlements.ledgerSpendId, dailyReadingUnlocks.ledgerSpendId), eq(commerceEntitlements.ownerId, ownerId), eq(commerceEntitlements.chartId, chartId), eq(commerceEntitlements.sku, DAILY_SKU)))
    .innerJoin(walletTransactions, and(eq(walletTransactions.id, dailyReadingUnlocks.ledgerSpendId), eq(walletTransactions.kind, "spend"), isNull(walletTransactions.reversalOfTransactionId)))
    .innerJoin(walletAccounts, and(eq(walletAccounts.id, walletTransactions.walletId), eq(walletAccounts.ownerId, ownerId)))
    .innerJoin(walletPurchaseIntents, and(
      eq(walletPurchaseIntents.id, walletTransactions.purchaseIntentId),
      eq(walletPurchaseIntents.ownerId, ownerId), eq(walletPurchaseIntents.status, "completed"),
      eq(walletPurchaseIntents.sku, DAILY_SKU), eq(walletPurchaseIntents.priceLa, 60),
      eq(walletPurchaseIntents.chartId, dailyReadingUnlocks.chartId),
      eq(walletPurchaseIntents.chartVersionId, dailyReadingUnlocks.chartVersionId),
    ))
    .where(and(
      eq(dailyReadingUnlocks.ownerId, ownerId), eq(dailyReadingUnlocks.chartId, chartId),
      eq(dailyReadingUnlocks.readingDate, date), gt(dailyReadingUnlocks.expiresAt, now),
      notExists(database.select({ id: walletTransactions.id }).from(walletTransactions).where(and(
        eq(walletTransactions.kind, "restoration"), eq(walletTransactions.reversalOfTransactionId, dailyReadingUnlocks.ledgerSpendId),
      ))),
    )).orderBy(desc(dailyReadingUnlocks.createdAt)).limit(1);
  if (!row) return null;
  const [allocation] = await database.select({ amount: sql<number>`coalesce(sum(${walletSpendAllocations.amountLa}), 0)` })
    .from(walletSpendAllocations).where(eq(walletSpendAllocations.spendTransactionId, row.reading.ledgerSpendId));
  const parsed = PersonalDailyReadingV1Schema.safeParse(row.reading.content);
  if (Number(allocation?.amount) !== 60 || !parsed.success || !parsed.data.qualityGate.passed ||
    parsed.data.chartId !== chartId || parsed.data.chartVersionId !== row.reading.chartVersionId || parsed.data.asOfDate !== date) return null;
  return row.reading;
}

export function createDailyWalletUnlockService(database: Database, wallet: WalletService, options: {
  writer?: DailyReadingWriter; now?: () => Date; catalog?: typeof findLaProduct;
} = {}) {
  const now = options.now ?? (() => new Date());
  const catalog = options.catalog ?? findLaProduct;
  const available = () => catalog(DAILY_SKU)?.availability === "active" && !!options.writer;
  const failure = <T>(code: import("./wallet-unlock.service.js").WalletUnlockServiceError): WalletResult<T> => ({ ok: false, code });
  async function verified(actor: CurrentActor) {
    if (actor.kind !== "account") return false;
    const [account] = await database.select().from(authUsers).where(eq(authUsers.id, actor.userId)).limit(1);
    return account?.emailVerified === true && account.isAnonymous === false;
  }
  return {
    /** Daily authority is date-scoped content, not a natal report reservation. */
    async readQuote(actor: CurrentActor, request: WalletPurchaseIntentRequest, current: Date): Promise<Pick<WalletQuoteV1, "state" | "priceLa" | "reportState">> {
      const unavailable = {state: "unavailable" as const, priceLa: null, reportState: null};
      if (request.locale !== "vi" || request.sku !== DAILY_SKU || !available() || !await verified(actor) || actor.kind !== "account") return unavailable;
      const chart = await createDatabaseZiweiQueryRepository(database).readAuthorizedChart(actor, request.chartId, current);
      if (!chart || chart.chartVersionId !== request.chartVersionId ||
        !NormalizedBirthProfileV1Schema.safeParse({...chart.normalizedInput, originalInput: chart.originalInput}).success) return unavailable;
      const grant = await createDatabaseDailyReadingAccess(database)(actor.userId, request.chartId, current);
      if (grant && grant.chartVersionId === chart.chartVersionId && grant.grantedAt <= current && current < grant.expiresAt) {
        return {state: "owned", priceLa: null, reportState: "unavailable"};
      }
      return {state: "available", priceLa: 60, reportState: null};
    },
    async createPurchaseIntent(actor: CurrentActor, request: WalletPurchaseIntentRequest): Promise<WalletResult<ReturnType<typeof projectIntent>>> {
      if (actor.kind !== "account" || !await verified(actor)) return failure("WALLET_ACCOUNT_INELIGIBLE");
      // The writer currently provides reviewed Vietnamese output only. English stays unavailable.
      if (!available() || request.sku !== DAILY_SKU || request.locale !== "vi") return failure("WALLET_INTENT_INVALID");
      return database.transaction(async (transaction) => {
        await transaction.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`commerce:chart:${request.chartId}`}))`);
        const current = now();
        const date = dailyReadingDate(current);
        const chart = await createDatabaseZiweiQueryRepository(transaction).readAuthorizedChart(actor, request.chartId, current);
        if (!chart || chart.chartVersionId !== request.chartVersionId) return failure("WALLET_CHART_NOT_FOUND");
        if (await createDatabaseDailyReadingAccess(transaction)(actor.userId, request.chartId, current)) return failure("WALLET_ENTITLEMENT_EXISTS");
        const [pending] = await transaction.select().from(walletPurchaseIntents).where(and(
          eq(walletPurchaseIntents.ownerId, actor.userId), eq(walletPurchaseIntents.chartId, request.chartId),
          eq(walletPurchaseIntents.sku, DAILY_SKU), eq(walletPurchaseIntents.status, "pending"),
        )).limit(1).for("update");
        if (pending && dailyReadingDate(pending.createdAt) === date && pending.chartVersionId === chart.chartVersionId && pending.priceLa === 60 && pending.locale === "vi") {
          return { ok: true, value: projectIntent(pending), reused: true };
        }
        if (pending) await transaction.update(walletPurchaseIntents).set({ status: "expired", stateVersion: pending.stateVersion + 1 }).where(eq(walletPurchaseIntents.id, pending.id));
        const [intent] = await transaction.insert(walletPurchaseIntents).values({
          ownerId: actor.userId, chartId: chart.chartId, chartVersionId: chart.chartVersionId,
          sku: DAILY_SKU, locale: "vi", priceLa: 60, createdAt: current,
          commercialTerms: freezePurchaseCommercialTerms({ownerId: actor.userId, chartId: chart.chartId,
            chartVersionId: chart.chartVersionId, sku: DAILY_SKU, locale: "vi", periodKey: "lifetime", priceLa: 60, createdAt: current}),
        }).returning();
        if (!intent) throw new Error("DAILY_INTENT_CREATE_FAILED");
        return { ok: true, value: projectIntent(intent), reused: false };
      });
    },
    async unlock(actor: CurrentActor, request: WalletUnlockRequest): Promise<WalletResult<WalletUnlockOutcome>> {
      if (actor.kind !== "account" || !await verified(actor)) return failure("WALLET_ACCOUNT_INELIGIBLE");
      const [intent] = await database.select().from(walletPurchaseIntents).where(and(eq(walletPurchaseIntents.id, request.purchaseIntentId), eq(walletPurchaseIntents.ownerId, actor.userId))).limit(1);
      if (!intent || intent.sku !== DAILY_SKU || intent.priceLa !== 60 || intent.locale !== "vi" || !available()) return failure("WALLET_INTENT_INVALID");
      const result = await wallet.spend<{ readingId: string }>({
        actor,
        spend: {
          kind: "spend", actorId: actor.userId, reasonCode: "wallet.daily.unlock", requestId: actor.requestId,
          traceId: actor.requestId, idempotencyKey: request.idempotencyKey, purchaseIntentId: intent.id,
          amountLa: 60, expectedWalletVersion: request.expectedWalletVersion,
        },
        continuationOperation: `wallet.daily.unlock.v1.intent-v${request.expectedIntentVersion}`,
        continuationResultCodec: { safeParse(value) {
          if (!value || typeof value !== "object" || !("readingId" in value) || typeof value.readingId !== "string") return { success: false };
          return { success: true, data: { readingId: value.readingId } };
        } },
        continuation: async (transaction, metadata) => {
          await transaction.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`commerce:chart:${intent.chartId}`}))`);
          const current = now();
          const date = dailyReadingDate(current);
          const [locked] = await transaction.select().from(walletPurchaseIntents).where(eq(walletPurchaseIntents.id, intent.id)).for("update");
          if (!locked || locked.status !== "pending" || locked.stateVersion !== request.expectedIntentVersion ||
            dailyReadingDate(locked.createdAt) !== date || !available()) return abortWalletSpendContinuation("WALLET_INVALID_INTENT");
          const chart = await createDatabaseZiweiQueryRepository(transaction).readAuthorizedChart(actor, locked.chartId, current);
          if (!chart || chart.chartVersionId !== locked.chartVersionId || await createDatabaseDailyReadingAccess(transaction)(actor.userId, locked.chartId, current)) return abortWalletSpendContinuation("WALLET_INVALID_INTENT");
          const profile = NormalizedBirthProfileV1Schema.safeParse({ ...chart.normalizedInput, originalInput: chart.originalInput });
          if (!profile.success) return abortWalletSpendContinuation("WALLET_INVALID_INTENT");
          const [previous] = await transaction.select().from(dailyReadingUnlocks).where(and(
            eq(dailyReadingUnlocks.ownerId, actor.userId), eq(dailyReadingUnlocks.chartId, chart.chartId),
            eq(dailyReadingUnlocks.chartVersionId, chart.chartVersionId), eq(dailyReadingUnlocks.readingDate, date),
          )).orderBy(desc(dailyReadingUnlocks.createdAt)).limit(1);
          const reading = PersonalDailyReadingV1Schema.safeParse(previous?.content ?? options.writer!(profile.data, {
            chartId: chart.chartId, chartVersionId: chart.chartVersionId, asOfDate: date, now: () => current,
          }));
          if (!reading.success || !reading.data.qualityGate.passed || reading.data.chartId !== chart.chartId ||
            reading.data.chartVersionId !== chart.chartVersionId || reading.data.asOfDate !== date) return abortWalletSpendContinuation("WALLET_INVALID_INTENT");
          const [entitlement] = await transaction.insert(commerceEntitlements).values({
            orderId: null, ownerId: actor.userId, chartId: chart.chartId, sku: DAILY_SKU,
            ledgerSpendId: metadata.spendTransactionId, scope: { sections: [], dailyDates: [date] },
            createdAt: current, expiresAt: endOfReadingDate(date),
          }).returning();
          if (!entitlement) throw new Error("DAILY_ENTITLEMENT_SAVE_FAILED");
          const [saved] = await transaction.insert(dailyReadingUnlocks).values({
            id: entitlement.id,
            ownerId: actor.userId, chartId: chart.chartId, chartVersionId: chart.chartVersionId, readingDate: date,
            ledgerSpendId: metadata.spendTransactionId, content: reading.data, createdAt: current, expiresAt: endOfReadingDate(date),
          }).returning();
          if (!saved) throw new Error("DAILY_READING_SAVE_FAILED");
          await transaction.update(walletPurchaseIntents).set({ status: "completed", stateVersion: locked.stateVersion + 1, completedAt: current }).where(eq(walletPurchaseIntents.id, locked.id));
          return { readingId: saved.id };
        },
      });
      if (!result.ok) return failure(result.error.code === "WALLET_INVALID_INTENT" ? "WALLET_INTENT_VERSION_CONFLICT" : result.error.code as import("./wallet-unlock.service.js").WalletUnlockServiceError);
      const [saved] = await database.select().from(dailyReadingUnlocks).where(and(
        eq(dailyReadingUnlocks.id, result.value.continuation?.readingId ?? "00000000-0000-0000-0000-000000000000"),
        eq(dailyReadingUnlocks.ownerId, actor.userId), eq(dailyReadingUnlocks.ledgerSpendId, result.value.transactionId),
      )).limit(1);
      const [completed] = await database.select().from(walletPurchaseIntents).where(eq(walletPurchaseIntents.id, intent.id)).limit(1);
      if (!saved || !completed || completed.status !== "completed") return failure("WALLET_RECONCILIATION_FAILED");
      return { ok: true, value: { intent: projectIntent(completed), balance: result.value.balance, reportId: saved.id } };
    },
  };
}
