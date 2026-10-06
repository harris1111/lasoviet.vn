import {
  Controller,
  Body,
  Post,
  Query,
  HttpException,
  BadRequestException,
  Get,
  Headers,
  Inject,
  Param,
  UnauthorizedException,
} from "@nestjs/common";

import { createReportNotificationService, ReportNotificationError, resolveReportNotificationMode, type ReportQueryService } from "@lasoviet/backend";
import { ReportNotificationCommandV1Schema } from "@lasoviet/contracts";
import type {
  CurrentActor,
  ReportFailedWalletSpendViewV2,
  ReportViewV1,
  Result,
} from "@lasoviet/contracts";
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

  private noticeService() {
    return createReportNotificationService(this.database, {mode: resolveReportNotificationMode(process.env.REPORT_READY_SUBSCRIPTION_MODE)});
  }
  private noticeError(error: unknown): never {
    if (error instanceof ReportNotificationError) throw new HttpException({code: error.code},
      error.code === "REPORT_NOTICE_DISABLED" ? 503 : error.code === "REPORT_NOT_FOUND" ? 404 : 409);
    throw error;
  }
  @Get(":reportId/notification")
  async readNotification(@Headers("authorization") authorization: string | undefined,
    @Param("reportId") reportId: string, @Query() query: Record<string, unknown> = {}) {
    if (Object.keys(query).length) throw new BadRequestException({code: "REPORT_NOTICE_REQUEST_INVALID"});
    const actor = await this.actor(authorization);
    try { return {ok: true as const, value: await this.noticeService().read(actor, reportId)}; }
    catch (error) { return this.noticeError(error); }
  }
  @Post(":reportId/notification")
  async updateNotification(@Headers("authorization") authorization: string | undefined,
    @Param("reportId") reportId: string, @Body() body: unknown, @Query() query: Record<string, unknown> = {}) {
    const parsed = ReportNotificationCommandV1Schema.safeParse(body);
    if (!parsed.success || Object.keys(query).length) throw new BadRequestException({code: "REPORT_NOTICE_REQUEST_INVALID"});
    const actor = await this.actor(authorization);
    try { return {ok: true as const, value: await this.noticeService().command(actor, reportId, parsed.data)}; }
    catch (error) { return this.noticeError(error); }
  }

  @Get(":reportId")
  async read(
    @Headers("authorization") authorization: string | undefined,
    @Param("reportId") reportId: string,
  ): Promise<Result<ReportViewV1 | ReportFailedWalletSpendViewV2, "REPORT_NOT_FOUND">> {
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
