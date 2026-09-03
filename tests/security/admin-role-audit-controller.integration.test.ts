import { describe, expect, it, vi } from "vitest";

import { AdminRoleAuditController } from "../../apps/api/src/admin-access/admin-role-audit.controller.js";

vi.mock("../../apps/api/src/auth/internal-actor.guard.js", () => ({
  verifyInternalActorToken: vi.fn(async () => ({
    kind: "account" as const,
    userId: "admin-1",
    sessionId: "session-1",
    requestId: "signed-request-id",
  })),
}));

describe("admin role audit controller", () => {
  it("audits a trusted malformed role command once without invoking the repository-owned command", async () => {
    const appendAdminAudit = vi.fn().mockResolvedValue("audit-1");
    const assignRole = vi.fn();
    const controller = new AdminRoleAuditController(
      {
        resolveAdminAccess: vi.fn(async () => ({
          ok: true,
          value: {
            actorId: "admin-1",
            roleAssignmentId: "assignment-1",
            role: "super_admin",
            capabilities: ["admin.roles.manage"],
          },
        })),
      } as never,
      { appendAdminAudit },
      { assignRole, revokeRole: vi.fn() } as never,
      { search: vi.fn() } as never,
      "synthetic-secret",
      undefined as never,
    );

    await expect(controller.assign("Bearer actor", "header-request-id", {
      subjectAccountId: "",
    })).rejects.toMatchObject({
      status: 400,
      response: { code: "ROLE_ASSIGNMENT_CONFLICT" },
    });
    expect(assignRole).not.toHaveBeenCalled();
    expect(appendAdminAudit).toHaveBeenCalledTimes(1);
    expect(appendAdminAudit).toHaveBeenCalledWith(expect.objectContaining({
      operation: "admin.role.malformed_input",
      policyResult: "denied",
      resultSummary: { outcome: "denied", code: "ROLE_ASSIGNMENT_CONFLICT" },
    }));
  });

  it("audits a trusted audit-access denial once before returning not found", async () => {
    const appendAdminAudit = vi.fn().mockResolvedValue("audit-1");
    const controller = new AdminRoleAuditController(
      {
        resolveAdminAccess: vi.fn(async () => ({
          ok: false,
          error: { code: "ADMIN_FORBIDDEN" },
        })),
      } as never,
      { appendAdminAudit },
      { assignRole: vi.fn(), revokeRole: vi.fn() } as never,
      { search: vi.fn() } as never,
      "synthetic-secret",
      undefined as never,
    );

    await expect(controller.auditAccess("Bearer actor", "header-request-id"))
      .rejects.toMatchObject({ status: 404 });
    expect(appendAdminAudit).toHaveBeenCalledTimes(1);
    expect(appendAdminAudit).toHaveBeenCalledWith(expect.objectContaining({
      actorId: "admin-1",
      operation: "admin.audit.access",
      policyResult: "denied",
      resultSummary: { outcome: "denied", code: "ADMIN_FORBIDDEN" },
    }));
  });

  it("audits a trusted malformed audit cursor once before returning a bounded error", async () => {
    const appendAdminAudit = vi.fn().mockResolvedValue("audit-1");
    const search = vi.fn().mockResolvedValue({
      ok: false,
      error: { code: "ADMIN_FILTER_INVALID" },
    });
    const controller = new AdminRoleAuditController(
      {
        resolveAdminAccess: vi.fn(async () => ({
          ok: true,
          value: {
            actorId: "admin-1",
            roleAssignmentId: "assignment-1",
            role: "super_admin",
            capabilities: ["admin.audit.read"],
          },
        })),
      } as never,
      { appendAdminAudit },
      { assignRole: vi.fn(), revokeRole: vi.fn() } as never,
      { search } as never,
      "synthetic-secret",
      undefined as never,
    );

    await expect(controller.search("Bearer actor", "header-request-id", {
      cursor: "not-a-keyset-cursor",
    })).rejects.toMatchObject({
      status: 400,
      response: { code: "ADMIN_FILTER_INVALID" },
    });
    expect(search).toHaveBeenCalledWith(expect.anything(), {
      cursor: "not-a-keyset-cursor",
      pageSize: 25,
    });
    expect(appendAdminAudit).toHaveBeenCalledWith(expect.objectContaining({
      operation: "admin.audit.read",
      policyResult: "denied",
      resultSummary: { outcome: "denied", code: "ADMIN_FILTER_INVALID" },
    }));
  });
});
