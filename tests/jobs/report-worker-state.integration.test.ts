import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { createHash, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  authUsers,
  commerceEntitlements,
  commerceOrders,
  createDatabase,
  outbox,
  reportQueueJobs,
  reportReservations,
  runMigrations,
} from "../../packages/database/src/index.js";
import {
  createDatabaseReportQueueStore,
  createReportService,
} from "../../packages/backend/src/index.js";
import {
  createReportGenerateProcessor,
} from "../../apps/worker/src/processors/report-generate.processor.js";

describe("report worker state integration and lease recovery", () => {
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

  it("preserves single reservation and queue row on duplicate job enqueue", async () => {
    const database = createDatabase(databaseUrl);
    const userId = `user-${randomUUID()}`;
    const orderId = randomUUID();
    const entitlementId = randomUUID();
    const reportId = randomUUID();
    const reportVersionId = randomUUID();

    await database.insert(authUsers).values({
      id: userId,
      name: "Queue Test User",
      email: `${userId}@example.test`,
      emailVerified: true,
    });
    await database.insert(commerceOrders).values({
      id: orderId,
      invoiceNumber: `INV-${orderId}`,
      chartId: `chart-${orderId}`,
      chartVersionId: `chart-v-${orderId}`,
      ownerId: userId,
      sku: "ZIWEI-IDENTITY-P0",
      amount: 79_000,
      currency: "VND",
      locale: "vi",
      status: "paid",
    });
    await database.insert(commerceEntitlements).values({
      id: entitlementId,
      orderId,
      chartId: `chart-${orderId}`,
      sku: "ZIWEI-IDENTITY-P0",
      ownerId: userId,
    });
    await database.insert(reportReservations).values({
      id: randomUUID(),
      reportId,
      reportVersionId,
      entitlementId,
      chartVersionId: `chart-v-${orderId}`,
      evidenceVersionId: "evidence-v1",
      knowledgeVersionId: "knowledge-v1",
      promptVersion: "prompt-v1",
      reportConfigVersion: "config-v1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      status: "requested",
    });

    const queueStore = createDatabaseReportQueueStore(database, "test-worker");
    const job = {
      schemaVersion: 1 as const,
      name: "report.generate.v1" as const,
      sourceEventId: `evt-${randomUUID()}`,
      traceId: `trace-${randomUUID()}`,
      idempotencyKey: `report-generate:${reportVersionId}`,
      payload: {
        reportId,
        reportVersionId,
        entitlementId,
        chartVersionId: `chart-v-${orderId}`,
        evidenceVersionId: "evidence-v1",
        knowledgeVersionId: "knowledge-v1",
        promptVersion: "prompt-v1",
        reportConfigVersion: "config-v1",
        locale: "vi" as const,
        sku: "ZIWEI-IDENTITY-P0",
      },
    };

    await queueStore.enqueue(job);
    await queueStore.enqueue(job);

    const allQueuedJobs = await database.select().from(reportQueueJobs);
    const queuedJobs = allQueuedJobs.filter((j) => j.idempotencyKey === job.idempotencyKey);
    expect(queuedJobs).toHaveLength(1);

    const allReservations = await database.select().from(reportReservations);
    const reservations = allReservations.filter((r) => r.reportVersionId === reportVersionId);
    expect(reservations).toHaveLength(1);
    await database.$client.end();
  });

  it("reclaims an expired lease and schedules retry on retryable failure", async () => {
    const database = createDatabase(databaseUrl);
    await database.delete(reportQueueJobs);
    await database.delete(outbox);
    const queueStore = createDatabaseReportQueueStore(database, "recovering-worker");
    const now = new Date();
    const expiredTime = new Date(now.getTime() - 60_000);
    const jobId = `job-${randomUUID()}`;

    await database.insert(reportQueueJobs).values({
      id: jobId,
      name: "report.generate.v1",
      sourceEventId: `evt-${randomUUID()}`,
      traceId: `trace-${randomUUID()}`,
      idempotencyKey: `idemp-${jobId}`,
      payload: {},
      status: "leased",
      leasedBy: "dead-worker",
      leasedUntil: expiredTime,
      attemptCount: 1,
    });

    const claimed = await queueStore.claimNext(now);
    expect(claimed).not.toBeNull();
    expect(claimed?.id).toBe(jobId);
    expect(claimed?.leasedBy).toBe("recovering-worker");
    expect(claimed?.attemptCount).toBe(2);
    expect(claimed?.leasedUntil).toEqual(new Date(now.getTime() + 600_000));

    const nextAttemptAt = new Date(now.getTime() + 15_000);
    await queueStore.recordRetryableFailure(jobId, "AI_RATE_LIMIT", nextAttemptAt);

    const allJobs = await database.select().from(reportQueueJobs);
    const [retried] = allJobs.filter((j) => j.id === jobId);
    expect(retried.status).toBe("retryable_failure");
    expect(retried.lastErrorCode).toBe("AI_RATE_LIMIT");
    expect(retried.leasedBy).toBeNull();
    expect(retried.leasedUntil).toBeNull();
    await database.$client.end();
  });

  it("marks terminal failure and emits report.fulfillment.failed.v1 upon third failed attempt", async () => {
    const database = createDatabase(databaseUrl);
    const reportService = createReportService(database);
    const queueStore = createDatabaseReportQueueStore(database, "terminal-worker");
    const processor = createReportGenerateProcessor({
      database,
      reportService,
      queueStore,
      workerId: "terminal-worker",
    });

    const userId = `user-${randomUUID()}`;
    const orderId = randomUUID();
    const entitlementId = randomUUID();
    const reportId = randomUUID();
    const reportVersionId = randomUUID();
    const jobId = `job-${randomUUID()}`;

    await database.insert(authUsers).values({
      id: userId,
      name: "Terminal Test User",
      email: `${userId}@example.test`,
      emailVerified: true,
    });
    await database.insert(commerceOrders).values({
      id: orderId,
      invoiceNumber: `INV-${orderId}`,
      chartId: `chart-${orderId}`,
      chartVersionId: `chart-v-${orderId}`,
      ownerId: userId,
      sku: "ZIWEI-IDENTITY-P0",
      amount: 79_000,
      currency: "VND",
      locale: "vi",
      status: "paid",
    });
    await database.insert(commerceEntitlements).values({
      id: entitlementId,
      orderId,
      chartId: `chart-${orderId}`,
      sku: "ZIWEI-IDENTITY-P0",
      ownerId: userId,
    });
    await database.insert(reportReservations).values({
      id: randomUUID(),
      reportId,
      reportVersionId,
      entitlementId,
      chartVersionId: `chart-v-${orderId}`,
      evidenceVersionId: "evidence-v1",
      knowledgeVersionId: "knowledge-v1",
      promptVersion: "prompt-v1",
      reportConfigVersion: "config-v1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      status: "generating",
      activeJobId: jobId,
      stateVersion: 1,
    });

    await database.insert(reportQueueJobs).values({
      id: jobId,
      name: "report.generate.v1",
      sourceEventId: `evt-${randomUUID()}`,
      traceId: `trace-${randomUUID()}`,
      idempotencyKey: `idemp-${jobId}`,
      payload: {
        reportId,
        reportVersionId,
        entitlementId,
        chartVersionId: `chart-v-${orderId}`,
        evidenceVersionId: "evidence-v1",
        knowledgeVersionId: "knowledge-v1",
        promptVersion: "prompt-v1",
        reportConfigVersion: "config-v1",
        locale: "vi",
        sku: "ZIWEI-IDENTITY-P0",
      },
      status: "leased",
      leasedBy: "terminal-worker",
      leasedUntil: new Date(Date.now() + 60_000),
      attemptCount: 3,
    });

    const result = await processor.processJobFailure({
      jobId,
      reportVersionId,
      attemptCount: 3,
      errorCode: "UPSTREAM_UNAVAILABLE",
    });
    expect(result).toEqual({ ok: false, code: "JOB_RETRY_EXHAUSTED" });

    const allJobs = await database.select().from(reportQueueJobs);
    const [failedJob] = allJobs.filter((j) => j.id === jobId);
    expect(failedJob.status).toBe("terminal_failure");
    expect(failedJob.lastErrorCode).toBe("JOB_RETRY_EXHAUSTED");

    const allReservations = await database.select().from(reportReservations);
    const [failedReservation] = allReservations.filter((r) => r.reportVersionId === reportVersionId);
    expect(failedReservation.status).toBe("terminal_failure");
    expect(failedReservation.lastErrorCode).toBe("JOB_RETRY_EXHAUSTED");
    expect(failedReservation.stateVersion).toBe(2);

    const allOutboxEvents = await database.select().from(outbox);
    const failedEvents = allOutboxEvents.filter((e) => e.eventType === "report.fulfillment.failed.v1");
    expect(failedEvents).toHaveLength(1);
    const expectedHash = createHash("sha256")
      .update(`${reportVersionId}::${jobId}::generation`)
      .digest("hex");
    expect(failedEvents[0].idempotencyKey).toBe(`report-failed:${expectedHash}`);
    expect(failedEvents[0].eventId).toBe(`evt-failed-${expectedHash}`);

    const pdfEvents = allOutboxEvents.filter((e) => e.eventType === "report.pdf.requested.v1");
    expect(pdfEvents).toHaveLength(0);
    await database.$client.end();
  });

  it("fences a malformed untrusted identity job at attempt 3 without emitting outbox", async () => {
    const database = createDatabase(databaseUrl);
    const reportService = createReportService(database);
    const queueStore = createDatabaseReportQueueStore(database, "untrusted-worker");
    const processor = createReportGenerateProcessor({
      database,
      reportService,
      queueStore,
      workerId: "untrusted-worker",
    });

    const jobId = `job-untrusted-${randomUUID()}`;
    await database.insert(reportQueueJobs).values({
      id: jobId,
      name: "report.generate.v1",
      sourceEventId: `evt-${randomUUID()}`,
      traceId: `trace-${randomUUID()}`,
      idempotencyKey: `idemp-${jobId}`,
      payload: { garbage: true },
      status: "leased",
      leasedBy: "untrusted-worker",
      leasedUntil: new Date(Date.now() + 60_000),
      attemptCount: 3,
    });

    const result = await processor.processJobFailure({
      jobId,
      reportVersionId: undefined,
      attemptCount: 3,
      errorCode: "JOB_PAYLOAD_INVALID",
    });
    expect(result).toEqual({ ok: false, code: "JOB_RETRY_EXHAUSTED" });

    const allJobs = await database.select().from(reportQueueJobs);
    const [fencedJob] = allJobs.filter((j) => j.id === jobId);
    expect(fencedJob.status).toBe("terminal_failure");
    expect(fencedJob.lastErrorCode).toBe("JOB_RETRY_EXHAUSTED");

    const allOutboxEvents = await database.select().from(outbox);
    const failedEvents = allOutboxEvents.filter(
      (e) => e.eventType === "report.fulfillment.failed.v1" && e.aggregateId === jobId,
    );
    expect(failedEvents).toHaveLength(0);
    await database.$client.end();
  });

  it("fences a malformed payload containing existing reportVersionId at attempt 3 without emitting outbox", async () => {
    const database = createDatabase(databaseUrl);
    await database.delete(reportQueueJobs);
    await database.delete(outbox);
    const reportService = createReportService(database);
    const queueStore = createDatabaseReportQueueStore(database, "malformed-existing-worker");
    const processor = createReportGenerateProcessor({
      database,
      reportService,
      queueStore,
      workerId: "malformed-existing-worker",
    });

    const userId = `user-${randomUUID()}`;
    const orderId = randomUUID();
    const entitlementId = randomUUID();
    const reportId = randomUUID();
    const reportVersionId = randomUUID();
    const jobId = `job-malformed-${randomUUID()}`;

    await database.insert(authUsers).values({
      id: userId,
      name: "Malformed Existing User",
      email: `${userId}@example.test`,
      emailVerified: true,
    });
    await database.insert(commerceOrders).values({
      id: orderId,
      invoiceNumber: `INV-${orderId}`,
      chartId: `chart-${orderId}`,
      chartVersionId: `chart-v-${orderId}`,
      ownerId: userId,
      sku: "ZIWEI-IDENTITY-P0",
      amount: 79_000,
      currency: "VND",
      locale: "vi",
      status: "paid",
    });
    await database.insert(commerceEntitlements).values({
      id: entitlementId,
      orderId,
      chartId: `chart-${orderId}`,
      sku: "ZIWEI-IDENTITY-P0",
      ownerId: userId,
    });
    await database.insert(reportReservations).values({
      id: randomUUID(),
      reportId,
      reportVersionId,
      entitlementId,
      chartVersionId: `chart-v-${orderId}`,
      evidenceVersionId: "evidence-v1",
      knowledgeVersionId: "knowledge-v1",
      promptVersion: "prompt-v1",
      reportConfigVersion: "config-v1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      status: "requested",
      stateVersion: 1,
    });

    await database.insert(reportQueueJobs).values({
      id: jobId,
      name: "report.generate.v1",
      sourceEventId: `evt-${randomUUID()}`,
      traceId: `trace-${randomUUID()}`,
      idempotencyKey: `idemp-${jobId}`,
      payload: { reportVersionId, broken: true },
      status: "waiting",
      attemptCount: 2,
      availableAt: new Date(Date.now() - 1_000),
    });

    const processed = await processor.processNext();
    expect(processed).toEqual({ processed: false });

    const allJobs = await database.select().from(reportQueueJobs);
    const [fencedJob] = allJobs.filter((j) => j.id === jobId);
    expect(fencedJob.status).toBe("terminal_failure");
    expect(fencedJob.lastErrorCode).toBe("JOB_RETRY_EXHAUSTED");

    const allReservations = await database.select().from(reportReservations);
    const [reservation] = allReservations.filter((r) => r.reportVersionId === reportVersionId);
    expect(reservation.status).toBe("requested");
    expect(reservation.stateVersion).toBe(1);

    const allOutboxEvents = await database.select().from(outbox);
    const failedEvents = allOutboxEvents.filter(
      (e) => e.eventType === "report.fulfillment.failed.v1" && e.aggregateId === reportVersionId,
    );
    expect(failedEvents).toHaveLength(0);
    await database.$client.end();
  });

  it("prevents stale worker from mutating job or transitioning report after lease expires and worker B reclaims", async () => {
    const database = createDatabase(databaseUrl);
    await database.delete(reportQueueJobs);
    await database.delete(outbox);
    const reportService = createReportService(database);
    const queueStoreA = createDatabaseReportQueueStore(database, "worker-A");
    const queueStoreB = createDatabaseReportQueueStore(database, "worker-B");

    const userId = `user-${randomUUID()}`;
    const orderId = randomUUID();
    const entitlementId = randomUUID();
    const reportId = randomUUID();
    const reportVersionId = randomUUID();
    const jobId = `job-race-${randomUUID()}`;
    const initialTime = new Date();

    await database.insert(authUsers).values({
      id: userId,
      name: "Race Test User",
      email: `${userId}@example.test`,
      emailVerified: true,
    });
    await database.insert(commerceOrders).values({
      id: orderId,
      invoiceNumber: `INV-${orderId}`,
      chartId: `chart-${orderId}`,
      chartVersionId: `chart-v-${orderId}`,
      ownerId: userId,
      sku: "ZIWEI-IDENTITY-P0",
      amount: 79_000,
      currency: "VND",
      locale: "vi",
      status: "paid",
    });
    await database.insert(commerceEntitlements).values({
      id: entitlementId,
      orderId,
      chartId: `chart-${orderId}`,
      sku: "ZIWEI-IDENTITY-P0",
      ownerId: userId,
    });
    await database.insert(reportReservations).values({
      id: randomUUID(),
      reportId,
      reportVersionId,
      entitlementId,
      chartVersionId: `chart-v-${orderId}`,
      evidenceVersionId: "evidence-v1",
      knowledgeVersionId: "knowledge-v1",
      promptVersion: "prompt-v1",
      reportConfigVersion: "config-v1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      status: "requested",
      stateVersion: 1,
    });

    await database.insert(reportQueueJobs).values({
      id: jobId,
      name: "report.generate.v1",
      sourceEventId: `evt-${randomUUID()}`,
      traceId: `trace-${randomUUID()}`,
      idempotencyKey: `idemp-${jobId}`,
      payload: {
        reportId,
        reportVersionId,
        entitlementId,
        chartVersionId: `chart-v-${orderId}`,
        evidenceVersionId: "evidence-v1",
        knowledgeVersionId: "knowledge-v1",
        promptVersion: "prompt-v1",
        reportConfigVersion: "config-v1",
        locale: "vi",
        sku: "ZIWEI-IDENTITY-P0",
      },
      status: "leased",
      leasedBy: "worker-A",
      leasedUntil: new Date(initialTime.getTime() - 1000),
      attemptCount: 1,
    });

    const claimTime = new Date();
    const claimedByB = await queueStoreB.claimNext(claimTime);
    expect(claimedByB).not.toBeNull();
    expect(claimedByB?.id).toBe(jobId);
    expect(claimedByB?.leasedBy).toBe("worker-B");

    const retryResultA = await queueStoreA.recordRetryableFailure(
      jobId,
      "ERROR",
      new Date(Date.now() + 1000),
    );
    expect(retryResultA).toEqual({ ok: false, code: "LEASE_LOST" });

    const markResultA = await queueStoreA.markProcessed(jobId);
    expect(markResultA).toEqual({ ok: false, code: "LEASE_LOST" });

    const terminalResultA = await queueStoreA.recordTerminalFailure(jobId, "ERROR");
    expect(terminalResultA).toEqual({ ok: false, code: "LEASE_LOST" });

    const startResultA = await reportService.startGenerating({
      reportVersionId,
      jobId,
      workerId: "worker-A",
    });
    expect(startResultA).toEqual({ ok: false, code: "LEASE_LOST" });

    const allJobs = await database.select().from(reportQueueJobs);
    const [jobAfterRace] = allJobs.filter((j) => j.id === jobId);
    expect(jobAfterRace.status).toBe("leased");
    expect(jobAfterRace.leasedBy).toBe("worker-B");

    const allReservations = await database.select().from(reportReservations);
    const [reservationAfterRace] = allReservations.filter(
      (r) => r.reportVersionId === reportVersionId,
    );
    expect(reservationAfterRace.status).toBe("requested");
    expect(reservationAfterRace.stateVersion).toBe(1);

    await database.$client.end();
  });
});
