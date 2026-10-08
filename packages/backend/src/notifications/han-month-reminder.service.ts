import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { findLaProduct, type HanMonthReminderEmailRequest, type ZiweiPeriodReadingFactsV1 } from "@lasoviet/contracts";
import { authUsers, birthProfiles, commerceEntitlements, notificationDeliveries, reportReservations, ziweiCharts, type Database } from "@lasoviet/database";
import { dailyReadingDate } from "../commerce/daily-wallet-unlock.service.js";
import { createDatabaseReportQueryRepository } from "../reports/report-query.repository.js";
import { createReportQueryService, ReportQueryDataError } from "../reports/report-query.service.js";
import { createDatabaseReportSourceSnapshotRepository } from "../reports/report-source-snapshot.repository.js";
import { PALACE_TITLES_VI } from "./nurture-signin.service.js";
import { fingerprintEmail, generateUnsubscribeToken, verifyUnsubscribeToken, type NotificationPreferenceStore } from "./notification-preference.js";

export type LunarReminderDay = { year: number; month: number; isLeapMonth: boolean; day: number };
export function dueComputedHanPeriod(facts: ZiweiPeriodReadingFactsV1, day: LunarReminderDay) {
  if (facts.kind !== "annual" || facts.targetYear !== day.year) return null;
  return facts.periods.find((period) => period.year === day.year && period.month === day.month && period.isLeapMonth === day.isLeapMonth &&
    day.day >= period.dayRange[0] && day.day <= period.dayRange[1] && period.obstacleStarIds.length > 0 &&
    period.obstacleStarIds.every((id) => period.starIds.includes(id))) ?? null;
}

export function createHanMonthReminderService(database: Database, options: {
  preferenceStore: NotificationPreferenceStore; tokenSecret: string;
  resolveLunarDay: (asOfDate: string) => LunarReminderDay; now?: () => Date;
}) {
  const nowValue = options.now ?? (() => new Date());
  async function requestFor(reportId: string): Promise<HanMonthReminderEmailRequest | null> {
    // Track 2's real-provider/stability gate controls activation. No reserved-product mail.
    if (!["ZIWEI-YEAR-P0", "ZIWEI-YEAR-2026-P0"].some(sku => findLaProduct(sku)?.availability === "active")) return null;
    const now = nowValue();
    const day = options.resolveLunarDay(dailyReadingDate(now));
    const [row] = await database.select({ reservation: reportReservations, owner: authUsers, chartId: commerceEntitlements.chartId }).from(reportReservations)
      .innerJoin(commerceEntitlements, eq(commerceEntitlements.id, reportReservations.entitlementId))
      .innerJoin(authUsers, and(eq(authUsers.id, commerceEntitlements.ownerId), eq(authUsers.emailVerified, true), eq(authUsers.isAnonymous, false)))
      .innerJoin(ziweiCharts, eq(ziweiCharts.id, commerceEntitlements.chartId))
      .innerJoin(birthProfiles, and(eq(birthProfiles.id, ziweiCharts.profileId), eq(birthProfiles.userId, authUsers.id), isNull(birthProfiles.deletedAt)))
      .where(and(eq(reportReservations.reportId, reportId), inArray(reportReservations.sku, ["ZIWEI-YEAR-P0", "ZIWEI-YEAR-2026-P0"].filter(sku => findLaProduct(sku)?.availability === "active")))).orderBy(desc(reportReservations.createdAt), desc(reportReservations.id)).limit(1);
    if (!row || !await options.preferenceStore.isNonTransactionalAllowed(row.owner.email, row.owner.id, "han") ||
      !(await options.preferenceStore.getPreferences(row.owner.id)).hanRemindersAllowed) return null;
    const repository = createDatabaseReportQueryRepository(database, nowValue);
    try {
      const ready = await createReportQueryService({ repository, now: nowValue }).getReport({ kind: "account", userId: row.owner.id, sessionId: "han-reminder", requestId: `han:${reportId}` }, reportId);
      if (!ready.ok || !("state" in ready.value) || ready.value.state !== "ready" || ready.value.contentVersion !== "ziwei.period-reading.v1" || ready.value.content.kind !== "annual" || ready.value.reportVersionId !== row.reservation.reportVersionId) return null;
      const source = await createDatabaseReportSourceSnapshotRepository(database).getByReportVersionId(row.reservation.reportVersionId);
      const facts = source?.snapshot.periodReading;
      if (!source || source.reportId !== reportId || source.chartVersionId !== row.reservation.chartVersionId || !facts || facts.chartId !== row.chartId || facts.chartVersionId !== source.chartVersionId) return null;
      const period = dueComputedHanPeriod(facts, day);
      if (!period) return null;
      const primaryFocus = PALACE_TITLES_VI[period.palaceId];
      if (!primaryFocus) return null;
      const idempotencyKey = `han:${row.owner.id}:${row.chartId}:${period.id}`;
      const token = generateUnsubscribeToken({ userId: row.owner.id, email: row.owner.email }, options.tokenSecret, now);
      return {
        version: 1, kind: "han_month_reminder", idempotencyKey, recipient: row.owner.email.trim().toLowerCase(), locale: "vi",
        actionUrl: `https://lasoviet.net/bao-cao/${encodeURIComponent(reportId)}`,
        unsubscribeUrl: `https://lasoviet.net/thong-bao/huy-dang-ky#token=${encodeURIComponent(token)}`, requestId: idempotencyKey,
        userId: row.owner.id, chartId: row.chartId, chartVersionId: source.chartVersionId, reportId,
        targetYear: facts.targetYear, monthIndex: period.month, marker: "warn", primaryFocus,
        prepText: "Xem lại các gợi ý chuẩn bị trong phần luận giải tháng của bạn.",
        periodId: period.id, isLeapMonth: period.isLeapMonth, periodPart: period.part, dayRange: period.dayRange,
        periodLabel: `${period.month}${period.isLeapMonth ? " nhuận" : ""}${period.part === "normal" ? "" : period.part === "first" ? " — nửa đầu" : " — nửa sau"} âm lịch`,
      };
    } catch (error) {
      if (error instanceof ReportQueryDataError || (error instanceof Error && error.message === "CORRUPT_REPORT_SOURCE_SNAPSHOT")) return null;
      throw error;
    }
  }
  return {
    requestFor,
    async isEligible(request: HanMonthReminderEmailRequest) {
      if (!request.reportId) return false;
      const current = await requestFor(request.reportId);
      if (!current) return false;
      const unsubscribe = new URL(request.unsubscribeUrl);
      if (unsubscribe.origin !== "https://lasoviet.net" || unsubscribe.pathname !== "/thong-bao/huy-dang-ky" || unsubscribe.username || unsubscribe.password || unsubscribe.search) return false;
      const token = new URLSearchParams(unsubscribe.hash.slice(1)).get("token");
      const verified = token ? verifyUnsubscribeToken(token, options.tokenSecret, undefined, nowValue()) : null;
      return verified?.ok === true && verified.value.userId === current.userId && verified.value.email === current.recipient &&
        Object.keys(current).filter((key) => key !== "unsubscribeUrl").every((key) => JSON.stringify(current[key as keyof typeof current]) === JSON.stringify(request[key as keyof typeof request]));
    },
    async scanAndEnqueue(limit = 25) {
      if (!["ZIWEI-YEAR-P0", "ZIWEI-YEAR-2026-P0"].some(sku => findLaProduct(sku)?.availability === "active")) return 0;
      const now = nowValue();
      const rows = await database.select({ id: reportReservations.id, reportId: reportReservations.reportId }).from(reportReservations)
        .where(inArray(reportReservations.sku, ["ZIWEI-YEAR-P0", "ZIWEI-YEAR-2026-P0"].filter(sku => findLaProduct(sku)?.availability === "active")))
        .orderBy(sql`${reportReservations.lastReminderCheckAt} nulls first`, reportReservations.createdAt).limit(Math.max(1, Math.min(limit, 100)));
      let enqueued = 0;
      for (const row of rows) {
        await database.update(reportReservations).set({ lastReminderCheckAt: now }).where(eq(reportReservations.id, row.id));
        const request = await requestFor(row.reportId);
        if (!request) continue;
        const inserted = await database.insert(notificationDeliveries).values({ idempotencyKey: request.idempotencyKey, kind: request.kind, recipientFingerprint: fingerprintEmail(request.recipient, options.tokenSecret), requestPayload: request, status: "pending", createdAt: now, updatedAt: now }).onConflictDoNothing().returning({ id: notificationDeliveries.id });
        enqueued += inserted.length;
      }
      return enqueued;
    },
  };
}
