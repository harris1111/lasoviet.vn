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
  BIRTH_PROFILE_SERVICE,
  BIRTH_PROFILE_DATABASE,
  BIRTH_PROFILE_SERVICE_SECRET,
  BirthProfileController,
} from "./birth-profile.controller.js";

const serviceSecret = "synthetic-birth-profile-secret";
const secret = new TextEncoder().encode(serviceSecret);
const create = vi.fn().mockResolvedValue({
  ok: true,
  value: { profileId: "profile-1", revisionId: "revision-1", revisionNumber: 1 },
});

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
    { provide: BIRTH_PROFILE_SERVICE, useValue: { create, read: vi.fn(), update: vi.fn(), archive: vi.fn() } },
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

  it("uses the verified actor and rejects a browser-provided owner id", async () => {
    create.mockClear();
    const token = await actorToken();
    const response = await app.getHttpAdapter().getInstance().inject({
      method: "POST",
      url: "/birth-profiles",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        version: 1,
        calendar: { kind: "solar", date: "1990-01-01" },
        time: { precision: "exact_minute", localTime: "09:30" },
        timezone: { offsetMinutes: 420 },
        consentVersion: "2026-09-01",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "account", userId: "verified-account" }),
      expect.any(Object),
    );

    const forbiddenOwner = await app.getHttpAdapter().getInstance().inject({
      method: "POST",
      url: "/birth-profiles",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        version: 1,
        calendar: { kind: "solar", date: "1990-01-01" },
        time: { precision: "exact_minute", localTime: "09:30" },
        timezone: { offsetMinutes: 420 },
        consentVersion: "2026-09-01",
        userId: "untrusted-account",
      },
    });

    expect(forbiddenOwner.statusCode).toBe(400);
    expect(create).toHaveBeenCalledTimes(1);
  });
});
