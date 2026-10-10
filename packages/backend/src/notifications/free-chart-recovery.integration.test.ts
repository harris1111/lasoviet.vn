import { createHash, randomUUID } from "node:crypto";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq, sql } from "drizzle-orm";
import {
  authAnonymousActors, authUsers, birthProfiles, birthProfileRevisions, calculationRuns, commerceEntitlements, commerceOrders,
  consents, createDatabase, deletionRequests, freeChartRecoverySources, lockRecoveryCaptureCoordination,
  notificationDeliveries, outbox, recoveryOutboundControl, runMigrations, walletPurchaseIntents,
  walletTopUpContinuations, walletTransactions, ziweiCharts, ziweiChartVersions, type Database,
} from "@lasoviet/database";
import type { FreeChartRecoverySourceV1 } from "@lasoviet/contracts";
import { linkAnonymousActorToAccount } from "@lasoviet/database/runtime";
import { createDatabaseBirthProfileRepository } from "../birth-profile/birth-profile.repository.js";
import { createDatabaseDeletionRepository } from "../privacy/deletion.repository.js";
import { createDatabaseAnonymousRetentionRepository } from "../privacy/anonymous-retention.repository.js";
import { purgeFreePalaceForChartVersions } from "../ziwei/free-palace-artifact.repository.js";
import { createDatabaseAuthEmailDeliveryStore } from "./auth-email.js";
import { createFreeChartRecoverySourceRepository, type TrustedDisplayedSourceReader } from "./free-chart-recovery-source.repository.js";
import { createFreeChartRecoveryCaptureService, FREE_CHART_RECOVERY_CAPTURE_EVENT_TYPE } from "./free-chart-recovery-capture.js";
import { createDatabaseNotificationPreferenceStore, verifyUnsubscribeToken } from "./notification-preference.js";
import { createPendingTopUpRecoveryCaptureService } from "./pending-topup-recovery-capture.js";
import { createPendingTopUpRecoveryRunner } from "./pending-topup-recovery-runner.js";

const NOW = new Date("2026-10-10T12:00:00.000Z"), VIEWED = new Date("2026-10-09T12:00:00.000Z");
const CREATED = new Date("2026-10-08T12:00:00.000Z"), SECRET = "synthetic-free-chart-capture-test-secret";
const hash = (value: string) => createHash("sha256").update(value).digest("hex");

describe("private free-chart recovery foundation with isolated PostgreSQL", () => {
  let container: Awaited<ReturnType<PostgreSqlContainer["start"]>>, database: Database;
  let displayed: Map<string, unknown>, providerCalls: number;
  const reader: TrustedDisplayedSourceReader = async ({ chartId }) => displayed.get(chartId) ?? null;
  function options(overrides: Partial<Parameters<typeof createFreeChartRecoveryCaptureService>[0]> = {}) {
    return { database, mode: "capture" as const, tokenSecret: SECRET, readTrustedDisplayedSource: reader, now: () => NOW, ...overrides };
  }
  const capture = (overrides: Parameters<typeof options>[0] = {}) => createFreeChartRecoveryCaptureService(options(overrides));
  const sources = (overrides: Parameters<typeof options>[0] = {}) => createFreeChartRecoverySourceRepository(options(overrides));
  const lookup = (source: FreeChartRecoverySourceV1) => ({ userId: source.userId, chartId: source.chartId, viewReceiptSha256: source.viewReceiptSha256 });
  async function deliveries() { return database.select().from(notificationDeliveries).where(eq(notificationDeliveries.kind, "recovery_free_chart")); }
  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:17-alpine").start();
    await runMigrations(container.getConnectionUri()); database = createDatabase(container.getConnectionUri());
  }, 60000);
  afterAll(async () => { await container?.stop(); });
  beforeEach(async () => {
    await database.execute(sql`TRUNCATE auth_users, commerce_orders, notification_deliveries, outbox, recovery_outbound_control CASCADE`);
    displayed = new Map(); providerCalls = 0;
  });
  async function fixture(locale: "vi" | "en" = "vi", offerKey: FreeChartRecoverySourceV1["offerKey"] = "ziwei-palace") {
    const userId = randomUUID(), chartId = `chart-${userId}`, chartVersionId = `version-${userId}`;
    const profileId = `profile-${userId}`, revisionId = `revision-${userId}`, runId = `run-${userId}`, consentId = randomUUID();
    const email = `${userId}@example.test`;
    await database.insert(authUsers).values({ id: userId, email, name: "Synthetic displayed-chart owner", emailVerified: true, createdAt: CREATED, updatedAt: CREATED });
    await database.insert(consents).values({ id: consentId, userId, documentKey: "offers", documentVersion: "test-v1", purpose: "offers", grantedAt: CREATED });
    await database.insert(birthProfiles).values({ id: profileId, userId, createdAt: CREATED, updatedAt: CREATED });
    await database.insert(birthProfileRevisions).values({ id: revisionId, profileId, revisionNumber: 1,
      originalInput: {}, normalizedInput: {}, consentVersion: "test-v1", createdAt: CREATED });
    await database.insert(calculationRuns).values({ id: runId, profileId, profileRevisionId: revisionId,
      idempotencyKey: runId, engineId: "synthetic", engineVersion: "1", adapterId: "synthetic", adapterVersion: "1",
      schemaId: "synthetic", ruleSetId: "synthetic", inputHash: "a", configHash: "b", rawSnapshotHash: "c", createdAt: CREATED });
    await database.insert(ziweiCharts).values({ id: chartId, profileId, profileRevisionId: revisionId, createdAt: CREATED });
    await database.insert(ziweiChartVersions).values({ id: chartVersionId, chartId, calculationRunId: runId,
      normalizedOutput: {}, privateRawSnapshot: {}, warnings: [], provenance: {}, createdAt: CREATED });
    const teaserText = locale === "vi" ? 'Đoạn đã hiển thị riêng của bạn <script> " &\nDòng hai.' : 'Your exact displayed teaser <script> " &\nSecond line.';
    const source: FreeChartRecoverySourceV1 = { version: 1, kind: "displayed-free-chart", userId, chartId, chartVersionId, locale,
      contentSha256: hash("synthetic-displayed-content"), rendererVersion: "synthetic-renderer-v1", rendererSha256: hash("synthetic-renderer"),
      teaserText, teaserSha256: hash(teaserText), viewReceiptSha256: hash(chartId), firstViewedAt: VIEWED.toISOString(),
      offerKey, productSku: offerKey === "ziwei-palace" ? "ZIWEI-PALACE-PROPERTY-P0" : "ZIWEI-IDENTITY-P0",
      palaceId: "ziwei.palace.property", anchor: "synthetic-displayed-property" };
    displayed.set(chartId, source);
    return { source, userId, chartId, chartVersionId, profileId, revisionId, runId, consentId, email };
  }
  async function register(f: Awaited<ReturnType<typeof fixture>>) { expect(await sources().recordFirstView(lookup(f.source))).toBe("recorded"); }
  async function topUp(f: Awaited<ReturnType<typeof fixture>>) {
    const orderId = randomUUID();
    const [existingIntent] = await database.select().from(walletPurchaseIntents).where(eq(walletPurchaseIntents.chartId, f.chartId));
    const intentId = existingIntent?.id ?? randomUUID();
    if (!existingIntent) await database.insert(walletPurchaseIntents).values({ id: intentId, ownerId: f.userId, chartId: f.chartId, chartVersionId: f.chartVersionId,
      sku: "ZIWEI-IDENTITY-P0", locale: "vi", priceLa: 960, createdAt: new Date(NOW.getTime() - 1800000) });
    await database.insert(commerceOrders).values({ id: orderId, invoiceNumber: `test-${orderId}`, kind: "wallet_topup", ownerId: f.userId,
      sku: "LA-ENTRY-300", amount: 29000, currency: "VND", locale: "vi", createdAt: new Date(NOW.getTime() - 1800000) });
    await database.insert(walletTopUpContinuations).values({ orderId, ownerId: f.userId, purchaseIntentId: intentId,
      intentStateVersion: 1, confirmedPriceLa: 960, returnTab: "overview", createdAt: new Date(NOW.getTime() - 1800000) });
    return orderId;
  }
  it("refuses disabled or missing display producer before any database or provider work", async () => {
    const f = await fixture(); const noDb = new Proxy({} as Database, { get() { throw new Error("DATABASE_MUST_NOT_BE_CALLED"); } });
    expect(await createFreeChartRecoverySourceRepository(options({ database: noDb, mode: undefined })).recordFirstView(lookup(f.source))).toBe("disabled");
    expect(await createFreeChartRecoverySourceRepository(options({ database: noDb, readTrustedDisplayedSource: undefined })).recordFirstView(lookup(f.source))).toBe("refused");
    expect(await createFreeChartRecoveryCaptureService(options({ database: noDb, mode: undefined })).scanAndCapture()).toBe(0);
    expect(await createFreeChartRecoveryCaptureService(options({ database: noDb, readTrustedDisplayedSource: undefined })).scanAndCapture()).toBe(0);
    expect(await database.select().from(freeChartRecoverySources)).toEqual([]);
  });
  it.each(["vi", "en"] as const)("captures exact own %s teaser, supported consumer links and a processed receipt once", async locale => {
    const f = await fixture(locale, locale === "vi" ? "ziwei-palace" : "ziwei-comprehensive"); await register(f);
    const ordersBefore = await database.select().from(commerceOrders);
    expect(await capture().scanAndCapture()).toBe(1);
    const [row] = await deliveries(); expect(row).toMatchObject({ status: "captured", attemptCount: 0, sentAt: null, providerMessageId: null, sendingLeaseExpiresAt: null });
    const p = row!.requestPayload;
    expect(p.text).toContain(f.source.teaserText); expect(p.html).not.toContain("<script>"); expect(p.html).toContain("&lt;script&gt;");
    expect(p.teaserUrl).toBe(`https://lasoviet.net${locale === "en" ? "/en" : ""}/la-so/${f.chartId}#${f.source.anchor}`);
    const action = new URL(p.actionUrl as string); expect(action.pathname).toBe(`${locale === "en" ? "/en" : ""}/la-so/${f.chartId}/chon-luan-giai`);
    expect(Object.fromEntries(action.searchParams)).toEqual({ offer: f.source.offerKey, palace: f.source.palaceId, utm_source: "followup" });
    expect(verifyUnsubscribeToken(new URL(p.unsubscribeUrl as string).hash.slice(7), SECRET, undefined, NOW)).toMatchObject({ ok: true, value: { userId: f.userId, email: f.email } });
    const links = [...(p.html as string).matchAll(/href="([^"]+)"/g)].map(match => match[1]!.replaceAll("&amp;", "&"));
    expect(links).toEqual([p.teaserUrl, p.actionUrl, p.unsubscribeUrl]);
    const [receipt] = await database.select().from(outbox).where(eq(outbox.eventType, FREE_CHART_RECOVERY_CAPTURE_EVENT_TYPE));
    expect(receipt).toMatchObject({ status: "processed", processedAt: NOW, actorId: f.userId, attemptCount: 0 });
    expect(await capture().scanAndCapture()).toBe(0); expect(await database.select().from(commerceOrders)).toEqual(ordersBefore);
    expect(await database.select().from(walletTransactions)).toEqual([]); expect(providerCalls).toBe(0);
  });
  it("keeps immutable first-view/content and refuses UPDATEs and replacement receipts", async () => {
    const f = await fixture(); await register(f);
    const before = await database.select().from(freeChartRecoverySources);
    expect(await sources().recordFirstView(lookup(f.source))).toBe("reused");
    displayed.set(f.chartId, { ...f.source, firstViewedAt: NOW.toISOString() });
    expect(await sources().recordFirstView(lookup(f.source))).toBe("refused");
    expect(await capture().scanAndCapture()).toBe(0);
    await expect(database.update(freeChartRecoverySources).set({ firstViewedAt: NOW }).where(eq(freeChartRecoverySources.chartId, f.chartId))).rejects.toThrow();
    expect(await database.select().from(freeChartRecoverySources)).toEqual(before);
  });
  it.each(["hash", "extra", "private-draft", "analytics", "nurture", "sku", "offer", "anchor", "foreign", "future", "before-created"])("refuses %s as display authority", async reason => {
    const f = await fixture(); const patch: Record<string, unknown> = {};
    if (reason === "hash") patch.teaserSha256 = hash("different");
    if (reason === "extra") patch.publiclyDisplayed = true;
    if (["private-draft", "analytics", "nurture"].includes(reason)) patch.kind = reason;
    if (reason === "sku") patch.productSku = "ZIWEI-CAREER-P0";
    if (reason === "offer") patch.offerKey = "year2027";
    if (reason === "anchor") patch.anchor = 'x\" onclick=evil';
    if (reason === "foreign") patch.userId = "foreign-owner";
    if (reason === "future") patch.firstViewedAt = new Date(NOW.getTime() + 1).toISOString();
    if (reason === "before-created") patch.firstViewedAt = new Date(CREATED.getTime() - 1).toISOString();
    displayed.set(f.chartId, { ...f.source, ...patch });
    expect(await sources().recordFirstView(lookup(f.source))).toBe("refused"); expect(await capture().scanAndCapture()).toBe(0);
  });
  it("uses actual first-view plus exactly24h rather than old chart creation", async () => {
    const f = await fixture(); await register(f);
    expect(await capture({ now: () => new Date(NOW.getTime() - 1) }).scanAndCapture()).toBe(0);
    expect(await capture().scanAndCapture()).toBe(1);
  });
  it.each(["source-changed", "renderer-changed", "unverified", "anonymous", "deleted-profile", "foreign-profile", "no-consent", "revoked", "latest-revoked", "future-consent", "unsubscribe", "email-unsubscribe", "nurture-off", "deletion", "version-drift", "purchase", "expired-access"])("rechecks %s before capture", async reason => {
    const f = await fixture(); await register(f);
    if (reason === "source-changed") displayed.set(f.chartId, { ...f.source, contentSha256: hash("changed-content") });
    if (reason === "renderer-changed") displayed.set(f.chartId, { ...f.source, rendererSha256: hash("changed-renderer") });
    if (reason === "unverified") await database.update(authUsers).set({ emailVerified: false }).where(eq(authUsers.id, f.userId));
    if (reason === "anonymous") await database.update(authUsers).set({ isAnonymous: true }).where(eq(authUsers.id, f.userId));
    if (reason === "deleted-profile") await database.update(birthProfiles).set({ deletedAt: NOW }).where(eq(birthProfiles.id, f.profileId));
    if (reason === "foreign-profile") {
      await database.insert(authUsers).values({ id: "foreign-owner", email: "foreign@example.test", name: "Foreign owner" });
      await database.update(birthProfiles).set({ userId: "foreign-owner" }).where(eq(birthProfiles.id, f.profileId));
    }
    if (reason === "no-consent") await database.delete(consents).where(eq(consents.id, f.consentId));
    if (reason === "revoked") await database.update(consents).set({ revokedAt: NOW }).where(eq(consents.id, f.consentId));
    if (["latest-revoked", "future-consent"].includes(reason)) await database.insert(consents).values({ id: randomUUID(), userId: f.userId,
      documentKey: "offers", documentVersion: "test-v2", purpose: "offers", grantedAt: reason === "future-consent" ? new Date(NOW.getTime() + 1) : NOW,
      revokedAt: reason === "latest-revoked" ? NOW : null });
    const preferences = createDatabaseNotificationPreferenceStore(database, SECRET, () => NOW);
    if (reason === "unsubscribe") await preferences.unsubscribeEmail(f.email, f.userId);
    if (reason === "email-unsubscribe") await preferences.unsubscribeEmail(f.email);
    if (reason === "nurture-off") await preferences.updatePreferences(f.userId, { nurtureEmailsAllowed: false });
    if (reason === "deletion") await createDatabaseDeletionRepository(database).request({ userId: f.userId, requestId: "delete-marker", requestedAt: NOW, recoverUntil: NOW });
    if (reason === "version-drift") {
      const [run] = await database.select().from(calculationRuns).where(eq(calculationRuns.id, f.runId));
      await database.insert(calculationRuns).values({ ...run!, id: "new-run", idempotencyKey: "new-run", createdAt: NOW });
      await database.insert(ziweiChartVersions).values({ id: "new-version", chartId: f.chartId, calculationRunId: "new-run",
        normalizedOutput: {}, privateRawSnapshot: {}, warnings: [], provenance: {}, createdAt: NOW });
    }
    if (["purchase", "expired-access"].includes(reason)) {
      const orderId = randomUUID(); await database.insert(commerceOrders).values({ id: orderId, invoiceNumber: orderId, ownerId: f.userId,
        chartId: f.chartId, chartVersionId: f.chartVersionId, sku: "ZIWEI-IDENTITY-P0", amount: 29000, currency: "VND", locale: "vi", status: "paid", paidAt: CREATED });
      if (reason === "expired-access") await database.insert(commerceEntitlements).values({ orderId, ownerId: f.userId, chartId: f.chartId,
        sku: "ZIWEI-IDENTITY-P0", scope: { sections: ["overview"] }, createdAt: CREATED, expiresAt: VIEWED });
    }
    expect(await capture().scanAndCapture()).toBe(0); expect(await deliveries()).toEqual([]);
  });
  it("shares max2 with pending capture under concurrent scans", async () => {
    const f = await fixture(); await register(f); await topUp(f); await topUp(f);
    const pending = createPendingTopUpRecoveryCaptureService({ database, mode: "capture", tokenSecret: SECRET, orderTtlSeconds: 86400, now: () => NOW });
    const counts = await Promise.all([capture().scanAndCapture(), pending.scanAndCapture(), capture().scanAndCapture(), pending.scanAndCapture()]);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(2);
    expect(await database.select().from(notificationDeliveries)).toHaveLength(2);
    expect(await capture().scanAndCapture()).toBe(0); expect(await pending.scanAndCapture()).toBe(0);
  });
  it("shares max2 with the fresh pending queue, without constructing a customer provider", async () => {
    const f = await fixture(); await register(f); expect(await capture().scanAndCapture()).toBe(1); await topUp(f); await topUp(f);
    await database.insert(recoveryOutboundControl).values({ id: "pending-topup", emergencyStopped: false, cohortIds: [f.userId], dailyLimit: 5 });
    const runner = createPendingTopUpRecoveryRunner({ database, mode: "prepare", tokenSecret: SECRET, orderTtlSeconds: 86400, now: () => NOW,
      provider: { async send() { providerCalls += 1; throw new Error("NO_CUSTOMER_PROVIDER"); } } });
    expect(await runner.enqueueFresh()).toBe(1); expect(await runner.enqueueFresh()).toBe(0);
    expect(await database.select().from(notificationDeliveries)).toHaveLength(2); expect(providerCalls).toBe(0);
  });
  it("rolls back a capture when its processed receipt conflicts", async () => {
    const f = await fixture(); await register(f); const key = `recovery-free-chart:${f.chartId}`;
    await database.insert(outbox).values({ schemaVersion: 1, eventType: FREE_CHART_RECOVERY_CAPTURE_EVENT_TYPE, eventId: key,
      idempotencyKey: key, occurredAt: NOW, traceId: key, actorId: f.userId, aggregateType: "account", aggregateId: f.userId, payload: {}, status: "processed", processedAt: NOW });
    await expect(capture().scanAndCapture()).rejects.toThrow(); expect(await deliveries()).toEqual([]);
  });
  it.each(["chart", "user", "profile", "latest-consent"])("skips a busy %s authority without deadlock or older-consent fallback", async kind => {
    const f = await fixture(); await register(f);
    const latestId = randomUUID(); await database.insert(consents).values({ id: latestId, userId: f.userId, documentKey: "offers", documentVersion: "test-v2", purpose: "offers", grantedAt: VIEWED });
    let entered!: () => void, release!: () => void;
    const locked = new Promise<void>(resolve => { entered = resolve; }), released = new Promise<void>(resolve => { release = resolve; });
    const writer = database.transaction(async tx => {
      if (kind === "chart") await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`commerce:chart:${f.chartId}`}))`);
      if (kind === "user") await tx.select().from(authUsers).where(eq(authUsers.id, f.userId)).for("update");
      if (kind === "profile") await tx.select().from(birthProfiles).where(eq(birthProfiles.id, f.profileId)).for("update");
      if (kind === "latest-consent") await tx.select().from(consents).where(eq(consents.id, latestId)).for("update");
      entered(); await released;
      if (kind === "latest-consent") await tx.update(consents).set({ revokedAt: NOW }).where(eq(consents.id, latestId));
      if (kind === "chart") await tx.insert(commerceOrders).values({ invoiceNumber: randomUUID(), ownerId: f.userId,
        chartId: f.chartId, chartVersionId: f.chartVersionId, sku: "ZIWEI-IDENTITY-P0", amount: 29000, currency: "VND", locale: "vi" });
    });
    await locked;
    try { expect(await capture().scanAndCapture()).toBe(0); } finally { release(); await writer; }
    if (kind === "latest-consent" || kind === "chart") expect(await capture().scanAndCapture()).toBe(0);
  });
  it("samples the clock after a queued recovery fence and trusted reader delay", async () => {
    const f = await fixture(); await register(f); let now = new Date(NOW.getTime() - 1);
    let entered!: () => void, release!: () => void;
    const locked = new Promise<void>(resolve => { entered = resolve; }), released = new Promise<void>(resolve => { release = resolve; });
    const writer = database.transaction(async tx => { await lockRecoveryCaptureCoordination(tx); entered(); await released; });
    await locked; const scan = capture({ now: () => now, readTrustedDisplayedSource: async input => { now = new Date(NOW.getTime() + 25); return reader(input); } }).scanAndCapture();
    try {
      await expect.poll(async () => (await database.execute(sql`SELECT count(*)::integer AS waiting FROM pg_locks WHERE locktype = 'advisory' AND NOT granted`))[0]?.waiting).toBe(1);
    } finally { now = NOW; release(); await writer; }
    expect(await scan).toBe(1); expect((await deliveries())[0]!.createdAt).toEqual(new Date(NOW.getTime() + 25));
  });
  it("official manual profile archive purges source, teaser and receipt without an AI budget", async () => {
    const f = await fixture(); await register(f); expect(await capture().scanAndCapture()).toBe(1);
    expect(await createDatabaseBirthProfileRepository(database).archive({ kind: "account", userId: f.userId, sessionId: "synthetic-session", requestId: "manual-archive" }, f.profileId, NOW)).toBe(true);
    expect(await database.select().from(freeChartRecoverySources)).toEqual([]); expect(await deliveries()).toEqual([]);
    expect(await database.select().from(outbox).where(eq(outbox.eventType, FREE_CHART_RECOVERY_CAPTURE_EVENT_TYPE))).toEqual([]);
    expect(await sources().recordFirstView(lookup(f.source))).toBe("refused"); expect(await capture().scanAndCapture()).toBe(0);
  });
  it("the no-budget free-palace purge still removes captured bodies and a pending source", async () => {
    const f = await fixture(); await register(f); expect(await capture().scanAndCapture()).toBe(1);
    await database.transaction(async tx => { expect(await purgeFreePalaceForChartVersions(tx, [f.chartVersionId], NOW)).toBe(0); });
    expect(await database.select().from(freeChartRecoverySources)).toEqual([]); expect(await deliveries()).toEqual([]);
    expect(await database.select().from(outbox)).toEqual([]);
  });
  it("official account deletion purges private data and refuses late re-registration", async () => {
    const f = await fixture(); await register(f); expect(await capture().scanAndCapture()).toBe(1);
    const repository = createDatabaseDeletionRepository(database);
    const request = await repository.request({ userId: f.userId, requestId: "purge-free-chart", requestedAt: NOW, recoverUntil: NOW });
    expect(request.ok).toBe(true); expect(await capture().scanAndCapture()).toBe(0);
    await repository.purgeExpired(NOW, 10);
    expect(await database.select().from(freeChartRecoverySources)).toEqual([]); expect(await deliveries()).toEqual([]);
    expect(await database.select().from(outbox).where(eq(outbox.eventType, FREE_CHART_RECOVERY_CAPTURE_EVENT_TYPE))).toEqual([]);
    expect(await sources().recordFirstView(lookup(f.source))).toBe("refused");
  });
  it("observes a queued coordinated deletion before recording or capturing", async () => {
    const f = await fixture(); await register(f); let entered!: () => void, release!: () => void;
    const locked = new Promise<void>(resolve => { entered = resolve; }), released = new Promise<void>(resolve => { release = resolve; });
    const writer = database.transaction(async tx => {
      await lockRecoveryCaptureCoordination(tx); await tx.insert(deletionRequests).values({ id: "queued-delete", userId: f.userId, requestedAt: NOW, recoverUntil: NOW, purgeAfter: NOW });
      entered(); await released;
    });
    await locked; const scan = capture().scanAndCapture();
    try {
      await expect.poll(async () => (await database.execute(sql`SELECT count(*)::integer AS waiting FROM pg_locks WHERE locktype = 'advisory' AND NOT granted`))[0]?.waiting).toBe(1);
    } finally { release(); await writer; }
    expect(await scan).toBe(0); expect(await sources().recordFirstView(lookup(f.source))).toBe("refused");
  });
  it("fences anonymous deletion before its actor cascade, without deadlocking an in-flight consent FK writer", async () => {
    const actorId = randomUUID();
    await database.insert(authUsers).values({ id: actorId, email: `${actorId}@example.test`, name: "Synthetic anonymous owner", isAnonymous: true });
    await database.insert(authAnonymousActors).values({ id: actorId, expiresAt: new Date(NOW.getTime() + 60000), createdAt: CREATED });
    let entered!: () => void, insertConsent!: () => void, inserted!: () => void, release!: () => void;
    const locked = new Promise<void>(resolve => { entered = resolve; }), inserting = new Promise<void>(resolve => { insertConsent = resolve; });
    const insertionDone = new Promise<void>(resolve => { inserted = resolve; }), released = new Promise<void>(resolve => { release = resolve; });
    const writer = database.transaction(async tx => {
      await lockRecoveryCaptureCoordination(tx); entered(); await inserting;
      await tx.insert(consents).values({ id: randomUUID(), anonymousActorId: actorId,
        documentKey: "offers", documentVersion: "test-v1", purpose: "offers", grantedAt: NOW });
      inserted(); await released;
    });
    await locked; const purge = createDatabaseAnonymousRetentionRepository(database).deleteNow(actorId);
    try {
      await expect.poll(async () => (await database.execute(sql`SELECT count(*)::integer AS waiting FROM pg_locks WHERE locktype = 'advisory' AND NOT granted`))[0]?.waiting).toBe(1);
      insertConsent(); await Promise.race([insertionDone, writer]);
    } finally { insertConsent(); release(); await writer; }
    expect(await purge).toMatchObject({ ok: true, value: { actorId } });
    expect(await database.select().from(authAnonymousActors).where(eq(authAnonymousActors.id, actorId))).toEqual([]);
    expect(await database.select().from(consents).where(eq(consents.anonymousActorId, actorId))).toEqual([]);
  });
  it("official anonymous linking keeps chart identity and requires a fresh verified owned display", async () => {
    const f = await fixture(), actorId = randomUUID(), expiry = new Date(NOW.getTime() + 60000);
    await database.insert(authUsers).values({ id: actorId, email: `${actorId}@example.test`, name: "Synthetic guest", isAnonymous: true, createdAt: CREATED });
    await database.insert(authAnonymousActors).values({ id: actorId, expiresAt: expiry, createdAt: CREATED });
    await database.update(birthProfiles).set({ userId: null, anonymousActorId: actorId, anonymousExpiresAt: expiry }).where(eq(birthProfiles.id, f.profileId));
    const guestSource = { ...f.source, userId: actorId }; displayed.set(f.chartId, guestSource);
    expect(await sources().recordFirstView(lookup(guestSource))).toBe("refused");
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(NOW);
    try { expect(await linkAnonymousActorToAccount(database, actorId, f.userId)).toMatchObject({ ok: true }); }
    finally { vi.useRealTimers(); }
    expect(await sources().recordFirstView(lookup(guestSource))).toBe("refused");
    const freshSource = { ...f.source, firstViewedAt: NOW.toISOString(), viewReceiptSha256: hash("synthetic-fresh-account-view") };
    displayed.set(f.chartId, freshSource);
    expect(await sources().recordFirstView(lookup(freshSource))).toBe("recorded");
    expect(await sources().recordFirstView(lookup(freshSource))).toBe("reused");
    const rows = await database.select().from(freeChartRecoverySources);
    expect(rows).toHaveLength(1); expect(rows[0]).toMatchObject({ chartId: f.chartId, userId: f.userId, chartVersionId: f.chartVersionId });
    expect(await capture().scanAndCapture()).toBe(0);
    expect(await capture({ now: () => new Date(NOW.getTime() + 86400000) }).scanAndCapture()).toBe(1);
  });
  it.each(["captured", "pending", "failed_retryable"] as const)("generic sender refuses %s free-chart records even after status tampering", async status => {
    const f = await fixture(); await register(f); await capture().scanAndCapture(); const [row] = await deliveries();
    await database.update(notificationDeliveries).set({ status }).where(eq(notificationDeliveries.id, row!.id));
    const store = createDatabaseAuthEmailDeliveryStore(database);
    expect(await store.listRetryable(100)).toEqual([]); expect(await store.claim(row!.idempotencyKey, NOW, new Date(NOW.getTime() + 1000))).toBeNull();
    await expect(store.getByIdempotencyKey(row!.idempotencyKey)).rejects.toThrow("CAPTURE_RECORD_NOT_DELIVERABLE");
    expect(providerCalls).toBe(0); expect((await deliveries())[0]!.attemptCount).toBe(0);
  });
});
