import {
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Get,
  Body,
  Param,
  Post,
  UnauthorizedException,
} from "@nestjs/common";

import {
  createZiweiCalculationService,
  createZiweiQueryService,
} from "@lasoviet/backend";
import type { CurrentActor } from "@lasoviet/contracts";
import type { Database } from "@lasoviet/database";

import {
  ActorTokenError,
  verifyInternalActorToken,
} from "../auth/internal-actor.guard.js";

export const ZIWEI_CALCULATION_SERVICE = Symbol("ZIWEI_CALCULATION_SERVICE");
export const ZIWEI_CALCULATION_SERVICE_SECRET = Symbol(
  "ZIWEI_CALCULATION_SERVICE_SECRET",
);
export const ZIWEI_CALCULATION_DATABASE = Symbol("ZIWEI_CALCULATION_DATABASE");
export const ZIWEI_QUERY_SERVICE = Symbol("ZIWEI_QUERY_SERVICE");
export const ZIWEI_ANALYTICS_SERVICE = Symbol("ZIWEI_ANALYTICS_SERVICE");

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

@Controller("ziwei")
export class ZiweiController {
  constructor(
    @Inject(ZIWEI_CALCULATION_SERVICE)
    private readonly service: ReturnType<typeof createZiweiCalculationService>,
    @Inject(ZIWEI_CALCULATION_SERVICE_SECRET)
    private readonly secret: string,
    @Inject(ZIWEI_CALCULATION_DATABASE)
    private readonly database: Database,
    @Inject(ZIWEI_QUERY_SERVICE)
    private readonly queryService: ReturnType<typeof createZiweiQueryService>,
  ) {}

  private async actor(
    authorization: string | undefined,
  ): Promise<CurrentActor> {
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

  @Post("revisions/:revisionId/calculate")
  @HttpCode(HttpStatus.OK)
  async calculate(
    @Headers("authorization") authorization: string | undefined,
    @Param("revisionId") revisionId: string,
  ) {
    return this.service.calculate(await this.actor(authorization), revisionId);
  }

  @Get("charts/:chartId")
  async chart(
    @Headers("authorization") authorization: string | undefined,
    @Param("chartId") chartId: string,
  ) {
    return this.queryService.readChart(await this.actor(authorization), chartId);
  }

  @Get("charts/:chartId/evidence/:evidenceId")
  async evidence(
    @Headers("authorization") authorization: string | undefined,
    @Param("chartId") chartId: string,
    @Param("evidenceId") evidenceId: string,
  ) {
    return this.queryService.readEvidence(
      await this.actor(authorization),
      chartId,
      evidenceId,
    );
  }

  @Get("charts/:chartId/preview")
  async preview(
    @Headers("authorization") authorization: string | undefined,
    @Param("chartId") chartId: string,
  ) {
    return this.queryService.readPreview(await this.actor(authorization), chartId);
  }

  @Get("charts/:chartId/topics")
  async topics(
    @Headers("authorization") authorization: string | undefined,
    @Param("chartId") chartId: string,
  ) {
    return this.queryService.listTopics(await this.actor(authorization), chartId);
  }

  @Post("charts/:chartId/topics")
  @HttpCode(HttpStatus.OK)
  async selectTopic(
    @Headers("authorization") authorization: string | undefined,
    @Param("chartId") chartId: string,
    @Body() request: unknown,
  ) {
    return this.queryService.selectTopic(
      await this.actor(authorization),
      chartId,
      request,
    );
  }
}
