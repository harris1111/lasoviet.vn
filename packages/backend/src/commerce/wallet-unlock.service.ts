import { createDailyWalletUnlockService, DAILY_SKU, type DailyReadingWriter } from "./daily-wallet-unlock.service.js";
import { calculateBonusExpiry } from "@lasoviet/contracts";
import { randomUUID } from "node:crypto";

import { and, desc, eq, isNotNull, isNull, ne, notExists, or, sql } from "drizzle-orm";
import {
  calculateRolloverCredit,
  findLaProduct,
  getLaPrice,
  isQualifyingRolloverSku,
  resolveEntitlementScopeForSku,
  type CurrentActor,
  type QualifyingSpend,
  type WalletBalanceV1,
  type WalletPurchaseIntentV1,
  type WalletTransactionReceiptV1,
  WalletTransactionReceiptV1Schema,
  WalletPurchaseIntentV1Schema,
} from "@lasoviet/contracts";
import {
  auditLogs,
  authUsers,
  birthProfileReadingContexts,
  birthProfiles,
  commerceEntitlements,
  enqueueOutbox,
  evidenceSets,
  reportReservations,
  outbox,
  walletAccounts,
  walletCommandReceipts,
  walletPurchaseIntents,
  walletTransactions,
  ziweiChartVersions,
  ziweiCharts,
  type Database,
} from "@lasoviet/database";

import type { WalletService } from "../wallet/wallet.service.js";
import {
  abortWalletSpendContinuation,
  walletFingerprint,
  type WalletResultCodec,
} from "../wallet/wallet.repository.js";
import {
  currentReportVersions,
  deriveReportTimingLineage,
  type ReportVersionResolver,
} from "../reports/identity-report-config.js";

const supportedLocale = (value: string): value is "vi" | "en" => value === "vi" || value === "en";
const nonEmptyId = (value: string) => value.trim().length > 0;

type UnlockContinuation = {
  entitlementId: string;
  reservationId: string;
  reportId: string;
  reportVersionId: string;
  outboxId: string;
  intentId: string;
  intentStateVersion: number;
};

const continuationCodec: WalletResultCodec<UnlockContinuation> = {
  safeParse(value) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) return { success: false };
    const candidate = value as Partial<UnlockContinuation>;
    if (
      !Object.keys(candidate).every((key) => [
        "entitlementId", "reservationId", "reportId", "reportVersionId", "outboxId", "intentId", "intentStateVersion",
      ].includes(key)) ||
      ![candidate.entitlementId, candidate.reservationId, candidate.reportId, candidate.reportVersionId, candidate.outboxId, candidate.intentId]
        .every((id) => typeof id === "string" && id.trim().length > 0) ||
      !Number.isInteger(candidate.intentStateVersion) || candidate.intentStateVersion! < 1
    ) return { success: false };
    return { success: true, data: candidate as UnlockContinuation };
  },
};

export type WalletUnlockServiceError =
  | "WALLET_ACCOUNT_REQUIRED"
  | "WALLET_ACCOUNT_INELIGIBLE"
  | "WALLET_CHART_NOT_FOUND"
  | "WALLET_EVIDENCE_MISSING"
  | "WALLET_INTENT_INVALID"
  | "WALLET_INTENT_VERSION_CONFLICT"
  | "WALLET_VERSION_CONFLICT"
  | "WALLET_INSUFFICIENT_BALANCE"
  | "WALLET_ENTITLEMENT_EXISTS"
  | "WALLET_IDEMPOTENCY_KEY_REUSED"
  | "WALLET_RECONCILIATION_FAILED";

export type WalletPurchaseIntentRequest = {
  chartId: string;
  chartVersionId: string;
  sku: string;
  locale: "vi" | "en";
};

export type WalletUnlockRequest = {
  purchaseIntentId: string;
  expectedIntentVersion: number;
  expectedWalletVersion: number;
  idempotencyKey: string;
};

export type WalletUnlockOutcome = {
  intent: WalletPurchaseIntentV1;
  balance: WalletBalanceV1;
  reportId: string;
};

export type WalletResult<T> =
  | { ok: true; value: T; reused?: boolean }
  | { ok: false; code: WalletUnlockServiceError };

function failed<T>(code: WalletUnlockServiceError): WalletResult<T> {
  return { ok: false, code };
}

function projectIntent(row: typeof walletPurchaseIntents.$inferSelect): WalletPurchaseIntentV1 {
  return WalletPurchaseIntentV1Schema.parse({
    id: row.id,
    sku: row.sku,
    chartVersionId: row.chartVersionId,
    locale: row.locale,
    amountLa: row.priceLa,
    status: row.status,
    stateVersion: row.stateVersion,
    createdAt: row.createdAt.toISOString(),
  });
}

function storedReplay(value: unknown): { receipt: WalletTransactionReceiptV1; continuation: unknown } | undefined {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return undefined;
  const candidate = value as Record<string, unknown>;
  const parsed = WalletTransactionReceiptV1Schema.safeParse(candidate.receipt);
  if (!parsed.success || !("continuation" in candidate)) return undefined;
  return { receipt: parsed.data, continuation: candidate.continuation };
}

async function writeAudit(
  db: Database,
  actorId: string,
  action: "wallet.spend",
  walletId: string,
  reasonCode: string,
  requestId: string,
  traceId: string,
  metadata: Record<string, unknown>,
  now: Date,
): Promise<void> {
  await db.insert(auditLogs).values({
    actorId,
    action,
    targetType: "wallet_account",
    targetId: walletId,
    reasonCode,
    requestId,
    metadata: {
      ...metadata,
      traceId,
    },
    createdAt: now,
  });
}

async function verifiedAccount(database: Database, actor: CurrentActor, forUpdate = false) {
  if (actor.kind !== "account") return false;
  const query = database.select({ id: authUsers.id, emailVerified: authUsers.emailVerified })
    .from(authUsers)
    .where(eq(authUsers.id, actor.userId))
    .limit(1);
  const [user] = forUpdate ? await query.for("update") : await query;
  return user?.emailVerified === true;
}

async function ownedChart(database: Database, ownerId: string, chartId: string, chartVersionId: string) {
  const [chart] = await database.select({ id: ziweiCharts.id })
    .from(ziweiCharts)
    .innerJoin(birthProfiles, eq(birthProfiles.id, ziweiCharts.profileId))
    .innerJoin(ziweiChartVersions, eq(ziweiChartVersions.chartId, ziweiCharts.id))
    .where(and(
      eq(ziweiCharts.id, chartId),
      eq(ziweiChartVersions.id, chartVersionId),
      eq(birthProfiles.userId, ownerId),
    ))
    .limit(1);
  return chart;
}

async function evidenceFor(database: Database, chartVersionId: string) {
  const [evidence] = await database.select({ id: evidenceSets.id })
    .from(evidenceSets)
    .where(and(
      eq(evidenceSets.chartVersionId, chartVersionId),
      eq(evidenceSets.capabilityId, "ziwei.identity.p0"),
    ))
    .limit(1);
  return evidence;
}

function activeSpendCondition(db: Database) {
  return notExists(
    db
      .select({ id: walletTransactions.id })
      .from(walletTransactions)
      .where(and(
        eq(walletTransactions.kind, "restoration"),
        eq(walletTransactions.reversalOfTransactionId, commerceEntitlements.ledgerSpendId),
      )),
  );
}

async function qualifyingRolloverSpends(
  database: Database,
  ownerId: string,
  chartId: string,
): Promise<QualifyingSpend[]> {
  const walletRows = await database
    .select({
      sku: commerceEntitlements.sku,
      priceLa: walletPurchaseIntents.priceLa,
      createdAt: walletTransactions.createdAt,
    })
    .from(commerceEntitlements)
    .innerJoin(
      walletTransactions,
      and(
        eq(walletTransactions.id, commerceEntitlements.ledgerSpendId),
        eq(walletTransactions.kind, "spend"),
        activeSpendCondition(database),
      ),
    )
    .innerJoin(
      walletPurchaseIntents,
      eq(walletPurchaseIntents.id, walletTransactions.purchaseIntentId),
    )
    .where(
      and(
        eq(commerceEntitlements.ownerId, ownerId),
        eq(commerceEntitlements.chartId, chartId),
      ),
    );

  const walletSpends: QualifyingSpend[] = [];
  for (const row of walletRows) {
    if (isQualifyingRolloverSku(row.sku)) {
      walletSpends.push({
        amountLa: row.priceLa ?? getLaPrice(row.sku) ?? 120,
        spentAt: row.createdAt,
      });
    }
  }

  return walletSpends;
}

type PriceResult =
  | { ok: true; amountLa: number }
  | { ok: false; code: WalletUnlockServiceError };

async function price(
  database: Database,
  ownerId: string,
  chartId: string,
  sku: string,
  now: Date,
): Promise<PriceResult> {
  const product = findLaProduct(sku);
  if (!product || product.availability !== "active") return { ok: false, code: "WALLET_INTENT_INVALID" };

  const [sameSku] = await database.select({ id: commerceEntitlements.id })
    .from(commerceEntitlements)
    .leftJoin(walletTransactions, eq(walletTransactions.id, commerceEntitlements.ledgerSpendId))
    .where(and(
      eq(commerceEntitlements.ownerId, ownerId),
      eq(commerceEntitlements.chartId, chartId),
      eq(commerceEntitlements.sku, sku),
      or(
        isNotNull(commerceEntitlements.orderId),
        and(
          eq(walletTransactions.kind, "spend"),
          activeSpendCondition(database),
        ),
      ),
    ))
    .limit(1);
  if (sameSku !== undefined) return { ok: false, code: "WALLET_ENTITLEMENT_EXISTS" };

  if (sku === "ZIWEI-IDENTITY-P0") {
    const spends = await qualifyingRolloverSpends(database, ownerId, chartId);
    const rollover = calculateRolloverCredit({ spends, now });
    return { ok: true as const, amountLa: rollover.effectivePriceLa };
  }

  return { ok: true as const, amountLa: product.priceLa };
}

function validIntentTerms(intent: typeof walletPurchaseIntents.$inferSelect) {
  const product = findLaProduct(intent.sku);
  if (!product || product.availability !== "active" || !supportedLocale(intent.locale) || !product.locales.includes(intent.locale)) return false;
  if (intent.sku === "ZIWEI-IDENTITY-P0") {
    return intent.priceLa >= 0 && intent.priceLa <= 960;
  }
  return intent.priceLa === product.priceLa;
}

function hasUnlockOutboxLineage(
  payload: unknown,
  reservation: typeof reportReservations.$inferSelect,
  entitlement: typeof commerceEntitlements.$inferSelect,
) {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) return false;
  const value = payload as Record<string, unknown>;
  const exact = (key: string, expected: string) => value[key] === expected;
  if (
    !exact("reportId", reservation.reportId) ||
    !exact("reportVersionId", reservation.reportVersionId) ||
    !exact("entitlementId", entitlement.id) ||
    !exact("chartVersionId", reservation.chartVersionId) ||
    !exact("evidenceVersionId", reservation.evidenceVersionId) ||
    !exact("knowledgeVersionId", reservation.knowledgeVersionId) ||
    !exact("promptVersion", reservation.promptVersion) ||
    !exact("reportConfigVersion", reservation.reportConfigVersion) ||
    !exact("locale", reservation.locale) ||
    !exact("sku", reservation.sku)
  ) return false;
  if (reservation.asOfDate === null) {
    return !("asOfDate" in value) && !("targetYear" in value) &&
      !("timingRuleVersion" in value) && !("sensitivityRuleVersion" in value) &&
      !("readingContextRevisionId" in value);
  }
  return value.asOfDate === reservation.asOfDate &&
    value.targetYear === reservation.targetYear &&
    value.timingRuleVersion === reservation.timingRuleVersion &&
    value.sensitivityRuleVersion === reservation.sensitivityRuleVersion &&
    value.readingContextRevisionId === reservation.readingContextRevisionId;
}

async function verifyLineageAndRespond(
  db: Database,
  ownerId: string,
  transactionId: string,
  commandId: string,
  balance: WalletBalanceV1,
  continuation: UnlockContinuation,
): Promise<WalletResult<{ intent: WalletPurchaseIntentV1; balance: WalletBalanceV1; reportId: string }>> {
  const [lineage] = await db.select({
    spend: walletTransactions,
    wallet: walletAccounts,
    intent: walletPurchaseIntents,
    entitlement: commerceEntitlements,
    reservation: reportReservations,
    evidence: evidenceSets,
    event: outbox,
  }).from(walletTransactions)
    .innerJoin(walletAccounts, eq(walletAccounts.id, walletTransactions.walletId))
    .innerJoin(walletPurchaseIntents, eq(walletPurchaseIntents.id, walletTransactions.purchaseIntentId))
    .innerJoin(commerceEntitlements, eq(commerceEntitlements.ledgerSpendId, walletTransactions.id))
    .innerJoin(reportReservations, eq(reportReservations.entitlementId, commerceEntitlements.id))
    .innerJoin(evidenceSets, eq(evidenceSets.id, reportReservations.evidenceVersionId))
    .innerJoin(outbox, eq(outbox.id, continuation.outboxId))
    .where(and(
      eq(walletTransactions.id, transactionId),
      eq(walletTransactions.kind, "spend"),
      eq(walletAccounts.ownerId, ownerId),
      eq(walletPurchaseIntents.id, continuation.intentId),
      eq(walletPurchaseIntents.ownerId, ownerId),
      eq(commerceEntitlements.id, continuation.entitlementId),
      eq(commerceEntitlements.ownerId, ownerId),
      isNull(commerceEntitlements.orderId),
      eq(reportReservations.id, continuation.reservationId),
      eq(reportReservations.reportId, continuation.reportId),
      eq(reportReservations.reportVersionId, continuation.reportVersionId),
      activeSpendCondition(db),
    ))
    .limit(1);

  if (lineage === undefined ||
    commandId !== lineage.spend.idempotencyKey ||
    lineage.spend.purchaseIntentId !== lineage.intent.id ||
    lineage.intent.status !== "completed" ||
    lineage.intent.stateVersion !== continuation.intentStateVersion ||
    !validIntentTerms(lineage.intent) ||
    lineage.entitlement.ledgerSpendId !== lineage.spend.id ||
    lineage.entitlement.chartId !== lineage.intent.chartId ||
    lineage.entitlement.sku !== lineage.intent.sku ||
    lineage.reservation.entitlementId !== lineage.entitlement.id ||
    lineage.reservation.chartVersionId !== lineage.intent.chartVersionId ||
    lineage.reservation.evidenceVersionId !== lineage.evidence.id ||
    lineage.evidence.chartVersionId !== lineage.intent.chartVersionId ||
    lineage.evidence.capabilityId !== "ziwei.identity.p0" ||
    lineage.reservation.sku !== lineage.intent.sku ||
    lineage.reservation.locale !== lineage.intent.locale ||
    lineage.event.aggregateType !== "report" ||
    lineage.event.aggregateId !== lineage.reservation.reportId ||
    lineage.event.eventType !== (lineage.reservation.asOfDate === null
      ? "report.generation.requested.v1"
      : "report.generation.requested.v2") ||
    !hasUnlockOutboxLineage(lineage.event.payload, lineage.reservation, lineage.entitlement)
  ) {
    return failed("WALLET_RECONCILIATION_FAILED");
  }

  return {
    ok: true as const,
    value: {
      intent: projectIntent(lineage.intent),
      balance,
      reportId: continuation.reportId,
    },
  };
}

export function createWalletUnlockService(
  database: Database,
  wallet: WalletService,
  options: { now?: () => Date; reportVersionResolver?: ReportVersionResolver; dailyReadingWriter?: DailyReadingWriter } = {},
) {
  const now = options.now ?? (() => new Date());
  const reportVersionResolver = options.reportVersionResolver ?? currentReportVersions;
  const daily = createDailyWalletUnlockService(database, wallet, { now, writer: options.dailyReadingWriter });

  return {
    async createPurchaseIntent(actor: CurrentActor, request: WalletPurchaseIntentRequest): Promise<WalletResult<WalletPurchaseIntentV1>> {
      if (request.sku === DAILY_SKU) return daily.createPurchaseIntent(actor, request);
      if (!await verifiedAccount(database, actor)) return failed(actor.kind === "account" ? "WALLET_ACCOUNT_INELIGIBLE" : "WALLET_ACCOUNT_REQUIRED");
      if (actor.kind !== "account") return failed("WALLET_ACCOUNT_REQUIRED");
      const ownerId = actor.userId;
      const product = findLaProduct(request.sku);
      if (
        !product ||
        product.availability !== "active" ||
        !supportedLocale(request.locale) ||
        !product.locales.includes(request.locale) ||
        !nonEmptyId(request.chartId) ||
        !nonEmptyId(request.chartVersionId)
      ) {
        return failed("WALLET_INTENT_INVALID");
      }
      const sku = request.sku;
      const locale = request.locale;

      return database.transaction(async (transaction) => {
        if (!await verifiedAccount(transaction, actor, true)) return failed("WALLET_ACCOUNT_INELIGIBLE");
        await transaction.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`wallet-intent:${ownerId}:${request.chartId}:${sku}`}))`);
        if (await ownedChart(transaction, ownerId, request.chartId, request.chartVersionId) === undefined) return failed("WALLET_CHART_NOT_FOUND");
        if (await evidenceFor(transaction, request.chartVersionId) === undefined) return failed("WALLET_EVIDENCE_MISSING");
        const selectedPrice = await price(transaction, ownerId, request.chartId, sku, now());
        if (!selectedPrice.ok) return selectedPrice;
        const [pending] = await transaction.select().from(walletPurchaseIntents)
          .where(and(
            eq(walletPurchaseIntents.ownerId, ownerId),
            eq(walletPurchaseIntents.chartId, request.chartId),
            eq(walletPurchaseIntents.sku, sku),
            eq(walletPurchaseIntents.status, "pending"),
          ))
          .limit(1)
          .for("update");
        if (pending !== undefined) {
          if (
            pending.chartVersionId === request.chartVersionId &&
            pending.locale === locale &&
            pending.priceLa === selectedPrice.amountLa
          ) {
            return { ok: true as const, value: projectIntent(pending), reused: true };
          }
          if (pending.chartVersionId !== request.chartVersionId || pending.locale !== locale) {
            return failed("WALLET_INTENT_VERSION_CONFLICT");
          }
          // The terms changed (price changed due to rollover or expiry).
          // Concurrency-safe cancel the stale pending intent to avoid permanent pending-row lockout.
          await transaction.update(walletPurchaseIntents).set({
            status: "cancelled",
            stateVersion: pending.stateVersion + 1,
          }).where(and(
            eq(walletPurchaseIntents.id, pending.id),
            eq(walletPurchaseIntents.status, "pending"),
          ));
        }
        const [created] = await transaction.insert(walletPurchaseIntents).values({
          ownerId: actor.userId,
          chartId: request.chartId,
          chartVersionId: request.chartVersionId,
          sku,
          locale,
          priceLa: selectedPrice.amountLa,
          createdAt: now(),
        }).returning();
        if (created === undefined) throw new Error("WALLET_INTENT_CREATE_FAILED");
        return { ok: true as const, value: projectIntent(created), reused: false };
      });
    },

    async unlock(actor: CurrentActor, request: WalletUnlockRequest): Promise<WalletResult<WalletUnlockOutcome>> {
      if (actor.kind !== "account" || !nonEmptyId(request.purchaseIntentId) ||
        !Number.isInteger(request.expectedIntentVersion) || request.expectedIntentVersion < 1 ||
        !Number.isInteger(request.expectedWalletVersion) || request.expectedWalletVersion < 1 ||
        request.idempotencyKey.trim().length === 0) return failed("WALLET_INTENT_INVALID");
      if (!await verifiedAccount(database, actor)) return failed("WALLET_ACCOUNT_INELIGIBLE");

      const [intent] = await database.select().from(walletPurchaseIntents)
        .where(and(eq(walletPurchaseIntents.id, request.purchaseIntentId), eq(walletPurchaseIntents.ownerId, actor.userId)))
        .limit(1);
      if (intent === undefined) {
        return failed("WALLET_INTENT_VERSION_CONFLICT");
      }

      if (intent.sku === DAILY_SKU) return daily.unlock(actor, request);

      if (intent.status === "completed") {
        const [receipt] = await database.select({
          id: walletCommandReceipts.id,
          transactionId: walletCommandReceipts.transactionId,
          fingerprint: walletCommandReceipts.fingerprint,
          result: walletCommandReceipts.result,
        })
          .from(walletAccounts)
          .innerJoin(walletCommandReceipts, eq(walletCommandReceipts.walletId, walletAccounts.id))
          .where(and(
            eq(walletAccounts.ownerId, actor.userId),
            eq(walletCommandReceipts.idempotencyKey, request.idempotencyKey),
          ))
          .limit(1);
        if (receipt === undefined) return failed("WALLET_INTENT_VERSION_CONFLICT");

        if (intent.priceLa === 0) {
          const continuationOperation = `wallet.report.unlock.v1.intent-v${request.expectedIntentVersion}`;
          const fingerprint = walletFingerprint({
            operation: continuationOperation,
            ownerId: actor.userId,
            actorId: actor.userId,
            purchaseIntentId: intent.id,
            amountLa: 0,
            expectedWalletVersion: request.expectedWalletVersion,
            reasonCode: "wallet.report.unlock",
            idempotencyKey: request.idempotencyKey,
          });
          if (receipt.fingerprint !== fingerprint) {
            return failed("WALLET_IDEMPOTENCY_KEY_REUSED");
          }
          const stored = storedReplay(receipt.result);
          if (stored === undefined) return failed("WALLET_RECONCILIATION_FAILED");
          return verifyLineageAndRespond(
            database,
            actor.userId,
            receipt.transactionId,
            request.idempotencyKey,
            stored.receipt.balance,
            stored.continuation as UnlockContinuation,
          );
        }
      } else if (intent.status !== "pending") {
        return failed("WALLET_INTENT_VERSION_CONFLICT");
      }

      if (intent.status === "pending" && intent.stateVersion !== request.expectedIntentVersion) {
        return failed("WALLET_INTENT_VERSION_CONFLICT");
      }

      // Dedicated zero-cost unlock path when effective price is 0 (100% rollover credit)
      if (intent.priceLa === 0) {
        return database.transaction(async (transaction) => {
          const currentNow = now();
          const [initialIntent] = await transaction.select().from(walletPurchaseIntents)
            .where(and(eq(walletPurchaseIntents.id, intent.id), eq(walletPurchaseIntents.ownerId, actor.userId)))
            .limit(1)
            .for("update");
          if (
            initialIntent === undefined ||
            initialIntent.status !== "pending" ||
            initialIntent.stateVersion !== request.expectedIntentVersion ||
            initialIntent.priceLa !== 0
          ) {
            return failed("WALLET_INTENT_VERSION_CONFLICT");
          }
          const chartLockKey = `commerce:chart:${initialIntent.chartId}`;
          await transaction.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${chartLockKey}))`);
          const [lockedIntent] = await transaction.select().from(walletPurchaseIntents)
            .where(and(eq(walletPurchaseIntents.id, intent.id), eq(walletPurchaseIntents.ownerId, actor.userId)))
            .limit(1)
            .for("update");
          if (
            lockedIntent === undefined ||
            lockedIntent.status !== "pending" ||
            lockedIntent.stateVersion !== request.expectedIntentVersion ||
            lockedIntent.priceLa !== 0
          ) {
            return failed("WALLET_INTENT_VERSION_CONFLICT");
          }
          const product = findLaProduct(lockedIntent.sku);
          if (!product || product.availability !== "active" || !supportedLocale(lockedIntent.locale) || !product.locales.includes(lockedIntent.locale)) {
            return failed("WALLET_INTENT_INVALID");
          }
          const sku = lockedIntent.sku;
          const locale = lockedIntent.locale;
          if (await ownedChart(transaction, actor.userId, lockedIntent.chartId, lockedIntent.chartVersionId) === undefined) {
            return failed("WALLET_INTENT_INVALID");
          }
          const evidence = await evidenceFor(transaction, lockedIntent.chartVersionId);
          if (evidence === undefined) return failed("WALLET_INTENT_INVALID");

          const selectedPrice = await price(transaction, actor.userId, lockedIntent.chartId, sku, currentNow);
          if (!selectedPrice.ok || selectedPrice.amountLa !== 0) {
            return failed("WALLET_INTENT_VERSION_CONFLICT");
          }

          const [walletAccount] = await transaction.select().from(walletAccounts)
            .where(eq(walletAccounts.ownerId, actor.userId))
            .limit(1)
            .for("update");
          if (walletAccount === undefined || walletAccount.stateVersion !== request.expectedWalletVersion) {
            return failed("WALLET_VERSION_CONFLICT");
          }

          const continuationOperation = `wallet.report.unlock.v1.intent-v${request.expectedIntentVersion}`;
          const fingerprint = walletFingerprint({
            operation: continuationOperation,
            ownerId: actor.userId,
            actorId: actor.userId,
            purchaseIntentId: lockedIntent.id,
            amountLa: 0,
            expectedWalletVersion: request.expectedWalletVersion,
            reasonCode: "wallet.report.unlock",
            idempotencyKey: request.idempotencyKey,
          });

          const [zeroTx] = await transaction.insert(walletTransactions).values({
            walletId: walletAccount.id,
            kind: "spend",
            idempotencyKey: request.idempotencyKey,
            fingerprint,
            purchaseIntentId: lockedIntent.id,
            topUpOrderId: null,
            reversalOfTransactionId: null,
            createdAt: currentNow,
          }).returning();
          if (zeroTx === undefined) throw new Error("WALLET_TRANSACTION_CREATE_FAILED");

          const reportVersions = reportVersionResolver(locale);
          const [readingContext] = await transaction.select({ revisionId: birthProfileReadingContexts.currentRevisionId })
            .from(ziweiCharts)
            .leftJoin(birthProfileReadingContexts, eq(birthProfileReadingContexts.profileId, ziweiCharts.profileId))
            .where(eq(ziweiCharts.id, lockedIntent.chartId))
            .limit(1);

          const [entitlement] = await transaction.insert(commerceEntitlements).values({
            orderId: null,
            ledgerSpendId: zeroTx.id,
            chartId: lockedIntent.chartId,
            sku,
            ownerId: actor.userId,
            scope: resolveEntitlementScopeForSku(sku, reportVersions.family),
            dailyBonusExpiresAt: sku === "ZIWEI-IDENTITY-P0" ? calculateBonusExpiry(currentNow) : null,
            createdAt: currentNow,
          }).returning();
          if (entitlement === undefined) throw new Error("WALLET_ENTITLEMENT_CREATE_FAILED");

          const timing = reportVersions.family === "v4" || reportVersions.family === "v4_1"
            ? deriveReportTimingLineage(currentNow, { timingRuleVersion: reportVersions.timingRuleVersion })
            : null;

          const [reservation] = await transaction.insert(reportReservations).values({
            reportId: randomUUID(),
            reportVersionId: randomUUID(),
            entitlementId: entitlement.id,
            chartVersionId: lockedIntent.chartVersionId,
            evidenceVersionId: evidence.id,
            knowledgeVersionId: reportVersions.knowledgeVersion,
            promptVersion: reportVersions.promptVersion,
            reportConfigVersion: reportVersions.reportConfigVersion,
            locale,
            sku,
            asOfDate: timing?.asOfDate,
            targetYear: timing?.targetYear,
            timingRuleVersion: timing?.timingRuleVersion,
            sensitivityRuleVersion: timing?.sensitivityRuleVersion,
            readingContextRevisionId: readingContext?.revisionId ?? null,
            createdAt: currentNow,
            updatedAt: currentNow,
          }).returning();
          if (reservation === undefined) throw new Error("WALLET_RESERVATION_CREATE_FAILED");

          const event = await enqueueOutbox(transaction, {
            schemaVersion: 1,
            type: timing === null ? "report.generation.requested.v1" : "report.generation.requested.v2",
            eventId: randomUUID(),
            occurredAt: currentNow.toISOString(),
            traceId: actor.requestId,
            actorId: actor.userId,
            aggregateType: "report",
            aggregateId: reservation.reportId,
            idempotencyKey: "report-request:" + reservation.reportVersionId,
            payload: {
              reportId: reservation.reportId,
              reportVersionId: reservation.reportVersionId,
              entitlementId: entitlement.id,
              chartVersionId: reservation.chartVersionId,
              evidenceVersionId: reservation.evidenceVersionId,
              knowledgeVersionId: reservation.knowledgeVersionId,
              promptVersion: reservation.promptVersion,
              reportConfigVersion: reservation.reportConfigVersion,
              locale,
              sku,
              ...(timing === null ? {} : {
                asOfDate: timing.asOfDate,
                targetYear: timing.targetYear,
                timingRuleVersion: timing.timingRuleVersion,
                sensitivityRuleVersion: timing.sensitivityRuleVersion,
                readingContextRevisionId: reservation.readingContextRevisionId,
              }),
            },
          });
          if (event === undefined) throw new Error("WALLET_OUTBOX_CREATE_FAILED");

          const [completed] = await transaction.update(walletPurchaseIntents).set({
            status: "completed",
            stateVersion: lockedIntent.stateVersion + 1,
            completedAt: currentNow,
          }).where(and(
            eq(walletPurchaseIntents.id, lockedIntent.id),
            eq(walletPurchaseIntents.status, "pending"),
            eq(walletPurchaseIntents.stateVersion, lockedIntent.stateVersion),
          )).returning();
          if (completed === undefined) throw new Error("WALLET_INTENT_COMPLETE_FAILED");

          const continuation: UnlockContinuation = {
            entitlementId: entitlement.id,
            reservationId: reservation.id,
            reportId: reservation.reportId,
            reportVersionId: reservation.reportVersionId,
            outboxId: event.id,
            intentId: completed.id,
            intentStateVersion: completed.stateVersion,
          };

          const currentBalance = await wallet.readBalance(actor);
          if (!currentBalance.ok) throw new Error("WALLET_BALANCE_READ_FAILED");

          const commandReceipt: WalletTransactionReceiptV1 = {
            version: 1,
            commandId: request.idempotencyKey,
            transactionId: zeroTx.id,
            status: "completed",
            balance: currentBalance.value,
            completedAt: currentNow.toISOString(),
          };

          await transaction.insert(walletCommandReceipts).values({
            walletId: walletAccount.id,
            idempotencyKey: request.idempotencyKey,
            fingerprint,
            transactionId: zeroTx.id,
            result: { receipt: commandReceipt, continuation },
            createdAt: currentNow,
          });

          await writeAudit(
            transaction,
            actor.userId,
            "wallet.spend",
            walletAccount.id,
            "wallet.report.unlock",
            actor.requestId,
            actor.requestId,
            {
              intentId: lockedIntent.id,
              sku,
              chartId: lockedIntent.chartId,
              priceLa: 0,
              entitlementId: entitlement.id,
              reportId: reservation.reportId,
            },
            currentNow,
          );

          return verifyLineageAndRespond(
            transaction,
            actor.userId,
            zeroTx.id,
            request.idempotencyKey,
            currentBalance.value,
            continuation,
          );
        });
      }

      const result = await wallet.spend<UnlockContinuation>({
        actor,
        spend: {
          kind: "spend",
          actorId: actor.userId,
          reasonCode: "wallet.report.unlock",
          requestId: actor.requestId,
          traceId: actor.requestId,
          idempotencyKey: request.idempotencyKey,
          purchaseIntentId: intent.id,
          amountLa: intent.priceLa,
          expectedWalletVersion: request.expectedWalletVersion,
        },
        continuationOperation: `wallet.report.unlock.v1.intent-v${request.expectedIntentVersion}`,
        continuationResultCodec: continuationCodec,
        continuation: async (transaction, metadata) => {
          const currentNow = now();
          const [initialIntent] = await transaction.select().from(walletPurchaseIntents)
            .where(and(eq(walletPurchaseIntents.id, intent.id), eq(walletPurchaseIntents.ownerId, actor.userId)))
            .limit(1)
            .for("update");
          if (initialIntent === undefined) {
            return abortWalletSpendContinuation("WALLET_INVALID_INTENT");
          }
          const chartLockKey = `commerce:chart:${initialIntent.chartId}`;
          await transaction.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${chartLockKey}))`);
          const [lockedIntent] = await transaction.select().from(walletPurchaseIntents)
            .where(and(eq(walletPurchaseIntents.id, intent.id), eq(walletPurchaseIntents.ownerId, actor.userId)))
            .limit(1)
            .for("update");
          if (lockedIntent === undefined || lockedIntent.status !== "pending" ||
            lockedIntent.stateVersion !== request.expectedIntentVersion ||
            lockedIntent.priceLa !== metadata.intent.amountLa) {
            return abortWalletSpendContinuation("WALLET_INVALID_INTENT");
          }
          const product = findLaProduct(lockedIntent.sku);
          if (!product || product.availability !== "active" || !supportedLocale(lockedIntent.locale) || !product.locales.includes(lockedIntent.locale)) {
            return abortWalletSpendContinuation("WALLET_INVALID_INTENT");
          }
          const sku = lockedIntent.sku;
          const locale = lockedIntent.locale;
          if (await ownedChart(transaction, actor.userId, lockedIntent.chartId, lockedIntent.chartVersionId) === undefined) {
            return abortWalletSpendContinuation("WALLET_INVALID_INTENT");
          }
          const evidence = await evidenceFor(transaction, lockedIntent.chartVersionId);
          if (evidence === undefined) return abortWalletSpendContinuation("WALLET_INVALID_INTENT");
          const selectedPrice = await price(transaction, actor.userId, lockedIntent.chartId, sku, currentNow);
          if (!selectedPrice.ok || selectedPrice.amountLa !== lockedIntent.priceLa) {
            return abortWalletSpendContinuation("WALLET_INVALID_INTENT");
          }
          const reportVersions = reportVersionResolver(locale);
          const [readingContext] = await transaction.select({ revisionId: birthProfileReadingContexts.currentRevisionId })
            .from(ziweiCharts)
            .leftJoin(birthProfileReadingContexts, eq(birthProfileReadingContexts.profileId, ziweiCharts.profileId))
            .where(eq(ziweiCharts.id, lockedIntent.chartId))
            .limit(1);
          const [entitlement] = await transaction.insert(commerceEntitlements).values({
            orderId: null,
            ledgerSpendId: metadata.spendTransactionId,
            chartId: lockedIntent.chartId,
            sku,
            ownerId: actor.userId,
            scope: resolveEntitlementScopeForSku(sku, reportVersions.family),
            dailyBonusExpiresAt: sku === "ZIWEI-IDENTITY-P0" ? calculateBonusExpiry(currentNow) : null,
            createdAt: currentNow,
          }).returning();
          if (entitlement === undefined) throw new Error("WALLET_ENTITLEMENT_CREATE_FAILED");
          const timing = reportVersions.family === "v4" || reportVersions.family === "v4_1"
            ? deriveReportTimingLineage(currentNow, { timingRuleVersion: reportVersions.timingRuleVersion })
            : null;
          const [reservation] = await transaction.insert(reportReservations).values({
            reportId: randomUUID(),
            reportVersionId: randomUUID(),
            entitlementId: entitlement.id,
            chartVersionId: lockedIntent.chartVersionId,
            evidenceVersionId: evidence.id,
            knowledgeVersionId: reportVersions.knowledgeVersion,
            promptVersion: reportVersions.promptVersion,
            reportConfigVersion: reportVersions.reportConfigVersion,
            locale,
            sku,
            asOfDate: timing?.asOfDate,
            targetYear: timing?.targetYear,
            timingRuleVersion: timing?.timingRuleVersion,
            sensitivityRuleVersion: timing?.sensitivityRuleVersion,
            readingContextRevisionId: readingContext?.revisionId ?? null,
            createdAt: currentNow,
            updatedAt: currentNow,
          }).returning();
          if (reservation === undefined) throw new Error("WALLET_RESERVATION_CREATE_FAILED");
          const event = await enqueueOutbox(transaction, {
            schemaVersion: 1,
            type: timing === null ? "report.generation.requested.v1" : "report.generation.requested.v2",
            eventId: randomUUID(),
            occurredAt: currentNow.toISOString(),
            traceId: actor.requestId,
            actorId: actor.userId,
            aggregateType: "report",
            aggregateId: reservation.reportId,
            idempotencyKey: "report-request:" + reservation.reportVersionId,
            payload: {
              reportId: reservation.reportId,
              reportVersionId: reservation.reportVersionId,
              entitlementId: entitlement.id,
              chartVersionId: reservation.chartVersionId,
              evidenceVersionId: reservation.evidenceVersionId,
              knowledgeVersionId: reservation.knowledgeVersionId,
              promptVersion: reservation.promptVersion,
              reportConfigVersion: reservation.reportConfigVersion,
              locale,
              sku,
              ...(timing === null ? {} : {
                asOfDate: timing.asOfDate,
                targetYear: timing.targetYear,
                timingRuleVersion: timing.timingRuleVersion,
                sensitivityRuleVersion: timing.sensitivityRuleVersion,
                readingContextRevisionId: reservation.readingContextRevisionId,
              }),
            },
          });
          if (event === undefined) throw new Error("WALLET_OUTBOX_CREATE_FAILED");
          const [completed] = await transaction.update(walletPurchaseIntents).set({
            status: "completed",
            stateVersion: lockedIntent.stateVersion + 1,
            completedAt: currentNow,
          }).where(and(
            eq(walletPurchaseIntents.id, lockedIntent.id),
            eq(walletPurchaseIntents.status, "pending"),
            eq(walletPurchaseIntents.stateVersion, lockedIntent.stateVersion),
          )).returning();
          if (completed === undefined) throw new Error("WALLET_INTENT_COMPLETE_FAILED");
          return {
            entitlementId: entitlement.id,
            reservationId: reservation.id,
            reportId: reservation.reportId,
            reportVersionId: reservation.reportVersionId,
            outboxId: event.id,
            intentId: completed.id,
            intentStateVersion: completed.stateVersion,
          };
        },
      });
      if (!result.ok) return failed(result.error.code as WalletUnlockServiceError);
      const continuation = result.value.continuation;
      if (continuation === undefined) return failed("WALLET_RECONCILIATION_FAILED");
      return verifyLineageAndRespond(
        database,
        actor.userId,
        result.value.transactionId,
        request.idempotencyKey,
        result.value.balance,
        continuation,
      );
    },
  };
}

export type WalletUnlockService = ReturnType<typeof createWalletUnlockService>;
