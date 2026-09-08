import { randomUUID } from "node:crypto";

import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  Inject,
  NotFoundException,
  Query,
} from "@nestjs/common";

import {
  createAdminAccessService,
  createAdminOverviewService,
} from "@lasoviet/backend";
import type { AdminAccessError, AdminAuditEntry } from "@lasoviet/backend";
import {
  AdminOverviewV1Schema,
  parseAdminOverviewFiltersV1,
  type AdminOverviewV1,
} from "@lasoviet/contracts";
import type { Database } from "@lasoviet/database";

import { verifyInternalActorToken } from "../auth/internal-actor.guard.js";
import {
  ADMIN_ACCESS_DATABASE,
  ADMIN_ACCESS_SERVICE,
  ADMIN_ACCESS_SERVICE_SECRET,
  ADMIN_AUDIT_SERVICE,
} from "../admin-access/admin-access.controller.js";

export const ADMIN_OVERVIEW_SERVICE = Symbol("ADMIN_OVERVIEW_SERVICE");

function correlationId(value: string | undefined): string {
  return value !== undefined && /^[A-Za-z0-9._:-]{1,128}$/.test(value)
    ? value
    : randomUUID();
}

@Controller("admin")
export class AdminOverviewController {
  constructor(
    @Inject(ADMIN_ACCESS_SERVICE) private readonly accessService: {
      resolveAdminAccess: ReturnType<typeof createAdminAccessService>["resolveAdminAccess"];
      authorizeAdminRead: ReturnType<typeof createAdminAccessService>["authorizeAdminRead"];
      authorizeOverviewEntry: ReturnType<typeof createAdminAccessService>["authorizeOverviewEntry"];
    },
    @Inject(ADMIN_AUDIT_SERVICE) private readonly auditService: {
      appendAdminAudit: (entry: AdminAuditEntry) => Promise<string>;
    },
    @Inject(ADMIN_OVERVIEW_SERVICE)
    private readonly overviewService: ReturnType<typeof createAdminOverviewService>,
    @Inject(ADMIN_ACCESS_SERVICE_SECRET) private readonly secret: string,
    @Inject(ADMIN_ACCESS_DATABASE) private readonly database: Database,
  ) {}

  private async deny(input: {
    requestId: string;
    code: AdminAccessError;
    actorId?: string;
    roleAssignmentId?: string;
  }): Promise<never> {
    await this.auditService.appendAdminAudit({
      actorId: input.actorId ?? null,
      roleAssignmentId: input.roleAssignmentId ?? null,
      capability: "admin.overview.read",
      operation: "admin.overview.read",
      target: { type: "admin_overview", id: "overview" },
      requestId: input.requestId,
      traceId: input.requestId,
      policyResult: "denied",
      redactionLevel: "redacted",
      resultSummary: { outcome: "denied", code: input.code },
    });
    throw new NotFoundException();
  }

  private async recordFailure(
    access: { actorId: string; roleAssignmentId: string },
    requestId: string,
    capability: AdminAuditEntry["capability"],
    code: "ADMIN_FILTER_INVALID" | "ADMIN_PROJECTION_UNAVAILABLE",
  ): Promise<void> {
    await this.auditService.appendAdminAudit({
      actorId: access.actorId,
      roleAssignmentId: access.roleAssignmentId,
      capability,
      operation: "admin.overview.read",
      target: { type: "admin_overview", id: "overview" },
      requestId,
      traceId: requestId,
      policyResult: "allowed",
      redactionLevel: "redacted",
      resultSummary: { outcome: "allowed", code },
    });
  }

  @Get("overview")
  async overview(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-request-id") requestedId: string | undefined,
    @Query("page") page: string | undefined,
    @Query("pageSize") pageSize: string | undefined,
  ): Promise<AdminOverviewV1> {
    const headerRequestId = correlationId(requestedId);
    const token = authorization?.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length).trim()
      : "";
    let actor;
    try {
      actor = await verifyInternalActorToken(
        token,
        new TextEncoder().encode(this.secret),
        undefined,
        this.database,
      );
    } catch {
      return this.deny({ requestId: headerRequestId, code: "ADMIN_AUTH_REQUIRED" });
    }
    const requestId = correlationId(actor.requestId);
    const access = await this.accessService.resolveAdminAccess(actor);
    if (!access.ok) return this.deny({ requestId, code: access.error.code });
    const authorized = this.accessService.authorizeOverviewEntry(access.value);
    if (!authorized.ok) {
      return this.deny({
        requestId,
        code: authorized.error.code,
        actorId: access.value.actorId,
        roleAssignmentId: access.value.roleAssignmentId,
      });
    }
    const filters = parseAdminOverviewFiltersV1({ page, pageSize });
    if (!filters.success) {
      await this.recordFailure(
        access.value,
        requestId,
        authorized.value,
        "ADMIN_FILTER_INVALID",
      );
      throw new BadRequestException({ code: "ADMIN_FILTER_INVALID" });
    }
    const result = await this.overviewService.readOverview(
      { access: access.value, requestId, traceId: requestId },
      filters.data,
    );
    if (!result.ok) {
      await this.recordFailure(
        access.value,
        requestId,
        authorized.value,
        result.error.code,
      );
      throw new BadRequestException({ code: result.error.code });
    }
    const overview = AdminOverviewV1Schema.parse(result.value);
    await this.auditService.appendAdminAudit({
      actorId: access.value.actorId,
      roleAssignmentId: access.value.roleAssignmentId,
      capability: authorized.value,
      operation: "admin.overview.read",
      target: { type: "admin_overview", id: "overview" },
      requestId,
      traceId: requestId,
      policyResult: "allowed",
      redactionLevel: "redacted",
      resultSummary: { outcome: "allowed", count: overview.accountPage?.items.length ?? 0 },
    });
    return overview;
  }
}
