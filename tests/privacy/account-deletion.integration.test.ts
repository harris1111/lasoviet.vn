import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createConsentService,
  createDatabaseAnonymousRetentionRepository,
  createDatabaseConsentRepository,
  createDatabaseDeletionRepository,
  createAccountDeletionService,
  createAnonymousRetentionService,
} from "../../packages/backend/src/index.js";
import {
  authAnonymousActors,
  authSessions,
  authUsers,
  birthProfiles,
  consents,
  createDatabase,
  deletionRequests,
  outbox,
  runMigrations,
} from "../../packages/database/src/index.js";

describe("account deletion integration", () => {
  let container:
    | Awaited<ReturnType<PostgreSqlContainer["start"]>>
    | undefined;
  let databaseUrl: string;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine")
      .withDatabase("lasoviet_privacy_test")
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

  it("records supported consent and rejects an unknown document version", async () => {
    const database = createDatabase(databaseUrl);
    await database.insert(authUsers).values({
      id: "consent-account",
      name: "Consent Account",
      email: "consent-account@example.test",
    });
    const service = createConsentService({
      repository: createDatabaseConsentRepository(database),
      documentVersions: { privacy: ["2026-09-01"] },
      now: () => new Date("2026-09-01T00:00:00Z"),
    });
    const actor = {
      kind: "account" as const,
      userId: "consent-account",
      sessionId: "consent-session",
      requestId: "consent-request",
    };

    await expect(
      service.record(actor, "privacy", "2026-08-31", "birth_profile"),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "CONSENT_VERSION_UNKNOWN" },
    });
    await expect(
      service.record(actor, "privacy", "2026-09-01", "birth_profile"),
    ).resolves.toMatchObject({ ok: true });

    const [consent] = await database
      .select()
      .from(consents);
    expect(consent).toMatchObject({
      documentKey: "privacy",
      documentVersion: "2026-09-01",
      purpose: "birth_profile",
    });
    await database.$client.end();
  });

  it("revokes sessions, allows recovery before 30 days, and emits an opaque purge event", async () => {
    const database = createDatabase(databaseUrl);
    const userId = "deletion-account";
    await database.insert(authUsers).values({
      id: userId,
      name: "Deletion Account",
      email: "deletion-account@example.test",
    });
    await database.insert(authSessions).values([
      {
        id: "deletion-session-1",
        userId,
        token: "deletion-token-1",
        expiresAt: new Date("2026-10-01T00:00:00Z"),
      },
      {
        id: "deletion-session-2",
        userId,
        token: "deletion-token-2",
        expiresAt: new Date("2026-10-01T00:00:00Z"),
      },
    ]);
    const requestedAt = new Date("2026-09-01T00:00:00Z");
    const service = createAccountDeletionService({
      repository: createDatabaseDeletionRepository(database),
      now: () => requestedAt,
    });

    await expect(service.request(userId, "deletion-request")).resolves.toMatchObject({
      ok: true,
      value: { recoverUntil: "2026-10-01T00:00:00.000Z" },
    });
    await expect(service.request(userId, "deletion-request-duplicate")).resolves.toMatchObject({
      ok: false,
      error: { code: "DELETION_ALREADY_REQUESTED" },
    });
    expect(
      await database
        .select()
        .from(authSessions),
    ).toEqual([]);

    await expect(service.cancel(userId, "deletion-cancel")).resolves.toMatchObject({
      ok: true,
    });
    await expect(service.request(userId, "deletion-request-2")).resolves.toMatchObject({
      ok: true,
    });

    const purger = createAccountDeletionService({
      repository: createDatabaseDeletionRepository(database),
      now: () => new Date("2026-10-01T00:00:00Z"),
    });
    await expect(purger.purgeExpired()).resolves.toHaveLength(1);

    const [request] = await database
      .select()
      .from(deletionRequests);
    const [event] = await database
      .select()
      .from(outbox);
    expect(request).toMatchObject({ status: "purged" });
    expect(event).toMatchObject({
      eventType: "account.purge.requested.v1",
      payload: { deletionRequestId: request?.id },
    });
    expect(event?.payload).not.toHaveProperty("transaction");
    await database.$client.end();
  });

  it("purges expired anonymous data, permits immediate deletion, and retains linked data", async () => {
    const database = createDatabase(databaseUrl);
    await database.insert(authUsers).values({
      id: "linked-account",
      name: "Linked Account",
      email: "linked-account@example.test",
    });
    await database.insert(authAnonymousActors).values([
      {
        id: "anonymous-unexpired",
        expiresAt: new Date("2026-09-02T00:00:00Z"),
      },
      {
        id: "anonymous-expired",
        expiresAt: new Date("2026-08-31T23:59:59Z"),
      },
      {
        id: "anonymous-linked",
        linkedUserId: "linked-account",
        expiresAt: new Date("2026-08-31T23:59:59Z"),
      },
    ]);
    await database.insert(birthProfiles).values([
      {
        id: "anonymous-unexpired-profile",
        anonymousActorId: "anonymous-unexpired",
        anonymousExpiresAt: new Date("2026-09-02T00:00:00Z"),
      },
      {
        id: "anonymous-expired-profile",
        anonymousActorId: "anonymous-expired",
        anonymousExpiresAt: new Date("2026-08-31T23:59:59Z"),
      },
    ]);
    const service = createAnonymousRetentionService({
      repository: createDatabaseAnonymousRetentionRepository(database),
    });
    const now = new Date("2026-09-01T00:00:00Z");

    await expect(service.purgeActor("anonymous-unexpired", now)).resolves.toMatchObject({
      ok: false,
      error: { code: "ANONYMOUS_NOT_EXPIRED" },
    });
    await expect(service.deleteNow("anonymous-unexpired")).resolves.toMatchObject({
      ok: true,
    });
    await expect(service.purgeExpired(now)).resolves.toEqual([
      "anonymous-expired",
    ]);
    await expect(service.deleteNow("anonymous-linked")).resolves.toMatchObject({
      ok: false,
      error: { code: "ANONYMOUS_ALREADY_LINKED" },
    });
    expect(
      await database
        .select()
        .from(birthProfiles),
    ).toEqual([]);
    expect(
      await database
        .select()
        .from(authAnonymousActors),
    ).toHaveLength(1);
    await database.$client.end();
  }, 120_000);
});
