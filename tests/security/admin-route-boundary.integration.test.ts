import { describe, expect, it, vi } from "vitest";

import { createAdminAccessService } from "../../packages/backend/src/admin-access/capability.service.js";

import {
  ADMIN_ACCESS_SERVICE,
  ADMIN_ACCESS_SERVICE_SECRET,
  AdminAccessController,
} from "../../apps/api/src/admin-access/admin-access.controller.js";
import { verifyAdminPreflightAuditToken } from "../../apps/api/src/admin-access/admin-preflight-audit.guard.js";

const secretValue = "synthetic-admin-secret";

vi.mock("../../apps/api/src/auth/internal-actor.guard.js", () => ({
  verifyInternalActorToken: vi.fn(async (token: string) => {
    if (token === "invalid") throw new Error("invalid token");
    return {
      kind: "account" as const,
      userId: token,
      sessionId: "session-1",
      requestId: "request-1",
    };
  }),
}));
vi.mock("../../apps/api/src/admin-access/admin-preflight-audit.guard.js", () => ({
  verifyAdminPreflightAuditToken: vi.fn(),
}));

const accessService = createAdminAccessService({
  repository: {
    findAccountAccess: async (userId) => userId === "admin-1"
      ? {
          emailVerified: true,
          assignment: {
            id: "assignment-1",
            role: "read_only",
            revokedAt: null,
            capabilities: [
              "admin.overview.read",
              "admin.reports.read",
              "admin.audit.read",
              "admin.readiness.read",
            ],
          },
        }
      : userId === "support-1"
      ? {
          emailVerified: true,
          assignment: {
            id: "support-assignment-1",
            role: "support",
            revokedAt: null,
            capabilities: ["admin.accounts.read"],
          },
        }
      : userId === "revoked-1"
      ? {
          emailVerified: true,
          assignment: {
            id: "assignment-revoked",
            role: "read_only",
            revokedAt: new Date("2026-09-02T00:00:00Z"),
            capabilities: [],
          },
        }
      : { emailVerified: userId !== "unverified-1" },
  },
});

describe("admin route boundary", () => {
  it("records a redacted denial for every failed admin authorization outcome", async () => {
    const appendAdminAudit = vi.fn().mockResolvedValue("audit-1");
    const controller = new AdminAccessController(
      accessService,
      { appendAdminAudit },
      secretValue,
      undefined as never,
    );
    for (const authorization of [
      undefined,
      "Bearer invalid",
      "Bearer unverified-1",
      "Bearer unassigned-1",
      "Bearer revoked-1",
    ]) {
      await expect(controller.access(authorization))
        .rejects.toMatchObject({ status: 404 });
    }
    expect(appendAdminAudit).toHaveBeenCalledTimes(5);
    for (const entry of appendAdminAudit.mock.calls.map(([entry]) => entry)) {
      expect(entry).toMatchObject({
        policyResult: "denied",
        redactionLevel: "redacted",
        resultSummary: expect.objectContaining({ outcome: "denied" }),
      });
      expect(entry.requestId).toMatch(/^[A-Za-z0-9._:-]{1,128}$/);
      expect(entry.traceId).toMatch(/^[A-Za-z0-9._:-]{1,128}$/);
    }
  });

  it("requires a verified active assignment independently of the actor token", async () => {
    const appendAdminAudit = vi.fn();
    const controller = new AdminAccessController(
      accessService,
      { appendAdminAudit },
      secretValue,
      undefined as never,
    );

    await expect(controller.access("Bearer admin-1"))
      .resolves.toMatchObject({
        role: "read_only",
        capabilities: expect.arrayContaining(["admin.audit.read"]),
      });
    await expect(controller.access(undefined)).rejects.toMatchObject({ status: 404 });
    expect(appendAdminAudit).toHaveBeenCalledTimes(2);
    expect(appendAdminAudit).toHaveBeenLastCalledWith(expect.objectContaining({
      actorId: null,
      roleAssignmentId: null,
      policyResult: "denied",
    }));
  });

  it("allows support access through an active projection capability and audits it", async () => {
    const appendAdminAudit = vi.fn().mockResolvedValue("audit-1");
    const controller = new AdminAccessController(
      accessService,
      { appendAdminAudit },
      secretValue,
      undefined as never,
    );

    await expect(controller.access("Bearer support-1"))
      .resolves.toMatchObject({ role: "support" });
    expect(appendAdminAudit).toHaveBeenCalledWith(expect.objectContaining({
      capability: "admin.accounts.read",
      policyResult: "allowed",
    }));
  });

  it("audits a capability denial before returning a not-found-equivalent response", async () => {
    const appendAdminAudit = vi.fn().mockResolvedValue("audit-1");
    const controller = new AdminAccessController(
      {
        ...accessService,
        authorizeOverviewEntry: () => ({
          ok: false as const,
          error: {
            code: "ADMIN_FORBIDDEN" as const,
            messageKey: "admin.admin_forbidden",
            retryable: false,
          },
        }),
      },
      { appendAdminAudit },
      secretValue,
      undefined as never,
    );

    await expect(controller.access("Bearer admin-1")).rejects.toMatchObject({
      status: 404,
    });
    expect(appendAdminAudit).toHaveBeenCalledWith(expect.objectContaining({
      actorId: "admin-1",
      roleAssignmentId: "assignment-1",
      policyResult: "denied",
    }));
  });

  it("audits a trusted web preflight denial without accepting public calls", async () => {
    const appendAdminAudit = vi.fn().mockResolvedValue("audit-1");
    const controller = new AdminAccessController(
      accessService,
      { appendAdminAudit },
      secretValue,
      undefined as never,
    );

    await expect(
      controller.preflightDenial("Bearer trusted-preflight", "request-1"),
    ).resolves.toBeUndefined();
    expect(appendAdminAudit).toHaveBeenCalledWith(expect.objectContaining({
      actorId: null,
      roleAssignmentId: null,
      policyResult: "denied",
      resultSummary: { outcome: "denied", code: "ADMIN_AUTH_REQUIRED" },
    }));
  });

  it("rejects an untrusted preflight request without creating an audit record", async () => {
    const appendAdminAudit = vi.fn();
    const controller = new AdminAccessController(
      accessService,
      { appendAdminAudit },
      secretValue,
      undefined as never,
    );
    vi.mocked(verifyAdminPreflightAuditToken).mockRejectedValueOnce(
      new Error("INVALID_TOKEN"),
    );

    await expect(
      controller.preflightDenial("Bearer invalid-preflight", "request-1"),
    ).rejects.toMatchObject({ status: 404 });
    expect(appendAdminAudit).not.toHaveBeenCalled();
  });
});
