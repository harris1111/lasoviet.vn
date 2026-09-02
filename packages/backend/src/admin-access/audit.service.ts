import type { AdminAuditTarget, AdminCapability } from "@lasoviet/contracts";
import { adminAuditLogs, type Database } from "@lasoviet/database";

export type AdminAuditEntry = {
  actorId: string;
  roleAssignmentId: string;
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

const sensitiveKey = /email|full.?name|token|secret|password|signed.?url|report.?body|raw.?payload|birth.?profile|chart.?payload|provider.?error/i;

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, child]) =>
      sensitiveKey.test(key) ? [] : [[key, redact(child)]],
    ),
  );
}

export function createAdminAuditService(options: { repository: AdminAuditRepository }) {
  return {
    appendAdminAudit(entry: AdminAuditEntry): Promise<string> {
      return options.repository.append({
        ...entry,
        resultSummary: redact(entry.resultSummary) as Record<string, unknown>,
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
