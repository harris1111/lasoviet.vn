import { and, desc, eq } from "drizzle-orm";

import type {
  AdminAccessV1,
  AdminAuditTarget,
  AdminCapability,
  AdminRole,
  CurrentActor,
  Result,
} from "@lasoviet/contracts";
import {
  adminRoleAssignments,
  authUsers,
  type Database,
} from "@lasoviet/database";

export type AdminAccessError =
  | "ADMIN_AUTH_REQUIRED"
  | "ADMIN_FORBIDDEN"
  | "ROLE_ASSIGNMENT_INACTIVE";

type AccountAccess = {
  emailVerified: boolean;
  assignment?: {
    id: string;
    role: AdminRole;
    revokedAt: Date | null;
  };
};

export type AdminAccessRepository = {
  findAccountAccess(userId: string): Promise<AccountAccess | null>;
};

const capabilityPolicy: Record<AdminRole, readonly AdminCapability[]> = {
  super_admin: [
    "admin.roles.manage", "admin.overview.read", "admin.accounts.read",
    "admin.commerce.read", "admin.support.manage", "admin.reports.read",
    "admin.reports.regenerate", "admin.workflow.retry", "admin.storage.reconcile",
    "admin.privacy.manage", "admin.audit.read", "admin.readiness.read",
  ],
  operations: [
    "admin.overview.read", "admin.accounts.read", "admin.reports.read",
    "admin.workflow.retry", "admin.storage.reconcile", "admin.readiness.read",
  ],
  support: [
    "admin.accounts.read", "admin.commerce.read", "admin.support.manage",
    "admin.reports.read", "admin.reports.regenerate", "admin.privacy.manage",
  ],
  read_only: [
    "admin.overview.read", "admin.accounts.read", "admin.commerce.read",
    "admin.reports.read", "admin.audit.read", "admin.readiness.read",
  ],
};

function failure(code: AdminAccessError): Result<never, AdminAccessError> {
  return {
    ok: false,
    error: { code, messageKey: `admin.${code.toLowerCase()}`, retryable: false },
  };
}

function forbidden(): Result<never, "ADMIN_FORBIDDEN"> {
  return {
    ok: false,
    error: {
      code: "ADMIN_FORBIDDEN",
      messageKey: "admin.admin_forbidden",
      retryable: false,
    },
  };
}

export function createAdminAccessService(options: {
  repository: AdminAccessRepository;
}) {
  return {
    async resolveAdminAccess(
      actor: CurrentActor,
    ): Promise<Result<AdminAccessV1, AdminAccessError>> {
      if (actor.kind !== "account") return failure("ADMIN_AUTH_REQUIRED");
      const account = await options.repository.findAccountAccess(actor.userId);
      if (account === null || !account.emailVerified) {
        return failure("ADMIN_AUTH_REQUIRED");
      }
      if (account.assignment === undefined) return failure("ADMIN_FORBIDDEN");
      if (account.assignment.revokedAt !== null) {
        return failure("ROLE_ASSIGNMENT_INACTIVE");
      }
      return {
        ok: true,
        value: {
          actorId: actor.userId,
          roleAssignmentId: account.assignment.id,
          role: account.assignment.role,
          capabilities: [...capabilityPolicy[account.assignment.role]],
        },
      };
    },

    authorizeAdminRead(
      access: AdminAccessV1,
      capability: AdminCapability,
      _target: AdminAuditTarget,
    ): Result<void, "ADMIN_FORBIDDEN"> {
      return access.capabilities.includes(capability)
        ? { ok: true, value: undefined }
        : forbidden();
    },
  };
}

export function createDatabaseAdminAccessRepository(
  database: Database,
): AdminAccessRepository {
  return {
    async findAccountAccess(userId) {
      const [account] = await database
        .select({
          emailVerified: authUsers.emailVerified,
          assignmentId: adminRoleAssignments.id,
          role: adminRoleAssignments.role,
          revokedAt: adminRoleAssignments.revokedAt,
        })
        .from(authUsers)
        .leftJoin(
          adminRoleAssignments,
          eq(adminRoleAssignments.userId, authUsers.id),
        )
        .where(eq(authUsers.id, userId))
        .orderBy(desc(adminRoleAssignments.assignedAt))
        .limit(1);
      if (account === undefined) return null;
      if (account.assignmentId === null || account.role === null) {
        return { emailVerified: account.emailVerified };
      }
      const parsedRole = capabilityPolicy[account.role as AdminRole];
      if (parsedRole === undefined) return { emailVerified: account.emailVerified };
      return {
        emailVerified: account.emailVerified,
        assignment: {
          id: account.assignmentId,
          role: account.role as AdminRole,
          revokedAt: account.revokedAt,
        },
      };
    },
  };
}
