import { z } from "zod";

export const AdminBusinessMetricsSourceAvailabilityV1Schema = z
  .object({
    directCommerceRevenue: z
      .object({
        status: z.literal("available"),
        label: z.literal("current legacy/direct content-order revenue only"),
      })
      .strict(),
    laWalletAccounting: z
      .object({
        status: z.literal("unavailable"),
        reasonCode: z.literal("LA_LEDGER_SOURCE_MISSING"),
        topUpVnd: z.null(),
        deferredRevenueVnd: z.null(),
        recognizedLaRevenueVnd: z.null(),
        promotionalLaSpend: z.null(),
      })
      .strict(),
    refunds: z
      .object({
        status: z.literal("unavailable"),
        reasonCode: z.literal("REFUND_TRANSITION_SOURCE_MISSING"),
        count: z.null(),
      })
      .strict(),
    supportTickets: z
      .object({
        status: z.literal("unavailable"),
        reasonCode: z.literal("SUPPORT_TICKET_SOURCE_MISSING"),
        ticketsPer100Orders: z.null(),
      })
      .strict(),
    qrExpiry: z
      .object({
        status: z.literal("unavailable"),
        reasonCode: z.literal("ORDER_EXPIRY_TRANSITION_SOURCE_MISSING"),
        count: z.null(),
      })
      .strict(),
    reportFailures: z
      .object({
        status: z.literal("unavailable"),
        reasonCode: z.literal("REPORT_FAILURE_TRANSITION_SOURCE_MISSING"),
        count: z.null(),
        failureRate: z.null(),
      })
      .strict(),
  })
  .strict();

export type AdminBusinessMetricsSourceAvailabilityV1 = z.infer<
  typeof AdminBusinessMetricsSourceAvailabilityV1Schema
>;

export const DEFAULT_BUSINESS_METRICS_SOURCE_AVAILABILITY_V1: AdminBusinessMetricsSourceAvailabilityV1 =
  {
    directCommerceRevenue: {
      status: "available",
      label: "current legacy/direct content-order revenue only",
    },
    laWalletAccounting: {
      status: "unavailable",
      reasonCode: "LA_LEDGER_SOURCE_MISSING",
      topUpVnd: null,
      deferredRevenueVnd: null,
      recognizedLaRevenueVnd: null,
      promotionalLaSpend: null,
    },
    refunds: {
      status: "unavailable",
      reasonCode: "REFUND_TRANSITION_SOURCE_MISSING",
      count: null,
    },
    supportTickets: {
      status: "unavailable",
      reasonCode: "SUPPORT_TICKET_SOURCE_MISSING",
      ticketsPer100Orders: null,
    },
    qrExpiry: {
      status: "unavailable",
      reasonCode: "ORDER_EXPIRY_TRANSITION_SOURCE_MISSING",
      count: null,
    },
    reportFailures: {
      status: "unavailable",
      reasonCode: "REPORT_FAILURE_TRANSITION_SOURCE_MISSING",
      count: null,
      failureRate: null,
    },
  };
