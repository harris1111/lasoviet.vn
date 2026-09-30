import { dailyReadingDate, readPurchasedDailyReading } from "./daily-wallet-unlock.service.js";
import {
  NormalizedBirthProfileV1Schema,
  PersonalDailyReadingV1Schema,
  type CurrentActor,
  type NormalizedBirthProfileV1,
  type PersonalDailyReadingV1,
  type Result,
} from "@lasoviet/contracts";
import { and, desc, eq, gt } from "drizzle-orm";
import { commerceEntitlements, reportReservations, type Database } from "@lasoviet/database";
import { createDatabaseReportQueryRepository } from "../reports/report-query.repository.js";
import type { ZiweiQueryRepository } from "../ziwei/ziwei-query.repository.js";

export type DailyReadingGrant = { grantedAt: Date; expiresAt: Date; chartVersionId: string; content?: PersonalDailyReadingV1; purchaseId?: string };
export type DailyReadingError = "DAILY_READING_FORBIDDEN" | "CHART_NOT_FOUND" | "DAILY_READING_UNAVAILABLE";
export type DailyReadingService = {
  read(actor: CurrentActor, chartId: string): Promise<Result<PersonalDailyReadingV1, DailyReadingError> & { purchaseId?: string }>;
};

/** Reuses the report authority checks: ownership, paid order or allocated spend, and refund revocation. */
export function createDatabaseDailyReadingAccess(database: Database) {
  return async (ownerId: string, chartId: string, now: Date): Promise<DailyReadingGrant | null> => {
    const purchased = await readPurchasedDailyReading(database, ownerId, chartId, dailyReadingDate(now), now);
    if (purchased) return { grantedAt: purchased.createdAt, expiresAt: purchased.expiresAt, chartVersionId: purchased.chartVersionId, content: purchased.content, purchaseId: purchased.id };
    const candidates = await database.select({
      id: commerceEntitlements.id,
      reportId: reportReservations.reportId,
    }).from(commerceEntitlements)
      .innerJoin(reportReservations, eq(reportReservations.entitlementId, commerceEntitlements.id))
      .where(and(
        eq(commerceEntitlements.ownerId, ownerId),
        eq(commerceEntitlements.chartId, chartId),
        eq(commerceEntitlements.sku, "ZIWEI-IDENTITY-P0"),
        gt(commerceEntitlements.dailyBonusExpiresAt, now),
      )).orderBy(desc(reportReservations.createdAt)).limit(1);
    if (!candidates[0]) return null;
    const authorized = await createDatabaseReportQueryRepository(database, () => now)
      .readAuthorizedReport(ownerId, candidates[0].reportId);
    const entitlement = authorized?.entitlements.find((item) => item.id === candidates[0]?.id);
    if (!authorized || !entitlement?.grantedAt || !entitlement.dailyBonusExpiresAt) return null;
    return {
      grantedAt: entitlement.grantedAt,
      expiresAt: entitlement.dailyBonusExpiresAt,
      chartVersionId: authorized.reservation.chartVersionId,
    };
  };
}

export function createPersonalDailyReadingService(options: {
  charts: ZiweiQueryRepository;
  access: (ownerId: string, chartId: string, now: Date) => Promise<DailyReadingGrant | null>;
  writer: (profile: NormalizedBirthProfileV1, options: { chartId: string; chartVersionId: string; asOfDate: string; now: () => Date }) => PersonalDailyReadingV1;
  now?: () => Date;
}): DailyReadingService {
  const failure = (code: DailyReadingError): Result<never, DailyReadingError> => ({
    ok: false, error: { code, messageKey: `ziwei.${code.toLowerCase()}`, retryable: false },
  });
  return {
    async read(actor, chartId) {
      if (actor.kind !== "account") return failure("DAILY_READING_FORBIDDEN");
      const now = (options.now ?? (() => new Date()))();
      const chart = await options.charts.readAuthorizedChart(actor, chartId, now);
      if (!chart) return failure("CHART_NOT_FOUND");
      const grant = await options.access(actor.userId, chartId, now);
      if (!grant || grant.chartVersionId !== chart.chartVersionId ||
        now < grant.grantedAt || now >= grant.expiresAt) return failure("DAILY_READING_FORBIDDEN");
      const asOfDate = dailyReadingDate(now);
      if (grant.content) {
        const stored = PersonalDailyReadingV1Schema.safeParse(grant.content);
        if (!stored.success || !stored.data.qualityGate.passed || stored.data.chartId !== chart.chartId ||
          stored.data.chartVersionId !== chart.chartVersionId || stored.data.asOfDate !== asOfDate) return failure("DAILY_READING_UNAVAILABLE");
        return { ok: true, value: stored.data, purchaseId: grant.purchaseId };
      }
      const profile = NormalizedBirthProfileV1Schema.safeParse({ ...chart.normalizedInput, originalInput: chart.originalInput });
      if (!profile.success) return failure("DAILY_READING_UNAVAILABLE");
      // Reading dates are server-owned in the product timezone; clients cannot request arbitrary paid days.
      const reading = PersonalDailyReadingV1Schema.safeParse(options.writer(profile.data, {
        chartId: chart.chartId, chartVersionId: chart.chartVersionId, asOfDate, now: () => now,
      }));
      if (!reading.success || !reading.data.qualityGate.passed || reading.data.chartId !== chart.chartId ||
        reading.data.chartVersionId !== chart.chartVersionId || reading.data.asOfDate !== asOfDate) return failure("DAILY_READING_UNAVAILABLE");
      return { ok: true, value: reading.data };
    },
  };
}
