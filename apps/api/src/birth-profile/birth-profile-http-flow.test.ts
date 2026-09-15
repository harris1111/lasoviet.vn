import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { SignJWT } from "jose";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  INTERNAL_ACTOR_AUDIENCE,
  INTERNAL_ACTOR_ISSUER,
} from "@lasoviet/contracts";

import {
  BIRTH_PROFILE_DATABASE,
  BIRTH_PROFILE_SERVICE,
  BIRTH_PROFILE_SERVICE_SECRET,
  BirthProfileController,
} from "./birth-profile.controller.js";

const serviceSecret = "synthetic-birth-profile-secret";
const secret = new TextEncoder().encode(serviceSecret);
const createWithContext = vi.fn().mockResolvedValue({
  ok: true,
  value: {
    profileId: "profile-1",
    revisionId: "revision-1",
    revisionNumber: 1,
  },
});
const update = vi.fn().mockResolvedValue({
  ok: true,
  value: {
    profileId: "profile-1",
    revisionId: "revision-2",
    revisionNumber: 2,
  },
});
const profile = {
  version: 1,
  calendar: { kind: "solar", date: "1990-01-01" },
  time: { precision: "exact_minute", localTime: "09:30" },
  timezone: { offsetMinutes: 420 },
  consentVersion: "2026-09-01",
};

async function actorToken(): Promise<string> {
  return new SignJWT({
    version: 1,
    kind: "account",
    sid: "session-1",
    requestId: "request-1",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(INTERNAL_ACTOR_ISSUER)
    .setAudience(INTERNAL_ACTOR_AUDIENCE)
    .setSubject("verified-account")
    .setIssuedAt()
    .setExpirationTime("60s")
    .sign(secret);
}

class BirthProfileHttpTestModule {}

Module({
  controllers: [BirthProfileController],
  providers: [
    {
      provide: BIRTH_PROFILE_SERVICE,
      useValue: {
        createWithContext,
        read: vi.fn(),
        update,
        archive: vi.fn(),
      },
    },
    { provide: BIRTH_PROFILE_SERVICE_SECRET, useValue: serviceSecret },
    { provide: BIRTH_PROFILE_DATABASE, useValue: undefined },
  ],
})(BirthProfileHttpTestModule);

describe("birth profile private HTTP flow", () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await NestFactory.create<NestFastifyApplication>(
      BirthProfileHttpTestModule,
      new FastifyAdapter(),
      { logger: false },
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("keeps legacy create input and response envelope while using the verified actor", async () => {
    createWithContext.mockClear();
    const response = await app.getHttpAdapter().getInstance().inject({
      method: "POST",
      url: "/birth-profiles",
      headers: { authorization: `Bearer ${await actorToken()}` },
      payload: profile,
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      ok: true,
      value: {
        profileId: "profile-1",
        revisionId: "revision-1",
        revisionNumber: 1,
      },
    });
    expect(createWithContext).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "account", userId: "verified-account" }),
      profile,
      undefined,
    );
  });

  it("passes validated wrapper profile and reading context to createWithContext", async () => {
    createWithContext.mockClear();
    const readingContext = {
      version: 1,
      lifeStage: "early_career",
      topConcern: "career",
    };
    const response = await app.getHttpAdapter().getInstance().inject({
      method: "POST",
      url: "/birth-profiles",
      headers: { authorization: `Bearer ${await actorToken()}` },
      payload: { profile, readingContext },
    });

    expect(response.statusCode).toBe(200);
    expect(createWithContext).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "account", userId: "verified-account" }),
      profile,
      readingContext,
    );
  });

  it("rejects browser owner identifiers and unknown fields before the service", async () => {
    createWithContext.mockClear();
    const authorization = `Bearer ${await actorToken()}`;
    const ownerResponse = await app.getHttpAdapter().getInstance().inject({
      method: "POST",
      url: "/birth-profiles",
      headers: { authorization },
      payload: { ...profile, userId: "untrusted-account" },
    });
    const unknownResponse = await app.getHttpAdapter().getInstance().inject({
      method: "POST",
      url: "/birth-profiles",
      headers: { authorization },
      payload: { profile: { ...profile, unexpected: true } },
    });

    expect(ownerResponse.statusCode).toBe(400);
    expect(unknownResponse.statusCode).toBe(400);
    expect(JSON.parse(ownerResponse.body)).toEqual({
      code: "BIRTH_PROFILE_INVALID",
    });
    expect(createWithContext).not.toHaveBeenCalled();
  });

  it("rejects malformed create input without a token before validation", async () => {
    createWithContext.mockClear();
    const response = await app.getHttpAdapter().getInstance().inject({
      method: "POST",
      url: "/birth-profiles",
      payload: { invalid: true },
    });

    expect(response.statusCode).toBe(401);
    expect(JSON.parse(response.body)).toEqual({
      code: "ACTOR_TOKEN_INVALID",
    });
    expect(createWithContext).not.toHaveBeenCalled();
  });

  it("keeps PUT legacy-only", async () => {
    update.mockClear();
    const response = await app.getHttpAdapter().getInstance().inject({
      method: "PUT",
      url: "/birth-profiles/profile-1",
      headers: { authorization: `Bearer ${await actorToken()}` },
      payload: {
        profile,
        readingContext: { version: 1, topConcern: "career" },
      },
    });

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toEqual({
      code: "BIRTH_PROFILE_INVALID",
    });
    expect(update).not.toHaveBeenCalled();
  });
});
