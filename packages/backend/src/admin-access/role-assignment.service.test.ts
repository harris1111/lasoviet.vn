import { describe, expect, it, vi } from "vitest";

import { createRoleAssignmentService } from "./role-assignment.service.js";

const context = {
  access: {
    actorId: "admin-1",
    roleAssignmentId: "admin-assignment-1",
    role: "super_admin" as const,
    capabilities: ["admin.roles.manage"] as const,
  },
  requestId: "request-1",
  traceId: "trace-1",
  idempotencyKey: "role-change-1",
  reasonCode: "access_role_change" as const,
};

describe("role assignment service", () => {
  it("allows only a super admin with the active roles capability", async () => {
    const mutate = vi.fn().mockResolvedValue({
      ok: true,
      value: { assignmentId: "assignment-2", version: 2, replayed: false },
    });
    const service = createRoleAssignmentService({ repository: { mutate } });

    await expect(
      service.assignRole(context, "account-2", "operations", 1),
    ).resolves.toMatchObject({ ok: true });
    await expect(
      service.assignRole(
        { ...context, access: { ...context.access, role: "operations" } },
        "account-2",
        "read_only",
        1,
      ),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "ROLE_ASSIGNMENT_FORBIDDEN" },
    });
    await expect(
      service.assignRole(
        { ...context, access: { ...context.access, capabilities: [] } },
        "account-2",
        "read_only",
        1,
      ),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "ROLE_ASSIGNMENT_FORBIDDEN" },
    });
    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it("denies actor self-escalation before persistence", async () => {
    const mutate = vi.fn();
    const service = createRoleAssignmentService({ repository: { mutate } });

    await expect(
      service.assignRole(context, "admin-1", "super_admin", 1),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "ROLE_ASSIGNMENT_SELF_ESCALATION_DENIED" },
    });
    expect(mutate).not.toHaveBeenCalled();
  });

  it("passes signed command correlation and server-validated role to persistence", async () => {
    const mutate = vi.fn().mockResolvedValue({
      ok: true,
      value: { assignmentId: "assignment-2", version: 2, replayed: false },
    });
    const service = createRoleAssignmentService({ repository: { mutate } });

    await service.assignRole(context, "account-2", "support", 1);

    expect(mutate).toHaveBeenCalledWith({
      kind: "assign",
      context,
      subjectAccountId: "account-2",
      role: "support",
      expectedVersion: 1,
    });
  });
});
