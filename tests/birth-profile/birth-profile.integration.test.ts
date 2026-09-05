import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createBirthProfileService,
  createDatabaseBirthProfileRepository,
} from "../../packages/backend/src/index.js";
import {
  authAnonymousActors,
  authUsers,
  birthProfileRevisions,
  birthProfiles,
  createDatabase,
  runMigrations,
} from "../../packages/database/src/index.js";

const input = {
  version: 1 as const,
  calendar: { kind: "solar" as const, date: "1990-01-01" },
  time: { precision: "exact_minute" as const, localTime: "09:30" },
  timezone: { offsetMinutes: 420 },
  consentVersion: "2026-09-01",
};

describe("BirthProfile persistence", () => {
  let container:
    | Awaited<ReturnType<PostgreSqlContainer["start"]>>
    | undefined;
  let databaseUrl: string;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine")
      .withDatabase("lasoviet_birth_profile_test")
      .withUsername("lasoviet")
      .withPassword("lasoviet")
      .start();
    databaseUrl = container.getConnectionUri();
    await runMigrations(databaseUrl);
  }, 120_000);

  afterAll(async () => {
    await container?.stop();
  }, 30_000);

  it("appends revisions and keeps anonymous expiry aligned with the actor", async () => {
    const database = createDatabase(databaseUrl);
    await database.insert(authUsers).values({
      id: "account-1",
      name: "Account One",
      email: "account-1@example.test",
    });
    await database.insert(authAnonymousActors).values({
      id: "anonymous-1",
      expiresAt: new Date("2026-09-02T00:00:00Z"),
    });
    const service = createBirthProfileService({
      repository: createDatabaseBirthProfileRepository(database),
      now: () => new Date("2026-09-01T00:00:00Z"),
    });
    const anonymousActor = {
      kind: "anonymous" as const,
      anonymousActorId: "anonymous-1",
      sessionId: "session-1",
      requestId: "request-1",
      expiresAt: "2026-09-02T00:00:00.000+00:00",
    };

    const created = await service.create(anonymousActor, input);
    expect(created).toMatchObject({ ok: true });
    if (!created.ok) {
      return;
    }
    await expect(
      service.update(anonymousActor, created.value.profileId, {
        ...input,
        time: { precision: "branch_only", branch: "si" },
      }),
    ).resolves.toMatchObject({
      ok: true,
      value: { revisionNumber: 2 },
    });

    const [profile] = await database
      .select()
      .from(birthProfiles);
    const revisions = await database
      .select()
      .from(birthProfileRevisions);
    expect(profile).toMatchObject({
      anonymousActorId: "anonymous-1",
      anonymousExpiresAt: new Date("2026-09-02T00:00:00Z"),
    });
    expect(revisions.map((revision) => revision.revisionNumber)).toEqual([
      1, 2,
    ]);
    expect(
      revisions.map(
        (revision) =>
          (revision.originalInput.time as { precision: string }).precision,
      ),
    ).toEqual(["exact_minute", "branch_only"]);

    await expect(
      service.read(
        {
          kind: "account",
          userId: "account-1",
          sessionId: "account-session",
          requestId: "account-request",
        },
        created.value.profileId,
      ),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "PROFILE_NOT_FOUND" },
    });
    await expect(
      service.archive(anonymousActor, created.value.profileId),
    ).resolves.toMatchObject({
      ok: true,
      value: { profileId: created.value.profileId },
    });
    await expect(
      service.read(anonymousActor, created.value.profileId),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "PROFILE_NOT_FOUND" },
    });
    await database.$client.end();
  }, 120_000);

  it("allocates immutable revisions for concurrent owner-authorized updates", async () => {
    const database = createDatabase(databaseUrl);
    await database.insert(authUsers).values({
      id: "concurrent-account",
      name: "Concurrent Account",
      email: "concurrent-account@example.test",
    });
    const service = createBirthProfileService({
      repository: createDatabaseBirthProfileRepository(database),
      now: () => new Date("2026-09-01T00:00:00Z"),
    });
    const actor = {
      kind: "account" as const,
      userId: "concurrent-account",
      sessionId: "concurrent-session",
      requestId: "concurrent-request",
    };
    const created = await service.create(actor, input);
    expect(created).toMatchObject({ ok: true });
    if (!created.ok) {
      return;
    }

    const results = await Promise.all([
      service.update(actor, created.value.profileId, {
        ...input,
        time: { precision: "branch_only", branch: "si" },
      }),
      service.update(actor, created.value.profileId, {
        ...input,
        time: { precision: "branch_only", branch: "wu" },
      }),
    ]);

    expect(results).toEqual([
      expect.objectContaining({ ok: true }),
      expect.objectContaining({ ok: true }),
    ]);
    const revisions = (await database
      .select({
        profileId: birthProfileRevisions.profileId,
        revisionNumber: birthProfileRevisions.revisionNumber,
      })
      .from(birthProfileRevisions)
      .orderBy(birthProfileRevisions.revisionNumber))
      .filter((revision) => revision.profileId === created.value.profileId);
    expect(revisions.map((revision) => revision.revisionNumber)).toEqual([
      1, 2, 3,
    ]);
    await database.$client.end();
  }, 120_000);
});
