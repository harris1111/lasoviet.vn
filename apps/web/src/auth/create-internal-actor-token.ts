import "server-only";

import { SignJWT } from "jose";

import { loadEnvironment } from "@lasoviet/config";
import {
  INTERNAL_ACTOR_AUDIENCE,
  INTERNAL_ACTOR_ISSUER,
  type CurrentActor,
} from "@lasoviet/contracts";

function actorSecret(): string {
  const result = loadEnvironment(process.env);
  if (!result.ok || result.value.internalActorSecret === undefined) {
    throw new Error("ACTOR_TOKEN_CONFIG_INVALID");
  }
  return result.value.internalActorSecret;
}

export async function createInternalActorToken(
  actor: CurrentActor,
  requestId: string,
): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + 300;
  const payload =
    actor.kind === "account"
      ? {
          version: 1 as const,
          kind: "account" as const,
          sub: actor.userId,
          sid: actor.sessionId,
          aud: INTERNAL_ACTOR_AUDIENCE,
          exp,
          requestId,
        }
      : {
          version: 1 as const,
          kind: "anonymous" as const,
          sub: actor.anonymousActorId,
          sid: actor.sessionId,
          aud: INTERNAL_ACTOR_AUDIENCE,
          exp,
          requestId,
          expiresAt: actor.expiresAt,
        };

  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(INTERNAL_ACTOR_ISSUER)
    .setAudience(INTERNAL_ACTOR_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(new TextEncoder().encode(actorSecret()));
}
