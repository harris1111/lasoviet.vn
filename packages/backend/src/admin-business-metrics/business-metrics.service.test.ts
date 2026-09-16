import { describe, expect, it, vi } from "vitest";

import {
  AdminBusinessMetricsV1Schema,
  generateCalendarDayRange,
  type AdminAccessV1,
  type AdminBusinessMetricsDayV1,
  type AdminReadContextV1,
} from "@lasoviet/contracts";

import { createAdminBusinessMetricsService } from "./business-metrics.service.js";
import type { AdminBusinessMetricsRepository } from "./business-metrics.repository.js";

const sampleAccess: AdminAccessV1 = {
  actorId: "admin-1",
  roleAssignmentId: "role-1",
  role: "operations",
  capabilities: ["admin.commerce.read"],
};

const sampleContext: AdminReadContextV1 = {
  access: sampleAccess,
  requestId: "req-1",
  traceId: "trace-1",
};

const emptyDay = (date: string): AdminBusinessMetricsDayV1 => ({
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
});

function mockDayRange(fromDate: string, toDate: string): AdminBusinessMetricsDayV1[] {
  return generateCalendarDayRange(fromDate, toDate).map(emptyDay);
}

describe("AdminBusinessMetricsService", () => {
  const fixedNow = new Date("2026-09-14T10:00:00.000Z"); // 17:00 in Asia/Ho_Chi_Minh

  it("defaults to 30 calendar days ending today in Asia/Ho_Chi_Minh with injected clock", async () => {
    const mockRepo: AdminBusinessMetricsRepository = {
      readMetrics: vi.fn(async ({ fromDate, toDate }) => mockDayRange(fromDate, toDate)),
    };

    const service = createAdminBusinessMetricsService({
      repository: mockRepo,
      now: () => fixedNow,
    });

    const result = await service.readBusinessMetrics(sampleContext, {});

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.version).toBe(1);
    expect(result.value.timezone).toBe("Asia/Ho_Chi_Minh");
    expect(result.value.toDate).toBe("2026-09-14");
    expect(result.value.fromDate).toBe("2026-08-16");
    expect(result.value.days.length).toBe(30);
    expect(result.value.generatedAt).toBe(fixedNow.toISOString());
    expect(mockRepo.readMetrics).toHaveBeenCalledWith({
      fromDate: "2026-08-16",
      toDate: "2026-09-14",
      now: fixedNow,
    });
  });

  it("accepts valid explicit from and to dates", async () => {
    const mockRepo: AdminBusinessMetricsRepository = {
      readMetrics: vi.fn(async ({ fromDate, toDate }) => mockDayRange(fromDate, toDate)),
    };

    const service = createAdminBusinessMetricsService({
      repository: mockRepo,
      now: () => fixedNow,
    });

    const result = await service.readBusinessMetrics(sampleContext, {
      from: "2026-09-01",
      to: "2026-09-05",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.fromDate).toBe("2026-09-01");
    expect(result.value.toDate).toBe("2026-09-05");
    expect(result.value.days.length).toBe(5);
  });

  it("accepts exactly 92 inclusive calendar days and rejects 93 days", async () => {
    const mockRepo: AdminBusinessMetricsRepository = {
      readMetrics: vi.fn(async ({ fromDate, toDate }) => mockDayRange(fromDate, toDate)),
    };

    const service = createAdminBusinessMetricsService({
      repository: mockRepo,
      now: () => fixedNow,
    });

    // 2026-06-15 to 2026-09-14:
    // June 15-30: 16 days; July: 31 days; Aug: 31 days; Sept 1-14: 14 days => 16 + 31 + 31 + 14 = 92 days
    const exact92 = await service.readBusinessMetrics(sampleContext, {
      from: "2026-06-15",
      to: "2026-09-14",
    });
    expect(exact92.ok).toBe(true);
    if (exact92.ok) {
      expect(exact92.value.days.length).toBe(92);
      expect(exact92.value.fromDate).toBe("2026-06-15");
      expect(exact92.value.toDate).toBe("2026-09-14");
    }

    // 2026-06-14 to 2026-09-14 => 93 days
    const rejected93 = await service.readBusinessMetrics(sampleContext, {
      from: "2026-06-14",
      to: "2026-09-14",
    });
    expect(rejected93.ok).toBe(false);
    if (!rejected93.ok) {
      expect(rejected93.error.code).toBe("ADMIN_METRICS_FILTER_INVALID");
    }
  });

  it("handles Vietnam date rollover around 17:00 UTC (00:00 next day Asia/Ho_Chi_Minh)", async () => {
    const mockRepo: AdminBusinessMetricsRepository = {
      readMetrics: vi.fn(async ({ fromDate, toDate }) => mockDayRange(fromDate, toDate)),
    };

    // 1 ms before 17:00 UTC: still 2026-09-14 23:59:59.999 in Vietnam
    const beforeRollover = new Date("2026-09-14T16:59:59.999Z");
    const serviceBefore = createAdminBusinessMetricsService({
      repository: mockRepo,
      now: () => beforeRollover,
    });
    const resultBefore = await serviceBefore.readBusinessMetrics(sampleContext, {});
    expect(resultBefore.ok).toBe(true);
    if (resultBefore.ok) {
      expect(resultBefore.value.toDate).toBe("2026-09-14");
      expect(resultBefore.value.fromDate).toBe("2026-08-16");
    }

    // Exactly 17:00:00 UTC: rolls over to 2026-09-15 00:00:00 in Vietnam
    const atRollover = new Date("2026-09-14T17:00:00.000Z");
    const serviceAt = createAdminBusinessMetricsService({
      repository: mockRepo,
      now: () => atRollover,
    });
    const resultAt = await serviceAt.readBusinessMetrics(sampleContext, {});
    expect(resultAt.ok).toBe(true);
    if (resultAt.ok) {
      expect(resultAt.value.toDate).toBe("2026-09-15");
      expect(resultAt.value.fromDate).toBe("2026-08-17");
    }
  });

  it("rejects invalid date format or non-existent calendar date", async () => {
    const mockRepo: AdminBusinessMetricsRepository = {
      readMetrics: vi.fn(),
    };

    const service = createAdminBusinessMetricsService({
      repository: mockRepo,
      now: () => fixedNow,
    });

    const invalidFormat = await service.readBusinessMetrics(sampleContext, {
      from: "not-a-date",
      to: "2026-09-14",
    });
    expect(invalidFormat.ok).toBe(false);
    if (!invalidFormat.ok) {
      expect(invalidFormat.error.code).toBe("ADMIN_METRICS_FILTER_INVALID");
    }

    const nonExistentDate = await service.readBusinessMetrics(sampleContext, {
      from: "2026-02-30",
      to: "2026-03-05",
    });
    expect(nonExistentDate.ok).toBe(false);
    if (!nonExistentDate.ok) {
      expect(nonExistentDate.error.code).toBe("ADMIN_METRICS_FILTER_INVALID");
    }
  });

  it("rejects when from date is after to date", async () => {
    const mockRepo: AdminBusinessMetricsRepository = {
      readMetrics: vi.fn(),
    };

    const service = createAdminBusinessMetricsService({
      repository: mockRepo,
      now: () => fixedNow,
    });

    const result = await service.readBusinessMetrics(sampleContext, {
      from: "2026-09-15",
      to: "2026-09-10",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("ADMIN_METRICS_FILTER_INVALID");
    }
  });

  it("masks SQL/repository exceptions as ADMIN_PROJECTION_UNAVAILABLE", async () => {
    const mockRepo: AdminBusinessMetricsRepository = {
      readMetrics: vi.fn(async () => {
        throw new Error("fatal postgres connection dropped: SELECT * FROM secrets");
      }),
    };

    const service = createAdminBusinessMetricsService({
      repository: mockRepo,
      now: () => fixedNow,
    });

    const result = await service.readBusinessMetrics(sampleContext, {});

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("ADMIN_PROJECTION_UNAVAILABLE");
      expect(JSON.stringify(result.error)).not.toContain("postgres");
      expect(JSON.stringify(result.error)).not.toContain("secrets");
    }
  });

  it("reports authoritative explicit source availability matching requirements", async () => {
    const mockRepo: AdminBusinessMetricsRepository = {
      readMetrics: vi.fn(async ({ fromDate, toDate }) => mockDayRange(fromDate, toDate)),
    };

    const service = createAdminBusinessMetricsService({
      repository: mockRepo,
      now: () => fixedNow,
    });

    const result = await service.readBusinessMetrics(sampleContext, {
      from: "2026-09-14",
      to: "2026-09-14",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.sourceAvailability).toEqual({
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
    });

    expect(AdminBusinessMetricsV1Schema.safeParse(result.value).success).toBe(true);
  });
});
