import { createHmac, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer, type Socket } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createSecureContext, TLSSocket } from "node:tls";
import nodemailer from "nodemailer";
import { INTERNAL_ACTOR_AUDIENCE, INTERNAL_ACTOR_ISSUER, type CurrentActor } from "@lasoviet/contracts";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq, sql } from "drizzle-orm";
import { adminAuditLogs, adminCapabilityPolicies, adminRoleAssignments, authSessions, authUsers, birthProfiles, birthProfileRevisions, calculationRuns, commerceOrders, consents,
  createDatabase, notificationDeliveries, recoveryOutboundControl, recoveryOutboundDailyAttempts, runMigrations,
  lockFreeAiCoordination, lockRecoveryCaptureCoordination,
  walletPurchaseIntents, walletTopUpContinuations, walletTransactions, ziweiCharts, ziweiChartVersions, type Database } from "@lasoviet/database";
import { createDatabaseAuthEmailDeliveryStore } from "./auth-email.js";
import { createDatabaseNotificationPreferenceStore } from "./notification-preference.js";
import { createPendingTopUpRecoveryCaptureService } from "./pending-topup-recovery-capture.js";
import type { EmailProvider } from "./email-provider.js";
import { createPendingTopUpRecoveryRunner } from "./pending-topup-recovery-runner.js";
import { createRecoveryOutboundControlTool } from "./recovery-outbound-control.js";
import { createRecoveryOutboundMaintenance } from "./recovery-outbound-maintenance.js";
import { createSmtpEmailAdapter } from "./smtp-email-adapter.js";
import { runRecoveryOutboundControlTool } from "../../../../apps/api/src/admin-access/recovery-outbound-control-cli.js";
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
    await database.update(adminCapabilityPolicies).set({active: true}).where(eq(adminCapabilityPolicies.capability, "admin.commerce.manage"));
    now = NOW; send.mockReset().mockResolvedValue({ ok: true, providerMessageId: "synthetic-message" });
  });
  const runner = (mode: "prepare" | "disabled" = "prepare") => createPendingTopUpRecoveryRunner({ database, mode, tokenSecret: SECRET, orderTtlSeconds: 172800, provider: { send }, now: () => now });
  const allow = async (ids: string[], dailyLimit = 5) => { await database.update(recoveryOutboundControl).set({ emergencyStopped: false, cohortIds: ids, dailyLimit }); };
  async function admin(role: "super_admin" | "support" = "super_admin") {
    const id = randomUUID(), sessionId = randomUUID(), assignmentId = randomUUID();
    await database.insert(authUsers).values({id, email: `${id}@example.test`, name: "Synthetic admin", emailVerified: true});
    await database.insert(authSessions).values({id: sessionId, userId: id, token: randomUUID(), expiresAt: new Date(NOW.getTime() + 60000)});
    await database.insert(adminRoleAssignments).values({id: assignmentId, userId: id, role, assignmentVersion: 1});
    const actor: CurrentActor = {kind: "account", userId: id, sessionId, requestId: "synthetic-control-request"};
    const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
    const unsigned = `${encode({alg: "HS256"})}.${encode({version: 1, kind: "account", sid: sessionId, requestId: actor.requestId,
      sub: id, iss: INTERNAL_ACTOR_ISSUER, aud: INTERNAL_ACTOR_AUDIENCE, iat: Math.floor(NOW.getTime()/1000), exp: Math.floor(NOW.getTime()/1000)+60})}`;
    const token = `${unsigned}.${createHmac("sha256", SECRET).update(unsigned).digest("base64url")}`;
    return {actor, assignmentId, token};
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
  it("authorizes signed live sessions and audits stale, replayed, malformed and revoked control commands without PII", async () => {
    const owner = await fixture(), a = await admin(), support = await admin("support");
    const tool = createRecoveryOutboundControlTool(database, () => NOW);
    await expect(runRecoveryOutboundControlTool(database, SECRET, "invalid", undefined, NOW)).rejects.toThrow();
    const read = await runRecoveryOutboundControlTool(database, SECRET, a.token, undefined, NOW);
    expect(read.ok).toBe(true); if (!read.ok) throw new Error("missing read");
    expect(read.value).toMatchObject({emergencyStopped: true, cohortCount: 0});
    const command = {expectedState: read.value.stateToken, emergencyStopped: false, cohortIds: [owner.userId], dailyLimit: 2,
      idempotencyKey: "synthetic-enable", reasonCode: "access_review"};
    expect(await tool.update(support.actor, command)).toMatchObject({ok: false, code: "RECOVERY_CONTROL_FORBIDDEN"});
    expect(await tool.update(a.actor, {...command, dailyLimit: 6})).toMatchObject({ok: false, code: "RECOVERY_CONTROL_INVALID"});
    const enabled = await tool.update(a.actor, command); expect(enabled.ok).toBe(true); if (!enabled.ok) throw new Error("enable failed");
    expect(await tool.update(a.actor, command)).toMatchObject({ok: true, replayed: true});
    expect(await tool.update(a.actor, {...command, idempotencyKey: "synthetic-stale"})).toMatchObject({ok: false, code: "RECOVERY_CONTROL_CONFLICT"});
    expect(await tool.update(a.actor, {...command, idempotencyKey: "synthetic-bad-cohort", expectedState: enabled.value.stateToken, cohortIds: ["missing"]})).toMatchObject({ok: false, code: "RECOVERY_CONTROL_COHORT_INVALID"});
    expect(await tool.update(a.actor, {...command, expectedState: enabled.value.stateToken, emergencyStopped: true, cohortIds: [], idempotencyKey: "synthetic-stop", reasonCode: "security_incident"})).toMatchObject({ok: true});
    expect(await tool.update(a.actor, command)).toMatchObject({ok: true, replayed: true, value: {emergencyStopped: true, cohortCount: 0}});
    await database.update(adminRoleAssignments).set({revokedAt: NOW}).where(eq(adminRoleAssignments.id, a.assignmentId));
    expect(await tool.update(a.actor, command)).toMatchObject({ok: false, code: "RECOVERY_CONTROL_FORBIDDEN"});
    const audits = await database.select().from(adminAuditLogs);
    expect(audits.filter(row => row.policyResult === "allowed").length).toBeGreaterThanOrEqual(4);
    const summaries = JSON.stringify(audits.map(row => row.resultSummary));
    expect(summaries).not.toContain(owner.userId); expect(summaries).not.toContain(owner.email); expect(summaries).not.toContain(a.token);
    expect(await database.select().from(recoveryOutboundDailyAttempts)).toHaveLength(0);
    expect(send).not.toHaveBeenCalled();
  });
  it("delivers genuine STARTTLS SMTP to a loopback sink once and respects default stop and disabled composition", async () => {
    const sink = await smtpSink();
    try {
      const f = await fixture("en"), a = await admin();
      const capture = {scanAndCapture: vi.fn(async () => 0)};
      const options = {database, provider: sink.provider, smtpEnabled: true, tokenSecret: SECRET, orderTtlSeconds: 172800, capture, now: () => now};
      expect(() => createRecoveryOutboundMaintenance({...options, enabled: "yes"})).toThrow("RECOVERY_OUTBOUND_CONFIG_INVALID");
      expect(() => createRecoveryOutboundMaintenance({...options, enabled: "true", smtpEnabled: false})).toThrow("RECOVERY_OUTBOUND_SMTP_REQUIRED");
      expect(await createRecoveryOutboundMaintenance(options).runOnce(5)).toEqual({captured: 0, queued: 0, sent: 0});
      const maintenance = createRecoveryOutboundMaintenance({...options, enabled: "true"});
      expect(await maintenance.runOnce(5)).toEqual({captured: 0, queued: 0, sent: 0});
      const tool = createRecoveryOutboundControlTool(database, () => now), state = await tool.read(a.actor);
      if (!state.ok) throw new Error("missing state");
      expect((await tool.update(a.actor, {expectedState: state.value.stateToken, emergencyStopped: false, cohortIds: [f.userId], dailyLimit: 5,
        idempotencyKey: "sink-enable", reasonCode: "access_review"})).ok).toBe(true);
      expect(await maintenance.runOnce(5)).toEqual({captured: 0, queued: 1, sent: 1});
      expect(await maintenance.runOnce(5)).toEqual({captured: 0, queued: 0, sent: 0});
      expect(sink.messages).toHaveLength(1); expect(sink.tlsCount()).toBe(1);
      expect(sink.messages[0]).toContain(`To: ${f.email}`);
      expect(sink.messages[0]).toContain("Subject: Your La top-up is pending");
      const [delivery] = await database.select().from(notificationDeliveries);
      expect(delivery).toMatchObject({status: "sent", attemptCount: 1});
      expect(capture.scanAndCapture).toHaveBeenCalledTimes(1);
      expect(await database.select().from(walletTransactions)).toHaveLength(0);
      expect((await database.select().from(commerceOrders))[0]!.status).toBe("pending");
    } finally { await sink.close(); }
  }, 20000);
  it("revalidates capability and session and serializes competing control updates", async () => {
    const owner = await fixture(), a = await admin(), tool = createRecoveryOutboundControlTool(database, () => NOW);
    const read = await tool.read(a.actor); if (!read.ok) throw new Error("missing read");
    const command = {expectedState: read.value.stateToken, emergencyStopped: false, cohortIds: [owner.userId], dailyLimit: 5,
      idempotencyKey: "concurrent-control-a", reasonCode: "access_review"};
    const results = await Promise.all([tool.update(a.actor, command), tool.update(a.actor, {...command, idempotencyKey: "concurrent-control-b"})]);
    expect(results.filter(result => result.ok)).toHaveLength(1);
    expect(results.filter(result => !result.ok)).toEqual([{ok: false, code: "RECOVERY_CONTROL_CONFLICT"}]);
    await database.update(adminCapabilityPolicies).set({active: false}).where(eq(adminCapabilityPolicies.capability, "admin.commerce.manage"));
    expect(await tool.update(a.actor, command)).toMatchObject({ok: false, code: "RECOVERY_CONTROL_FORBIDDEN"});
    await database.update(adminCapabilityPolicies).set({active: true}).where(eq(adminCapabilityPolicies.capability, "admin.commerce.manage"));
    await database.update(authSessions).set({expiresAt: NOW}).where(eq(authSessions.id, a.actor.sessionId));
    expect(await tool.update(a.actor, command)).toMatchObject({ok: false, code: "RECOVERY_CONTROL_FORBIDDEN"});
    await expect(runRecoveryOutboundControlTool(database, SECRET, a.token, command, NOW)).rejects.toThrow();
    expect(send).not.toHaveBeenCalled();
  });
  it("rejects a session that expires while its signed command waits behind a coordination fence", async () => {
    const owner = await fixture(), a = await admin(), tool = createRecoveryOutboundControlTool(database, () => NOW);
    const read = await tool.read(a.actor); if (!read.ok) throw new Error("missing state");
    const command = {expectedState: read.value.stateToken, emergencyStopped: false, cohortIds: [owner.userId], dailyLimit: 5,
      idempotencyKey: "fence-expired-session", reasonCode: "access_review"};
    let release!: () => void, ready!: () => void, clockReads = 0;
    const hold = new Promise<void>(resolve => {release = resolve;});
    const locked = new Promise<void>(resolve => {ready = resolve;});
    const blocker = database.transaction(async tx => {
      await lockFreeAiCoordination(tx); await lockRecoveryCaptureCoordination(tx); ready(); await hold;
    });
    await locked;
    try {
      const pending = runRecoveryOutboundControlTool(database, SECRET, a.token, command, () => {clockReads++; return now;});
      expect(clockReads).toBe(1); // Signature/session preflight uses the still-valid request time.
      now = new Date(NOW.getTime() + 120000);
      release(); await blocker;
      expect(await pending).toMatchObject({ok: false, code: "RECOVERY_CONTROL_FORBIDDEN"});
      expect(clockReads).toBeGreaterThan(1);
      expect((await database.select().from(recoveryOutboundControl))[0]!.emergencyStopped).toBe(true);
    } finally {release(); await blocker;}
  });
});

// Owned test server accepts synthetic messages on loopback only. Production TLS
// settings remain unchanged; the factory injects this sink's port and test CA.
async function smtpSink() {
  const directory = await mkdtemp(join(tmpdir(), "lasoviet-recovery-smtp-"));
  const keyPath = join(directory, "key.pem"), certPath = join(directory, "cert.pem");
  execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", keyPath, "-out", certPath,
    "-days", "1", "-subj", "/CN=localhost", "-addext", "subjectAltName=DNS:localhost"], {stdio: "ignore"});
  const cert = await readFile(certPath), key = await readFile(keyPath), context = createSecureContext({key, cert});
  const messages: string[] = [], sockets = new Set<Socket>(); let secureCount = 0;
  const server = createServer(raw => {
    let socket: Socket = raw, buffer = "", data: string[] | null = null;
    sockets.add(raw); raw.on("error", () => {});
    const reply = (line: string) => socket.write(`${line}\r\n`);
    const receive = (chunk: Buffer) => {
      buffer += chunk.toString();
      while (buffer.includes("\r\n")) {
        const end = buffer.indexOf("\r\n"), line = buffer.slice(0, end); buffer = buffer.slice(end + 2);
        if (data) { if (line === ".") {messages.push(data.join("\r\n")); data = null; reply("250 Accepted");} else data.push(line); continue; }
        if (/^EHLO|^HELO/i.test(line)) reply("250-localhost\r\n250-STARTTLS\r\n250 AUTH PLAIN");
        else if (/^STARTTLS/i.test(line)) {
          raw.removeListener("data", receive); reply("220 Begin TLS");
          const secured = new TLSSocket(raw, {isServer: true, secureContext: context});
          socket = secured; sockets.add(secured); secureCount++; secured.on("error", () => {}); secured.on("data", receive);
        } else if (/^AUTH PLAIN/i.test(line)) reply("235 Authenticated");
        else if (/^MAIL FROM:|^RCPT TO:|^RSET/i.test(line)) reply("250 OK");
        else if (/^DATA/i.test(line)) {data = []; reply("354 Send message");}
        else if (/^QUIT/i.test(line)) {reply("221 Bye"); socket.end();}
        else reply("500 Unknown test command");
      }
    };
    raw.on("data", receive); reply("220 localhost synthetic sink");
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address(); if (!address || typeof address === "string") throw new Error("sink port missing");
  const provider = createSmtpEmailAdapter({host: "localhost", port: 587, username: "synthetic", password: "synthetic",
    from: "noreply@example.test", tlsRequired: true}, {createTransport(options) {
      return nodemailer.createTransport({...options, host: "127.0.0.1", port: address.port,
        tls: {...options.tls, servername: "localhost", ca: cert}});
    }});
  return {provider, messages, tlsCount: () => secureCount, async close() {
    for (const socket of sockets) socket.destroy();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await rm(directory, {recursive: true, force: true});
  }};
}
