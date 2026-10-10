import { freezePurchaseCommercialTerms } from "../commerce/purchase-commercial-terms.js";
import { randomUUID } from "node:crypto";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import {
  authUsers, birthProfiles, birthProfileRevisions, calculationRuns, commerceOrders,
  consents, createDatabase, deletionRequests, lockRecoveryCaptureCoordination,
  notificationDeliveries, outbox, runMigrations, walletPurchaseIntents,
  walletTopUpContinuations, walletTransactions, ziweiCharts, ziweiChartVersions, type Database,
} from "@lasoviet/database";
import { ZIWEI_PALACE_IDS, type NormalizedZiweiChartV1 } from "@lasoviet/contracts";
import { createDatabaseZiweiCalculationRepository } from "../ziwei/ziwei.repository.js";
import { createDatabaseDeletionRepository } from "../privacy/deletion.repository.js";
import { createDatabaseConsentRepository } from "../consent/consent.repository.js";
import { createDatabaseAuthEmailDeliveryStore } from "./auth-email.js";
import { createDatabaseNotificationPreferenceStore, verifyUnsubscribeToken } from "./notification-preference.js";
import { createPendingTopUpRecoveryCaptureService, RECOVERY_CAPTURE_EVENT_TYPE } from "./pending-topup-recovery-capture.js";

const NOW = new Date("2026-10-04T12:00:00.000Z");
const CREATED = new Date("2026-10-04T11:30:00.000Z");
const SECRET = "synthetic-recovery-secret-not-a-provider-credential";

describe("pending top-up recovery capture with isolated PostgreSQL", () => {
  let container: Awaited<ReturnType<PostgreSqlContainer["start"]>>;
  let database: Database;
  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:17-alpine").start();
    await runMigrations(container.getConnectionUri());
    database = createDatabase(container.getConnectionUri());
  }, 60000);
  afterAll(async () => { await container?.stop(); });
  beforeEach(async () => {
    // These fixtures exist only in this test-owned disposable database.
    await database.execute(sql`TRUNCATE auth_users, commerce_orders, notification_deliveries, outbox CASCADE`);
  });
  function service(overrides: Partial<Parameters<typeof createPendingTopUpRecoveryCaptureService>[0]> = {}) {
    return createPendingTopUpRecoveryCaptureService({ database, mode: "capture", tokenSecret: SECRET,
      orderTtlSeconds: 86400, now: () => NOW, ...overrides });
  }
  async function fixture(locale: "vi" | "en" = "vi", priceLa = 960, sku = "ZIWEI-IDENTITY-P0") {
    const userId = randomUUID(); const chartId = `chart-${userId}`;
    const chartVersionId = `version-${userId}`; const profileId = `profile-${userId}`;
    const revisionId = `revision-${userId}`; const runId = `run-${userId}`; const consentId = randomUUID();
    const email = `${userId}@example.test`;
    await database.insert(authUsers).values({ id: userId, email, name: "Synthetic QA owner", emailVerified: true, createdAt: CREATED, updatedAt: CREATED });
    await database.insert(consents).values({ id: consentId, userId, documentKey: "offers", documentVersion: "test-v1", purpose: "offers", grantedAt: CREATED });
    await database.insert(birthProfiles).values({ id: profileId, userId, createdAt: CREATED, updatedAt: CREATED });
    await database.insert(birthProfileRevisions).values({ id: revisionId, profileId, revisionNumber: 1,
      originalInput: { solarDate: "1992-06-15", solarTime: "08:30" }, normalizedInput: {}, consentVersion: "test-v1", createdAt: CREATED });
    await database.insert(calculationRuns).values({ id: runId, profileId, profileRevisionId: revisionId,
      idempotencyKey: runId, engineId: "synthetic", engineVersion: "1", adapterId: "synthetic", adapterVersion: "1",
      schemaId: "synthetic", ruleSetId: "synthetic", inputHash: "a", configHash: "b", rawSnapshotHash: "c", createdAt: CREATED });
    await database.insert(ziweiCharts).values({ id: chartId, profileId, profileRevisionId: revisionId, createdAt: CREATED });
    await database.insert(ziweiChartVersions).values({ id: chartVersionId, chartId, calculationRunId: runId,
      normalizedOutput: {}, privateRawSnapshot: {}, warnings: [], provenance: {}, createdAt: CREATED });
    const intentId = randomUUID(); const orderId = randomUUID();
    await database.insert(walletPurchaseIntents).values({ id: intentId, ownerId: userId, chartId, chartVersionId,
      sku, locale, priceLa, createdAt: CREATED,
      ...(priceLa === 1200 ? {commercialTerms: freezePurchaseCommercialTerms({ownerId: userId, chartId, chartVersionId,
        sku, locale, periodKey: "lifetime", priceLa, createdAt: CREATED})} : {}) });
    await addOrder(orderId, intentId, userId, locale, priceLa);
    return { userId, email, chartId, chartVersionId, profileId, revisionId, runId, consentId, intentId, orderId };
  }
  async function addOrder(orderId: string, intentId: string, userId: string, locale = "vi", priceLa = 960) {
    await database.insert(commerceOrders).values({ id: orderId, invoiceNumber: `test-${orderId}`, kind: "wallet_topup",
      ownerId: userId, sku: "LA-ENTRY-300", amount: 29000, currency: "VND", locale, createdAt: CREATED });
    await database.insert(walletTopUpContinuations).values({ orderId, ownerId: userId, purchaseIntentId: intentId,
      intentStateVersion: 1, confirmedPriceLa: priceLa, returnTab: "overview", createdAt: CREATED });
  }
  async function captures() { return database.select().from(notificationDeliveries).where(eq(notificationDeliveries.kind, "recovery_pending_topup")); }
  it("is disabled by default and uses the real configured TTL without extending it", async () => {
    await fixture();
    expect(await service({ mode: undefined }).scanAndCapture()).toBe(0);
    expect(await service({ orderTtlSeconds: 1800 }).scanAndCapture()).toBe(0);
    expect(await service({ now: () => new Date(NOW.getTime() - 1) }).scanAndCapture()).toBe(0);
    expect(await service({ orderTtlSeconds: 1801 }).scanAndCapture()).toBe(1);
  });
  it.each(["vi", "en"] as const)("captures immutable %s terms once and never claims SMTP or financial side effects", async locale => {
    const f = await fixture(locale);
    const before = await database.select().from(commerceOrders);
    expect(await service().scanAndCapture()).toBe(1);
    const [record] = await captures();
    expect(record).toMatchObject({ status: "captured", attemptCount: 0, sentAt: null, providerMessageId: null,
      sendingLeaseExpiresAt: null, lastErrorCode: "RECOVERY_CAPTURE_ONLY", createdAt: NOW });
    expect(record!.requestPayload).toMatchObject({ orderId: f.orderId, intentId: f.intentId, chartId: f.chartId,
      chartVersionId: f.chartVersionId, amountLa: 960, productTitle: locale === "vi" ? "Tử Vi trọn đời" : "Lifetime Zi Wei reading",
      actionUrl: `https://lasoviet.net${locale === "en" ? "/en" : ""}/thanh-toan/${f.orderId}?utm_source=reminder#recovery=${record!.id}` });
    expect(record!.requestPayload.text).toContain(locale === "vi" ? "29.000 VNĐ" : "29,000 VND");
    expect(record!.requestPayload.text).toContain(record!.requestPayload.actionUrl);
    expect(record!.requestPayload.text).toContain(record!.requestPayload.unsubscribeUrl);
    const htmlLinks = [...(record!.requestPayload.html as string).matchAll(/href="([^"]+)"/g)]
      .map(match => match[1]!.replaceAll("&amp;", "&"));
    expect(htmlLinks).toEqual([record!.requestPayload.actionUrl, record!.requestPayload.unsubscribeUrl]);
    const token = new URL(record!.requestPayload.unsubscribeUrl as string).hash.slice("#token=".length);
    expect(verifyUnsubscribeToken(token, SECRET, undefined, NOW)).toMatchObject({ ok: true, value: { userId: f.userId, email: f.email } });
    const payloadWithoutToken = { ...record!.requestPayload, unsubscribeUrl: undefined };
    expect(JSON.stringify(payloadWithoutToken)).not.toContain(f.email);
    expect(JSON.stringify(payloadWithoutToken)).not.toContain("1992-06-15");
    expect(await service().scanAndCapture()).toBe(0);
    expect(await captures()).toEqual([record]);
    expect(await database.select().from(commerceOrders)).toEqual(before);
    expect(await database.select().from(walletTransactions)).toHaveLength(0);
    const [receipt] = await database.select().from(outbox).where(eq(outbox.eventType, RECOVERY_CAPTURE_EVENT_TYPE));
    expect(receipt).toMatchObject({ status: "processed", processedAt: NOW, attemptCount: 0, actorId: f.userId });
    expect(receipt!.payload).toEqual({ deliveryId: record!.id, orderId: f.orderId, chartVersionId: f.chartVersionId });
    const emailStore = createDatabaseAuthEmailDeliveryStore(database);
    expect(await emailStore.listRetryable(100)).toEqual([]);
    expect(await emailStore.claim(record!.idempotencyKey, NOW, new Date(NOW.getTime() + 1000))).toBeNull();
    await expect(emailStore.getByIdempotencyKey(record!.idempotencyKey)).rejects.toThrow("CAPTURE_RECORD_NOT_DELIVERABLE");
  });
  it("serializes concurrent scans and caps recovery captures at two per chart", async () => {
    const f = await fixture(); await addOrder(randomUUID(), f.intentId, f.userId); await addOrder(randomUUID(), f.intentId, f.userId);
    const counts = await Promise.all([service().scanAndCapture(), service().scanAndCapture(), service().scanAndCapture()]);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(2); expect(await captures()).toHaveLength(2);
    expect(await database.select().from(outbox)).toHaveLength(2);
  });
  it.each(["paid", "expired", "blocked", "cancelled", "stale", "wrong-owner", "wrong-locale", "unverified", "anonymous", "deleted-profile", "no-consent", "revoked-consent", "latest-revoked", "unsubscribe", "email-unsubscribe", "nurture-off", "deletion", "discount", "held"])("excludes %s sources", async reason => {
    const f = await fixture("vi", reason === "discount" ? 720 : reason === "held" ? 480 : 960, reason === "held" ? "ZIWEI-CAREER-P0" : "ZIWEI-IDENTITY-P0");
    const preferences = createDatabaseNotificationPreferenceStore(database, SECRET, () => NOW);
    if (reason === "paid") await database.update(commerceOrders).set({ status: "paid", paidAt: NOW }).where(eq(commerceOrders.id, f.orderId));
    if (reason === "expired") await database.update(commerceOrders).set({ createdAt: new Date(NOW.getTime() - 86400000) }).where(eq(commerceOrders.id, f.orderId));
    if (reason === "blocked") await database.update(walletTopUpContinuations).set({ status: "blocked" }).where(eq(walletTopUpContinuations.orderId, f.orderId));
    if (reason === "cancelled") await database.update(walletPurchaseIntents).set({ status: "cancelled" }).where(eq(walletPurchaseIntents.id, f.intentId));
    if (reason === "stale") await database.update(walletPurchaseIntents).set({ stateVersion: 2 }).where(eq(walletPurchaseIntents.id, f.intentId));
    if (reason === "wrong-owner") await database.update(commerceOrders).set({ ownerId: "foreign-owner" }).where(eq(commerceOrders.id, f.orderId));
    if (reason === "wrong-locale") await database.update(commerceOrders).set({ locale: "en" }).where(eq(commerceOrders.id, f.orderId));
    if (reason === "unverified") await database.update(authUsers).set({ emailVerified: false }).where(eq(authUsers.id, f.userId));
    if (reason === "anonymous") await database.update(authUsers).set({ isAnonymous: true }).where(eq(authUsers.id, f.userId));
    if (reason === "deleted-profile") await database.update(birthProfiles).set({ deletedAt: NOW }).where(eq(birthProfiles.id, f.profileId));
    if (reason === "no-consent") await database.delete(consents).where(eq(consents.id, f.consentId));
    if (reason === "revoked-consent") await database.update(consents).set({ revokedAt: NOW }).where(eq(consents.id, f.consentId));
    if (reason === "latest-revoked") await database.insert(consents).values({ id: randomUUID(), userId: f.userId, documentKey: "offers", documentVersion: "test-v2", purpose: "offers", grantedAt: NOW, revokedAt: NOW });
    if (reason === "unsubscribe") await preferences.unsubscribeEmail(f.email, f.userId);
    if (reason === "email-unsubscribe") await preferences.unsubscribeEmail(f.email);
    if (reason === "nurture-off") await preferences.updatePreferences(f.userId, { nurtureEmailsAllowed: false });
    if (reason === "deletion") await createDatabaseDeletionRepository(database).request({ userId: f.userId, requestId: "test-request", requestedAt: NOW, recoverUntil: NOW });
    expect(await service().scanAndCapture()).toBe(0); expect(await captures()).toEqual([]);
  });
  it("rejects a recalculated chart version and a foreign chart owner", async () => {
    const f = await fixture();
    await database.insert(calculationRuns).values({ id: "new-run", profileId: f.profileId, profileRevisionId: f.revisionId,
      idempotencyKey: "new-run", engineId: "synthetic", engineVersion: "1", adapterId: "synthetic", adapterVersion: "1", schemaId: "synthetic", ruleSetId: "synthetic", inputHash: "a", configHash: "b", rawSnapshotHash: "c", createdAt: NOW });
    await database.insert(ziweiChartVersions).values({ id: "new-version", chartId: f.chartId, calculationRunId: "new-run", normalizedOutput: {}, privateRawSnapshot: {}, warnings: [], provenance: {}, createdAt: NOW });
    expect(await service().scanAndCapture()).toBe(0);
    await database.delete(ziweiChartVersions).where(eq(ziweiChartVersions.id, "new-version"));
    await database.insert(authUsers).values({ id: "foreign-owner", email: "foreign@example.test", name: "Foreign test owner", emailVerified: true });
    await database.update(birthProfiles).set({ userId: "foreign-owner" }).where(eq(birthProfiles.id, f.profileId));
    expect(await service().scanAndCapture()).toBe(0);
  });
  it.each(["settlement", "replacement", "revocation"])("skips a concurrent %s source writer without deadlocking or capturing stale terms", async kind => {
    const f = await fixture(); let entered!: () => void; let release!: () => void;
    const locked = new Promise<void>(resolve => { entered = resolve; }); const released = new Promise<void>(resolve => { release = resolve; });
    const writer = database.transaction(async tx => {
      if (kind === "settlement") await tx.select().from(commerceOrders).where(eq(commerceOrders.id, f.orderId)).for("update");
      if (kind === "replacement") await tx.select().from(walletPurchaseIntents).where(eq(walletPurchaseIntents.id, f.intentId)).for("update");
      if (kind === "revocation") await tx.select().from(consents).where(eq(consents.id, f.consentId)).for("update");
      entered(); await released;
      if (kind === "settlement") await tx.update(commerceOrders).set({ status: "paid", paidAt: NOW }).where(eq(commerceOrders.id, f.orderId));
      if (kind === "replacement") await tx.update(walletPurchaseIntents).set({ status: "cancelled", stateVersion: 2 }).where(eq(walletPurchaseIntents.id, f.intentId));
      if (kind === "revocation") await tx.update(consents).set({ revokedAt: NOW }).where(eq(consents.id, f.consentId));
    });
    await locked;
    try { expect(await service().scanAndCapture()).toBe(0); } finally { release(); await writer; }
    expect(await service().scanAndCapture()).toBe(0); expect(await captures()).toEqual([]);
  });
  it("purges private capture payloads and receipts and blocks all later captures", async () => {
    const f = await fixture(); expect(await service().scanAndCapture()).toBe(1);
    const deletion = createDatabaseDeletionRepository(database);
    const requested = await deletion.request({ userId: f.userId, requestId: "delete-qa", requestedAt: NOW, recoverUntil: NOW });
    expect(requested.ok).toBe(true);
    expect(await deletion.purgeExpired(NOW, 10)).toEqual(requested.ok ? [requested.value.requestId] : []);
    expect(await captures()).toEqual([]);
    expect(await database.select().from(outbox).where(eq(outbox.eventType, RECOVERY_CAPTURE_EVENT_TYPE))).toEqual([]);
    expect(await service().scanAndCapture()).toBe(0);
  });
  it("waits for a coordinated deletion writer, then observes the requested marker", async () => {
    const f = await fixture(); let entered!: () => void; let release!: () => void;
    const locked = new Promise<void>(resolve => { entered = resolve; }); const released = new Promise<void>(resolve => { release = resolve; });
    const writer = database.transaction(async tx => {
      await lockRecoveryCaptureCoordination(tx);
      await tx.insert(deletionRequests).values({ id: "race-delete", userId: f.userId, requestedAt: NOW, recoverUntil: NOW, purgeAfter: NOW });
      entered(); await released;
    });
    await locked; const capture = service().scanAndCapture();
    try {
      await expect.poll(async () => (await database.execute(sql`SELECT count(*)::integer AS waiting FROM pg_locks WHERE locktype = 'advisory' AND NOT granted`))[0]?.waiting).toBe(1);
    } finally { release(); await writer; }
    expect(await capture).toBe(0); expect(await captures()).toEqual([]);
  });
  it("waits for the real recalculation writer and rejects the now-stale chart version", async () => {
    const f = await fixture(); let entered!: () => void; let release!: () => void;
    const locked = new Promise<void>(resolve => { entered = resolve; }); const released = new Promise<void>(resolve => { release = resolve; });
    const writerDatabase = new Proxy(database, {
      get(target, key) {
        if (key !== "transaction") return Reflect.get(target, key);
        return (callback: Parameters<Database["transaction"]>[0]) => target.transaction(async tx => {
          let first = true;
          const fenced = new Proxy(tx, { get(transaction, member) {
            if (member !== "execute") return Reflect.get(transaction, member);
            return async (...args: Parameters<typeof tx.execute>) => {
              const result = await transaction.execute(...args);
              if (first) { first = false; entered(); await released; }
              return result;
            };
          } });
          return callback(fenced);
        });
      },
    });
    const chart: NormalizedZiweiChartV1 = { version: 1, systemId: "ziwei", palaces: ZIWEI_PALACE_IDS.map((id,index)=>({id,
      earthlyBranchId: ["ziwei.branch.rat","ziwei.branch.ox","ziwei.branch.tiger","ziwei.branch.rabbit","ziwei.branch.dragon","ziwei.branch.snake","ziwei.branch.horse","ziwei.branch.goat","ziwei.branch.monkey","ziwei.branch.rooster","ziwei.branch.dog","ziwei.branch.pig"][index]!,stars:[]})), transformations: [],
      soulPalaceId: "ziwei.palace.life", bodyPalaceId: "ziwei.palace.career", horoscopeCapabilities: [], warnings: [],
      provenance: { version: 1, engineId: "ziwei.iztro", engineVersion: "2.6.0", adapterId: "ziwei.iztro-adapter",
        adapterVersion: "1", schemaId: "normalized-ziwei-chart-v1", ruleSetId: "ziwei.default", inputHash: "a".repeat(64),
        configHash: "b".repeat(64), rawSnapshotHash: "c".repeat(64), calculatedAt: NOW.toISOString(), limitations: [] } };
    const writer = createDatabaseZiweiCalculationRepository(writerDatabase).create({ profileId: f.profileId,
      revisionId: f.revisionId, idempotencyKey: "real-recalculation-race", chart, rawSnapshot: {}, now: NOW });
    await locked; const capture = service().scanAndCapture();
    try {
      await expect.poll(async () => (await database.execute(sql`SELECT count(*)::integer AS waiting FROM pg_locks WHERE locktype = 'advisory' AND NOT granted`))[0]?.waiting).toBe(1);
    } finally { release(); }
    const recalculated = await writer;
    expect(recalculated.chartId).toBe(f.chartId); expect(recalculated.chartVersionId).not.toBe(f.chartVersionId);
    expect(await capture).toBe(0); expect(await captures()).toEqual([]);
  });
  it("rolls back the capture if its atomic outbox receipt cannot be persisted", async () => {
    const f = await fixture(); const key = `recovery-pending-topup:${f.orderId}`;
    await database.insert(outbox).values({ schemaVersion: 1, eventType: RECOVERY_CAPTURE_EVENT_TYPE,
      eventId: key, idempotencyKey: key, occurredAt: NOW, traceId: key, actorId: f.userId,
      aggregateType: "account", aggregateId: f.userId, payload: { syntheticPersistenceConflict: true }, status: "processed", processedAt: NOW });
    await expect(service().scanAndCapture()).rejects.toThrow();
    expect(await captures()).toEqual([]);
    expect(await database.select().from(outbox)).toHaveLength(1);
    await database.delete(outbox).where(eq(outbox.idempotencyKey, key));
    expect(await service().scanAndCapture()).toBe(1);
    expect(await captures()).toHaveLength(1);
  });
  it("accepts an explicit account offers grant from the real consent repository", async () => {
    const f = await fixture(); await database.delete(consents).where(eq(consents.id, f.consentId));
    expect(await service().scanAndCapture()).toBe(0);
    await createDatabaseConsentRepository(database).record({ actor: { kind: "account", userId: f.userId, requestId: "qa-consent" },
      documentKey: "offers", documentVersion: "test-v2", purposes: ["offers"], grantedAt: NOW });
    expect(await service().scanAndCapture()).toBe(1);
  });
  it("uses each purchase's frozen base across the FD119 catalog change", async () => {
    const original = await fixture("vi", 960); const current = await fixture("vi", 1200);
    expect(await service().scanAndCapture()).toBe(2);
    const records = await captures();
    expect(records.find(item => item.requestPayload.orderId === original.orderId)!.requestPayload.amountLa).toBe(960);
    expect(records.find(item => item.requestPayload.orderId === current.orderId)!.requestPayload.amountLa).toBe(1200);
    expect(records.every(item => item.status === "captured" && item.sentAt === null)).toBe(true);
    expect(await database.select().from(walletTransactions)).toHaveLength(0);
  });

});
