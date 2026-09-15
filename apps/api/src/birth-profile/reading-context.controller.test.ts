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
  READING_CONTEXT_DATABASE,
  READING_CONTEXT_SERVICE,
  READING_CONTEXT_SERVICE_SECRET,
  ReadingContextController,
} from "./reading-context.controller.js";

const serviceSecret = "synthetic-reading-context-secret";
const secret = new TextEncoder().encode(serviceSecret);
const current = {
  profileId: "profile-1",
  revisionId: null,
  revisionNumber: null,
  stateVersion: 0,
  lifeStage: null,
  topConcern: null,
  createdAt: null,
  updatedAt: null,
};
const getCurrentContext = vi.fn();
const setContext = vi.fn();
const clearContext = vi.fn();

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

class ReadingContextHttpTestModule {}

Module({
  controllers: [ReadingContextController],
  providers: [
    {
      provide: READING_CONTEXT_SERVICE,
      useValue: { getCurrentContext, setContext, clearContext },
    },
    { provide: READING_CONTEXT_SERVICE_SECRET, useValue: serviceSecret },
    { provide: READING_CONTEXT_DATABASE, useValue: undefined },
  ],
})(ReadingContextHttpTestModule);

describe("ReadingContextController HTTP boundary", () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await NestFactory.create<NestFastifyApplication>(
      ReadingContextHttpTestModule,
      new FastifyAdapter(),
      { logger: false },
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns the uninitialized context Result envelope unchanged", async () => {
    getCurrentContext.mockReset();
    getCurrentContext.mockResolvedValue({ ok: true, value: current });
    const response = await app.getHttpAdapter().getInstance().inject({
      method: "GET",
      url: "/birth-profiles/profile-1/reading-context",
      headers: { authorization: `Bearer ${await actorToken()}` },
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ ok: true, value: current });
    expect(getCurrentContext).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "account", userId: "verified-account" }),
      "profile-1",
    );
  });

  it("sets and clears context with the verified actor", async () => {
    setContext.mockReset();
    clearContext.mockReset();
    setContext.mockResolvedValue({ ok: true, value: current });
    clearContext.mockResolvedValue({ ok: true, value: current });
    const authorization = `Bearer ${await actorToken()}`;
    const setBody = {
      version: 1,
      lifeStage: "early_career",
      topConcern: "career",
      expectedStateVersion: 0,
      idempotencyKey: "set-1",
    };
    const clearBody = {
      version: 1,
      expectedStateVersion: 1,
      idempotencyKey: "clear-1",
    };

    const setResponse = await app.getHttpAdapter().getInstance().inject({
      method: "PUT",
      url: "/birth-profiles/profile-1/reading-context",
      headers: { authorization },
      payload: setBody,
    });
    const clearResponse = await app.getHttpAdapter().getInstance().inject({
      method: "POST",
      url: "/birth-profiles/profile-1/reading-context/clear",
      headers: { authorization },
      payload: clearBody,
    });

    expect(setResponse.statusCode).toBe(200);
    expect(clearResponse.statusCode).toBe(200);
    expect(setContext).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "account", userId: "verified-account" }),
      "profile-1",
      setBody,
    );
    expect(clearContext).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "account", userId: "verified-account" }),
      "profile-1",
      clearBody,
    );
  });

  it("rejects invalid mutation payloads before the service", async () => {
    setContext.mockClear();
    clearContext.mockClear();
    const authorization = `Bearer ${await actorToken()}`;
    const setResponse = await app.getHttpAdapter().getInstance().inject({
      method: "PUT",
      url: "/birth-profiles/profile-1/reading-context",
      headers: { authorization },
      payload: { version: 1, expectedStateVersion: 0, idempotencyKey: "set-1" },
    });
    const clearResponse = await app.getHttpAdapter().getInstance().inject({
      method: "POST",
      url: "/birth-profiles/profile-1/reading-context/clear",
      headers: { authorization },
      payload: { version: 1, expectedStateVersion: 0, idempotencyKey: "clear-1" },
    });

    expect(setResponse.statusCode).toBe(400);
    expect(clearResponse.statusCode).toBe(400);
    expect(JSON.parse(setResponse.body)).toEqual({
      code: "READING_CONTEXT_INVALID",
    });
    expect(setContext).not.toHaveBeenCalled();
    expect(clearContext).not.toHaveBeenCalled();
  });

  it("rejects malformed mutation input without a token before validation", async () => {
    setContext.mockClear();
    clearContext.mockClear();
    const setResponse = await app.getHttpAdapter().getInstance().inject({
      method: "PUT",
      url: "/birth-profiles/profile-1/reading-context",
      payload: { invalid: true },
    });
    const clearResponse = await app.getHttpAdapter().getInstance().inject({
      method: "POST",
      url: "/birth-profiles/profile-1/reading-context/clear",
      payload: { invalid: true },
    });

    expect(setResponse.statusCode).toBe(401);
    expect(clearResponse.statusCode).toBe(401);
    expect(JSON.parse(setResponse.body)).toEqual({
      code: "ACTOR_TOKEN_INVALID",
    });
    expect(setContext).not.toHaveBeenCalled();
    expect(clearContext).not.toHaveBeenCalled();
  });

  it("collapses unavailable profile states to PROFILE_NOT_FOUND", async () => {
    const authorization = `Bearer ${await actorToken()}`;
    for (const profileId of ["missing", "foreign", "archived", "expired"]) {
      getCurrentContext.mockReset();
      getCurrentContext.mockResolvedValue({
        ok: false,
        error: {
          code: "PROFILE_NOT_FOUND",
          messageKey: "readingContext.profile_not_found",
          retryable: false,
        },
      });
      const response = await app.getHttpAdapter().getInstance().inject({
        method: "GET",
        url: `/birth-profiles/${profileId}/reading-context`,
        headers: { authorization },
      });
      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.body)).toEqual({ code: "PROFILE_NOT_FOUND" });
    }
  });

  it("maps conflict, idempotency reuse, and unavailable service results", async () => {
    const authorization = `Bearer ${await actorToken()}`;
    const request = {
      version: 1,
      topConcern: "money",
      expectedStateVersion: 0,
      idempotencyKey: "set-1",
    };

    for (const [code, status] of [
      ["READING_CONTEXT_CONFLICT", 409],
      ["IDEMPOTENCY_KEY_REUSED", 409],
      ["READING_CONTEXT_UNAVAILABLE", 503],
    ] as const) {
      setContext.mockReset();
      setContext.mockResolvedValue({
        ok: false,
        error: {
          code,
          messageKey: `readingContext.${code.toLowerCase()}`,
          retryable: code === "READING_CONTEXT_UNAVAILABLE",
        },
      });
      const response = await app.getHttpAdapter().getInstance().inject({
        method: "PUT",
        url: "/birth-profiles/profile-1/reading-context",
        headers: { authorization },
        payload: request,
      });
      expect(response.statusCode).toBe(status);
      expect(JSON.parse(response.body)).toEqual({ code });
    }
  });

  it("returns 401 for missing and invalid actor tokens", async () => {
    const missing = await app.getHttpAdapter().getInstance().inject({
      method: "GET",
      url: "/birth-profiles/profile-1/reading-context",
    });
    const invalid = await app.getHttpAdapter().getInstance().inject({
      method: "GET",
      url: "/birth-profiles/profile-1/reading-context",
      headers: { authorization: "Bearer invalid.jwt.token" },
    });

    expect(missing.statusCode).toBe(401);
    expect(invalid.statusCode).toBe(401);
    expect(JSON.parse(missing.body)).toEqual({ code: "ACTOR_TOKEN_INVALID" });
  });
});
