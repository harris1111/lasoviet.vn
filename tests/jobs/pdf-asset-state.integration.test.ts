import { createHash, randomUUID } from "node:crypto";

import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  authUsers,
  commerceEntitlements,
  commerceOrders,
  createDatabase,
  notificationDeliveries,
  outbox,
  reportAssets,
  reportQueueJobs,
  reportReservations,
  reportVersions,
  runMigrations,
  supportCases,
} from "../../packages/database/src/index.js";
import {
  createDatabaseAssetRepository,
  createDatabaseReportQueueStore,
} from "../../packages/backend/src/index.js";
import { TIER_2_ENTITLEMENT_SCOPE } from "@lasoviet/contracts";

describe("PDF asset state integration", () => {
  let container: Awaited<ReturnType<PostgreSqlContainer["start"]>> | undefined;
  let databaseUrl = "";

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine")
      .withDatabase("lasoviet_test")
      .withUsername("lasoviet")
      .withPassword("lasoviet")
      .start();
    databaseUrl = container.getConnectionUri();
    await runMigrations(databaseUrl);
  }, 120_000);

  afterAll(async () => {
    await container?.stop();
  }, 30_000);

  async function seed(name: string, locale: "vi" | "en" = "vi") {
    const database = createDatabase(databaseUrl);
    const userId = `pdf-user-${randomUUID()}`;
    const orderId = randomUUID();
    const entitlementId = randomUUID();
    const reportId = randomUUID();
    const reportVersionId = randomUUID();
    const assetId = randomUUID();
    const jobId = `pdf-job-${randomUUID()}`;
    const workerId = `pdf-worker-${name}`;

    await database.insert(authUsers).values({
      id: userId,
      name: "PDF test user",
      email: `${userId}@example.test`,
      emailVerified: true,
    });
    await database.insert(commerceOrders).values({
      id: orderId,
      invoiceNumber: `INV-${orderId}`,
      chartId: `chart-${orderId}`,
      chartVersionId: `chart-version-${orderId}`,
      ownerId: userId,
      sku: "ZIWEI-IDENTITY-P0",
      amount: 79_000,
      currency: "VND",
      locale,
      status: "paid",
    });
    await database.insert(commerceEntitlements).values({
      id: entitlementId,
      orderId,
      chartId: `chart-${orderId}`,
      sku: "ZIWEI-IDENTITY-P0",
      ownerId: userId,
      scope: TIER_2_ENTITLEMENT_SCOPE,
    });
    await database.insert(reportReservations).values({
      id: randomUUID(),
      reportId,
      reportVersionId,
      entitlementId,
      chartVersionId: `chart-version-${orderId}`,
      evidenceVersionId: "evidence-v1",
      knowledgeVersionId: "knowledge-v1",
      promptVersion: "prompt-v1",
      reportConfigVersion: "config-v1",
      locale,
      sku: "ZIWEI-IDENTITY-P0",
      status: "pdf_pending",
    });
    await database.insert(reportVersions).values({
      reportId,
      reportVersionId,
      entitlementId,
      chartVersionId: `chart-version-${orderId}`,
      evidenceVersionId: "evidence-v1",
      knowledgeVersionId: "knowledge-v1",
      promptVersion: "prompt-v1",
      reportConfigVersion: "config-v1",
      templateVersion: "template-v1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      providerId: "test",
      modelId: "test",
      structuredContent: {},
      htmlContent: "<article><h1>Immutable report</h1></article>",
      contentHash: createHash("sha256").update("report").digest("hex"),
      pdfAssetId: assetId,
      renderVersion: "identity-report-pdf.v1",
    });
    await database.insert(reportAssets).values({
      id: assetId,
      reportId,
      reportVersionId,
      renderVersion: "identity-report-pdf.v1",
      objectKey: `reports/${assetId}.pdf`,
      status: "render_pending",
    });
    await database.insert(reportQueueJobs).values({
      id: jobId,
      name: "report.pdf.render.v1",
      sourceEventId: `event-${jobId}`,
      traceId: `trace-${jobId}`,
      idempotencyKey: jobId,
      payload: {
        reportId,
        reportVersionId,
        assetId,
        renderVersion: "identity-report-pdf.v1",
      },
      status: "waiting",
      availableAt: new Date(),
    });
    const queueStore = createDatabaseReportQueueStore(database, workerId);
    const job = await queueStore.claimNext(undefined, ["report.pdf.render.v1"]);
    if (!job) throw new Error("PDF_TEST_JOB_NOT_CLAIMED");
    const assets = createDatabaseAssetRepository(database, {
      canonicalPublicOrigin: "https://lasoviet.net",
      recipientFingerprintSecret: "test-recipient-secret",
    });
    return { database, assets, job, assetId, reportId, reportVersionId, workerId };
  }

  it("claims only pdf.render jobs and reclaims an expired PDF lease", async () => {
    const database = createDatabase(databaseUrl);
    const worker = createDatabaseReportQueueStore(database, "queue-fence-worker");
    const now = new Date();
    const pdfId = `pdf-${randomUUID()}`;
    const generationId = `generation-${randomUUID()}`;
    await database.insert(reportQueueJobs).values([
      {
        id: pdfId, name: "report.pdf.render.v1", sourceEventId: `event-${pdfId}`,
        traceId: `trace-${pdfId}`, idempotencyKey: pdfId, payload: {},
        status: "leased", leasedBy: "dead-worker",
        leasedUntil: new Date(now.getTime() - 1_000), attemptCount: 1,
      },
      {
        id: generationId, name: "report.generate.v1", sourceEventId: `event-${generationId}`,
        traceId: `trace-${generationId}`, idempotencyKey: generationId, payload: {},
        status: "waiting", availableAt: now,
      },
    ]);

    const claimed = await worker.claimNext(now, ["report.pdf.render.v1"]);
    expect(claimed).toMatchObject({ id: pdfId, name: "report.pdf.render.v1", attemptCount: 2 });
    const generation = (await database.select().from(reportQueueJobs))
      .find((record) => record.id === generationId);
    expect(generation.status).toBe("waiting");
    await database.$client.end();
  });

  it("atomically completes the asset and report, then settles a stored duplicate lease without duplicate delivery", async () => {
    const fixture = await seed("success");
    const claim = await fixture.assets.claimPdfWork(
      fixture.job.id,
      fixture.workerId,
      fixture.assetId,
    );
    expect(claim.ok).toBe(true);
    if (!claim.ok) return;
    const rendered = await fixture.assets.markRendered(claim.item);
    expect(rendered.ok).toBe(true);
    if (!rendered.ok) return;
    const storing = await fixture.assets.markStoring({
      ...claim.item,
      assetStateVersion: rendered.stateVersion,
    });
    expect(storing.ok).toBe(true);
    if (!storing.ok) return;

    await expect(fixture.assets.finalizeStored({
      item: { ...claim.item, assetStateVersion: storing.stateVersion },
      jobId: fixture.job.id,
      workerId: fixture.workerId,
      objectKey: claim.item.objectKey,
      sha256: "a".repeat(64),
      byteLength: 12,
      garageEtag: "etag-1",
      garageVersionId: "version-1",
    })).resolves.toEqual({ ok: true });

    const asset = (await fixture.database.select().from(reportAssets))
      .find((record) => record.id === fixture.assetId);
    const reservation = (await fixture.database.select().from(reportReservations))
      .find((record) => record.reportVersionId === fixture.reportVersionId);
    expect(asset).toMatchObject({
      status: "stored",
      objectKey: claim.item.objectKey,
      sha256: "a".repeat(64),
      byteLength: 12,
    });
    expect(reservation).toMatchObject({ status: "complete" });
    const readyDeliveries = (await fixture.database.select().from(notificationDeliveries)).filter(
      (record) => record.kind === "report_ready",
    );
    expect(readyDeliveries).toHaveLength(1);
    expect(readyDeliveries[0]?.requestPayload).toMatchObject({
      actionUrl: `https://lasoviet.net/bao-cao/${encodeURIComponent(fixture.reportId)}`,
    });
    expect((await fixture.database.select().from(outbox)).filter(
      (event) => event.eventType === "report.asset.stored.v1",
    )).toHaveLength(1);

    const replayId = `pdf-replay-${randomUUID()}`;
    await fixture.database.insert(reportQueueJobs).values({
      id: replayId,
      name: "report.pdf.render.v1",
      sourceEventId: `event-${replayId}`,
      traceId: `trace-${replayId}`,
      idempotencyKey: replayId,
      payload: {
        reportId: fixture.reportId,
        reportVersionId: fixture.reportVersionId,
        assetId: fixture.assetId,
        renderVersion: "identity-report-pdf.v1",
      },
      status: "waiting",
      availableAt: new Date(),
    });
    const replay = await createDatabaseReportQueueStore(fixture.database, fixture.workerId)
      .claimNext(undefined, ["report.pdf.render.v1"]);
    expect(replay).toMatchObject({ id: replayId, status: "leased" });
    if (!replay) return;
    await expect(fixture.assets.claimPdfWork(replay.id, fixture.workerId, fixture.assetId))
      .resolves.toEqual({ ok: false, code: "REPLAY_SETTLED" });
    const replayJob = (await fixture.database.select().from(reportQueueJobs))
      .find((record) => record.id === replayId);
    expect(replayJob).toMatchObject({ status: "processed", leasedBy: null, leasedUntil: null });
    expect((await fixture.database.select().from(notificationDeliveries)).filter(
      (record) => record.kind === "report_ready",
    )).toHaveLength(1);
    expect((await fixture.database.select().from(outbox)).filter(
      (event) => event.eventType === "report.asset.stored.v1",
    )).toHaveLength(1);
    await fixture.database.$client.end();
  });

  it("atomically selects a matching prior attempt key as the stored winner", async () => {
    const fixture = await seed("candidate-winner");
    const claim = await fixture.assets.claimPdfWork(fixture.job.id, fixture.workerId, fixture.assetId);
    expect(claim.ok).toBe(true);
    if (!claim.ok) return;
    expect(claim.item.objectKey).toMatch(new RegExp(`^reports/${fixture.assetId}/.+\\.pdf$`));
    expect(claim.item.candidateObjectKey).toBe(`reports/${fixture.assetId}.pdf`);

    const rendered = await fixture.assets.markRendered(claim.item);
    expect(rendered.ok).toBe(true);
    if (!rendered.ok) return;
    const storing = await fixture.assets.markStoring({ ...claim.item, assetStateVersion: rendered.stateVersion });
    expect(storing.ok).toBe(true);
    if (!storing.ok) return;

    await expect(fixture.assets.finalizeStored({
      item: { ...claim.item, assetStateVersion: storing.stateVersion },
      jobId: fixture.job.id,
      workerId: fixture.workerId,
      objectKey: claim.item.candidateObjectKey,
      sha256: "c".repeat(64),
      byteLength: 9,
    })).resolves.toEqual({ ok: true });

    const asset = (await fixture.database.select().from(reportAssets))
      .find((record) => record.id === fixture.assetId);
    expect(asset).toMatchObject({
      status: "stored",
      objectKey: claim.item.candidateObjectKey,
      sha256: "c".repeat(64),
    });
    await fixture.database.$client.end();
  });

  it("fences an expired worker and selects only the successor attempt key", async () => {
    const fixture = await seed("attempt-race");
    const first = await fixture.assets.claimPdfWork(fixture.job.id, fixture.workerId, fixture.assetId);
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    await fixture.database.$client.unsafe(
      "UPDATE report_assets SET lease_expires_at = NOW() - INTERVAL '1 second' WHERE id = $1",
      [fixture.assetId],
    );
    await fixture.database.$client.unsafe(
      "UPDATE report_queue_jobs SET leased_until = NOW() - INTERVAL '1 second' WHERE id = $1",
      [fixture.job.id],
    );

    const successorWorkerId = `${fixture.workerId}-successor`;
    const successorJob = await createDatabaseReportQueueStore(fixture.database, successorWorkerId)
      .claimNext(undefined, ["report.pdf.render.v1"]);
    expect(successorJob).toMatchObject({ id: fixture.job.id });
    if (!successorJob) return;

    const successor = await fixture.assets.claimPdfWork(
      successorJob.id,
      successorWorkerId,
      fixture.assetId,
    );
    expect(successor.ok).toBe(true);
    if (!successor.ok) return;
    expect(successor.item.candidateObjectKey).toBe(first.item.objectKey);
    expect(successor.item.objectKey).not.toBe(first.item.objectKey);

    await expect(fixture.assets.finalizeStored({
      item: first.item,
      jobId: fixture.job.id,
      workerId: fixture.workerId,
      objectKey: first.item.objectKey,
      sha256: "d".repeat(64),
      byteLength: 10,
    })).resolves.toEqual({ ok: false, code: "LEASE_LOST" });

    const rendered = await fixture.assets.markRendered(successor.item);
    expect(rendered.ok).toBe(true);
    if (!rendered.ok) return;
    const storing = await fixture.assets.markStoring({
      ...successor.item,
      assetStateVersion: rendered.stateVersion,
    });
    expect(storing.ok).toBe(true);
    if (!storing.ok) return;
    await expect(fixture.assets.finalizeStored({
      item: { ...successor.item, assetStateVersion: storing.stateVersion },
      jobId: successorJob.id,
      workerId: successorWorkerId,
      objectKey: successor.item.objectKey,
      sha256: "e".repeat(64),
      byteLength: 11,
    })).resolves.toEqual({ ok: true });

    const asset = (await fixture.database.select().from(reportAssets))
      .find((record) => record.id === fixture.assetId);
    expect(asset).toMatchObject({ status: "stored", objectKey: successor.item.objectKey });
    await fixture.database.$client.end();
  });

  it("fences stale completion and atomically terminalizes an unrecoverable PDF failure once", async () => {
    const fixture = await seed("terminal", "en");
    const claim = await fixture.assets.claimPdfWork(
      fixture.job.id,
      fixture.workerId,
      fixture.assetId,
    );
    expect(claim.ok).toBe(true);
    if (!claim.ok) return;
    const rendered = await fixture.assets.markRendered(claim.item);
    expect(rendered.ok).toBe(true);
    if (!rendered.ok) return;

    await expect(fixture.assets.finalizeStored({
      item: claim.item,
      jobId: fixture.job.id,
      workerId: fixture.workerId,
      objectKey: claim.item.objectKey,
      sha256: "b".repeat(64),
      byteLength: 8,
    })).resolves.toEqual({ ok: false, code: "LEASE_LOST" });

    const terminalItem = { ...claim.item, assetStateVersion: rendered.stateVersion };
    await expect(fixture.assets.finalizePdfTerminalFailure({
      item: terminalItem,
      jobId: fixture.job.id,
      workerId: fixture.workerId,
      errorCode: "PDF_FONT_MISSING",
      failureStage: "pdf",
    })).resolves.toEqual({ ok: true });
    await expect(fixture.assets.finalizePdfTerminalFailure({
      item: terminalItem,
      jobId: fixture.job.id,
      workerId: fixture.workerId,
      errorCode: "PDF_FONT_MISSING",
      failureStage: "pdf",
    })).resolves.toEqual({ ok: true });

    const asset = (await fixture.database.select().from(reportAssets))
      .find((record) => record.id === fixture.assetId);
    const reservation = (await fixture.database.select().from(reportReservations))
      .find((record) => record.reportVersionId === fixture.reportVersionId);
    expect(asset).toMatchObject({ status: "terminal_failure", lastErrorCode: "PDF_FONT_MISSING" });
    expect(reservation).toMatchObject({ status: "terminal_failure", lastErrorCode: "PDF_FONT_MISSING" });
    expect(await fixture.database.select().from(supportCases)).toHaveLength(1);
    expect((await fixture.database.select().from(notificationDeliveries)).filter(
      (record) => record.kind === "report_failed",
    )).toHaveLength(1);
    const failedDelivery = (await fixture.database.select().from(notificationDeliveries)).find(
      (record) => record.kind === "report_failed",
    );
    expect(failedDelivery?.requestPayload).toMatchObject({
      actionUrl: expect.stringMatching(
        /^https:\/\/lasoviet\.net\/en\/lien-he\?case=[0-9a-f-]{36}$/,
      ),
    });
    expect((await fixture.database.select().from(outbox)).filter(
      (event) => event.eventType === "report.fulfillment.failed.v1",
    )).toHaveLength(1);

    const replayId = `pdf-terminal-replay-${randomUUID()}`;
    await fixture.database.insert(reportQueueJobs).values({
      id: replayId,
      name: "report.pdf.render.v1",
      sourceEventId: `event-${replayId}`,
      traceId: `trace-${replayId}`,
      idempotencyKey: replayId,
      payload: {
        reportId: fixture.reportId,
        reportVersionId: fixture.reportVersionId,
        assetId: fixture.assetId,
        renderVersion: "identity-report-pdf.v1",
      },
      status: "waiting",
      availableAt: new Date(),
    });
    const replay = await createDatabaseReportQueueStore(fixture.database, fixture.workerId)
      .claimNext(undefined, ["report.pdf.render.v1"]);
    expect(replay).toMatchObject({ id: replayId });
    if (!replay) return;
    await expect(fixture.assets.claimPdfWork(replay.id, fixture.workerId, fixture.assetId))
      .resolves.toEqual({ ok: false, code: "REPLAY_SETTLED" });
    const replayJob = (await fixture.database.select().from(reportQueueJobs))
      .find((record) => record.id === replayId);
    expect(replayJob).toMatchObject({
      status: "terminal_failure",
      lastErrorCode: "PDF_FONT_MISSING",
      leasedBy: null,
      leasedUntil: null,
    });
    expect(await fixture.database.select().from(supportCases)).toHaveLength(1);
    expect((await fixture.database.select().from(notificationDeliveries)).filter(
      (record) => record.kind === "report_failed",
    )).toHaveLength(1);
    expect((await fixture.database.select().from(outbox)).filter(
      (event) => event.eventType === "report.fulfillment.failed.v1",
    )).toHaveLength(1);
    await fixture.database.$client.end();
  });
});
