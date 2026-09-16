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

  it("preserves failed outcomes while dropping unsupported summary values and fields", async () => {
    const service = (await import("./audit-query.service.js")).createAuditQueryService({
      repository: {
        search: vi.fn().mockResolvedValue({
          pageSize: 25,
          items: [
            {
              id: "00000000-0000-4000-8000-000000000001",
              actorId: "admin-1",
              roleAssignmentId: "assignment-1",
              capability: "admin.reports.regenerate",
              operation: "admin.report.recovery.command_failed",
              target: { type: "report_version", id: "version-1" },
              requestId: "request-1",
              traceId: "trace-1",
              result: "allowed",
              redactionLevel: "redacted",
              reasonCode: "provider_transient_failure",
              idempotencyKey: "recovery-1",
              beforeVersion: 3,
              afterVersion: null,
              resultSummary: {
                outcome: "failed",
                code: "REPORT_RECOVERY_CONFLICT",
                privateDetails: "drop-me",
              },
              createdAt: "2026-09-16T00:00:00.000Z",
            },
            {
              id: "00000000-0000-4000-8000-000000000002",
              actorId: "admin-1",
              roleAssignmentId: "assignment-1",
              capability: "admin.audit.read",
              operation: "admin.audit.read",
              target: { type: "admin_audit", id: "search" },
              requestId: "request-2",
              traceId: "trace-2",
              result: "allowed",
              redactionLevel: "redacted",
              reasonCode: null,
              idempotencyKey: null,
              beforeVersion: null,
              afterVersion: null,
              resultSummary: {
                outcome: "invalid",
                note: "drop-me",
              },
              createdAt: "2026-09-16T00:00:01.000Z",
            },
          ],
        }),
      },
    });

    const result = await service.search({
      actorId: "admin-1",
      roleAssignmentId: "assignment-1",
      role: "super_admin",
      capabilities: ["admin.audit.read"],
    }, {
      pageSize: 25,
    });

    expect(result).toEqual({
      ok: true,
      value: {
        pageSize: 25,
        items: [
          expect.objectContaining({
            resultSummary: {
              outcome: "failed",
              code: "REPORT_RECOVERY_CONFLICT",
            },
          }),
          expect.objectContaining({
            resultSummary: {},
          }),
        ],
      },
    });
  });
});
