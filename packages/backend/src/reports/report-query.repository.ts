import { and, desc, eq } from "drizzle-orm";

import {
  commerceEntitlements,
  evidenceItems,
  reportReservations,
  reportVersions,
  type Database,
} from "@lasoviet/database";

export type AuthorizedReportQueryRecord = {
  reservation: typeof reportReservations.$inferSelect;
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

      const [reservation] = await database
        .select({
          reservation: reportReservations,
        })
        .from(reportReservations)
        .innerJoin(
          commerceEntitlements,
          eq(reportReservations.entitlementId, commerceEntitlements.id),
        )
        .where(
          and(
            eq(reportReservations.reportId, reportId),
            eq(commerceEntitlements.ownerId, ownerId),
          ),
        )
        .orderBy(
          desc(reportReservations.createdAt),
          desc(reportReservations.id),
        )
        .limit(1);

      if (!reservation) {
        return null;
      }

      const reservationRecord = reservation.reservation;

      const [version] = await database
        .select()
        .from(reportVersions)
        .where(
          eq(reportVersions.reportVersionId, reservationRecord.reportVersionId),
        )
        .limit(1);

      let evidenceList: Array<typeof evidenceItems.$inferSelect> = [];
      if (version) {
        evidenceList = await database
          .select()
          .from(evidenceItems)
          .where(eq(evidenceItems.evidenceSetId, version.evidenceVersionId))
          .orderBy(evidenceItems.evidenceKey);
      }

      return {
        reservation: reservationRecord,
        version: version ?? null,
        evidenceItems: evidenceList,
      };
    },
  };
}
