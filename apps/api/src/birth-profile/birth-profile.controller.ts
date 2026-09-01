import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Put,
  UnauthorizedException,
  Body,
} from "@nestjs/common";

import {
  BirthProfileRequestV1Schema,
  type CurrentActor,
} from "@lasoviet/contracts";
import { createBirthProfileService } from "@lasoviet/backend";

import {
  ActorTokenError,
  verifyInternalActorToken,
} from "../auth/internal-actor.guard.js";

export const BIRTH_PROFILE_SERVICE = Symbol("BIRTH_PROFILE_SERVICE");
export const BIRTH_PROFILE_SERVICE_SECRET = Symbol(
  "BIRTH_PROFILE_SERVICE_SECRET",
);

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

@Controller("birth-profiles")
export class BirthProfileController {
  constructor(
    @Inject(BIRTH_PROFILE_SERVICE)
    private readonly service: ReturnType<typeof createBirthProfileService>,
    @Inject(BIRTH_PROFILE_SERVICE_SECRET)
    private readonly secret: string,
  ) {}

  private async actor(
    authorization: string | undefined,
  ): Promise<CurrentActor> {
    try {
      return await verifyInternalActorToken(
        bearerToken(authorization),
        new TextEncoder().encode(this.secret),
      );
    } catch (error) {
      const code =
        error instanceof ActorTokenError ? error.code : "ACTOR_TOKEN_INVALID";
      throw new UnauthorizedException({ code });
    }
  }

  private request(body: unknown) {
    const parsed = BirthProfileRequestV1Schema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({ code: "BIRTH_PROFILE_INVALID" });
    }
    return parsed.data;
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  async create(
    @Headers("authorization") authorization: string | undefined,
    @Body() body: unknown,
  ) {
    return this.service.create(await this.actor(authorization), this.request(body));
  }

  @Get(":profileId")
  async read(
    @Headers("authorization") authorization: string | undefined,
    @Param("profileId") profileId: string,
  ) {
    return this.service.read(await this.actor(authorization), profileId);
  }

  @Put(":profileId")
  @HttpCode(HttpStatus.OK)
  async update(
    @Headers("authorization") authorization: string | undefined,
    @Param("profileId") profileId: string,
    @Body() body: unknown,
  ) {
    return this.service.update(
      await this.actor(authorization),
      profileId,
      this.request(body),
    );
  }

  @Delete(":profileId")
  @HttpCode(HttpStatus.OK)
  async archive(
    @Headers("authorization") authorization: string | undefined,
    @Param("profileId") profileId: string,
  ) {
    return this.service.archive(await this.actor(authorization), profileId);
  }
}
