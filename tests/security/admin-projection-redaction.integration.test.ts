import { describe, expect, it, vi } from "vitest";

import { AdminOverviewController } from "../../apps/api/src/admin-overview/admin-overview.controller.js";
import { verifyInternalActorToken } from "../../apps/api/src/auth/internal-actor.guard.js";
import { AdminOverviewV1Schema } from "@lasoviet/contracts";

const dependencies = [
  { name: "postgres", status: "ready" },
  { name: "commerce_workflow", status: "unavailable" },
  { name: "report_generation", status: "unavailable" },
  { name: "asset_delivery", status: "unavailable" },
  { name: "support_workflow", status: "unavailable" },
  { name: "privacy_workflow", status: "unavailable" },
] as const;

vi.mock("../../apps/api/src/auth/internal-actor.guard.js", () => ({
  verifyInternalActorToken: vi.fn(async () => ({
    kind: "account" as const,
    userId: "admin-1",
    sessionId: "session-1",
    requestId: "request-1",
  })),
}));

describe("admin projection redaction boundary", () => {
  it("authorizes support through an active projection capability and audits it", async () => {
    const appendAdminAudit = vi.fn().mockResolvedValue("audit-1");
    const controller = new AdminOverviewController(
      {
        resolveAdminAccess: vi.fn(async () => ({
          ok: true,
          value: {
            actorId: "support-1",
            roleAssignmentId: "assignment-1",
            role: "support",
            capabilities: ["admin.accounts.read"],
          },
        })),
        authorizeAdminRead: vi.fn(),
        authorizeOverviewEntry: vi.fn(() => ({
          ok: true,
          value: "admin.accounts.read",
        })),
      } as never,
      { appendAdminAudit },
      {
        readOverview: vi.fn(async () => ({
          ok: true,
          value: {
            version: 1,
            accountSummary: null,
            accountPage: null,
            modules: [{ id: "accounts", status: "available", summary: { total: 0, verified: 0, anonymous: 0 } }],
            health: null,
          },
        })),
      } as never,
      "synthetic-admin-secret",
      undefined as never,
    );

    await expect(
      controller.overview("Bearer admin-token", "request-1", "1", "25"),
    ).resolves.toMatchObject({ modules: [{ id: "accounts" }] });
    expect(appendAdminAudit).toHaveBeenCalledWith(expect.objectContaining({
      capability: "admin.accounts.read",
      policyResult: "allowed",
    }));
  });

  it("denies and audits an overview request without any projection-read capability", async () => {
    const appendAdminAudit = vi.fn().mockResolvedValue("audit-1");
    const controller = new AdminOverviewController(
      {
        resolveAdminAccess: vi.fn(async () => ({
          ok: true,
          value: {
            actorId: "support-1",
            roleAssignmentId: "assignment-1",
            role: "support",
            capabilities: ["admin.support.manage"],
          },
        })),
        authorizeAdminRead: vi.fn(),
        authorizeOverviewEntry: vi.fn(() => ({
          ok: false,
          error: {
            code: "ADMIN_FORBIDDEN",
            messageKey: "admin.admin_forbidden",
            retryable: false,
          },
        })),
      } as never,
      { appendAdminAudit },
      { readOverview: vi.fn() } as never,
      "synthetic-admin-secret",
      undefined as never,
    );

    await expect(
      controller.overview("Bearer admin-token", "request-1", "1", "25"),
    ).rejects.toMatchObject({ status: 404 });
    expect(appendAdminAudit).toHaveBeenCalledWith(expect.objectContaining({
      policyResult: "denied",
      redactionLevel: "redacted",
      resultSummary: { outcome: "denied", code: "ADMIN_FORBIDDEN" },
    }));
  });

  it("serializes only the approved overview projection after authorization", async () => {
    const appendAdminAudit = vi.fn().mockResolvedValue("audit-1");
    const controller = new AdminOverviewController(
      {
        resolveAdminAccess: vi.fn(async () => ({
          ok: true,
          value: {
            actorId: "admin-1",
            roleAssignmentId: "assignment-1",
            role: "operations",
            capabilities: ["admin.overview.read"],
          },
        })),
        authorizeAdminRead: vi.fn(() => ({ ok: true, value: undefined })),
        authorizeOverviewEntry: vi.fn(() => ({
          ok: true,
          value: "admin.overview.read",
        })),
      } as never,
      { appendAdminAudit },
      {
        readOverview: vi.fn(async () => ({
          ok: true,
          value: {
            version: 1,
            accountSummary: null,
            accountPage: null,
            modules: [{ id: "reports", status: "unavailable" }],
            health: {
              version: 1,
              status: "degraded",
              checkedAt: "2026-09-03T00:00:00+00:00",
              dependencies,
            },
          },
        })),
      } as never,
      "synthetic-admin-secret",
      undefined as never,
    );

    const response = await controller.overview("Bearer admin-token", "request-1", "1", "25");
    const serialized = JSON.stringify(response);

    expect(response).toEqual({
      version: 1,
      accountSummary: null,
      accountPage: null,
      modules: [{ id: "reports", status: "unavailable" }],
      health: {
        version: 1,
        status: "degraded",
        checkedAt: "2026-09-03T00:00:00+00:00",
        dependencies,
      },
    });
    expect(serialized).not.toContain("credentials");
    expect(serialized).not.toContain("environment");
    expect(serialized).not.toContain("reportBody");
    expect(AdminOverviewV1Schema.safeParse({
      ...response,
      credentials: { token: "secret-token" },
      environment: { DATABASE_URL: "postgres://private" },
      reportBody: "private report body",
    }).success).toBe(false);
    expect(appendAdminAudit).toHaveBeenCalledWith(expect.objectContaining({
      capability: "admin.overview.read",
      operation: "admin.overview.read",
      redactionLevel: "redacted",
    }));
  });

  it.each([
    "ADMIN_FILTER_INVALID",
    "ADMIN_PROJECTION_UNAVAILABLE",
  ] as const)("uses the verified actor request ID and audits %s", async (code) => {
    const appendAdminAudit = vi.fn().mockResolvedValue("audit-1");
    vi.mocked(verifyInternalActorToken).mockResolvedValueOnce({
      kind: "account",
      userId: "admin-1",
      sessionId: "session-1",
      requestId: "signed-request-id",
    });
    const controller = new AdminOverviewController(
      {
        resolveAdminAccess: vi.fn(async () => ({
          ok: true,
          value: {
            actorId: "admin-1",
            roleAssignmentId: "assignment-1",
            role: "operations",
            capabilities: ["admin.overview.read"],
          },
        })),
        authorizeAdminRead: vi.fn(() => ({ ok: true, value: undefined })),
        authorizeOverviewEntry: vi.fn(() => ({
          ok: true,
          value: "admin.overview.read",
        })),
      } as never,
      { appendAdminAudit },
      {
        readOverview: vi.fn(async () => ({
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
      controller.overview("Bearer admin-token", "header-request-id", "1", "25"),
    ).rejects.toMatchObject({ status: 400 });
    expect(appendAdminAudit).toHaveBeenCalledWith(expect.objectContaining({
      requestId: "signed-request-id",
      traceId: "signed-request-id",
      policyResult: "allowed",
      resultSummary: {
        outcome: "allowed",
        code,
      },
    }));
  });
});
