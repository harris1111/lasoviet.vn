import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { eq } from "drizzle-orm";
import { SignJWT } from "jose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  INTERNAL_ACTOR_AUDIENCE,
  INTERNAL_ACTOR_ISSUER,
} from "@lasoviet/contracts";
import {
  authAnonymousActors,
  authSessions,
  authUsers,
  createDatabase,
  deletionRequests,
  runMigrations,
} from "@lasoviet/database";

import {
  ActorTokenError,
  verifyInternalActorToken,
} from "./internal-actor.guard.js";

const secret = new TextEncoder().encode("live-actor-test-secret");
const issuedAt = Math.floor(new Date("2026-09-01T00:00:00Z").getTime() / 1000);

async function actorToken(
  kind: "account" | "anonymous",
  subject: string,
): Promise<string> {
  return new SignJWT(
    kind === "account"
      ? { version: 1, kind, sid: `${subject}-session`, requestId: "request-1" }
      : {
          version: 1,
          kind,
          sid: `${subject}-session`,
          requestId: "request-1",
          expiresAt: "2026-09-02T00:00:00.000+00:00",
        },
  )
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(INTERNAL_ACTOR_ISSUER)
    .setAudience(INTERNAL_ACTOR_AUDIENCE)
    .setSubject(subject)
    .setIssuedAt(issuedAt)
    .setExpirationTime("5m")
    .sign(secret);
}

describe("internal actor live authorization", () => {
  let container:
    | Awaited<ReturnType<PostgreSqlContainer["start"]>>
    | undefined;
  let databaseUrl: string;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine")
      .withDatabase("lasoviet_actor_test")
      .withUsername("lasoviet")
      .withPassword("lasoviet")
      .start();
    databaseUrl = container.getConnectionUri();
    await runMigrations(databaseUrl);
  }, 120_000);

  afterAll(async () => {
    await container?.stop();
  }, 30_000);

  it("requires a live session and blocks normal access during deletion recovery", async () => {
    const database = createDatabase(databaseUrl);
    const now = issuedAt + 60;
    await database.insert(authUsers).values({
      id: "account-actor",
      name: "Account Actor",
      email: "account-actor@example.test",
    });
    await database.insert(authSessions).values({
      id: "account-actor-session",
      userId: "account-actor",
      token: "account-actor-token",
      expiresAt: new Date("2026-09-02T00:00:00Z"),
    });
    const token = await actorToken("account", "account-actor");

    await expect(
      verifyInternalActorToken(token, secret, now, database),
    ).resolves.toMatchObject({ kind: "account", userId: "account-actor" });

    await database.delete(authSessions);
    await expect(
      verifyInternalActorToken(token, secret, now, database),
    ).rejects.toMatchObject({ code: "ACTOR_TOKEN_INVALID" } satisfies Partial<ActorTokenError>);

    await database.insert(authSessions).values({
      id: "account-actor-session",
      userId: "account-actor",
      token: "account-actor-token-restored",
      expiresAt: new Date("2026-09-02T00:00:00Z"),
    });
    await database.insert(deletionRequests).values({
      id: "account-actor-deletion",
      userId: "account-actor",
      requestedAt: new Date("2026-09-01T00:00:00Z"),
      recoverUntil: new Date("2026-10-01T00:00:00Z"),
      purgeAfter: new Date("2026-10-01T00:00:00Z"),
    });
    await expect(
      verifyInternalActorToken(token, secret, now, database),
    ).rejects.toMatchObject({ code: "ACTOR_TOKEN_INVALID" } satisfies Partial<ActorTokenError>);
    await expect(
      verifyInternalActorToken(token, secret, now, database, true),
    ).resolves.toMatchObject({ kind: "account", userId: "account-actor" });
  }, 120_000);

  it("requires a live, unlinked, unexpired anonymous actor", async () => {
    const database = createDatabase(databaseUrl);
    const now = issuedAt + 60;
    await database.insert(authUsers).values({
      id: "anonymous-actor",
      name: "Anonymous Actor",
      email: "anonymous-actor@example.test",
      isAnonymous: true,
    });
    await database.insert(authAnonymousActors).values({
      id: "anonymous-actor",
      expiresAt: new Date("2026-09-02T00:00:00Z"),
    });
    await database.insert(authSessions).values({
      id: "anonymous-actor-session",
      userId: "anonymous-actor",
      token: "anonymous-actor-token",
      expiresAt: new Date("2026-09-02T00:00:00Z"),
    });
    const token = await actorToken("anonymous", "anonymous-actor");
    await expect(
      verifyInternalActorToken(token, secret, now, database),
    ).resolves.toMatchObject({
      kind: "anonymous",
      anonymousActorId: "anonymous-actor",
    });
    await database
      .delete(authSessions)
      .where(eq(authSessions.id, "anonymous-actor-session"));
    await expect(
      verifyInternalActorToken(token, secret, now, database),
    ).rejects.toMatchObject({ code: "ACTOR_TOKEN_INVALID" } satisfies Partial<ActorTokenError>);
    await database.insert(authSessions).values({
      id: "anonymous-actor-session",
      userId: "anonymous-actor",
      token: "anonymous-actor-token-expired",
      expiresAt: new Date("2026-08-31T23:59:59Z"),
    });
    await expect(
      verifyInternalActorToken(token, secret, now, database),
    ).rejects.toMatchObject({ code: "ACTOR_TOKEN_INVALID" } satisfies Partial<ActorTokenError>);
    await database
      .update(authAnonymousActors)
      .set({ deletedAt: new Date("2026-09-01T00:00:00Z") })
      .where(eq(authAnonymousActors.id, "anonymous-actor"));
    await expect(
      verifyInternalActorToken(token, secret, now, database),
    ).rejects.toMatchObject({ code: "ACTOR_TOKEN_INVALID" } satisfies Partial<ActorTokenError>);
  }, 120_000);
});
