import { errors, jwtVerify } from "jose";

import {
  INTERNAL_ACTOR_AUDIENCE,
  INTERNAL_ACTOR_ISSUER,
  InternalActorV1Schema,
  type CurrentActor,
} from "@lasoviet/contracts";
import {
  authAnonymousActors,
  authSessions,
  deletionRequests,
  type Database,
} from "@lasoviet/database";
import { and, eq, gt, isNull } from "drizzle-orm";

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
  database?: Database,
  allowDeletionRecovery = false,
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

    const actor: CurrentActor = parsed.data.kind === "account"
      ? {
          kind: "account" as const,
          userId: parsed.data.sub,
          sessionId: parsed.data.sid,
          requestId: parsed.data.requestId,
        }
      : {
          kind: "anonymous" as const,
          anonymousActorId: parsed.data.sub,
          sessionId: parsed.data.sid,
          requestId: parsed.data.requestId,
          expiresAt: parsed.data.expiresAt,
        };
    if (database === undefined) {
      return actor;
    }
    const currentTime = new Date(now * 1000);
    if (actor.kind === "account") {
      const [session] = await database
        .select({ id: authSessions.id })
        .from(authSessions)
        .where(and(eq(authSessions.id, actor.sessionId), eq(authSessions.userId, actor.userId), gt(authSessions.expiresAt, currentTime)))
        .limit(1);
      if (session === undefined) {
        throw new ActorTokenError("ACTOR_TOKEN_INVALID");
      }
      if (!allowDeletionRecovery) {
        const [deletion] = await database
          .select({ id: deletionRequests.id })
          .from(deletionRequests)
          .where(and(eq(deletionRequests.userId, actor.userId), eq(deletionRequests.status, "requested")))
          .limit(1);
        if (deletion !== undefined) {
          throw new ActorTokenError("ACTOR_TOKEN_INVALID");
        }
      }
    } else {
      const [anonymousActor] = await database
        .select({ id: authAnonymousActors.id })
        .from(authAnonymousActors)
        .where(and(eq(authAnonymousActors.id, actor.anonymousActorId), isNull(authAnonymousActors.linkedUserId), isNull(authAnonymousActors.deletedAt), gt(authAnonymousActors.expiresAt, currentTime)))
        .limit(1);
      if (anonymousActor === undefined) {
        throw new ActorTokenError("ACTOR_TOKEN_INVALID");
      }
    }
    return actor;
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
