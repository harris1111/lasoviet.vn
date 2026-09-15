import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  accountBehaviorProfiles,
  analyticsEvents,
  analyticsFraudIpRecords,
  analyticsVisitors,
  authAnonymousActors,
  authUsers,
  birthProfiles,
  createDatabase,
  runMigrations,
  type Database,
} from "@lasoviet/database";
import { eq, inArray } from "drizzle-orm";
import {
  createDatabaseAnalyticsRepository,
  createDatabaseAnalyticsRepositoryForTest,
  type AnalyticsRepository,
} from "./analytics.repository.js";

function createDeferred(): {
  promise: Promise<void>;
  resolve: () => void;
} {
  let resolve!: () => void;
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe("AnalyticsRepository integration", () => {
  let container: Awaited<ReturnType<PostgreSqlContainer["start"]>> | undefined;
  let database: Database;
  let repository: AnalyticsRepository;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:17-alpine").start();
    const url = container.getConnectionUri();
    await runMigrations(url);
    database = createDatabase(url);
    repository = createDatabaseAnalyticsRepository(database);
  }, 60000);

  afterAll(async () => {
    await container?.stop();
  });

  it("ingests unlinked event, creates unlinked visitor with 30-day expiry, and replays idempotently", async () => {
    const now = new Date("2026-09-14T10:00:00Z");
    const result1 = await repository.recordEvent({
      idempotencyKey: "test_idem_1",
      visitorId: "vis_anon_1",
      name: "landing",
      properties: { landing_page: "/home" },
      ip: "203.0.113.1",
      deviceClass: "mobile",
      locale: "vi",
      pathname: "/home",
      occurredAt: now,
      now,
    });

    expect(result1.ok).toBe(true);
    if (!result1.ok) return;
    expect(result1.replayed).toBe(false);
    expect(result1.event.visitorId).toBe("vis_anon_1");
    expect(result1.event.userId).toBeNull();
    expect(result1.event.unlinkedExpiresAt).toBeDefined();
    expect(result1.event.unlinkedExpiresAt?.getTime()).toBe(
      now.getTime() + 30 * 24 * 60 * 60 * 1000,
    );
    expect(result1.event.ipExpiresAt).toBeDefined();

    const visitor = await repository.findVisitorById("vis_anon_1");
    expect(visitor).toBeDefined();
    expect(visitor?.userId).toBeNull();
    expect(visitor?.expiresAt?.getTime()).toBe(
      now.getTime() + 30 * 24 * 60 * 60 * 1000,
    );

    const result2 = await repository.recordEvent({
      idempotencyKey: "test_idem_1",
      visitorId: "vis_anon_1",
      name: "landing",
      properties: { landing_page: "/home" },
      ip: "203.0.113.1",
      deviceClass: "mobile",
      locale: "vi",
      pathname: "/home",
      occurredAt: now,
      now,
    });
    expect(result2.ok).toBe(true);
    if (!result2.ok) return;
    expect(result2.replayed).toBe(true);
    expect(result2.event.id).toBe(result1.event.id);

    const resultSameNameDifferentProps = await repository.recordEvent({
      idempotencyKey: "test_idem_1",
      visitorId: "vis_anon_1",
      name: "landing",
      properties: { landing_page: "/different-page" },
      ip: "203.0.113.1",
      deviceClass: "mobile",
      locale: "vi",
      pathname: "/home",
      occurredAt: now,
      now,
    });
    expect(resultSameNameDifferentProps).toEqual({
      ok: false,
      error: "IDEMPOTENCY_KEY_CONFLICT",
    });

    const resultDifferentName = await repository.recordEvent({
      idempotencyKey: "test_idem_1",
      visitorId: "vis_anon_1",
      name: "wizard_start",
      properties: {},
      occurredAt: now,
      now,
    });
    expect(resultDifferentName).toEqual({
      ok: false,
      error: "IDEMPOTENCY_KEY_CONFLICT",
    });
  });

  it("handles concurrent identical requests for the same idempotency key without unique storage errors", async () => {
    const now = new Date("2026-09-14T10:30:00Z");
    const key = "concurrent_idem_test";
    const payload = {
      idempotencyKey: key,
      visitorId: "vis_concurrent_1",
      name: "offer_view",
      properties: { offer_id: "starter", placement: "top", sku: "SKU1" },
      pathname: "/offers",
      locale: "vi",
      occurredAt: now,
      now,
    };

    const [res1, res2] = await Promise.all([
      repository.recordEvent({ ...payload }),
      repository.recordEvent({ ...payload }),
    ]);

    expect(res1.ok).toBe(true);
    expect(res2.ok).toBe(true);
    if (!res1.ok || !res2.ok) return;

    const replayedCount = (res1.replayed ? 1 : 0) + (res2.replayed ? 1 : 0);
    expect(replayedCount).toBe(1);
    expect(res1.event.id).toBe(res2.event.id);
  });

  it("handles concurrent account links safely so only one wins and the other gets VISITOR_ACCOUNT_CONFLICT", async () => {
    const now = new Date("2026-09-14T11:00:00Z");
    const user1 = "user_race_1";
    const user2 = "user_race_2";

    await database.insert(authUsers).values([
      { id: user1, name: "User 1", email: "u1@example.com", createdAt: now, updatedAt: now },
      { id: user2, name: "User 2", email: "u2@example.com", createdAt: now, updatedAt: now },
    ]);

    const visitorId = "vis_race_link";
    await repository.getOrCreateVisitor({ id: visitorId, now });

    const [res1, res2] = await Promise.all([
      repository.linkVisitorToAccount({ visitorId, userId: user1, now }),
      repository.linkVisitorToAccount({ visitorId, userId: user2, now }),
    ]);

    const successes = [res1, res2].filter((r) => r.ok);
    const conflicts = [res1, res2].filter((r) => !r.ok && r.error === "VISITOR_ACCOUNT_CONFLICT");

    expect(successes).toHaveLength(1);
    expect(conflicts).toHaveLength(1);
  });

  it("validates birth profile ownership and rejects invalid owner identities", async () => {
    const now = new Date("2026-09-14T12:00:00Z");
    const accountUser = "user_with_profile";
    const otherUser = "user_other_account";
    await database.insert(authUsers).values([
      { id: accountUser, name: "Account Owner", email: "acc@example.com", createdAt: now, updatedAt: now },
      { id: otherUser, name: "Other User", email: "other@example.com", createdAt: now, updatedAt: now },
    ]);

    const anonActorId = "anon_actor_owner";
    await database.insert(authAnonymousActors).values({
      id: anonActorId,
      createdAt: now,
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    });

    const accountProfileId = "bp_account_owned";
    await database.insert(birthProfiles).values({
      id: accountProfileId,
      userId: accountUser,
      calendar: { calendar: "solar", year: 1990, month: 1, day: 1 },
      time: { time: "exact", hour: 10, minute: 0 },
      timezone: { source: "offset", offsetMinutes: 420 },
      gender: "female",
      createdAt: now,
      updatedAt: now,
    });

    const anonProfileId = "bp_anon_owned";
    await database.insert(birthProfiles).values({
      id: anonProfileId,
      anonymousActorId: anonActorId,
      anonymousExpiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      calendar: { calendar: "solar", year: 1992, month: 2, day: 2 },
      time: { time: "exact", hour: 12, minute: 0 },
      timezone: { source: "offset", offsetMinutes: 420 },
      gender: "male",
      createdAt: now,
      updatedAt: now,
    });

    await repository.getOrCreateVisitor({ id: "vis_ownership_check", now });

    // associateBirthProfile: neither owner identity
    const neitherRes = await repository.associateBirthProfile({
      visitorId: "vis_ownership_check",
      birthProfileId: accountProfileId,
      owner: {},
      now,
    });
    expect(neitherRes).toEqual({ ok: false, error: "PROFILE_FORBIDDEN" });

    // associateBirthProfile: both owner identities
    const bothRes = await repository.associateBirthProfile({
      visitorId: "vis_ownership_check",
      birthProfileId: accountProfileId,
      owner: { userId: accountUser, anonymousActorId: anonActorId },
      now,
    });
    expect(bothRes).toEqual({ ok: false, error: "PROFILE_FORBIDDEN" });

    // associateBirthProfile: wrong account owner
    const wrongAccRes = await repository.associateBirthProfile({
      visitorId: "vis_ownership_check",
      birthProfileId: accountProfileId,
      owner: { userId: "other_user" },
      now,
    });
    expect(wrongAccRes).toEqual({ ok: false, error: "PROFILE_FORBIDDEN" });

    // associateBirthProfile: wrong anonymous owner
    const wrongAnonRes = await repository.associateBirthProfile({
      visitorId: "vis_ownership_check",
      birthProfileId: anonProfileId,
      owner: { anonymousActorId: "other_anon" },
      now,
    });
    expect(wrongAnonRes).toEqual({ ok: false, error: "PROFILE_FORBIDDEN" });

    // associateBirthProfile: missing visitor
    const missingVisRes = await repository.associateBirthProfile({
      visitorId: "vis_non_existent",
      birthProfileId: accountProfileId,
      owner: { userId: accountUser },
      now,
    });
    expect(missingVisRes).toEqual({ ok: false, error: "VISITOR_NOT_FOUND" });

    // associateBirthProfile: valid anonymous owner
    const validAnonRes = await repository.associateBirthProfile({
      visitorId: "vis_ownership_check",
      birthProfileId: anonProfileId,
      owner: { anonymousActorId: anonActorId },
      now,
    });
    expect(validAnonRes).toEqual({ ok: true });

    // recordWizardConsent ensures visitor exists (creates if absent) and checks ownership
    const consentTime = new Date("2026-09-14T12:05:00Z");
    const consentNewVisRes = await repository.recordWizardConsent({
      visitorId: "vis_created_by_consent",
      birthProfileId: accountProfileId,
      owner: { userId: accountUser },
      consentedAt: consentTime,
      now: consentTime,
    });
    expect(consentNewVisRes).toEqual({ ok: true });
    const createdByConsent = await repository.findVisitorById("vis_created_by_consent");
    expect(createdByConsent).toBeDefined();
    expect(createdByConsent?.birthProfileId).toBe(accountProfileId);
    expect(createdByConsent?.consentedAt?.toISOString()).toBe(consentTime.toISOString());

    // recordEvent: rejects unverified arbitrary birthProfileId with typed PROFILE_FORBIDDEN
    const eventWithoutOwner = await repository.recordEvent({
      idempotencyKey: "evt_arbitrary_profile_no_owner",
      visitorId: "vis_ownership_check",
      birthProfileId: accountProfileId,
      name: "landing",
      properties: { landing_page: "/home" },
      occurredAt: now,
      now,
    });
    expect(eventWithoutOwner).toEqual({ ok: false, error: "PROFILE_FORBIDDEN" });

    const eventWithWrongOwner = await repository.recordEvent({
      idempotencyKey: "evt_arbitrary_profile_wrong_owner",
      visitorId: "vis_new_unlinked_1",
      userId: otherUser,
      birthProfileId: accountProfileId,
      name: "landing",
      properties: { landing_page: "/home" },
      occurredAt: now,
      now,
    });
    expect(eventWithWrongOwner).toEqual({ ok: false, error: "PROFILE_FORBIDDEN" });

    const eventWithValidOwner = await repository.recordEvent({
      idempotencyKey: "evt_arbitrary_profile_valid_owner",
      visitorId: "vis_new_unlinked_1",
      userId: accountUser,
      birthProfileId: accountProfileId,
      name: "landing",
      properties: { landing_page: "/home" },
      occurredAt: now,
      now,
    });
    expect(eventWithValidOwner.ok).toBe(true);
    if (eventWithValidOwner.ok) {
      expect(eventWithValidOwner.event.birthProfileId).toBe(accountProfileId);
    }
  });

  it("concurrent link vs new event on one visitor, proving the committed event is account-owned with null unlinked expiry", async () => {
    const now = new Date("2026-09-14T16:00:00Z");
    const userId = "user_concurrent_link_event";
    const visitorId = "vis_concurrent_link_event";

    await database.insert(authUsers).values({
      id: userId,
      name: "Conc Link User",
      email: "conclink@example.com",
      createdAt: now,
      updatedAt: now,
    });

    await repository.getOrCreateVisitor({ id: visitorId, now });

    const [linkRes, eventRes] = await Promise.all([
      repository.linkVisitorToAccount({ visitorId, userId, now }),
      repository.recordEvent({
        idempotencyKey: "evt_concurrent_link",
        visitorId,
        name: "landing",
        properties: { landing_page: "/home" },
        occurredAt: now,
        now,
      }),
    ]);

    expect(linkRes.ok).toBe(true);
    expect(eventRes.ok).toBe(true);

    const [persistedEvt] = await database
      .select()
      .from(analyticsEvents)
      .where(eq(analyticsEvents.idempotencyKey, "evt_concurrent_link"));
    expect(persistedEvt).toBeDefined();
    expect(persistedEvt.userId).toBe(userId);
    expect(persistedEvt.unlinkedExpiresAt).toBeNull();
  });

  it("concurrent different first events for one absent visitor, both persist", async () => {
    const now = new Date("2026-09-14T17:00:00Z");
    const visitorId = "vis_absent_concurrent_first";

    const [res1, res2] = await Promise.all([
      repository.recordEvent({
        idempotencyKey: "first_evt_a",
        visitorId,
        name: "landing",
        properties: { landing_page: "/home" },
        occurredAt: now,
        now,
      }),
      repository.recordEvent({
        idempotencyKey: "first_evt_b",
        visitorId,
        name: "offer_view",
        properties: { offer_id: "starter", placement: "top", sku: "SKU1" },
        occurredAt: now,
        now,
      }),
    ]);

    expect(res1.ok).toBe(true);
    expect(res2.ok).toBe(true);
    if (!res1.ok || !res2.ok) return;

    const visitor = await repository.findVisitorById(visitorId);
    expect(visitor).toBeDefined();

    const events = await database
      .select()
      .from(analyticsEvents)
      .where(eq(analyticsEvents.visitorId, visitorId));
    expect(events).toHaveLength(2);
  });

  it("account link backfills behavior profile from pre-link events", async () => {
    const t1 = new Date("2026-09-14T18:00:00Z");
    const t2 = new Date("2026-09-14T18:05:00Z");
    const t3 = new Date("2026-09-14T18:10:00Z");
    const t4 = new Date("2026-09-14T18:15:00Z");
    const t5 = new Date("2026-09-14T18:20:00Z");
    const linkTime = new Date("2026-09-14T18:30:00Z");

    const visitorId = "vis_prelink_behavior";
    const userId = "user_prelink_backfill";

    await database.insert(authUsers).values({
      id: userId,
      name: "Backfill User",
      email: "backfill@example.com",
      createdAt: t1,
      updatedAt: t1,
    });

    await repository.recordEvent({
      idempotencyKey: "prelink_1",
      visitorId,
      name: "locked_preview_view",
      properties: { section_id: "sec_overview" },
      occurredAt: t1,
      now: t1,
    });

    await repository.recordEvent({
      idempotencyKey: "prelink_2",
      visitorId,
      name: "topup_view",
      properties: { pack_id: "pack_medium" },
      occurredAt: t2,
      now: t2,
    });

    await repository.recordEvent({
      idempotencyKey: "prelink_3",
      visitorId,
      name: "report_section_read",
      properties: { read_depth_percent: 65 },
      occurredAt: t3,
      now: t3,
    });

    await repository.recordEvent({
      idempotencyKey: "prelink_4",
      visitorId,
      name: "return_visit",
      properties: { days_since_last_visit: 2, return_count: 2 },
      occurredAt: t4,
      now: t4,
    });

    await repository.recordEvent({
      idempotencyKey: "prelink_5",
      visitorId,
      name: "la_spent",
      properties: { balance_after: 42, amount: 8, sku: "TEST" },
      occurredAt: t5,
      now: t5,
    });

    const beforeProfile = await repository.getAccountBehaviorProfile(userId);
    expect(beforeProfile).toBeNull();

    const linkRes = await repository.linkVisitorToAccount({
      visitorId,
      userId,
      now: linkTime,
    });
    expect(linkRes.ok).toBe(true);

    const backfilledProfile = await repository.getAccountBehaviorProfile(userId);
    expect(backfilledProfile).toBeDefined();
    expect(backfilledProfile?.lockedSectionsViewed).toEqual(["sec_overview"]);
    expect(backfilledProfile?.topupPacksViewed).toEqual(["pack_medium"]);
    expect(backfilledProfile?.reportReadDepthPercent).toBe(65);
    expect(backfilledProfile?.laBalance).toBe(42);
    expect(backfilledProfile?.lastReturnAt).toBe(t4.toISOString());

    const postLinkTime = new Date("2026-09-14T19:00:00Z");
    const postLinkRes = await repository.recordEvent({
      idempotencyKey: "postlink_1",
      visitorId,
      userId,
      name: "locked_preview_view",
      properties: { section_id: "sec_detail" },
      occurredAt: postLinkTime,
      now: postLinkTime,
    });
    expect(postLinkRes.ok).toBe(true);

    const updatedProfile = await repository.getAccountBehaviorProfile(userId);
    expect(updatedProfile?.lockedSectionsViewed).toEqual(["sec_overview", "sec_detail"]);
    expect(updatedProfile?.topupPacksViewed).toEqual(["pack_medium"]);
    expect(updatedProfile?.laBalance).toBe(42);
  });

  it("linked visitor rejects another account profile and anonymous profile", async () => {
    const now = new Date("2026-09-14T20:00:00Z");
    const userA = "user_linked_a";
    const userB = "user_linked_b";
    await database.insert(authUsers).values([
      { id: userA, name: "User A", email: "ua@example.com", createdAt: now, updatedAt: now },
      { id: userB, name: "User B", email: "ub@example.com", createdAt: now, updatedAt: now },
    ]);

    const anonActor = "anon_for_rejection";
    await database.insert(authAnonymousActors).values({
      id: anonActor,
      createdAt: now,
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    });

    const profileUserB = "bp_user_b";
    await database.insert(birthProfiles).values({
      id: profileUserB,
      userId: userB,
      calendar: { calendar: "solar", year: 1995, month: 5, day: 5 },
      time: { time: "exact", hour: 8, minute: 0 },
      timezone: { source: "offset", offsetMinutes: 420 },
      gender: "female",
      createdAt: now,
      updatedAt: now,
    });

    const profileAnon = "bp_anon_actor";
    await database.insert(birthProfiles).values({
      id: profileAnon,
      anonymousActorId: anonActor,
      anonymousExpiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      calendar: { calendar: "solar", year: 1996, month: 6, day: 6 },
      time: { time: "exact", hour: 9, minute: 0 },
      timezone: { source: "offset", offsetMinutes: 420 },
      gender: "male",
      createdAt: now,
      updatedAt: now,
    });

    const visitorId = "vis_linked_to_user_a";
    await repository.linkVisitorToAccount({ visitorId, userId: userA, now });

    const consentAnonRes = await repository.recordWizardConsent({
      visitorId,
      birthProfileId: profileAnon,
      owner: { anonymousActorId: anonActor },
      consentedAt: now,
      now,
    });
    expect(consentAnonRes).toEqual({ ok: false, error: "PROFILE_FORBIDDEN" });

    const consentUserBRes = await repository.recordWizardConsent({
      visitorId,
      birthProfileId: profileUserB,
      owner: { userId: userB },
      consentedAt: now,
      now,
    });
    expect(consentUserBRes).toEqual({ ok: false, error: "PROFILE_FORBIDDEN" });

    const assocAnonRes = await repository.associateBirthProfile({
      visitorId,
      birthProfileId: profileAnon,
      owner: { anonymousActorId: anonActor },
      now,
    });
    expect(assocAnonRes).toEqual({ ok: false, error: "PROFILE_FORBIDDEN" });

    const assocUserBRes = await repository.associateBirthProfile({
      visitorId,
      birthProfileId: profileUserB,
      owner: { userId: userB },
      now,
    });
    expect(assocUserBRes).toEqual({ ok: false, error: "PROFILE_FORBIDDEN" });

    const evtUserBRes = await repository.recordEvent({
      idempotencyKey: "evt_reject_diff_user",
      visitorId,
      userId: userB,
      name: "landing",
      properties: { landing_page: "/home" },
      occurredAt: now,
      now,
    });
    expect(evtUserBRes).toEqual({ ok: false, error: "VISITOR_ACCOUNT_CONFLICT" });

    const evtAnonRes = await repository.recordEvent({
      idempotencyKey: "evt_reject_anon_owner",
      visitorId,
      anonymousActorId: anonActor,
      birthProfileId: profileAnon,
      name: "landing",
      properties: { landing_page: "/home" },
      occurredAt: now,
      now,
    });
    expect(evtAnonRes).toEqual({ ok: false, error: "PROFILE_FORBIDDEN" });
  });

  it("invalid supplied profile on event returns typed error", async () => {
    const now = new Date("2026-09-14T21:00:00Z");
    const visitorId = "vis_profile_errors";
    const user = "user_prof_err";
    await database.insert(authUsers).values({
      id: user,
      name: "Prof Err User",
      email: "proferr@example.com",
      createdAt: now,
      updatedAt: now,
    });

    const noOwnerRes = await repository.recordEvent({
      idempotencyKey: "evt_err_no_owner",
      visitorId,
      birthProfileId: "bp_nonexistent",
      name: "landing",
      properties: { landing_page: "/home" },
      occurredAt: now,
      now,
    });
    expect(noOwnerRes).toEqual({ ok: false, error: "PROFILE_FORBIDDEN" });

    const bothOwnerRes = await repository.recordEvent({
      idempotencyKey: "evt_err_both_owner",
      visitorId,
      userId: user,
      anonymousActorId: "some_anon",
      birthProfileId: "bp_nonexistent",
      name: "landing",
      properties: { landing_page: "/home" },
      occurredAt: now,
      now,
    });
    expect(bothOwnerRes).toEqual({ ok: false, error: "PROFILE_FORBIDDEN" });

    const notFoundRes = await repository.recordEvent({
      idempotencyKey: "evt_err_not_found",
      visitorId,
      userId: user,
      birthProfileId: "bp_completely_missing",
      name: "landing",
      properties: { landing_page: "/home" },
      occurredAt: now,
      now,
    });
    expect(notFoundRes).toEqual({ ok: false, error: "PROFILE_NOT_FOUND" });

    const otherUser = "user_other_owner";
    await database.insert(authUsers).values({
      id: otherUser,
      name: "Other User",
      email: "otherowner@example.com",
      createdAt: now,
      updatedAt: now,
    });
    const otherProfile = "bp_other_user_owned";
    await database.insert(birthProfiles).values({
      id: otherProfile,
      userId: otherUser,
      calendar: { calendar: "solar", year: 1993, month: 3, day: 3 },
      time: { time: "exact", hour: 11, minute: 0 },
      timezone: { source: "offset", offsetMinutes: 420 },
      gender: "female",
      createdAt: now,
      updatedAt: now,
    });

    const forbiddenRes = await repository.recordEvent({
      idempotencyKey: "evt_err_forbidden",
      visitorId,
      userId: user,
      birthProfileId: otherProfile,
      name: "landing",
      properties: { landing_page: "/home" },
      occurredAt: now,
      now,
    });
    expect(forbiddenRes).toEqual({ ok: false, error: "PROFILE_FORBIDDEN" });
  });

  it("idempotency compares logical event content while ignoring server-derived context", async () => {
    const t1 = new Date("2026-09-14T22:00:00Z");
    const visitorId = "vis_idempotency_matrix";
    const baseKey = "matrix_idem_key";

    const basePayload = {
      idempotencyKey: baseKey,
      visitorId,
      name: "landing",
      properties: { landing_page: "/base" },
      ip: "198.51.100.1",
      userAgent: "agent-v1",
      referrer: "https://google.com",
      utmSource: "google",
      utmMedium: "cpc",
      utmCampaign: "brand",
      utmContent: "ad1",
      utmTerm: "lasoviet",
      deviceClass: "desktop",
      locale: "vi",
      pathname: "/base",
      occurredAt: t1,
      now: t1,
    };

    const firstRes = await repository.recordEvent({ ...basePayload });
    expect(firstRes.ok).toBe(true);
    if (!firstRes.ok) return;
    expect(firstRes.replayed).toBe(false);
    expect(firstRes.event.userId).toBeNull();

    const diffProps = await repository.recordEvent({
      ...basePayload,
      properties: { landing_page: "/different" },
    });
    expect(diffProps).toEqual({ ok: false, error: "IDEMPOTENCY_KEY_CONFLICT" });

    const diffIp = await repository.recordEvent({
      ...basePayload,
      ip: "198.51.100.2",
    });
    expect(diffIp.ok).toBe(true);
    if (diffIp.ok) {
      expect(diffIp.replayed).toBe(true);
    }

    const diffAgent = await repository.recordEvent({
      ...basePayload,
      userAgent: "agent-v2",
      referrer: "https://example.com/changed",
      utmSource: "changed",
      deviceClass: "mobile",
      locale: "en",
      pathname: "/changed-context",
    });
    expect(diffAgent.ok).toBe(true);
    if (diffAgent.ok) {
      expect(diffAgent.replayed).toBe(true);
    }

    const diffOccurred = await repository.recordEvent({
      ...basePayload,
      occurredAt: new Date(t1.getTime() + 1000),
    });
    expect(diffOccurred).toEqual({ ok: false, error: "IDEMPOTENCY_KEY_CONFLICT" });

    const linkTime = new Date("2026-09-14T22:30:00Z");
    const accountOwner = "user_idempotency_link";
    await database.insert(authUsers).values({
      id: accountOwner,
      name: "Idem User",
      email: "idem@example.com",
      createdAt: linkTime,
      updatedAt: linkTime,
    });

    const linkRes = await repository.linkVisitorToAccount({
      visitorId,
      userId: accountOwner,
      now: linkTime,
    });
    expect(linkRes.ok).toBe(true);

    const diffUser = await repository.recordEvent({
      ...basePayload,
      userId: "user_intruder",
    });
    expect(diffUser).toEqual({ ok: false, error: "VISITOR_ACCOUNT_CONFLICT" });

    const replayAfterLink = await repository.recordEvent({ ...basePayload });
    expect(replayAfterLink.ok).toBe(true);
    if (!replayAfterLink.ok) return;
    expect(replayAfterLink.replayed).toBe(true);
    expect(replayAfterLink.event.id).toBe(firstRes.event.id);
    expect(replayAfterLink.event.userId).toBe(accountOwner);
    expect(replayAfterLink.event.unlinkedExpiresAt).toBeNull();
  });

  it("caps unlinked visitor and all dependent events at first collection plus 30 days", async () => {
    const day1 = new Date("2026-08-01T00:00:00Z");
    const day20 = new Date("2026-08-20T00:00:00Z");
    const day35 = new Date("2026-09-04T00:00:00Z");
    const visitorId = "vis_rolling_activity";
    await repository.recordEvent({
      idempotencyKey: "day1_event",
      visitorId,
      name: "landing",
      properties: { landing_page: "/day1" },
      occurredAt: day1,
      now: day1,
    });

    const visitorDay1 = await repository.findVisitorById(visitorId);
    expect(visitorDay1?.expiresAt?.getTime()).toBe(day1.getTime() + 30 * 24 * 60 * 60 * 1000);

    await repository.recordEvent({
      idempotencyKey: "day20_event",
      visitorId,
      name: "return_visit",
      properties: { days_since_last_visit: 19, return_count: 2 },
      occurredAt: day20,
      now: day20,
    });

    // Unlinked visitor expiry remains day1 + 30 days; activity on day 20 does NOT extend it
    const visitorDay20 = await repository.findVisitorById(visitorId);
    expect(visitorDay20?.expiresAt?.getTime()).toBe(day1.getTime() + 30 * 24 * 60 * 60 * 1000);

    const eventsBeforePurge = await database
      .select()
      .from(analyticsEvents)
      .where(eq(analyticsEvents.visitorId, visitorId));
    expect(eventsBeforePurge).toHaveLength(2);
    expect(eventsBeforePurge.every((event) =>
      event.unlinkedExpiresAt?.getTime() === visitorDay1?.expiresAt?.getTime()
    )).toBe(true);

    const deletedVisitors = await repository.deleteExpiredUnlinkedVisitors(day35, 100);
    expect(deletedVisitors).toBe(1);

    const purgedVisitor = await repository.findVisitorById(visitorId);
    expect(purgedVisitor).toBeNull();

    const eventsAfterPurge = await database
      .select()
      .from(analyticsEvents)
      .where(eq(analyticsEvents.visitorId, visitorId));
    expect(eventsAfterPurge).toHaveLength(0);
  });

  it("updateInterestTopics restricts to approved FD-078 codes and rejects invalid/free text", async () => {
    const now = new Date("2026-09-14T13:00:00Z");
    const userId = "user_topics_check";
    await database.insert(authUsers).values({
      id: userId,
      name: "Topic User",
      email: "topics@example.com",
      createdAt: now,
      updatedAt: now,
    });

    const validRes = await repository.updateInterestTopics(
      userId,
      ["career", "wellbeing"],
      now,
    );
    expect(validRes.ok).toBe(true);
    if (validRes.ok) {
      expect(validRes.profile.interestTopics).toEqual(["career", "wellbeing"]);
    }

    const invalidRes = await repository.updateInterestTopics(
      userId,
      ["career", "free text unapproved question"],
      now,
    );
    expect(invalidRes).toEqual({ ok: false, error: "INVALID_TOPIC_CODES" });

    const current = await repository.getAccountBehaviorProfile(userId);
    expect(current?.interestTopics).toEqual(["career", "wellbeing"]);
  });

  it("derives fraud IP expiry exactly now + 12 calendar months", async () => {
    const now = new Date("2026-09-14T14:00:00Z");
    await repository.recordFraudIp({
      id: "fraud_exact_expiry",
      ip: "203.0.113.88",
      action: "abuse_probe",
      now,
    });

    const [record] = await database
      .select()
      .from(analyticsFraudIpRecords)
      .where(eq(analyticsFraudIpRecords.id, "fraud_exact_expiry"));
    expect(record).toBeDefined();

    const expectedExpiry = new Date(now.getTime());
    expectedExpiry.setFullYear(expectedExpiry.getFullYear() + 1);
    expect(record.expiresAt.toISOString()).toBe(expectedExpiry.toISOString());
  });

  it("serializes concurrent first events for same user so both persist deterministically", async () => {
    const now = new Date("2026-09-14T15:00:00Z");
    const userId = "user_concurrent_behavior";
    await database.insert(authUsers).values({
      id: userId,
      name: "Conc User",
      email: "conc@example.com",
      createdAt: now,
      updatedAt: now,
    });

    const visitorId = "vis_conc_behavior";
    await repository.linkVisitorToAccount({ visitorId, userId, now });

    const [evt1, evt2] = await Promise.all([
      repository.recordEvent({
        idempotencyKey: "conc_bhv_1",
        visitorId,
        userId,
        name: "locked_preview_view",
        properties: { section_id: "sec_alpha", sku: "SKU1" },
        occurredAt: now,
        now,
      }),
      repository.recordEvent({
        idempotencyKey: "conc_bhv_2",
        visitorId,
        userId,
        name: "topup_view",
        properties: { pack_id: "pack_beta", placement: "modal" },
        occurredAt: now,
        now,
      }),
    ]);

    expect(evt1.ok).toBe(true);
    expect(evt2.ok).toBe(true);

    const profile = await repository.getAccountBehaviorProfile(userId);
    expect(profile?.lockedSectionsViewed).toContain("sec_alpha");
    expect(profile?.topupPacksViewed).toContain("pack_beta");
  });

  it("preserves raw linked event history, scrubs 12-month IP, and cascades account deletion", async () => {
    const baseTime = new Date("2026-09-14T00:00:00Z");
    const past13Months = new Date("2025-08-01T00:00:00Z");

    const linkedUser = "user_scrub_cascade";
    await database.insert(authUsers).values({
      id: linkedUser,
      name: "Scrub User",
      email: "scrub@example.com",
      createdAt: baseTime,
      updatedAt: baseTime,
    });

    const visitorId = "vis_scrub_cascade";
    await repository.linkVisitorToAccount({ visitorId, userId: linkedUser, now: baseTime });

    await repository.recordEvent({
      idempotencyKey: "evt_scrub_test",
      visitorId,
      userId: linkedUser,
      name: "return_visit",
      properties: { days_since_last_visit: 1, return_count: 1 },
      ip: "198.51.100.77",
      occurredAt: past13Months,
      now: past13Months,
    });

    const scrubbed = await repository.scrubExpiredIp(baseTime, 100);
    expect(scrubbed).toBe(1);

    const [evt] = await database
      .select()
      .from(analyticsEvents)
      .where(eq(analyticsEvents.idempotencyKey, "evt_scrub_test"));
    expect(evt).toBeDefined();
    expect(evt.ip).toBeNull();
    expect(evt.ipExpiresAt).toBeNull();
    expect(evt.userId).toBe(linkedUser);

    const replayAfterScrub = await repository.recordEvent({
      idempotencyKey: "evt_scrub_test",
      visitorId,
      userId: linkedUser,
      name: "return_visit",
      properties: { days_since_last_visit: 1, return_count: 1 },
      ip: "198.51.100.77",
      userAgent: "re-derived-agent",
      referrer: "https://example.com/re-derived",
      utmSource: "re-derived",
      deviceClass: "mobile",
      locale: "en",
      pathname: "/re-derived",
      occurredAt: past13Months,
      now: baseTime,
    });
    expect(replayAfterScrub.ok).toBe(true);
    if (replayAfterScrub.ok) {
      expect(replayAfterScrub.replayed).toBe(true);
      expect(replayAfterScrub.event.id).toBe(evt.id);
    }

    const changedName = await repository.recordEvent({
      idempotencyKey: "evt_scrub_test",
      visitorId,
      userId: linkedUser,
      name: "landing",
      properties: { days_since_last_visit: 1, return_count: 1 },
      occurredAt: past13Months,
      now: baseTime,
    });
    expect(changedName).toEqual({
      ok: false,
      error: "IDEMPOTENCY_KEY_CONFLICT",
    });

    const changedProperties = await repository.recordEvent({
      idempotencyKey: "evt_scrub_test",
      visitorId,
      userId: linkedUser,
      name: "return_visit",
      properties: { days_since_last_visit: 2, return_count: 1 },
      occurredAt: past13Months,
      now: baseTime,
    });
    expect(changedProperties).toEqual({
      ok: false,
      error: "IDEMPOTENCY_KEY_CONFLICT",
    });

    const changedOccurredAt = await repository.recordEvent({
      idempotencyKey: "evt_scrub_test",
      visitorId,
      userId: linkedUser,
      name: "return_visit",
      properties: { days_since_last_visit: 1, return_count: 1 },
      occurredAt: new Date(past13Months.getTime() + 1000),
      now: baseTime,
    });
    expect(changedOccurredAt).toEqual({
      ok: false,
      error: "IDEMPOTENCY_KEY_CONFLICT",
    });

    await database.delete(authUsers).where(eq(authUsers.id, linkedUser));

    const eventsAfterCascade = await database
      .select()
      .from(analyticsEvents)
      .where(eq(analyticsEvents.userId, linkedUser));
    expect(eventsAfterCascade).toHaveLength(0);

    const visitorAfterCascade = await repository.findVisitorById(visitorId);
    expect(visitorAfterCascade).toBeNull();

    const profileAfterCascade = await repository.getAccountBehaviorProfile(linkedUser);
    expect(profileAfterCascade).toBeNull();
  });

  it("rechecks eligibility in DELETE statement so items linked concurrently after selection survive purge", async () => {
    const t0 = new Date("2026-08-01T00:00:00Z");
    const purgeTime = new Date("2026-09-10T00:00:00Z");
    const userId = "user_purge_race";
    const visitorId = "vis_purge_race";

    await database.insert(authUsers).values({
      id: userId,
      name: "Purge Race User",
      email: "purgerace@example.com",
      createdAt: purgeTime,
      updatedAt: purgeTime,
    });

    await repository.recordEvent({
      idempotencyKey: "race_evt_1",
      visitorId,
      name: "landing",
      properties: { landing_page: "/home" },
      occurredAt: t0,
      now: t0,
    });

    const hookedRepo = createDatabaseAnalyticsRepositoryForTest(database, {
      beforeDeleteExpiredEvents: async () => {
        await repository.linkVisitorToAccount({
          visitorId,
          userId,
          now: purgeTime,
        });
      },
    });

    const deletedCount = await hookedRepo.deleteExpiredUnlinkedEvents(purgeTime, 100);
    expect(deletedCount).toBe(0);

    const [survivingEvt] = await database
      .select()
      .from(analyticsEvents)
      .where(eq(analyticsEvents.idempotencyKey, "race_evt_1"));
    expect(survivingEvt).toBeDefined();
    expect(survivingEvt.userId).toBe(userId);
    expect(survivingEvt.unlinkedExpiresAt).toBeNull();
  });

  it("rechecks visitor eligibility so a visitor linked after purge selection survives", async () => {
    const firstSeenAt = new Date("2026-08-01T00:00:00Z");
    const purgeTime = new Date("2026-09-10T00:00:00Z");
    const userId = "user_visitor_purge_race";
    const visitorId = "vis_visitor_purge_race";

    await database.insert(authUsers).values({
      id: userId,
      name: "Visitor Purge Race User",
      email: "visitor-purge-race@example.com",
      createdAt: purgeTime,
      updatedAt: purgeTime,
    });
    await repository.getOrCreateVisitor({ id: visitorId, now: firstSeenAt });

    const hookedRepo = createDatabaseAnalyticsRepositoryForTest(database, {
      beforeDeleteExpiredVisitors: async () => {
        await repository.linkVisitorToAccount({
          visitorId,
          userId,
          now: purgeTime,
        });
      },
    });

    const deletedCount = await hookedRepo.deleteExpiredUnlinkedVisitors(
      purgeTime,
      100,
    );
    expect(deletedCount).toBe(0);

    const survivingVisitor = await repository.findVisitorById(visitorId);
    expect(survivingVisitor?.userId).toBe(userId);
    expect(survivingVisitor?.expiresAt).toBeNull();
  });

  it("rebuilds behavior profile across multiple visitors in chronological order and handles delayed old events without regressing balance or timestamps", async () => {
    const tYesterdayMorning = new Date("2026-09-13T08:00:00Z");
    const tYesterdayEve = new Date("2026-09-13T20:00:00Z");
    const tTodayMorning = new Date("2026-09-14T09:00:00Z");
    const tTodayAfternoon = new Date("2026-09-14T14:00:00Z");
    const tDelayedVeryEarly = new Date("2026-09-13T06:00:00Z");

    const userId = "user_multi_visitor_bhv";
    await database.insert(authUsers).values({
      id: userId,
      name: "Multi Vis User",
      email: "multivis@example.com",
      createdAt: tYesterdayMorning,
      updatedAt: tYesterdayMorning,
    });

    const visOld = "vis_old_session";
    const visNew = "vis_new_session";

    await repository.recordEvent({
      idempotencyKey: "vis_old_evt_1",
      visitorId: visOld,
      name: "locked_preview_view",
      properties: { section_id: "sec_old_1" },
      occurredAt: tYesterdayMorning,
      now: tYesterdayMorning,
    });

    await repository.recordEvent({
      idempotencyKey: "vis_old_evt_2",
      visitorId: visOld,
      name: "la_spent",
      properties: { balance_after: 100, amount: 20, sku: "TEST" },
      occurredAt: tYesterdayEve,
      now: tYesterdayEve,
    });

    await repository.linkVisitorToAccount({
      visitorId: visNew,
      userId,
      now: tTodayMorning,
    });

    await repository.recordEvent({
      idempotencyKey: "vis_new_evt_1",
      visitorId: visNew,
      userId,
      name: "locked_preview_view",
      properties: { section_id: "sec_new_1" },
      occurredAt: tTodayMorning,
      now: tTodayMorning,
    });

    await repository.recordEvent({
      idempotencyKey: "vis_new_evt_2",
      visitorId: visNew,
      userId,
      name: "la_spent",
      properties: { balance_after: 25, amount: 75, sku: "TEST" },
      occurredAt: tTodayAfternoon,
      now: tTodayAfternoon,
    });

    const [rawProfileBefore] = await database
      .select()
      .from(accountBehaviorProfiles)
      .where(eq(accountBehaviorProfiles.userId, userId));
    expect(rawProfileBefore.laBalance).toBe(25);
    expect(rawProfileBefore.lastEventAt?.toISOString()).toBe(tTodayAfternoon.toISOString());

    const linkOldRes = await repository.linkVisitorToAccount({
      visitorId: visOld,
      userId,
      now: tTodayAfternoon,
    });
    expect(linkOldRes.ok).toBe(true);

    const [rawProfileAfterLink] = await database
      .select()
      .from(accountBehaviorProfiles)
      .where(eq(accountBehaviorProfiles.userId, userId));
    expect(rawProfileAfterLink.laBalance).toBe(25);
    expect(rawProfileAfterLink.lastEventAt?.toISOString()).toBe(tTodayAfternoon.toISOString());
    const profileAfterLink = await repository.getAccountBehaviorProfile(userId);
    expect(profileAfterLink?.lockedSectionsViewed).toEqual(["sec_old_1", "sec_new_1"]);

    await repository.recordEvent({
      idempotencyKey: "delayed_old_evt",
      visitorId: visOld,
      userId,
      name: "la_spent",
      properties: { balance_after: 200, amount: 10, sku: "DELAYED" },
      occurredAt: tDelayedVeryEarly,
      now: tTodayAfternoon,
    });

    const [rawProfileAfterDelayed] = await database
      .select()
      .from(accountBehaviorProfiles)
      .where(eq(accountBehaviorProfiles.userId, userId));
    expect(rawProfileAfterDelayed.laBalance).toBe(25);
    expect(rawProfileAfterDelayed.lastEventAt?.toISOString()).toBe(tTodayAfternoon.toISOString());
  });

  it("idempotency replays exact command with original omitted identity fields even after visitor is linked and profile associated", async () => {
    const t0 = new Date("2026-09-14T08:00:00Z");
    const visitorId = "vis_idempotency_enrich";
    const idemKey = "enrich_idem_key_1";

    const basePayload = {
      idempotencyKey: idemKey,
      visitorId,
      name: "landing",
      properties: { landing_page: "/enrich-test" },
      occurredAt: t0,
      now: t0,
    };

    const res1 = await repository.recordEvent({ ...basePayload });
    expect(res1.ok).toBe(true);
    if (!res1.ok) return;
    expect(res1.replayed).toBe(false);
    expect(res1.event.userId).toBeNull();
    expect(res1.event.birthProfileId).toBeNull();

    const linkTime = new Date("2026-09-14T09:00:00Z");
    const userId = "user_enrich_idem";
    await database.insert(authUsers).values({
      id: userId,
      name: "Enrich User",
      email: "enrich@example.com",
      createdAt: linkTime,
      updatedAt: linkTime,
    });

    const profileId = "bp_enrich_idem";
    await database.insert(birthProfiles).values({
      id: profileId,
      userId,
      calendar: { calendar: "solar", year: 1990, month: 1, day: 1 },
      time: { time: "exact", hour: 10, minute: 0 },
      timezone: { source: "offset", offsetMinutes: 420 },
      gender: "female",
      createdAt: linkTime,
      updatedAt: linkTime,
    });

    await repository.linkVisitorToAccount({ visitorId, userId, now: linkTime });
    await repository.associateBirthProfile({
      visitorId,
      birthProfileId: profileId,
      owner: { userId },
      now: linkTime,
    });

    const replayRes = await repository.recordEvent({ ...basePayload, now: linkTime });
    expect(replayRes.ok).toBe(true);
    if (!replayRes.ok) return;
    expect(replayRes.replayed).toBe(true);
    expect(replayRes.event.id).toBe(res1.event.id);

    const diffPropRes = await repository.recordEvent({
      ...basePayload,
      properties: { landing_page: "/different-page" },
      now: linkTime,
    });
    expect(diffPropRes).toEqual({ ok: false, error: "IDEMPOTENCY_KEY_CONFLICT" });

    const diffUserRes = await repository.recordEvent({
      ...basePayload,
      userId: "intruder_user",
      now: linkTime,
    });
    expect(diffUserRes).toEqual({ ok: false, error: "VISITOR_ACCOUNT_CONFLICT" });

    const diffProfileRes = await repository.recordEvent({
      ...basePayload,
      birthProfileId: "other_bp",
      now: linkTime,
    });
    expect(diffProfileRes).toEqual({ ok: false, error: "PROFILE_FORBIDDEN" });
  });

  it("wizard consent preserves first consentedAt timestamp on retry and links unlinked visitor/events to authenticated owner", async () => {
    const t0 = new Date("2026-09-14T07:00:00Z");
    const tConsent1 = new Date("2026-09-14T07:30:00Z");
    const tConsent2 = new Date("2026-09-14T08:00:00Z");

    const visitorId = "vis_consent_preserve";
    const userId = "user_consent_link";

    await database.insert(authUsers).values({
      id: userId,
      name: "Consent User",
      email: "consent@example.com",
      createdAt: t0,
      updatedAt: t0,
    });

    await repository.recordEvent({
      idempotencyKey: "evt_pre_consent",
      visitorId,
      name: "landing",
      properties: { landing_page: "/start" },
      occurredAt: t0,
      now: t0,
    });

    const visitorBefore = await repository.findVisitorById(visitorId);
    expect(visitorBefore?.userId).toBeNull();
    expect(visitorBefore?.expiresAt).toBeDefined();

    const consentRes1 = await repository.recordWizardConsent({
      visitorId,
      owner: { userId },
      consentedAt: tConsent1,
      now: tConsent1,
    });
    expect(consentRes1).toEqual({ ok: true });

    const visitorAfter = await repository.findVisitorById(visitorId);
    expect(visitorAfter?.userId).toBe(userId);
    expect(visitorAfter?.expiresAt).toBeNull();
    expect(visitorAfter?.linkedAt).toBeDefined();
    expect(visitorAfter?.consentedAt?.toISOString()).toBe(tConsent1.toISOString());

    const [linkedEvt] = await database
      .select()
      .from(analyticsEvents)
      .where(eq(analyticsEvents.idempotencyKey, "evt_pre_consent"));
    expect(linkedEvt.userId).toBe(userId);
    expect(linkedEvt.unlinkedExpiresAt).toBeNull();

    const consentRes2 = await repository.recordWizardConsent({
      visitorId,
      owner: { userId },
      consentedAt: tConsent2,
      now: tConsent2,
    });
    expect(consentRes2).toEqual({ ok: true });

    const visitorRetried = await repository.findVisitorById(visitorId);
    expect(visitorRetried?.consentedAt?.toISOString()).toBe(tConsent1.toISOString());

    const ambiguousRes = await repository.recordWizardConsent({
      visitorId,
      owner: { userId, anonymousActorId: "anon_123" },
      consentedAt: tConsent2,
      now: tConsent2,
    });
    expect(ambiguousRes).toEqual({ ok: false, error: "PROFILE_FORBIDDEN" });
  });

  it("visitor-only fraud IP record gains account owner on visitor link and is deleted by account deletion cascade", async () => {
    const t0 = new Date("2026-09-14T06:00:00Z");
    const linkTime = new Date("2026-09-14T06:30:00Z");

    const visitorId = "vis_fraud_cascade_test";
    const userId = "user_fraud_cascade";

    await database.insert(authUsers).values({
      id: userId,
      name: "Fraud Cascade User",
      email: "fraudcascade@example.com",
      createdAt: t0,
      updatedAt: t0,
    });

    await repository.recordFraudIp({
      id: "fraud_cascade_rec_1",
      ip: "198.51.100.99",
      action: "abuse_probe",
      visitorId,
      now: t0,
    });

    const [fraudBefore] = await database
      .select()
      .from(analyticsFraudIpRecords)
      .where(eq(analyticsFraudIpRecords.id, "fraud_cascade_rec_1"));
    expect(fraudBefore).toBeDefined();
    expect(fraudBefore.userId).toBeNull();
    expect(fraudBefore.visitorId).toBe(visitorId);

    await repository.linkVisitorToAccount({
      visitorId,
      userId,
      now: linkTime,
    });

    const [fraudAfterLink] = await database
      .select()
      .from(analyticsFraudIpRecords)
      .where(eq(analyticsFraudIpRecords.id, "fraud_cascade_rec_1"));
    expect(fraudAfterLink.userId).toBe(userId);
    expect(fraudAfterLink.expiresAt.toISOString()).toBe(fraudBefore.expiresAt.toISOString());

    await database.delete(authUsers).where(eq(authUsers.id, userId));

    const fraudAfterDelete = await database
      .select()
      .from(analyticsFraudIpRecords)
      .where(eq(analyticsFraudIpRecords.id, "fraud_cascade_rec_1"));
    expect(fraudAfterDelete).toHaveLength(0);
  });

  it("derives fraud IP ownership under the visitor lock and rejects contradictory ownership", async () => {
    const now = new Date("2026-09-14T06:45:00Z");
    const userId = "user_fraud_derived";
    const otherUserId = "user_fraud_conflict";
    const visitorId = "vis_fraud_derived";

    await database.insert(authUsers).values([
      {
        id: userId,
        name: "Fraud Derived User",
        email: "fraud-derived@example.com",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: otherUserId,
        name: "Fraud Conflict User",
        email: "fraud-conflict@example.com",
        createdAt: now,
        updatedAt: now,
      },
    ]);
    await repository.linkVisitorToAccount({ visitorId, userId, now });

    const derived = await repository.recordFraudIp({
      id: "fraud_derived_after_link",
      ip: "198.51.100.101",
      action: "abuse_probe",
      visitorId,
      now,
    });
    expect(derived.ok).toBe(true);
    if (derived.ok) {
      expect(derived.record.userId).toBe(userId);
    }

    const conflict = await repository.recordFraudIp({
      id: "fraud_conflicting_owner",
      ip: "198.51.100.102",
      action: "abuse_probe",
      visitorId,
      userId: otherUserId,
      now,
    });
    expect(conflict).toEqual({
      ok: false,
      error: "FRAUD_IP_ACCOUNT_CONFLICT",
    });

    const conflictingRows = await database
      .select()
      .from(analyticsFraudIpRecords)
      .where(eq(analyticsFraudIpRecords.id, "fraud_conflicting_owner"));
    expect(conflictingRows).toHaveLength(0);

    const standalone = await repository.recordFraudIp({
      id: "fraud_standalone_owner",
      ip: "198.51.100.103",
      action: "account_security",
      userId: otherUserId,
      now,
    });
    expect(standalone.ok).toBe(true);
    if (standalone.ok) {
      expect(standalone.record.userId).toBe(otherUserId);
      expect(standalone.record.visitorId).toBeNull();
    }

    await database.delete(authUsers).where(eq(authUsers.id, userId));
    const rowsAfterAccountDeletion = await database
      .select()
      .from(analyticsFraudIpRecords)
      .where(eq(analyticsFraudIpRecords.id, "fraud_derived_after_link"));
    expect(rowsAfterAccountDeletion).toHaveLength(0);
  });

  it("serializes fraud IP recording against account linking in both deterministic lock orders", async () => {
    const now = new Date("2026-09-14T07:15:00Z");
    const recordFirstUserId = "user_fraud_race_record_first";
    const linkFirstUserId = "user_fraud_race_link_first";
    const recordFirstVisitorId = "vis_fraud_race_record_first";
    const linkFirstVisitorId = "vis_fraud_race_link_first";

    await database.insert(authUsers).values([
      {
        id: recordFirstUserId,
        name: "Fraud Race Record First",
        email: "fraud-race-record-first@example.com",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: linkFirstUserId,
        name: "Fraud Race Link First",
        email: "fraud-race-link-first@example.com",
        createdAt: now,
        updatedAt: now,
      },
    ]);
    await repository.getOrCreateVisitor({
      id: recordFirstVisitorId,
      now,
    });
    await repository.getOrCreateVisitor({
      id: linkFirstVisitorId,
      now,
    });

    const fraudLocked = createDeferred();
    const releaseFraud = createDeferred();
    const recordFirstRepository = createDatabaseAnalyticsRepositoryForTest(
      database,
      {
        afterFraudVisitorLock: async () => {
          fraudLocked.resolve();
          await releaseFraud.promise;
        },
      },
    );

    const recordFirstPromise = recordFirstRepository.recordFraudIp({
      id: "fraud_race_record_first",
      ip: "198.51.100.111",
      action: "abuse_probe",
      visitorId: recordFirstVisitorId,
      now,
    });
    await fraudLocked.promise;
    const recordFirstLinkPromise = repository.linkVisitorToAccount({
      visitorId: recordFirstVisitorId,
      userId: recordFirstUserId,
      now,
    });
    releaseFraud.resolve();
    const [recordFirstResult, recordFirstLink] = await Promise.all([
      recordFirstPromise,
      recordFirstLinkPromise,
    ]);
    expect(recordFirstResult.ok).toBe(true);
    expect(recordFirstLink.ok).toBe(true);

    const linkLocked = createDeferred();
    const releaseLink = createDeferred();
    const linkFirstRepository = createDatabaseAnalyticsRepositoryForTest(
      database,
      {
        afterLinkVisitorLock: async () => {
          linkLocked.resolve();
          await releaseLink.promise;
        },
      },
    );

    const linkFirstPromise = linkFirstRepository.linkVisitorToAccount({
      visitorId: linkFirstVisitorId,
      userId: linkFirstUserId,
      now,
    });
    await linkLocked.promise;
    const linkFirstFraudPromise = repository.recordFraudIp({
      id: "fraud_race_link_first",
      ip: "198.51.100.112",
      action: "abuse_probe",
      visitorId: linkFirstVisitorId,
      now,
    });
    releaseLink.resolve();
    const [linkFirstLink, linkFirstResult] = await Promise.all([
      linkFirstPromise,
      linkFirstFraudPromise,
    ]);
    expect(linkFirstLink.ok).toBe(true);
    expect(linkFirstResult.ok).toBe(true);

    const raceRows = await database
      .select()
      .from(analyticsFraudIpRecords)
      .where(
        inArray(analyticsFraudIpRecords.id, [
          "fraud_race_record_first",
          "fraud_race_link_first",
        ]),
      );
    expect(raceRows).toHaveLength(2);
    expect(
      raceRows.find((row) => row.id === "fraud_race_record_first")?.userId,
    ).toBe(recordFirstUserId);
    expect(
      raceRows.find((row) => row.id === "fraud_race_link_first")?.userId,
    ).toBe(linkFirstUserId);
  });

  it("idempotency replays command omitting birthProfileId when visitor has inherited birthProfile, while different profile or payload conflicts", async () => {
    const t0 = new Date("2026-09-14T08:30:00Z");
    const userId = "user_inherited_profile_test";
    const visitorId = "vis_inherited_profile_test";
    const profileId1 = "bp_owned_1";
    const profileId2 = "bp_owned_2";

    await database.insert(authUsers).values({
      id: userId,
      name: "Inherited Profile User",
      email: "inherited@example.com",
      createdAt: t0,
      updatedAt: t0,
    });

    await database.insert(birthProfiles).values([
      {
        id: profileId1,
        userId,
        calendar: { calendar: "solar", year: 1991, month: 1, day: 1 },
        time: { time: "exact", hour: 10, minute: 0 },
        timezone: { source: "offset", offsetMinutes: 420 },
        gender: "female",
        createdAt: t0,
        updatedAt: t0,
      },
      {
        id: profileId2,
        userId,
        calendar: { calendar: "solar", year: 1993, month: 3, day: 3 },
        time: { time: "exact", hour: 11, minute: 0 },
        timezone: { source: "offset", offsetMinutes: 420 },
        gender: "male",
        createdAt: t0,
        updatedAt: t0,
      },
    ]);

    await repository.linkVisitorToAccount({ visitorId, userId, now: t0 });
    await repository.associateBirthProfile({
      visitorId,
      birthProfileId: profileId1,
      owner: { userId },
      now: t0,
    });

    const idemKey = "idem_inherited_profile_replay";
    const commandPayload = {
      idempotencyKey: idemKey,
      visitorId,
      userId,
      name: "landing",
      properties: { landing_page: "/inherited-test" },
      occurredAt: t0,
      now: t0,
    };

    const res1 = await repository.recordEvent({ ...commandPayload });
    expect(res1.ok).toBe(true);
    if (!res1.ok) return;
    expect(res1.replayed).toBe(false);
    expect(res1.event.birthProfileId).toBe(profileId1);

    const replayRes = await repository.recordEvent({ ...commandPayload });
    expect(replayRes.ok).toBe(true);
    if (!replayRes.ok) return;
    expect(replayRes.replayed).toBe(true);
    expect(replayRes.event.id).toBe(res1.event.id);
    expect(replayRes.event.birthProfileId).toBe(profileId1);

    const diffProfileRes = await repository.recordEvent({
      ...commandPayload,
      birthProfileId: profileId2,
    });
    expect(diffProfileRes).toEqual({ ok: false, error: "IDEMPOTENCY_KEY_CONFLICT" });

    const changedPayloadRes = await repository.recordEvent({
      ...commandPayload,
      properties: { landing_page: "/changed-page" },
    });
    expect(changedPayloadRes).toEqual({ ok: false, error: "IDEMPOTENCY_KEY_CONFLICT" });
  });

  it("returns all 500 account events and fails closed when a 501st event exists", async () => {
    const now = new Date("2026-09-14T09:30:00Z");
    const userId = "user_export_limit";
    const visitorId = "vis_export_limit";

    await database.insert(authUsers).values({
      id: userId,
      name: "Export Limit User",
      email: "export-limit@example.com",
      createdAt: now,
      updatedAt: now,
    });
    await repository.linkVisitorToAccount({ visitorId, userId, now });

    await database.insert(analyticsEvents).values(
      Array.from({ length: 500 }, (_, index) => ({
        id: `export_limit_evt_${index.toString().padStart(3, "0")}`,
        idempotencyKey: `export_limit_idem_${index.toString().padStart(3, "0")}`,
        visitorId,
        userId,
        name: "landing",
        properties: { landing_page: `/export-${index}` },
        unlinkedExpiresAt: null,
        occurredAt: new Date(now.getTime() + index),
        createdAt: now,
      })),
    );

    const exactlyFiveHundred = await repository.listAccountEvents(userId);
    expect(exactlyFiveHundred.ok).toBe(true);
    if (exactlyFiveHundred.ok) {
      expect(exactlyFiveHundred.events).toHaveLength(500);
    }

    await database.insert(analyticsEvents).values({
      id: "export_limit_evt_500",
      idempotencyKey: "export_limit_idem_500",
      visitorId,
      userId,
      name: "landing",
      properties: { landing_page: "/export-500" },
      unlinkedExpiresAt: null,
      occurredAt: new Date(now.getTime() + 500),
      createdAt: now,
    });

    const overLimit = await repository.listAccountEvents(userId);
    expect(overLimit).toEqual({
      ok: false,
      error: "ANALYTICS_EXPORT_LIMIT_EXCEEDED",
    });
  });
});
