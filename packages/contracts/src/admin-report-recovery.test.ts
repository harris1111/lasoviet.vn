import { describe, expect, it } from "vitest";

import { AdminAuditSummaryV1Schema } from "./admin-role-audit.js";
import {
  AdminReportRecoveryCommandV1Schema,
  AdminReportRecoveryContextV1Schema,
  AdminReportRecoverySuccessV1Schema,
} from "./admin-report-recovery.js";

describe("admin report recovery contracts", () => {
  const command = {
    reportVersionId: "00000000-0000-0000-0000-000000000001",
    expectedStateVersion: 3,
    idempotencyKey: "  report-recovery-1  ",
    reasonCode: "provider_transient_failure",
  };

  it("parses and trims the strict V1 command", () => {
    expect(AdminReportRecoveryCommandV1Schema.parse(command)).toEqual({
      ...command,
      idempotencyKey: "report-recovery-1",
    });
  });

  it("rejects unknown fields, invalid versions, blank ids, and unsupported reasons", () => {
    expect(AdminReportRecoveryCommandV1Schema.safeParse({
      ...command,
      unexpected: true,
    }).success).toBe(false);
    expect(AdminReportRecoveryCommandV1Schema.safeParse({
      ...command,
      expectedStateVersion: 0,
    }).success).toBe(false);
    expect(AdminReportRecoveryCommandV1Schema.safeParse({
      ...command,
      expectedStateVersion: 1_000_001,
    }).success).toBe(false);
    expect(AdminReportRecoveryCommandV1Schema.safeParse({
      ...command,
      reportVersionId: " ",
    }).success).toBe(false);
    expect(AdminReportRecoveryCommandV1Schema.safeParse({
      ...command,
      idempotencyKey: "x".repeat(129),
    }).success).toBe(false);
    expect(AdminReportRecoveryCommandV1Schema.safeParse({
      ...command,
      reasonCode: "manual_retry",
    }).success).toBe(false);
  });

  it("requires a strict trusted command context and strict success response", () => {
    const context = {
      access: {
        actorId: "actor-1",
        roleAssignmentId: "assignment-1",
        role: "super_admin",
        capabilities: ["admin.reports.regenerate"],
      },
      requestId: "request-1",
      traceId: "trace-1",
      idempotencyKey: "recovery-1",
      reasonCode: "incident_recovery",
    };
    expect(AdminReportRecoveryContextV1Schema.safeParse(context).success).toBe(true);
    expect(AdminReportRecoveryContextV1Schema.safeParse({
      ...context,
      extra: true,
    }).success).toBe(false);
    expect(AdminReportRecoverySuccessV1Schema.safeParse({
      reportVersionId: command.reportVersionId,
      stateVersion: 4,
      replayed: false,
    }).success).toBe(true);
    expect(AdminReportRecoverySuccessV1Schema.safeParse({
      reportVersionId: command.reportVersionId,
      stateVersion: 4,
      replayed: false,
      lastErrorCode: "AI_TIMEOUT",
    }).success).toBe(false);
  });

  it("allows bounded failed report-recovery summaries in admin audit projections", () => {
    expect(AdminAuditSummaryV1Schema.safeParse({
      id: "00000000-0000-4000-8000-000000000001",
      actorId: "actor-1",
      roleAssignmentId: "assignment-1",
      capability: "admin.reports.regenerate",
      operation: "admin.report.recovery.command_failed",
      target: {
        type: "report_version",
        id: "00000000-0000-0000-0000-000000000002",
      },
      requestId: "request-1",
      traceId: "trace-1",
      result: "allowed",
      redactionLevel: "redacted",
      reasonCode: "provider_transient_failure",
      idempotencyKey: "recovery-1",
      beforeVersion: 3,
      afterVersion: null,
      resultSummary: {
        outcome: "failed",
        code: "REPORT_RECOVERY_CONFLICT",
      },
      createdAt: "2026-09-16T00:00:00.000Z",
    }).success).toBe(true);
  });
});
