import { createHash, randomUUID } from "node:crypto";

import { and, desc, eq, isNull, sql } from "drizzle-orm";

import type { Result } from "@lasoviet/contracts";
import {
  adminAuditLogs,
  adminRoleAssignments,
  adminRoleMutationRequests,
  type Database,
} from "@lasoviet/database";

import type {
  RoleAssignmentRepository,
  RoleMutation,
} from "./role-assignment.service.js";

type MutationResult = { assignmentId: string; version: number; replayed: boolean };

function fingerprint(input: RoleMutation): string {
  return createHash("sha256").update(JSON.stringify({
    kind: input.kind,
    subjectAccountId: input.subjectAccountId,
    assignmentId: input.assignmentId,
    role: input.role,
    expectedVersion: input.expectedVersion,
    reasonCode: input.context.reasonCode,
  })).digest("hex");
}

function conflict(): Result<never, "ROLE_ASSIGNMENT_CONFLICT"> {
  return {
    ok: false,
    error: {
      code: "ROLE_ASSIGNMENT_CONFLICT",
      messageKey: "admin.role_assignment_conflict",
      retryable: false,
    },
  };
}

export function createDatabaseRoleAssignmentRepository(
  database: Database,
): RoleAssignmentRepository {
  return {
    async mutate(input) {
      try {
        return await database.transaction(async (transaction) => {
          const key = input.context.idempotencyKey;
          const digest = fingerprint(input);
          const [previous] = await transaction
            .select()
            .from(adminRoleMutationRequests)
            .where(and(
              eq(adminRoleMutationRequests.actorId, input.context.access.actorId),
              eq(adminRoleMutationRequests.idempotencyKey, key),
            ))
            .limit(1);
          if (previous !== undefined) {
            if (previous.requestFingerprint !== digest) return conflict();
            const result = previous.result as Partial<MutationResult>;
            return typeof result.assignmentId === "string" && Number.isInteger(result.version)
              ? { ok: true as const, value: { ...result as MutationResult, replayed: true } }
              : conflict();
          }

          const subjectId = input.kind === "assign"
            ? input.subjectAccountId
            : (await transaction.select({ userId: adminRoleAssignments.userId })
              .from(adminRoleAssignments)
              .where(eq(adminRoleAssignments.id, input.assignmentId!))
              .limit(1))[0]?.userId;
          if (subjectId === undefined) return conflict();
          await transaction.execute(
            sql`SELECT pg_advisory_xact_lock(hashtext(${subjectId}))`,
          );

          const [active] = await transaction
            .select()
            .from(adminRoleAssignments)
            .where(and(
              eq(adminRoleAssignments.userId, subjectId),
              isNull(adminRoleAssignments.revokedAt),
            ))
            .orderBy(desc(adminRoleAssignments.assignedAt))
            .limit(1);
          const beforeVersion = active?.assignmentVersion ?? 0;
          if (input.kind === "revoke") {
            if (active?.id !== input.assignmentId || beforeVersion !== input.expectedVersion) {
              return conflict();
            }
            const activeAssignment = active!;
            await transaction.update(adminRoleAssignments).set({
              revokedAt: new Date(),
              revokedBy: input.context.access.actorId,
              revokeReasonCode: input.context.reasonCode,
            }).where(eq(adminRoleAssignments.id, activeAssignment.id));
          } else {
            if (beforeVersion !== input.expectedVersion) return conflict();
            if (active !== undefined) {
              await transaction.update(adminRoleAssignments).set({
                revokedAt: new Date(),
                revokedBy: input.context.access.actorId,
                revokeReasonCode: input.context.reasonCode,
              }).where(eq(adminRoleAssignments.id, active.id));
            }
          }

          const assigned = input.kind === "assign"
            ? (await transaction.insert(adminRoleAssignments).values({
              id: randomUUID(),
              userId: subjectId,
              role: input.role!,
              assignmentVersion: beforeVersion + 1,
            }).returning())[0]
            : active;
          if (assigned === undefined) return conflict();
          const result: MutationResult = {
            assignmentId: assigned.id,
            version: input.kind === "assign" ? beforeVersion + 1 : beforeVersion,
            replayed: false,
          };
          const targetId = input.kind === "assign" ? assigned.id : input.assignmentId!;
          const operation = input.kind === "assign" ? "admin.role.assigned" : "admin.role.revoked";
          const audit = (operationName: string) => ({
            actorId: input.context.access.actorId,
            roleAssignmentId: input.context.access.roleAssignmentId,
            capability: "admin.roles.manage",
            operation: operationName,
            targetType: "admin_role_assignment",
            targetId,
            requestId: input.context.requestId,
            traceId: input.context.traceId,
            idempotencyKey: key,
            reasonCode: input.context.reasonCode,
            policyResult: "allowed",
            redactionLevel: "redacted",
            beforeVersion,
            afterVersion: result.version,
            resultSummary: {
              role: input.kind === "assign" ? input.role : active!.role,
              outcome: "allowed",
            },
          });
          await transaction.insert(adminAuditLogs).values([
            audit("admin.role.authorization"),
            audit(operation),
          ]);
          await transaction.insert(adminRoleMutationRequests).values({
            actorId: input.context.access.actorId,
            operation,
            targetId,
            idempotencyKey: key,
            requestFingerprint: digest,
            result,
          });
          return { ok: true as const, value: result };
        });
      } catch {
        const [previous] = await database
          .select()
          .from(adminRoleMutationRequests)
          .where(and(
            eq(adminRoleMutationRequests.actorId, input.context.access.actorId),
            eq(adminRoleMutationRequests.idempotencyKey, input.context.idempotencyKey),
          ))
          .limit(1);
        if (previous?.requestFingerprint === fingerprint(input)) {
          const result = previous.result as Partial<MutationResult>;
          if (typeof result.assignmentId === "string" && Number.isInteger(result.version)) {
            return { ok: true, value: { ...result as MutationResult, replayed: true } };
          }
        }
        return conflict();
      }
    },
  };
}
