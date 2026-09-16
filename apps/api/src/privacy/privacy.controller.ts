import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
  Post,
  UnauthorizedException,
} from "@nestjs/common";

import {
  AssociateProfileRequestV1Schema,
  ConsentRequestV1Schema,
  type CurrentActor,
} from "@lasoviet/contracts";
import {
  createAccountDeletionService,
  createAnonymousRetentionService,
  createConsentService,
  type AnalyticsService,
} from "@lasoviet/backend";

import { ANALYTICS_SERVICE } from "../analytics/analytics.controller.js";
import type { Database } from "@lasoviet/database";

import {
  ActorTokenError,
  verifyInternalActorToken,
} from "../auth/internal-actor.guard.js";

export const CONSENT_SERVICE = Symbol("CONSENT_SERVICE");
export const ACCOUNT_DELETION_SERVICE = Symbol("ACCOUNT_DELETION_SERVICE");
export const ANONYMOUS_RETENTION_SERVICE = Symbol(
  "ANONYMOUS_RETENTION_SERVICE",
);
export const PRIVACY_SERVICE_SECRET = Symbol("PRIVACY_SERVICE_SECRET");
export const PRIVACY_DATABASE = Symbol("PRIVACY_DATABASE");

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

@Controller("privacy")
export class PrivacyController {
  constructor(
    @Inject(CONSENT_SERVICE)
    private readonly consentService: ReturnType<typeof createConsentService>,
    @Inject(ACCOUNT_DELETION_SERVICE)
    private readonly deletionService: ReturnType<
      typeof createAccountDeletionService
    >,
    @Inject(ANONYMOUS_RETENTION_SERVICE)
    private readonly anonymousRetentionService: ReturnType<
      typeof createAnonymousRetentionService
    >,
    @Inject(PRIVACY_SERVICE_SECRET)
    private readonly secret: string,
    @Inject(PRIVACY_DATABASE)
    private readonly database: Database,
    @Inject(ANALYTICS_SERVICE)
    private readonly analyticsService: AnalyticsService,
  ) {}

  private async actor(
    authorization: string | undefined,
    allowDeletionRecovery = false,
  ): Promise<CurrentActor> {
    try {
      return await verifyInternalActorToken(
        bearerToken(authorization),
        new TextEncoder().encode(this.secret),
        undefined,
        this.database,
        allowDeletionRecovery,
      );
    } catch (error) {
      const code =
        error instanceof ActorTokenError ? error.code : "ACTOR_TOKEN_INVALID";
      throw new UnauthorizedException({ code });
    }
  }

  @Post("consents")
  @HttpCode(HttpStatus.OK)
  async recordConsent(
    @Headers("authorization") authorization: string | undefined,
    @Body() body: unknown,
  ) {
    const request = ConsentRequestV1Schema.safeParse(body);
    if (!request.success) {
      throw new UnauthorizedException({ code: "CONSENT_VERSION_UNKNOWN" });
    }
    const result = await this.consentService.record(
      await this.actor(authorization),
      request.data.documentKey,
      request.data.documentVersion,
      request.data.purposes,
      request.data.visitorId,
    );
    if (!result.ok) {
      if (result.error.code === "PROFILE_FORBIDDEN") {
        throw new ForbiddenException({ code: "PROFILE_FORBIDDEN" });
      }
      throw new UnauthorizedException({ code: "CONSENT_VERSION_UNKNOWN" });
    }
    return result;
  }

  @Post("associate-profile")
  @HttpCode(HttpStatus.OK)
  async associateProfile(
    @Headers("authorization") authorization: string | undefined,
    @Body() body: unknown,
  ) {
    const actor = await this.actor(authorization);
    const request = AssociateProfileRequestV1Schema.safeParse(body);
    if (!request.success) {
      throw new BadRequestException({ code: "ASSOCIATE_PROFILE_INVALID" });
    }
    const owner =
      actor.kind === "account"
        ? { userId: actor.userId }
        : { anonymousActorId: actor.anonymousActorId };
    const result = await this.analyticsService.associateBirthProfile({
      visitorId: request.data.visitorId,
      birthProfileId: request.data.profileId,
      owner,
    });
    if (!result.ok) {
      if (
        result.error.code === "PROFILE_NOT_FOUND" ||
        result.error.code === "VISITOR_NOT_FOUND"
      ) {
        throw new NotFoundException({ code: result.error.code });
      }
      if (result.error.code === "PROFILE_FORBIDDEN") {
        throw new ForbiddenException({ code: result.error.code });
      }
      throw new BadRequestException({ code: result.error.code });
    }
    return { ok: true, value: undefined };
  }

  @Post("account/deletion")
  @HttpCode(HttpStatus.OK)
  async requestAccountDeletion(
    @Headers("authorization") authorization: string | undefined,
  ) {
    const actor = await this.actor(authorization);
    if (actor.kind !== "account") {
      throw new ForbiddenException({ code: "ACTOR_TOKEN_INVALID" });
    }
    return this.deletionService.request(actor.userId, actor.requestId);
  }

  @Post("account/deletion/cancel")
  @HttpCode(HttpStatus.OK)
  async cancelAccountDeletion(
    @Headers("authorization") authorization: string | undefined,
  ) {
    const actor = await this.actor(authorization, true);
    if (actor.kind !== "account") {
      throw new ForbiddenException({ code: "ACTOR_TOKEN_INVALID" });
    }
    return this.deletionService.cancel(actor.userId, actor.requestId);
  }

  @Delete("anonymous")
  @HttpCode(HttpStatus.OK)
  async deleteAnonymousData(
    @Headers("authorization") authorization: string | undefined,
  ) {
    const actor = await this.actor(authorization);
    if (actor.kind !== "anonymous") {
      throw new ForbiddenException({ code: "ACTOR_TOKEN_INVALID" });
    }
    return this.anonymousRetentionService.deleteNow(actor.anonymousActorId);
  }
}
