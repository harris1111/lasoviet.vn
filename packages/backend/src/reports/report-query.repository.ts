import { and, desc, eq, isNull } from "drizzle-orm";

import {
  birthProfileRevisions,
  birthProfiles,
  commerceEntitlements,
  commerceOrders,
  evidenceItems,
  evidenceSets,
  reportReservations,
  reportVersions,
  ziweiChartVersions,
  ziweiCharts,
  type Database,
} from "@lasoviet/database";

export type AuthorizedReportQueryRecord = {
  reservation: typeof reportReservations.$inferSelect;
  order: typeof commerceOrders.$inferSelect;
  version: typeof reportVersions.$inferSelect | null;
  evidenceItems: Array<typeof evidenceItems.$inferSelect>;
};

export type ReportQueryRepository = {
  readAuthorizedReport(
    ownerId: string,
    reportId: string,
  ): Promise<AuthorizedReportQueryRecord | null>;
};

export function createDatabaseReportQueryRepository(
  database: Database,
): ReportQueryRepository {
  return {
    async readAuthorizedReport(ownerId: string, reportId: string) {
      if (!ownerId || !reportId) {
        return null;
      }

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
            eq(commerceEntitlements.id, reportReservations.entitlementId),
            eq(commerceEntitlements.ownerId, ownerId),
          ),
        )
        .innerJoin(
          commerceOrders,
          and(
            eq(commerceOrders.id, commerceEntitlements.orderId),
            eq(commerceOrders.ownerId, ownerId),
            eq(commerceOrders.chartId, commerceEntitlements.chartId),
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
            eq(reportReservations.sku, commerceEntitlements.sku),
            eq(commerceOrders.sku, commerceEntitlements.sku),
            eq(reportReservations.sku, commerceOrders.sku),
            eq(reportReservations.locale, commerceOrders.locale),
          ),
        )
        .orderBy(
          desc(reportReservations.createdAt),
          desc(reportReservations.id),
        )
        .limit(1);

      if (!record) {
        return null;
      }

      if (
        record.order.sku !== record.entitlement.sku ||
        record.entitlement.sku !== record.reservation.sku
      ) {
        return null;
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
          version.entitlementId !== record.entitlement.id ||
          version.chartVersionId !== record.order.chartVersionId ||
          version.evidenceVersionId !== reservationRecord.evidenceVersionId ||
          version.knowledgeVersionId !== reservationRecord.knowledgeVersionId ||
          version.promptVersion !== reservationRecord.promptVersion ||
          version.reportConfigVersion !== reservationRecord.reportConfigVersion ||
          version.locale !== reservationRecord.locale ||
          version.sku !== reservationRecord.sku ||
          version.sku !== record.order.sku ||
          version.sku !== record.entitlement.sku
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
        };
      }

      return {
        reservation: reservationRecord,
        order: record.order,
        version: null,
        evidenceItems: [],
      };
    },
  };
}
