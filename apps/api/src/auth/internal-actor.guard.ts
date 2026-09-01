import { errors, jwtVerify } from "jose";

import {
  INTERNAL_ACTOR_AUDIENCE,
  INTERNAL_ACTOR_ISSUER,
  InternalActorV1Schema,
  type CurrentActor,
} from "@lasoviet/contracts";

export type ActorTokenErrorCode =
  | "ACTOR_TOKEN_EXPIRED"
  | "ACTOR_TOKEN_AUDIENCE"
  | "ACTOR_TOKEN_INVALID";

export class ActorTokenError extends Error {
  constructor(readonly code: ActorTokenErrorCode) {
    super(code);
    this.name = "ActorTokenError";
  }
}

export async function verifyInternalActorToken(
  token: string,
  secret: Uint8Array,
  now = Math.floor(Date.now() / 1000),
): Promise<CurrentActor> {
  try {
    const { payload, protectedHeader } = await jwtVerify(token, secret, {
      issuer: INTERNAL_ACTOR_ISSUER,
      audience: INTERNAL_ACTOR_AUDIENCE,
      algorithms: ["HS256"],
      currentDate: new Date(now * 1000),
    });
    if (protectedHeader.alg !== "HS256") {
      throw new ActorTokenError("ACTOR_TOKEN_INVALID");
    }

    const {
      iss: _issuer,
      iat: _issuedAt,
      ...actorPayload
    } = payload;
    const parsed = InternalActorV1Schema.safeParse(actorPayload);
    if (!parsed.success) {
      throw new ActorTokenError("ACTOR_TOKEN_INVALID");
    }

    return parsed.data.kind === "account"
      ? {
          kind: "account",
          userId: parsed.data.sub,
          sessionId: parsed.data.sid,
          requestId: parsed.data.requestId,
        }
      : {
          kind: "anonymous",
          anonymousActorId: parsed.data.sub,
          sessionId: parsed.data.sid,
          requestId: parsed.data.requestId,
          expiresAt: parsed.data.expiresAt,
        };
  } catch (error) {
    if (error instanceof ActorTokenError) {
      throw error;
    }
    if (error instanceof errors.JWTExpired) {
      throw new ActorTokenError("ACTOR_TOKEN_EXPIRED");
    }
    if (
      error instanceof errors.JWTClaimValidationFailed &&
      error.claim === "aud"
    ) {
      throw new ActorTokenError("ACTOR_TOKEN_AUDIENCE");
    }
    throw new ActorTokenError("ACTOR_TOKEN_INVALID");
  }
}
