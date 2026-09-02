import { describe, expect, it, vi } from "vitest";

import { createAdminAccessService } from "../../packages/backend/src/admin-access/capability.service.js";

import {
  ADMIN_ACCESS_SERVICE,
  ADMIN_ACCESS_SERVICE_SECRET,
  AdminAccessController,
} from "../../apps/api/src/admin-access/admin-access.controller.js";

const secretValue = "synthetic-admin-secret";

vi.mock("../../apps/api/src/auth/internal-actor.guard.js", () => ({
  ActorTokenError: class ActorTokenError extends Error {},
  verifyInternalActorToken: vi.fn(async (token: string) => ({
    kind: "account" as const,
    userId: token,
    sessionId: "session-1",
    requestId: "request-1",
  })),
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
          },
        }
      : { emailVerified: userId !== "unverified-1" },
  },
});

describe("admin route boundary", () => {
  it("returns a not-found-equivalent denial for unverified and unassigned accounts", async () => {
    const controller = new AdminAccessController(
      accessService,
      { appendAdminAudit: vi.fn() },
      secretValue,
      undefined as never,
    );
    for (const subject of ["unverified-1", "unassigned-1"]) {
      await expect(controller.access(`Bearer ${subject}`))
        .rejects.toMatchObject({ status: 404 });
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
      .resolves.toEqual({ role: "read_only" });
    await expect(controller.access(undefined)).rejects.toMatchObject({ status: 404 });
    expect(appendAdminAudit).toHaveBeenCalledOnce();
  });
});
