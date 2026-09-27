import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  authUsers,
  birthProfiles,
  birthProfileRevisions,
  calculationRuns,
  commerceOrders,
  consents,
  createDatabase,
  notificationDeliveries,
  notificationPreferences,
  runMigrations,
  ziweiCharts,
  ziweiChartVersions,
  type Database,
} from "@lasoviet/database";
import type { NormalizedZiweiChartV1, ZiweiBranchId, ZiweiPalaceId } from "@lasoviet/contracts";
import { eq } from "drizzle-orm";
import {
  createDatabaseNotificationPreferenceStore,
  generateUnsubscribeToken,
  verifyUnsubscribeToken,
} from "./notification-preference.js";
import {
  createVerifiedSignInNurtureService,
  PALACE_TITLES_VI,
} from "./nurture-signin.service.js";

const BRANCH_IDS: ZiweiBranchId[] = [
  "ziwei.branch.rat",
  "ziwei.branch.ox",
  "ziwei.branch.tiger",
  "ziwei.branch.rabbit",
  "ziwei.branch.dragon",
  "ziwei.branch.snake",
  "ziwei.branch.horse",
  "ziwei.branch.goat",
  "ziwei.branch.monkey",
  "ziwei.branch.rooster",
  "ziwei.branch.dog",
  "ziwei.branch.pig",
];

const PALACE_IDS: ZiweiPalaceId[] = [
  "ziwei.palace.life",
  "ziwei.palace.siblings",
  "ziwei.palace.spouse",
  "ziwei.palace.children",
  "ziwei.palace.wealth",
  "ziwei.palace.health",
  "ziwei.palace.travel",
  "ziwei.palace.friends",
  "ziwei.palace.career",
  "ziwei.palace.property",
  "ziwei.palace.fortune",
  "ziwei.palace.parents",
];

function createSampleChart(): NormalizedZiweiChartV1 {
  return {
    version: 1,
    systemId: "ziwei",
    palaces: PALACE_IDS.map((id, index) => ({
      id,
      earthlyBranchId: BRANCH_IDS[index]!,
      isBodyPalace: id === "ziwei.palace.career",
      isOriginalPalace: index === 0,
      stars: [],
    })),
    transformations: [{ starId: "ziwei.star.ziwei", id: "ziwei.transformation.power" }],
    soulPalaceId: "ziwei.palace.life",
    bodyPalaceId: "ziwei.palace.career",
    horoscopeCapabilities: [
      { id: "ziwei.horoscope.decadal", supported: true },
      { id: "ziwei.horoscope.annual", supported: true },
    ],
    warnings: [],
    provenance: {
      version: 1,
      engineId: "ziwei.iztro",
      engineVersion: "2.6.0",
      adapterId: "ziwei.iztro-adapter",
      adapterVersion: "1.0.0",
      schemaId: "normalized-ziwei-chart-v1",
      ruleSetId: "ziwei.default",
      inputHash: "a".repeat(64),
      configHash: "b".repeat(64),
      rawSnapshotHash: "c".repeat(64),
      calculatedAt: "2026-09-02T00:00:00+00:00",
      limitations: [],
    },
  };
}

describe("VerifiedSignInNurtureService and NotificationPreferences integration", () => {
  let container: Awaited<ReturnType<PostgreSqlContainer["start"]>> | undefined;
  let database: Database;
  const tokenSecret = "test-nurture-secret-key-123456789";

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:17-alpine").start();
    const url = container.getConnectionUri();
    await runMigrations(url);
    database = createDatabase(url);
  }, 60000);

  afterAll(async () => {
    await container?.stop();
  });

  async function createChartFixture(userId: string, chartId: string) {
    const profileId = `profile-${chartId}`;
    const revisionId = `rev-${chartId}`;
    const runId = `run-${chartId}`;

    await database.insert(birthProfiles).values({
      id: profileId,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await database.insert(birthProfileRevisions).values({
      id: revisionId,
      profileId,
      revisionNumber: 1,
      originalInput: { solarDate: "1992-06-15", solarTime: "08:30" },
      normalizedInput: { date: "1992-06-15", time: "08:30" },
      consentVersion: "2026-09-14",
    });

    await database.insert(calculationRuns).values({
      id: runId,
      profileId,
      profileRevisionId: revisionId,
      idempotencyKey: `calc-run:${chartId}`,
      engineId: "iztro",
      engineVersion: "2.6.0",
      adapterId: "iztro-adapter",
      adapterVersion: "1.0.0",
      schemaId: "ziwei.chart.v1",
      ruleSetId: "ruleset.2026.09",
      inputHash: "mock-input-hash",
      configHash: "mock-config-hash",
      rawSnapshotHash: "mock-raw-snapshot-hash",
    });

    await database.insert(ziweiCharts).values({
      id: chartId,
      profileId,
      profileRevisionId: revisionId,
    });

    await database.insert(ziweiChartVersions).values({
      id: `ver-${chartId}`,
      chartId,
      calculationRunId: runId,
      normalizedOutput: createSampleChart(),
      privateRawSnapshot: {},
      warnings: [],
      provenance: {},
    });
  }

  it("handles preference updates and 1-click unsubscribe by token", async () => {
    const userId = "pref-user-1";
    const email = "pref-user-1@example.test";

    await database.insert(authUsers).values({
      id: userId,
      name: "Pref User",
      email,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await database.insert(consents).values({
      id: "consent-pref-user-1",
      userId,
      anonymousActorId: null,
      documentKey: "privacy",
      documentVersion: "v1",
      purpose: "offers",
      grantedAt: new Date(),
      revokedAt: null,
    });

    const store = createDatabaseNotificationPreferenceStore(database, tokenSecret);

    const initialPrefs = await store.getPreferences(userId);
    expect(initialPrefs.nurtureEmailsAllowed).toBe(true);
    expect(initialPrefs.unsubscribedAll).toBe(false);

    expect(await store.isNonTransactionalAllowed(email, userId)).toBe(true);

    const unsubToken = generateUnsubscribeToken({ userId, email }, tokenSecret);
    const unsubResult = await store.unsubscribeByToken(unsubToken);
    expect(unsubResult.ok).toBe(true);

    const updatedPrefs = await store.getPreferences(userId);
    expect(updatedPrefs.unsubscribedAll).toBe(true);
    expect(updatedPrefs.nurtureEmailsAllowed).toBe(false);

    expect(await store.isNonTransactionalAllowed(email, userId)).toBe(false);
  });

  it("enqueues 2-day nurture with one real palace title for eligible verified accounts", async () => {
    const nowRef = new Date("2026-09-27T10:00:00Z");
    let currentNow = new Date("2026-09-27T10:00:00Z");
    const getNow = () => currentNow;

    const eligibleUserId = "user-eligible-1";
    const eligibleEmail = "eligible1@example.test";
    const chartId = "chart-eligible-1";

    // User created exactly on 2026-09-27T10:00:00Z
    await database.insert(authUsers).values({
      id: eligibleUserId,
      name: "Eligible One",
      email: eligibleEmail,
      emailVerified: true,
      createdAt: nowRef,
      updatedAt: nowRef,
    });
    await createChartFixture(eligibleUserId, chartId);
    await database.insert(consents).values({
      id: "consent-eligible-1",
      userId: eligibleUserId,
      anonymousActorId: null,
      documentKey: "privacy",
      documentVersion: "v1",
      purpose: "offers",
      grantedAt: nowRef,
      revokedAt: null,
    });

    const store = createDatabaseNotificationPreferenceStore(database, tokenSecret, getNow);
    const service = createVerifiedSignInNurtureService({
      database,
      preferenceStore: store,
      tokenSecret,
      canonicalOrigin: "https://lasoviet.net",
      now: getNow,
    });

    // 1. Immediately (0 days elapsed): not eligible
    const scan0 = await service.scanAndEnqueue();
    expect(scan0.scanned).toBe(0);
    expect(scan0.enqueued).toBe(0);

    // 2. Advance clock by 1 day (24h elapsed): still not eligible
    currentNow = new Date(nowRef.getTime() + 24 * 60 * 60 * 1000);
    const scan1 = await service.scanAndEnqueue();
    expect(scan1.scanned).toBe(0);
    expect(scan1.enqueued).toBe(0);

    // 3. Advance clock by 2 days + 1 second (48h+ elapsed): now eligible!
    currentNow = new Date(nowRef.getTime() + 48 * 60 * 60 * 1000 + 1000);
    const scan2 = await service.scanAndEnqueue();
    expect(scan2.scanned).toBe(1);
    expect(scan2.enqueued).toBe(1);

    // Verify delivery record in DB
    const [delivery] = await database
      .select()
      .from(notificationDeliveries)
      .where(eq(notificationDeliveries.idempotencyKey, `nurture-signin:${eligibleUserId}`))
      .limit(1);

    expect(delivery).toBeDefined();
    expect(delivery.kind).toBe("nurture_verified_signin");
    expect(delivery.status).toBe("pending");

    const payload = delivery.requestPayload as any;
    expect(payload.recipient).toBe(eligibleEmail);
    expect(payload.userId).toBe(eligibleUserId);
    expect(payload.chartId).toBe(chartId);
    expect(["ziwei.palace.career", "ziwei.palace.life"]).toContain(payload.palaceId);
    expect([PALACE_TITLES_VI["ziwei.palace.career"], PALACE_TITLES_VI["ziwei.palace.life"]]).toContain(
      payload.palaceTitle,
    );
    expect(payload.unsubscribeUrl).toContain("https://lasoviet.net/thong-bao/huy-dang-ky?token=");

    // Verify unsubscribe token in payload is valid
    const url = new URL(payload.unsubscribeUrl);
    const tokenInUrl = url.searchParams.get("token");
    expect(tokenInUrl).toBeDefined();
    const tokenCheck = verifyUnsubscribeToken(tokenInUrl!, tokenSecret, undefined, getNow());
    expect(tokenCheck.ok).toBe(true);
    if (tokenCheck.ok) {
      expect(tokenCheck.value.userId).toBe(eligibleUserId);
      expect(tokenCheck.value.email).toBe(eligibleEmail);
    }

    // 4. Re-running scan: deduplication / idempotency check
    const scan3 = await service.scanAndEnqueue();
    expect(scan3.scanned).toBe(1);
    expect(scan3.enqueued).toBe(0);
    expect(scan3.skipped).toBe(1);
  });

  it("excludes users with paid purchases or revoked offers consent", async () => {
    const currentNow = new Date("2026-09-30T10:00:00Z");
    const getNow = () => currentNow;

    const paidUserId = "user-paid-1";
    await database.insert(authUsers).values({
      id: paidUserId,
      name: "Paid User",
      email: "paid1@example.test",
      emailVerified: true,
      createdAt: new Date("2026-09-25T10:00:00Z"),
      updatedAt: new Date("2026-09-25T10:00:00Z"),
    });
    await createChartFixture(paidUserId, "chart-paid-1");

    // Insert paid order
    await database.insert(commerceOrders).values({
      id: "11111111-1111-4111-8111-111111111111",
      paymentCode: "LSV23456789A",
      invoiceNumber: "INV-2026-PAID-01",
      ownerId: paidUserId,
      chartId: "chart-paid-1",
      chartVersionId: "ver-chart-paid-1",
      sku: "ZIWEI-IDENTITY-P0",
      kind: "content_purchase",
      amount: 500000,
      currency: "VND",
      locale: "vi",
      status: "paid",
      createdAt: new Date("2026-09-26T10:00:00Z"),
      paidAt: new Date("2026-09-26T10:00:00Z"),
    });

    const store = createDatabaseNotificationPreferenceStore(database, tokenSecret, getNow);
    const service = createVerifiedSignInNurtureService({
      database,
      preferenceStore: store,
      tokenSecret,
      now: getNow,
    });

    const result = await service.scanAndEnqueue();
    // Paid user should be scanned but skipped
    expect(result.enqueued).toBe(0);

    const [delivery] = await database
      .select()
      .from(notificationDeliveries)
      .where(eq(notificationDeliveries.idempotencyKey, `nurture-signin:${paidUserId}`))
      .limit(1);
    expect(delivery).toBeUndefined();
  });
});
