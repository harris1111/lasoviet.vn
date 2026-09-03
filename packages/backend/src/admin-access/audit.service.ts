import {
  AdminRoleSchema,
  type AdminAuditTarget,
  type AdminCapability,
} from "@lasoviet/contracts";
import { adminAuditLogs, type Database } from "@lasoviet/database";

export type AdminAuditEntry = {
  actorId: string | null;
  roleAssignmentId: string | null;
  capability: AdminCapability;
  operation: string;
  target: AdminAuditTarget;
  requestId: string;
  traceId: string;
  idempotencyKey?: string;
  reasonCode?: string;
  policyResult: "allowed" | "denied";
  redactionLevel: "redacted";
  beforeVersion?: number;
  afterVersion?: number;
  resultSummary: Record<string, unknown>;
};

export type AdminAuditRepository = {
  append(entry: AdminAuditEntry): Promise<string>;
};

const policyCodes = new Set([
  "ADMIN_AUTH_REQUIRED",
  "ADMIN_FORBIDDEN",
  "ROLE_ASSIGNMENT_INACTIVE",
  "ADMIN_FILTER_INVALID",
  "ADMIN_PROJECTION_UNAVAILABLE",
  "ROLE_ASSIGNMENT_FORBIDDEN",
  "ROLE_ASSIGNMENT_CONFLICT",
  "ROLE_ASSIGNMENT_SELF_ESCALATION_DENIED",
]);

function redact(value: Record<string, unknown>): Record<string, unknown> {
  const summary: Record<string, unknown> = {};
  if (AdminRoleSchema.safeParse(value.role).success) summary.role = value.role;
  if (value.outcome === "allowed" || value.outcome === "denied") {
    summary.outcome = value.outcome;
  }
  if (typeof value.code === "string" && policyCodes.has(value.code)) {
    summary.code = value.code;
  }
  if (
    typeof value.count === "number" &&
    Number.isInteger(value.count) &&
    value.count >= 0 &&
    value.count <= 100_000
  ) {
    summary.count = value.count;
  }
  return summary;
}

export function createAdminAuditService(options: { repository: AdminAuditRepository }) {
  return {
    appendAdminAudit(entry: AdminAuditEntry): Promise<string> {
      if (
        entry.operation.trim() === "" ||
        entry.target.type.trim() === "" ||
        entry.target.id.trim() === "" ||
        entry.requestId.trim() === "" ||
        entry.traceId.trim() === ""
      ) {
        throw new Error("AUDIT_RECORD_INCOMPLETE");
      }
      return options.repository.append({
        ...entry,
        resultSummary: redact(entry.resultSummary),
      });
    },
  };
}

export function createDatabaseAdminAuditRepository(
  database: Database,
): AdminAuditRepository {
  return {
    async append(entry) {
      const [created] = await database.insert(adminAuditLogs).values({
        actorId: entry.actorId,
        roleAssignmentId: entry.roleAssignmentId,
        capability: entry.capability,
        operation: entry.operation,
        targetType: entry.target.type,
        targetId: entry.target.id,
        requestId: entry.requestId,
        traceId: entry.traceId,
        idempotencyKey: entry.idempotencyKey,
        reasonCode: entry.reasonCode,
        policyResult: entry.policyResult,
        redactionLevel: entry.redactionLevel,
        beforeVersion: entry.beforeVersion,
        afterVersion: entry.afterVersion,
        resultSummary: entry.resultSummary,
      }).returning({ id: adminAuditLogs.id });
      if (created === undefined) throw new Error("ADMIN_AUDIT_APPEND_FAILED");
      return created.id;
    },
  };
}
