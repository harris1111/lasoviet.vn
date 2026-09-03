import { describe, expect, it, vi } from "vitest";

import { createDatabaseAuditQueryRepository } from "./audit-query.repository.js";

describe("audit query repository", () => {
  it("rejects a malformed keyset cursor before querying", async () => {
    const select = vi.fn();
    const repository = createDatabaseAuditQueryRepository({ select } as never);

    await expect(repository.search({
      pageSize: 25,
      cursor: "not-a-keyset-cursor",
    })).rejects.toThrow("ADMIN_FILTER_INVALID");
    expect(select).not.toHaveBeenCalled();
  });

  it("returns a bounded invalid-filter result when repository cursor parsing fails", async () => {
    const service = (await import("./audit-query.service.js")).createAuditQueryService({
      repository: {
        search: vi.fn().mockRejectedValue(new Error("ADMIN_FILTER_INVALID")),
      },
    });

    await expect(service.search({
      actorId: "admin-1",
      roleAssignmentId: "assignment-1",
      role: "super_admin",
      capabilities: ["admin.audit.read"],
    }, {
      pageSize: 25,
      cursor: "2026-09-03T00:00:00.000Z|not-a-uuid",
    })).resolves.toMatchObject({
      ok: false,
      error: { code: "ADMIN_FILTER_INVALID" },
    });
  });
});
