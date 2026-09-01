import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createDatabase } from "../client.js";
import {
  authAccounts,
  authAnonymousActors,
  authUsers,
} from "./auth.js";
import {
  birthProfileRevisions,
  birthProfiles,
} from "./birth-profile.js";
import { consents, deletionRequests } from "./privacy.js";
import { enqueueOutbox, outbox } from "./outbox.js";
import { auditLogs } from "./audit.js";
import { runMigrations } from "../migrate.js";

describe("database schema integration", () => {
  let container:
    | Awaited<ReturnType<PostgreSqlContainer["start"]>>
    | undefined;
  let databaseUrl: string;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine")
      .withDatabase("lasoviet_test")
      .withUsername("lasoviet")
      .withPassword("lasoviet")
      .start();
    databaseUrl = container.getConnectionUri();
  }, 120_000);

  afterAll(async () => {
    if (container) {
      await container.stop();
    }
  }, 30_000);

  it("applies empty and repeat migrations to one converged schema", async () => {
    const first = await runMigrations(databaseUrl);
    const second = await runMigrations(databaseUrl);

    expect(first.appliedMigrations).toEqual(second.appliedMigrations);
    expect(first.appliedMigrations.length).toBeGreaterThan(0);
  });

  it("enforces identity, ownership, privacy, and outbox integrity", async () => {
    const database = createDatabase(databaseUrl);
    const userId = "user_schema_test";
    const anonymousActorId = "anonymous_schema_test";
    const accountId = "account_schema_test";
    const profileId = "profile_schema_test";

    await database.insert(authUsers).values({
      id: userId,
      name: "Schema Test User",
      email: "schema-test@example.test",
    });

    await expect(
      database.insert(authUsers).values({
        id: "user_schema_duplicate",
        name: "Duplicate User",
        email: "schema-test@example.test",
      }),
    ).rejects.toBeDefined();

    await database.insert(authAccounts).values({
      id: accountId,
      userId,
      providerId: "credential",
      accountId: "schema-test@example.test",
    });

    await expect(
      database.insert(authAccounts).values({
        id: "account_schema_duplicate",
        userId,
        providerId: "credential",
        accountId: "schema-test@example.test",
      }),
    ).rejects.toBeDefined();

    await database.insert(consents).values({
      id: "consent_schema_test",
      userId,
      documentKey: "privacy",
      documentVersion: "2026-09-01",
      purpose: "birth_profile",
    });
    await database.insert(deletionRequests).values({
      id: "deletion_schema_test",
      userId,
      requestedAt: new Date("2026-09-01T00:00:00Z"),
      recoverUntil: new Date("2026-10-01T00:00:00Z"),
      purgeAfter: new Date("2026-10-01T00:00:00Z"),
    });

    await database.insert(authAnonymousActors).values({
      id: anonymousActorId,
      expiresAt: new Date("2026-09-02T00:00:00Z"),
    });
    await database.insert(birthProfiles).values({
      id: profileId,
      anonymousActorId,
      anonymousExpiresAt: new Date("2026-09-02T00:00:00Z"),
    });
    await database.insert(birthProfileRevisions).values({
      id: "profile_revision_schema_test",
      profileId,
      revisionNumber: 1,
      originalInput: { localDate: "1990-01-01", timePrecision: "unknown" },
      normalizedInput: { timePrecision: "unknown" },
      consentVersion: "2026-09-01",
    });

    const insertedEvent = await enqueueOutbox(database, {
      schemaVersion: 1,
      type: "profile.created.v1",
      eventId: "event_schema_test",
      occurredAt: "2026-09-01T00:00:00+00:00",
      traceId: "trace_schema_test",
      actorId: anonymousActorId,
      aggregateType: "account",
      aggregateId: profileId,
      idempotencyKey: "profile-created:profile_schema_test",
      payload: { profileId },
    });

    expect(insertedEvent).toMatchObject({
      eventId: "event_schema_test",
      status: "pending",
      attemptCount: 0,
      leasedUntil: null,
      leasedBy: null,
    });
    await expect(
      enqueueOutbox(database, {
        schemaVersion: 1,
        type: "profile.created.v1",
        eventId: "event_schema_duplicate",
        occurredAt: "2026-09-01T00:00:00+00:00",
        traceId: "trace_schema_test",
        actorId: anonymousActorId,
        aggregateType: "account",
        aggregateId: profileId,
        idempotencyKey: "profile-created:profile_schema_test",
        payload: { profileId },
      }),
    ).rejects.toMatchObject({ code: "OUTBOX_DUPLICATE_KEY" });

    await database.insert(auditLogs).values({
      actorId: anonymousActorId,
      action: "profile.created",
      targetType: "birth_profile",
      targetId: profileId,
      requestId: "request_schema_test",
      metadata: { source: "integration-test" },
    });

    const [profile] = await database
      .select()
      .from(birthProfiles);
    expect(profile).toMatchObject({
      id: profileId,
      anonymousActorId,
      anonymousExpiresAt: new Date("2026-09-02T00:00:00Z"),
    });

    await database.$client.end();
  }, 120_000);
});
