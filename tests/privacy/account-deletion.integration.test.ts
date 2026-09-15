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
  accountBehaviorProfiles,
  analyticsEvents,
  analyticsFraudIpRecords,
  analyticsVisitors,
  authAnonymousActors,
  authSessions,
  authUsers,
  birthProfiles,
  commerceOrders,
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
      service.record(actor, "privacy", "2026-08-31", ["birth_profile"]),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "CONSENT_VERSION_UNKNOWN" },
    });
    await expect(
      service.record(actor, "privacy", "2026-09-01", ["birth_profile"]),
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

  it("reuses one consent when concurrent duplicate requests race", async () => {
    const database = createDatabase(databaseUrl);
    await database.insert(authUsers).values({
      id: "consent-race-account",
      name: "Consent Race Account",
      email: "consent-race-account@example.test",
    });
    const service = createConsentService({
      repository: createDatabaseConsentRepository(database),
      documentVersions: { privacy: ["2026-09-01"] },
      now: () => new Date("2026-09-02T00:00:00Z"),
    });
    const actor = {
      kind: "account" as const,
      userId: "consent-race-account",
      sessionId: "consent-race-session",
      requestId: "consent-race-request",
    };

    const [first, second] = await Promise.all([
      service.record(actor, "privacy", "2026-09-01", ["birth_profile"]),
      service.record(actor, "privacy", "2026-09-01", ["birth_profile"]),
    ]);

    expect(first).toMatchObject({ ok: true });
    expect(second).toMatchObject({ ok: true });
    if (!first.ok || !second.ok) {
      return;
    }
    expect(first.value.id).toBe(second.value.id);
    expect(
      (await database.select().from(consents)).filter(
        (consent) => consent.userId === actor.userId,
      ),
    ).toHaveLength(1);
    await database.$client.end();
  }, 120_000);

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
      id: "anonymous-unexpired",
      name: "Anonymous User",
      email: "anonymous-unexpired@example.test",
      isAnonymous: true,
    });
    await database.insert(authSessions).values({
      id: "anonymous-unexpired-session",
      userId: "anonymous-unexpired",
      token: "anonymous-unexpired-token",
      expiresAt: new Date("2026-09-02T00:00:00Z"),
    });
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
    await database.insert(commerceOrders).values({
      id: "f0c6314b-3a7b-4ad9-b8b8-6e5f6e1f5a0d",
      invoiceNumber: "LSV-anonymous-legacy",
      chartId: "anonymous-expired-chart",
      chartVersionId: "anonymous-expired-chart-version",
      ownerId: "anonymous-expired",
      sku: "ZIWEI-IDENTITY-P0",
      amount: 79_000,
      currency: "VND",
      locale: "vi",
    });
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
    expect((await database.select().from(authUsers)).find(
      (user) => user.id === "anonymous-unexpired",
    )).toBeUndefined();
    expect((await database.select().from(authSessions)).find(
      (session) => session.id === "anonymous-unexpired-session",
    )).toBeUndefined();
    expect((await database.select().from(commerceOrders)).find(
      (order) => order.invoiceNumber === "LSV-anonymous-legacy",
    )).toMatchObject({
      ownerId: "anonymous-expired",
      chartId: "anonymous-expired-chart",
    });
    await database.$client.end();
  }, 120_000);

  it("makes purge win over cancellation at the exact recovery deadline", async () => {
    const database = createDatabase(databaseUrl);
    const userId = "deadline-account";
    const requestedAt = new Date("2026-09-01T00:00:00Z");
    const deadline = new Date("2026-10-01T00:00:00Z");
    await database.insert(authUsers).values({
      id: userId,
      name: "Deadline Account",
      email: "deadline-account@example.test",
    });
    const requester = createAccountDeletionService({
      repository: createDatabaseDeletionRepository(database),
      now: () => requestedAt,
    });
    await requester.request(userId, "deadline-request");
    const boundary = createAccountDeletionService({
      repository: createDatabaseDeletionRepository(database),
      now: () => deadline,
    });

    const [cancelled, purged] = await Promise.all([
      boundary.cancel(userId, "deadline-cancel"),
      boundary.purgeExpired(),
    ]);

    expect(cancelled).toMatchObject({
      ok: false,
      error: { code: "DELETION_RECOVERY_EXPIRED" },
    });
    expect(purged).toHaveLength(1);
    await database.$client.end();
  }, 120_000);
  it("permanently purges account-linked analytics for expired deletion requests while preserving second owner", async () => {
    const database = createDatabase(databaseUrl);
    const targetUserId = "deletion-analytics-target";
    const secondUserId = "deletion-analytics-second";

    await database.insert(authUsers).values([
      {
        id: targetUserId,
        name: "Target Deletion User",
        email: "target-del@example.test",
      },
      {
        id: secondUserId,
        name: "Second User",
        email: "second-user@example.test",
      },
    ]);

    const targetVisitorId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const secondVisitorId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const now = new Date("2026-09-01T00:00:00Z");

    await database.insert(analyticsVisitors).values([
      {
        id: targetVisitorId,
        userId: targetUserId,
        linkedAt: now,
        expiresAt: null,
        firstSeenAt: now,
        lastSeenAt: now,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: secondVisitorId,
        userId: secondUserId,
        linkedAt: now,
        expiresAt: null,
        firstSeenAt: now,
        lastSeenAt: now,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    await database.insert(analyticsEvents).values([
      {
        id: "evt-target-1",
        idempotencyKey: "idem-target-1",
        visitorId: targetVisitorId,
        userId: targetUserId,
        name: "landing",
        properties: { landing_page: "/home" },
        unlinkedExpiresAt: null,
        occurredAt: now,
        createdAt: now,
      },
      {
        id: "evt-second-1",
        idempotencyKey: "idem-second-1",
        visitorId: secondVisitorId,
        userId: secondUserId,
        name: "landing",
        properties: { landing_page: "/home" },
        unlinkedExpiresAt: null,
        occurredAt: now,
        createdAt: now,
      },
    ]);

    await database.insert(analyticsFraudIpRecords).values([
      {
        id: "fraud-target-1",
        ip: "203.0.113.1",
        action: "probe",
        visitorId: targetVisitorId,
        userId: targetUserId,
        expiresAt: new Date(now.getTime() + 365 * 24 * 3600 * 1000),
        createdAt: now,
      },
      {
        id: "fraud-second-1",
        ip: "203.0.113.2",
        action: "probe",
        visitorId: secondVisitorId,
        userId: secondUserId,
        expiresAt: new Date(now.getTime() + 365 * 24 * 3600 * 1000),
        createdAt: now,
      },
    ]);

    await database.insert(accountBehaviorProfiles).values([
      {
        id: "beh-target-1",
        userId: targetUserId,
        version: 1,
        lockedSectionsViewed: ["career"],
        topupPacksViewed: [],
        laBalance: 50,
        reportReadDepthPercent: 25,
        interestTopics: ["career"],
        lastEventAt: now,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "beh-second-1",
        userId: secondUserId,
        version: 1,
        lockedSectionsViewed: ["health"],
        topupPacksViewed: [],
        laBalance: 100,
        reportReadDepthPercent: 75,
        interestTopics: ["health"],
        lastEventAt: now,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const requestedAt = new Date("2026-09-01T00:00:00Z");
    const requester = createAccountDeletionService({
      repository: createDatabaseDeletionRepository(database),
      now: () => requestedAt,
    });
    const requestResult = await requester.request(targetUserId, "req-target-del");
    expect(requestResult.ok).toBe(true);

    const purgeTime = new Date("2026-10-02T00:00:00Z");
    const purger = createAccountDeletionService({
      repository: createDatabaseDeletionRepository(database),
      now: () => purgeTime,
    });
    const purgedIds = await purger.purgeExpired();
    expect(purgedIds).toHaveLength(1);

    const targetEvents = (await database.select().from(analyticsEvents)).filter(
      (e) => e.userId === targetUserId,
    );
    expect(targetEvents).toHaveLength(0);

    const targetVisitors = (await database.select().from(analyticsVisitors)).filter(
      (v) => v.userId === targetUserId,
    );
    expect(targetVisitors).toHaveLength(0);

    const targetFraud = (await database.select().from(analyticsFraudIpRecords)).filter(
      (f) => f.userId === targetUserId,
    );
    expect(targetFraud).toHaveLength(0);

    const targetBehavior = (await database.select().from(accountBehaviorProfiles)).filter(
      (b) => b.userId === targetUserId,
    );
    expect(targetBehavior).toHaveLength(0);

    const secondEvents = (await database.select().from(analyticsEvents)).filter(
      (e) => e.userId === secondUserId,
    );
    expect(secondEvents).toHaveLength(1);

    const secondVisitors = (await database.select().from(analyticsVisitors)).filter(
      (v) => v.userId === secondUserId,
    );
    expect(secondVisitors).toHaveLength(1);

    const secondFraud = (await database.select().from(analyticsFraudIpRecords)).filter(
      (f) => f.userId === secondUserId,
    );
    expect(secondFraud).toHaveLength(1);

    const secondBehavior = (await database.select().from(accountBehaviorProfiles)).filter(
      (b) => b.userId === secondUserId,
    );
    expect(secondBehavior).toHaveLength(1);

    const [delReq] = (await database.select().from(deletionRequests)).filter(
      (d) => d.userId === targetUserId,
    );
    expect(delReq?.status).toBe("purged");

    const outboxEntries = (await database.select().from(outbox)).filter(
      (e) => e.actorId === targetUserId,
    );
    expect(outboxEntries.some((e) => e.eventType === "account.purge.requested.v1")).toBe(true);

    await database.$client.end();
  });
});
