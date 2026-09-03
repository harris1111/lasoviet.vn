import { describe, expect, it, vi } from "vitest";

import { AdminOverviewController } from "../../apps/api/src/admin-overview/admin-overview.controller.js";

vi.mock("../../apps/api/src/auth/internal-actor.guard.js", () => ({
  verifyInternalActorToken: vi.fn(async () => ({
    kind: "account" as const,
    userId: "admin-1",
    sessionId: "session-1",
    requestId: "request-1",
  })),
}));

describe("admin projection redaction boundary", () => {
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
              status: "unready",
              checkedAt: "2026-09-03T00:00:00+00:00",
              dependencies: [{ name: "postgres", status: "ready" }],
            },
            credentials: { token: "secret-token" },
            environment: { DATABASE_URL: "postgres://private" },
            reportBody: "private report body",
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
        status: "unready",
        checkedAt: "2026-09-03T00:00:00+00:00",
        dependencies: [{ name: "postgres", status: "ready" }],
      },
    });
    expect(serialized).not.toContain("secret-token");
    expect(serialized).not.toContain("DATABASE_URL");
    expect(serialized).not.toContain("private report body");
    expect(appendAdminAudit).toHaveBeenCalledWith(expect.objectContaining({
      capability: "admin.overview.read",
      operation: "admin.overview.read",
      redactionLevel: "redacted",
    }));
  });
});
