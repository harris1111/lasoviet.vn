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
          role: "read_only",
          note: "person@example.test",
          label: "Jane Example",
          privateObject: { email: "person@example.test" },
        },
      }),
    ).resolves.toBe("audit-1");

    expect(append).toHaveBeenCalledWith(expect.objectContaining({
      redactionLevel: "redacted",
      resultSummary: { role: "read_only" },
    }));
    expect(append.mock.calls[0]?.[0].resultSummary).not.toHaveProperty("note");
    expect(append.mock.calls[0]?.[0].resultSummary).not.toHaveProperty(
      "privateObject",
    );
    expect(append.mock.calls[0]?.[0].resultSummary).not.toHaveProperty("label");
  });

  it("preserves only the explicitly allowed denial fields", async () => {
    const append = vi.fn().mockResolvedValue("audit-2");
    const service = createAdminAuditService({ repository: { append } });

    await service.appendAdminAudit({
      actorId: null,
      roleAssignmentId: null,
      capability: "admin.overview.read",
      operation: "admin.access.read",
      target: { type: "admin_overview", id: "overview" },
      requestId: "request-2",
      traceId: "trace-2",
      policyResult: "denied",
      redactionLevel: "redacted",
      resultSummary: {
        outcome: "denied",
        code: "ADMIN_AUTH_REQUIRED",
        displayName: "An innocent-looking PII field",
        details: { requestIp: "127.0.0.1" },
      },
    });

    expect(append).toHaveBeenCalledWith(expect.objectContaining({
      resultSummary: {
        outcome: "denied",
        code: "ADMIN_AUTH_REQUIRED",
      },
    }));
  });
});
