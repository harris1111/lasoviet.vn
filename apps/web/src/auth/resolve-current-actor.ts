import "server-only";

import { randomUUID } from "node:crypto";

import { and, eq, gt, isNull } from "drizzle-orm";
import { headers as requestHeaders } from "next/headers";

import type { CurrentActor } from "@lasoviet/contracts";
import {
  authAnonymousActors,
  authSessions,
} from "@lasoviet/database/runtime";

import { getAuth, getAuthDatabase } from "./auth";

type AuthoritativeSession = {
  session: { id: string; userId: string };
  user: { id: string; isAnonymous: boolean };
};

type AnonymousSignIn = {
  token: string;
  user: { id: string; isAnonymous: boolean };
};

type LiveAnonymousActor = {
  sessionId: string;
  expiresAt: Date;
};

type CurrentActorAuth = {
  api: {
    getSession(input: {
      headers: Headers;
      query: { disableCookieCache: true };
    }): Promise<AuthoritativeSession | null>;
    signInAnonymous(input: { headers: Headers }): Promise<AnonymousSignIn>;
  };
};

type FindLiveAnonymousActor = (input: {
  anonymousActorId: string;
  sessionId?: string;
  sessionToken?: string;
  now: Date;
}) => Promise<LiveAnonymousActor | null>;

export type CurrentActorResolverOptions = {
  auth: CurrentActorAuth;
  headers: Headers;
  findLiveAnonymousActor: FindLiveAnonymousActor;
  now?: () => Date;
  requestId?: () => string;
};

export class CurrentActorResolutionError extends Error {
  constructor(readonly code: "ANONYMOUS_EXPIRED") {
    super(code);
    this.name = "CurrentActorResolutionError";
  }
}

function invalidAnonymous(): never {
  throw new CurrentActorResolutionError("ANONYMOUS_EXPIRED");
}

async function liveAnonymousActor(
  find: FindLiveAnonymousActor,
  input: {
    anonymousActorId: string;
    sessionId?: string;
    sessionToken?: string;
    now: Date;
  },
): Promise<CurrentActor> {
  const live = await find(input);
  if (live === null || live.expiresAt <= input.now) {
    return invalidAnonymous();
  }
  return {
    kind: "anonymous",
    anonymousActorId: input.anonymousActorId,
    sessionId: live.sessionId,
    requestId: "",
    expiresAt: live.expiresAt.toISOString(),
  };
}

export function createCurrentActorResolver(options: CurrentActorResolverOptions) {
  const now = options.now ?? (() => new Date());
  const createRequestId = options.requestId ?? randomUUID;

  return async (): Promise<CurrentActor> => {
    const currentTime = now();
    const session = await options.auth.api.getSession({
      headers: options.headers,
      query: { disableCookieCache: true },
    });
    if (session === null) {
      const signedIn = await options.auth.api.signInAnonymous({
        headers: options.headers,
      });
      if (signedIn.user.isAnonymous !== true) {
        return invalidAnonymous();
      }
      const actor = await liveAnonymousActor(options.findLiveAnonymousActor, {
        anonymousActorId: signedIn.user.id,
        sessionToken: signedIn.token,
        now: currentTime,
      });
      return { ...actor, requestId: createRequestId() };
    }

    if (session.session.userId !== session.user.id) {
      return invalidAnonymous();
    }
    if (session.user.isAnonymous !== true) {
      return {
        kind: "account",
        userId: session.user.id,
        sessionId: session.session.id,
        requestId: createRequestId(),
      };
    }
    const actor = await liveAnonymousActor(options.findLiveAnonymousActor, {
      anonymousActorId: session.user.id,
      sessionId: session.session.id,
      now: currentTime,
    });
    return { ...actor, requestId: createRequestId() };
  };
}

async function findLiveAnonymousActor(input: {
  anonymousActorId: string;
  sessionId?: string;
  sessionToken?: string;
  now: Date;
}): Promise<LiveAnonymousActor | null> {
  const database = getAuthDatabase();
  const [actor] = await database
    .select({
      sessionId: authSessions.id,
      expiresAt: authAnonymousActors.expiresAt,
    })
    .from(authAnonymousActors)
    .innerJoin(
      authSessions,
      and(
        eq(authSessions.userId, authAnonymousActors.id),
        input.sessionId === undefined
          ? eq(authSessions.token, input.sessionToken!)
          : eq(authSessions.id, input.sessionId),
      ),
    )
    .where(
      and(
        eq(authAnonymousActors.id, input.anonymousActorId),
        isNull(authAnonymousActors.linkedUserId),
        isNull(authAnonymousActors.deletedAt),
        gt(authAnonymousActors.expiresAt, input.now),
      ),
    )
    .limit(1);
  return actor ?? null;
}

export async function resolveCurrentActor(): Promise<CurrentActor> {
  return createCurrentActorResolver({
    auth: getAuth() as unknown as CurrentActorAuth,
    headers: await requestHeaders(),
    findLiveAnonymousActor,
  })();
}
