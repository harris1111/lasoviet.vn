import { z } from "zod";

import {
  addCalendarDays,
  countInclusiveCalendarDays,
  generateCalendarDayRange,
  getVietnamLocalDateKey,
  isValidCalendarDate,
} from "./admin-business-metrics-calendar.js";
import {
  AdminBusinessMetricsSourceAvailabilityV1Schema,
  DEFAULT_BUSINESS_METRICS_SOURCE_AVAILABILITY_V1,
  type AdminBusinessMetricsSourceAvailabilityV1,
} from "./admin-business-metrics-source-availability.js";

export {
  addCalendarDays,
  countInclusiveCalendarDays,
  generateCalendarDayRange,
  getVietnamLocalDateKey,
  isValidCalendarDate,
  AdminBusinessMetricsSourceAvailabilityV1Schema,
  DEFAULT_BUSINESS_METRICS_SOURCE_AVAILABILITY_V1,
  type AdminBusinessMetricsSourceAvailabilityV1,
};

export const AdminBusinessMetricsFiltersV1Schema = z
  .object({
    fromDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine(isValidCalendarDate, {
        message: "Invalid calendar date for fromDate",
      }),
    toDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine(isValidCalendarDate, {
        message: "Invalid calendar date for toDate",
      }),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.fromDate > data.toDate) {
      ctx.addIssue({
        code: "custom",
        message: "from date must be before or equal to to date",
      });
      return;
    }
    const days = countInclusiveCalendarDays(data.fromDate, data.toDate);
    if (days > 92) {
      ctx.addIssue({
        code: "custom",
        message: "date range must not exceed 92 inclusive days",
      });
    }
  });

export type AdminBusinessMetricsFiltersV1 = z.infer<
  typeof AdminBusinessMetricsFiltersV1Schema
>;

export function parseAdminBusinessMetricsFiltersV1(
  input: { from?: unknown; to?: unknown },
  now: Date = new Date(),
) {
  const today = getVietnamLocalDateKey(now);
  const defaultTo = today;
  const defaultFrom = addCalendarDays(today, -29);

  const rawFrom = input.from === undefined ? defaultFrom : input.from;
  const rawTo = input.to === undefined ? defaultTo : input.to;

  return AdminBusinessMetricsFiltersV1Schema.safeParse({
    fromDate: rawFrom,
    toDate: rawTo,
  });
}

export const AdminBusinessMetricsDayV1Schema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(isValidCalendarDate),
    ordersCreated: z.number().int().min(0),
    realPaidOrders: z.number().int().min(0),
    disabledAutopayOrdersExcluded: z.number().int().min(0),
    cashCollectedVnd: z.number().int().min(0),
    recognizedDirectRevenueVnd: z.number().int().min(0),
    paymentUnmatched: z.number().int().min(0),
    paymentPendingOver1h: z.number().int().min(0),
    qrExpired: z.number().int().min(0).nullable(),
    selfClaimSucceeded: z.number().int().min(0),
    selfClaimFailed: z.number().int().min(0),
    reportsReady: z.number().int().min(0),
    reportsFailed: z.number().int().min(0).nullable(),
    upgradesWithin7Days: z.number().int().min(0),
    repeatPurchases: z.number().int().min(0),
    reportFailureRate: z.number().min(0).max(1).nullable(),
    averagePaidToReportReadySeconds: z.number().min(0).nullable(),
  })
  .strict();

export type AdminBusinessMetricsDayV1 = z.infer<
  typeof AdminBusinessMetricsDayV1Schema
>;

export const AdminBusinessMetricsV1Schema = z
  .object({
    version: z.literal(1),
    timezone: z.literal("Asia/Ho_Chi_Minh"),
    fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(isValidCalendarDate),
    toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(isValidCalendarDate),
    generatedAt: z.iso.datetime({ offset: true }),
    days: z.array(AdminBusinessMetricsDayV1Schema).max(92),
    sourceAvailability: AdminBusinessMetricsSourceAvailabilityV1Schema,
  })
  .strict()
  .superRefine((data, ctx) => {
    const expectedDates = generateCalendarDayRange(data.fromDate, data.toDate);
    if (data.days.length !== expectedDates.length) {
      ctx.addIssue({
        code: "custom",
        message: "days must exactly cover every date from fromDate through toDate",
      });
      return;
    }
    for (let i = 0; i < expectedDates.length; i++) {
      const day = data.days[i];
      if (!day || day.date !== expectedDates[i]) {
        ctx.addIssue({
          code: "custom",
          message: `day at index ${i} must have date ${expectedDates[i]}`,
        });
        return;
      }
    }
  });

export type AdminBusinessMetricsV1 = z.infer<
  typeof AdminBusinessMetricsV1Schema
>;
