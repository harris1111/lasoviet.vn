import { describe, expect, it, vi } from "vitest";

import { createAuditQueryService } from "../../packages/backend/src/admin-access/audit-query.service.js";

describe("admin audit completeness", () => {
  it("requires audit capability and returns bounded redacted summaries only", async () => {
    const search = vi.fn().mockResolvedValue({
      items: [{
        id: "00000000-0000-4000-8000-000000000001",
        actorId: "admin-1",
        roleAssignmentId: "assignment-1",
        capability: "admin.audit.read",
        operation: "admin.role.assigned",
        target: { type: "admin_role_assignment", id: "assignment-2" },
        requestId: "request-1",
        traceId: "trace-1",
        result: "allowed",
        redactionLevel: "redacted",
        reasonCode: "access_role_change",
        idempotencyKey: "role-change-1",
        beforeVersion: 1,
        afterVersion: 2,
        resultSummary: { role: "support", token: "must-not-leak" },
        createdAt: "2026-09-03T00:00:00.000Z",
      }],
      page: 1,
      pageSize: 25,
      total: 1,
    });
    const service = createAuditQueryService({ repository: { search } });
    const access = {
      actorId: "admin-1",
      roleAssignmentId: "assignment-1",
      role: "read_only" as const,
      capabilities: ["admin.audit.read"] as const,
    };

    const result = await service.search(access, {
      page: 1,
      pageSize: 25,
      traceId: "trace-1",
    });

    expect(result).toMatchObject({ ok: true });
    if (!result.ok) throw new Error("Expected audit page");
    expect(result.value.items[0]).toEqual(expect.objectContaining({
      actorId: "admin-1",
      roleAssignmentId: "assignment-1",
      capability: "admin.audit.read",
      requestId: "request-1",
      traceId: "trace-1",
      target: { type: "admin_role_assignment", id: "assignment-2" },
      result: "allowed",
      redactionLevel: "redacted",
    }));
    expect(result.value.items[0]).not.toHaveProperty("token");
    expect(result.value.items[0]?.resultSummary).not.toHaveProperty("token");
    expect(search).toHaveBeenCalledWith({
      page: 1,
      pageSize: 25,
      traceId: "trace-1",
    });
  });

  it("fails audit reads without the active audit capability", async () => {
    const service = createAuditQueryService({
      repository: { search: vi.fn() },
    });

    await expect(service.search({
      actorId: "admin-1",
      roleAssignmentId: "assignment-1",
      role: "super_admin",
      capabilities: ["admin.roles.manage"],
    }, { page: 1, pageSize: 25 })).resolves.toMatchObject({
      ok: false,
      error: { code: "ADMIN_FORBIDDEN" },
    });
  });
});
