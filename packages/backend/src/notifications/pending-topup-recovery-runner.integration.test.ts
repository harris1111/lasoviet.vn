import { randomUUID } from "node:crypto";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq, sql } from "drizzle-orm";
import { authUsers, birthProfiles, birthProfileRevisions, calculationRuns, commerceOrders, consents,
  createDatabase, notificationDeliveries, recoveryOutboundControl, recoveryOutboundDailyAttempts, runMigrations,
  walletPurchaseIntents, walletTopUpContinuations, walletTransactions, ziweiCharts, ziweiChartVersions, type Database } from "@lasoviet/database";
import { createDatabaseAuthEmailDeliveryStore } from "./auth-email.js";
import { createDatabaseNotificationPreferenceStore } from "./notification-preference.js";
import { createPendingTopUpRecoveryCaptureService } from "./pending-topup-recovery-capture.js";
import type { EmailProvider } from "./email-provider.js";
import { createPendingTopUpRecoveryRunner } from "./pending-topup-recovery-runner.js";
const NOW = new Date("2026-10-08T12:00:00.000Z"), CREATED = new Date("2026-10-08T11:30:00.000Z");
const SECRET = "synthetic-recovery-secret-not-a-provider-credential";
describe("durable recovery runner with isolated PostgreSQL and injected provider", () => {
  let container: Awaited<ReturnType<PostgreSqlContainer["start"]>>, database: Database;
  let now = NOW;
  const send = vi.fn<EmailProvider["send"]>(async () => ({ ok: true as const, providerMessageId: "synthetic-message" }));
  beforeAll(async () => { container = await new PostgreSqlContainer("postgres:17-alpine").start(); await runMigrations(container.getConnectionUri()); database = createDatabase(container.getConnectionUri()); }, 60000);
  afterAll(async () => { await container?.stop(); });
  beforeEach(async () => {
    await database.execute(sql`TRUNCATE auth_users, commerce_orders, notification_deliveries, recovery_outbound_daily_attempts CASCADE`);
    await database.update(recoveryOutboundControl).set({ emergencyStopped: true, cohortIds: [], dailyLimit: 5 });
    now = NOW; send.mockReset().mockResolvedValue({ ok: true, providerMessageId: "synthetic-message" });
  });
  const runner = (mode: "prepare" | "disabled" = "prepare") => createPendingTopUpRecoveryRunner({ database, mode, tokenSecret: SECRET, orderTtlSeconds: 172800, provider: { send }, now: () => now });
  const allow = async (ids: string[], dailyLimit = 5) => { await database.update(recoveryOutboundControl).set({ emergencyStopped: false, cohortIds: ids, dailyLimit }); };
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
      sku, locale, priceLa, createdAt: CREATED });
    await addOrder(orderId, intentId, userId, locale, priceLa);
    return { userId, email, chartId, chartVersionId, profileId, revisionId, runId, consentId, intentId, orderId };
  }
  async function addOrder(orderId: string, intentId: string, userId: string, locale = "vi", priceLa = 960) {
    await database.insert(commerceOrders).values({ id: orderId, invoiceNumber: `test-${orderId}`, kind: "wallet_topup",
      ownerId: userId, sku: "LA-ENTRY-300", amount: 29000, currency: "VND", locale, createdAt: CREATED });
    await database.insert(walletTopUpContinuations).values({ orderId, ownerId: userId, purchaseIntentId: intentId,
      intentStateVersion: 1, confirmedPriceLa: priceLa, returnTab: "overview", createdAt: CREATED });
  }

  it("defaults to disabled and stopped; never promotes old captures", async () => {
    const f = await fixture();
    expect(await runner("disabled").enqueueFresh()).toBe(0);
    expect(await runner().enqueueFresh()).toBe(0);
    await allow([f.userId]);
    expect(await createPendingTopUpRecoveryCaptureService({ database, mode: "capture", tokenSecret: SECRET, orderTtlSeconds: 172800, now: () => now }).scanAndCapture()).toBe(1);
    expect(await runner().enqueueFresh()).toBe(0);
    expect(await runner().claimNext()).toBeNull();
    expect(send).not.toHaveBeenCalled();
  });
  it("queues and sends one fresh owned bilingual message once without financial mutation", async () => {
    const f = await fixture("en"); await allow([f.userId]);
    expect(await runner().enqueueFresh()).toBe(1);
    const [pending] = await database.select().from(notificationDeliveries);
    expect(await createDatabaseAuthEmailDeliveryStore(database).claim(pending!.idempotencyKey, NOW, new Date(NOW.getTime()+45000))).toBeNull();
    const claim = (await runner().claimNext())!;
    expect(claim).toBeTruthy();
    expect(await Promise.all([runner().deliverClaimed(claim), runner().deliverClaimed(claim)])).toEqual(["sent", "ignored"]);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0]![0]).toMatchObject({ to: f.email, subject: "Your La top-up is pending" });
    const [row] = await database.select().from(notificationDeliveries);
    expect(row).toMatchObject({ status: "sent", attemptCount: 1, sentAt: NOW, providerMessageId: "synthetic-message" });
    expect(send.mock.calls[0]![0].text).toContain(`https://lasoviet.net/en/thanh-toan/${f.orderId}?utm_source=reminder#recovery=${row!.id}`);
    for (const key of ["text","html","unsubscribeUrl","actionUrl"]) expect(row!.requestPayload).not.toHaveProperty(key);
    expect(JSON.stringify(row!.requestPayload)).not.toContain(f.email);
    expect(await runner().claimNext()).toBeNull();
    expect(await database.select().from(walletTransactions)).toHaveLength(0);
    expect((await database.select().from(commerceOrders))[0]!.status).toBe("pending");
  });
  it("reserves the global UTC budget atomically and limits each owner in rolling24hours", async () => {
    const fixtures = await Promise.all([fixture("vi",960,"ZIWEI-IDENTITY-P0","one"), fixture("vi",960,"ZIWEI-IDENTITY-P0","two"), fixture("vi",960,"ZIWEI-IDENTITY-P0","three")]);
    await allow(fixtures.map(f => f.userId), 2);
    expect(await runner().enqueueFresh()).toBe(3);
    const claims = await Promise.all([runner().claimNext(), runner().claimNext(), runner().claimNext(), runner().claimNext()]);
    expect(claims.filter(Boolean)).toHaveLength(2);
    expect((await database.select().from(recoveryOutboundDailyAttempts))[0]!.attempts).toBe(2);
    const rows = await database.select().from(notificationDeliveries);
    expect(new Set(rows.filter(r => r.attemptCount).map(r => r.requestPayload.userId)).size).toBe(2);
    const claimedOwner = rows.find(r => r.attemptCount)!.requestPayload.userId;
    const claimedFixture = fixtures.find(f => f.userId === claimedOwner)!;
    await addOrder(randomUUID(), claimedFixture.intentId, claimedFixture.userId);
    expect(await runner().enqueueFresh()).toBe(1);
    now = new Date("2026-10-09T00:00:00Z");
    const next = await runner().claimNext();
    expect(next).toBeTruthy();
    expect(await runner().claimNext()).toBeNull();
    now = new Date("2026-10-09T12:00:00Z");
    expect(await runner().claimNext()).toBeTruthy();
  });
  it("counts unknown outcomes and expired claims, with no automatic resend", async () => {
    const f = await fixture(); await allow([f.userId]); await runner().enqueueFresh();
    const claim = (await runner().claimNext())!;
    send.mockRejectedValueOnce(new Error("synthetic ambiguous SMTP result"));
    expect(await runner().deliverClaimed(claim)).toBe("delivery_unknown");
    expect(await runner().deliverClaimed(claim)).toBe("ignored");
    expect(await runner().claimNext()).toBeNull();
    expect(send).toHaveBeenCalledTimes(1);
    expect((await database.select().from(recoveryOutboundDailyAttempts))[0]!.attempts).toBe(1);
    expect((await database.select().from(notificationDeliveries))[0]!.status).toBe("delivery_unknown");
  });
  it("expires an unsent claim to unknown instead of reclaiming it", async () => {
    const f = await fixture(); await allow([f.userId]); await runner().enqueueFresh(); const claim = (await runner().claimNext())!;
    now = new Date(NOW.getTime() + 45000);
    expect(await runner().deliverClaimed(claim)).toBe("delivery_unknown");
    expect(await runner().claimNext()).toBeNull(); expect(send).not.toHaveBeenCalled();
  });
  it.each(["stop","cohort","consent","future-consent","unsubscribe","unverified","owner","profile-delete","email","payment","continuation","intent","terms","ttl","chart-version","order-identity"])("rechecks %s after claim and before provider call", async reason => {
    const f = await fixture(); await allow([f.userId]); await runner().enqueueFresh(); const claim = (await runner().claimNext())!;
    if (reason === "stop") await database.update(recoveryOutboundControl).set({ emergencyStopped: true });
    if (reason === "cohort") await database.update(recoveryOutboundControl).set({ cohortIds: ["another-owner"] });
    if (reason === "consent") await database.update(consents).set({ revokedAt: NOW }).where(eq(consents.id,f.consentId));
    if (reason === "future-consent") await database.update(consents).set({ grantedAt: new Date(NOW.getTime()+1000) }).where(eq(consents.id,f.consentId));
    if (reason === "unsubscribe") await createDatabaseNotificationPreferenceStore(database, SECRET, () => now).unsubscribeEmail(f.email,f.userId);
    if (reason === "unverified") await database.update(authUsers).set({ emailVerified: false }).where(eq(authUsers.id,f.userId));
    if (reason === "owner") { await database.insert(authUsers).values({ id: "foreign", email: "foreign@example.test", name: "Synthetic" }); await database.update(birthProfiles).set({ userId: "foreign" }).where(eq(birthProfiles.id,f.profileId)); }
    if (reason === "profile-delete") await database.update(birthProfiles).set({ deletedAt: NOW }).where(eq(birthProfiles.id,f.profileId));
    if (reason === "email") await database.update(authUsers).set({ email: "changed@example.test" }).where(eq(authUsers.id,f.userId));
    if (reason === "payment") await database.update(commerceOrders).set({ status: "paid", paidAt: NOW }).where(eq(commerceOrders.id,f.orderId));
    if (reason === "continuation") await database.update(walletTopUpContinuations).set({ status: "blocked" }).where(eq(walletTopUpContinuations.orderId,f.orderId));
    if (reason === "intent") await database.update(walletPurchaseIntents).set({ status: "cancelled" }).where(eq(walletPurchaseIntents.id,f.intentId));
    if (reason === "terms") {
      await expect(database.update(walletTopUpContinuations).set({ confirmedPriceLa: 720 }).where(eq(walletTopUpContinuations.orderId,f.orderId))).rejects.toThrow();
      expect(await runner().deliverClaimed(claim)).toBe("sent");
      expect(send).toHaveBeenCalledTimes(1);
      return;
    }
    if (reason === "ttl") await database.update(commerceOrders).set({ createdAt: new Date(NOW.getTime() - 172800000) }).where(eq(commerceOrders.id,f.orderId));
    if (reason === "order-identity") { const another = randomUUID(); await addOrder(another,f.intentId,f.userId); const [queued] = await database.select().from(notificationDeliveries); await database.update(notificationDeliveries).set({ requestPayload: { ...queued!.requestPayload, orderId: another } }).where(eq(notificationDeliveries.id,claim.deliveryId)); }
    if (reason === "chart-version") { await database.insert(calculationRuns).values({ id: "new-run", profileId: f.profileId, profileRevisionId: f.revisionId, idempotencyKey: "new-run", engineId: "synthetic", engineVersion: "1", adapterId: "synthetic", adapterVersion: "1", schemaId: "synthetic", ruleSetId: "synthetic", inputHash: "a", configHash: "b", rawSnapshotHash: "c", createdAt: NOW }); await database.insert(ziweiChartVersions).values({ id: "new-version", chartId: f.chartId, calculationRunId: "new-run", normalizedOutput: {}, privateRawSnapshot: {}, warnings: [], provenance: {}, createdAt: NOW }); }
    expect(await runner().deliverClaimed(claim)).toBe("suppressed"); expect(send).not.toHaveBeenCalled();
    expect((await database.select().from(notificationDeliveries))[0]!.status).toBe("failed_permanent");
  });
  it("enforces cohort and monotonic attempt caps in the database", async () => {
    await expect(database.update(recoveryOutboundControl).set({ cohortIds: ["1","2","3","4","5","6"] })).rejects.toThrow();
    await database.insert(recoveryOutboundDailyAttempts).values({ utcDay: "2026-10-08", attempts: 3 });
    await expect(database.update(recoveryOutboundDailyAttempts).set({ attempts: 2 })).rejects.toThrow();
    await expect(database.delete(recoveryOutboundDailyAttempts)).rejects.toThrow();
  });
});
