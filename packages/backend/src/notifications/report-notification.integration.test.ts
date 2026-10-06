import { randomUUID } from "node:crypto";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { and, eq, sql } from "drizzle-orm";
import {
  authUsers, birthProfiles, birthProfileRevisions, calculationRuns, commerceOrders,
  commerceEntitlements, createDatabase, evidenceSets, notificationDeliveries, outbox,
  reportNotificationSubscriptions, reportReservations, reportVersions, runMigrations,
  ziweiCharts, ziweiChartVersions, type Database,
} from "@lasoviet/database";
import { CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER, IDENTITY_REPORT_SECTION_IDS, TIER_2_ENTITLEMENT_SCOPE, type CurrentActor } from "@lasoviet/contracts";
import { createDatabaseDeletionRepository } from "../privacy/deletion.repository.js";
import { createReportNotificationService, REPORT_NOTIFICATION_CAPTURE_EVENT, resolveReportNotificationMode } from "./report-notification.service.js";
const NOW = new Date("2026-10-06T12:00:00Z");

describe("owned report subscription with isolated PostgreSQL", () => {
  let container: Awaited<ReturnType<PostgreSqlContainer["start"]>>;
  let database: Database;
  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine").start();
    await runMigrations(container.getConnectionUri()); database = createDatabase(container.getConnectionUri());
  }, 120000);
  afterAll(async () => {await container?.stop();});
  beforeEach(async () => {await database.execute(sql`TRUNCATE auth_users, commerce_orders, outbox, notification_deliveries CASCADE`);});
  const service = () => createReportNotificationService(database, {mode: "capture", now: () => NOW});
  async function fixture() {
    const userId = randomUUID(), profileId = `profile-${userId}`, chartId = `chart-${userId}`, chartVersionId = `cv-${userId}`;
    const revisionId = `revision-${userId}`, runId = randomUUID(), evidenceId = `evidence-${userId}`;
    const orderId = randomUUID(), entitlementId = randomUUID(), reservationId = randomUUID(), reportId = randomUUID(), reportVersionId = randomUUID();
    await database.insert(authUsers).values({id: userId, name: "Synthetic subscription owner", email: `${userId}@example.test`, emailVerified: true, createdAt: NOW, updatedAt: NOW});
    await database.insert(birthProfiles).values({id: profileId, userId, createdAt: NOW, updatedAt: NOW});
    await database.insert(birthProfileRevisions).values({id: revisionId, profileId, revisionNumber: 1, originalInput: {}, normalizedInput: {}, consentVersion: "test", createdAt: NOW});
    await database.insert(calculationRuns).values({id: runId, profileId, profileRevisionId: revisionId, idempotencyKey: runId,
      engineId: "synthetic", engineVersion: "1", adapterId: "synthetic", adapterVersion: "1", schemaId: "synthetic", ruleSetId: "synthetic",
      inputHash: "a", configHash: "b", rawSnapshotHash: "c", createdAt: NOW});
    await database.insert(ziweiCharts).values({id: chartId, profileId, profileRevisionId: revisionId, createdAt: NOW});
    await database.insert(ziweiChartVersions).values({id: chartVersionId, chartId, calculationRunId: runId, normalizedOutput: {}, privateRawSnapshot: {}, warnings: [], provenance: {}, createdAt: NOW});
    await database.insert(evidenceSets).values({id: evidenceId, chartVersionId, capabilityId: "ziwei.identity.p0", ruleVersion: "ziwei.identity.v1", createdAt: NOW});
    // A synthetic legacy paid order is used only as immutable report authority; no bank acceptance is claimed.
    await database.insert(commerceOrders).values({id: orderId, invoiceNumber: `SYNTH-${orderId}`, kind: "content_purchase", ownerId: userId,
      chartId, chartVersionId, sku: "ZIWEI-IDENTITY-P0", amount: 49000, currency: "VND", locale: "vi", status: "paid", paidAt: NOW, createdAt: NOW, updatedAt: NOW});
    await database.insert(commerceEntitlements).values({id: entitlementId, ownerId: userId, chartId, orderId, sku: "ZIWEI-IDENTITY-P0", scope: TIER_2_ENTITLEMENT_SCOPE, createdAt: NOW});
    await database.insert(reportReservations).values({id: reservationId, reportId, reportVersionId, entitlementId, chartVersionId, evidenceVersionId: evidenceId,
      knowledgeVersionId: "ziwei.identity.knowledge.v1", promptVersion: "ziwei.identity.prompt.v1", reportConfigVersion: "ziwei.identity.report.v1", locale: "vi", sku: "ZIWEI-IDENTITY-P0", createdAt: NOW, updatedAt: NOW});
    const actor: CurrentActor = {kind: "account", userId, sessionId: `synthetic-${userId}`, requestId: `request-${userId}`};
    return {userId, profileId, chartVersionId, orderId, entitlementId, reservationId, reportId, reportVersionId, evidenceId, actor};
  }
  type Fixture = Awaited<ReturnType<typeof fixture>>;
  const command = (f: Fixture, action: "subscribe" | "cancel" = "subscribe") => ({version: 1 as const, reportVersionId: f.reportVersionId, action});
  async function ready(f: Fixture) {
    const [reservation] = await database.select().from(reportReservations).where(eq(reportReservations.id, f.reservationId));
    const content = {version: 1, sku: "ZIWEI-IDENTITY-P0", capabilityId: "ziwei.identity.p0", locale: "vi",
      provenance: {chartVersionId: f.chartVersionId, ruleVersion: "ziwei.identity.v1", evidenceVersion: 1, knowledgeVersion: reservation.knowledgeVersionId,
        providerId: "synthetic", modelId: "synthetic", promptVersion: reservation.promptVersion, templateVersion: "identity-report-html.v1"},
      sections: IDENTITY_REPORT_SECTION_IDS.map(id => ({id, title: "Synthetic fixture", narrative: "Synthetic schema-only report; no editorial or writer acceptance.", claims: []})),
      reflectionQuestions: ["Synthetic question one", "Synthetic question two", "Synthetic question three"], summaryActions: [], professionalAdviceDisclaimer: CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER};
    await database.insert(reportVersions).values({reportId: f.reportId, reportVersionId: f.reportVersionId, entitlementId: f.entitlementId,
      chartVersionId: f.chartVersionId, evidenceVersionId: f.evidenceId, knowledgeVersionId: reservation.knowledgeVersionId, promptVersion: reservation.promptVersion,
      reportConfigVersion: reservation.reportConfigVersion, templateVersion: "identity-report-html.v1", renderVersion: "identity-report-pdf.v1", locale: "vi", sku: reservation.sku,
      providerId: "synthetic", modelId: "synthetic", structuredContent: content, htmlContent: "Synthetic fixture", contentHash: "a".repeat(64), pdfAssetId: randomUUID(), createdAt: NOW});
    await database.update(reportReservations).set({status: "complete", updatedAt: NOW}).where(eq(reportReservations.id, f.reservationId));
  }
  it("registers once, waits for real authorized readiness and captures once without a delivery row", async () => {
    const f = await fixture(); const s = service();
    expect((await s.read(f.actor, f.reportId)).state).toBe("not_registered");
    const first = await s.command(f.actor, f.reportId, command(f));
    expect(await s.command(f.actor, f.reportId, command(f))).toEqual(first);
    expect(await s.captureReady()).toEqual({captured: 0, suppressed: 0});
    await ready(f);
    expect(await s.captureReady()).toEqual({captured: 1, suppressed: 0});
    expect(await s.captureReady()).toEqual({captured: 0, suppressed: 0});
    expect((await s.read(f.actor, f.reportId)).state).toBe("captured");
    expect(await database.select().from(notificationDeliveries)).toHaveLength(0);
    const [event] = await database.select().from(outbox).where(eq(outbox.eventType, REPORT_NOTIFICATION_CAPTURE_EVENT));
    expect(event.status).toBe("processed"); expect(event.payload).toMatchObject({captureOnly: true, sent: false, reportVersionId: f.reportVersionId});
    expect(JSON.stringify(event.payload)).not.toContain("@example.test");
  });
  it("serializes concurrent registration and concurrent capture", async () => {
    const f = await fixture(); const s = service();
    await Promise.all([s.command(f.actor, f.reportId, command(f)), s.command(f.actor, f.reportId, command(f))]);
    expect(await database.select().from(reportNotificationSubscriptions)).toHaveLength(1);
    await ready(f); const results = await Promise.all([s.captureReady(), s.captureReady()]);
    expect(results.reduce((sum, x) => sum + x.captured, 0)).toBe(1);
    expect(await database.select().from(outbox).where(eq(outbox.eventType, REPORT_NOTIFICATION_CAPTURE_EVENT))).toHaveLength(1);
  });
  it("cancels only the additional request and allows an explicit resubscribe", async () => {
    const f = await fixture(); const s = service(); await s.command(f.actor, f.reportId, command(f));
    expect((await s.command(f.actor, f.reportId, command(f,"cancel"))).state).toBe("cancelled");
    expect((await s.command(f.actor, f.reportId, command(f))).stateVersion).toBe(3);
    await s.command(f.actor, f.reportId, command(f,"cancel")); await ready(f);
    expect(await s.captureReady()).toEqual({captured: 0, suppressed: 0});
  });
  it.each(["pending", "sent"] as const)("suppresses the additional capture when automatic notice is %s", async status => {
    const f = await fixture(); const s = service(); await s.command(f.actor, f.reportId, command(f)); await ready(f);
    await database.insert(notificationDeliveries).values({idempotencyKey: `report-ready-email:${f.reportVersionId}:${f.userId}`,
      kind: "report_ready", recipientFingerprint: "synthetic", requestPayload: {}, status, createdAt: NOW, updatedAt: NOW});
    expect(await s.captureReady()).toEqual({captured: 0, suppressed: 1});
    expect((await s.read(f.actor, f.reportId)).state).toBe("already_notified");
    expect(await database.select().from(notificationDeliveries)).toHaveLength(1);
  });
  it("rejects foreign, anonymous, unverified and wrong-version registration", async () => {
    const f = await fixture(), other = await fixture(); const s = service();
    await expect(s.command(other.actor, f.reportId, command(f))).rejects.toMatchObject({code: "REPORT_NOT_FOUND"});
    await expect(s.read({kind: "anonymous", anonymousActorId: "synthetic", sessionId: "synthetic", requestId: "synthetic", expiresAt: "2026-10-07T00:00:00Z"}, f.reportId)).rejects.toMatchObject({code: "REPORT_NOT_FOUND"});
    await expect(s.command(f.actor, f.reportId, {...command(f), reportVersionId: randomUUID()})).rejects.toMatchObject({code: "REPORT_NOTICE_VERSION_CONFLICT"});
    await database.update(authUsers).set({emailVerified: false}).where(eq(authUsers.id, f.userId));
    await expect(s.command(f.actor, f.reportId, command(f))).rejects.toMatchObject({code: "REPORT_NOT_FOUND"});
  });
  it.each(["revoke", "delete-profile"] as const)("rechecks %s before capture", async kind => {
    const f = await fixture(); const s = service(); await s.command(f.actor, f.reportId, command(f)); await ready(f);
    if (kind === "revoke") await database.update(commerceEntitlements).set({revokedAt: NOW}).where(eq(commerceEntitlements.id, f.entitlementId));
    else await database.update(birthProfiles).set({deletedAt: NOW}).where(eq(birthProfiles.id, f.profileId));
    expect(await s.captureReady()).toEqual({captured: 0, suppressed: 1});
    expect(await database.select().from(outbox).where(eq(outbox.eventType, REPORT_NOTIFICATION_CAPTURE_EVENT))).toHaveLength(0);
  });
  it("fences registration against deletion and purges all subscription payloads", async () => {
    const f = await fixture(); const s = service(); const deletion = createDatabaseDeletionRepository(database);
    await Promise.allSettled([s.command(f.actor, f.reportId, command(f)), deletion.request({userId: f.userId, requestId: "synthetic-delete", requestedAt: NOW, recoverUntil: new Date(NOW.getTime()+1000)})]);
    await expect(s.command(f.actor, f.reportId, command(f))).rejects.toMatchObject({code: "REPORT_NOT_FOUND"});
    expect((await s.captureReady()).captured).toBe(0);
    await deletion.purgeExpired(new Date(NOW.getTime()+2000),25);
    expect(await database.select().from(reportNotificationSubscriptions).where(eq(reportNotificationSubscriptions.ownerId, f.userId))).toHaveLength(0);
    expect(await database.select().from(outbox).where(and(eq(outbox.eventType, REPORT_NOTIFICATION_CAPTURE_EVENT),eq(outbox.actorId,f.userId)))).toHaveLength(0);
  });
  it("purges actual captured payloads and prevents late insertion", async () => {
    const f = await fixture(); const s = service(); await s.command(f.actor, f.reportId, command(f)); await ready(f);
    expect((await s.captureReady()).captured).toBe(1);
    expect(await database.select().from(outbox).where(eq(outbox.eventType, REPORT_NOTIFICATION_CAPTURE_EVENT))).toHaveLength(1);
    const deletion=createDatabaseDeletionRepository(database);
    await deletion.request({userId:f.userId,requestId:"captured-delete",requestedAt:NOW,recoverUntil:new Date(NOW.getTime()+1000)});
    await deletion.purgeExpired(new Date(NOW.getTime()+2000),25);
    expect(await database.select().from(reportNotificationSubscriptions)).toHaveLength(0);
    expect(await database.select().from(outbox).where(eq(outbox.eventType, REPORT_NOTIFICATION_CAPTURE_EVENT))).toHaveLength(0);
    await expect(s.command(f.actor,f.reportId,command(f))).rejects.toMatchObject({code:"REPORT_NOT_FOUND"});
  });
  it("rotates pending subscriptions so a ready report behind them is captured", async () => {
    const pending = await fixture(), completed = await fixture(); const s = service();
    await s.command(pending.actor, pending.reportId, command(pending));
    await s.command(completed.actor, completed.reportId, command(completed));
    // Keep the injected clock frozen and make queue ordering explicit.
    await database.update(reportNotificationSubscriptions).set({createdAt: new Date(NOW.getTime()-1000)})
      .where(eq(reportNotificationSubscriptions.ownerId,pending.userId));
    await ready(completed);
    expect(await s.captureReady(1)).toEqual({captured:0,suppressed:0});
    expect(await s.captureReady(1)).toEqual({captured:1,suppressed:0});
    expect(await s.captureReady(1)).toEqual({captured:0,suppressed:0});
    expect((await s.read(pending.actor,pending.reportId)).state).toBe("subscribed");
    expect((await s.read(completed.actor,completed.reportId)).state).toBe("captured");
    expect(await database.select().from(outbox).where(eq(outbox.eventType,REPORT_NOTIFICATION_CAPTURE_EVENT))).toHaveLength(1);
  });
  it("defaults to disabled and performs no writes or captures", async () => {
    const f = await fixture(); const disabled = createReportNotificationService(database, {now: () => NOW});
    await expect(disabled.command(f.actor,f.reportId,command(f))).rejects.toMatchObject({code: "REPORT_NOTICE_DISABLED"});
    expect(await disabled.captureReady()).toEqual({captured: 0, suppressed: 0});
    expect(await database.select().from(reportNotificationSubscriptions)).toHaveLength(0);
    expect(resolveReportNotificationMode("send")).toBe("disabled");
  });
  it("rejects subscribing to an already ready report", async () => {
    const f = await fixture(); await ready(f);
    await expect(service().command(f.actor,f.reportId,command(f))).rejects.toMatchObject({code: "REPORT_NOT_PENDING"});
  });
});
