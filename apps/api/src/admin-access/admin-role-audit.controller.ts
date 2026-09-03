import { randomUUID } from "node:crypto";

import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Inject,
  NotFoundException,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import {
  createAdminAccessService,
  createAdminAuditService,
  createAuditQueryService,
  createRoleAssignmentService,
} from "@lasoviet/backend";
import {
  AssignAdminRoleV1Schema,
  parseAdminAuditSearchFiltersV1,
  RevokeAdminRoleV1Schema,
  type AdminAuditPageV1,
} from "@lasoviet/contracts";
import type { Database } from "@lasoviet/database";

import { verifyInternalActorToken } from "../auth/internal-actor.guard.js";
import {
  ADMIN_ACCESS_DATABASE,
  ADMIN_ACCESS_SERVICE,
  ADMIN_ACCESS_SERVICE_SECRET,
  ADMIN_AUDIT_SERVICE,
} from "./admin-access.controller.js";

export const ADMIN_ROLE_ASSIGNMENT_SERVICE = Symbol("ADMIN_ROLE_ASSIGNMENT_SERVICE");
export const ADMIN_AUDIT_QUERY_SERVICE = Symbol("ADMIN_AUDIT_QUERY_SERVICE");

function correlationId(value: string | undefined): string {
  return value !== undefined && /^[A-Za-z0-9._:-]{1,128}$/.test(value)
    ? value
    : randomUUID();
}

@Controller("admin")
export class AdminRoleAuditController {
  constructor(
    @Inject(ADMIN_ACCESS_SERVICE) private readonly access: ReturnType<typeof createAdminAccessService>,
    @Inject(ADMIN_AUDIT_SERVICE) private readonly audit: ReturnType<typeof createAdminAuditService>,
    @Inject(ADMIN_ROLE_ASSIGNMENT_SERVICE) private readonly roles: ReturnType<typeof createRoleAssignmentService>,
    @Inject(ADMIN_AUDIT_QUERY_SERVICE) private readonly audits: ReturnType<typeof createAuditQueryService>,
    @Inject(ADMIN_ACCESS_SERVICE_SECRET) private readonly secret: string,
    @Inject(ADMIN_ACCESS_DATABASE) private readonly database: Database,
  ) {}

  private async actor(authorization: string | undefined) {
    const token = authorization?.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length).trim()
      : "";
    return verifyInternalActorToken(
      token,
      new TextEncoder().encode(this.secret),
      undefined,
      this.database,
    );
  }

  private async authorized(
    authorization: string | undefined,
    requestedId: string | undefined,
  ) {
    const actor = await this.actor(authorization).catch(() => undefined);
    if (actor === undefined) throw new NotFoundException();
    const access = await this.access.resolveAdminAccess(actor);
    if (!access.ok) throw new NotFoundException();
    return { access: access.value, requestId: correlationId(actor.requestId || requestedId), traceId: correlationId(actor.requestId) };
  }

  @Post("roles")
  @HttpCode(200)
  async assign(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-request-id") requestId: string | undefined,
    @Body() body: unknown,
  ) {
    const input = AssignAdminRoleV1Schema.safeParse(body);
    if (!input.success) throw new NotFoundException();
    const context = await this.authorized(authorization, requestId);
    const result = await this.roles.assignRole(
      { ...context, idempotencyKey: input.data.idempotencyKey, reasonCode: input.data.reasonCode },
      input.data.subjectAccountId,
      input.data.role,
      input.data.expectedVersion,
    );
    if (!result.ok) {
      await this.audit.appendAdminAudit({
        actorId: context.access.actorId,
        roleAssignmentId: context.access.roleAssignmentId,
        capability: "admin.roles.manage",
        operation: "admin.role.authorization",
        target: { type: "admin_account", id: input.data.subjectAccountId },
        requestId: context.requestId,
        traceId: context.traceId,
        idempotencyKey: input.data.idempotencyKey,
        reasonCode: input.data.reasonCode,
        policyResult: "denied",
        redactionLevel: "redacted",
        resultSummary: { outcome: "denied", code: result.error.code },
      });
      throw new NotFoundException();
    }
    return result.value;
  }

  @Post("roles/:assignmentId/revoke")
  @HttpCode(200)
  async revoke(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-request-id") requestId: string | undefined,
    @Param("assignmentId") assignmentId: string,
    @Body() body: unknown,
  ) {
    const input = RevokeAdminRoleV1Schema.safeParse({ ...(body as object), assignmentId });
    if (!input.success) throw new NotFoundException();
    const context = await this.authorized(authorization, requestId);
    const result = await this.roles.revokeRole(
      { ...context, idempotencyKey: input.data.idempotencyKey, reasonCode: input.data.reasonCode },
      input.data.assignmentId,
      input.data.expectedVersion,
    );
    if (!result.ok) {
      await this.audit.appendAdminAudit({
        actorId: context.access.actorId,
        roleAssignmentId: context.access.roleAssignmentId,
        capability: "admin.roles.manage",
        operation: "admin.role.authorization",
        target: { type: "admin_role_assignment", id: input.data.assignmentId },
        requestId: context.requestId,
        traceId: context.traceId,
        idempotencyKey: input.data.idempotencyKey,
        reasonCode: input.data.reasonCode,
        policyResult: "denied",
        redactionLevel: "redacted",
        resultSummary: { outcome: "denied", code: result.error.code },
      });
      throw new NotFoundException();
    }
    return result.value;
  }

  @Get("audit")
  async search(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-request-id") requestId: string | undefined,
    @Query() query: Record<string, unknown>,
  ): Promise<AdminAuditPageV1> {
    const filters = parseAdminAuditSearchFiltersV1(query);
    if (!filters.success) throw new NotFoundException();
    const context = await this.authorized(authorization, requestId);
    const result = await this.audits.search(context.access, filters.data);
    if (!result.ok) {
      await this.audit.appendAdminAudit({
        actorId: context.access.actorId,
        roleAssignmentId: context.access.roleAssignmentId,
        capability: "admin.audit.read",
        operation: "admin.audit.read",
        target: { type: "admin_audit", id: "search" },
        requestId: context.requestId,
        traceId: context.traceId,
        policyResult: "denied",
        redactionLevel: "redacted",
        resultSummary: { outcome: "denied", code: result.error.code },
      });
      throw new NotFoundException();
    }
    await this.audit.appendAdminAudit({
      actorId: context.access.actorId,
      roleAssignmentId: context.access.roleAssignmentId,
      capability: "admin.audit.read",
      operation: "admin.audit.read",
      target: { type: "admin_audit", id: "search" },
      requestId: context.requestId,
      traceId: context.traceId,
      policyResult: "allowed",
      redactionLevel: "redacted",
      resultSummary: { outcome: "allowed", count: result.value.items.length },
    });
    return result.value;
  }
}
