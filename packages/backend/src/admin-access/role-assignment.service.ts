import {
  AdminRoleMutationContextV1Schema,
  AdminRoleSchema,
  type AdminRole,
  type AdminRoleMutationContextV1,
  type Result,
} from "@lasoviet/contracts";

export type RoleAssignmentError =
  | "ROLE_ASSIGNMENT_FORBIDDEN"
  | "ROLE_ASSIGNMENT_CONFLICT"
  | "ROLE_ASSIGNMENT_SELF_ESCALATION_DENIED";

export type RoleMutation = {
  kind: "assign" | "revoke";
  context: AdminRoleMutationContextV1;
  subjectAccountId?: string;
  assignmentId?: string;
  role?: AdminRole;
  expectedVersion: number;
};

export type RoleAssignmentRepository = {
  mutate(input: RoleMutation): Promise<Result<{
    assignmentId: string;
    version: number;
    replayed: boolean;
  }, RoleAssignmentError>>;
};

function failure(code: RoleAssignmentError): Result<never, RoleAssignmentError> {
  return {
    ok: false,
    error: {
      code,
      messageKey: `admin.${code.toLowerCase()}`,
      retryable: false,
    },
  };
}

function boundedId(value: string): boolean {
  return value.trim().length > 0 && value.length <= 128;
}

export function createRoleAssignmentService(options: {
  repository: RoleAssignmentRepository;
}) {
  return {
    async assignRole(
      contextInput: AdminRoleMutationContextV1,
      subjectAccountId: string,
      roleInput: AdminRole,
      expectedVersion: number,
    ) {
      const parsedContext = AdminRoleMutationContextV1Schema.safeParse(contextInput);
      const role = AdminRoleSchema.safeParse(roleInput);
      if (!parsedContext.success || !role.success) {
        return failure("ROLE_ASSIGNMENT_FORBIDDEN");
      }
      if (!boundedId(subjectAccountId)) return failure("ROLE_ASSIGNMENT_CONFLICT");
      if (!Number.isInteger(expectedVersion) || expectedVersion < 0) {
        return failure("ROLE_ASSIGNMENT_CONFLICT");
      }
      return options.repository.mutate({
        kind: "assign",
        context: parsedContext.data,
        subjectAccountId,
        role: role.data,
        expectedVersion,
      });
    },

    async revokeRole(
      contextInput: AdminRoleMutationContextV1,
      assignmentId: string,
      expectedVersion: number,
    ) {
      const context = AdminRoleMutationContextV1Schema.safeParse(contextInput);
      if (!context.success || !boundedId(assignmentId)
        || !Number.isInteger(expectedVersion) || expectedVersion < 1) {
        return failure("ROLE_ASSIGNMENT_FORBIDDEN");
      }
      return options.repository.mutate({
        kind: "revoke",
        context: context.data,
        assignmentId,
        expectedVersion,
      });
    },
  };
}
