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
  createAdminBusinessMetricsService,
} from "@lasoviet/backend";
import type { AdminAuditEntry } from "@lasoviet/backend";
import {
  AdminBusinessMetricsV1Schema,
  type AdminBusinessMetricsV1,
} from "@lasoviet/contracts";
import type { Database } from "@lasoviet/database";

import { verifyInternalActorToken } from "../auth/internal-actor.guard.js";
import {
  ADMIN_ACCESS_DATABASE,
  ADMIN_ACCESS_SERVICE,
  ADMIN_ACCESS_SERVICE_SECRET,
  ADMIN_AUDIT_SERVICE,
} from "../admin-access/admin-access.controller.js";
import {
  auditBusinessMetricsDenial,
  auditBusinessMetricsResult,
  correlationId,
  resolveTargetId,
} from "./admin-business-metrics-audit.js";

export const ADMIN_BUSINESS_METRICS_SERVICE = Symbol(
  "ADMIN_BUSINESS_METRICS_SERVICE",
);

@Controller("admin")
export class AdminBusinessMetricsController {
  constructor(
    @Inject(ADMIN_ACCESS_SERVICE)
    private readonly accessService: {
      resolveAdminAccess: ReturnType<
        typeof createAdminAccessService
      >["resolveAdminAccess"];
      authorizeAdminRead: ReturnType<
        typeof createAdminAccessService
      >["authorizeAdminRead"];
    },
    @Inject(ADMIN_AUDIT_SERVICE)
    private readonly auditService: {
      appendAdminAudit: (entry: AdminAuditEntry) => Promise<string>;
    },
    @Inject(ADMIN_BUSINESS_METRICS_SERVICE)
    private readonly metricsService: ReturnType<
      typeof createAdminBusinessMetricsService
    >,
    @Inject(ADMIN_ACCESS_SERVICE_SECRET) private readonly secret: string,
    @Inject(ADMIN_ACCESS_DATABASE) private readonly database: Database,
  ) {}

  @Get("business-metrics")
  async businessMetrics(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-request-id") requestedId: string | undefined,
    @Query("from") from: string | undefined,
    @Query("to") to: string | undefined,
  ): Promise<AdminBusinessMetricsV1> {
    const targetId = resolveTargetId(from, to);
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
      await auditBusinessMetricsDenial(this.auditService, {
        requestId: headerRequestId,
        code: "ADMIN_AUTH_REQUIRED",
        targetId,
      });
      throw new NotFoundException();
    }

    const requestId = correlationId(actor.requestId);
    const access = await this.accessService.resolveAdminAccess(actor);
    if (!access.ok) {
      await auditBusinessMetricsDenial(this.auditService, {
        requestId,
        code: access.error.code,
        targetId,
      });
      throw new NotFoundException();
    }

    const authorized = this.accessService.authorizeAdminRead(
      access.value,
      "admin.commerce.read",
      { type: "admin_business_metrics", id: targetId },
    );
    if (!authorized.ok) {
      await auditBusinessMetricsDenial(this.auditService, {
        requestId,
        code: authorized.error.code,
        actorId: access.value.actorId,
        roleAssignmentId: access.value.roleAssignmentId,
        targetId,
      });
      throw new NotFoundException();
    }

    const result = await this.metricsService.readBusinessMetrics(
      { access: access.value, requestId, traceId: requestId },
      { from, to },
    );

    if (!result.ok) {
      await auditBusinessMetricsResult(this.auditService, {
        actorId: access.value.actorId,
        roleAssignmentId: access.value.roleAssignmentId,
        targetId,
        requestId,
        resultSummary: { outcome: "allowed", code: result.error.code },
      });
      throw new BadRequestException({ code: result.error.code });
    }

    const metrics = AdminBusinessMetricsV1Schema.parse(result.value);
    const finalTargetId = `${metrics.fromDate}:${metrics.toDate}`;

    await auditBusinessMetricsResult(this.auditService, {
      actorId: access.value.actorId,
      roleAssignmentId: access.value.roleAssignmentId,
      targetId: finalTargetId,
      requestId,
      resultSummary: {
        outcome: "allowed",
        count: metrics.days.length,
      },
    });

    return metrics;
  }
}
