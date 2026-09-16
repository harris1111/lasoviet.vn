import { createHash } from "node:crypto";

import { and, eq, sql } from "drizzle-orm";

import {
  AdminReportRecoverySuccessV1Schema,
  z,
  type AdminReportRecoverySuccessV1,
  type Result,
} from "@lasoviet/contracts";
import type {
  AdminReportRecoveryReasonCode,
} from "@lasoviet/contracts";
import {
  adminAuditLogs,
  adminCapabilityPolicies,
  adminReportRecoveryReceipts,
  adminRoleAssignments,
  authUsers,
  reportReservations,
  type Database,
} from "@lasoviet/database";

import {
  recoverTransientProviderFailureGenerationInTransaction,
} from "../reports/report.service.js";
import type {
  ReportRecoveryCommand,
  ReportRecoveryError,
  ReportRecoveryRepository,
} from "./report-recovery.service.js";

type LockedReservation = typeof reportReservations.$inferSelect;

type RecoveryAuthority = {
  assignmentId: string | null;
  policyId: string | null;
  allowed: boolean;
  fingerprint: {
    actorId: string;
    assignmentId: string | null;
    assignmentVersion: number | null;
    role: string | null;
    emailVerified: boolean;
    policyId: string | null;
  };
};

const StoredReportRecoveryFailureSchema = z.object({
  code: z.enum([
    "REPORT_RECOVERY_FORBIDDEN",
    "REPORT_RECOVERY_CONFLICT",
    "REPORT_NOT_FOUND",
    "REPORT_VERSION_CONFLICT",
    "REPORT_TIMING_LINEAGE_INVALID",
  ]),
}).strict();

function failure(
  code: ReportRecoveryError,
): Result<never, ReportRecoveryError> {
  return {
    ok: false,
    error: {
      code,
      messageKey: `admin.${code.toLowerCase()}`,
      retryable: false,
    },
  };
}

function storedOutcome(
  result: unknown,
  receiptTargetReportVersionId: string,
  commandReportVersionId: string,
): Result<AdminReportRecoverySuccessV1, ReportRecoveryError> | undefined {
  if (receiptTargetReportVersionId !== commandReportVersionId) {
    return undefined;
  }
  const success = AdminReportRecoverySuccessV1Schema.safeParse(result);
  if (
    success.success &&
    success.data.replayed === false &&
    success.data.reportVersionId === commandReportVersionId
  ) {
    return {
      ok: true,
      value: {
        ...success.data,
        replayed: true,
      },
    };
  }
  const storedFailure = StoredReportRecoveryFailureSchema.safeParse(result);
  if (storedFailure.success) {
    return failure(storedFailure.data.code);
  }
  return undefined;
}

async function resolveAuthority(
  transaction: Database,
  command: ReportRecoveryCommand,
): Promise<RecoveryAuthority> {
  const [assignment] = await transaction
    .select({
      id: adminRoleAssignments.id,
      assignmentVersion: adminRoleAssignments.assignmentVersion,
      role: adminRoleAssignments.role,
      revokedAt: adminRoleAssignments.revokedAt,
      emailVerified: authUsers.emailVerified,
    })
    .from(adminRoleAssignments)
    .innerJoin(authUsers, eq(authUsers.id, adminRoleAssignments.userId))
    .where(and(
      eq(adminRoleAssignments.id, command.context.access.roleAssignmentId),
      eq(adminRoleAssignments.userId, command.context.access.actorId),
    ))
    .limit(1)
    .for("update");

  const [policy] = assignment !== undefined &&
    assignment.revokedAt === null &&
    assignment.emailVerified
    ? await transaction
      .select({ id: adminCapabilityPolicies.id })
      .from(adminCapabilityPolicies)
      .where(and(
        eq(adminCapabilityPolicies.role, assignment.role),
        eq(adminCapabilityPolicies.capability, "admin.reports.regenerate"),
        eq(adminCapabilityPolicies.active, true),
      ))
      .limit(1)
      .for("update")
    : [];

  return {
    assignmentId: assignment?.id ?? null,
    policyId: policy?.id ?? null,
    allowed: assignment !== undefined &&
      assignment.revokedAt === null &&
      assignment.emailVerified &&
      policy !== undefined,
    fingerprint: {
      actorId: command.context.access.actorId,
      assignmentId: assignment?.id ?? null,
      assignmentVersion: assignment?.assignmentVersion ?? null,
      role: assignment?.role ?? null,
      emailVerified: assignment?.emailVerified ?? false,
      policyId: policy?.id ?? null,
    },
  };
}

function requestFingerprint(
  command: ReportRecoveryCommand,
  authority: RecoveryAuthority,
): string {
  return createHash("sha256")
    .update(JSON.stringify({
      authority: authority.fingerprint,
      reportVersionId: command.reportVersionId,
      expectedStateVersion: command.expectedStateVersion,
      reasonCode: command.context.reasonCode,
    }))
    .digest("hex");
}

async function lockReservation(
  transaction: Database,
  reportVersionId: string,
): Promise<LockedReservation | undefined> {
  const [reservation] = await transaction
    .select()
    .from(reportReservations)
    .where(sql`${reportReservations.reportVersionId}::text = ${reportVersionId}`)
    .limit(1)
    .for("update");
  return reservation;
}

function mapRecoveryError(
  code: string,
): ReportRecoveryError {
  if (code === "REPORT_NOT_FOUND") return "REPORT_NOT_FOUND";
  if (code === "REPORT_VERSION_CONFLICT") return "REPORT_VERSION_CONFLICT";
  if (code === "REPORT_TIMING_LINEAGE_INVALID") {
    return "REPORT_TIMING_LINEAGE_INVALID";
  }
  return "REPORT_RECOVERY_CONFLICT";
}

async function persistFailure(
  transaction: Database,
  command: ReportRecoveryCommand,
  authority: RecoveryAuthority,
  digest: string,
  code: ReportRecoveryError,
  reservation: LockedReservation | undefined,
) {
  const authorizationAudit = {
    actorId: command.context.access.actorId,
    roleAssignmentId: authority.assignmentId,
    capabilityPolicyId: authority.policyId,
    capability: "admin.reports.regenerate",
    operation: "admin.report.recovery.authorization",
    targetType: "report_version",
    targetId: command.reportVersionId,
    requestId: command.context.requestId,
    traceId: command.context.traceId,
    idempotencyKey: command.context.idempotencyKey,
    reasonCode: command.context.reasonCode satisfies AdminReportRecoveryReasonCode,
    policyResult: authority.allowed ? "allowed" as const : "denied" as const,
    redactionLevel: "redacted" as const,
    beforeVersion: reservation?.stateVersion,
    resultSummary: authority.allowed
      ? { outcome: "allowed" }
      : { outcome: "denied", code },
  };
  const operation = authority.allowed
    ? "admin.report.recovery.command_failed"
    : "admin.report.recovery.authorization";
  if (authority.allowed) {
    await transaction.insert(adminAuditLogs).values([
      authorizationAudit,
      {
        ...authorizationAudit,
        operation,
        resultSummary: { outcome: "failed", code },
      },
    ]);
  } else {
    await transaction.insert(adminAuditLogs).values(authorizationAudit);
  }
  await transaction.insert(adminReportRecoveryReceipts).values({
    actorId: command.context.access.actorId,
    operation,
    targetReportVersionId: command.reportVersionId,
    idempotencyKey: command.context.idempotencyKey,
    requestFingerprint: digest,
    result: { code },
  });
  return failure(code);
}

export function createDatabaseReportRecoveryRepository(
  database: Database,
): ReportRecoveryRepository {
  return {
    async recoverTransientFailure(command) {
      try {
        return await database.transaction(async (transaction) => {
          const tx = transaction as Database;
          const authority = await resolveAuthority(tx, command);
          const reservation = await lockReservation(tx, command.reportVersionId);
          const digest = requestFingerprint(command, authority);
          const receipts = await tx
            .select()
            .from(adminReportRecoveryReceipts)
            .where(and(
              eq(adminReportRecoveryReceipts.actorId, command.context.access.actorId),
              eq(
                adminReportRecoveryReceipts.idempotencyKey,
                command.context.idempotencyKey,
              ),
            ));
          const receipt = receipts[0];

          if (receipt?.requestFingerprint === digest) {
            return storedOutcome(
              receipt.result,
              receipt.targetReportVersionId,
              command.reportVersionId,
            ) ??
              failure("REPORT_RECOVERY_CONFLICT");
          }
          if (receipt !== undefined) {
            return failure("REPORT_RECOVERY_CONFLICT");
          }
          if (!authority.allowed) {
            return persistFailure(
              tx,
              command,
              authority,
              digest,
              "REPORT_RECOVERY_FORBIDDEN",
              reservation,
            );
          }
          if (reservation === undefined) {
            return persistFailure(
              tx,
              command,
              authority,
              digest,
              "REPORT_NOT_FOUND",
              reservation,
            );
          }

          const recovery = await recoverTransientProviderFailureGenerationInTransaction(
            tx,
            {
              reportVersionId: command.reportVersionId,
              expectedStateVersion: command.expectedStateVersion,
              recoveryId: command.context.idempotencyKey,
            },
          );
          if (!recovery.ok) {
            return persistFailure(
              tx,
              command,
              authority,
              digest,
              mapRecoveryError(recovery.code),
              reservation,
            );
          }

          const result: AdminReportRecoverySuccessV1 = {
            reportVersionId: command.reportVersionId,
            stateVersion: recovery.stateVersion,
            replayed: false,
          };
          const audit = (operation: string) => ({
            actorId: command.context.access.actorId,
            roleAssignmentId: authority.assignmentId,
            capabilityPolicyId: authority.policyId,
            capability: "admin.reports.regenerate" as const,
            operation,
            targetType: "report_version",
            targetId: command.reportVersionId,
            requestId: command.context.requestId,
            traceId: command.context.traceId,
            idempotencyKey: command.context.idempotencyKey,
            reasonCode: command.context.reasonCode,
            policyResult: "allowed" as const,
            redactionLevel: "redacted" as const,
            beforeVersion: reservation.stateVersion,
            afterVersion: recovery.stateVersion,
            resultSummary: { outcome: "allowed" },
          });
          await tx.insert(adminAuditLogs).values([
            audit("admin.report.recovery.authorization"),
            audit("admin.report.recovery.requested"),
          ]);
          await tx.insert(adminReportRecoveryReceipts).values({
            actorId: command.context.access.actorId,
            operation: "admin.report.recovery.requested",
            targetReportVersionId: command.reportVersionId,
            idempotencyKey: command.context.idempotencyKey,
            requestFingerprint: digest,
            result,
          });
          return { ok: true as const, value: result };
        });
      } catch {
        return failure("REPORT_RECOVERY_CONFLICT");
      }
    },
  };
}
