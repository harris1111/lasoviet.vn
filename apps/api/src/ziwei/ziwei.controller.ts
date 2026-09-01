import {
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  UnauthorizedException,
} from "@nestjs/common";

import { createZiweiCalculationService } from "@lasoviet/backend";
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
}
