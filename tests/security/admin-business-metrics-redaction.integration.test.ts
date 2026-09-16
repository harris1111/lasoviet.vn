import { describe, expect, it, vi } from "vitest";

import { AdminBusinessMetricsController } from "../../apps/api/src/admin-overview/admin-business-metrics.controller.js";
import { verifyInternalActorToken } from "../../apps/api/src/auth/internal-actor.guard.js";
import {
  AdminBusinessMetricsV1Schema,
  type AdminBusinessMetricsV1,
} from "@lasoviet/contracts";

vi.mock("../../apps/api/src/auth/internal-actor.guard.js", () => ({
  verifyInternalActorToken: vi.fn(async () => ({
    kind: "account" as const,
    userId: "admin-actor-42",
    sessionId: "session-42",
    requestId: "req-sec-42",
  })),
}));

const sampleMetrics: AdminBusinessMetricsV1 = {
  version: 1,
  timezone: "Asia/Ho_Chi_Minh",
  fromDate: "2026-09-01",
  toDate: "2026-09-02",
  generatedAt: "2026-09-14T10:00:00.000Z",
  days: [
    {
      date: "2026-09-01",
      ordersCreated: 1,
      realPaidOrders: 1,
      disabledAutopayOrdersExcluded: 0,
      cashCollectedVnd: 79000,
      recognizedDirectRevenueVnd: 79000,
      paymentUnmatched: 0,
      paymentPendingOver1h: 0,
      qrExpired: null,
      selfClaimSucceeded: 0,
      selfClaimFailed: 0,
      reportsReady: 1,
      reportsFailed: null,
      upgradesWithin7Days: 0,
      repeatPurchases: 0,
      reportFailureRate: null,
      averagePaidToReportReadySeconds: 42.0,
    },
    {
      date: "2026-09-02",
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
    },
  ],
  sourceAvailability: {
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
  },
};

describe("admin business metrics redaction security boundary", () => {
  it("proves serialized metrics response does not contain any sensitive customer, chart, or secret fields", async () => {
    const appendAdminAudit = vi.fn().mockResolvedValue("audit-sec-1");
    const controller = new AdminBusinessMetricsController(
      {
        resolveAdminAccess: vi.fn(async () => ({
          ok: true,
          value: {
            actorId: "admin-actor-42",
            roleAssignmentId: "assignment-42",
            role: "operations",
            capabilities: ["admin.commerce.read"],
          },
        })),
        authorizeAdminRead: vi.fn(() => ({ ok: true, value: undefined })),
      } as never,
      { appendAdminAudit },
      {
        readBusinessMetrics: vi.fn(async () => ({
          ok: true,
          value: sampleMetrics,
        })),
      } as never,
      "synthetic-admin-secret",
      undefined as never,
    );

    const response = await controller.businessMetrics(
      "Bearer admin-token",
      "req-sec-42",
      "2026-09-01",
      "2026-09-02",
    );

    const serialized = JSON.stringify(response);

    const forbiddenSubstrings = [
      "email",
      "name\":",
      "birthDate",
      "birth_date",
      "birthTime",
      "birth_time",
      "birthPlace",
      "birth_place",
      "question",
      "chart_id",
      "chartId",
      "raw_payload",
      "rawPayload",
      "invoiceNumber",
      "invoice_number",
      "paymentCode",
      "payment_code",
      "providerEventId",
      "provider_event_id",
      "orderId",
      "order_id",
      "reportId",
      "report_id",
      "accountId",
      "account_id",
      "secret",
      "credentials",
      "password",
    ];

    for (const forbidden of forbiddenSubstrings) {
      expect(serialized.toLowerCase()).not.toContain(forbidden.toLowerCase());
    }

    // Verify audit log also contains no sensitive fields or leaked metric values
    expect(appendAdminAudit).toHaveBeenCalledTimes(1);
    const auditCall = appendAdminAudit.mock.calls[0]?.[0];
    const serializedAudit = JSON.stringify(auditCall);

    for (const forbidden of forbiddenSubstrings) {
      expect(serializedAudit.toLowerCase()).not.toContain(forbidden.toLowerCase());
    }

    // Proves audit log only contains bounded aggregate result (count), never metric values
    expect(auditCall.resultSummary).toEqual({
      outcome: "allowed",
      count: 2,
    });
    expect(serializedAudit).not.toContain("79000");
    expect(serializedAudit).not.toContain("cashCollectedVnd");
    expect(serializedAudit).not.toContain("ordersCreated");
  });

  it("proves strict schema rejects unredacted injected data", () => {
    const unredactedAttempts = [
      { ...sampleMetrics, email: "user@example.com" },
      { ...sampleMetrics, chartId: "chart-uuid-123" },
      { ...sampleMetrics, paymentCode: "LSV123456789" },
      { ...sampleMetrics, providerEventId: "sepay:evt_999" },
      { ...sampleMetrics, secret: "super-secret" },
      {
        ...sampleMetrics,
        days: [
          {
            ...sampleMetrics.days[0],
            customerEmail: "victim@example.com",
          },
        ],
      },
      {
        ...sampleMetrics,
        days: [
          {
            ...sampleMetrics.days[0],
            rawPayload: { bank: "ACB", transfer: "private memo" },
          },
        ],
      },
    ];

    for (const attempt of unredactedAttempts) {
      const parsed = AdminBusinessMetricsV1Schema.safeParse(attempt);
      expect(parsed.success).toBe(false);
    }
  });
});
