import { describe, expect, it } from "vitest";

import {
  ADMIN_CAPABILITIES,
  type AdminAccessV1,
} from "@lasoviet/contracts";

import { createAdminOverviewService } from "./admin-overview.service.js";

const operationsAccess: AdminAccessV1 = {
  actorId: "admin-1",
  roleAssignmentId: "assignment-1",
  role: "operations",
  capabilities: [
    "admin.overview.read",
    "admin.accounts.read",
    "admin.reports.read",
    "admin.workflow.retry",
    "admin.storage.reconcile",
    "admin.readiness.read",
  ],
};

const allDependencies = [
  { name: "postgres", status: "ready" },
  { name: "commerce_workflow", status: "unavailable" },
  { name: "report_generation", status: "unavailable" },
  { name: "asset_delivery", status: "unavailable" },
  { name: "support_workflow", status: "unavailable" },
  { name: "privacy_workflow", status: "unavailable" },
] as const;

describe("admin overview service", () => {
  it("projects authoritative account and outbox state without source payloads", async () => {
    const service = createAdminOverviewService({
      repository: {
        readAccounts: async () => ({
          total: 2,
          verified: 1,
          anonymous: 1,
          records: [{
            id: "account-1",
            emailVerified: true,
            isAnonymous: false,
            createdAt: new Date("2026-09-03T00:00:00Z"),
            email: "private@example.test",
            passwordHash: "password-hash",
          }],
        }),
        readPrivacy: async () => ({ requested: 1, purged: 0 }),
        readOutbox: async () => ({ pending: 2, failed: 1 }),
      },
      health: { readHealth: async () => ({
        version: 1,
        status: "unready",
        checkedAt: "2026-09-03T00:00:00+00:00",
        dependencies: allDependencies,
      }) },
    });

    const result = await service.readOverview({
      access: operationsAccess, requestId: "request-1", traceId: "trace-1",
    }, {
      page: 1,
      pageSize: 25,
    });

    expect(result).toMatchObject({
      ok: true,
      value: {
        version: 1,
        accountSummary: { total: 2, verified: 1, anonymous: 1 },
        accountPage: {
          page: 1,
          pageSize: 25,
          total: 2,
          items: [{
            id: "account-1",
            verification: "verified",
            ownership: "account",
            createdAt: "2026-09-03T00:00:00.000Z",
          }],
        },
        modules: expect.arrayContaining([
          { id: "outbox", status: "available", summary: { pending: 2, failed: 1 } },
          { id: "reports", status: "unavailable" },
          { id: "assets", status: "unavailable" },
        ]),
      },
    });
    expect(JSON.stringify(result)).not.toContain("private@example.test");
    expect(JSON.stringify(result)).not.toContain("password-hash");
  });

  it("rejects filters outside the bounded operational page range", async () => {
    const service = createAdminOverviewService({
      repository: {
        readAccounts: async () => ({ total: 0, verified: 0, anonymous: 0, records: [] }),
        readPrivacy: async () => ({ requested: 0, purged: 0 }),
        readOutbox: async () => ({ pending: 0, failed: 0 }),
      },
      health: { readHealth: async () => ({
        version: 1,
        status: "unready",
        checkedAt: "2026-09-03T00:00:00+00:00",
        dependencies: allDependencies,
      }) },
    });

    await expect(
      service.readOverview({
        access: operationsAccess, requestId: "request-1", traceId: "trace-1",
      }, { page: 1, pageSize: 51 }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "ADMIN_FILTER_INVALID" },
    });
  });

  it("omits modules and account rows without the required capability", async () => {
    const service = createAdminOverviewService({
      repository: {
        readAccounts: async () => ({ total: 1, verified: 1, anonymous: 0, records: [] }),
        readPrivacy: async () => ({ requested: 1, purged: 0 }),
        readOutbox: async () => ({ pending: 1, failed: 0 }),
      },
      health: { readHealth: async () => ({
        version: 1,
        status: "ready",
        checkedAt: "2026-09-03T00:00:00+00:00",
        dependencies: allDependencies,
      }) },
    });
    const readOnly: AdminAccessV1 = {
      ...operationsAccess,
      role: "read_only",
      capabilities: [
        "admin.overview.read",
        "admin.reports.read",
        "admin.audit.read",
        "admin.readiness.read",
      ],
    };

    const result = await service.readOverview({
      access: readOnly, requestId: "request-1", traceId: "trace-1",
    }, { page: 1, pageSize: 25 });

    expect(result).toMatchObject({
      ok: true,
      value: {
        version: 1,
        accountSummary: null,
        accountPage: null,
        modules: [
          { id: "reports", status: "unavailable" },
          { id: "outbox", status: "available", summary: { pending: 1, failed: 0 } },
          {
            id: "readiness",
            status: "available",
            summary: { ready: 1, degraded: 0, unready: 0, unavailable: 5 },
          },
        ],
      },
    });
  });

  it("uses role-scoped module reads without granting command authority", async () => {
    const service = createAdminOverviewService({
      repository: {
        readAccounts: async () => ({ total: 0, verified: 0, anonymous: 0, records: [] }),
        readPrivacy: async () => ({ requested: 0, purged: 0 }),
        readOutbox: async () => ({ pending: 1, failed: 0 }),
      },
      health: { readHealth: async () => ({
        version: 1,
        status: "unready",
        checkedAt: "2026-09-03T00:00:00+00:00",
        dependencies: allDependencies,
      }) },
    });
    const readOnly: AdminAccessV1 = {
      ...operationsAccess,
      role: "read_only",
      capabilities: [
        "admin.overview.read",
        "admin.reports.read",
        "admin.audit.read",
        "admin.readiness.read",
      ],
    };

    const result = await service.readOverview({
      access: readOnly, requestId: "request-1", traceId: "trace-1",
    }, { page: 1, pageSize: 25 });

    expect(result).toMatchObject({
      ok: true,
      value: {
        modules: [
          { id: "reports", status: "unavailable" },
          { id: "outbox", status: "available", summary: { pending: 1, failed: 0 } },
          { id: "readiness", status: "available" },
        ],
      },
    });
  });

  it.each([
    ["super_admin", ADMIN_CAPABILITIES, [
      "accounts", "commerce", "reports", "assets", "delivery",
      "support", "outbox", "privacy", "readiness",
    ]],
    ["operations", operationsAccess.capabilities, [
      "accounts", "reports", "assets", "delivery", "outbox", "privacy", "readiness",
    ]],
    ["support", [
      "admin.accounts.read", "admin.commerce.read", "admin.reports.read",
    ], ["accounts", "commerce", "reports", "delivery", "privacy"]],
    ["read_only", [
      "admin.overview.read", "admin.reports.read", "admin.audit.read",
      "admin.readiness.read",
    ], ["reports", "outbox", "readiness"]],
  ] as const)("returns the exact permitted module IDs for %s", async (
    role,
    capabilities,
    expectedIds,
  ) => {
    const service = createAdminOverviewService({
      repository: {
        readAccounts: async () => ({ total: 0, verified: 0, anonymous: 0, records: [] }),
        readPrivacy: async () => ({ requested: 0, purged: 0 }),
        readOutbox: async () => ({ pending: 0, failed: 0 }),
      },
      health: { readHealth: async () => ({
        version: 1, status: "degraded",
        checkedAt: "2026-09-03T00:00:00+00:00", dependencies: allDependencies,
      }) },
    });

    const result = await service.readOverview({
      access: { ...operationsAccess, role, capabilities: [...capabilities] },
      requestId: "request-1",
      traceId: "trace-1",
    }, { page: 1, pageSize: 25 });

    expect(result).toMatchObject({ ok: true });
    if (!result.ok) throw new Error("Expected overview");
    expect(result.value.modules.map((module) => module.id)).toEqual(expectedIds);
  });

  it.each([
    [
      "admin.accounts.read",
      ["reports", "assets", "delivery", "outbox", "readiness"],
    ],
    [
      "admin.reports.read",
      ["accounts", "privacy", "readiness"],
    ],
    [
      "admin.readiness.read",
      ["accounts", "reports", "assets", "delivery", "outbox", "privacy"],
    ],
  ] as const)("removes role-permitted modules when active policy capability %s is missing", async (
    removedCapability,
    expectedIds,
  ) => {
    const service = createAdminOverviewService({
      repository: {
        readAccounts: async () => ({ total: 0, verified: 0, anonymous: 0, records: [] }),
        readPrivacy: async () => ({ requested: 0, purged: 0 }),
        readOutbox: async () => ({ pending: 0, failed: 0 }),
      },
      health: { readHealth: async () => ({
        version: 1, status: "degraded",
        checkedAt: "2026-09-03T00:00:00+00:00", dependencies: allDependencies,
      }) },
    });

    const result = await service.readOverview({
      access: {
        ...operationsAccess,
        capabilities: operationsAccess.capabilities.filter(
          (capability) => capability !== removedCapability,
        ),
      },
      requestId: "request-1",
      traceId: "trace-1",
    }, { page: 1, pageSize: 25 });

    expect(result).toMatchObject({ ok: true });
    if (!result.ok) throw new Error("Expected overview");
    expect(result.value.modules.map((module) => module.id)).toEqual(expectedIds);
  });

  it("does not turn command capabilities into overview read visibility", async () => {
    const service = createAdminOverviewService({
      repository: {
        readAccounts: async () => ({ total: 0, verified: 0, anonymous: 0, records: [] }),
        readPrivacy: async () => ({ requested: 0, purged: 0 }),
        readOutbox: async () => ({ pending: 0, failed: 0 }),
      },
      health: { readHealth: async () => ({
        version: 1, status: "degraded",
        checkedAt: "2026-09-03T00:00:00+00:00", dependencies: allDependencies,
      }) },
    });

    const result = await service.readOverview({
      access: {
        ...operationsAccess,
        role: "support",
        capabilities: ["admin.support.manage", "admin.privacy.manage"],
      },
      requestId: "request-1",
      traceId: "trace-1",
    }, { page: 1, pageSize: 25 });

    expect(result).toMatchObject({ ok: true });
    if (!result.ok) throw new Error("Expected overview");
    expect(result.value.modules).toEqual([]);
  });
});
