import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  Post,
  Put,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";

import {
  ClearReadingContextRequestV1Schema,
  SetReadingContextRequestV1Schema,
  type CurrentActor,
} from "@lasoviet/contracts";
import type { ReadingContextService } from "@lasoviet/backend";
import type { Database } from "@lasoviet/database";

import {
  ActorTokenError,
  verifyInternalActorToken,
} from "../auth/internal-actor.guard.js";

export const READING_CONTEXT_SERVICE = Symbol("READING_CONTEXT_SERVICE");
export const READING_CONTEXT_SERVICE_SECRET = Symbol(
  "READING_CONTEXT_SERVICE_SECRET",
);
export const READING_CONTEXT_DATABASE = Symbol("READING_CONTEXT_DATABASE");

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

@Controller("birth-profiles/:profileId/reading-context")
export class ReadingContextController {
  constructor(
    @Inject(READING_CONTEXT_SERVICE)
    private readonly service: ReadingContextService,
    @Inject(READING_CONTEXT_SERVICE_SECRET)
    private readonly secret: string,
    @Inject(READING_CONTEXT_DATABASE)
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

  private result(response: Awaited<ReturnType<ReadingContextService["getCurrentContext"]>>) {
    if (response.ok) {
      return response;
    }

    switch (response.error.code) {
      case "READING_CONTEXT_INVALID":
        throw new BadRequestException({ code: response.error.code });
      case "PROFILE_NOT_FOUND":
        throw new NotFoundException({ code: response.error.code });
      case "READING_CONTEXT_CONFLICT":
      case "IDEMPOTENCY_KEY_REUSED":
        throw new ConflictException({ code: response.error.code });
      case "READING_CONTEXT_UNAVAILABLE":
        throw new ServiceUnavailableException({ code: response.error.code });
    }
  }

  @Get()
  async getCurrent(
    @Headers("authorization") authorization: string | undefined,
    @Param("profileId") profileId: string,
  ) {
    return this.result(
      await this.service.getCurrentContext(
        await this.actor(authorization),
        profileId,
      ),
    );
  }

  @Put()
  @HttpCode(HttpStatus.OK)
  async set(
    @Headers("authorization") authorization: string | undefined,
    @Param("profileId") profileId: string,
    @Body() body: unknown,
  ) {
    const actor = await this.actor(authorization);
    const parsed = SetReadingContextRequestV1Schema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({ code: "READING_CONTEXT_INVALID" });
    }
    return this.result(
      await this.service.setContext(
        actor,
        profileId,
        parsed.data,
      ),
    );
  }

  @Post("clear")
  @HttpCode(HttpStatus.OK)
  async clear(
    @Headers("authorization") authorization: string | undefined,
    @Param("profileId") profileId: string,
    @Body() body: unknown,
  ) {
    const actor = await this.actor(authorization);
    const parsed = ClearReadingContextRequestV1Schema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({ code: "READING_CONTEXT_INVALID" });
    }
    return this.result(
      await this.service.clearContext(
        actor,
        profileId,
        parsed.data,
      ),
    );
  }
}
