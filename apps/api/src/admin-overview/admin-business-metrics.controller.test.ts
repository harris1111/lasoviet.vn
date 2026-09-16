import { describe, expect, it, vi } from "vitest";
import { BadRequestException, NotFoundException } from "@nestjs/common";

import { createAdminAuditService } from "@lasoviet/backend";
import type { AdminBusinessMetricsV1 } from "@lasoviet/contracts";

import { AdminBusinessMetricsController } from "./admin-business-metrics.controller.js";
import { verifyInternalActorToken } from "../auth/internal-actor.guard.js";

vi.mock("../auth/internal-actor.guard.js", () => ({
  verifyInternalActorToken: vi.fn(async () => ({
    kind: "account" as const,
    userId: "admin-1",
    sessionId: "session-1",
    requestId: "request-1",
  })),
}));

const mockMetrics: AdminBusinessMetricsV1 = {
  version: 1,
  timezone: "Asia/Ho_Chi_Minh",
  fromDate: "2026-09-01",
  toDate: "2026-09-02",
  generatedAt: "2026-09-14T10:00:00.000Z",
  days: [
    {
      date: "2026-09-01",
      ordersCreated: 5,
      realPaidOrders: 3,
      disabledAutopayOrdersExcluded: 1,
      cashCollectedVnd: 237000,
      recognizedDirectRevenueVnd: 237000,
      paymentUnmatched: 0,
      paymentPendingOver1h: 0,
      qrExpired: null,
      selfClaimSucceeded: 0,
      selfClaimFailed: 0,
      reportsReady: 3,
      reportsFailed: null,
      upgradesWithin7Days: 1,
      repeatPurchases: 1,
      reportFailureRate: null,
      averagePaidToReportReadySeconds: 45.2,
    },
    {
      date: "2026-09-02",
      ordersCreated: 2,
      realPaidOrders: 2,
      disabledAutopayOrdersExcluded: 0,
      cashCollectedVnd: 158000,
      recognizedDirectRevenueVnd: 158000,
      paymentUnmatched: 1,
      paymentPendingOver1h: 0,
      qrExpired: null,
      selfClaimSucceeded: 1,
      selfClaimFailed: 0,
      reportsReady: 2,
      reportsFailed: null,
      upgradesWithin7Days: 0,
      repeatPurchases: 0,
      reportFailureRate: null,
      averagePaidToReportReadySeconds: 32.1,
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

describe("AdminBusinessMetricsController", () => {
  it("authorizes and returns metrics when actor has admin.commerce.read capability", async () => {
    const appendAdminAudit = vi.fn().mockResolvedValue("audit-1");
    const controller = new AdminBusinessMetricsController(
      {
        resolveAdminAccess: vi.fn(async () => ({
          ok: true,
          value: {
            actorId: "admin-1",
            roleAssignmentId: "assignment-1",
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
          value: mockMetrics,
        })),
      } as never,
      "synthetic-admin-secret",
      undefined as never,
    );

    const result = await controller.businessMetrics(
      "Bearer admin-token",
      "request-1",
      "2026-09-01",
      "2026-09-02",
    );

    expect(result).toEqual(mockMetrics);
    expect(appendAdminAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        capability: "admin.commerce.read",
        operation: "admin.business_metrics.read",
        target: {
          type: "admin_business_metrics",
          id: "2026-09-01:2026-09-02",
        },
        policyResult: "allowed",
        redactionLevel: "redacted",
        resultSummary: { outcome: "allowed", count: 2 },
      }),
    );

    // Bounded aggregate result only: verify audit call does not leak metric values
    const auditCall = appendAdminAudit.mock.calls[0]?.[0];
    const serializedAudit = JSON.stringify(auditCall);
    expect(serializedAudit).not.toContain("237000");
    expect(serializedAudit).not.toContain("ordersCreated");
    expect(serializedAudit).not.toContain("cashCollectedVnd");
  });

  it("proves audit routes through real createAdminAuditService sanitizer with count and no metric values", async () => {
    const capturedEntries: unknown[] = [];
    const realAuditService = createAdminAuditService({
      repository: {
        append: vi.fn(async (entry) => {
          capturedEntries.push(entry);
          return "persisted-audit-id";
        }),
      },
    });

    const controller = new AdminBusinessMetricsController(
      {
        resolveAdminAccess: vi.fn(async () => ({
          ok: true,
          value: {
            actorId: "admin-1",
            roleAssignmentId: "assignment-1",
            role: "operations",
            capabilities: ["admin.commerce.read"],
          },
        })),
        authorizeAdminRead: vi.fn(() => ({ ok: true, value: undefined })),
      } as never,
      realAuditService,
      {
        readBusinessMetrics: vi.fn(async () => ({
          ok: true,
          value: mockMetrics,
        })),
      } as never,
      "synthetic-admin-secret",
      undefined as never,
    );

    await controller.businessMetrics(
      "Bearer admin-token",
      "request-1",
      "2026-09-01",
      "2026-09-02",
    );

    expect(capturedEntries).toHaveLength(1);
    const persistedEntry = capturedEntries[0] as {
      resultSummary: Record<string, unknown>;
    };

    expect(persistedEntry.resultSummary).toEqual({
      outcome: "allowed",
      count: 2,
    });
    const serialized = JSON.stringify(persistedEntry);
    expect(serialized).not.toContain("237000");
    expect(serialized).not.toContain("ordersCreated");
    expect(serialized).not.toContain("cashCollectedVnd");
    expect(serialized).not.toContain("dayCount");
  });

  it("fails closed with 404 NotFoundException and audits denial when actor token is invalid", async () => {
    const appendAdminAudit = vi.fn().mockResolvedValue("audit-1");
    vi.mocked(verifyInternalActorToken).mockRejectedValueOnce(
      new Error("Invalid token"),
    );

    const controller = new AdminBusinessMetricsController(
      {
        resolveAdminAccess: vi.fn(),
        authorizeAdminRead: vi.fn(),
      } as never,
      { appendAdminAudit },
      { readBusinessMetrics: vi.fn() } as never,
      "synthetic-admin-secret",
      undefined as never,
    );

    await expect(
      controller.businessMetrics("Bearer bad-token", "req-bad", "2026-09-01", "2026-09-05"),
    ).rejects.toThrow(NotFoundException);

    expect(appendAdminAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        capability: "admin.commerce.read",
        operation: "admin.business_metrics.read",
        target: {
          type: "admin_business_metrics",
          id: "2026-09-01:2026-09-05",
        },
        policyResult: "denied",
        redactionLevel: "redacted",
        resultSummary: { outcome: "denied", code: "ADMIN_AUTH_REQUIRED" },
      }),
    );
  });

  it("fails closed with 404 NotFoundException when actor lacks admin.commerce.read capability", async () => {
    const appendAdminAudit = vi.fn().mockResolvedValue("audit-1");
    const controller = new AdminBusinessMetricsController(
      {
        resolveAdminAccess: vi.fn(async () => ({
          ok: true,
          value: {
            actorId: "support-1",
            roleAssignmentId: "assignment-support",
            role: "support",
            capabilities: ["admin.accounts.read"],
          },
        })),
        authorizeAdminRead: vi.fn(() => ({
          ok: false,
          error: {
            code: "ADMIN_FORBIDDEN",
            messageKey: "admin.admin_forbidden",
            retryable: false,
          },
        })),
      } as never,
      { appendAdminAudit },
      { readBusinessMetrics: vi.fn() } as never,
      "synthetic-admin-secret",
      undefined as never,
    );

    await expect(
      controller.businessMetrics("Bearer support-token", "req-2", "2026-09-01", "2026-09-02"),
    ).rejects.toThrow(NotFoundException);

    expect(appendAdminAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: "support-1",
        roleAssignmentId: "assignment-support",
        capability: "admin.commerce.read",
        operation: "admin.business_metrics.read",
        policyResult: "denied",
        resultSummary: { outcome: "denied", code: "ADMIN_FORBIDDEN" },
      }),
    );
  });

  it.each([
    "ADMIN_METRICS_FILTER_INVALID",
    "ADMIN_PROJECTION_UNAVAILABLE",
  ] as const)("throws BadRequestException and audits bounded failure on %s", async (code) => {
    const appendAdminAudit = vi.fn().mockResolvedValue("audit-1");
    const controller = new AdminBusinessMetricsController(
      {
        resolveAdminAccess: vi.fn(async () => ({
          ok: true,
          value: {
            actorId: "admin-1",
            roleAssignmentId: "assignment-1",
            role: "operations",
            capabilities: ["admin.commerce.read"],
          },
        })),
        authorizeAdminRead: vi.fn(() => ({ ok: true, value: undefined })),
      } as never,
      { appendAdminAudit },
      {
        readBusinessMetrics: vi.fn(async () => ({
          ok: false,
          error: {
            code,
            messageKey: `admin.${code.toLowerCase()}`,
            retryable: false,
          },
        })),
      } as never,
      "synthetic-admin-secret",
      undefined as never,
    );

    await expect(
      controller.businessMetrics("Bearer admin-token", "req-err", "2026-09-01", "2026-09-02"),
    ).rejects.toThrow(BadRequestException);

    expect(appendAdminAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        capability: "admin.commerce.read",
        operation: "admin.business_metrics.read",
        target: {
          type: "admin_business_metrics",
          id: "2026-09-01:2026-09-02",
        },
        policyResult: "allowed",
        redactionLevel: "redacted",
        resultSummary: { outcome: "allowed", code },
      }),
    );
  });
});
