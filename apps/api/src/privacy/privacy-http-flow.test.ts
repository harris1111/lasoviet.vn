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
  ACCOUNT_DELETION_SERVICE,
  ANONYMOUS_RETENTION_SERVICE,
  CONSENT_SERVICE,
  PRIVACY_DATABASE,
  PRIVACY_SERVICE_SECRET,
  PrivacyController,
} from "./privacy.controller.js";
import { ANALYTICS_SERVICE } from "../analytics/analytics.controller.js";

const serviceSecret = "synthetic-privacy-service-secret";
const secret = new TextEncoder().encode(serviceSecret);
const requestDeletion = vi.fn().mockResolvedValue({
  ok: true,
  value: {
    requestId: "deletion-1",
    recoverUntil: "2026-10-01T00:00:00.000Z",
  },
});
const recordConsent = vi.fn().mockResolvedValue({
  ok: true,
  value: { id: "consent-1" },
});
const deleteAnonymous = vi.fn().mockResolvedValue({
  ok: true,
  value: { actorId: "anonymous-actor" },
});
const associateBirthProfile = vi.fn().mockResolvedValue({ ok: true, value: undefined });

async function actorToken(
  kind: "account" | "anonymous",
  subject: string,
  requestId: string,
): Promise<string> {
  const claims =
    kind === "account"
      ? { version: 1, kind, sid: "session-1", requestId }
      : {
          version: 1,
          kind,
          sid: "session-1",
          requestId,
          expiresAt: "2026-09-02T00:00:00.000+00:00",
        };
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(INTERNAL_ACTOR_ISSUER)
    .setAudience(INTERNAL_ACTOR_AUDIENCE)
    .setSubject(subject)
    .setIssuedAt()
    .setExpirationTime("60s")
    .sign(secret);
}

class PrivacyHttpTestModule {}

Module({
  controllers: [PrivacyController],
  providers: [
    {
      provide: CONSENT_SERVICE,
      useValue: { record: recordConsent },
    },
    {
      provide: ACCOUNT_DELETION_SERVICE,
      useValue: { request: requestDeletion, cancel: vi.fn(), purgeExpired: vi.fn() },
    },
    {
      provide: ANONYMOUS_RETENTION_SERVICE,
      useValue: {
        deleteNow: deleteAnonymous,
        purgeActor: vi.fn(),
        purgeExpired: vi.fn(),
      },
    },
    {
      provide: PRIVACY_SERVICE_SECRET,
      useValue: serviceSecret,
    },
    {
      provide: ANALYTICS_SERVICE,
      useValue: { associateBirthProfile },
    },
    {
      provide: PRIVACY_DATABASE,
      useValue: undefined,
    },
  ],
})(PrivacyHttpTestModule);

describe("privacy private HTTP flow", () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await NestFactory.create<NestFastifyApplication>(
      PrivacyHttpTestModule,
      new FastifyAdapter(),
      { logger: false },
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("uses the verified account actor instead of a browser-supplied account id", async () => {
    requestDeletion.mockClear();
    const response = await app.getHttpAdapter().getInstance().inject({
      method: "POST",
      url: "/privacy/account/deletion",
      headers: {
        authorization: `Bearer ${await actorToken(
          "account",
          "verified-account",
          "account-request",
        )}`,
      },
      payload: { userId: "untrusted-account" },
    });

    expect(response.statusCode).toBe(200);
    expect(requestDeletion).toHaveBeenCalledWith(
      "verified-account",
      "account-request",
    );
  });

  it("rejects anonymous actors before account deletion execution", async () => {
    requestDeletion.mockClear();
    const response = await app.getHttpAdapter().getInstance().inject({
      method: "POST",
      url: "/privacy/account/deletion",
      headers: {
        authorization: `Bearer ${await actorToken(
          "anonymous",
          "anonymous-actor",
          "anonymous-request",
        )}`,
      },
    });

    expect(response.statusCode).toBe(403);
    expect(requestDeletion).not.toHaveBeenCalled();
  });

  it("deletes only the anonymous actor resolved from the signed token", async () => {
    deleteAnonymous.mockClear();
    const response = await app.getHttpAdapter().getInstance().inject({
      method: "DELETE",
      url: "/privacy/anonymous",
      headers: {
        authorization: `Bearer ${await actorToken(
          "anonymous",
          "anonymous-actor",
          "anonymous-delete-request",
        )}`,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(deleteAnonymous).toHaveBeenCalledWith("anonymous-actor");
  });

  it("records four purposes atomically on /privacy/consents", async () => {
    recordConsent.mockClear();
    recordConsent.mockResolvedValueOnce({
      ok: true,
      value: { id: "consent-1", ids: ["consent-1", "consent-2", "consent-3", "consent-4"] },
    });

    const payload = {
      version: 1,
      documentKey: "privacy",
      documentVersion: "2026-09-14",
      purposes: ["birth_profile", "analytics", "personalization", "offers"],
      visitorId: "123e4567-e89b-12d3-a456-426614174000",
    };

    const response = await app.getHttpAdapter().getInstance().inject({
      method: "POST",
      url: "/privacy/consents",
      headers: {
        authorization: `Bearer ${await actorToken(
          "account",
          "verified-account",
          "consent-request",
        )}`,
      },
      payload,
    });

    expect(response.statusCode).toBe(200);
    expect(recordConsent).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "account", userId: "verified-account" }),
      "privacy",
      "2026-09-14",
      ["birth_profile", "analytics", "personalization", "offers"],
      "123e4567-e89b-12d3-a456-426614174000",
    );
  });

  it("associates birth profile with visitor via /privacy/associate-profile", async () => {
    associateBirthProfile.mockClear();
    associateBirthProfile.mockResolvedValueOnce({ ok: true, value: undefined });

    const payload = {
      version: 1,
      visitorId: "123e4567-e89b-12d3-a456-426614174000",
      profileId: "profile-xyz",
    };

    const response = await app.getHttpAdapter().getInstance().inject({
      method: "POST",
      url: "/privacy/associate-profile",
      headers: {
        authorization: `Bearer ${await actorToken(
          "account",
          "verified-account",
          "assoc-request",
        )}`,
      },
      payload,
    });

    expect(response.statusCode).toBe(200);
    expect(associateBirthProfile).toHaveBeenCalledWith({
      visitorId: "123e4567-e89b-12d3-a456-426614174000",
      birthProfileId: "profile-xyz",
      owner: { userId: "verified-account" },
    });
  });

  it("maps profile association errors to typed HTTP status codes", async () => {
    associateBirthProfile.mockResolvedValueOnce({
      ok: false,
      error: { code: "PROFILE_FORBIDDEN" },
    });

    const response = await app.getHttpAdapter().getInstance().inject({
      method: "POST",
      url: "/privacy/associate-profile",
      headers: {
        authorization: `Bearer ${await actorToken(
          "account",
          "verified-account",
          "assoc-request",
        )}`,
      },
      payload: { version: 1, visitorId: "123e4567-e89b-12d3-a456-426614174000", profileId: "profile-forbidden" },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ code: "PROFILE_FORBIDDEN" });
  });
});
