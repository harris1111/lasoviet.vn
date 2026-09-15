import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { CurrentActor } from "@lasoviet/contracts";
import { computeReadingContextFingerprint } from "@lasoviet/contracts";
import {
  auditLogs,
  authAnonymousActors,
  authUsers,
  birthProfileReadingContextMutationReceipts,
  birthProfileReadingContextRevisions,
  birthProfileReadingContexts,
  birthProfiles,
  createDatabase,
  runMigrations,
} from "@lasoviet/database";

import { createDatabaseReadingContextRepository } from "./reading-context.repository.js";

const now = new Date("2026-09-15T00:00:00Z");

describe("ReadingContextRepository", () => {
  let container: Awaited<ReturnType<PostgreSqlContainer["start"]>> | undefined;
  let databaseUrl: string;
  const actor: CurrentActor = {
    kind: "account",
    userId: "reading-repository-user",
    sessionId: "reading-repository-session",
    requestId: "reading-repository-request",
  };

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine")
      .withDatabase("lasoviet_reading_repository_test")
      .withUsername("lasoviet")
      .withPassword("lasoviet")
      .start();
    databaseUrl = container.getConnectionUri();
    await runMigrations(databaseUrl);
    const database = createDatabase(databaseUrl);
    await database.insert(authUsers).values([
      {
        id: actor.userId,
        name: "Reading Owner",
        email: "reading-owner@example.test",
      },
      {
        id: "reading-repository-other",
        name: "Reading Other",
        email: "reading-other@example.test",
      },
    ]);
    await database.insert(authAnonymousActors).values({
      id: "reading-repository-expired",
      expiresAt: new Date(now.getTime() - 1),
    });
    await database.insert(birthProfiles).values([
      {
        id: "reading-uninitialized",
        userId: actor.userId,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "reading-foreign",
        userId: "reading-repository-other",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "reading-archived",
        userId: actor.userId,
        deletedAt: now,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "reading-expired",
        anonymousActorId: "reading-repository-expired",
        anonymousExpiresAt: new Date(now.getTime() - 1),
        createdAt: now,
        updatedAt: now,
      },
    ]);
  }, 120_000);

  afterAll(async () => {
    if (container) await container.stop();
  }, 30_000);

  function repository() {
    return createDatabaseReadingContextRepository(createDatabase(databaseUrl));
  }

  async function createProfile(profileId: string) {
    const database = createDatabase(databaseUrl);
    await database.insert(birthProfiles).values({
      id: profileId,
      userId: actor.userId,
      createdAt: now,
      updatedAt: now,
    });
  }

  async function expectRows(
    database: ReturnType<typeof createDatabase>,
    profileId: string,
    revisionCount: number,
    receiptCount: number,
    auditCount: number,
  ) {
    expect(
      await database.select().from(birthProfileReadingContextRevisions).where(
        eq(birthProfileReadingContextRevisions.profileId, profileId),
      ),
    ).toHaveLength(revisionCount);
    expect(
      await database.select().from(birthProfileReadingContextMutationReceipts).where(
        eq(birthProfileReadingContextMutationReceipts.profileId, profileId),
      ),
    ).toHaveLength(receiptCount);
    expect(
      await database.select().from(auditLogs).where(
        eq(auditLogs.targetId, profileId),
      ),
    ).toHaveLength(auditCount);
  }

  function set(
    profileId: string,
    key: string,
    expectedStateVersion: number,
    context = { version: 1 as const, topConcern: "career" as const },
  ) {
    return repository().mutateContextWithAdvisoryLock(actor, profileId, {
      commandType: "set",
      context,
      expectedStateVersion,
      idempotencyKey: key,
      requestFingerprint: computeReadingContextFingerprint(
        "set",
        expectedStateVersion,
        context,
      ),
      now,
    });
  }

  it("returns state zero for an active uninitialized owner and uniform missing for non-active ownership", async () => {
    await expect(
      repository().getCurrent(actor, "reading-uninitialized", now),
    ).resolves.toEqual({
      profileId: "reading-uninitialized",
      revisionId: null,
      revisionNumber: null,
      stateVersion: 0,
      lifeStage: null,
      topConcern: null,
      createdAt: null,
      updatedAt: null,
    });
    await expect(
      repository().getCurrent(actor, "reading-foreign", now),
    ).resolves.toBeNull();
    await expect(
      repository().getCurrent(actor, "reading-archived", now),
    ).resolves.toBeNull();
    await expect(
      repository().getCurrent(actor, "reading-expired", now),
    ).resolves.toBeNull();
  });

  it("serializes set/update/clear/re-set and replays receipts without duplicate audits", async () => {
    const profileId = "reading-uninitialized";
    const initial = await set(profileId, "initial", 0);
    expect(initial).toMatchObject({
      ok: true,
      value: { stateVersion: 1, revisionNumber: 1, topConcern: "career" },
    });
    const update = await set(profileId, "update", 1, {
      version: 1,
      lifeStage: "early_career",
    });
    expect(update).toMatchObject({
      ok: true,
      value: { stateVersion: 2, revisionNumber: 2, lifeStage: "early_career" },
    });
    const clearFingerprint = computeReadingContextFingerprint("clear", 2);
    const cleared = await repository().mutateContextWithAdvisoryLock(actor, profileId, {
      commandType: "clear",
      expectedStateVersion: 2,
      idempotencyKey: "clear",
      requestFingerprint: clearFingerprint,
      now,
    });
    expect(cleared).toMatchObject({
      ok: true,
      value: { stateVersion: 3, revisionId: null, revisionNumber: null },
    });
    const reset = await set(profileId, "reset", 3, {
      version: 1,
      topConcern: "money",
    });
    expect(reset).toMatchObject({
      ok: true,
      value: { stateVersion: 4, revisionNumber: 3, topConcern: "money" },
    });
    const replay = await set(profileId, "update", 1, {
      version: 1,
      lifeStage: "early_career",
    });
    expect(replay).toMatchObject({
      ok: true,
      value: { stateVersion: 2, revisionNumber: 2, lifeStage: "early_career" },
    });
    const reused = await set(profileId, "update", 1, {
      version: 1,
      topConcern: "love",
    });
    expect(reused).toMatchObject({
      ok: false,
      error: { code: "IDEMPOTENCY_KEY_REUSED" },
    });
    const stale = await set(profileId, "stale", 0);
    expect(stale).toMatchObject({
      ok: false,
      error: { code: "READING_CONTEXT_CONFLICT" },
    });
    const database = createDatabase(databaseUrl);
    expect(
      await database.select().from(birthProfileReadingContextRevisions).where(
        eq(birthProfileReadingContextRevisions.profileId, profileId),
      ),
    ).toHaveLength(3);
    expect(
      await database.select().from(birthProfileReadingContextMutationReceipts).where(
        eq(birthProfileReadingContextMutationReceipts.profileId, profileId),
      ),
    ).toHaveLength(4);
    const audits = await database.select().from(auditLogs).where(
      eq(auditLogs.targetId, profileId),
    );
    expect(audits).toHaveLength(4);
    expect(JSON.stringify(audits)).not.toContain("early_career");
    expect(JSON.stringify(audits)).not.toContain("career");
    expect(JSON.stringify(audits)).not.toContain("requestFingerprint");
  });

  it("makes concurrent initial set requests deterministic", async () => {
    const database = createDatabase(databaseUrl);
    await createProfile("reading-concurrent");
    const [first, second] = await Promise.all([
      set("reading-concurrent", "concurrent-a", 0),
      set("reading-concurrent", "concurrent-b", 0, {
        version: 1,
        topConcern: "money",
      }),
    ]);
    expect([first, second].filter((result) => result.ok)).toHaveLength(1);
    expect([first, second].filter((result) => !result.ok)).toMatchObject([
      { error: { code: "READING_CONTEXT_CONFLICT" } },
    ]);
    expect(
      await database.select().from(birthProfileReadingContexts).where(
        eq(birthProfileReadingContexts.profileId, "reading-concurrent"),
      ),
    ).toHaveLength(1);
  });

  it("replays concurrent first set requests with the same key and fingerprint", async () => {
    const profileId = "reading-concurrent-same-key";
    await createProfile(profileId);
    const [first, second] = await Promise.all([
      set(profileId, "same-key", 0),
      set(profileId, "same-key", 0),
    ]);
    expect(first).toEqual(second);
    expect(first).toMatchObject({
      ok: true,
      value: { stateVersion: 1, revisionNumber: 1 },
    });
    const database = createDatabase(databaseUrl);
    await expectRows(database, profileId, 1, 1, 1);
  });

  it("rejects concurrent first set requests reusing a key with a different fingerprint", async () => {
    const profileId = "reading-concurrent-reused-key";
    await createProfile(profileId);
    const [first, second] = await Promise.all([
      set(profileId, "reused-key", 0),
      set(profileId, "reused-key", 0, {
        version: 1,
        topConcern: "money",
      }),
    ]);
    expect([first, second].filter((result) => result.ok)).toHaveLength(1);
    expect([first, second].filter((result) => !result.ok)).toMatchObject([
      { error: { code: "IDEMPOTENCY_KEY_REUSED" } },
    ]);
    const database = createDatabase(databaseUrl);
    await expectRows(database, profileId, 1, 1, 1);
  });

  it("replays a clear after a newer re-set without changing current state", async () => {
    const profileId = "reading-clear-replay";
    await createProfile(profileId);
    await set(profileId, "initial", 0);
    const clearFingerprint = computeReadingContextFingerprint("clear", 1);
    const cleared = await repository().mutateContextWithAdvisoryLock(actor, profileId, {
      commandType: "clear",
      expectedStateVersion: 1,
      idempotencyKey: "clear",
      requestFingerprint: clearFingerprint,
      now,
    });
    expect(cleared).toMatchObject({
      ok: true,
      value: { stateVersion: 2, revisionId: null },
    });
    await set(profileId, "reset", 2, {
      version: 1,
      topConcern: "money",
    });
    const beforeReplay = await repository().getCurrent(actor, profileId, now);
    const replay = await repository().mutateContextWithAdvisoryLock(actor, profileId, {
      commandType: "clear",
      expectedStateVersion: 1,
      idempotencyKey: "clear",
      requestFingerprint: clearFingerprint,
      now,
    });
    expect(replay).toEqual(cleared);
    expect(await repository().getCurrent(actor, profileId, now)).toEqual(beforeReplay);
    const database = createDatabase(databaseUrl);
    await expectRows(database, profileId, 2, 3, 3);
  });
});
