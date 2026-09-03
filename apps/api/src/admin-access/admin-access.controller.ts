import { randomUUID } from "node:crypto";

import {
  Controller,
  Get,
  Headers,
  HttpCode,
  Inject,
  NotFoundException,
  Post,
} from "@nestjs/common";

import {
  createAdminAccessService,
  createAdminAuditService,
} from "@lasoviet/backend";
import type { AdminAccessError, AdminAuditEntry } from "@lasoviet/backend";
import type { Database } from "@lasoviet/database";

import { verifyInternalActorToken } from "../auth/internal-actor.guard.js";
import { verifyAdminPreflightAuditToken } from "./admin-preflight-audit.guard.js";

export const ADMIN_ACCESS_SERVICE = Symbol("ADMIN_ACCESS_SERVICE");
export const ADMIN_AUDIT_SERVICE = Symbol("ADMIN_AUDIT_SERVICE");
export const ADMIN_ACCESS_SERVICE_SECRET = Symbol("ADMIN_ACCESS_SERVICE_SECRET");
export const ADMIN_ACCESS_DATABASE = Symbol("ADMIN_ACCESS_DATABASE");

function bearerToken(authorization: string | undefined): string {
  if (authorization === undefined || !authorization.startsWith("Bearer ")) {
    throw new NotFoundException();
  }
  const token = authorization.slice("Bearer ".length).trim();
  if (token === "") throw new NotFoundException();
  return token;
}

function safeCorrelationId(value: string | undefined): string {
  return value !== undefined && /^[A-Za-z0-9._:-]{1,128}$/.test(value)
    ? value
    : randomUUID();
}

@Controller("admin")
export class AdminAccessController {
  constructor(
    @Inject(ADMIN_ACCESS_SERVICE)
    private readonly accessService: ReturnType<typeof createAdminAccessService>,
    @Inject(ADMIN_AUDIT_SERVICE)
    private readonly auditService: ReturnType<typeof createAdminAuditService>,
    @Inject(ADMIN_ACCESS_SERVICE_SECRET) private readonly secret: string,
    @Inject(ADMIN_ACCESS_DATABASE) private readonly database: Database,
  ) {}

  private async actor(authorization: string | undefined) {
    return verifyInternalActorToken(
      bearerToken(authorization),
      new TextEncoder().encode(this.secret),
      undefined,
      this.database,
    );
  }

  private async recordAudit(entry: AdminAuditEntry): Promise<void> {
    await this.auditService.appendAdminAudit(entry);
  }

  private async deny(input: {
    requestId: string;
    traceId: string;
    code: AdminAccessError;
    actorId?: string;
    roleAssignmentId?: string;
  }): Promise<never> {
    await this.recordAudit({
      actorId: input.actorId ?? null,
      roleAssignmentId: input.roleAssignmentId ?? null,
      capability: "admin.overview.read",
      operation: "admin.access.read",
      target: { type: "admin_overview", id: "overview" },
      requestId: input.requestId,
      traceId: input.traceId,
      policyResult: "denied",
      redactionLevel: "redacted",
      resultSummary: { outcome: "denied", code: input.code },
    });
    throw new NotFoundException();
  }

  @Get("access")
  async access(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-request-id") requestedId: string | undefined,
  ) {
    const requestId = safeCorrelationId(requestedId);
    let actor;
    try {
      actor = await this.actor(authorization);
    } catch {
      return this.deny({
        requestId,
        traceId: requestId,
        code: "ADMIN_AUTH_REQUIRED",
      });
    }
    const correlationId = safeCorrelationId(actor.requestId);
    const access = await this.accessService.resolveAdminAccess(actor);
    if (!access.ok) {
      return this.deny({
        requestId: correlationId,
        traceId: correlationId,
        code: access.error.code,
        actorId: actor.kind === "account" ? actor.userId : undefined,
      });
    }
    const authorized = this.accessService.authorizeAdminRead(
      access.value,
      "admin.overview.read",
      { type: "admin_overview", id: "overview" },
    );
    if (!authorized.ok) {
      return this.deny({
        requestId: correlationId,
        traceId: correlationId,
        code: authorized.error.code,
        actorId: access.value.actorId,
        roleAssignmentId: access.value.roleAssignmentId,
      });
    }
    await this.recordAudit({
      actorId: access.value.actorId,
      roleAssignmentId: access.value.roleAssignmentId,
      capability: "admin.overview.read",
      operation: "admin.access.read",
      target: { type: "admin_overview", id: "overview" },
      requestId: correlationId,
      traceId: correlationId,
      policyResult: "allowed",
      redactionLevel: "redacted",
      resultSummary: { role: access.value.role, outcome: "allowed" },
    });
    return { role: access.value.role };
  }

  @Post("access/preflight-denial")
  @HttpCode(204)
  async preflightDenial(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-request-id") requestedId: string | undefined,
  ): Promise<void> {
    const requestId = safeCorrelationId(requestedId);
    try {
      await verifyAdminPreflightAuditToken(
        bearerToken(authorization),
        new TextEncoder().encode(this.secret),
      );
    } catch {
      throw new NotFoundException();
    }
    await this.recordAudit({
      actorId: null,
      roleAssignmentId: null,
      capability: "admin.overview.read",
      operation: "admin.access.preflight_denied",
      target: { type: "admin_overview", id: "overview" },
      requestId,
      traceId: requestId,
      policyResult: "denied",
      redactionLevel: "redacted",
      resultSummary: { outcome: "denied", code: "ADMIN_AUTH_REQUIRED" },
    });
  }
}
