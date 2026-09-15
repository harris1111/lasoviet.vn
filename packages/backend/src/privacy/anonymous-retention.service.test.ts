import { randomUUID } from "node:crypto";

import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  authAnonymousActors,
  authUsers,
  birthProfileReadingContextMutationReceipts,
  birthProfileReadingContextRevisions,
  birthProfileReadingContexts,
  birthProfiles,
  createDatabase,
  runMigrations,
  type Database,
} from "@lasoviet/database";

import { createDatabaseAnonymousRetentionRepository } from "./anonymous-retention.repository.js";
import { createAnonymousRetentionService } from "./anonymous-retention.service.js";

describe("anonymous retention policy", () => {
  it("does not purge an unexpired anonymous actor but permits immediate deletion", async () => {
    const service = createAnonymousRetentionService({
      repository: {
        async purgeExpired() {
          return [];
        },
        async purgeActor() {
          return { ok: false, error: "ANONYMOUS_NOT_EXPIRED" as const };
        },
        async deleteNow() {
          return { ok: true, value: { actorId: "anonymous-1" } };
        },
      },
    });

    await expect(
      service.purgeActor("anonymous-1", new Date("2026-09-01T00:00:00Z")),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "ANONYMOUS_NOT_EXPIRED" },
    });
    await expect(service.deleteNow("anonymous-1")).resolves.toEqual({
      ok: true,
      value: { actorId: "anonymous-1" },
    });
  });

  it("never deletes an anonymous actor already linked to an account", async () => {
    const service = createAnonymousRetentionService({
      repository: {
        async purgeExpired() {
          return [];
        },
        async purgeActor() {
          return { ok: false, error: "ANONYMOUS_ALREADY_LINKED" as const };
        },
        async deleteNow() {
          return { ok: false, error: "ANONYMOUS_ALREADY_LINKED" as const };
        },
      },
    });

    await expect(service.deleteNow("anonymous-linked")).resolves.toMatchObject({
      ok: false,
      error: { code: "ANONYMOUS_ALREADY_LINKED" },
    });
  });
});

describe("anonymous retention with PostgreSQL Testcontainers", () => {
  let container: Awaited<ReturnType<PostgreSqlContainer["start"]>> | undefined;
  let database: Database;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine")
      .withDatabase("lasoviet_anonymous_retention_test")
      .withUsername("lasoviet")
      .withPassword("lasoviet")
      .start();
    const databaseUrl = container.getConnectionUri();
    await runMigrations(databaseUrl);
    database = createDatabase(databaseUrl);
  }, 120_000);

  afterAll(async () => {
    if (database) {
      await database.$client.end();
    }
    if (container) {
      await container.stop();
    }
  }, 30_000);

  it("purges expired anonymous profiles with all reading-context records", async () => {
    const now = new Date();
    const actorId = `anonymous-retention-${randomUUID()}`;
    const profileId = `anonymous-profile-${randomUUID()}`;
    const contextRevisionId = `anonymous-context-${randomUUID()}`;

    await database.insert(authUsers).values({
      id: actorId,
      name: "Anonymous retention fixture",
      email: `${actorId}@example.test`,
      emailVerified: false,
      isAnonymous: true,
    });
    await database.insert(authAnonymousActors).values({
      id: actorId,
      expiresAt: new Date(now.getTime() - 1_000),
    });
    await database.insert(birthProfiles).values({
      id: profileId,
      anonymousActorId: actorId,
      anonymousExpiresAt: new Date(now.getTime() - 1_000),
    });
    await database.insert(birthProfileReadingContextRevisions).values({
      id: contextRevisionId,
      profileId,
      revisionNumber: 1,
      lifeStage: "between_paths",
      topConcern: null,
    });
    await database.insert(birthProfileReadingContexts).values({
      profileId,
      currentRevisionId: contextRevisionId,
      stateVersion: 1,
      lastRevisionNumber: 1,
    });
    await database.insert(birthProfileReadingContextMutationReceipts).values({
      profileId,
      idempotencyKey: `anonymous-context-key-${randomUUID()}`,
      commandType: "set",
      requestFingerprint: "b".repeat(64),
      resultStateVersion: 1,
      resultRevisionId: contextRevisionId,
      resultRevisionNumber: 1,
      resultKind: "created",
    });

    const service = createAnonymousRetentionService({
      repository: createDatabaseAnonymousRetentionRepository(database),
    });
    await expect(service.purgeExpired(now)).resolves.toEqual([actorId]);

    await expect(
      database.select().from(authAnonymousActors).where(eq(authAnonymousActors.id, actorId)),
    ).resolves.toEqual([]);
    await expect(
      database.select().from(birthProfiles).where(eq(birthProfiles.id, profileId)),
    ).resolves.toEqual([]);
    await expect(
      database
        .select()
        .from(birthProfileReadingContexts)
        .where(eq(birthProfileReadingContexts.profileId, profileId)),
    ).resolves.toEqual([]);
    await expect(
      database
        .select()
        .from(birthProfileReadingContextRevisions)
        .where(eq(birthProfileReadingContextRevisions.profileId, profileId)),
    ).resolves.toEqual([]);
    await expect(
      database
        .select()
        .from(birthProfileReadingContextMutationReceipts)
        .where(eq(birthProfileReadingContextMutationReceipts.profileId, profileId)),
    ).resolves.toEqual([]);
  });
});
