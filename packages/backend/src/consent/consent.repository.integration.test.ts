import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  analyticsVisitors,
  analyticsEvents,
  analyticsFraudIpRecords,
  auditLogs,
  authAnonymousActors,
  authUsers,
  birthProfiles,
  consents,
  createDatabase,
  runMigrations,
  type Database,
} from "@lasoviet/database";
import { eq } from "drizzle-orm";
import {
  createDatabaseConsentRepository,
  type ConsentRepository,
} from "./consent.repository.js";
import { createDatabaseAnalyticsRepository } from "../analytics/analytics.repository.js";

describe("ConsentRepository integration", () => {
  let container: Awaited<ReturnType<PostgreSqlContainer["start"]>> | undefined;
  let database: Database;
  let repository: ConsentRepository;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:17-alpine").start();
    const url = container.getConnectionUri();
    await runMigrations(url);
    database = createDatabase(url);
    repository = createDatabaseConsentRepository(database);
  }, 60000);

  afterAll(async () => {
    await container?.stop();
  });

  it("records exactly four consent rows and four audit logs atomically sharing timestamp and links account", async () => {
    const userId = "user_consent_1";
    await database.insert(authUsers).values({
      id: userId,
      name: "Consent User 1",
      email: "consent1@test.example",
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const visitorId = "11111111-1111-4111-8111-111111111111";
    const grantedAt = new Date("2026-09-14T10:00:00.000Z");
    const purposes = ["birth_profile", "analytics", "personalization", "offers"] as const;

    // Pre-insert visitor with null userId
    await database.insert(analyticsVisitors).values({
      id: visitorId,
      userId: null,
      consentedAt: null,
      firstSeenAt: grantedAt,
      lastSeenAt: grantedAt,
      expiresAt: new Date(grantedAt.getTime() + 30 * 24 * 3600 * 1000),
      createdAt: grantedAt,
      updatedAt: grantedAt,
    });
    // Pre-insert unlinked event and unlinked fraud IP to prove atomic linking
    await database.insert(analyticsEvents).values({
      id: "evt_unlinked_1",
      idempotencyKey: "idem_evt_1",
      visitorId,
      userId: null,
      name: "landing",
      properties: { landing_page: "/home" },
      occurredAt: grantedAt,
      unlinkedExpiresAt: new Date(grantedAt.getTime() + 30 * 24 * 3600 * 1000),
      createdAt: grantedAt,
    });

    await database.insert(analyticsFraudIpRecords).values({
      id: "fraud_ip_1",
      ip: "203.0.113.1",
      action: "probe",
      visitorId,
      userId: null,
      expiresAt: new Date(grantedAt.getTime() + 365 * 24 * 3600 * 1000),
      createdAt: grantedAt,
    });

    const actor = {
      kind: "account" as const,
      userId,
      sessionId: "sess_1",
      requestId: "req_consent_1",
    };

    const result = await repository.record({
      actor,
      documentKey: "privacy",
      documentVersion: "2026-09-14",
      purposes,
      visitorId,
      grantedAt,
    });

    expect(result.ids).toHaveLength(4);

    // Check 4 consent rows in DB
    const userConsents = await database
      .select()
      .from(consents)
      .where(eq(consents.userId, userId));
    expect(userConsents).toHaveLength(4);
    for (const c of userConsents) {
      expect(purposes).toContain(c.purpose);
      expect(c.grantedAt.toISOString()).toBe(grantedAt.toISOString());
    }

    // Check 4 audit rows in DB
    const userAudits = await database
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.actorId, userId));
    expect(userAudits).toHaveLength(4);
    for (const a of userAudits) {
      expect(a.action).toBe("consent.recorded");
      expect(a.targetType).toBe("consent");
    }

    // Check visitor linking
    const [visitor] = await database
      .select()
      .from(analyticsVisitors)
      .where(eq(analyticsVisitors.id, visitorId));
    expect(visitor).toBeDefined();
    expect(visitor?.userId).toBe(userId);
    expect(visitor?.consentedAt?.toISOString()).toBe(grantedAt.toISOString());
    expect(visitor?.expiresAt).toBeNull();

    // Check prior event and fraud IP linked to user
    const [linkedEvt] = await database
      .select()
      .from(analyticsEvents)
      .where(eq(analyticsEvents.id, "evt_unlinked_1"));
    expect(linkedEvt?.userId).toBe(userId);
    expect(linkedEvt?.unlinkedExpiresAt).toBeNull();

    const [linkedFraud] = await database
      .select()
      .from(analyticsFraudIpRecords)
      .where(eq(analyticsFraudIpRecords.id, "fraud_ip_1"));
    expect(linkedFraud?.userId).toBe(userId);

    // Exact repeat request: must preserve first timestamp and not insert duplicate audits
    const laterTime = new Date("2026-09-14T11:00:00.000Z");
    const repeatResult = await repository.record({
      actor,
      documentKey: "privacy",
      documentVersion: "2026-09-14",
      purposes,
      visitorId,
      grantedAt: laterTime,
    });

    expect(repeatResult.ids).toEqual(result.ids);

    // Still exactly 4 consents and 4 audits
    const userConsentsRepeat = await database
      .select()
      .from(consents)
      .where(eq(consents.userId, userId));
    expect(userConsentsRepeat).toHaveLength(4);
    for (const c of userConsentsRepeat) {
      // Timestamp preserved at first granted time
      expect(c.grantedAt.toISOString()).toBe(grantedAt.toISOString());
    }

    const userAuditsRepeat = await database
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.actorId, userId));
    expect(userAuditsRepeat).toHaveLength(4); // No new audit rows!
  });

  it("marks visitor consent for anonymous actor while preserving unlinked expiry", async () => {
    const anonActorId = "anon_consent_1";
    await database.insert(authAnonymousActors).values({
      id: anonActorId,
      token: "anon_token_1",
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
      createdAt: new Date(),
    });

    const visitorId = "22222222-2222-4222-8222-222222222222";
    const grantedAt = new Date("2026-09-14T12:00:00.000Z");
    const purposes = ["birth_profile", "analytics", "personalization", "offers"] as const;

    const actor = {
      kind: "anonymous" as const,
      anonymousActorId: anonActorId,
      sessionId: "sess_anon_1",
      requestId: "req_anon_1",
    };

    const result = await repository.record({
      actor,
      documentKey: "privacy",
      documentVersion: "2026-09-14",
      purposes,
      visitorId,
      grantedAt,
    });

    expect(result.ids).toHaveLength(4);

    const [visitor] = await database
      .select()
      .from(analyticsVisitors)
      .where(eq(analyticsVisitors.id, visitorId));
    expect(visitor?.userId).toBeNull();
    expect(visitor?.consentedAt?.toISOString()).toBe(grantedAt.toISOString());
    expect(visitor?.expiresAt).not.toBeNull(); // 30-day unlinked expiry preserved!
  });

  it("rolls back all consent rows and audits atomically if visitor linking fails", async () => {
    const userId = "user_victim_1";
    await database.insert(authUsers).values({
      id: userId,
      name: "Victim User",
      email: "victim@test.example",
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const otherUserId = "user_other_owner";
    await database.insert(authUsers).values({
      id: otherUserId,
      name: "Other User",
      email: "other@test.example",
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const conflictVisitorId = "33333333-3333-4333-8333-333333333333";
    await database.insert(analyticsVisitors).values({
      id: conflictVisitorId,
      userId: otherUserId,
      linkedAt: new Date(),
      expiresAt: null,
      consentedAt: new Date(),
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const actor = {
      kind: "account" as const,
      userId,
      sessionId: "sess_victim",
      requestId: "req_victim",
    };

    await expect(
      repository.record({
        actor,
        documentKey: "privacy",
        documentVersion: "2026-09-14",
        purposes: ["birth_profile", "analytics", "personalization", "offers"],
        visitorId: conflictVisitorId,
        grantedAt: new Date(),
      }),
    ).rejects.toThrow("PROFILE_FORBIDDEN");

    // Proves atomic rollback: zero consents and zero audits exist for userId!
    const userConsents = await database.select().from(consents).where(eq(consents.userId, userId));
    expect(userConsents).toHaveLength(0);
    const userAudits = await database.select().from(auditLogs).where(eq(auditLogs.actorId, userId));
    expect(userAudits).toHaveLength(0);
  });

  it("records four consents and audits when visitorId is omitted", async () => {
    const userId = "user_no_visitor";
    await database.insert(authUsers).values({
      id: userId,
      name: "No Visitor User",
      email: "novisitor@test.example",
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const actor = {
      kind: "account" as const,
      userId,
      sessionId: "sess_nv",
      requestId: "req_nv",
    };

    const result = await repository.record({
      actor,
      documentKey: "privacy",
      documentVersion: "2026-09-14",
      purposes: ["birth_profile", "analytics", "personalization", "offers"],
      grantedAt: new Date("2026-09-14T14:00:00Z"),
    });

    expect(result.ids).toHaveLength(4);
    const userConsents = await database.select().from(consents).where(eq(consents.userId, userId));
    expect(userConsents).toHaveLength(4);
  });

  it("associates birth profile with visitor idempotently and enforces ownership", async () => {
    const analyticsRepo = createDatabaseAnalyticsRepository(database);
    const userId = "user_profile_owner";
    await database.insert(authUsers).values({
      id: userId,
      name: "Profile Owner",
      email: "powner@test.example",
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const profileId = "bp_test_assoc_1";
    await database.insert(birthProfiles).values({
      id: profileId,
      userId,
      version: 1,
      calendarKind: "solar",
      birthDate: "1990-01-01",
      timePrecision: "unknown",
      timezoneZone: "Asia/Ho_Chi_Minh",
      gender: "male",
      consentVersion: "2026-09-14",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const visitorId = "44444444-4444-4444-8444-444444444444";
    await database.insert(analyticsVisitors).values({
      id: visitorId,
      userId: null,
      consentedAt: new Date(),
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Associates successfully
    const res = await analyticsRepo.associateBirthProfile({
      visitorId,
      birthProfileId: profileId,
      owner: { userId },
      now: new Date(),
    });
    expect(res.ok).toBe(true);

    // Idempotent retry returns ok: true
    const resRetry = await analyticsRepo.associateBirthProfile({
      visitorId,
      birthProfileId: profileId,
      owner: { userId },
      now: new Date(),
    });
    expect(resRetry.ok).toBe(true);

    // Wrong owner fails closed with PROFILE_FORBIDDEN
    const resWrongOwner = await analyticsRepo.associateBirthProfile({
      visitorId,
      birthProfileId: profileId,
      owner: { userId: "other_attacker_user" },
      now: new Date(),
    });
    expect(resWrongOwner).toEqual({ ok: false, error: "PROFILE_FORBIDDEN" });
  });
});
