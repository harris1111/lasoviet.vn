import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createDatabase,
  linkAnonymousActorToAccount,
} from "../runtime.js";
import {
  authAccounts,
  authAnonymousActors,
  authSessions,
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
import { notificationDeliveries } from "./notifications.js";

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
      issuer: "local",
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
    await expect(
      database.insert(consents).values({
        id: "consent_schema_test_duplicate",
        userId,
        documentKey: "privacy",
        documentVersion: "2026-09-01",
        purpose: "birth_profile",
      }),
    ).rejects.toBeDefined();
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
    await expect(
      database.insert(birthProfiles).values({
        id: "profile_schema_missing_expiry",
        anonymousActorId,
      }),
    ).rejects.toBeDefined();
    await expect(
      database.insert(birthProfiles).values({
        id: "profile_schema_account_expiry",
        userId,
        anonymousExpiresAt: new Date("2026-09-02T00:00:00Z"),
      }),
    ).rejects.toBeDefined();
    await database.insert(consents).values({
      id: "consent_schema_anonymous",
      anonymousActorId,
      documentKey: "privacy",
      documentVersion: "2026-09-01",
      purpose: "birth_profile",
    });
    await expect(
      database.insert(consents).values({
        id: "consent_schema_anonymous_duplicate",
        anonymousActorId,
        documentKey: "privacy",
        documentVersion: "2026-09-01",
        purpose: "birth_profile",
      }),
    ).rejects.toBeDefined();
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
    const [notification] = await database
      .insert(notificationDeliveries)
      .values({
        idempotencyKey: "auth-email:verification:schema-test",
        kind: "email_verification",
        recipientFingerprint: "recipient-fingerprint-schema-test",
        requestPayload: {
          version: 1,
          kind: "email_verification",
          idempotencyKey: "auth-email:verification:schema-test",
          recipient: "schema-test@example.test",
          locale: "en",
          actionUrl: "https://lasoviet.example/verify",
          requestId: "schema-test-request",
        },
      })
      .returning();

    const [profile] = await database
      .select()
      .from(birthProfiles);
    expect(profile).toMatchObject({
      id: profileId,
      anonymousActorId,
      anonymousExpiresAt: new Date("2026-09-02T00:00:00Z"),
    });
    expect(notification).toMatchObject({
      idempotencyKey: "auth-email:verification:schema-test",
      kind: "email_verification",
      status: "pending",
      attemptCount: 0,
      sendingLeaseExpiresAt: null,
      sentAt: null,
    });

    await database.$client.end();
  }, 120_000);

  it("links an anonymous profile to an account without duplication", async () => {
    const database = createDatabase(databaseUrl);
    const userId = "user_link_test";
    const anonymousActorId = "anonymous_link_test";
    const profileId = "profile_link_test";

    await database.insert(authUsers).values({
      id: userId,
      name: "Linked User",
      email: "linked-user@example.test",
    });
    await database.insert(authUsers).values({
      id: anonymousActorId,
      name: "Anonymous Link User",
      email: "anonymous-link-user@example.test",
      isAnonymous: true,
    });
    await database.insert(authAnonymousActors).values({
      id: anonymousActorId,
      expiresAt: new Date("2026-09-02T00:00:00Z"),
    });
    await database.insert(authSessions).values({
      id: "anonymous_link_session",
      userId: anonymousActorId,
      token: "anonymous-link-token",
      expiresAt: new Date("2026-09-02T00:00:00Z"),
    });
    await database.insert(auditLogs).values({
      actorId: anonymousActorId,
      action: "anonymous.profile.created",
      targetType: "birth_profile",
      targetId: profileId,
      requestId: "anonymous-link-request",
      metadata: {},
    });
    await database.insert(birthProfiles).values({
      id: profileId,
      anonymousActorId,
      anonymousExpiresAt: new Date("2026-09-02T00:00:00Z"),
    });

    await expect(
      linkAnonymousActorToAccount(database, anonymousActorId, userId),
    ).resolves.toMatchObject({
      ok: true,
      value: { anonymousActorId, userId },
    });

    const [profile] = await database
      .select()
      .from(birthProfiles)
      .where(eq(birthProfiles.id, profileId));
    const [actor] = await database
      .select()
      .from(authAnonymousActors)
      .where(eq(authAnonymousActors.id, anonymousActorId));

    expect(profile).toMatchObject({
      id: profileId,
      userId,
      anonymousActorId: null,
      anonymousExpiresAt: null,
    });
    expect(actor).toMatchObject({ id: anonymousActorId, linkedUserId: userId });
    expect(
      (await database.select().from(authUsers)).find(
        (user) => user.id === anonymousActorId,
      ),
    ).toBeUndefined();
    expect(
      (await database.select().from(authSessions)).find(
        (session) => session.id === "anonymous_link_session",
      ),
    ).toBeUndefined();
    expect(
      (await database.select().from(auditLogs)).find(
        (audit) =>
          audit.actorId === anonymousActorId &&
          audit.action === "anonymous.profile.created",
      ),
    ).toBeDefined();

    await database.$client.end();
  }, 120_000);

  it("refuses to link an expired anonymous actor", async () => {
    const database = createDatabase(databaseUrl);
    await database.insert(authUsers).values({
      id: "user_expired_link_test",
      name: "Expired Link User",
      email: "expired-link-user@example.test",
    });
    await database.insert(authAnonymousActors).values({
      id: "anonymous_expired_link_test",
      expiresAt: new Date("2026-08-31T23:59:59Z"),
    });

    await expect(
      linkAnonymousActorToAccount(
        database,
        "anonymous_expired_link_test",
        "user_expired_link_test",
      ),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "ANONYMOUS_LINK_CONFLICT" },
    });
    await database.$client.end();
  }, 120_000);

  it("links an anonymous actor with no profile and removes its old identity", async () => {
    const database = createDatabase(databaseUrl);
    const userId = "user_no_profile_link_test";
    const anonymousActorId = "anonymous_no_profile_link_test";
    await database.insert(authUsers).values([
      {
        id: userId,
        name: "No Profile Link Account",
        email: "no-profile-link-account@example.test",
      },
      {
        id: anonymousActorId,
        name: "No Profile Anonymous User",
        email: "no-profile-anonymous@example.test",
        isAnonymous: true,
      },
    ]);
    await database.insert(authAnonymousActors).values({
      id: anonymousActorId,
      expiresAt: new Date("2026-09-03T00:00:00Z"),
    });
    await database.insert(authSessions).values({
      id: "anonymous_no_profile_link_session",
      userId: anonymousActorId,
      token: "anonymous-no-profile-link-token",
      expiresAt: new Date("2026-09-03T00:00:00Z"),
    });

    await expect(
      linkAnonymousActorToAccount(database, anonymousActorId, userId),
    ).resolves.toMatchObject({
      ok: true,
      value: { anonymousActorId, userId },
    });
    const [actor] = await database
      .select()
      .from(authAnonymousActors)
      .where(eq(authAnonymousActors.id, anonymousActorId));
    expect(actor).toMatchObject({ linkedUserId: userId });
    expect(
      (await database.select().from(authUsers)).find(
        (user) => user.id === anonymousActorId,
      ),
    ).toBeUndefined();
    expect(
      (await database.select().from(authSessions)).find(
        (session) => session.id === "anonymous_no_profile_link_session",
      ),
    ).toBeUndefined();
    await database.$client.end();
  }, 120_000);
});
