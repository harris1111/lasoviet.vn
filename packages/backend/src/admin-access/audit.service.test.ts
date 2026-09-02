import { describe, expect, it, vi } from "vitest";

import { createAdminAuditService } from "./audit.service.js";

describe("admin audit service", () => {
  it("appends a redacted record for an authorized privileged read", async () => {
    const append = vi.fn().mockResolvedValue("audit-1");
    const service = createAdminAuditService({ repository: { append } });

    await expect(
      service.appendAdminAudit({
        actorId: "account-1",
        roleAssignmentId: "assignment-1",
        capability: "admin.overview.read",
        operation: "admin.overview.read",
        target: { type: "admin_overview", id: "overview" },
        requestId: "request-1",
        traceId: "trace-1",
        policyResult: "allowed",
        redactionLevel: "redacted",
        resultSummary: {
          email: "person@example.test",
          reportBody: "private report body",
          count: 3,
        },
      }),
    ).resolves.toBe("audit-1");

    expect(append).toHaveBeenCalledWith(expect.objectContaining({
      redactionLevel: "redacted",
      resultSummary: { count: 3 },
    }));
    expect(append.mock.calls[0]?.[0].resultSummary).not.toHaveProperty("email");
    expect(append.mock.calls[0]?.[0].resultSummary).not.toHaveProperty("reportBody");
  });
});
