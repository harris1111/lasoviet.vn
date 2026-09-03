import { createHash, randomUUID } from "node:crypto";

import { and, eq, isNull, max, sql } from "drizzle-orm";

import type { Result } from "@lasoviet/contracts";
import {
  adminAuditLogs,
  adminCapabilityPolicies,
  adminRoleAssignments,
  adminRoleMutationRequests,
  authUsers,
  type Database,
} from "@lasoviet/database";

import type { RoleAssignmentRepository, RoleMutation } from "./role-assignment.service.js";

type MutationResult = { assignmentId: string; version: number; replayed: boolean };
type MutationError = "ROLE_ASSIGNMENT_FORBIDDEN" | "ROLE_ASSIGNMENT_CONFLICT";

function fingerprint(input: RoleMutation): string {
  return createHash("sha256").update(JSON.stringify({
    kind: input.kind, subjectAccountId: input.subjectAccountId,
    assignmentId: input.assignmentId, role: input.role,
    expectedVersion: input.expectedVersion, reasonCode: input.context.reasonCode,
  })).digest("hex");
}

function failure(code: MutationError): Result<never, MutationError> {
  return { ok: false, error: { code, messageKey: `admin.${code.toLowerCase()}`, retryable: false } };
}

async function lockSubjects(transaction: Database, ids: string[]) {
  for (const id of [...new Set(ids)].sort()) {
    await transaction.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${id}))`);
  }
}

export function createDatabaseRoleAssignmentRepository(database: Database): RoleAssignmentRepository {
  return {
    async mutate(input) {
      const digest = fingerprint(input);
      try {
        return await database.transaction(async (transaction) => {
          const assignment = input.kind === "revoke"
            ? (await transaction.select({ userId: adminRoleAssignments.userId })
              .from(adminRoleAssignments).where(eq(adminRoleAssignments.id, input.assignmentId!)).limit(1))[0]
            : undefined;
          const subjectId = input.kind === "assign" ? input.subjectAccountId : assignment?.userId;
          if (subjectId === undefined) return failure("ROLE_ASSIGNMENT_CONFLICT");
          await lockSubjects(transaction as Database, [input.context.access.actorId, subjectId]);

          const [receipt] = await transaction.select().from(adminRoleMutationRequests)
            .where(and(
              eq(adminRoleMutationRequests.actorId, input.context.access.actorId),
              eq(adminRoleMutationRequests.idempotencyKey, input.context.idempotencyKey),
            )).limit(1);
          if (receipt !== undefined) {
            if (receipt.requestFingerprint !== digest) return failure("ROLE_ASSIGNMENT_CONFLICT");
            const result = receipt.result as Partial<MutationResult>;
            return typeof result.assignmentId === "string" && Number.isInteger(result.version)
              ? { ok: true as const, value: { ...result as MutationResult, replayed: true } }
              : failure("ROLE_ASSIGNMENT_CONFLICT");
          }

          const [actor] = await transaction.select({
            id: adminRoleAssignments.id, role: adminRoleAssignments.role,
            emailVerified: authUsers.emailVerified,
          }).from(adminRoleAssignments)
            .innerJoin(authUsers, eq(authUsers.id, adminRoleAssignments.userId))
            .where(and(
              eq(adminRoleAssignments.userId, input.context.access.actorId),
              eq(adminRoleAssignments.id, input.context.access.roleAssignmentId),
              isNull(adminRoleAssignments.revokedAt),
            )).limit(1);
          const [policy] = actor?.role === "super_admin"
            ? await transaction.select({ id: adminCapabilityPolicies.id })
              .from(adminCapabilityPolicies).where(and(
                eq(adminCapabilityPolicies.role, "super_admin"),
                eq(adminCapabilityPolicies.capability, "admin.roles.manage"),
                eq(adminCapabilityPolicies.active, true),
              )).limit(1)
            : [];
          if (actor?.emailVerified !== true || policy === undefined) {
            await transaction.insert(adminAuditLogs).values({
              actorId: input.context.access.actorId, roleAssignmentId: actor?.id ?? null,
              capability: "admin.roles.manage", operation: "admin.role.authorization",
              targetType: "admin_account", targetId: subjectId,
              requestId: input.context.requestId, traceId: input.context.traceId,
              idempotencyKey: input.context.idempotencyKey, reasonCode: input.context.reasonCode,
              policyResult: "denied", redactionLevel: "redacted",
              resultSummary: { outcome: "denied", code: "ROLE_ASSIGNMENT_FORBIDDEN" },
            });
            return failure("ROLE_ASSIGNMENT_FORBIDDEN");
          }

          const [active] = await transaction.select().from(adminRoleAssignments)
            .where(and(eq(adminRoleAssignments.userId, subjectId), isNull(adminRoleAssignments.revokedAt)))
            .limit(1);
          const [{ version: latestVersion } = { version: null }] = await transaction
            .select({ version: max(adminRoleAssignments.assignmentVersion) })
            .from(adminRoleAssignments).where(eq(adminRoleAssignments.userId, subjectId));
          const beforeVersion = latestVersion ?? 0;
          const conflict = input.kind === "assign"
            ? beforeVersion !== input.expectedVersion
            : active?.id !== input.assignmentId || active!.assignmentVersion !== input.expectedVersion;
          if (conflict) {
            await transaction.insert(adminAuditLogs).values({
              actorId: input.context.access.actorId, roleAssignmentId: actor.id,
              capabilityPolicyId: policy.id, capability: "admin.roles.manage",
              operation: "admin.role.command_failed", targetType: "admin_account", targetId: subjectId,
              requestId: input.context.requestId, traceId: input.context.traceId,
              idempotencyKey: input.context.idempotencyKey, reasonCode: input.context.reasonCode,
              policyResult: "allowed", redactionLevel: "redacted",
              beforeVersion, resultSummary: { outcome: "allowed", code: "ROLE_ASSIGNMENT_CONFLICT" },
            });
            return failure("ROLE_ASSIGNMENT_CONFLICT");
          }
          if (active !== undefined) {
            await transaction.update(adminRoleAssignments).set({
              revokedAt: new Date(), revokedBy: input.context.access.actorId,
              revokeReasonCode: input.context.reasonCode,
            }).where(eq(adminRoleAssignments.id, active.id));
          }
          const assigned = input.kind === "assign"
            ? (await transaction.insert(adminRoleAssignments).values({
              id: randomUUID(), userId: subjectId, role: input.role!,
              assignmentVersion: beforeVersion + 1,
            }).returning())[0]
            : active;
          if (assigned === undefined) return failure("ROLE_ASSIGNMENT_CONFLICT");
          const result: MutationResult = {
            assignmentId: assigned.id,
            version: input.kind === "assign" ? beforeVersion + 1 : assigned.assignmentVersion,
            replayed: false,
          };
          const operation = input.kind === "assign" ? "admin.role.assigned" : "admin.role.revoked";
          const audit = (name: string) => ({
            actorId: input.context.access.actorId, roleAssignmentId: actor.id,
            capabilityPolicyId: policy.id, capability: "admin.roles.manage", operation: name,
            targetType: "admin_role_assignment", targetId: assigned.id,
            requestId: input.context.requestId, traceId: input.context.traceId,
            idempotencyKey: input.context.idempotencyKey, reasonCode: input.context.reasonCode,
            policyResult: "allowed", redactionLevel: "redacted",
            beforeVersion, afterVersion: result.version,
            resultSummary: { role: input.kind === "assign" ? input.role : assigned.role, outcome: "allowed" },
          });
          await transaction.insert(adminAuditLogs).values([audit("admin.role.authorization"), audit(operation)]);
          await transaction.insert(adminRoleMutationRequests).values({
            actorId: input.context.access.actorId, operation, targetId: assigned.id,
            idempotencyKey: input.context.idempotencyKey, requestFingerprint: digest, result,
          });
          return { ok: true as const, value: result };
        });
      } catch {
        const [receipt] = await database.select().from(adminRoleMutationRequests)
          .where(and(
            eq(adminRoleMutationRequests.actorId, input.context.access.actorId),
            eq(adminRoleMutationRequests.idempotencyKey, input.context.idempotencyKey),
          )).limit(1);
        if (receipt?.requestFingerprint === digest) {
          const result = receipt.result as Partial<MutationResult>;
          if (typeof result.assignmentId === "string" && Number.isInteger(result.version)) {
            return { ok: true, value: { ...result as MutationResult, replayed: true } };
          }
        }
        return failure("ROLE_ASSIGNMENT_CONFLICT");
      }
    },
  };
}
