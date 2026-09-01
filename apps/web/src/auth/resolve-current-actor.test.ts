import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  CurrentActorResolutionError,
  createCurrentActorResolver,
} from "./resolve-current-actor";

const now = new Date("2026-09-02T00:00:00.000Z");

function resolverFor(options: {
  session: unknown;
  anonymousSession?: unknown;
  liveAnonymousActor?: {
    sessionId: string;
    expiresAt: Date;
    sessionExpiresAt: Date;
  } | null;
}) {
  const getSession = vi.fn().mockResolvedValue(options.session);
  const signInAnonymous = vi.fn().mockResolvedValue(options.anonymousSession);
  const findLiveAnonymousActor = vi
    .fn()
    .mockResolvedValue(options.liveAnonymousActor ?? null);
  return {
    getSession,
    signInAnonymous,
    findLiveAnonymousActor,
    resolve: createCurrentActorResolver({
      auth: {
        api: { getSession, signInAnonymous },
      } as never,
      headers: new Headers(),
      findLiveAnonymousActor,
      now: () => now,
      requestId: () => "server-request-id",
    }),
  };
}

describe("current actor resolver", () => {
  it("resolves an account actor from the authoritative session", async () => {
    const subject = resolverFor({
      session: {
        session: { id: "session-1", userId: "account-1" },
        user: { id: "account-1", isAnonymous: false },
      },
    });

    await expect(subject.resolve()).resolves.toEqual({
      kind: "account",
      userId: "account-1",
      sessionId: "session-1",
      requestId: "server-request-id",
    });
    expect(subject.signInAnonymous).not.toHaveBeenCalled();
    expect(subject.findLiveAnonymousActor).not.toHaveBeenCalled();
  });

  it("creates one anonymous session and resolves its live expiry", async () => {
    const subject = resolverFor({
      session: null,
      anonymousSession: {
        token: "anonymous-token",
        user: { id: "anonymous-1", isAnonymous: true },
      },
      liveAnonymousActor: {
        sessionId: "session-created",
        expiresAt: new Date("2026-09-03T00:00:00.000Z"),
        sessionExpiresAt: new Date("2026-09-03T00:00:00.000Z"),
      },
    });

    await expect(subject.resolve()).resolves.toEqual({
      kind: "anonymous",
      anonymousActorId: "anonymous-1",
      sessionId: "session-created",
      requestId: "server-request-id",
      expiresAt: "2026-09-03T00:00:00.000Z",
    });
    expect(subject.getSession).toHaveBeenCalledTimes(1);
    expect(subject.signInAnonymous).toHaveBeenCalledTimes(1);
    expect(subject.findLiveAnonymousActor).toHaveBeenCalledWith({
      anonymousActorId: "anonymous-1",
      sessionToken: "anonymous-token",
      now,
    });
  });

  it.each([
    ["expired", new Date("2026-09-01T23:59:59.999Z")],
    ["linked", null],
    ["deleted", null],
    ["missing", null],
  ])("rejects %s anonymous state before private API calls", async (_name, actor) => {
    const subject = resolverFor({
      session: {
        session: { id: "anonymous-session", userId: "anonymous-1" },
        user: { id: "anonymous-1", isAnonymous: true },
      },
      liveAnonymousActor:
        actor === null
          ? null
          : {
              sessionId: "anonymous-session",
              expiresAt: actor,
              sessionExpiresAt: new Date("2026-09-03T00:00:00.000Z"),
            },
    });

    await expect(subject.resolve()).rejects.toEqual(
      new CurrentActorResolutionError("ANONYMOUS_EXPIRED"),
    );
  });

  it("rejects an anonymous session row that expires before the live actor", async () => {
    const subject = resolverFor({
      session: {
        session: { id: "anonymous-session", userId: "anonymous-1" },
        user: { id: "anonymous-1", isAnonymous: true },
      },
      liveAnonymousActor: {
        sessionId: "anonymous-session",
        expiresAt: new Date("2026-09-03T00:00:00.000Z"),
        sessionExpiresAt: new Date("2026-09-01T23:59:59.999Z"),
      },
    });

    await expect(subject.resolve()).rejects.toEqual(
      new CurrentActorResolutionError("ANONYMOUS_EXPIRED"),
    );
  });

  it("uses a fresh lookup clock after the authoritative session read", async () => {
    let authoritativeReadComplete = false;
    const lookupTime = new Date("2026-09-02T00:00:01.000Z");
    const findLiveAnonymousActor = vi.fn().mockResolvedValue({
      sessionId: "anonymous-session",
      expiresAt: new Date("2026-09-03T00:00:00.000Z"),
      sessionExpiresAt: new Date("2026-09-02T00:00:00.500Z"),
    });
    const resolve = createCurrentActorResolver({
      auth: {
        api: {
          getSession: vi.fn(async () => {
            authoritativeReadComplete = true;
            return {
              session: { id: "anonymous-session", userId: "anonymous-1" },
              user: { id: "anonymous-1", isAnonymous: true },
            };
          }),
          signInAnonymous: vi.fn(),
        },
      } as never,
      headers: new Headers(),
      findLiveAnonymousActor,
      now: () =>
        authoritativeReadComplete
          ? lookupTime
          : new Date("2026-09-02T00:00:00.000Z"),
      requestId: () => "server-request-id",
    });

    await expect(resolve()).rejects.toEqual(
      new CurrentActorResolutionError("ANONYMOUS_EXPIRED"),
    );
    expect(findLiveAnonymousActor).toHaveBeenCalledWith({
      anonymousActorId: "anonymous-1",
      sessionId: "anonymous-session",
      now: lookupTime,
    });
  });
});
