import { createHash } from "node:crypto";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  commerceEntitlements,
  commerceOrders,
  createDatabase,
  reportQueueJobs,
  reportReservations,
  reportSectionCheckpoints,
  runMigrations,
} from "@lasoviet/database";
import { TIER_2_ENTITLEMENT_SCOPE } from "@lasoviet/contracts";

import {
  createDatabaseReportSectionCheckpointRepository,
  type ReportSectionCheckpointLineage,
} from "./report-section-checkpoint.repository.js";

const frozenNow = new Date("2026-09-15T00:00:00.000Z");
const overview = {
  title: "Overview",
  narrative: "A bounded section for checkpoint persistence.",
  evidenceKeys: ["ziwei.palace.life"],
};

function hash(value: unknown): string {
  function stable(source: unknown): string {
    if (source === null || typeof source === "boolean" || typeof source === "number" || typeof source === "string") return JSON.stringify(source);
    if (Array.isArray(source)) return `[${source.map(stable).join(",")}]`;
    const record = source as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stable(record[key])}`).join(",")}}`;
  }
  return createHash("sha256").update(stable(value), "utf8").digest("hex");
}

function lineage(index: number, sectionKey: "overview" | "coreAxis" = "overview"): ReportSectionCheckpointLineage {
  return {
    reportVersionId: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    sectionKey,
    sectionOrder: sectionKey === "overview" ? 0 : 1,
    promptVersion: "ziwei.comprehensive.prompt.v4.0.1",
    knowledgeVersionId: "knowledge.v1",
    reportConfigVersion: "ziwei.comprehensive.report.v4",
    qualityConfigVersion: "ziwei.comprehensive.quality.v1",
  };
}

function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe("createDatabaseReportSectionCheckpointRepository", () => {
  let container: Awaited<ReturnType<PostgreSqlContainer["start"]>> | undefined;
  let databaseUrl = "";
  let queueNumber = 0;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine")
      .withDatabase("lasoviet_checkpoint_repository_test")
      .withUsername("lasoviet")
      .withPassword("lasoviet")
      .start();
    databaseUrl = container.getConnectionUri();
    await runMigrations(databaseUrl);
  }, 120_000);

  afterAll(async () => {
    if (container) await container.stop();
  }, 30_000);

  function database() {
    return createDatabase(databaseUrl);
  }

  function repository() {
    return createDatabaseReportSectionCheckpointRepository(database(), {
      now: () => frozenNow,
    });
  }

  async function lease(
    reportVersionId: string,
    workerId = "checkpoint-worker",
    createReservation = true,
  ) {
    queueNumber += 1;
    const id = `checkpoint-job-${queueNumber}`;
    const sequence = String(queueNumber).padStart(12, "0");
    const orderId = `10000000-0000-4000-8000-${sequence}`;
    const entitlementId = `20000000-0000-4000-8000-${sequence}`;
    const reportId = `30000000-0000-4000-8000-${sequence}`;
    const db = database();
    await db.insert(commerceOrders).values({
      id: orderId,
      paymentCode: `LSV${String(queueNumber).padStart(9, "0")}`,
      invoiceNumber: `checkpoint-invoice-${queueNumber}`,
      chartId: `checkpoint-chart-${queueNumber}`,
      chartVersionId: "checkpoint-chart-v1",
      ownerId: "checkpoint-owner",
      sku: "ZIWEI-IDENTITY-P0",
      amount: 79000,
      currency: "VND",
      locale: "vi",
      status: "paid",
      createdAt: frozenNow,
    });
    await db.insert(commerceEntitlements).values({
      id: entitlementId,
      orderId,
      chartId: `checkpoint-chart-${queueNumber}`,
      sku: "ZIWEI-IDENTITY-P0",
      ownerId: "checkpoint-owner",
      scope: TIER_2_ENTITLEMENT_SCOPE,
      createdAt: frozenNow,
    });
    await db.insert(reportQueueJobs).values({
      id,
      name: "reports.generate",
      sourceEventId: `checkpoint-source-${queueNumber}`,
      traceId: `checkpoint-trace-${queueNumber}`,
      idempotencyKey: `checkpoint-idempotency-${queueNumber}`,
      payload: {},
      status: "leased",
      leasedBy: workerId,
      leasedUntil: new Date(frozenNow.getTime() + 60_000),
      availableAt: frozenNow,
      createdAt: frozenNow,
      updatedAt: frozenNow,
    });
    if (createReservation) {
      await db.insert(reportReservations).values({
        reportId,
        reportVersionId,
        entitlementId,
        chartVersionId: "checkpoint-chart-v1",
        evidenceVersionId: "checkpoint-evidence-v1",
        knowledgeVersionId: "knowledge.v1",
        promptVersion: "ziwei.comprehensive.prompt.v4.0.1",
        reportConfigVersion: "ziwei.comprehensive.report.v4",
        locale: "vi",
        sku: "ZIWEI-IDENTITY-P0",
        status: "generating",
        activeJobId: id,
        createdAt: frozenNow,
        updatedAt: frozenNow,
      });
    }
    return { id, workerId };
  }

  async function handoffReservation(
    reportVersionId: string,
    previousJobId: string,
    nextJobId: string,
  ) {
    await database().update(reportReservations).set({
      activeJobId: nextJobId,
      updatedAt: frozenNow,
    }).where(and(
      eq(reportReservations.reportVersionId, reportVersionId),
      eq(reportReservations.activeJobId, previousJobId),
      eq(reportReservations.status, "generating"),
    ));
  }

  async function claim(index: number, job: { id: string; workerId: string }, mode: "generation" | "rewrite" = "generation") {
    return repository().claim({
      ...lineage(index),
      jobId: job.id,
      workerId: job.workerId,
      mode,
      generationAttemptCap: 2,
      rewriteAttemptCap: 1,
    });
  }

  it("reserves one generation attempt and makes duplicate owner claims idempotent", async () => {
    const job = await lease(lineage(1).reportVersionId);
    const first = await claim(1, job);
    const duplicate = await claim(1, job);

    expect(first).toMatchObject({ ok: true, value: { outcome: "claimed", checkpoint: { generationAttemptCount: 1, status: "generating", stateVersion: 2 } } });
    expect(duplicate).toMatchObject({ ok: true, value: { outcome: "claimed", checkpoint: { generationAttemptCount: 1, stateVersion: 2 } } });
  });

  it("caps concurrent generation claims and records terminal failure without over-reserving", async () => {
    const firstJob = await lease(lineage(2).reportVersionId);
    const initial = await claim(2, firstJob);
    expect(initial.ok).toBe(true);

    await database().update(reportQueueJobs).set({ leasedUntil: new Date(frozenNow.getTime() - 1) }).where(eq(reportQueueJobs.id, firstJob.id));
    const secondJob = await lease(lineage(2).reportVersionId, "checkpoint-worker-2", false);
    await handoffReservation(lineage(2).reportVersionId, firstJob.id, secondJob.id);
    const second = await claim(2, secondJob);
    expect(second).toMatchObject({ ok: true, value: { checkpoint: { generationAttemptCount: 2 } } });

    await database().update(reportQueueJobs).set({ leasedUntil: new Date(frozenNow.getTime() - 1) }).where(eq(reportQueueJobs.id, secondJob.id));
    const thirdJob = await lease(lineage(2).reportVersionId, "checkpoint-worker-3", false);
    await handoffReservation(lineage(2).reportVersionId, secondJob.id, thirdJob.id);
    const exhausted = await claim(2, thirdJob);
    expect(exhausted).toMatchObject({ ok: false, error: { code: "REPORT_SECTION_CHECKPOINT_ATTEMPT_LIMIT" } });

    const [row] = await database().select().from(reportSectionCheckpoints).where(eq(reportSectionCheckpoints.reportVersionId, lineage(2).reportVersionId));
    expect(row).toMatchObject({ status: "terminal_failure", generationAttemptCount: 2, activeJobId: null, activeWorkerId: null, failureCode: "GENERATION_ATTEMPT_LIMIT" });
  });

  it("passes once, replays matching content, and conflicts on changed passed content", async () => {
    const job = await lease(lineage(3).reportVersionId);
    const claimed = await claim(3, job);
    expect(claimed.ok).toBe(true);
    if (!claimed.ok) return;
    const input = {
      ...lineage(3),
      jobId: job.id,
      workerId: job.workerId,
      expectedStateVersion: claimed.value.checkpoint.stateVersion,
      acceptedContent: overview,
      contentHash: hash(overview),
      providerId: "openai",
      modelId: "gpt-5.6",
    };

    await expect(repository().markPassed(input)).resolves.toMatchObject({ ok: true, value: { outcome: "passed", checkpoint: { status: "passed" } } });
    await expect(repository().markPassed(input)).resolves.toMatchObject({ ok: true, value: { outcome: "replay" } });
    await expect(repository().markPassed({ ...input, acceptedContent: { ...overview, title: "Changed" }, contentHash: hash({ ...overview, title: "Changed" }) })).resolves.toMatchObject({
      ok: false,
      error: { code: "REPORT_VERSION_CONFLICT" },
    });
  });

  it("lists passed checkpoints in canonical section order and rejects invalid content or hashes without writes", async () => {
    const coreJob = await lease(lineage(4).reportVersionId);
    const coreClaim = await repository().claim({
      ...lineage(4, "coreAxis"),
      jobId: coreJob.id,
      workerId: coreJob.workerId,
      mode: "generation",
      generationAttemptCap: 1,
      rewriteAttemptCap: 0,
    });
    expect(coreClaim.ok).toBe(true);
    if (!coreClaim.ok) return;
    await repository().markPassed({
      ...lineage(4, "coreAxis"),
      jobId: coreJob.id,
      workerId: coreJob.workerId,
      expectedStateVersion: coreClaim.value.checkpoint.stateVersion,
      acceptedContent: overview,
      contentHash: hash(overview),
      providerId: "openai",
      modelId: "gpt-5.6",
    });

    const invalid = await repository().markPassed({
      ...lineage(4),
      jobId: coreJob.id,
      workerId: coreJob.workerId,
      expectedStateVersion: 1,
      acceptedContent: {},
      contentHash: "not-a-hash",
      providerId: "openai",
      modelId: "gpt-5.6",
    });
    expect(invalid).toMatchObject({ ok: false, error: { code: "REPORT_SECTION_CHECKPOINT_INVALID" } });
    await expect(repository().listPassed(lineage(4).reportVersionId)).resolves.toMatchObject({
      ok: true,
      value: [{ sectionKey: "coreAxis", sectionOrder: 1 }],
    });
  });

  it("releases retryable failures and permits reservation-authorized reclaim", async () => {
    const owner = await lease(lineage(5).reportVersionId);
    const initial = await claim(5, owner);
    expect(initial.ok).toBe(true);
    if (!initial.ok) return;
    const released = await repository().releaseRetryableFailure({
      ...lineage(5),
      jobId: owner.id,
      workerId: owner.workerId,
      expectedStateVersion: initial.value.checkpoint.stateVersion,
      failureCode: "PROVIDER_TIMEOUT",
    });
    expect(released).toMatchObject({ ok: true, value: { status: "pending", activeJobId: null } });
    const competing = await lease(lineage(5).reportVersionId, "checkpoint-worker-competing", false);
    await handoffReservation(lineage(5).reportVersionId, owner.id, competing.id);
    const reclaimed = await claim(5, competing, "rewrite");
    expect(reclaimed).toMatchObject({ ok: true, value: { checkpoint: { rewriteAttemptCount: 1, activeJobId: competing.id } } });
  });

  it("fences stale worker, state, and lease from passing or terminal-failing a newer checkpoint", async () => {
    const oldJob = await lease(lineage(6).reportVersionId);
    const initial = await claim(6, oldJob);
    expect(initial.ok).toBe(true);
    if (!initial.ok) return;
    await database().update(reportQueueJobs).set({ leasedUntil: new Date(frozenNow.getTime() - 1) }).where(eq(reportQueueJobs.id, oldJob.id));
    const newJob = await lease(lineage(6).reportVersionId, "checkpoint-worker-new", false);
    await handoffReservation(lineage(6).reportVersionId, oldJob.id, newJob.id);
    const reclaimed = await claim(6, newJob);
    expect(reclaimed.ok).toBe(true);
    if (!reclaimed.ok) return;

    const stale = {
      ...lineage(6),
      jobId: oldJob.id,
      workerId: oldJob.workerId,
      expectedStateVersion: initial.value.checkpoint.stateVersion,
      acceptedContent: overview,
      contentHash: hash(overview),
      providerId: "openai",
      modelId: "gpt-5.6",
    };
    await expect(repository().markPassed(stale)).resolves.toMatchObject({ ok: false, error: { code: "REPORT_SECTION_CHECKPOINT_LEASE_LOST" } });
    await expect(repository().markTerminalFailure({
      ...lineage(6),
      jobId: oldJob.id,
      workerId: oldJob.workerId,
      expectedStateVersion: initial.value.checkpoint.stateVersion,
      failureCode: "STALE",
    })).resolves.toMatchObject({ ok: false, error: { code: "REPORT_SECTION_CHECKPOINT_LEASE_LOST" } });

    const [row] = await database().select().from(reportSectionCheckpoints).where(and(
      eq(reportSectionCheckpoints.reportVersionId, lineage(6).reportVersionId),
      eq(reportSectionCheckpoints.sectionKey, "overview"),
    ));
    expect(row).toMatchObject({ status: "generating", activeJobId: newJob.id, stateVersion: reclaimed.value.checkpoint.stateVersion });
  });

  it("rejects every mutation when a live job and reservation belong to another report version", async () => {
    const reportA = lineage(7);
    const reportB = lineage(8);
    const jobA = await lease(reportA.reportVersionId, "checkpoint-worker-a");
    const jobB = await lease(reportB.reportVersionId, "checkpoint-worker-b");
    const claimB = await claim(8, jobB);
    expect(claimB.ok).toBe(true);
    if (!claimB.ok) return;

    await expect(repository().claim({
      ...reportB,
      jobId: jobA.id,
      workerId: jobA.workerId,
      mode: "generation",
      generationAttemptCap: 2,
      rewriteAttemptCap: 1,
    })).resolves.toMatchObject({ ok: false, error: { code: "REPORT_SECTION_CHECKPOINT_LEASE_LOST" } });

    const crossReportInput = {
      ...reportB,
      jobId: jobA.id,
      workerId: jobA.workerId,
      expectedStateVersion: claimB.value.checkpoint.stateVersion,
    };
    await expect(repository().markPassed({
      ...crossReportInput,
      acceptedContent: overview,
      contentHash: hash(overview),
      providerId: "openai",
      modelId: "gpt-5.6",
    })).resolves.toMatchObject({ ok: false, error: { code: "REPORT_SECTION_CHECKPOINT_LEASE_LOST" } });
    await expect(repository().releaseRetryableFailure({
      ...crossReportInput,
      failureCode: "CROSS_REPORT",
    })).resolves.toMatchObject({ ok: false, error: { code: "REPORT_SECTION_CHECKPOINT_LEASE_LOST" } });
    await expect(repository().markTerminalFailure({
      ...crossReportInput,
      failureCode: "CROSS_REPORT",
    })).resolves.toMatchObject({ ok: false, error: { code: "REPORT_SECTION_CHECKPOINT_LEASE_LOST" } });

    const [row] = await database().select().from(reportSectionCheckpoints).where(and(
      eq(reportSectionCheckpoints.reportVersionId, reportB.reportVersionId),
      eq(reportSectionCheckpoints.sectionKey, reportB.sectionKey),
    ));
    expect(row).toMatchObject({
      status: "generating",
      activeJobId: jobB.id,
      activeWorkerId: jobB.workerId,
      stateVersion: claimB.value.checkpoint.stateVersion,
    });
  });

  it("holds atomic queue and reservation fences until the checkpoint mutation commits", async () => {
    const report = lineage(9);
    const job = await lease(report.reportVersionId, "checkpoint-worker-atomic");
    const fenceLocked = deferred();
    const releaseCheckpoint = deferred();
    const repo = createDatabaseReportSectionCheckpointRepository(database(), {
      now: () => frozenNow,
      onFenceLocked: async () => {
        fenceLocked.resolve();
        await releaseCheckpoint.promise;
      },
    });

    const checkpointClaim = repo.claim({
      ...report,
      jobId: job.id,
      workerId: job.workerId,
      mode: "generation",
      generationAttemptCap: 1,
      rewriteAttemptCap: 0,
    });
    await fenceLocked.promise;

    const revocationEntered = deferred();
    let revocationCompleted = false;
    const revocation = database().transaction(async (transaction) => {
      revocationEntered.resolve();
      await transaction.update(reportQueueJobs).set({
        status: "retryable_failure",
        leasedBy: null,
        leasedUntil: null,
      }).where(eq(reportQueueJobs.id, job.id));
      await transaction.update(reportReservations).set({
        status: "retryable_failure",
        activeJobId: null,
      }).where(and(
        eq(reportReservations.reportVersionId, report.reportVersionId),
        eq(reportReservations.activeJobId, job.id),
      ));
      revocationCompleted = true;
    });
    await revocationEntered.promise;
    await Promise.resolve();
    expect(revocationCompleted).toBe(false);

    releaseCheckpoint.resolve();
    await expect(checkpointClaim).resolves.toMatchObject({
      ok: true,
      value: { checkpoint: { status: "generating", generationAttemptCount: 1 } },
    });
    await revocation;
    expect(revocationCompleted).toBe(true);

    const [checkpoint] = await database().select().from(reportSectionCheckpoints).where(and(
      eq(reportSectionCheckpoints.reportVersionId, report.reportVersionId),
      eq(reportSectionCheckpoints.sectionKey, report.sectionKey),
    ));
    expect(checkpoint).toMatchObject({
      status: "generating",
      generationAttemptCount: 1,
      activeJobId: job.id,
      activeWorkerId: job.workerId,
    });

    const staleReport = lineage(10);
    const staleJob = await lease(staleReport.reportVersionId, "checkpoint-worker-revoked");
    await database().transaction(async (transaction) => {
      await transaction.update(reportQueueJobs).set({
        status: "retryable_failure",
        leasedBy: null,
        leasedUntil: null,
      }).where(eq(reportQueueJobs.id, staleJob.id));
      await transaction.update(reportReservations).set({
        status: "retryable_failure",
        activeJobId: null,
      }).where(and(
        eq(reportReservations.reportVersionId, staleReport.reportVersionId),
        eq(reportReservations.activeJobId, staleJob.id),
      ));
    });
    await expect(repository().claim({
      ...staleReport,
      jobId: staleJob.id,
      workerId: staleJob.workerId,
      mode: "generation",
      generationAttemptCap: 1,
      rewriteAttemptCap: 0,
    })).resolves.toMatchObject({
      ok: false,
      error: { code: "REPORT_SECTION_CHECKPOINT_LEASE_LOST" },
    });
    await expect(repository().get(staleReport.reportVersionId, staleReport.sectionKey)).resolves.toEqual({
      ok: true,
      value: null,
    });
  });

  it("completes duplicate-owner handoff without deadlock and reserves only for the reservation-authorized owner", async () => {
    const report = lineage(11);
    const previousJob = await lease(report.reportVersionId, "checkpoint-worker-previous");
    const initial = await claim(11, previousJob);
    expect(initial).toMatchObject({
      ok: true,
      value: { checkpoint: { generationAttemptCount: 1 } },
    });

    const nextJob = await lease(report.reportVersionId, "checkpoint-worker-next", false);
    const previousFenceLocked = deferred();
    const releasePreviousDuplicate = deferred();
    const previousRepository = createDatabaseReportSectionCheckpointRepository(database(), {
      now: () => frozenNow,
      onFenceLocked: async () => {
        previousFenceLocked.resolve();
        await releasePreviousDuplicate.promise;
      },
    });
    const previousDuplicate = previousRepository.claim({
      ...report,
      jobId: previousJob.id,
      workerId: previousJob.workerId,
      mode: "generation",
      generationAttemptCap: 2,
      rewriteAttemptCap: 1,
    });
    await previousFenceLocked.promise;

    const handoffEntered = deferred();
    let handoffCompleted = false;
    const handoff = database().transaction(async (transaction) => {
      handoffEntered.resolve();
      await transaction.update(reportQueueJobs).set({
        status: "retryable_failure",
        leasedBy: null,
        leasedUntil: null,
      }).where(eq(reportQueueJobs.id, previousJob.id));
      await transaction.update(reportReservations).set({
        activeJobId: nextJob.id,
        updatedAt: frozenNow,
      }).where(and(
        eq(reportReservations.reportVersionId, report.reportVersionId),
        eq(reportReservations.activeJobId, previousJob.id),
        eq(reportReservations.status, "generating"),
      ));
      handoffCompleted = true;
    });
    await handoffEntered.promise;
    await Promise.resolve();
    expect(handoffCompleted).toBe(false);

    releasePreviousDuplicate.resolve();
    await expect(previousDuplicate).resolves.toMatchObject({
      ok: true,
      value: { checkpoint: { generationAttemptCount: 1, activeJobId: previousJob.id } },
    });
    await handoff;
    expect(handoffCompleted).toBe(true);

    await expect(repository().claim({
      ...report,
      jobId: previousJob.id,
      workerId: previousJob.workerId,
      mode: "generation",
      generationAttemptCap: 2,
      rewriteAttemptCap: 1,
    })).resolves.toMatchObject({
      ok: false,
      error: { code: "REPORT_SECTION_CHECKPOINT_LEASE_LOST" },
    });
    await expect(claim(11, nextJob)).resolves.toMatchObject({
      ok: true,
      value: {
        outcome: "claimed",
        checkpoint: {
          generationAttemptCount: 2,
          activeJobId: nextJob.id,
          activeWorkerId: nextJob.workerId,
        },
      },
    });
  });

  it("serializes duplicate claim and markPassed for one authorized job without reserving another attempt", async () => {
    const report = lineage(12);
    const job = await lease(report.reportVersionId, "checkpoint-worker-claim-pass");
    const initial = await claim(12, job);
    expect(initial.ok).toBe(true);
    if (!initial.ok) return;

    const fenceLocked = deferred();
    const releaseDuplicate = deferred();
    const duplicateRepository = createDatabaseReportSectionCheckpointRepository(database(), {
      now: () => frozenNow,
      onFenceLocked: async () => {
        fenceLocked.resolve();
        await releaseDuplicate.promise;
      },
    });
    const duplicate = duplicateRepository.claim({
      ...report,
      jobId: job.id,
      workerId: job.workerId,
      mode: "generation",
      generationAttemptCap: 2,
      rewriteAttemptCap: 1,
    });
    await fenceLocked.promise;

    let passCompleted = false;
    const pass = repository().markPassed({
      ...report,
      jobId: job.id,
      workerId: job.workerId,
      expectedStateVersion: initial.value.checkpoint.stateVersion,
      acceptedContent: overview,
      contentHash: hash(overview),
      providerId: "openai",
      modelId: "gpt-5.6",
    }).then((result) => {
      passCompleted = true;
      return result;
    });
    await Promise.resolve();
    expect(passCompleted).toBe(false);

    releaseDuplicate.resolve();
    await expect(duplicate).resolves.toMatchObject({
      ok: true,
      value: { checkpoint: { status: "generating", generationAttemptCount: 1 } },
    });
    await expect(pass).resolves.toMatchObject({
      ok: true,
      value: { outcome: "passed", checkpoint: { status: "passed", generationAttemptCount: 1 } },
    });
    await expect(repository().get(report.reportVersionId, report.sectionKey)).resolves.toMatchObject({
      ok: true,
      value: {
        status: "passed",
        generationAttemptCount: 1,
        activeJobId: null,
        activeWorkerId: null,
      },
    });
  });
});
