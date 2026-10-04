import { creditProofSchema, enqueueCommittedWalletUpgrade, projectCommittedWalletUpgrade, type CreditProof } from "./wallet-upgrade-event.js";
import { COMBO_SKU, COMBO_COMPONENT_SKUS, hasCompleteComboAuthority } from "./combo-purchase-authority.js";
import { reserveComboReports } from "./combo-report-reservation.js";
import { membershipPrice, readActiveMembership } from "./membership.service.js";
import { createDailyWalletUnlockService, DAILY_SKU, type DailyReadingWriter } from "./daily-wallet-unlock.service.js";
import { calculateBonusExpiry } from "@lasoviet/contracts";
import { periodKindForSku, periodReportVersions, purchasePeriodKey as resolvePurchasePeriodKey } from "../reports/period-report-config.js";
import { topicIdForSku, topicReportVersions } from "../reports/topic-report-config.js";
import { randomUUID } from "node:crypto";

import { alias } from "drizzle-orm/pg-core";
import { createDatabaseReportQueryRepository } from "../reports/report-query.repository.js";
import { createReportQueryService, ReportQueryDataError } from "../reports/report-query.service.js";
import { reportReservationAuthority } from "../reports/natal-report-authority.js";
import { reservePaidReport } from "../reports/natal-report-reservation.js";
import { and, desc, eq, gt, lte, inArray, notInArray, isNotNull, isNull, ne, notExists, or, sql } from "drizzle-orm";
import {
  calculateRolloverCredit,
  type LaSku,
  LaSkuSchema,
  LA_PRODUCT_CATALOG,
  WalletQuoteRequestV1Schema,
  WalletQuotesV1Schema,
  type WalletQuoteRequestV1,
  type WalletQuoteV1,
  type WalletQuotesV1,
  findLaProduct,
  getLaPrice,
  isQualifyingRolloverSku,
  isSinglePalaceSku,
  resolveEntitlementScopeForSku,
  type CurrentActor,
  type QualifyingSpend,
  type WalletBalanceV1,
  type WalletPurchaseIntentV1,
  type WalletTransactionReceiptV1,
  WalletTransactionReceiptV1Schema,
  WalletPurchaseIntentV1Schema,
  type WalletUpgradePurchaseV1,
} from "@lasoviet/contracts";
import {
  auditLogs,
  authUsers,
  birthProfileReadingContexts,
  birthProfiles,
  commerceEntitlements,
  deletionRequests,
  evidenceSets,
  reportReservations,
  outbox,
  walletAccounts,
  walletCommandReceipts,
  walletPurchaseIntents,
  walletTransactions,
  walletLedgerEntries,
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

const compareCreditCode = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;

type ComboAnnualContinuation = {entitlementId: string; reservationId: string; reportId: string; reportVersionId: string; outboxId: string};

type UnlockContinuation = {
  creditProof?: CreditProof;
  annual?: ComboAnnualContinuation;
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
        "entitlementId", "reservationId", "reportId", "reportVersionId", "outboxId", "intentId", "intentStateVersion", "annual", "creditProof",
      ].includes(key)) ||
      ![candidate.entitlementId, candidate.reservationId, candidate.reportId, candidate.reportVersionId, candidate.outboxId, candidate.intentId]
        .every((id) => typeof id === "string" && id.trim().length > 0) ||
      !Number.isInteger(candidate.intentStateVersion) || candidate.intentStateVersion! < 1
    ) return { success: false };
    if (candidate.creditProof !== undefined && !creditProofSchema.safeParse(candidate.creditProof).success) return {success: false};
    if (candidate.annual !== undefined && (!candidate.annual || typeof candidate.annual !== "object" ||
      Object.keys(candidate.annual).sort().join(",") !== "entitlementId,outboxId,reportId,reportVersionId,reservationId" ||
      !Object.values(candidate.annual).every(value => typeof value === "string" && value.trim().length > 0))) return {success: false};
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
  upgradePurchase?: WalletUpgradePurchaseV1 | null;
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
  const query = database.select({ id: authUsers.id, emailVerified: authUsers.emailVerified, isAnonymous: authUsers.isAnonymous })
    .from(authUsers)
    .where(eq(authUsers.id, actor.userId))
    .limit(1);
  const [user] = forUpdate ? await query.for("update") : await query;
  return user?.emailVerified === true && user.isAnonymous === false;
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
      isNull(birthProfiles.deletedAt),
      notExists(database.select({ id: deletionRequests.id }).from(deletionRequests)
        .where(and(eq(deletionRequests.userId, ownerId), eq(deletionRequests.status, "purged")))),
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
  now: Date,
): Promise<Array<QualifyingSpend & { sku: LaSku; spendId: string }>> {
  const walletRows = await database
    .select({
      sku: commerceEntitlements.sku,
      spendId: walletTransactions.id,
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
    .innerJoin(walletAccounts, eq(walletAccounts.id, walletTransactions.walletId))
    .where(
      and(
        eq(commerceEntitlements.ownerId, ownerId),
        eq(commerceEntitlements.chartId, chartId),
        eq(walletAccounts.ownerId, ownerId),
        eq(walletPurchaseIntents.ownerId, ownerId),
        eq(walletPurchaseIntents.chartId, chartId),
        eq(walletPurchaseIntents.sku, commerceEntitlements.sku),
        eq(walletPurchaseIntents.status, "completed"),
        isNull(commerceEntitlements.revokedAt),
        or(isNull(commerceEntitlements.expiresAt), gt(commerceEntitlements.expiresAt, now)),
        lte(walletTransactions.createdAt, now),
        sql`COALESCE((SELECT sum(${walletLedgerEntries.amountLa}) FROM ${walletLedgerEntries} WHERE ${walletLedgerEntries.transactionId} = ${walletTransactions.id}), 0) = -${walletPurchaseIntents.priceLa}`,
      ),
    );

  const walletSpends: Array<QualifyingSpend & { sku: LaSku; spendId: string }> = [];
  for (const row of walletRows) {
    if (isQualifyingRolloverSku(row.sku)) {
      walletSpends.push({
        sku: row.sku as LaSku,
        spendId: row.spendId,
        amountLa: row.priceLa ?? getLaPrice(row.sku) ?? 120,
        spentAt: row.createdAt,
      });
    }
  }

  return walletSpends;
}

type PriceResult =
  | { ok: true; amountLa: number; creditLa?: number; creditExpiresAt?: string; creditSourceSkus?: LaSku[]; creditProof?: CreditProof }
  | { ok: false; code: WalletUnlockServiceError };

/** Purchase commands retain expiry cleanup; quote reads never mutate grants. */
async function revokeExpiredMonthlyGrant(database: Database, ownerId: string, chartId: string, sku: string, now: Date, periodKey: string) {
  if (sku !== "ZIWEI-MONTHLY-P0") return;
  const member = await readActiveMembership(database, ownerId, now);
  if (sku === "ZIWEI-MONTHLY-P0" && !member) {
    // An expired membership grant must not prevent an explicit standalone purchase for the same month.
    const freeSpends = database.select({ id: walletTransactions.id }).from(walletTransactions)
      .innerJoin(walletPurchaseIntents, eq(walletPurchaseIntents.id, walletTransactions.purchaseIntentId))
      .where(and(eq(walletPurchaseIntents.ownerId, ownerId), eq(walletPurchaseIntents.sku, sku), eq(walletPurchaseIntents.priceLa, 0)));
    await database.update(commerceEntitlements).set({ revokedAt: now, revocationReason: "membership_expired" }).where(and(
      eq(commerceEntitlements.ownerId, ownerId), eq(commerceEntitlements.chartId, chartId), eq(commerceEntitlements.sku, sku),
      eq(commerceEntitlements.periodKey, periodKey), isNull(commerceEntitlements.revokedAt), inArray(commerceEntitlements.ledgerSpendId, freeSpends),
    ));
  }
}

/** Read-only price projection, shared by quotes and authorized purchase commands. */
async function price(
  database: Database,
  ownerId: string,
  chartId: string,
  sku: string,
  now: Date,
  periodKey: string,
): Promise<PriceResult> {
  const product = findLaProduct(sku);
  if (!product || product.availability !== "active") return { ok: false, code: "WALLET_INTENT_INVALID" };

  const member = await readActiveMembership(database, ownerId, now);
  const expiredFreeSpends = sku === "ZIWEI-MONTHLY-P0" && !member
    ? database.select({ id: walletTransactions.id }).from(walletTransactions)
      .innerJoin(walletPurchaseIntents, eq(walletPurchaseIntents.id, walletTransactions.purchaseIntentId))
      .where(and(eq(walletPurchaseIntents.ownerId, ownerId), eq(walletPurchaseIntents.sku, sku), eq(walletPurchaseIntents.priceLa, 0)))
    : undefined;
  const [sameSku] = await database.select({ id: commerceEntitlements.id })
    .from(commerceEntitlements)
    .leftJoin(walletTransactions, eq(walletTransactions.id, commerceEntitlements.ledgerSpendId))
    .where(and(
      eq(commerceEntitlements.ownerId, ownerId),
      eq(commerceEntitlements.chartId, chartId),
      or(eq(commerceEntitlements.sku, sku),
        ...(sku === "ZIWEI-NATAL-EXCERPT-P0" || isSinglePalaceSku(sku)
          ? [eq(commerceEntitlements.sku, "ZIWEI-IDENTITY-P0")] : [])),
      eq(commerceEntitlements.periodKey, periodKey),
      expiredFreeSpends ? or(isNull(commerceEntitlements.ledgerSpendId), notInArray(commerceEntitlements.ledgerSpendId, expiredFreeSpends)) : undefined,
      isNull(commerceEntitlements.revokedAt),
      or(isNull(commerceEntitlements.expiresAt), gt(commerceEntitlements.expiresAt, now)),
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

  if (sku === "ZIWEI-MONTHLY-P0" && member) return { ok: true, amountLa: 0 };

  if (sku === COMBO_SKU) {
    const [ownedComponent] = await database.select({id: commerceEntitlements.id}).from(commerceEntitlements)
      .leftJoin(walletTransactions, eq(walletTransactions.id, commerceEntitlements.ledgerSpendId))
      .where(and(eq(commerceEntitlements.ownerId, ownerId), eq(commerceEntitlements.chartId, chartId),
        inArray(commerceEntitlements.sku, [...COMBO_COMPONENT_SKUS]), isNull(commerceEntitlements.revokedAt),
        or(isNotNull(commerceEntitlements.orderId), and(eq(walletTransactions.kind, "spend"), activeSpendCondition(database))))).limit(1);
    if (ownedComponent) return {ok: false, code: "WALLET_ENTITLEMENT_EXISTS"};
  }

  if (sku === "ZIWEI-IDENTITY-P0") {
    const spends = await qualifyingRolloverSpends(database, ownerId, chartId, now);
    const rollover = calculateRolloverCredit({ spends, now });
    const amountLa = membershipPrice(product.priceLa, rollover.effectivePriceLa, !!member);
    const creditLa = amountLa === rollover.effectivePriceLa ? product.priceLa - rollover.effectivePriceLa : 0;
    const eligible = spends.filter(spend => spend.amountLa > 0 && rollover.windowOpenedAt && rollover.windowExpiresAt && spend.spentAt >= rollover.windowOpenedAt && spend.spentAt < rollover.windowExpiresAt);
    let remaining = creditLa;
    const sources: CreditProof["sources"] = [];
    for (const spend of eligible.sort((a, b) => a.spentAt.getTime() - b.spentAt.getTime() || compareCreditCode(a.sku, b.sku) || compareCreditCode(a.spendId, b.spendId))) {
      if (remaining <= 0) break;
      const creditedLa = Math.min(remaining, spend.amountLa);
      sources.push({spendId: spend.spendId, sku: spend.sku, amountLa: spend.amountLa, creditedLa, spentAt: spend.spentAt.toISOString()});
      remaining -= creditedLa;
    }
    return { ok: true as const, amountLa, creditLa, ...(creditLa > 0 ? {
      creditExpiresAt: rollover.windowExpiresAt!.toISOString(),
      creditSourceSkus: [...new Set(sources.map(spend => spend.sku))],
      creditProof: creditProofSchema.parse({version: 1, creditLa, sources}),
    } : {}) };
  }

  return { ok: true as const, amountLa: membershipPrice(product.priceLa, undefined, !!member) };
}

function validIntentTerms(intent: typeof walletPurchaseIntents.$inferSelect) {
  const product = findLaProduct(intent.sku);
  if (!product || product.availability !== "active" || !supportedLocale(intent.locale) || !product.locales.includes(intent.locale)) return false;
  if (intent.sku === "ZIWEI-IDENTITY-P0") {
    return intent.priceLa >= 0 && intent.priceLa <= 960;
  }
  if (intent.sku === "ZIWEI-MONTHLY-P0" && intent.priceLa === 0) return true;
  return intent.priceLa === product.priceLa || intent.priceLa === membershipPrice(product.priceLa, undefined, true);
}

function hasUnlockOutboxLineage(
  payload: unknown,
  reservation: typeof reportReservations.$inferSelect,
) {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) return false;
  const value = payload as Record<string, unknown>;
  const exact = (key: string, expected: string) => value[key] === expected;
  if (
    !exact("reportId", reservation.reportId) ||
    !exact("reportVersionId", reservation.reportVersionId) ||
    !exact("entitlementId", reservation.entitlementId) ||
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
): Promise<WalletResult<WalletUnlockOutcome>> {
  const sourceEntitlement = alias(commerceEntitlements, "source_entitlement");
  const [lineage] = await db.select({
    origin: sourceEntitlement,
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
    .innerJoin(reportReservations, reportReservationAuthority(db))
    .innerJoin(sourceEntitlement, eq(sourceEntitlement.id, reportReservations.entitlementId))
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
    (lineage.intent.sku !== COMBO_SKU && lineage.entitlement.sku !== lineage.intent.sku) ||
    (lineage.intent.sku !== COMBO_SKU && lineage.intent.periodKey !== lineage.entitlement.periodKey) ||
    lineage.reservation.chartVersionId !== lineage.intent.chartVersionId ||
    lineage.reservation.evidenceVersionId !== lineage.evidence.id ||
    lineage.evidence.chartVersionId !== lineage.intent.chartVersionId ||
    lineage.evidence.capabilityId !== "ziwei.identity.p0" ||
    (lineage.intent.sku !== COMBO_SKU && lineage.reservation.entitlementId === lineage.entitlement.id && lineage.reservation.sku !== lineage.intent.sku) ||
    lineage.reservation.locale !== lineage.intent.locale ||
    !((lineage.event.aggregateType === "report" && lineage.event.aggregateId === lineage.reservation.reportId) ||
      (lineage.event.aggregateType === "order" && lineage.event.aggregateId === lineage.origin.orderId)) ||
    lineage.origin.ownerId !== ownerId || lineage.origin.chartId !== lineage.intent.chartId ||
    lineage.origin.sku !== lineage.reservation.sku ||
    lineage.event.eventType !== (lineage.reservation.asOfDate === null
      ? "report.generation.requested.v1"
      : "report.generation.requested.v2") ||
    !hasUnlockOutboxLineage(lineage.event.payload, lineage.reservation)
  ) {
    return failed("WALLET_RECONCILIATION_FAILED");
  }

  if (lineage.intent.sku === COMBO_SKU) {
    if (lineage.entitlement.sku !== "ZIWEI-IDENTITY-P0" || !continuation.annual || continuation.annual.entitlementId === lineage.entitlement.id || !await hasCompleteComboAuthority(db, {intent: lineage.intent, entitlement: lineage.entitlement})) return failed("WALLET_RECONCILIATION_FAILED");
    const child = continuation.annual;
    const [annual] = await db.select({entitlement: commerceEntitlements, reservation: reportReservations, event: outbox})
      .from(commerceEntitlements).innerJoin(reportReservations, eq(reportReservations.entitlementId, commerceEntitlements.id))
      .innerJoin(outbox, eq(outbox.id, child.outboxId)).where(and(eq(commerceEntitlements.id, child.entitlementId),
        eq(commerceEntitlements.ledgerSpendId, transactionId), eq(commerceEntitlements.sku, "ZIWEI-YEAR-2026-P0"),
        eq(reportReservations.id, child.reservationId), eq(reportReservations.reportId, child.reportId), eq(reportReservations.reportVersionId, child.reportVersionId))).limit(1);
    if (!annual || annual.event.aggregateType !== "report" || annual.event.aggregateId !== child.reportId ||
        annual.event.eventType !== "report.generation.requested.v2" || !hasUnlockOutboxLineage(annual.event.payload, annual.reservation)) return failed("WALLET_RECONCILIATION_FAILED");
  } else if (continuation.annual) return failed("WALLET_RECONCILIATION_FAILED");

  let upgradePurchase: WalletUpgradePurchaseV1 | null = null;
  if (continuation.creditProof !== undefined) {
    upgradePurchase = await projectCommittedWalletUpgrade(db, {ownerId, transactionId, intent: lineage.intent, creditProof: continuation.creditProof});
    if (!upgradePurchase) return failed("WALLET_RECONCILIATION_FAILED");
  }

  return {
    ok: true as const,
    value: {
      intent: projectIntent(lineage.intent),
      balance,
      reportId: continuation.reportId,
      upgradePurchase,
    },
  };
}

export function createWalletUnlockService(
  database: Database,
  wallet: WalletService,
  options: { now?: () => Date; reportVersionResolver?: ReportVersionResolver; dailyReadingWriter?: DailyReadingWriter; resolveMonthlyPeriodKey?: (asOfDate: string) => string } = {},
) {
  const now = options.now ?? (() => new Date());
  const purchasePeriodKey = (sku: string, time: Date) => resolvePurchasePeriodKey(sku, time, options.resolveMonthlyPeriodKey);
  const reportVersionResolver = options.reportVersionResolver ?? currentReportVersions;
  const daily = createDailyWalletUnlockService(database, wallet, { now, writer: options.dailyReadingWriter });

  return {
    async readQuotes(actor: CurrentActor, request: WalletQuoteRequestV1): Promise<WalletResult<WalletQuotesV1>> {
      if (actor.kind !== "account") return failed("WALLET_ACCOUNT_REQUIRED");
      if (!await verifiedAccount(database, actor)) return failed("WALLET_ACCOUNT_INELIGIBLE");
      const parsed = WalletQuoteRequestV1Schema.safeParse(request);
      if (!parsed.success) return failed("WALLET_INTENT_INVALID");
      const input = parsed.data;
      if (!await ownedChart(database, actor.userId, input.chartId, input.chartVersionId)) return failed("WALLET_CHART_NOT_FOUND");
      if (!await evidenceFor(database, input.chartVersionId)) return failed("WALLET_EVIDENCE_MISSING");
      const quoteNow = now();
      const quotes: WalletQuoteV1[] = [];
      for (const catalogProduct of LA_PRODUCT_CATALOG) {
        const product = findLaProduct(catalogProduct.sku)!;
        const row: WalletQuoteV1 = { sku: product.sku as WalletQuoteV1["sku"], state: "unavailable", basePriceLa: product.priceLa,
          priceLa: null, creditLa: 0, discountLa: 0, creditExpiresAt: null, creditSourceSkus: [], reportId: null, reportState: null };
        if (!product.locales.includes(input.locale)) { quotes.push(row); continue; }
        if (product.availability !== "active") { quotes.push({ ...row, state: "coming_soon" }); continue; }
        const sku = product.sku;
        if ((isSinglePalaceSku(sku) && !["v3", "v4", "v4_1"].includes(reportVersionResolver(input.locale).family)) ||
          ((topicIdForSku(sku) !== null || periodKindForSku(sku) !== null || sku === COMBO_SKU) && input.locale !== "vi") ||
          (sku === "ZIWEI-MONTHLY-P0" && !options.resolveMonthlyPeriodKey) ||
          ((sku === "ZIWEI-YEAR-2026-P0" || sku === COMBO_SKU) && deriveReportTimingLineage(quoteNow).targetYear !== 2026) ||
          sku === DAILY_SKU || sku.startsWith("MEMBERSHIP-")) { quotes.push(row); continue; }
        const periodKey = purchasePeriodKey(sku, quoteNow);
        const selectedPrice = await price(database, actor.userId, input.chartId, sku, quoteNow, periodKey);
        if (!selectedPrice.ok) {
          if (selectedPrice.code === "WALLET_ENTITLEMENT_EXISTS") {
            const candidates = await database.select({ reportId: reportReservations.reportId }).from(commerceEntitlements)
              .innerJoin(reportReservations, reportReservationAuthority(database))
              .where(and(eq(commerceEntitlements.ownerId, actor.userId), eq(commerceEntitlements.chartId, input.chartId),
                or(eq(commerceEntitlements.sku, sku), ...((sku === "ZIWEI-NATAL-EXCERPT-P0" || isSinglePalaceSku(sku)) ? [eq(commerceEntitlements.sku, "ZIWEI-IDENTITY-P0")] : [])),
                eq(commerceEntitlements.periodKey, periodKey), isNull(commerceEntitlements.revokedAt),
                eq(reportReservations.chartVersionId, input.chartVersionId), eq(reportReservations.locale, input.locale),
                or(isNull(commerceEntitlements.expiresAt), gt(commerceEntitlements.expiresAt, quoteNow))))
              .orderBy(desc(reportReservations.createdAt));
            const repository = createDatabaseReportQueryRepository(database, () => quoteNow);
            const reports = createReportQueryService({ repository, now: () => quoteNow });
            let projection: Pick<WalletQuoteV1, "reportId" | "reportState"> = { reportId: null, reportState: "unavailable" };
            for (const candidate of candidates) {
              // Reuse reader authority, including linked reservations, paid source and immutable lineage.
              const authorized = await repository.readAuthorizedReport(actor.userId, candidate.reportId);
              if (!authorized || authorized.chartId !== input.chartId || authorized.reservation.chartVersionId !== input.chartVersionId || authorized.reservation.locale !== input.locale) continue;
              try {
                const report = await reports.getReport(actor, candidate.reportId);
                if (!report.ok) continue;
                const state = "state" in report.value ? report.value.state : "failed";
                projection = { reportId: candidate.reportId, reportState: state === "ready" ? "ready" : state === "pending" ? "processing" : "unavailable" };
                break;
              } catch (error) {
                if (!(error instanceof ReportQueryDataError)) throw error;
              }
            }
            quotes.push({ ...row, state: "owned", ...projection });
          } else quotes.push(row);
          continue;
        }
        const creditLa = selectedPrice.creditLa ?? 0;
        quotes.push({ ...row, state: "available", priceLa: selectedPrice.amountLa, creditLa,
          discountLa: product.priceLa - creditLa - selectedPrice.amountLa,
          creditExpiresAt: selectedPrice.creditExpiresAt ?? null, creditSourceSkus: selectedPrice.creditSourceSkus ?? [] });
      }
      return { ok: true, value: WalletQuotesV1Schema.parse({ ...input, version: 1, quotedAt: quoteNow.toISOString(), quotes }) };
    },
    async createPurchaseIntent(actor: CurrentActor, request: WalletPurchaseIntentRequest): Promise<WalletResult<WalletPurchaseIntentV1>> {
      if (request.sku === DAILY_SKU) return daily.createPurchaseIntent(actor, request);
      if (!await verifiedAccount(database, actor)) return failed(actor.kind === "account" ? "WALLET_ACCOUNT_INELIGIBLE" : "WALLET_ACCOUNT_REQUIRED");
      if (actor.kind !== "account") return failed("WALLET_ACCOUNT_REQUIRED");
      const ownerId = actor.userId;
      const product = findLaProduct(request.sku);
      if (
        !product ||
        (request.sku === "ZIWEI-MONTHLY-P0" && !options.resolveMonthlyPeriodKey) ||
        product.availability !== "active" ||
        !supportedLocale(request.locale) ||
        !product.locales.includes(request.locale) ||
        ((topicIdForSku(request.sku) !== null || periodKindForSku(request.sku) !== null || request.sku === COMBO_SKU) && request.locale !== "vi") ||
        !nonEmptyId(request.chartId) ||
        !nonEmptyId(request.chartVersionId)
      ) {
        return failed("WALLET_INTENT_INVALID");
      }
      if (isSinglePalaceSku(request.sku) && !["v3", "v4", "v4_1"].includes(reportVersionResolver(request.locale).family)) {
        return failed("WALLET_INTENT_INVALID");
      }
      const quoteNow = now();
      const sku = request.sku;
      const locale = request.locale;
      if ((sku === "ZIWEI-YEAR-2026-P0" || sku === COMBO_SKU) && deriveReportTimingLineage(quoteNow).targetYear !== 2026) return failed("WALLET_INTENT_INVALID");

      return database.transaction(async (transaction) => {
        if (!await verifiedAccount(transaction, actor, true)) return failed("WALLET_ACCOUNT_INELIGIBLE");
        await transaction.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`wallet-intent:${ownerId}:${request.chartId}:${sku}`}))`);
        if (await ownedChart(transaction, ownerId, request.chartId, request.chartVersionId) === undefined) return failed("WALLET_CHART_NOT_FOUND");
        if (await evidenceFor(transaction, request.chartVersionId) === undefined) return failed("WALLET_EVIDENCE_MISSING");
        await revokeExpiredMonthlyGrant(transaction, ownerId, request.chartId, sku, quoteNow, purchasePeriodKey(sku, quoteNow));
        const selectedPrice = await price(transaction, ownerId, request.chartId, sku, quoteNow, purchasePeriodKey(sku, quoteNow));
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
            pending.priceLa === selectedPrice.amountLa &&
            pending.periodKey === purchasePeriodKey(sku, quoteNow)
          ) {
            return { ok: true as const, value: projectIntent(pending), reused: true };
          }
          if (pending.locale !== locale) {
            return failed("WALLET_INTENT_VERSION_CONFLICT");
          }
          // The terms changed (price changed due to rollover or expiry, or the chart was
          // recalculated into a newer version). An unpaid pending intent is safe to replace.
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
          periodKey: purchasePeriodKey(sku, quoteNow),
          createdAt: quoteNow,
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
      if (isSinglePalaceSku(intent.sku) && !["v3", "v4", "v4_1"].includes(reportVersionResolver(intent.locale).family)) return failed("WALLET_INTENT_INVALID");

      if (intent.sku === DAILY_SKU) return daily.unlock(actor, request);
      if (!await ownedChart(database, actor.userId, intent.chartId, intent.chartVersionId)) return failed("WALLET_CHART_NOT_FOUND");

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

      // Zero-cost audit path for complete rollover credit or included monthly membership access.
      if (intent.priceLa === 0) {
        const zeroResult = await database.transaction<WalletResult<WalletUnlockOutcome>>(async (transaction) => {
          const currentNow = now();
          // Match paid wallet commands: account, wallet, intent, then chart locks.
          if (!await verifiedAccount(transaction, actor, true)) return failed("WALLET_ACCOUNT_INELIGIBLE");
          const [walletAccount] = await transaction.select().from(walletAccounts)
            .where(eq(walletAccounts.ownerId, actor.userId))
            .limit(1)
            .for("update");
          if (walletAccount === undefined || walletAccount.stateVersion !== request.expectedWalletVersion) {
            return failed("WALLET_VERSION_CONFLICT");
          }
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
          if (!product || product.availability !== "active" || !supportedLocale(lockedIntent.locale) || !product.locales.includes(lockedIntent.locale) || ((topicIdForSku(lockedIntent.sku) !== null || periodKindForSku(lockedIntent.sku) !== null || lockedIntent.sku === COMBO_SKU) && lockedIntent.locale !== "vi")) {
            return failed("WALLET_INTENT_INVALID");
          }
          if (lockedIntent.periodKey !== purchasePeriodKey(lockedIntent.sku, currentNow)) return failed("WALLET_INTENT_VERSION_CONFLICT");
          if ((lockedIntent.sku === "ZIWEI-YEAR-2026-P0" || lockedIntent.sku === COMBO_SKU) && deriveReportTimingLineage(currentNow).targetYear !== 2026) return failed("WALLET_INTENT_INVALID");
          const sku = lockedIntent.sku;
          const locale = lockedIntent.locale;
          if (await ownedChart(transaction, actor.userId, lockedIntent.chartId, lockedIntent.chartVersionId) === undefined) {
            return failed("WALLET_INTENT_INVALID");
          }
          const evidence = await evidenceFor(transaction, lockedIntent.chartVersionId);
          if (evidence === undefined) return failed("WALLET_INTENT_INVALID");

          await revokeExpiredMonthlyGrant(transaction, actor.userId, lockedIntent.chartId, sku, currentNow, purchasePeriodKey(sku, currentNow));
          const selectedPrice = await price(transaction, actor.userId, lockedIntent.chartId, sku, currentNow, purchasePeriodKey(sku, currentNow));
          if (!selectedPrice.ok || selectedPrice.amountLa !== 0) {
            return failed("WALLET_INTENT_VERSION_CONFLICT");
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

          const reportVersions = periodKindForSku(sku) ? periodReportVersions() : topicIdForSku(sku) ? topicReportVersions() : reportVersionResolver(locale);
          const [readingContext] = await transaction.select({ revisionId: birthProfileReadingContexts.currentRevisionId })
            .from(ziweiCharts)
            .leftJoin(birthProfileReadingContexts, eq(birthProfileReadingContexts.profileId, ziweiCharts.profileId))
            .where(eq(ziweiCharts.id, lockedIntent.chartId))
            .limit(1);

          const [entitlement] = await transaction.insert(commerceEntitlements).values({
            orderId: null,
            ledgerSpendId: zeroTx.id,
            chartId: lockedIntent.chartId,
            periodKey: lockedIntent.periodKey,
            sku,
            ownerId: actor.userId,
            scope: resolveEntitlementScopeForSku(sku, reportVersions.family),
            dailyBonusExpiresAt: sku === "ZIWEI-IDENTITY-P0" ? calculateBonusExpiry(currentNow) : null,
            createdAt: currentNow,
          }).returning();
          if (entitlement === undefined) throw new Error("WALLET_ENTITLEMENT_CREATE_FAILED");

          const { reservation, event } = await reservePaidReport(transaction, {
            entitlement, chartVersionId: lockedIntent.chartVersionId, evidenceVersionId: evidence.id,
            locale, versions: reportVersions, readingContextRevisionId: readingContext?.revisionId ?? null,
            now: currentNow, traceId: actor.requestId,
          });

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
            ...(selectedPrice.creditProof ? {creditProof: selectedPrice.creditProof} : {}),
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

          await enqueueCommittedWalletUpgrade(transaction, {ownerId: actor.userId, transactionId: zeroTx.id,
            intent: completed, creditProof: selectedPrice.creditProof, traceId: actor.requestId});

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
        if (!zeroResult.ok && zeroResult.code === "WALLET_INTENT_VERSION_CONFLICT") {
          const [completed] = await database.select().from(walletPurchaseIntents).where(eq(walletPurchaseIntents.id, intent.id)).limit(1);
          // A simultaneous identical zero-price command may have completed while this transaction waited.
          // Re-enter only the completed-intent receipt path, which checks the immutable fingerprint.
          if (completed?.status === "completed") return createWalletUnlockService(database, wallet, options).unlock(actor, request);
        }
        return zeroResult;
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
          if (!product || product.availability !== "active" || !supportedLocale(lockedIntent.locale) || !product.locales.includes(lockedIntent.locale) || ((topicIdForSku(lockedIntent.sku) !== null || periodKindForSku(lockedIntent.sku) !== null || lockedIntent.sku === COMBO_SKU) && lockedIntent.locale !== "vi")) {
            return abortWalletSpendContinuation("WALLET_INVALID_INTENT");
          }
          if (lockedIntent.periodKey !== purchasePeriodKey(lockedIntent.sku, currentNow)) return abortWalletSpendContinuation("WALLET_INVALID_INTENT");
          if ((lockedIntent.sku === "ZIWEI-YEAR-2026-P0" || lockedIntent.sku === COMBO_SKU) && deriveReportTimingLineage(currentNow).targetYear !== 2026) return abortWalletSpendContinuation("WALLET_INVALID_INTENT");
          const sku = lockedIntent.sku;
          const locale = lockedIntent.locale;
          if (await ownedChart(transaction, actor.userId, lockedIntent.chartId, lockedIntent.chartVersionId) === undefined) {
            return abortWalletSpendContinuation("WALLET_INVALID_INTENT");
          }
          const evidence = await evidenceFor(transaction, lockedIntent.chartVersionId);
          if (evidence === undefined) return abortWalletSpendContinuation("WALLET_INVALID_INTENT");
          await revokeExpiredMonthlyGrant(transaction, actor.userId, lockedIntent.chartId, sku, currentNow, purchasePeriodKey(sku, currentNow));
          const selectedPrice = await price(transaction, actor.userId, lockedIntent.chartId, sku, currentNow, purchasePeriodKey(sku, currentNow));
          if (!selectedPrice.ok || selectedPrice.amountLa !== lockedIntent.priceLa) {
            return abortWalletSpendContinuation("WALLET_INVALID_INTENT");
          }
          const reportVersions = periodKindForSku(sku) ? periodReportVersions() : topicIdForSku(sku) ? topicReportVersions() : reportVersionResolver(locale);
          const [readingContext] = await transaction.select({ revisionId: birthProfileReadingContexts.currentRevisionId })
            .from(ziweiCharts)
            .leftJoin(birthProfileReadingContexts, eq(birthProfileReadingContexts.profileId, ziweiCharts.profileId))
            .where(eq(ziweiCharts.id, lockedIntent.chartId))
            .limit(1);
          let entitlement: typeof commerceEntitlements.$inferSelect;
          let reservation: typeof reportReservations.$inferSelect;
          let event: typeof outbox.$inferSelect;
          let annual: ComboAnnualContinuation | undefined;
          if (sku === COMBO_SKU) {
            const pair = await reserveComboReports(transaction, {spendId: metadata.spendTransactionId, ownerId: actor.userId,
              chartId: lockedIntent.chartId, chartVersionId: lockedIntent.chartVersionId, evidenceVersionId: evidence.id,
              readingContextRevisionId: readingContext?.revisionId ?? null, natalVersions: reportVersionResolver(locale), now: currentNow, traceId: actor.requestId});
            entitlement = pair.lifetime; reservation = pair.natal.reservation; event = pair.natal.event;
            annual = {entitlementId: pair.annual.id, reservationId: pair.period.reservation.id, reportId: pair.period.reservation.reportId,
              reportVersionId: pair.period.reservation.reportVersionId, outboxId: pair.period.event.id};
          } else {
            const [createdEntitlement] = await transaction.insert(commerceEntitlements).values({
            orderId: null,
            ledgerSpendId: metadata.spendTransactionId,
            chartId: lockedIntent.chartId,
            periodKey: lockedIntent.periodKey,
            sku,
            ownerId: actor.userId,
            scope: resolveEntitlementScopeForSku(sku, reportVersions.family),
            dailyBonusExpiresAt: sku === "ZIWEI-IDENTITY-P0" ? calculateBonusExpiry(currentNow) : null,
            createdAt: currentNow,
          }).returning();
          if (createdEntitlement === undefined) throw new Error("WALLET_ENTITLEMENT_CREATE_FAILED");
            entitlement = createdEntitlement;
            const reserved = await reservePaidReport(transaction, {
            entitlement, chartVersionId: lockedIntent.chartVersionId, evidenceVersionId: evidence.id,
            locale, versions: reportVersions, readingContextRevisionId: readingContext?.revisionId ?? null,
            now: currentNow, traceId: actor.requestId,
          });
            reservation = reserved.reservation; event = reserved.event;
          }
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
          if (sku === COMBO_SKU && !await hasCompleteComboAuthority(transaction, {intent: completed, entitlement})) return abortWalletSpendContinuation("WALLET_INVALID_INTENT");
          await enqueueCommittedWalletUpgrade(transaction, {ownerId: actor.userId, transactionId: metadata.spendTransactionId,
            intent: completed, creditProof: selectedPrice.creditProof, traceId: actor.requestId});
          return {
            ...(annual ? {annual} : {}),
            ...(selectedPrice.creditProof ? {creditProof: selectedPrice.creditProof} : {}),
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
