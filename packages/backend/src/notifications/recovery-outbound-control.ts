import { createHash } from "node:crypto";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { RecoveryControlCommandSchema, type CurrentActor } from "@lasoviet/contracts";
import { adminAuditLogs, adminCapabilityPolicies, adminRoleAssignments, authSessions, authUsers,
  deletionRequests, lockFreeAiCoordination, lockRecoveryCaptureCoordination, recoveryOutboundControl, type Database } from "@lasoviet/database";

const OPERATION = "admin.recovery.outbound.control";
type Control = typeof recoveryOutboundControl.$inferSelect;
function digest(value: unknown) { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }
function projection(row: Control) {
  return { emergencyStopped: row.emergencyStopped, cohortCount: row.cohortIds.length,
    dailyLimit: row.dailyLimit, stateToken: digest([row.emergencyStopped, [...row.cohortIds].sort(), row.dailyLimit, row.updatedAt.toISOString()]) };
}

export function createRecoveryOutboundControlTool(database: Database, clock: () => Date = () => new Date()) {
  async function execute(actor: CurrentActor, input?: unknown) {
    if (actor.kind !== "account") return { ok: false as const, code: "RECOVERY_CONTROL_FORBIDDEN" };
    const actorId = actor.userId;
    return database.transaction(async tx => {
      await lockFreeAiCoordination(tx);
      await lockRecoveryCaptureCoordination(tx);
      const now = clock();
      const [assignment] = await tx.select({ id: adminRoleAssignments.id, role: adminRoleAssignments.role,
        verified: authUsers.emailVerified, anonymous: authUsers.isAnonymous }).from(adminRoleAssignments)
        .innerJoin(authUsers, eq(authUsers.id, adminRoleAssignments.userId))
        .where(and(eq(adminRoleAssignments.userId, actorId), isNull(adminRoleAssignments.revokedAt))).for("share");
      const [policy] = assignment?.role === "super_admin" ? await tx.select({ id: adminCapabilityPolicies.id }).from(adminCapabilityPolicies)
        .where(and(eq(adminCapabilityPolicies.role, "super_admin"), eq(adminCapabilityPolicies.capability, "admin.commerce.manage"), eq(adminCapabilityPolicies.active, true))).for("share") : [];
      const [session] = await tx.select().from(authSessions).where(and(eq(authSessions.id, actor.sessionId), eq(authSessions.userId, actorId))).for("share");
      const [deletion] = await tx.select({id: deletionRequests.id}).from(deletionRequests)
        .where(and(eq(deletionRequests.userId, actorId), eq(deletionRequests.status, "requested"))).limit(1).for("share");
      const allowed = !!assignment?.verified && !assignment.anonymous && !!policy && !!session && session.expiresAt > now && !deletion;
      const parsed = RecoveryControlCommandSchema.safeParse(input);
      async function audit(code: string, summary: Record<string, unknown> = {}) {
        await tx.insert(adminAuditLogs).values({ actorId: actorId, roleAssignmentId: assignment?.id ?? null,
          capabilityPolicyId: policy?.id ?? null, capability: "admin.commerce.manage", operation: OPERATION,
          targetType: "recovery_control", targetId: "pending-topup", requestId: actor.requestId, traceId: actor.requestId,
          ...(parsed.success ? { idempotencyKey: parsed.data.idempotencyKey, reasonCode: parsed.data.reasonCode } : {}),
          policyResult: code === "allowed" ? "allowed" : "denied", redactionLevel: "redacted",
          resultSummary: { outcome: code === "allowed" ? "allowed" : "denied", code, ...summary } });
      }
      if (!allowed) { await audit("RECOVERY_CONTROL_FORBIDDEN"); return { ok: false as const, code: "RECOVERY_CONTROL_FORBIDDEN" }; }
      const [row] = await tx.select().from(recoveryOutboundControl).where(eq(recoveryOutboundControl.id, "pending-topup")).for("update");
      if (!row) throw new Error("RECOVERY_CONTROL_UNAVAILABLE");
      if (input === undefined) { await audit("allowed", { read: true }); return { ok: true as const, value: projection(row), replayed: false }; }
      if (!parsed.success) { await audit("RECOVERY_CONTROL_INVALID"); return { ok: false as const, code: "RECOVERY_CONTROL_INVALID" }; }
      const command = parsed.data, commandDigest = digest({...command, cohortIds: [...command.cohortIds].sort()});
      const [prior] = await tx.select().from(adminAuditLogs).where(and(eq(adminAuditLogs.actorId, actorId),
        eq(adminAuditLogs.operation, OPERATION), eq(adminAuditLogs.idempotencyKey, command.idempotencyKey), eq(adminAuditLogs.policyResult, "allowed"))).limit(1);
      if (prior) {
        if (prior.resultSummary.commandDigest !== commandDigest) { await audit("RECOVERY_CONTROL_CONFLICT"); return { ok: false as const, code: "RECOVERY_CONTROL_CONFLICT" }; }
        await audit("allowed", { replayed: true, commandDigest });
        // Replay confirms the command receipt; it never restores superseded state.
        return { ok: true as const, value: projection(row), replayed: true };
      }
      if (projection(row).stateToken !== command.expectedState) { await audit("RECOVERY_CONTROL_CONFLICT"); return { ok: false as const, code: "RECOVERY_CONTROL_CONFLICT" }; }
      const cohort = !command.emergencyStopped && command.cohortIds.length ? await tx.select({ id: authUsers.id, verified: authUsers.emailVerified,
        anonymous: authUsers.isAnonymous }).from(authUsers).where(inArray(authUsers.id, command.cohortIds)).for("share") : [];
      if (!command.emergencyStopped && command.cohortIds.some(id => !cohort.some(user => user.id === id && user.verified && !user.anonymous))) {
        await audit("RECOVERY_CONTROL_COHORT_INVALID"); return { ok: false as const, code: "RECOVERY_CONTROL_COHORT_INVALID" };
      }
      const [changed] = await tx.update(recoveryOutboundControl).set({ emergencyStopped: command.emergencyStopped,
        cohortIds: [...command.cohortIds].sort(), dailyLimit: command.dailyLimit,
        updatedAt: new Date(Math.max(now.getTime(), row.updatedAt.getTime() + 1)) }).where(eq(recoveryOutboundControl.id, row.id)).returning();
      await audit("allowed", { commandDigest, emergencyStopped: command.emergencyStopped, count: command.cohortIds.length, dailyLimit: command.dailyLimit });
      return { ok: true as const, value: projection(changed!), replayed: false };
    });
  }
  return { read: (actor: CurrentActor) => execute(actor), update: (actor: CurrentActor, input: unknown) => execute(actor, input) };
}
