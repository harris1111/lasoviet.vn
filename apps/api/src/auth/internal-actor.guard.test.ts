import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";

import {
  INTERNAL_ACTOR_AUDIENCE,
  INTERNAL_ACTOR_ISSUER,
} from "@lasoviet/contracts";

import { verifyInternalActorToken } from "./internal-actor.guard.js";

const secret = new TextEncoder().encode("synthetic-actor-secret");
const issuedAt = 1_788_192_000;

async function actorToken(options?: {
  audience?: string;
  expiresAt?: number;
}): Promise<string> {
  return new SignJWT({
    version: 1,
    kind: "account",
    sub: "account-synthetic",
    sid: "session-synthetic",
    aud: options?.audience ?? INTERNAL_ACTOR_AUDIENCE,
    exp: options?.expiresAt ?? issuedAt + 300,
    requestId: "request-synthetic",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(INTERNAL_ACTOR_ISSUER)
    .setAudience(options?.audience ?? INTERNAL_ACTOR_AUDIENCE)
    .setIssuedAt(issuedAt)
    .setExpirationTime(options?.expiresAt ?? issuedAt + 300)
    .sign(secret);
}

describe("internal actor tokens", () => {
  it("resolves a verified account actor", async () => {
    await expect(
      verifyInternalActorToken(await actorToken(), secret, issuedAt),
    ).resolves.toEqual({
      kind: "account",
      userId: "account-synthetic",
      sessionId: "session-synthetic",
      requestId: "request-synthetic",
    });
  });

  it("rejects expired, wrong-audience, and tampered tokens", async () => {
    await expect(
      verifyInternalActorToken(
        await actorToken({ expiresAt: issuedAt - 1 }),
        secret,
        issuedAt,
      ),
    ).rejects.toMatchObject({ code: "ACTOR_TOKEN_EXPIRED" });
    await expect(
      verifyInternalActorToken(
        await actorToken({ audience: "lasoviet-api:auth-email" }),
        secret,
        issuedAt,
      ),
    ).rejects.toMatchObject({ code: "ACTOR_TOKEN_AUDIENCE" });

    const token = await actorToken();
    const tampered = `${token.slice(0, -1)}${token.endsWith("a") ? "b" : "a"}`;
    await expect(
      verifyInternalActorToken(tampered, secret, issuedAt),
    ).rejects.toMatchObject({ code: "ACTOR_TOKEN_INVALID" });
  });
});
