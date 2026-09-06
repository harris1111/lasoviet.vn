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

import type {
  RoleAssignmentError,
  RoleAssignmentRepository,
  RoleMutation,
} from "./role-assignment.service.js";

type MutationResult = { assignmentId: string; version: number; replayed: boolean };
type Authority = {
  assignmentId: string | null;
  policyId: string | null;
  allowed: boolean;
  fingerprint: string;
};

function fingerprint(input: RoleMutation, authority: Authority): string {
  return createHash("sha256").update(JSON.stringify({
    authority: authority.fingerprint,
    kind: input.kind,
    subjectAccountId: input.subjectAccountId,
    assignmentId: input.assignmentId,
    role: input.role,
    expectedVersion: input.expectedVersion,
    reasonCode: input.context.reasonCode,
  })).digest("hex");
}

function failure(code: RoleAssignmentError): Result<never, RoleAssignmentError> {
  return { ok: false, error: { code, messageKey: `admin.${code.toLowerCase()}`, retryable: false } };
}

function storedOutcome(result: unknown): Result<MutationResult, RoleAssignmentError> | undefined {
  if (typeof result !== "object" || result === null) return undefined;
  const value = result as {
    assignmentId?: unknown;
    version?: unknown;
    code?: unknown;
  };
  if (typeof value.assignmentId === "string" && typeof value.version === "number"
    && Number.isInteger(value.version)) {
    return { ok: true, value: { assignmentId: value.assignmentId, version: value.version, replayed: true } };
  }
  if (
    value.code === "ROLE_ASSIGNMENT_FORBIDDEN"
    || value.code === "ROLE_ASSIGNMENT_CONFLICT"
    || value.code === "ROLE_ASSIGNMENT_SELF_ESCALATION_DENIED"
  ) return failure(value.code);
  return undefined;
}

async function lockSubjects(transaction: Database, ids: string[]) {
  for (const id of [...new Set(ids)].sort()) {
    await transaction.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${id}))`);
  }
}

async function resolveAuthority(transaction: Database, input: RoleMutation): Promise<Authority> {
  const [actor] = await transaction.select({
    id: adminRoleAssignments.id,
    role: adminRoleAssignments.role,
    emailVerified: authUsers.emailVerified,
  }).from(adminRoleAssignments)
    .innerJoin(authUsers, eq(authUsers.id, adminRoleAssignments.userId))
    .where(and(
      eq(adminRoleAssignments.userId, input.context.access.actorId),
      eq(adminRoleAssignments.id, input.context.access.roleAssignmentId),
      isNull(adminRoleAssignments.revokedAt),
    )).limit(1).for("update");
  const [policy] = actor?.role === "super_admin" && actor.emailVerified
    ? await transaction.select({ id: adminCapabilityPolicies.id })
      .from(adminCapabilityPolicies).where(and(
        eq(adminCapabilityPolicies.role, "super_admin"),
        eq(adminCapabilityPolicies.capability, "admin.roles.manage"),
        eq(adminCapabilityPolicies.active, true),
      )).limit(1).for("update")
    : [];
  if (actor === undefined || policy === undefined) {
    return {
      assignmentId: actor?.id ?? null,
      policyId: null,
      allowed: false,
      fingerprint: `inactive:${actor?.id ?? input.context.access.roleAssignmentId}`,
    };
  }
  return {
    assignmentId: actor.id,
    policyId: policy.id,
    allowed: true,
    fingerprint: `active:${actor.id}:${policy.id}`,
  };
}

function target(input: RoleMutation, subjectId: string | undefined) {
  return input.kind === "assign"
    ? { type: "admin_account", id: subjectId! }
    : { type: "admin_role_assignment", id: input.assignmentId! };
}

async function persistFailure(
  transaction: Database,
  input: RoleMutation,
  digest: string,
  authority: Authority,
  subjectId: string | undefined,
  code: RoleAssignmentError,
  beforeVersion?: number,
) {
  const authorized = authority.allowed;
  const operation = authorized ? "admin.role.command_failed" : "admin.role.authorization";
  const auditTarget = target(input, subjectId);
  await transaction.insert(adminAuditLogs).values({
    actorId: input.context.access.actorId,
    roleAssignmentId: authority.assignmentId,
    capabilityPolicyId: authority.policyId,
    capability: "admin.roles.manage",
    operation,
    targetType: auditTarget.type,
    targetId: auditTarget.id,
    requestId: input.context.requestId,
    traceId: input.context.traceId,
    idempotencyKey: input.context.idempotencyKey,
    reasonCode: input.context.reasonCode,
    policyResult: authorized ? "allowed" : "denied",
    redactionLevel: "redacted",
    beforeVersion,
    resultSummary: { outcome: "denied", code },
  });
  await transaction.insert(adminRoleMutationRequests).values({
    actorId: input.context.access.actorId,
    operation,
    targetId: auditTarget.id,
    idempotencyKey: input.context.idempotencyKey,
    requestFingerprint: digest,
    result: { code },
  });
  return failure(code);
}

export function createDatabaseRoleAssignmentRepository(database: Database): RoleAssignmentRepository {
  return {
    async mutate(input) {
      try {
        return await database.transaction(async (transaction) => {
          const [assignment] = input.kind === "revoke"
            ? await transaction.select({ userId: adminRoleAssignments.userId })
              .from(adminRoleAssignments).where(eq(adminRoleAssignments.id, input.assignmentId!)).limit(1)
            : [];
          const subjectId = input.kind === "assign" ? input.subjectAccountId : assignment?.userId;
          await lockSubjects(transaction as Database, [
            input.context.access.actorId,
            ...(subjectId === undefined ? [] : [subjectId]),
          ]);
          const authority = await resolveAuthority(transaction as Database, input);
          const digest = fingerprint(input, authority);
          const receipts = await transaction.select().from(adminRoleMutationRequests).where(and(
            eq(adminRoleMutationRequests.actorId, input.context.access.actorId),
            eq(adminRoleMutationRequests.idempotencyKey, input.context.idempotencyKey),
          ));
          const matching = receipts.find((receipt) => receipt.requestFingerprint === digest);
          if (matching !== undefined) {
            return storedOutcome(matching.result) ?? failure("ROLE_ASSIGNMENT_CONFLICT");
          }
          if (!authority.allowed) {
            return persistFailure(
              transaction as Database, input, digest, authority, subjectId,
              "ROLE_ASSIGNMENT_FORBIDDEN",
            );
          }
          if (receipts.length > 0) {
            return persistFailure(
              transaction as Database, input, digest, authority, subjectId,
              "ROLE_ASSIGNMENT_CONFLICT",
            );
          }
          if (input.kind === "assign" && subjectId === input.context.access.actorId) {
            return persistFailure(
              transaction as Database, input, digest, authority, subjectId,
              "ROLE_ASSIGNMENT_SELF_ESCALATION_DENIED",
            );
          }
          if (subjectId === undefined) {
            return persistFailure(
              transaction as Database, input, digest, authority, subjectId,
              "ROLE_ASSIGNMENT_CONFLICT",
            );
          }
          if (input.kind === "assign") {
            const [targetAccount] = await transaction.select({ id: authUsers.id })
              .from(authUsers).where(eq(authUsers.id, subjectId)).limit(1).for("update");
            if (targetAccount === undefined) {
              return persistFailure(
                transaction as Database, input, digest, authority, subjectId,
                "ROLE_ASSIGNMENT_CONFLICT",
              );
            }
          }

          const [active] = await transaction.select().from(adminRoleAssignments)
            .where(and(eq(adminRoleAssignments.userId, subjectId), isNull(adminRoleAssignments.revokedAt)))
            .limit(1).for("update");
          const [{ version: latestVersion } = { version: null }] = await transaction
            .select({ version: max(adminRoleAssignments.assignmentVersion) })
            .from(adminRoleAssignments).where(eq(adminRoleAssignments.userId, subjectId));
          const beforeVersion = latestVersion ?? 0;
          const conflict = input.kind === "assign"
            ? beforeVersion !== input.expectedVersion
            : active?.id !== input.assignmentId || active!.assignmentVersion !== input.expectedVersion;
          if (conflict) {
            return persistFailure(
              transaction as Database, input, digest, authority, subjectId,
              "ROLE_ASSIGNMENT_CONFLICT", beforeVersion,
            );
          }
          if (active !== undefined) {
            await transaction.update(adminRoleAssignments).set({
              revokedAt: new Date(),
              revokedBy: input.context.access.actorId,
              revokeReasonCode: input.context.reasonCode,
            }).where(eq(adminRoleAssignments.id, active.id));
          }
          const assigned = input.kind === "assign"
            ? (await transaction.insert(adminRoleAssignments).values({
              id: randomUUID(), userId: subjectId, role: input.role!,
              assignmentVersion: beforeVersion + 1,
            }).returning())[0]
            : active;
          if (assigned === undefined) {
            return persistFailure(
              transaction as Database, input, digest, authority, subjectId,
              "ROLE_ASSIGNMENT_CONFLICT", beforeVersion,
            );
          }
          const result: MutationResult = {
            assignmentId: assigned.id,
            version: input.kind === "assign" ? beforeVersion + 1 : assigned.assignmentVersion,
            replayed: false,
          };
          const operation = input.kind === "assign" ? "admin.role.assigned" : "admin.role.revoked";
          const audit = (name: string) => ({
            actorId: input.context.access.actorId,
            roleAssignmentId: authority.assignmentId,
            capabilityPolicyId: authority.policyId,
            capability: "admin.roles.manage",
            operation: name,
            targetType: "admin_role_assignment",
            targetId: assigned.id,
            requestId: input.context.requestId,
            traceId: input.context.traceId,
            idempotencyKey: input.context.idempotencyKey,
            reasonCode: input.context.reasonCode,
            policyResult: "allowed" as const,
            redactionLevel: "redacted" as const,
            beforeVersion,
            afterVersion: result.version,
            resultSummary: { role: input.kind === "assign" ? input.role : assigned.role, outcome: "allowed" },
          });
          await transaction.insert(adminAuditLogs).values([audit("admin.role.authorization"), audit(operation)]);
          await transaction.insert(adminRoleMutationRequests).values({
            actorId: input.context.access.actorId,
            operation,
            targetId: assigned.id,
            idempotencyKey: input.context.idempotencyKey,
            requestFingerprint: digest,
            result,
          });
          return { ok: true as const, value: result };
        });
      } catch {
        return failure("ROLE_ASSIGNMENT_CONFLICT");
      }
    },
  };
}
