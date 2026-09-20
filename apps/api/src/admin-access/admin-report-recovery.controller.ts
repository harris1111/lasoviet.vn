import { randomUUID } from "node:crypto";

import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  Inject,
  NotFoundException,
  Param,
  Post,
} from "@nestjs/common";

import {
  createAdminAccessService,
  createAdminAuditService,
  createReportRecoveryService,
} from "@lasoviet/backend";
import {
  AdminReportRecoveryCommandV1Schema,
} from "@lasoviet/contracts";
import type { Database } from "@lasoviet/database";

import { verifyInternalActorToken } from "../auth/internal-actor.guard.js";
import {
  ADMIN_ACCESS_DATABASE,
  ADMIN_ACCESS_SERVICE,
  ADMIN_ACCESS_SERVICE_SECRET,
  ADMIN_AUDIT_SERVICE,
} from "./admin-access.controller.js";

export const ADMIN_REPORT_RECOVERY_SERVICE = Symbol(
  "ADMIN_REPORT_RECOVERY_SERVICE",
);

function correlationId(value: string | undefined): string {
  return value !== undefined && /^[A-Za-z0-9._:-]{1,128}$/.test(value)
    ? value
    : randomUUID();
}

function auditTargetId(value: string): string {
  const trimmed = value.trim();
  return /^[A-Za-z0-9._:-]{1,128}$/.test(trimmed) ? trimmed : "command";
}

@Controller("admin/reports")
export class AdminReportRecoveryController {
  constructor(
    @Inject(ADMIN_ACCESS_SERVICE)
    private readonly access: ReturnType<typeof createAdminAccessService>,
    @Inject(ADMIN_REPORT_RECOVERY_SERVICE)
    private readonly recovery: ReturnType<typeof createReportRecoveryService>,
    @Inject(ADMIN_AUDIT_SERVICE)
    private readonly audit: ReturnType<typeof createAdminAuditService>,
    @Inject(ADMIN_ACCESS_SERVICE_SECRET) private readonly secret: string,
    @Inject(ADMIN_ACCESS_DATABASE) private readonly database: Database,
  ) {}

  private async authorized(
    authorization: string | undefined,
    requestedId: string | undefined,
  ) {
    const token = authorization?.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length).trim()
      : "";
    const actor = await verifyInternalActorToken(
      token,
      new TextEncoder().encode(this.secret),
      undefined,
      this.database,
    ).catch(() => undefined);
    if (actor === undefined) throw new NotFoundException();
    const access = await this.access.resolveAdminAccess(actor);
    if (!access.ok) throw new NotFoundException();
    return {
      access: access.value,
      requestId: correlationId(actor.requestId || requestedId),
      traceId: correlationId(actor.requestId),
    };
  }

  @Post(":reportVersionId/recover-transient")
  @HttpCode(200)
  async recoverTransient(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-request-id") requestId: string | undefined,
    @Param("reportVersionId") reportVersionId: string,
    @Body() body: unknown,
  ) {
    const authorized = await this.authorized(authorization, requestId);
    const bodyRecord = typeof body === "object" && body !== null && !Array.isArray(body)
      ? body
      : {};
    const command = AdminReportRecoveryCommandV1Schema.safeParse({
      ...bodyRecord,
      reportVersionId,
    });
    if (!command.success) {
      await this.audit.appendAdminAudit({
        actorId: authorized.access.actorId,
        roleAssignmentId: authorized.access.roleAssignmentId,
        capability: "admin.reports.regenerate",
        operation: "admin.report.recovery.malformed_input",
        target: {
          type: "report_version",
          id: auditTargetId(reportVersionId),
        },
        requestId: authorized.requestId,
        traceId: authorized.traceId,
        policyResult: "denied",
        redactionLevel: "redacted",
        resultSummary: {
          outcome: "denied",
          code: "REPORT_RECOVERY_CONFLICT",
        },
      });
      throw new BadRequestException({ code: "REPORT_RECOVERY_CONFLICT" });
    }
    const result = await this.recovery.recoverTransientFailure(
      {
        ...authorized,
        idempotencyKey: command.data.idempotencyKey,
        reasonCode: command.data.reasonCode,
      },
      command.data,
    );
    if (!result.ok) {
      if (result.error.code === "REPORT_RECOVERY_FORBIDDEN") {
        throw new NotFoundException();
      }
      throw new BadRequestException({ code: result.error.code });
    }
    return result.value;
  }

  @Post(":reportVersionId/recover-invalid-output")
  @HttpCode(200)
  async recoverInvalidOutput(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-request-id") requestId: string | undefined,
    @Param("reportVersionId") reportVersionId: string,
    @Body() body: unknown,
  ) {
    const authorized = await this.authorized(authorization, requestId);
    const bodyRecord = typeof body === "object" && body !== null && !Array.isArray(body)
      ? body
      : {};
    const command = AdminReportRecoveryCommandV1Schema.safeParse({
      ...bodyRecord,
      reportVersionId,
    });
    if (!command.success) {
      await this.audit.appendAdminAudit({
        actorId: authorized.access.actorId,
        roleAssignmentId: authorized.access.roleAssignmentId,
        capability: "admin.reports.regenerate",
        operation: "admin.report.recovery.invalid_output.malformed_input",
        target: {
          type: "report_version",
          id: auditTargetId(reportVersionId),
        },
        requestId: authorized.requestId,
        traceId: authorized.traceId,
        policyResult: "denied",
        redactionLevel: "redacted",
        resultSummary: {
          outcome: "denied",
          code: "REPORT_RECOVERY_CONFLICT",
        },
      });
      throw new BadRequestException({ code: "REPORT_RECOVERY_CONFLICT" });
    }
    const result = await this.recovery.recoverInvalidOutputFailure(
      {
        ...authorized,
        idempotencyKey: command.data.idempotencyKey,
        reasonCode: command.data.reasonCode,
      },
      command.data,
    );
    if (!result.ok) {
      if (result.error.code === "REPORT_RECOVERY_FORBIDDEN") {
        throw new NotFoundException();
      }
      throw new BadRequestException({ code: result.error.code });
    }
    return result.value;
  }
}
