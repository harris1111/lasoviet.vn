import {
  Controller,
  Get,
  Headers,
  HttpException,
  Inject,
  Param,
} from "@nestjs/common";

import type {
  AssetDownload,
  AssetDownloadError,
} from "@lasoviet/backend";
import type { CurrentActor } from "@lasoviet/contracts";
import type { Database } from "@lasoviet/database";

import {
  ActorTokenError,
  verifyInternalActorToken,
} from "../auth/internal-actor.guard.js";

export const ASSET_DOWNLOAD_SERVICE = Symbol("ASSET_DOWNLOAD_SERVICE");
export const ASSET_DOWNLOAD_SERVICE_SECRET = Symbol(
  "ASSET_DOWNLOAD_SERVICE_SECRET",
);
export const ASSET_DOWNLOAD_DATABASE = Symbol("ASSET_DOWNLOAD_DATABASE");

export type AssetDownloadService = {
  createDownload(
    actor: CurrentActor,
    assetId: string,
  ): Promise<
    | { ok: true; value: AssetDownload }
    | { ok: false; error: { code: AssetDownloadError; retryable: boolean } }
  >;
};

function bearerToken(authorization: string | undefined): string {
  if (authorization === undefined || !authorization.startsWith("Bearer ")) {
    throw new HttpException({ code: "ASSET_FORBIDDEN" }, 404);
  }
  const token = authorization.slice("Bearer ".length).trim();
  if (!token) {
    throw new HttpException({ code: "ASSET_FORBIDDEN" }, 404);
  }
  return token;
}

@Controller("assets")
export class AssetsController {
  constructor(
    @Inject(ASSET_DOWNLOAD_SERVICE)
    private readonly service: AssetDownloadService,
    @Inject(ASSET_DOWNLOAD_SERVICE_SECRET)
    private readonly secret: string,
    @Inject(ASSET_DOWNLOAD_DATABASE)
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
      if (error instanceof HttpException) throw error;
      const code = error instanceof ActorTokenError ? error.code : "ACTOR_TOKEN_INVALID";
      void code;
      throw new HttpException({ code: "ASSET_FORBIDDEN" }, 404);
    }
  }

  @Get(":assetId/download")
  async download(
    @Headers("authorization") authorization: string | undefined,
    @Param("assetId") assetId: string,
  ): Promise<AssetDownload> {
    const actor = await this.actor(authorization);
    const result = await this.service.createDownload(actor, assetId);
    if (result.ok) {
      return result.value;
    }
    if (result.error.code === "ASSET_FORBIDDEN") {
      throw new HttpException({ code: "ASSET_FORBIDDEN" }, 404);
    }
    throw new HttpException(
      { code: result.error.code === "SIGNED_URL_EXPIRED" ? "SIGNED_URL_EXPIRED" : "ASSET_UNAVAILABLE" },
      503,
    );
  }
}
