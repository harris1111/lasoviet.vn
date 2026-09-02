import {
  Controller,
  Get,
  Headers,
  Inject,
  NotFoundException,
} from "@nestjs/common";

import {
  createAdminAccessService,
  createAdminAuditService,
} from "@lasoviet/backend";
import type { Database } from "@lasoviet/database";

import {
  ActorTokenError,
  verifyInternalActorToken,
} from "../auth/internal-actor.guard.js";

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
    try {
      return await verifyInternalActorToken(
        bearerToken(authorization),
        new TextEncoder().encode(this.secret),
        undefined,
        this.database,
      );
    } catch (error) {
      if (error instanceof ActorTokenError || error instanceof NotFoundException) {
        throw new NotFoundException();
      }
      throw error;
    }
  }

  @Get("access")
  async access(@Headers("authorization") authorization: string | undefined) {
    const actor = await this.actor(authorization);
    const access = await this.accessService.resolveAdminAccess(actor);
    if (!access.ok) throw new NotFoundException();
    const authorized = this.accessService.authorizeAdminRead(
      access.value,
      "admin.overview.read",
      { type: "admin_overview", id: "overview" },
    );
    if (!authorized.ok) throw new NotFoundException();
    await this.auditService.appendAdminAudit({
      actorId: access.value.actorId,
      roleAssignmentId: access.value.roleAssignmentId,
      capability: "admin.overview.read",
      operation: "admin.access.read",
      target: { type: "admin_overview", id: "overview" },
      requestId: actor.requestId,
      traceId: actor.requestId,
      policyResult: "allowed",
      redactionLevel: "redacted",
      resultSummary: { role: access.value.role },
    });
    return { role: access.value.role };
  }
}
