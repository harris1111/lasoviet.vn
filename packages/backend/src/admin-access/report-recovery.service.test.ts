import { describe, expect, it, vi } from "vitest";

import { createReportRecoveryService } from "./report-recovery.service.js";

const context = {
  access: {
    actorId: "admin-1",
    roleAssignmentId: "assignment-1",
    role: "super_admin" as const,
    capabilities: ["admin.reports.regenerate"] as const,
  },
  requestId: "request-1",
  traceId: "trace-1",
  idempotencyKey: "recovery-1",
  reasonCode: "provider_transient_failure" as const,
};

const command = {
  reportVersionId: "00000000-0000-0000-0000-000000000001",
  expectedStateVersion: 3,
  idempotencyKey: "recovery-1",
  reasonCode: "provider_transient_failure" as const,
};

describe("report recovery service", () => {
  it("passes validated command context to the transactional repository", async () => {
    const recoverTransientFailure = vi.fn().mockResolvedValue({
      ok: true,
      value: {
        reportVersionId: command.reportVersionId,
        stateVersion: 4,
        replayed: false,
      },
    });
    const service = createReportRecoveryService({
      repository: {
        recoverTransientFailure,
        recoverInvalidOutputFailure: vi.fn(),
      },
    });

    await expect(
      service.recoverTransientFailure(context, command),
    ).resolves.toMatchObject({ ok: true });
    expect(recoverTransientFailure).toHaveBeenCalledWith({
      context,
      reportVersionId: command.reportVersionId,
      expectedStateVersion: 3,
    });
  });

  it("delegates live capability decisions to the repository", async () => {
    const recoverTransientFailure = vi.fn().mockResolvedValue({
      ok: false,
      error: {
        code: "REPORT_RECOVERY_FORBIDDEN",
        messageKey: "admin.report_recovery_forbidden",
        retryable: false,
      },
    });
    const service = createReportRecoveryService({
      repository: {
        recoverTransientFailure,
        recoverInvalidOutputFailure: vi.fn(),
      },
    });

    await expect(
      service.recoverTransientFailure({
        ...context,
        access: { ...context.access, capabilities: [] },
      }, command),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "REPORT_RECOVERY_FORBIDDEN" },
    });
    expect(recoverTransientFailure).toHaveBeenCalledTimes(1);
  });

  it("rejects malformed or mismatched command inputs before persistence", async () => {
    const recoverTransientFailure = vi.fn();
    const service = createReportRecoveryService({
      repository: {
        recoverTransientFailure,
        recoverInvalidOutputFailure: vi.fn(),
      },
    });

    await expect(
      service.recoverTransientFailure(
        { ...context, requestId: "bad request id" },
        command,
      ),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "REPORT_RECOVERY_CONFLICT" },
    });
    await expect(
      service.recoverTransientFailure(context, {
        ...command,
        expectedStateVersion: 0,
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "REPORT_RECOVERY_CONFLICT" },
    });
    await expect(
      service.recoverTransientFailure(context, {
        ...command,
        idempotencyKey: "different-key",
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "REPORT_RECOVERY_CONFLICT" },
    });
    await expect(
      service.recoverTransientFailure(context, {
        ...command,
        reasonCode: "incident_recovery",
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "REPORT_RECOVERY_CONFLICT" },
    });
    expect(recoverTransientFailure).not.toHaveBeenCalled();
  });

  it("passes an invalid-output command to its distinct transactional repository operation", async () => {
    const recoverInvalidOutputFailure = vi.fn().mockResolvedValue({
      ok: true,
      value: {
        reportVersionId: command.reportVersionId,
        stateVersion: 4,
        replayed: false,
      },
    });
    const service = createReportRecoveryService({
      repository: {
        recoverTransientFailure: vi.fn(),
        recoverInvalidOutputFailure,
      },
    });

    await expect(
      service.recoverInvalidOutputFailure(
        { ...context, reasonCode: "incident_recovery" },
        { ...command, reasonCode: "incident_recovery" },
      ),
    ).resolves.toMatchObject({ ok: true });
    expect(recoverInvalidOutputFailure).toHaveBeenCalledWith({
      context: { ...context, reasonCode: "incident_recovery" },
      reportVersionId: command.reportVersionId,
      expectedStateVersion: 3,
    });
  });
});
