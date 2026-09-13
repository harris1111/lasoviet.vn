import {
  Controller,
  Get,
  Headers,
  Inject,
  NotFoundException,
  PayloadTooLargeException,
  UnauthorizedException,
} from "@nestjs/common";

import type { AccountCenterService } from "@lasoviet/backend";
import {
  AccountExportProjectionV1Schema,
  AccountOverviewProjectionV1Schema,
  AccountPrivacyProjectionV1Schema,
  AccountProfilesProjectionV1Schema,
  type CurrentActor,
} from "@lasoviet/contracts";
import { authUsers, type Database } from "@lasoviet/database";
import { eq } from "drizzle-orm";

import {
  ActorTokenError,
  verifyInternalActorToken,
} from "../auth/internal-actor.guard.js";

export const ACCOUNT_CENTER_SERVICE = Symbol("ACCOUNT_CENTER_SERVICE");
export const ACCOUNT_CENTER_SERVICE_SECRET = Symbol(
  "ACCOUNT_CENTER_SERVICE_SECRET",
);
export const ACCOUNT_CENTER_DATABASE = Symbol("ACCOUNT_CENTER_DATABASE");

function bearerToken(authorization: string | undefined): string {
  if (authorization === undefined || !authorization.startsWith("Bearer ")) {
    throw new UnauthorizedException({ code: "ACCOUNT_AUTH_REQUIRED" });
  }
  const token = authorization.slice("Bearer ".length).trim();
  if (token === "") {
    throw new UnauthorizedException({ code: "ACCOUNT_AUTH_REQUIRED" });
  }
  return token;
}

@Controller("account-center")
export class AccountCenterController {
  constructor(
    @Inject(ACCOUNT_CENTER_SERVICE)
    private readonly service: AccountCenterService,
    @Inject(ACCOUNT_CENTER_SERVICE_SECRET)
    private readonly secret: string,
    @Inject(ACCOUNT_CENTER_DATABASE)
    private readonly database: Database,
  ) {}

  private async actor(
    authorization: string | undefined,
    allowDeletionRecovery = false,
  ): Promise<Extract<CurrentActor, { kind: "account" }>> {
    try {
      const currentActor = await verifyInternalActorToken(
        bearerToken(authorization),
        new TextEncoder().encode(this.secret),
        undefined,
        this.database,
        allowDeletionRecovery,
      );
      if (currentActor.kind !== "account") {
        throw new UnauthorizedException({ code: "ACCOUNT_AUTH_REQUIRED" });
      }
      const [user] = await this.database
        .select({ emailVerified: authUsers.emailVerified })
        .from(authUsers)
        .where(eq(authUsers.id, currentActor.userId))
        .limit(1);
      if (!user || !user.emailVerified) {
        throw new UnauthorizedException({ code: "ACCOUNT_AUTH_REQUIRED" });
      }
      return currentActor;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      const code =
        error instanceof ActorTokenError
          ? "ACCOUNT_AUTH_REQUIRED"
          : "ACCOUNT_AUTH_REQUIRED";
      throw new UnauthorizedException({ code });
    }
  }

  @Get("overview")
  async getOverview(
    @Headers("authorization") authorization: string | undefined,
  ) {
    const actor = await this.actor(authorization);
    const result = await this.service.getOverview(actor.userId);
    if (!result.ok) {
      throw new NotFoundException({ code: result.error.code });
    }
    return AccountOverviewProjectionV1Schema.parse(result.value);
  }

  @Get("profiles")
  async getProfiles(
    @Headers("authorization") authorization: string | undefined,
  ) {
    const actor = await this.actor(authorization);
    const result = await this.service.getProfiles(actor.userId);
    if (!result.ok) {
      throw new NotFoundException({ code: result.error.code });
    }
    return AccountProfilesProjectionV1Schema.parse(result.value);
  }

  @Get("privacy")
  async getPrivacy(
    @Headers("authorization") authorization: string | undefined,
  ) {
    const actor = await this.actor(authorization, true);
    const result = await this.service.getPrivacy(actor.userId);
    if (!result.ok) {
      throw new NotFoundException({ code: result.error.code });
    }
    return AccountPrivacyProjectionV1Schema.parse(result.value);
  }

  @Get("export")
  async getExport(
    @Headers("authorization") authorization: string | undefined,
  ) {
    const actor = await this.actor(authorization);
    const result = await this.service.getExport(actor.userId);
    if (!result.ok) {
      if (result.error.code === "ACCOUNT_EXPORT_LIMIT_EXCEEDED") {
        throw new PayloadTooLargeException({ code: result.error.code });
      }
      throw new NotFoundException({ code: result.error.code });
    }
    return AccountExportProjectionV1Schema.parse(result.value);
  }
}
