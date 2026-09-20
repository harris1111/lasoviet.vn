import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { SignJWT } from "jose";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import {
  INTERNAL_ACTOR_AUDIENCE,
  INTERNAL_ACTOR_ISSUER,
} from "@lasoviet/contracts";

import {
  ADMIN_ACCESS_DATABASE,
  ADMIN_ACCESS_SERVICE,
  ADMIN_ACCESS_SERVICE_SECRET,
  ADMIN_AUDIT_SERVICE,
} from "./admin-access.controller.js";
import {
  ADMIN_REPORT_RECOVERY_SERVICE,
  AdminReportRecoveryController,
} from "./admin-report-recovery.controller.js";

const serviceSecret = "synthetic-admin-report-recovery-secret";
const secret = new TextEncoder().encode(serviceSecret);
const resolveAdminAccess = vi.fn();
const recoverTransientFailure = vi.fn();
const recoverInvalidOutputFailure = vi.fn();
const appendAdminAudit = vi.fn();

async function actorToken(): Promise<string> {
  return new SignJWT({
    version: 1,
    kind: "account",
    sid: "session-1",
    requestId: "actor-request-1",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(INTERNAL_ACTOR_ISSUER)
    .setAudience(INTERNAL_ACTOR_AUDIENCE)
    .setSubject("admin-1")
    .setIssuedAt()
    .setExpirationTime("60s")
    .sign(secret);
}

class AdminReportRecoveryHttpTestModule {}

Module({
  controllers: [AdminReportRecoveryController],
  providers: [
    { provide: ADMIN_ACCESS_SERVICE, useValue: { resolveAdminAccess } },
    {
      provide: ADMIN_REPORT_RECOVERY_SERVICE,
      useValue: { recoverTransientFailure, recoverInvalidOutputFailure },
    },
    { provide: ADMIN_AUDIT_SERVICE, useValue: { appendAdminAudit } },
    { provide: ADMIN_ACCESS_SERVICE_SECRET, useValue: serviceSecret },
    { provide: ADMIN_ACCESS_DATABASE, useValue: undefined },
  ],
})(AdminReportRecoveryHttpTestModule);

describe("AdminReportRecoveryController HTTP boundary", () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await NestFactory.create<NestFastifyApplication>(
      AdminReportRecoveryHttpTestModule,
      new FastifyAdapter(),
      { logger: false },
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    resolveAdminAccess.mockReset();
    recoverTransientFailure.mockReset();
    recoverInvalidOutputFailure.mockReset();
    appendAdminAudit.mockReset();
    appendAdminAudit.mockResolvedValue("audit-1");
    resolveAdminAccess.mockResolvedValue({
      ok: true,
      value: {
        actorId: "admin-1",
        roleAssignmentId: "assignment-1",
        role: "super_admin",
        capabilities: ["admin.reports.regenerate"],
      },
    });
  });

  function request(
    body: Record<string, unknown>,
    authorization?: string,
    operation = "recover-transient",
  ) {
    return app.getHttpAdapter().getInstance().inject({
      method: "POST",
      url: `/admin/reports/00000000-0000-0000-0000-000000000001/${operation}`,
      headers: authorization === undefined ? {} : { authorization },
      payload: body,
    });
  }

  it("hides invalid actor and admin access failures", async () => {
    expect((await request({
      expectedStateVersion: 3,
      idempotencyKey: "recovery-1",
      reasonCode: "provider_transient_failure",
    })).statusCode).toBe(404);

    resolveAdminAccess.mockResolvedValue({
      ok: false,
      error: {
        code: "ADMIN_FORBIDDEN",
        messageKey: "admin.admin_forbidden",
        retryable: false,
      },
    });
    expect((await request({
      expectedStateVersion: 3,
      idempotencyKey: "recovery-1",
      reasonCode: "provider_transient_failure",
    }, `Bearer ${await actorToken()}`)).statusCode).toBe(404);
    expect(recoverTransientFailure).not.toHaveBeenCalled();
  });

  it("maps malformed input to 400 REPORT_RECOVERY_CONFLICT", async () => {
    const response = await request({
      expectedStateVersion: 0,
      idempotencyKey: " ",
      reasonCode: "unsupported",
      extra: true,
    }, `Bearer ${await actorToken()}`);

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toMatchObject({
      code: "REPORT_RECOVERY_CONFLICT",
    });
    expect(appendAdminAudit).toHaveBeenCalledWith({
      actorId: "admin-1",
      roleAssignmentId: "assignment-1",
      capability: "admin.reports.regenerate",
      operation: "admin.report.recovery.malformed_input",
      target: {
        type: "report_version",
        id: "00000000-0000-0000-0000-000000000001",
      },
      requestId: "actor-request-1",
      traceId: "actor-request-1",
      policyResult: "denied",
      redactionLevel: "redacted",
      resultSummary: {
        outcome: "denied",
        code: "REPORT_RECOVERY_CONFLICT",
      },
    });
    expect(recoverTransientFailure).not.toHaveBeenCalled();
  });

  it("uses the bounded command fallback for an invalid path target", async () => {
    const controller = app.get(AdminReportRecoveryController);
    await expect(
      controller.recoverTransient(
        `Bearer ${await actorToken()}`,
        undefined,
        "x".repeat(129),
        {
        expectedStateVersion: 3,
        idempotencyKey: "recovery-1",
        reasonCode: "provider_transient_failure",
        },
      ),
    ).rejects.toMatchObject({
      response: { code: "REPORT_RECOVERY_CONFLICT" },
    });

    expect(appendAdminAudit).toHaveBeenCalledWith(expect.objectContaining({
      target: { type: "report_version", id: "command" },
    }));
  });

  it("passes trusted access and correlation context and returns strict success", async () => {
    recoverTransientFailure.mockResolvedValue({
      ok: true,
      value: {
        reportVersionId: "00000000-0000-0000-0000-000000000001",
        stateVersion: 4,
        replayed: false,
      },
    });
    const token = await actorToken();
    const response = await request({
      expectedStateVersion: 3,
      idempotencyKey: "  recovery-1  ",
      reasonCode: "incident_recovery",
    }, `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      reportVersionId: "00000000-0000-0000-0000-000000000001",
      stateVersion: 4,
      replayed: false,
    });
    expect(recoverTransientFailure).toHaveBeenCalledWith(
      {
        access: {
          actorId: "admin-1",
          roleAssignmentId: "assignment-1",
          role: "super_admin",
          capabilities: ["admin.reports.regenerate"],
        },
        requestId: "actor-request-1",
        traceId: "actor-request-1",
        idempotencyKey: "recovery-1",
        reasonCode: "incident_recovery",
      },
      {
        reportVersionId: "00000000-0000-0000-0000-000000000001",
        expectedStateVersion: 3,
        idempotencyKey: "recovery-1",
        reasonCode: "incident_recovery",
      },
    );
  });

  it("uses the distinct invalid-output recovery endpoint and service operation", async () => {
    recoverInvalidOutputFailure.mockResolvedValue({
      ok: true,
      value: {
        reportVersionId: "00000000-0000-0000-0000-000000000001",
        stateVersion: 4,
        replayed: false,
      },
    });

    const response = await request({
      expectedStateVersion: 3,
      idempotencyKey: "invalid-output-1",
      reasonCode: "incident_recovery",
    }, `Bearer ${await actorToken()}`, "recover-invalid-output");

    expect(response.statusCode).toBe(200);
    expect(recoverInvalidOutputFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: "invalid-output-1",
        reasonCode: "incident_recovery",
      }),
      expect.objectContaining({
        idempotencyKey: "invalid-output-1",
        reasonCode: "incident_recovery",
      }),
    );
    expect(recoverTransientFailure).not.toHaveBeenCalled();
  });

  it.each([
    ["REPORT_RECOVERY_FORBIDDEN", 404],
    ["REPORT_RECOVERY_CONFLICT", 400],
    ["REPORT_NOT_FOUND", 400],
    ["REPORT_VERSION_CONFLICT", 400],
    ["REPORT_TIMING_LINEAGE_INVALID", 400],
  ] as const)("maps %s to the required hidden/domain status", async (code, status) => {
    recoverTransientFailure.mockResolvedValue({
      ok: false,
      error: {
        code,
        messageKey: `admin.${code.toLowerCase()}`,
        retryable: false,
      },
    });
    const response = await request({
      expectedStateVersion: 3,
      idempotencyKey: "recovery-1",
      reasonCode: "provider_transient_failure",
    }, `Bearer ${await actorToken()}`);

    expect(response.statusCode).toBe(status);
    if (status === 400) {
      expect(JSON.parse(response.body)).toMatchObject({ code });
    }
  });
});
