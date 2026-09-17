import { randomUUID } from "node:crypto";

import { and, desc, eq, isNotNull, isNull, ne, or, sql } from "drizzle-orm";
import {
  resolveEntitlementScopeForSku,
  type CommerceSku,
  type CurrentActor,
  type WalletBalanceV1,
  type WalletPurchaseIntentV1,
  WalletPurchaseIntentV1Schema,
} from "@lasoviet/contracts";
import {
  authUsers,
  birthProfileReadingContexts,
  birthProfiles,
  commerceEntitlements,
  commerceOrders,
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
  type WalletResultCodec,
} from "../wallet/wallet.repository.js";
import {
  currentReportVersions,
  deriveReportTimingLineage,
  type ReportVersionResolver,
} from "../reports/identity-report-config.js";

type WalletSku = "ZIWEI-NATAL-EXCERPT-P0" | "ZIWEI-IDENTITY-P0";
type WalletLocale = "vi" | "en";
const supportedSku = (value: string): value is WalletSku =>
  value === "ZIWEI-NATAL-EXCERPT-P0" || value === "ZIWEI-IDENTITY-P0";
const supportedLocale = (value: string): value is WalletLocale => value === "vi" || value === "en";
const nonEmptyId = (value: string) => value.trim().length > 0;
const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

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
  | "WALLET_ENTITLEMENT_EXISTS"
  | "WALLET_UPGRADE_INELIGIBLE"
  | "WALLET_IDEMPOTENCY_KEY_REUSED"
  | "WALLET_INSUFFICIENT_BALANCE"
  | "WALLET_VERSION_CONFLICT"
  | "WALLET_RECONCILIATION_FAILED"
  | "WALLET_INVALID_COMMAND";

export type WalletPurchaseIntentRequest = {
  chartId: string;
  chartVersionId: string;
  sku: string;
  locale: string;
};

export type WalletUnlockRequest = {
  purchaseIntentId: string;
  expectedIntentVersion: number;
  expectedWalletVersion: number;
  idempotencyKey: string;
};

export type WalletUnlockResult = {
  intent: WalletPurchaseIntentV1;
  balance: WalletBalanceV1;
  reportId: string;
};

function failed(code: WalletUnlockServiceError) {
  return { ok: false as const, code };
}

function projectIntent(row: typeof walletPurchaseIntents.$inferSelect): WalletPurchaseIntentV1 {
  const result = WalletPurchaseIntentV1Schema.safeParse({
    id: row.id,
    sku: row.sku,
    chartVersionId: row.chartVersionId,
    locale: row.locale,
    amountLa: row.priceLa,
    status: row.status,
    stateVersion: row.stateVersion,
    createdAt: row.createdAt.toISOString(),
  });
  if (!result.success) throw new Error("WALLET_INTENT_PROJECTION_INVALID");
  return result.data;
}

async function verifiedAccount(database: Database, actor: CurrentActor, lock = false) {
  if (actor.kind !== "account") return false;
  let query = database.select({
    emailVerified: authUsers.emailVerified,
    isAnonymous: authUsers.isAnonymous,
  }).from(authUsers).where(eq(authUsers.id, actor.userId)).limit(1);
  if (lock) query = query.for("update") as typeof query;
  const [account] = await query;
  return account !== undefined && account.emailVerified && !account.isAnonymous;
}

function activeSpendCondition() {
  return sql`not exists (
    select 1
    from wallet_transactions as wallet_restoration
    where wallet_restoration.reversal_of_transaction_id = ${walletTransactions.id}
  )`;
}

async function ownedChart(
  database: Database,
  ownerId: string,
  chartId: string,
  chartVersionId: string,
) {
  const [chart] = await database.select({ id: ziweiCharts.id })
    .from(ziweiCharts)
    .innerJoin(birthProfiles, and(
      eq(birthProfiles.id, ziweiCharts.profileId),
      eq(birthProfiles.userId, ownerId),
      isNull(birthProfiles.deletedAt),
    ))
    .innerJoin(ziweiChartVersions, and(
      eq(ziweiChartVersions.id, chartVersionId),
      eq(ziweiChartVersions.chartId, ziweiCharts.id),
    ))
    .where(eq(ziweiCharts.id, chartId))
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

async function tierOneTimestamp(database: Database, ownerId: string, chartId: string) {
  const [orderBacked] = await database.select({ timestamp: commerceOrders.paidAt })
    .from(commerceEntitlements)
    .innerJoin(commerceOrders, and(
      eq(commerceOrders.id, commerceEntitlements.orderId),
      eq(commerceOrders.ownerId, ownerId),
      eq(commerceOrders.kind, "content_purchase"),
      eq(commerceOrders.sku, "ZIWEI-NATAL-EXCERPT-P0"),
      eq(commerceOrders.status, "paid"),
    ))
    .where(and(
      eq(commerceEntitlements.ownerId, ownerId),
      eq(commerceEntitlements.chartId, chartId),
      eq(commerceEntitlements.sku, "ZIWEI-NATAL-EXCERPT-P0"),
    ))
    .orderBy(desc(commerceOrders.paidAt))
    .limit(1);
  if (orderBacked?.timestamp) return orderBacked.timestamp;

  const [walletBacked] = await database.select({ timestamp: walletTransactions.createdAt })
    .from(commerceEntitlements)
    .innerJoin(walletTransactions, and(
      eq(walletTransactions.id, commerceEntitlements.ledgerSpendId),
      eq(walletTransactions.kind, "spend"),
      activeSpendCondition(),
    ))
    .where(and(
      eq(commerceEntitlements.ownerId, ownerId),
      eq(commerceEntitlements.chartId, chartId),
      eq(commerceEntitlements.sku, "ZIWEI-NATAL-EXCERPT-P0"),
    ))
    .orderBy(desc(walletTransactions.createdAt))
    .limit(1);
  return walletBacked?.timestamp;
}

async function price(
  database: Database,
  ownerId: string,
  chartId: string,
  sku: WalletSku,
  now: Date,
) {
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
          activeSpendCondition(),
        ),
      ),
    ))
    .limit(1);
  if (sameSku !== undefined) return failed("WALLET_ENTITLEMENT_EXISTS");
  if (sku === "ZIWEI-NATAL-EXCERPT-P0") return { ok: true as const, amountLa: 240 as const };
  const tierOneAt = await tierOneTimestamp(database, ownerId, chartId);
  return tierOneAt !== undefined && now.getTime() < tierOneAt.getTime() + sevenDaysMs
    ? { ok: true as const, amountLa: 720 as const }
    : { ok: true as const, amountLa: 960 as const };
}

function validIntentTerms(intent: typeof walletPurchaseIntents.$inferSelect) {
  return supportedSku(intent.sku) && supportedLocale(intent.locale) &&
    (intent.sku !== "ZIWEI-NATAL-EXCERPT-P0" || (intent.locale === "vi" && intent.priceLa === 240)) &&
    (intent.sku !== "ZIWEI-IDENTITY-P0" || (intent.priceLa === 720 || intent.priceLa === 960));
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

export function createWalletUnlockService(
  database: Database,
  wallet: WalletService,
  options: { now?: () => Date; reportVersionResolver?: ReportVersionResolver } = {},
) {
  const now = options.now ?? (() => new Date());
  const reportVersionResolver = options.reportVersionResolver ?? currentReportVersions;

  return {
    async createPurchaseIntent(actor: CurrentActor, request: WalletPurchaseIntentRequest) {
      if (!await verifiedAccount(database, actor)) return failed(actor.kind === "account" ? "WALLET_ACCOUNT_INELIGIBLE" : "WALLET_ACCOUNT_REQUIRED");
      if (actor.kind !== "account") return failed("WALLET_ACCOUNT_REQUIRED");
      if (!supportedSku(request.sku) || !supportedLocale(request.locale) || !nonEmptyId(request.chartId) || !nonEmptyId(request.chartVersionId) ||
        (request.sku === "ZIWEI-NATAL-EXCERPT-P0" && request.locale !== "vi")) {
        return failed("WALLET_INTENT_INVALID");
      }
      const sku = request.sku;
      const locale = request.locale;

      return database.transaction(async (transaction) => {
        if (!await verifiedAccount(transaction, actor, true)) return failed("WALLET_ACCOUNT_INELIGIBLE");
        await transaction.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`wallet-intent:${actor.userId}:${request.chartId}:${sku}`}))`);
        if (await ownedChart(transaction, actor.userId, request.chartId, request.chartVersionId) === undefined) return failed("WALLET_CHART_NOT_FOUND");
        if (await evidenceFor(transaction, request.chartVersionId) === undefined) return failed("WALLET_EVIDENCE_MISSING");
        const selectedPrice = await price(transaction, actor.userId, request.chartId, sku, now());
        if (!selectedPrice.ok) return selectedPrice;
        const [pending] = await transaction.select().from(walletPurchaseIntents)
          .where(and(
            eq(walletPurchaseIntents.ownerId, actor.userId),
            eq(walletPurchaseIntents.chartId, request.chartId),
            eq(walletPurchaseIntents.sku, sku),
            eq(walletPurchaseIntents.status, "pending"),
          ))
          .limit(1)
          .for("update");
        if (pending !== undefined) {
          if (pending.chartVersionId !== request.chartVersionId || pending.locale !== locale || pending.priceLa !== selectedPrice.amountLa) {
            return failed("WALLET_INTENT_VERSION_CONFLICT");
          }
          return { ok: true as const, value: projectIntent(pending), reused: true };
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

    async unlock(actor: CurrentActor, request: WalletUnlockRequest) {
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
      if (intent.status === "pending" && intent.stateVersion !== request.expectedIntentVersion) {
        return failed("WALLET_INTENT_VERSION_CONFLICT");
      }
      if (intent.status === "completed") {
        const [receipt] = await database.select({ id: walletCommandReceipts.id })
          .from(walletAccounts)
          .innerJoin(walletCommandReceipts, eq(walletCommandReceipts.walletId, walletAccounts.id))
          .where(and(
            eq(walletAccounts.ownerId, actor.userId),
            eq(walletCommandReceipts.idempotencyKey, request.idempotencyKey),
          ))
          .limit(1);
        if (receipt === undefined) return failed("WALLET_INTENT_VERSION_CONFLICT");
      } else if (intent.status !== "pending") {
        return failed("WALLET_INTENT_VERSION_CONFLICT");
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
          if (!supportedSku(lockedIntent.sku) || !supportedLocale(lockedIntent.locale)) {
            return abortWalletSpendContinuation("WALLET_INVALID_INTENT");
          }
          const sku = lockedIntent.sku;
          const locale = lockedIntent.locale;
          if (sku === "ZIWEI-NATAL-EXCERPT-P0" && locale !== "vi") {
            return abortWalletSpendContinuation("WALLET_INVALID_INTENT");
          }
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
            scope: resolveEntitlementScopeForSku(sku as CommerceSku, reportVersions.family),
            createdAt: currentNow,
          }).returning();
          if (entitlement === undefined) throw new Error("WALLET_ENTITLEMENT_CREATE_FAILED");
          const timing = reportVersions.family === "v4"
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
      const [lineage] = await database.select({
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
          eq(walletTransactions.id, result.value.transactionId),
          eq(walletTransactions.kind, "spend"),
          eq(walletAccounts.ownerId, actor.userId),
          eq(walletPurchaseIntents.id, continuation.intentId),
          eq(walletPurchaseIntents.ownerId, actor.userId),
          eq(commerceEntitlements.id, continuation.entitlementId),
          eq(commerceEntitlements.ownerId, actor.userId),
          isNull(commerceEntitlements.orderId),
          eq(reportReservations.id, continuation.reservationId),
          eq(reportReservations.reportId, continuation.reportId),
          eq(reportReservations.reportVersionId, continuation.reportVersionId),
          activeSpendCondition(),
        ))
        .limit(1);
      if (lineage === undefined ||
        result.value.commandId !== request.idempotencyKey ||
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
          balance: result.value.balance,
          reportId: continuation.reportId,
        },
      };
    },
  };
}

export type WalletUnlockService = ReturnType<typeof createWalletUnlockService>;
