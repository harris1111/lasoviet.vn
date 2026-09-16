import type { Database } from "@lasoviet/database";
import {
  generateCalendarDayRange,
  type AdminBusinessMetricsDayV1,
} from "@lasoviet/contracts";

import { buildBusinessMetricsQuery } from "./business-metrics.sql.js";

export type AdminBusinessMetricsRepository = {
  readMetrics(input: {
    fromDate: string;
    toDate: string;
    now: Date;
  }): Promise<AdminBusinessMetricsDayV1[]>;
};

function parseSafeNonNegativeInteger(value: unknown, field: string): number {
  if (value === null || value === undefined) {
    throw new Error(`INVALID_NUMERIC_AGGREGATE: ${field} is nullish`);
  }
  const str = String(value).trim();
  if (!/^\d+$/.test(str)) {
    throw new Error(`INVALID_NUMERIC_AGGREGATE: ${field} is non-integer or negative (${str})`);
  }
  const num = Number(str);
  if (!Number.isSafeInteger(num) || num < 0) {
    throw new Error(`INVALID_NUMERIC_AGGREGATE: ${field} is unsafe integer (${str})`);
  }
  return num;
}

function parseNullableTiming(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) {
    throw new Error(`INVALID_TIMING_AGGREGATE: ${value}`);
  }
  return Math.round(num * 100) / 100;
}

export function createDatabaseAdminBusinessMetricsRepository(
  database: Database,
): AdminBusinessMetricsRepository {
  return {
    async readMetrics(input) {
      const nowMinus1h = new Date(input.now.getTime() - 60 * 60 * 1000);
      const nowMinus1hIso = nowMinus1h.toISOString();

      const query = buildBusinessMetricsQuery({
        fromDate: input.fromDate,
        toDate: input.toDate,
        nowMinus1hIso,
      });

      const queryResult = await database.execute<{
        date: string;
        ordersCreated: string;
        realPaidOrders: string;
        disabledAutopayOrdersExcluded: string;
        cashCollectedVnd: string;
        recognizedDirectRevenueVnd: string;
        paymentUnmatched: string;
        paymentPendingOver1h: string;
        selfClaimSucceeded: string;
        selfClaimFailed: string;
        reportsReady: string;
        upgradesWithin7Days: string;
        repeatPurchases: string;
        averagePaidToReportReadySecondsRaw: number | string | null;
      }>(query);

      const daysByDate = new Map<string, AdminBusinessMetricsDayV1>();

      for (const row of queryResult) {
        const reportsReady = parseSafeNonNegativeInteger(
          row.reportsReady,
          "reportsReady",
        );
        const avgSeconds = parseNullableTiming(
          row.averagePaidToReportReadySecondsRaw,
        );

        daysByDate.set(row.date, {
          date: row.date,
          ordersCreated: parseSafeNonNegativeInteger(row.ordersCreated, "ordersCreated"),
          realPaidOrders: parseSafeNonNegativeInteger(row.realPaidOrders, "realPaidOrders"),
          disabledAutopayOrdersExcluded: parseSafeNonNegativeInteger(
            row.disabledAutopayOrdersExcluded,
            "disabledAutopayOrdersExcluded",
          ),
          cashCollectedVnd: parseSafeNonNegativeInteger(row.cashCollectedVnd, "cashCollectedVnd"),
          recognizedDirectRevenueVnd: parseSafeNonNegativeInteger(
            row.recognizedDirectRevenueVnd,
            "recognizedDirectRevenueVnd",
          ),
          paymentUnmatched: parseSafeNonNegativeInteger(row.paymentUnmatched, "paymentUnmatched"),
          paymentPendingOver1h: parseSafeNonNegativeInteger(
            row.paymentPendingOver1h,
            "paymentPendingOver1h",
          ),
          qrExpired: null,
          selfClaimSucceeded: parseSafeNonNegativeInteger(
            row.selfClaimSucceeded,
            "selfClaimSucceeded",
          ),
          selfClaimFailed: parseSafeNonNegativeInteger(row.selfClaimFailed, "selfClaimFailed"),
          reportsReady,
          reportsFailed: null,
          upgradesWithin7Days: parseSafeNonNegativeInteger(
            row.upgradesWithin7Days,
            "upgradesWithin7Days",
          ),
          repeatPurchases: parseSafeNonNegativeInteger(
            row.repeatPurchases,
            "repeatPurchases",
          ),
          reportFailureRate: null,
          averagePaidToReportReadySeconds: avgSeconds,
        });
      }

      const expectedDates = generateCalendarDayRange(input.fromDate, input.toDate);
      return expectedDates.map((date) => {
        const existing = daysByDate.get(date);
        if (existing) return existing;
        return {
          date,
          ordersCreated: 0,
          realPaidOrders: 0,
          disabledAutopayOrdersExcluded: 0,
          cashCollectedVnd: 0,
          recognizedDirectRevenueVnd: 0,
          paymentUnmatched: 0,
          paymentPendingOver1h: 0,
          qrExpired: null,
          selfClaimSucceeded: 0,
          selfClaimFailed: 0,
          reportsReady: 0,
          reportsFailed: null,
          upgradesWithin7Days: 0,
          repeatPurchases: 0,
          reportFailureRate: null,
          averagePaidToReportReadySeconds: null,
        };
      });
    },
  };
}
