import { describe, expect, it } from "vitest";

import {
  ADMIN_CAPABILITIES,
  type CurrentActor,
} from "@lasoviet/contracts";

import { createAdminAccessService } from "./capability.service.js";

const account: CurrentActor = {
  kind: "account",
  userId: "account-1",
  sessionId: "session-1",
  requestId: "request-1",
};

const roleExpectations = {
  super_admin: ADMIN_CAPABILITIES,
  operations: [
    "admin.overview.read",
    "admin.accounts.read",
    "admin.reports.read",
    "admin.workflow.retry",
    "admin.storage.reconcile",
    "admin.readiness.read",
  ],
  support: [
    "admin.accounts.read",
    "admin.commerce.read",
    "admin.support.manage",
    "admin.reports.read",
    "admin.reports.regenerate",
    "admin.privacy.manage",
  ],
  read_only: [
    "admin.overview.read",
    "admin.accounts.read",
    "admin.commerce.read",
    "admin.reports.read",
    "admin.audit.read",
    "admin.readiness.read",
  ],
} as const;

describe("admin access service", () => {
  it.each(Object.entries(roleExpectations))(
    "resolves the %s capability policy from an active database assignment",
    async (role, capabilities) => {
      const service = createAdminAccessService({
        repository: {
          findAccountAccess: async () => ({
            emailVerified: true,
            assignment: {
              id: "assignment-1",
              role: role as keyof typeof roleExpectations,
              revokedAt: null,
            },
          }),
        },
      });

      await expect(service.resolveAdminAccess(account)).resolves.toEqual({
        ok: true,
        value: {
          actorId: account.userId,
          roleAssignmentId: "assignment-1",
          role,
          capabilities,
        },
      });
    },
  );

  it("rejects anonymous, unverified, unassigned, and revoked actors", async () => {
    const anonymous: CurrentActor = {
      kind: "anonymous",
      anonymousActorId: "anonymous-1",
      sessionId: "session-1",
      requestId: "request-1",
      expiresAt: "2026-09-03T00:00:00+00:00",
    };
    const service = createAdminAccessService({
      repository: {
        findAccountAccess: async (userId) => {
          if (userId === "unverified") return { emailVerified: false };
          if (userId === "unassigned") return { emailVerified: true };
          return {
            emailVerified: true,
            assignment: {
              id: "revoked-assignment",
              role: "read_only",
              revokedAt: new Date("2026-09-02T00:00:00Z"),
            },
          };
        },
      },
    });

    await expect(service.resolveAdminAccess(anonymous)).resolves.toMatchObject({
      ok: false,
      error: { code: "ADMIN_AUTH_REQUIRED" },
    });
    await expect(
      service.resolveAdminAccess({ ...account, userId: "unverified" }),
    ).resolves.toMatchObject({ ok: false, error: { code: "ADMIN_AUTH_REQUIRED" } });
    await expect(
      service.resolveAdminAccess({ ...account, userId: "unassigned" }),
    ).resolves.toMatchObject({ ok: false, error: { code: "ADMIN_FORBIDDEN" } });
    await expect(service.resolveAdminAccess(account)).resolves.toMatchObject({
      ok: false,
      error: { code: "ROLE_ASSIGNMENT_INACTIVE" },
    });
  });

  it("authorizes only capabilities granted by the resolved assignment", async () => {
    const service = createAdminAccessService({
      repository: { findAccountAccess: async () => ({ emailVerified: true }) },
    });
    const access = {
      actorId: account.userId,
      roleAssignmentId: "assignment-1",
      role: "read_only" as const,
      capabilities: roleExpectations.read_only,
    };

    expect(
      service.authorizeAdminRead(access, "admin.audit.read", {
        type: "admin_overview",
        id: "overview",
      }),
    ).toEqual({ ok: true, value: undefined });
    expect(
      service.authorizeAdminRead(access, "admin.support.manage", {
        type: "support_case",
        id: "case-1",
      }),
    ).toMatchObject({ ok: false, error: { code: "ADMIN_FORBIDDEN" } });
  });
});
