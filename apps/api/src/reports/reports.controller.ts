import {
  Controller,
  Get,
  Headers,
  Inject,
  Param,
  UnauthorizedException,
} from "@nestjs/common";

import type { ReportQueryService } from "@lasoviet/backend";
import type { CurrentActor, ReportViewV1, Result } from "@lasoviet/contracts";
import type { Database } from "@lasoviet/database";

import {
  ActorTokenError,
  verifyInternalActorToken,
} from "../auth/internal-actor.guard.js";

export const REPORT_QUERY_DATABASE = Symbol("REPORT_QUERY_DATABASE");
export const REPORT_QUERY_SERVICE = Symbol("REPORT_QUERY_SERVICE");
export const REPORT_QUERY_SERVICE_SECRET = Symbol("REPORT_QUERY_SERVICE_SECRET");

function bearerToken(authorization: string | undefined): string {
  if (authorization === undefined || !authorization.startsWith("Bearer ")) {
    throw new UnauthorizedException({ code: "ACTOR_TOKEN_INVALID" });
  }
  const token = authorization.slice("Bearer ".length).trim();
  if (token === "") {
    throw new UnauthorizedException({ code: "ACTOR_TOKEN_INVALID" });
  }
  return token;
}

@Controller("reports")
export class ReportsController {
  constructor(
    @Inject(REPORT_QUERY_SERVICE)
    private readonly service: ReportQueryService,
    @Inject(REPORT_QUERY_SERVICE_SECRET)
    private readonly secret: string,
    @Inject(REPORT_QUERY_DATABASE)
    private readonly database: Database,
  ) {}

  private async actor(authorization: string | undefined): Promise<CurrentActor> {
    try {
      return await verifyInternalActorToken(
        bearerToken(authorization),
        new TextEncoder().encode(this.secret),
        undefined,
        this.database,
      );
    } catch (error) {
      const code =
        error instanceof ActorTokenError ? error.code : "ACTOR_TOKEN_INVALID";
      throw new UnauthorizedException({ code });
    }
  }

  @Get(":reportId")
  async read(
    @Headers("authorization") authorization: string | undefined,
    @Param("reportId") reportId: string,
  ): Promise<Result<ReportViewV1, "REPORT_NOT_FOUND">> {
    const actor = await this.actor(authorization);
    const result = await this.service.getReport(actor, reportId);
    if (!result.ok) {
      return {
        ok: false,
        error: {
          code: "REPORT_NOT_FOUND",
          messageKey: "reports.report_not_found",
          retryable: false,
        },
      };
    }
    return result;
  }
}
