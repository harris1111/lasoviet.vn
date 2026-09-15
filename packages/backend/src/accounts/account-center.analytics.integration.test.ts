import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  accountBehaviorProfiles,
  analyticsEvents,
  analyticsVisitors,
  authUsers,
  createDatabase,
  runMigrations,
  type Database,
} from "@lasoviet/database";
import { createAccountCenterService } from "./account-center.service.js";

describe("account-center analytics export integration with PostgreSQL", () => {
  let container: Awaited<ReturnType<PostgreSqlContainer["start"]>> | undefined;
  let database: Database;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:17-alpine").start();
    const url = container.getConnectionUri();
    await runMigrations(url);
    database = createDatabase(url);
  }, 60000);

  afterAll(async () => {
    if (database) {
      await database.$client.end();
    }
    await container?.stop();
  });

  it("proves owner isolation: getExport only returns owned analytics events and behavior profile", async () => {
    const owner1 = "user-isolation-1";
    const owner2 = "user-isolation-2";

    await database.insert(authUsers).values([
      { id: owner1, name: "Owner 1", email: "owner1@test.example", emailVerified: true },
      { id: owner2, name: "Owner 2", email: "owner2@test.example", emailVerified: true },
    ]);

    const visitor1 = "11111111-1111-4111-8111-111111111111";
    const visitor2 = "22222222-2222-4222-8222-222222222222";
    const now = new Date("2026-09-14T10:00:00Z");

    await database.insert(analyticsVisitors).values([
      {
        id: visitor1,
        userId: owner1,
        linkedAt: now,
        expiresAt: null,
        firstSeenAt: now,
        lastSeenAt: now,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: visitor2,
        userId: owner2,
        linkedAt: now,
        expiresAt: null,
        firstSeenAt: now,
        lastSeenAt: now,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    // Insert events for both users
    await database.insert(analyticsEvents).values([
      {
        id: "evt-iso-1",
        idempotencyKey: "idem-iso-1",
        visitorId: visitor1,
        userId: owner1,
        name: "landing",
        properties: { landing_page: "/home" },
        unlinkedExpiresAt: null,
        occurredAt: now,
        createdAt: now,
      },
      {
        id: "evt-iso-2",
        idempotencyKey: "idem-iso-2",
        visitorId: visitor2,
        userId: owner2,
        name: "wizard_start",
        properties: { locale: "vi", entry_point: "wizard_route", step: 1 },
        unlinkedExpiresAt: null,
        occurredAt: now,
        createdAt: now,
      },
    ]);

    // Insert behavior profile for owner1 only
    await database.insert(accountBehaviorProfiles).values({
      id: "beh-iso-1",
      userId: owner1,
      version: 1,
      lockedSectionsViewed: ["career"],
      topupPacksViewed: ["pack_50"],
      laBalance: 100,
      reportReadDepthPercent: 50,
      interestTopics: ["career"],
      lastEventAt: now,
      createdAt: now,
      updatedAt: now,
    });

    const service = createAccountCenterService(database);

    // Owner 1 export
    const res1 = await service.getExport(owner1);
    expect(res1.ok).toBe(true);
    if (res1.ok) {
      expect(res1.value.analyticsEvents).toHaveLength(1);
      expect(res1.value.analyticsEvents![0]!.id).toBe("evt-iso-1");
      expect(res1.value.analyticsEvents![0]!.name).toBe("landing");
      expect(res1.value.behaviorProfile).not.toBeNull();
      expect(res1.value.behaviorProfile?.laBalance).toBe(100);
      expect(res1.value.behaviorProfile?.interestTopics).toEqual(["career"]);
    }

    // Owner 2 export
    const res2 = await service.getExport(owner2);
    expect(res2.ok).toBe(true);
    if (res2.ok) {
      expect(res2.value.analyticsEvents).toHaveLength(1);
      expect(res2.value.analyticsEvents![0]!.id).toBe("evt-iso-2");
      expect(res2.value.analyticsEvents![0]!.name).toBe("wizard_start");
      // Nullable behavior profile when user has none
      expect(res2.value.behaviorProfile).toBeNull();
    }
  });

  it("succeeds when user has exactly 500 events and orders newest first", async () => {
    const user500 = "user-exact-500";
    await database.insert(authUsers).values({
      id: user500,
      name: "500 User",
      email: "u500@test.example",
      emailVerified: true,
    });

    const visitorId = "55555555-5555-4555-8555-555555555555";
    const now = new Date("2026-09-14T00:00:00Z");

    await database.insert(analyticsVisitors).values({
      id: visitorId,
      userId: user500,
      linkedAt: now,
      expiresAt: null,
      firstSeenAt: now,
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now,
    });

    const rows = Array.from({ length: 500 }, (_, i) => ({
      id: `evt-500-${i}`,
      idempotencyKey: `idem-500-${i}`,
      visitorId,
      userId: user500,
      name: "landing",
      properties: { landing_page: `/page-${i}` },
      unlinkedExpiresAt: null,
      occurredAt: new Date(now.getTime() + i * 1000), // monotonically increasing
      createdAt: new Date(now.getTime() + i * 1000),
    }));

    // Insert in batches of 100
    for (let i = 0; i < rows.length; i += 100) {
      await database.insert(analyticsEvents).values(rows.slice(i, i + 100));
    }

    const service = createAccountCenterService(database);
    const result = await service.getExport(user500);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.analyticsEvents).toHaveLength(500);
      // Newest first order
      expect(result.value.analyticsEvents![0]!.id).toBe("evt-500-499");
      expect(result.value.analyticsEvents![499]!.id).toBe("evt-500-0");
    }
  });

  it("fails closed with ACCOUNT_EXPORT_LIMIT_EXCEEDED when user has 501 events", async () => {
    const user501 = "user-limit-501";
    await database.insert(authUsers).values({
      id: user501,
      name: "501 User",
      email: "u501@test.example",
      emailVerified: true,
    });

    const visitorId = "66666666-6666-4666-8666-666666666666";
    const now = new Date("2026-09-14T00:00:00Z");

    await database.insert(analyticsVisitors).values({
      id: visitorId,
      userId: user501,
      linkedAt: now,
      expiresAt: null,
      firstSeenAt: now,
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now,
    });

    const rows = Array.from({ length: 501 }, (_, i) => ({
      id: `evt-501-${i}`,
      idempotencyKey: `idem-501-${i}`,
      visitorId,
      userId: user501,
      name: "landing",
      properties: { landing_page: `/page-${i}` },
      unlinkedExpiresAt: null,
      occurredAt: new Date(now.getTime() + i * 1000),
      createdAt: new Date(now.getTime() + i * 1000),
    }));

    for (let i = 0; i < rows.length; i += 100) {
      await database.insert(analyticsEvents).values(rows.slice(i, i + 100));
    }

    const service = createAccountCenterService(database);
    const result = await service.getExport(user501);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("ACCOUNT_EXPORT_LIMIT_EXCEEDED");
    }
  });

  it("fails closed with ACCOUNT_RESOURCE_NOT_FOUND when an analytics event has corrupt or unapproved name", async () => {
    const userCorrupt = "user-corrupt-event";
    await database.insert(authUsers).values({
      id: userCorrupt,
      name: "Corrupt Event User",
      email: "corrupt_evt@test.example",
      emailVerified: true,
    });

    const visitorId = "77777777-7777-4777-8777-777777777777";
    const now = new Date("2026-09-14T00:00:00Z");

    await database.insert(analyticsVisitors).values({
      id: visitorId,
      userId: userCorrupt,
      linkedAt: now,
      expiresAt: null,
      firstSeenAt: now,
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now,
    });

    // Store corrupt event with unapproved event name
    await database.insert(analyticsEvents).values({
      id: "evt-corrupt-1",
      idempotencyKey: "idem-corrupt-1",
      visitorId,
      userId: userCorrupt,
      name: "unapproved_event_xyz",
      properties: { landing_page: "/home" },
      unlinkedExpiresAt: null,
      occurredAt: now,
      createdAt: now,
    });

    const service = createAccountCenterService(database);
    const result = await service.getExport(userCorrupt);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("ACCOUNT_RESOURCE_NOT_FOUND");
    }
  });
});
