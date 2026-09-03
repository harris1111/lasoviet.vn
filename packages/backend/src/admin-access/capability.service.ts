import { and, desc, eq, isNull } from "drizzle-orm";

import type {
  AdminAccessV1,
  AdminAuditTarget,
  AdminCapability,
  AdminRole,
  CurrentActor,
  Result,
} from "@lasoviet/contracts";
import {
  AdminCapabilitySchema,
  AdminRoleSchema,
} from "@lasoviet/contracts";
import {
  adminCapabilityPolicies,
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
    capabilities: readonly AdminCapability[];
  };
};

export type AdminAccessRepository = {
  findAccountAccess(userId: string): Promise<AccountAccess | null>;
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
          capabilities: [...account.assignment.capabilities],
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
        .select({ emailVerified: authUsers.emailVerified })
        .from(authUsers)
        .where(eq(authUsers.id, userId))
        .limit(1);
      if (account === undefined) return null;
      const [activeAssignment] = await database
        .select({
          id: adminRoleAssignments.id,
          role: adminRoleAssignments.role,
          revokedAt: adminRoleAssignments.revokedAt,
        })
        .from(adminRoleAssignments)
        .where(and(
          eq(adminRoleAssignments.userId, userId),
          isNull(adminRoleAssignments.revokedAt),
        ))
        .limit(1);
      if (activeAssignment === undefined) {
        const [revokedAssignment] = await database
          .select({
            id: adminRoleAssignments.id,
            role: adminRoleAssignments.role,
            revokedAt: adminRoleAssignments.revokedAt,
          })
          .from(adminRoleAssignments)
          .where(eq(adminRoleAssignments.userId, userId))
          .orderBy(desc(adminRoleAssignments.revokedAt), desc(adminRoleAssignments.assignedAt))
          .limit(1);
        if (revokedAssignment === undefined) {
          return { emailVerified: account.emailVerified };
        }
        const role = AdminRoleSchema.safeParse(revokedAssignment.role);
        if (!role.success || revokedAssignment.revokedAt === null) {
          return { emailVerified: account.emailVerified };
        }
        return {
          emailVerified: account.emailVerified,
          assignment: {
            id: revokedAssignment.id,
            role: role.data,
            revokedAt: revokedAssignment.revokedAt,
            capabilities: [],
          },
        };
      }
      const role = AdminRoleSchema.safeParse(activeAssignment.role);
      if (!role.success) {
        return { emailVerified: account.emailVerified };
      }
      const policyRows = await database
        .select({ capability: adminCapabilityPolicies.capability })
        .from(adminCapabilityPolicies)
        .where(and(
          eq(adminCapabilityPolicies.role, role.data),
          eq(adminCapabilityPolicies.active, true),
        ));
      const capabilities = policyRows.flatMap(({ capability }) => {
        const parsed = AdminCapabilitySchema.safeParse(capability);
        return parsed.success ? [parsed.data] : [];
      });
      return {
        emailVerified: account.emailVerified,
        assignment: {
          id: activeAssignment.id,
          role: role.data,
          revokedAt: null,
          capabilities,
        },
      };
    },
  };
}
