import {readCompensatedReportFailure} from "./report-compensated-failure.js";
import type {ReportFailedWalletSpendViewV2} from "@lasoviet/contracts";
import { COMBO_SKU, hasCompleteComboAuthority, isSupportedComboPrice } from "../commerce/combo-purchase-authority.js";
import { readActiveMembership } from "../commerce/membership.service.js";
import { findLaProduct } from "@lasoviet/contracts";
import { reportReservationAuthority } from "./natal-report-authority.js";
import { and, desc, eq, gt, isNotNull, isNull, ne, or, sql } from "drizzle-orm";

import type { EntitlementScope } from "@lasoviet/contracts";
import {
  birthProfileRevisions,
  birthProfiles,
  commerceEntitlements,
  commerceOrders,
  deletionRequests,
  evidenceItems,
  evidenceSets,
  reportReservations,
  reportSourceSnapshots,
  reportVersions,
  walletAccounts,
  walletPurchaseIntents,
  walletSpendAllocations,
  walletTransactions,
  ziweiChartVersions,
  ziweiCharts,
  type Database,
} from "@lasoviet/database";

export type AuthorizedReportEntitlement = {
  id: string;
  chartId: string;
  sku: string;
  scope: EntitlementScope;
  periodKey?: string;
  active: true;
  expiresAt?: Date | null;
  dailyBonusExpiresAt?: Date | null;
  grantedAt?: Date;
  source: "order" | "ledger_spend";
};

type AuthorizedReportQueryCommon = {
  reservation: typeof reportReservations.$inferSelect;
  version: typeof reportVersions.$inferSelect | null;
  evidenceItems: Array<typeof evidenceItems.$inferSelect>;
  entitlements: AuthorizedReportEntitlement[];
  chartId: string;
  // FD-104: raw inputs for the display-only chart snapshot. Optional so existing fixtures stay valid.
  chartNormalizedOutput?: unknown;
  sourceSnapshot?: unknown;
};

export type AuthorizedReportQueryRecord =
  | (AuthorizedReportQueryCommon & {
      source: "order";
      order: typeof commerceOrders.$inferSelect;
    })
  | (AuthorizedReportQueryCommon & {
      source: "ledger_spend";
      wallet: {
        spendId: string;
        purchaseIntentId: string;
      };
    });

function hasExclusiveAuthority(entitlement: typeof commerceEntitlements.$inferSelect) {
  return (entitlement.orderId !== null) !== (entitlement.ledgerSpendId !== null);
}

function isSupportedWalletPrice(sku: string, priceLa: number): boolean {
  if (sku === COMBO_SKU) return isSupportedComboPrice(priceLa);
  const product = findLaProduct(sku);
  if (!product || !(["natal", "palace"].includes(product.category) || ["ZIWEI-RELATIONSHIP-P0", "ZIWEI-CAREER-P0", "ZIWEI-MONTHLY-P0", "ZIWEI-YEAR-2026-P0"].includes(sku)) || !Number.isSafeInteger(priceLa)) return false;
  if (sku === "ZIWEI-MONTHLY-P0" && priceLa === 0) return true;
  return sku === "ZIWEI-IDENTITY-P0" ? priceLa >= 0 && priceLa <= product.priceLa : priceLa === product.priceLa || priceLa === Math.ceil(product.priceLa * 0.8);
}

export type ReportQueryRepository = {
  readCompensatedFailure?(ownerId: string, reportId: string): Promise<ReportFailedWalletSpendViewV2 | null>;
  readAuthorizedReport(
    ownerId: string,
    reportId: string,
  ): Promise<AuthorizedReportQueryRecord | null>;
};

export function createDatabaseReportQueryRepository(
  database: Database,
  now: () => Date = () => new Date(),
): ReportQueryRepository {
  const activeExpiry = () => or(isNull(commerceEntitlements.expiresAt), gt(commerceEntitlements.expiresAt, now()));

  async function isActiveSpend(spendId: string, expectedPriceLa: number) {
    const [restoration] = await database
      .select({ id: walletTransactions.id })
      .from(walletTransactions)
      .where(
        and(
          eq(walletTransactions.kind, "restoration"),
          eq(walletTransactions.reversalOfTransactionId, spendId),
        ),
      )
      .limit(1);
    if (restoration) return false;

    const [allocated] = await database
      .select({
        amountLa: sql<number>`coalesce(sum(${walletSpendAllocations.amountLa}), 0)`,
      })
      .from(walletSpendAllocations)
      .where(eq(walletSpendAllocations.spendTransactionId, spendId));
    const allocatedAmountLa = Number(allocated?.amountLa);
    return (
      Number.isSafeInteger(allocatedAmountLa) &&
      allocatedAmountLa >= 0 &&
      allocatedAmountLa === expectedPriceLa
    );
  }

  async function loadWalletAuthority(input: {
    ownerId: string;
    entitlementId?: string;
    reportId?: string;
  }) {
    const predicates = [
      eq(commerceEntitlements.ownerId, input.ownerId),
      activeExpiry(),
      isNull(commerceEntitlements.orderId),
      isNotNull(commerceEntitlements.ledgerSpendId),
      isNull(commerceEntitlements.revokedAt),
      sql`not exists (select 1 from wallet_transactions as restoration where restoration.kind = 'restoration' and restoration.reversal_of_transaction_id = ${walletTransactions.id})`,
    ];
    if (input.entitlementId) {
      predicates.push(eq(commerceEntitlements.id, input.entitlementId));
    }
    if (input.reportId) {
      predicates.push(eq(reportReservations.reportId, input.reportId));
    }

    const [record] = await database
      .select({
        reservation: reportReservations,
        entitlement: commerceEntitlements,
        chart: ziweiCharts,
        profile: birthProfiles,
        revision: birthProfileRevisions,
        chartVersion: ziweiChartVersions,
        spend: walletTransactions,
        intent: walletPurchaseIntents,
        wallet: walletAccounts,
        evidence: evidenceSets,
      })
      .from(commerceEntitlements)
      .innerJoin(
        reportReservations,
        reportReservationAuthority(database),
      )
      .innerJoin(
        walletTransactions,
        and(
          eq(walletTransactions.id, commerceEntitlements.ledgerSpendId),
          eq(walletTransactions.kind, "spend"),
          isNull(walletTransactions.reversalOfTransactionId),
        ),
      )
      .innerJoin(
        walletAccounts,
        and(
          eq(walletAccounts.id, walletTransactions.walletId),
          eq(walletAccounts.ownerId, input.ownerId),
        ),
      )
      .innerJoin(
        walletPurchaseIntents,
        and(
          eq(walletPurchaseIntents.id, walletTransactions.purchaseIntentId),
          eq(walletPurchaseIntents.ownerId, input.ownerId),
          eq(walletPurchaseIntents.status, "completed"),
          or(eq(walletPurchaseIntents.periodKey, commerceEntitlements.periodKey), eq(walletPurchaseIntents.sku, COMBO_SKU)),
        ),
      )
      .innerJoin(ziweiCharts, eq(ziweiCharts.id, commerceEntitlements.chartId))
      .innerJoin(
        birthProfiles,
        and(
          eq(birthProfiles.id, ziweiCharts.profileId),
          eq(birthProfiles.userId, input.ownerId),
          isNull(birthProfiles.deletedAt),
        ),
      )
      .innerJoin(
        birthProfileRevisions,
        and(
          eq(birthProfileRevisions.id, ziweiCharts.profileRevisionId),
          eq(birthProfileRevisions.profileId, birthProfiles.id),
        ),
      )
      .innerJoin(
        ziweiChartVersions,
        and(
          eq(ziweiChartVersions.id, reportReservations.chartVersionId),
          eq(ziweiChartVersions.chartId, commerceEntitlements.chartId),
        ),
      )
      .innerJoin(
        evidenceSets,
        and(
          eq(evidenceSets.id, reportReservations.evidenceVersionId),
          eq(evidenceSets.chartVersionId, reportReservations.chartVersionId),
          eq(evidenceSets.capabilityId, "ziwei.identity.p0"),
        ),
      )
      .where(and(...predicates))
      .orderBy(desc(reportReservations.createdAt), desc(reportReservations.id))
      .limit(1);

    const comboAuthority = !!record && record.intent.sku === COMBO_SKU && await hasCompleteComboAuthority(database, record);
    if (
      !record ||
      !hasExclusiveAuthority(record.entitlement) ||
      record.entitlement.ledgerSpendId !== record.spend.id ||
      record.spend.purchaseIntentId !== record.intent.id ||
      record.intent.completedAt === null ||
      record.intent.chartId !== record.entitlement.chartId ||
      record.intent.chartVersionId !== record.reservation.chartVersionId ||
      (!comboAuthority && record.intent.sku !== record.entitlement.sku) ||
      (!comboAuthority && record.reservation.entitlementId === record.entitlement.id && record.intent.sku !== record.reservation.sku) ||
      record.intent.locale !== record.reservation.locale ||
      !isSupportedWalletPrice(record.intent.sku, record.intent.priceLa)
    ) {
      return null;
    }
    if (record.intent.sku === "ZIWEI-MONTHLY-P0" && record.intent.priceLa === 0 && !await readActiveMembership(database, input.ownerId, now())) return null;
    if (!(await isActiveSpend(record.spend.id, record.intent.priceLa))) {
      return null;
    }

    const [version] = await database
      .select()
      .from(reportVersions)
      .where(eq(reportVersions.reportVersionId, record.reservation.reportVersionId))
      .limit(1);
    if (
      version &&
      (
        version.reportId !== record.reservation.reportId ||
        version.reportVersionId !== record.reservation.reportVersionId ||
        version.entitlementId !== record.reservation.entitlementId ||
        version.chartVersionId !== record.reservation.chartVersionId ||
        version.evidenceVersionId !== record.reservation.evidenceVersionId ||
        version.knowledgeVersionId !== record.reservation.knowledgeVersionId ||
        version.promptVersion !== record.reservation.promptVersion ||
        version.reportConfigVersion !== record.reservation.reportConfigVersion ||
        version.locale !== record.reservation.locale ||
        version.sku !== record.reservation.sku
      )
    ) {
      return null;
    }

    return { ...record, version: version ?? null };
  }

  async function loadActiveChartEntitlements(ownerId: string, chartId: string, chartVersionId: string, locale: string) {
    const orderEntitlements = await database
      .select({
        entitlement: commerceEntitlements,
        reservation: reportReservations,
        version: reportVersions,
      })
      .from(commerceEntitlements)
      .innerJoin(
        commerceOrders,
        and(
          eq(commerceOrders.id, commerceEntitlements.orderId),
          eq(commerceOrders.ownerId, ownerId),
          eq(commerceOrders.status, "paid"),
          eq(commerceOrders.kind, "content_purchase"),
          eq(commerceOrders.chartId, commerceEntitlements.chartId),
          eq(commerceOrders.sku, commerceEntitlements.sku),
        ),
      )
      .innerJoin(
        reportReservations,
        and(
          reportReservationAuthority(database),
          eq(reportReservations.chartVersionId, commerceOrders.chartVersionId),
          or(ne(reportReservations.entitlementId, commerceEntitlements.id), eq(reportReservations.sku, commerceEntitlements.sku)),
          eq(reportReservations.locale, commerceOrders.locale),
        ),
      )
      .innerJoin(
        ziweiChartVersions,
        and(
          eq(ziweiChartVersions.id, reportReservations.chartVersionId),
          eq(ziweiChartVersions.chartId, commerceEntitlements.chartId),
        ),
      )
      .innerJoin(
        evidenceSets,
        and(
          eq(evidenceSets.id, reportReservations.evidenceVersionId),
          eq(evidenceSets.chartVersionId, reportReservations.chartVersionId),
          eq(evidenceSets.capabilityId, "ziwei.identity.p0"),
        ),
      )
      .leftJoin(
        reportVersions,
        eq(reportVersions.reportVersionId, reportReservations.reportVersionId),
      )
      .where(
        and(
          eq(commerceEntitlements.ownerId, ownerId),
          activeExpiry(),
          eq(commerceEntitlements.chartId, chartId),
          eq(reportReservations.chartVersionId, chartVersionId),
          eq(reportReservations.locale, locale),
          isNotNull(commerceEntitlements.orderId),
          isNull(commerceEntitlements.ledgerSpendId),
          isNull(commerceEntitlements.revokedAt),
        ),
      );

    const walletCandidates = await database
      .select({ id: commerceEntitlements.id })
      .from(commerceEntitlements)
      .where(
        and(
          eq(commerceEntitlements.ownerId, ownerId),
          activeExpiry(),
          eq(commerceEntitlements.chartId, chartId),
          isNull(commerceEntitlements.orderId),
          isNotNull(commerceEntitlements.ledgerSpendId),
          isNull(commerceEntitlements.revokedAt),
        ),
      );
    const walletEntitlements = (
      await Promise.all(
        walletCandidates.map((candidate) =>
          loadWalletAuthority({ ownerId, entitlementId: candidate.id }),
        ),
      )
    )
      .filter((record): record is NonNullable<typeof record> => record !== null && record.reservation.chartVersionId === chartVersionId && record.reservation.locale === locale)
      .map((record) => ({
        id: record.entitlement.id,
        chartId: record.entitlement.chartId,
        sku: record.entitlement.sku,
        scope: record.entitlement.scope,
        expiresAt: record.entitlement.expiresAt,
        dailyBonusExpiresAt: record.entitlement.dailyBonusExpiresAt,
        grantedAt: record.entitlement.createdAt,
        periodKey: record.entitlement.periodKey,
        active: true as const,
        source: "ledger_spend" as const,
      }));

    return [
      ...orderEntitlements
        .filter(({ entitlement, reservation, version }) => (
          version === null ||
          (
            version.reportId === reservation.reportId &&
            version.reportVersionId === reservation.reportVersionId &&
            version.entitlementId === reservation.entitlementId &&
            version.chartVersionId === reservation.chartVersionId &&
            version.evidenceVersionId === reservation.evidenceVersionId &&
            version.knowledgeVersionId === reservation.knowledgeVersionId &&
            version.promptVersion === reservation.promptVersion &&
            version.reportConfigVersion === reservation.reportConfigVersion &&
            version.locale === reservation.locale &&
            version.sku === reservation.sku
          )
        ))
        .map(({ entitlement }) => ({
          id: entitlement.id,
          chartId: entitlement.chartId,
          sku: entitlement.sku,
          scope: entitlement.scope,
          expiresAt: entitlement.expiresAt,
          dailyBonusExpiresAt: entitlement.dailyBonusExpiresAt,
          grantedAt: entitlement.createdAt,
          periodKey: entitlement.periodKey,
          active: true as const,
          source: "order" as const,
        })),
      ...walletEntitlements,
    ];
  }

  return {
    readCompensatedFailure(ownerId, reportId) {return readCompensatedReportFailure(database, ownerId, reportId);},
    async readAuthorizedReport(ownerId: string, reportId: string) {
      if (!ownerId || !reportId) {
        return null;
      }

      const [purgedAccount] = await database.select({id: deletionRequests.id}).from(deletionRequests)
        .where(and(eq(deletionRequests.userId, ownerId), eq(deletionRequests.status, "purged"))).limit(1);
      if (purgedAccount) return null;

      const [record] = await database
        .select({
          reservation: reportReservations,
          entitlement: commerceEntitlements,
          order: commerceOrders,
          chart: ziweiCharts,
          profile: birthProfiles,
          revision: birthProfileRevisions,
          chartVersion: ziweiChartVersions,
        })
        .from(reportReservations)
        .innerJoin(
          commerceEntitlements,
          and(
            reportReservationAuthority(database),
            eq(commerceEntitlements.ownerId, ownerId),
          activeExpiry(),
            isNull(commerceEntitlements.revokedAt),
          ),
        )
        .innerJoin(
          commerceOrders,
          and(
            eq(commerceOrders.id, commerceEntitlements.orderId),
            eq(commerceOrders.ownerId, ownerId),
            eq(commerceOrders.chartId, commerceEntitlements.chartId),
            eq(commerceOrders.status, "paid"),
          ),
        )
        .innerJoin(
          ziweiCharts,
          eq(ziweiCharts.id, commerceEntitlements.chartId),
        )
        .innerJoin(
          birthProfiles,
          and(
            eq(birthProfiles.id, ziweiCharts.profileId),
            eq(birthProfiles.userId, ownerId),
            isNull(birthProfiles.deletedAt),
          ),
        )
        .innerJoin(
          birthProfileRevisions,
          and(
            eq(birthProfileRevisions.id, ziweiCharts.profileRevisionId),
            eq(birthProfileRevisions.profileId, birthProfiles.id),
          ),
        )
        .innerJoin(
          ziweiChartVersions,
          and(
            eq(ziweiChartVersions.id, commerceOrders.chartVersionId),
            eq(ziweiChartVersions.chartId, ziweiCharts.id),
          ),
        )
        .where(
          and(
            eq(reportReservations.reportId, reportId),
            eq(reportReservations.chartVersionId, commerceOrders.chartVersionId),
            or(ne(reportReservations.entitlementId, commerceEntitlements.id), eq(reportReservations.sku, commerceEntitlements.sku)),
            eq(commerceOrders.sku, commerceEntitlements.sku),
            or(ne(reportReservations.entitlementId, commerceEntitlements.id), eq(reportReservations.sku, commerceOrders.sku)),
            eq(reportReservations.locale, commerceOrders.locale),
          ),
        )
        .orderBy(
          desc(reportReservations.createdAt),
          desc(reportReservations.id),
        )
        .limit(1);

      if (
        !record ||
        !hasExclusiveAuthority(record.entitlement) ||
        record.order.status !== "paid" ||
        record.order.kind !== "content_purchase" ||
        record.entitlement.orderId !== record.order.id ||
        record.order.sku !== record.entitlement.sku ||
        (record.reservation.entitlementId === record.entitlement.id && record.entitlement.sku !== record.reservation.sku)
      ) {
        return record === undefined ? readWalletAuthorizedReport(ownerId, reportId) : null;
      }

      const reservationRecord = record.reservation;

      const [version] = await database
        .select()
        .from(reportVersions)
        .where(
          eq(reportVersions.reportVersionId, reservationRecord.reportVersionId),
        )
        .limit(1);

      if (version) {
        if (
          version.reportId !== reservationRecord.reportId ||
          version.reportVersionId !== reservationRecord.reportVersionId ||
          version.entitlementId !== record.reservation.entitlementId ||
          version.chartVersionId !== record.order.chartVersionId ||
          version.evidenceVersionId !== reservationRecord.evidenceVersionId ||
          version.knowledgeVersionId !== reservationRecord.knowledgeVersionId ||
          version.promptVersion !== reservationRecord.promptVersion ||
          version.reportConfigVersion !== reservationRecord.reportConfigVersion ||
          version.locale !== reservationRecord.locale ||
          version.sku !== reservationRecord.sku ||
          (reservationRecord.entitlementId === record.entitlement.id && version.sku !== record.order.sku)
        ) {
          return null;
        }

        const [evidenceSet] = await database
          .select({
            id: evidenceSets.id,
            chartVersionId: evidenceSets.chartVersionId,
          })
          .from(evidenceSets)
          .where(
            and(
              eq(evidenceSets.id, version.evidenceVersionId),
              eq(evidenceSets.chartVersionId, record.order.chartVersionId),
              eq(evidenceSets.capabilityId, "ziwei.identity.p0"),
            ),
          )
          .limit(1);

        if (!evidenceSet) {
          return null;
        }

        const evidenceList = await database
          .select()
          .from(evidenceItems)
          .where(eq(evidenceItems.evidenceSetId, version.evidenceVersionId))
          .orderBy(evidenceItems.evidenceKey);

        return {
          reservation: reservationRecord,
          order: record.order,
          version,
          evidenceItems: evidenceList,
          source: "order",
          chartId: record.entitlement.chartId,
          entitlements: await loadActiveChartEntitlements(ownerId, record.entitlement.chartId, record.reservation.chartVersionId, record.reservation.locale),
          ...(await loadChartSnapshotInputs(version)),
        };
      }

      const [evidenceSet] = await database
        .select({ id: evidenceSets.id })
        .from(evidenceSets)
        .where(
          and(
            eq(evidenceSets.id, reservationRecord.evidenceVersionId),
            eq(evidenceSets.chartVersionId, reservationRecord.chartVersionId),
            eq(evidenceSets.capabilityId, "ziwei.identity.p0"),
          ),
        )
        .limit(1);
      if (!evidenceSet) {
        return null;
      }

      return {
        reservation: reservationRecord,
        order: record.order,
        version: null,
        evidenceItems: [],
        ...(await loadChartSnapshotInputs(reservationRecord)),
        source: "order",
        chartId: record.entitlement.chartId,
        entitlements: await loadActiveChartEntitlements(ownerId, record.entitlement.chartId, record.reservation.chartVersionId, record.reservation.locale),
      };
    },
  };

  async function loadChartSnapshotInputs(version: Pick<typeof reportVersions.$inferSelect, "chartVersionId" | "reportVersionId" | "reportId"> | null) {
    if (!version) return { chartNormalizedOutput: null, sourceSnapshot: null };
    const [chartRow] = await database
      .select({ normalizedOutput: ziweiChartVersions.normalizedOutput })
      .from(ziweiChartVersions)
      .where(eq(ziweiChartVersions.id, version.chartVersionId))
      .limit(1);
    const [snapshotRow] = await database
      .select({ snapshot: reportSourceSnapshots.snapshot })
      .from(reportSourceSnapshots)
      .where(and(eq(reportSourceSnapshots.reportVersionId, version.reportVersionId), eq(reportSourceSnapshots.chartVersionId, version.chartVersionId), eq(reportSourceSnapshots.reportId, version.reportId)))
      .limit(1);
    return {
      chartNormalizedOutput: chartRow?.normalizedOutput ?? null,
      sourceSnapshot: snapshotRow?.snapshot ?? null,
    };
  }

  async function readWalletAuthorizedReport(
    ownerId: string,
    reportId: string,
  ): Promise<AuthorizedReportQueryRecord | null> {
    const record = await loadWalletAuthority({ ownerId, reportId });
    if (!record) return null;
    const items = record.version
      ? await database.select().from(evidenceItems).where(eq(evidenceItems.evidenceSetId, record.version.evidenceVersionId)).orderBy(evidenceItems.evidenceKey)
      : [];
    return {
      source: "ledger_spend",
      reservation: record.reservation,
      version: record.version,
      evidenceItems: items,
      entitlements: await loadActiveChartEntitlements(ownerId, record.entitlement.chartId, record.reservation.chartVersionId, record.reservation.locale),
      wallet: { spendId: record.spend.id, purchaseIntentId: record.intent.id },
      chartId: record.entitlement.chartId,
      ...(await loadChartSnapshotInputs(record.version ?? record.reservation)),
    };
  }
}
