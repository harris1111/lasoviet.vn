import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { BirthProfileV1, CurrentActor } from "@lasoviet/contracts";
import {
  auditLogs,
  authAnonymousActors,
  authUsers,
  birthProfileReadingContextMutationReceipts,
  birthProfileReadingContextRevisions,
  birthProfileReadingContexts,
  birthProfileRevisions,
  birthProfiles,
  createDatabase,
  runMigrations,
} from "@lasoviet/database";

import { normalizeBirthProfile } from "./birth-profile.service.js";
import { createDatabaseBirthProfileRepository } from "./birth-profile.repository.js";

const now = new Date("2026-09-15T00:00:00Z");
const profileInput: BirthProfileV1 = {
  version: 1,
  calendar: { kind: "solar", date: "1990-01-01" },
  time: { precision: "exact_minute", localTime: "12:00" },
  timezone: { offsetMinutes: 420 },
  consentVersion: "2026-09-01",
};

describe("BirthProfileRepository composite creation", () => {
  let container: Awaited<ReturnType<PostgreSqlContainer["start"]>> | undefined;
  let databaseUrl: string;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine")
      .withDatabase("lasoviet_birth_profile_context_test")
      .withUsername("lasoviet")
      .withPassword("lasoviet")
      .start();
    databaseUrl = container.getConnectionUri();
    await runMigrations(databaseUrl);
  }, 120_000);

  afterAll(async () => {
    if (container) {
      await container.stop();
    }
  }, 30_000);

  async function normalized() {
    const result = normalizeBirthProfile(profileInput);
    if (!result.ok) throw new Error("NORMALIZATION_FAILED");
    return result.value;
  }

  async function repository() {
    return createDatabaseBirthProfileRepository(createDatabase(databaseUrl));
  }

  it("keeps no-context creation unchanged and supports account ownership", async () => {
    const database = createDatabase(databaseUrl);
    await database.insert(authUsers).values({
      id: "birth-context-account",
      name: "Account",
      email: "birth-context-account@example.test",
    });
    const actor: CurrentActor = {
      kind: "account",
      userId: "birth-context-account",
      sessionId: "session-account",
      requestId: "request-account",
    };
    const record = await (await repository()).create({
      actor,
      originalInput: profileInput,
      normalized: await normalized(),
      now,
    });
    expect(record).toMatchObject({ revisionNumber: 1, originalInput: profileInput });
    if (record === null) throw new Error("CREATE_FAILED");
    expect(
      await database.select().from(birthProfileReadingContexts).where(
        eq(birthProfileReadingContexts.profileId, record.profileId),
      ),
    ).toEqual([]);
    expect(
      await database.select().from(birthProfileReadingContextRevisions).where(
        eq(birthProfileReadingContextRevisions.profileId, record.profileId),
      ),
    ).toEqual([]);
    expect(
      await database.select().from(birthProfileReadingContextMutationReceipts).where(
        eq(birthProfileReadingContextMutationReceipts.profileId, record.profileId),
      ),
    ).toEqual([]);
    expect(
      await database.select().from(auditLogs).where(
        eq(auditLogs.targetId, record.profileId),
      ),
    ).toMatchObject([{ action: "birth_profile.created" }]);
  });

  it("writes context records and sanitized audits for active anonymous ownership", async () => {
    const database = createDatabase(databaseUrl);
    await database.insert(authAnonymousActors).values({
      id: "birth-context-anonymous",
      expiresAt: new Date(now.getTime() + 60_000),
    });
    const actor: CurrentActor = {
      kind: "anonymous",
      anonymousActorId: "birth-context-anonymous",
      sessionId: "session-anonymous",
      requestId: "request-anonymous".repeat(16),
      expiresAt: new Date(now.getTime() + 60_000).toISOString(),
    };
    const record = await (await repository()).createWithContext({
      actor,
      originalInput: profileInput,
      normalized: await normalized(),
      readingContext: { version: 1, lifeStage: "early_career" },
      now,
    });
    if (record === null) throw new Error("CREATE_FAILED");
    expect(
      await database.select().from(birthProfileRevisions).where(
        eq(birthProfileRevisions.profileId, record.profileId),
      ),
    ).toHaveLength(1);
    expect(
      await database.select().from(birthProfileReadingContextRevisions).where(
        eq(birthProfileReadingContextRevisions.profileId, record.profileId),
      ),
    ).toHaveLength(1);
    expect(
      await database.select().from(birthProfileReadingContexts).where(
        eq(birthProfileReadingContexts.profileId, record.profileId),
      ),
    ).toHaveLength(1);
    expect(
      await database.select().from(birthProfileReadingContextMutationReceipts).where(
        eq(birthProfileReadingContextMutationReceipts.profileId, record.profileId),
      ),
    ).toMatchObject([
      {
        idempotencyKey: expect.stringMatching(/^.{1,128}$/),
      },
    ]);
    const audits = await database.select().from(auditLogs).where(
      eq(auditLogs.targetId, record.profileId),
    );
    expect(audits).toHaveLength(2);
    const contextAudit = audits.find(
      (audit) => audit.action === "birth_profile.reading_context.created",
    );
    expect(contextAudit?.metadata).toEqual({
      profileId: record.profileId,
      revisionId: expect.any(String),
      revisionNumber: 1,
      stateVersion: 1,
      hasLifeStage: true,
      hasTopConcern: false,
      action: "set",
      outcome: "success",
    });
  });

  it("rolls back profile rows and audits when the context constraint rejects data", async () => {
    const database = createDatabase(databaseUrl);
    await database.insert(authUsers).values({
      id: "birth-context-rollback",
      name: "Rollback",
      email: "birth-context-rollback@example.test",
    });
    const actor: CurrentActor = {
      kind: "account",
      userId: "birth-context-rollback",
      sessionId: "session-rollback",
      requestId: "request-rollback",
    };
    await expect(
      (await repository()).createWithContext({
        actor,
        originalInput: profileInput,
        normalized: await normalized(),
        readingContext: { version: 1 } as never,
        now,
      }),
    ).rejects.toThrow();
    expect(
      await database.select().from(birthProfiles).where(
        eq(birthProfiles.userId, actor.userId),
      ),
    ).toEqual([]);
    expect(
      await database.select().from(auditLogs).where(
        eq(auditLogs.requestId, actor.requestId),
      ),
    ).toEqual([]);
  });
});
