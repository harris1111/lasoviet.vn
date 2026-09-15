import { randomUUID } from "node:crypto";
import type { AdminAccessError, AdminAuditEntry } from "@lasoviet/backend";
import { parseAdminBusinessMetricsFiltersV1 } from "@lasoviet/contracts";

export function correlationId(value: string | undefined): string {
  return value !== undefined && /^[A-Za-z0-9._:-]{1,128}$/.test(value)
    ? value
    : randomUUID();
}

export function resolveTargetId(from?: string, to?: string): string {
  const parsed = parseAdminBusinessMetricsFiltersV1({ from, to });
  if (parsed.success) {
    return `${parsed.data.fromDate}:${parsed.data.toDate}`;
  }
  const cleanFrom =
    typeof from === "string" && /^\d{4}-\d{2}-\d{2}$/.test(from)
      ? from
      : "invalid";
  const cleanTo =
    typeof to === "string" && /^\d{4}-\d{2}-\d{2}$/.test(to)
      ? to
      : "invalid";
  return `${cleanFrom}:${cleanTo}`;
}

export async function auditBusinessMetricsDenial(
  auditService: { appendAdminAudit: (entry: AdminAuditEntry) => Promise<string> },
  input: {
    requestId: string;
    code: AdminAccessError;
    targetId: string;
    actorId?: string;
    roleAssignmentId?: string;
  },
): Promise<void> {
  await auditService.appendAdminAudit({
    actorId: input.actorId ?? null,
    roleAssignmentId: input.roleAssignmentId ?? null,
    capability: "admin.commerce.read",
    operation: "admin.business_metrics.read",
    target: { type: "admin_business_metrics", id: input.targetId },
    requestId: input.requestId,
    traceId: input.requestId,
    policyResult: "denied",
    redactionLevel: "redacted",
    resultSummary: { outcome: "denied", code: input.code },
  });
}

export async function auditBusinessMetricsResult(
  auditService: { appendAdminAudit: (entry: AdminAuditEntry) => Promise<string> },
  input: {
    actorId: string;
    roleAssignmentId: string;
    targetId: string;
    requestId: string;
    resultSummary: Record<string, unknown>;
  },
): Promise<void> {
  await auditService.appendAdminAudit({
    actorId: input.actorId,
    roleAssignmentId: input.roleAssignmentId,
    capability: "admin.commerce.read",
    operation: "admin.business_metrics.read",
    target: { type: "admin_business_metrics", id: input.targetId },
    requestId: input.requestId,
    traceId: input.requestId,
    policyResult: "allowed",
    redactionLevel: "redacted",
    resultSummary: input.resultSummary,
  });
}
