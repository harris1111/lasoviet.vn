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
  reportSectionCheckpointRevisions,
  reportSectionQualityCandidates,
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
  let testDatabase: ReturnType<typeof createDatabase> | undefined;
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
    testDatabase ??= createDatabase(databaseUrl);
    return testDatabase;
  }

  function repository() {
    return createDatabaseReportSectionCheckpointRepository(database(), {
      now: () => frozenNow,
    });
  }

  let faultTriggerNumber = 0;
  async function withSkippedWrite(
    table: "report_section_checkpoints" | "report_section_quality_candidates",
    operation: "INSERT" | "UPDATE",
    run: () => Promise<void>,
  ) {
    faultTriggerNumber += 1;
    const client = database().$client;
    const functionName = `test_skip_quality_write_${faultTriggerNumber}`;
    const triggerName = `test_skip_quality_write_trigger_${faultTriggerNumber}`;
    try {
      await client.unsafe(`
        CREATE FUNCTION ${functionName}() RETURNS trigger
        LANGUAGE plpgsql AS $$
        BEGIN
          RETURN NULL;
        END
        $$
      `);
      await client.unsafe(`
        CREATE TRIGGER ${triggerName}
        BEFORE ${operation} ON ${table}
        FOR EACH ROW EXECUTE FUNCTION ${functionName}()
      `);
      await run();
    } finally {
      await client.unsafe(`DROP TRIGGER IF EXISTS ${triggerName} ON ${table}`);
      await client.unsafe(`DROP FUNCTION IF EXISTS ${functionName}()`);
    }
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

  function qualityCandidateInput(
    index: number,
    job: { id: string; workerId: string },
    checkpoint: { stateVersion: number; generationAttemptCount: number },
  ) {
    return {
      ...lineage(index),
      jobId: job.id,
      workerId: job.workerId,
      expectedStateVersion: checkpoint.stateVersion,
      generationOrdinal: checkpoint.generationAttemptCount,
      candidateContent: overview,
      candidateHash: hash(overview),
      candidateProviderId: "9router-an",
      candidateModelId: "claude-sonnet-4-6",
      findings: [{ itemKey: "overview", code: "MINIMUM_SYLLABLES" as const, note: "Requires more detail." }],
      rewriteAttemptCap: 1,
    };
  }

  async function prepareQualityCandidate(index: number, workerId = `quality-worker-${index}`) {
    const report = lineage(index);
    const job = await lease(report.reportVersionId, workerId);
    const generated = await claim(index, job);
    expect(generated.ok).toBe(true);
    if (!generated.ok) throw new Error("quality candidate generation claim failed");
    const input = qualityCandidateInput(index, job, generated.value.checkpoint);
    const recorded = await repository().recordQualityCandidate(input);
    expect(recorded.ok).toBe(true);
    if (!recorded.ok) throw new Error("quality candidate record failed");
    return { report, job, input, candidate: recorded.value.candidate };
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

  it("keeps passed revision overlays append-only and leaves the base checkpoint immutable", async () => {
    const report = lineage(13);
    const firstJob = await lease(report.reportVersionId, "rewrite-worker-one");
    const baseClaim = await claim(13, firstJob);
    expect(baseClaim.ok).toBe(true);
    if (!baseClaim.ok) return;
    await repository().markPassed({
      ...report,
      jobId: firstJob.id,
      workerId: firstJob.workerId,
      expectedStateVersion: baseClaim.value.checkpoint.stateVersion,
      acceptedContent: overview,
      contentHash: hash(overview),
      providerId: "openai",
      modelId: "gpt-5.6",
    });
    const [baseBefore] = await database().select().from(reportSectionCheckpoints).where(
      eq(reportSectionCheckpoints.reportVersionId, report.reportVersionId),
    );
    const first = await repository().claimPassedRewrite({
      ...report, jobId: firstJob.id, workerId: firstJob.workerId, rewriteAttemptCap: 2,
    });
    const replay = await repository().claimPassedRewrite({
      ...report, jobId: firstJob.id, workerId: firstJob.workerId, rewriteAttemptCap: 2,
    });
    expect(first).toMatchObject({ ok: true, value: { outcome: "claimed", revision: { rewriteOrdinal: 1 } } });
    expect(replay).toMatchObject({ ok: true, value: { outcome: "claimed", revision: { rewriteOrdinal: 1 } } });
    if (!first.ok) return;

    const revisedOne = { ...overview, title: "Revision one" };
    const passedOne = await repository().markPassedRewrite({
      ...report, jobId: firstJob.id, workerId: firstJob.workerId, rewriteOrdinal: 1,
      expectedStateVersion: first.value.revision.stateVersion, acceptedContent: revisedOne,
      contentHash: hash(revisedOne), providerId: "openai", modelId: "gpt-5.6",
    });
    expect(passedOne).toMatchObject({ ok: true, value: { outcome: "passed", revision: { rewriteOrdinal: 1, status: "passed" } } });

    const secondJob = await lease(report.reportVersionId, "rewrite-worker-two", false);
    await handoffReservation(report.reportVersionId, firstJob.id, secondJob.id);
    const second = await repository().claimPassedRewrite({
      ...report, jobId: secondJob.id, workerId: secondJob.workerId, rewriteAttemptCap: 2,
    });
    expect(second).toMatchObject({ ok: true, value: { revision: { rewriteOrdinal: 2 } } });
    if (!second.ok) return;
    const revisedTwo = { ...overview, title: "Revision two" };
    await repository().markPassedRewrite({
      ...report, jobId: secondJob.id, workerId: secondJob.workerId, rewriteOrdinal: 2,
      expectedStateVersion: second.value.revision.stateVersion, acceptedContent: revisedTwo,
      contentHash: hash(revisedTwo), providerId: "openai", modelId: "gpt-5.6",
    });
    await expect(repository().claimPassedRewrite({
      ...report, jobId: secondJob.id, workerId: secondJob.workerId, rewriteAttemptCap: 2,
    })).resolves.toMatchObject({ ok: false, error: { code: "REPORT_SECTION_CHECKPOINT_ATTEMPT_LIMIT" } });

    const [baseAfter] = await database().select().from(reportSectionCheckpoints).where(eq(reportSectionCheckpoints.id, baseBefore.id));
    const revisions = await database().select().from(reportSectionCheckpointRevisions).where(
      eq(reportSectionCheckpointRevisions.checkpointId, baseBefore.id),
    );
    expect(baseAfter).toMatchObject({
      acceptedContent: overview, contentHash: hash(overview), providerId: "openai", modelId: "gpt-5.6",
      rewriteAttemptCount: 2,
    });
    expect(revisions).toHaveLength(2);
    await expect(repository().listAccepted(report.reportVersionId)).resolves.toMatchObject({
      ok: true, value: [{ acceptedSection: { value: revisedTwo } }],
    });
  });

  it("terminalizes a failed rewrite ordinal and blocks another provider claim at cap one", async () => {
    const report = lineage(15);
    const job = await lease(report.reportVersionId, "rewrite-cap-one");
    const base = await claim(15, job);
    expect(base.ok).toBe(true);
    if (!base.ok) return;
    await repository().markPassed({
      ...report, jobId: job.id, workerId: job.workerId, expectedStateVersion: base.value.checkpoint.stateVersion,
      acceptedContent: overview, contentHash: hash(overview), providerId: "openai", modelId: "gpt-5.6",
    });
    const first = await repository().claimPassedRewrite({
      ...report, jobId: job.id, workerId: job.workerId, rewriteAttemptCap: 1,
    });
    expect(first).toMatchObject({ ok: true, value: { revision: { rewriteOrdinal: 1, status: "generating" } } });
    if (!first.ok) return;
    await expect(repository().releaseRewriteRetryableFailure({
      ...report, jobId: job.id, workerId: job.workerId, rewriteOrdinal: 1,
      expectedStateVersion: first.value.revision.stateVersion, failureCode: "AI_TIMEOUT",
    })).resolves.toMatchObject({ ok: true, value: { status: "terminal_failure", failureCode: "AI_TIMEOUT" } });
    await expect(repository().claimPassedRewrite({
      ...report, jobId: job.id, workerId: job.workerId, rewriteAttemptCap: 1,
    })).resolves.toMatchObject({ ok: false, error: { code: "REPORT_SECTION_CHECKPOINT_ATTEMPT_LIMIT" } });
    const revisions = await database().select().from(reportSectionCheckpointRevisions).where(
      eq(reportSectionCheckpointRevisions.checkpointId, first.value.revision.checkpointId),
    );
    expect(revisions).toMatchObject([{ rewriteOrdinal: 1, status: "terminal_failure", failureCode: "AI_TIMEOUT" }]);
  });

  it("creates a distinct second rewrite ordinal when cap two remains after a failed call", async () => {
    const report = lineage(16);
    const job = await lease(report.reportVersionId, "rewrite-cap-two");
    const base = await claim(16, job);
    expect(base.ok).toBe(true);
    if (!base.ok) return;
    await repository().markPassed({
      ...report, jobId: job.id, workerId: job.workerId, expectedStateVersion: base.value.checkpoint.stateVersion,
      acceptedContent: overview, contentHash: hash(overview), providerId: "openai", modelId: "gpt-5.6",
    });
    const first = await repository().claimPassedRewrite({
      ...report, jobId: job.id, workerId: job.workerId, rewriteAttemptCap: 2,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    await repository().releaseRewriteRetryableFailure({
      ...report, jobId: job.id, workerId: job.workerId, rewriteOrdinal: 1,
      expectedStateVersion: first.value.revision.stateVersion, failureCode: "AI_TIMEOUT",
    });
    const second = await repository().claimPassedRewrite({
      ...report, jobId: job.id, workerId: job.workerId, rewriteAttemptCap: 2,
    });
    expect(second).toMatchObject({ ok: true, value: { revision: { rewriteOrdinal: 2, status: "generating" } } });
    const [parent] = await database().select().from(reportSectionCheckpoints).where(
      eq(reportSectionCheckpoints.reportVersionId, report.reportVersionId),
    );
    const revisions = await database().select().from(reportSectionCheckpointRevisions).where(
      eq(reportSectionCheckpointRevisions.checkpointId, parent.id),
    ).orderBy(reportSectionCheckpointRevisions.rewriteOrdinal);
    expect(parent.rewriteAttemptCount).toBe(2);
    expect(revisions).toMatchObject([
      { rewriteOrdinal: 1, status: "terminal_failure", failureCode: "AI_TIMEOUT" },
      { rewriteOrdinal: 2, status: "generating", activeJobId: job.id, activeWorkerId: job.workerId },
    ]);
  });

  it("terminalizes a stale generating ordinal before applying the rewrite cap", async () => {
    const report = lineage(17);
    const firstJob = await lease(report.reportVersionId, "rewrite-stale-one");
    const base = await claim(17, firstJob);
    expect(base.ok).toBe(true);
    if (!base.ok) return;
    await repository().markPassed({
      ...report, jobId: firstJob.id, workerId: firstJob.workerId, expectedStateVersion: base.value.checkpoint.stateVersion,
      acceptedContent: overview, contentHash: hash(overview), providerId: "openai", modelId: "gpt-5.6",
    });
    const first = await repository().claimPassedRewrite({
      ...report, jobId: firstJob.id, workerId: firstJob.workerId, rewriteAttemptCap: 1,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    await database().update(reportQueueJobs).set({ leasedUntil: new Date(frozenNow.getTime() - 1) }).where(
      eq(reportQueueJobs.id, firstJob.id),
    );
    const nextJob = await lease(report.reportVersionId, "rewrite-stale-two", false);
    await handoffReservation(report.reportVersionId, firstJob.id, nextJob.id);
    await expect(repository().claimPassedRewrite({
      ...report, jobId: nextJob.id, workerId: nextJob.workerId, rewriteAttemptCap: 1,
    })).resolves.toMatchObject({ ok: false, error: { code: "REPORT_SECTION_CHECKPOINT_ATTEMPT_LIMIT" } });
    const [revision] = await database().select().from(reportSectionCheckpointRevisions).where(
      eq(reportSectionCheckpointRevisions.id, first.value.revision.id),
    );
    expect(revision).toMatchObject({
      rewriteOrdinal: 1,
      status: "terminal_failure",
      failureCode: "REWRITE_OWNER_ABANDONED",
      activeJobId: null,
      activeWorkerId: null,
    });
  });

  it("does not increment a rewrite ordinal for a duplicate live-owner claim", async () => {
    const report = lineage(18);
    const job = await lease(report.reportVersionId, "rewrite-duplicate-owner");
    const base = await claim(18, job);
    expect(base.ok).toBe(true);
    if (!base.ok) return;
    await repository().markPassed({
      ...report, jobId: job.id, workerId: job.workerId, expectedStateVersion: base.value.checkpoint.stateVersion,
      acceptedContent: overview, contentHash: hash(overview), providerId: "openai", modelId: "gpt-5.6",
    });
    const first = await repository().claimPassedRewrite({
      ...report, jobId: job.id, workerId: job.workerId, rewriteAttemptCap: 2,
    });
    const replay = await repository().claimPassedRewrite({
      ...report, jobId: job.id, workerId: job.workerId, rewriteAttemptCap: 2,
    });
    expect(first).toMatchObject({ ok: true, value: { revision: { rewriteOrdinal: 1 } } });
    expect(replay).toMatchObject({ ok: true, value: { revision: { rewriteOrdinal: 1 } } });
    const [parent] = await database().select().from(reportSectionCheckpoints).where(
      eq(reportSectionCheckpoints.reportVersionId, report.reportVersionId),
    );
    const revisions = await database().select().from(reportSectionCheckpointRevisions).where(
      eq(reportSectionCheckpointRevisions.checkpointId, parent.id),
    );
    expect(parent.rewriteAttemptCount).toBe(1);
    expect(revisions).toHaveLength(1);
  });

  it("fails closed for invalid rewrite content, hash, lineage, and corrupt history", async () => {
    const report = lineage(19);
    const job = await lease(report.reportVersionId, "rewrite-invalid");
    const base = await claim(19, job);
    expect(base.ok).toBe(true);
    if (!base.ok) return;
    await repository().markPassed({
      ...report, jobId: job.id, workerId: job.workerId, expectedStateVersion: base.value.checkpoint.stateVersion,
      acceptedContent: overview, contentHash: hash(overview), providerId: "openai", modelId: "gpt-5.6",
    });
    const claimed = await repository().claimPassedRewrite({
      ...report, jobId: job.id, workerId: job.workerId, rewriteAttemptCap: 1,
    });
    expect(claimed.ok).toBe(true);
    if (!claimed.ok) return;
    await expect(repository().markPassedRewrite({
      ...report, jobId: job.id, workerId: job.workerId, rewriteOrdinal: 1,
      expectedStateVersion: claimed.value.revision.stateVersion, acceptedContent: {}, contentHash: "not-a-hash",
      providerId: "openai", modelId: "gpt-5.6",
    })).resolves.toMatchObject({ ok: false, error: { code: "REPORT_SECTION_CHECKPOINT_INVALID" } });
    await expect(repository().claimPassedRewrite({
      ...report, promptVersion: "wrong", jobId: job.id, workerId: job.workerId, rewriteAttemptCap: 1,
    })).resolves.toMatchObject({ ok: false, error: { code: "REPORT_VERSION_CONFLICT" } });
    await database().update(reportSectionCheckpointRevisions).set({
      status: "passed", activeJobId: null, activeWorkerId: null, acceptedContent: overview,
      contentHash: "0".repeat(64), providerId: "openai", modelId: "gpt-5.6",
    }).where(eq(reportSectionCheckpointRevisions.id, claimed.value.revision.id));
    await expect(repository().listAccepted(report.reportVersionId)).resolves.toMatchObject({
      ok: false, error: { code: "REPORT_SECTION_CHECKPOINT_CORRUPT" },
    });
  });

  it("persists and resumes one deterministic quality candidate without another generation ordinal", async () => {
    const report = lineage(20);
    const job = await lease(report.reportVersionId, "quality-candidate-worker");
    const generated = await claim(20, job);
    expect(generated.ok).toBe(true);
    if (!generated.ok) return;
    const recorded = await repository().recordQualityCandidate({
      ...report,
      jobId: job.id,
      workerId: job.workerId,
      expectedStateVersion: generated.value.checkpoint.stateVersion,
      generationOrdinal: generated.value.checkpoint.generationAttemptCount,
      candidateContent: overview,
      candidateHash: hash(overview),
      candidateProviderId: "9router-an",
      candidateModelId: "claude-sonnet-4-6",
      findings: [{ itemKey: "overview", code: "MINIMUM_SYLLABLES", note: "Requires more detail." }],
      rewriteAttemptCap: 1,
    });
    expect(recorded).toMatchObject({
      ok: true,
      value: { outcome: "recorded", candidate: { generationOrdinal: 1, rewriteOrdinal: 1, status: "pending" } },
    });
    await expect(repository().recordQualityCandidate({
      ...report,
      jobId: job.id,
      workerId: job.workerId,
      expectedStateVersion: generated.value.checkpoint.stateVersion,
      generationOrdinal: generated.value.checkpoint.generationAttemptCount,
      candidateContent: overview,
      candidateHash: hash(overview),
      candidateProviderId: "9router-an",
      candidateModelId: "claude-sonnet-4-6",
      findings: [{ itemKey: "overview", code: "MINIMUM_SYLLABLES", note: "Requires more detail." }],
      rewriteAttemptCap: 1,
    })).resolves.toMatchObject({ ok: true, value: { outcome: "replay", candidate: { rewriteOrdinal: 1 } } });
    await expect(repository().recordQualityCandidate({
      ...report,
      jobId: job.id,
      workerId: job.workerId,
      expectedStateVersion: generated.value.checkpoint.stateVersion,
      generationOrdinal: generated.value.checkpoint.generationAttemptCount,
      candidateContent: { ...overview, title: "Mismatched candidate" },
      candidateHash: hash({ ...overview, title: "Mismatched candidate" }),
      candidateProviderId: "9router-an",
      candidateModelId: "claude-sonnet-4-6",
      findings: [{ itemKey: "overview", code: "MINIMUM_SYLLABLES", note: "Requires more detail." }],
      rewriteAttemptCap: 1,
    })).resolves.toMatchObject({ ok: false, error: { code: "REPORT_VERSION_CONFLICT" } });
    const [persisted] = await database().select().from(reportSectionQualityCandidates);
    expect(persisted).toMatchObject({
      generationOrdinal: 1,
      rewriteOrdinal: 1,
      status: "pending",
      candidateHash: hash(overview),
      acceptedContent: null,
    });

    const firstClaim = await repository().claimQualityRewrite({ ...report, jobId: job.id, workerId: job.workerId, attemptNumber: 1 });
    const replay = await repository().claimQualityRewrite({ ...report, jobId: job.id, workerId: job.workerId, attemptNumber: 1 });
    expect(firstClaim).toMatchObject({ ok: true, value: { outcome: "claimed", candidate: { rewriteOrdinal: 1, status: "generating" } } });
    expect(replay).toMatchObject({ ok: true, value: { outcome: "in_progress", candidate: { rewriteOrdinal: 1, activeAttemptNumber: 1 } } });
    if (!firstClaim.ok || !firstClaim.value.candidate) return;

    await expect(repository().releaseQualityRewriteRetryableFailure({
      ...report, jobId: job.id, workerId: job.workerId, rewriteOrdinal: 1,
      expectedStateVersion: firstClaim.value.candidate.stateVersion, failureCode: "AI_TIMEOUT",
    })).resolves.toMatchObject({ ok: true, value: { status: "pending", rewriteOrdinal: 1 } });
    const resumed = await repository().claimQualityRewrite({ ...report, jobId: job.id, workerId: job.workerId, attemptNumber: 2 });
    expect(resumed).toMatchObject({ ok: true, value: { outcome: "claimed", candidate: { rewriteOrdinal: 1 } } });
    if (!resumed.ok || !resumed.value.candidate) return;
    const rewritten = { ...overview, title: "Quality rewrite" };
    await expect(repository().markQualityRewritePassed({
      ...report, jobId: job.id, workerId: job.workerId, rewriteOrdinal: 1,
      expectedStateVersion: resumed.value.candidate.stateVersion,
      acceptedContent: rewritten, contentHash: hash(rewritten),
      providerId: "9router-an", modelId: "claude-sonnet-4-6",
    })).resolves.toMatchObject({ ok: true, value: { outcome: "passed", candidate: { status: "passed" } } });
    await expect(repository().listAccepted(report.reportVersionId)).resolves.toMatchObject({
      ok: true, value: [{ acceptedSection: { value: rewritten }, generationAttemptCount: 1, rewriteAttemptCount: 1 }],
    });
    await expect(repository().claimPassedRewrite({
      ...report, jobId: job.id, workerId: job.workerId, rewriteAttemptCap: 1,
    })).resolves.toMatchObject({ ok: false, error: { code: "REPORT_SECTION_CHECKPOINT_ATTEMPT_LIMIT" } });
  });

  it("fences quality rewrite epochs while allowing later attempts and a current new job takeover", async () => {
    const prepared = await prepareQualityCandidate(21);
    const first = await repository().claimQualityRewrite({
      ...prepared.report, jobId: prepared.job.id, workerId: prepared.job.workerId, attemptNumber: 1,
    });
    expect(first).toMatchObject({ ok: true, value: { outcome: "claimed", candidate: { rewriteOrdinal: 1, activeAttemptNumber: 1 } } });
    await expect(repository().claimQualityRewrite({
      ...prepared.report, jobId: prepared.job.id, workerId: prepared.job.workerId, attemptNumber: 1,
    })).resolves.toMatchObject({ ok: true, value: { outcome: "in_progress", candidate: { activeAttemptNumber: 1 } } });
    await expect(repository().claimQualityRewrite({
      ...prepared.report, jobId: prepared.job.id, workerId: prepared.job.workerId, attemptNumber: 2,
    })).resolves.toMatchObject({ ok: true, value: { outcome: "claimed", candidate: { rewriteOrdinal: 1, activeAttemptNumber: 2 } } });

    await database().update(reportQueueJobs).set({ leasedUntil: new Date(frozenNow.getTime() - 1) }).where(eq(reportQueueJobs.id, prepared.job.id));
    const nextJob = await lease(prepared.report.reportVersionId, "quality-current-new-job", false);
    await handoffReservation(prepared.report.reportVersionId, prepared.job.id, nextJob.id);
    await expect(repository().claimQualityRewrite({
      ...prepared.report, jobId: nextJob.id, workerId: nextJob.workerId, attemptNumber: 1,
    })).resolves.toMatchObject({ ok: true, value: { outcome: "claimed", candidate: { rewriteOrdinal: 1, activeAttemptNumber: 1 } } });
    await expect(repository().claimQualityRewrite({
      ...prepared.report, jobId: prepared.job.id, workerId: prepared.job.workerId, attemptNumber: 3,
    })).resolves.toMatchObject({ ok: false, error: { code: "REPORT_SECTION_CHECKPOINT_LEASE_LOST" } });
  });

  it("terminalizes the parent at the shared quality rewrite cap without inserting a candidate", async () => {
    const report = lineage(22);
    const job = await lease(report.reportVersionId, "quality-cap-worker");
    const generated = await claim(22, job);
    expect(generated.ok).toBe(true);
    if (!generated.ok) return;
    await database().update(reportSectionCheckpoints).set({ rewriteAttemptCount: 1 }).where(
      eq(reportSectionCheckpoints.reportVersionId, report.reportVersionId),
    );
    await expect(repository().recordQualityCandidate(
      qualityCandidateInput(22, job, generated.value.checkpoint),
    )).resolves.toMatchObject({ ok: false, error: { code: "REPORT_SECTION_CHECKPOINT_ATTEMPT_LIMIT" } });
    const [parent] = await database().select().from(reportSectionCheckpoints).where(
      eq(reportSectionCheckpoints.reportVersionId, report.reportVersionId),
    );
    expect(parent).toMatchObject({
      status: "terminal_failure",
      rewriteAttemptCount: 1,
      failureCode: "REWRITE_ATTEMPT_LIMIT",
    });
    expect(await database().select().from(reportSectionQualityCandidates).where(
      eq(reportSectionQualityCandidates.checkpointId, parent.id),
    )).toEqual([]);
  });

  it("rolls back the parent reservation when quality candidate insertion is skipped", async () => {
    const report = lineage(23);
    const job = await lease(report.reportVersionId, "quality-record-fault");
    const generated = await claim(23, job);
    expect(generated.ok).toBe(true);
    if (!generated.ok) return;
    const [beforeParent] = await database().select().from(reportSectionCheckpoints).where(
      eq(reportSectionCheckpoints.reportVersionId, report.reportVersionId),
    );
    await withSkippedWrite("report_section_quality_candidates", "INSERT", async () => {
      await expect(repository().recordQualityCandidate(
        qualityCandidateInput(23, job, generated.value.checkpoint),
      )).resolves.toMatchObject({ ok: false, error: { code: "REPORT_SECTION_CHECKPOINT_LEASE_LOST" } });
    });
    const [afterParent] = await database().select().from(reportSectionCheckpoints).where(
      eq(reportSectionCheckpoints.id, beforeParent.id),
    );
    expect(afterParent).toEqual(beforeParent);
    expect(await database().select().from(reportSectionQualityCandidates).where(
      eq(reportSectionQualityCandidates.checkpointId, beforeParent.id),
    )).toEqual([]);
  });

  it("rolls back a quality claim when the candidate CAS is skipped", async () => {
    const prepared = await prepareQualityCandidate(24, "quality-claim-fault");
    const [beforeParent] = await database().select().from(reportSectionCheckpoints).where(
      eq(reportSectionCheckpoints.reportVersionId, prepared.report.reportVersionId),
    );
    const [beforeCandidate] = await database().select().from(reportSectionQualityCandidates).where(
      eq(reportSectionQualityCandidates.checkpointId, beforeParent.id),
    );
    await withSkippedWrite("report_section_quality_candidates", "UPDATE", async () => {
      await expect(repository().claimQualityRewrite({
        ...prepared.report, jobId: prepared.job.id, workerId: prepared.job.workerId, attemptNumber: 1,
      })).resolves.toMatchObject({ ok: false, error: { code: "REPORT_SECTION_CHECKPOINT_LEASE_LOST" } });
    });
    const [afterParent] = await database().select().from(reportSectionCheckpoints).where(eq(reportSectionCheckpoints.id, beforeParent.id));
    const [afterCandidate] = await database().select().from(reportSectionQualityCandidates).where(eq(reportSectionQualityCandidates.id, beforeCandidate.id));
    expect(afterParent).toEqual(beforeParent);
    expect(afterCandidate).toEqual(beforeCandidate);
  });

  it("rolls back a quality pass when the parent CAS is skipped", async () => {
    const prepared = await prepareQualityCandidate(25, "quality-pass-fault");
    const claimed = await repository().claimQualityRewrite({
      ...prepared.report, jobId: prepared.job.id, workerId: prepared.job.workerId, attemptNumber: 1,
    });
    expect(claimed.ok).toBe(true);
    if (!claimed.ok || !claimed.value.candidate) return;
    const [beforeParent] = await database().select().from(reportSectionCheckpoints).where(
      eq(reportSectionCheckpoints.reportVersionId, prepared.report.reportVersionId),
    );
    const [beforeCandidate] = await database().select().from(reportSectionQualityCandidates).where(
      eq(reportSectionQualityCandidates.checkpointId, beforeParent.id),
    );
    const rewritten = { ...overview, title: "Atomic pass" };
    await withSkippedWrite("report_section_checkpoints", "UPDATE", async () => {
      await expect(repository().markQualityRewritePassed({
        ...prepared.report, jobId: prepared.job.id, workerId: prepared.job.workerId,
        rewriteOrdinal: 1, expectedStateVersion: claimed.value.candidate!.stateVersion,
        acceptedContent: rewritten, contentHash: hash(rewritten),
        providerId: "9router-an", modelId: "claude-sonnet-4-6",
      })).resolves.toMatchObject({ ok: false, error: { code: "REPORT_SECTION_CHECKPOINT_LEASE_LOST" } });
    });
    const [afterParent] = await database().select().from(reportSectionCheckpoints).where(eq(reportSectionCheckpoints.id, beforeParent.id));
    const [afterCandidate] = await database().select().from(reportSectionQualityCandidates).where(eq(reportSectionQualityCandidates.id, beforeCandidate.id));
    expect(afterParent).toEqual(beforeParent);
    expect(afterCandidate).toEqual(beforeCandidate);
  });

  it.each([
    ["release", 26],
    ["terminal", 27],
  ] as const)("rolls back a quality %s when the parent CAS is skipped", async (operation, index) => {
    const prepared = await prepareQualityCandidate(index, `quality-${operation}-fault`);
    const claimed = await repository().claimQualityRewrite({
      ...prepared.report, jobId: prepared.job.id, workerId: prepared.job.workerId, attemptNumber: 1,
    });
    expect(claimed.ok).toBe(true);
    if (!claimed.ok || !claimed.value.candidate) return;
    const [beforeParent] = await database().select().from(reportSectionCheckpoints).where(
      eq(reportSectionCheckpoints.reportVersionId, prepared.report.reportVersionId),
    );
    const [beforeCandidate] = await database().select().from(reportSectionQualityCandidates).where(
      eq(reportSectionQualityCandidates.checkpointId, beforeParent.id),
    );
    await withSkippedWrite("report_section_checkpoints", "UPDATE", async () => {
      const mutate = operation === "release"
        ? repository().releaseQualityRewriteRetryableFailure.bind(repository())
        : repository().markQualityRewriteTerminalFailure.bind(repository());
      await expect(mutate({
        ...prepared.report, jobId: prepared.job.id, workerId: prepared.job.workerId,
        rewriteOrdinal: 1, expectedStateVersion: claimed.value.candidate!.stateVersion,
        failureCode: operation === "release" ? "AI_TIMEOUT" : "AI_OUTPUT_INVALID",
      })).resolves.toMatchObject({ ok: false, error: { code: "REPORT_SECTION_CHECKPOINT_LEASE_LOST" } });
    });
    const [afterParent] = await database().select().from(reportSectionCheckpoints).where(eq(reportSectionCheckpoints.id, beforeParent.id));
    const [afterCandidate] = await database().select().from(reportSectionQualityCandidates).where(eq(reportSectionQualityCandidates.id, beforeCandidate.id));
    expect(afterParent).toEqual(beforeParent);
    expect(afterCandidate).toEqual(beforeCandidate);
  });

  it("keeps runtime finding validation closed and leaves the generating parent unchanged", async () => {
    const report = lineage(28);
    const job = await lease(report.reportVersionId, "quality-runtime-shape");
    const generated = await claim(28, job);
    expect(generated.ok).toBe(true);
    if (!generated.ok) return;
    const input = qualityCandidateInput(28, job, generated.value.checkpoint);
    await expect(repository().recordQualityCandidate({
      ...input,
      findings: [{ ...input.findings[0]!, extra: "forbidden" }] as any,
    })).resolves.toMatchObject({ ok: false, error: { code: "REPORT_SECTION_CHECKPOINT_INVALID" } });
    await expect(repository().recordQualityCandidate({
      ...input,
      findings: [{ ...input.findings[0]!, code: "OPEN_CODE" }] as any,
    })).resolves.toMatchObject({ ok: false, error: { code: "REPORT_SECTION_CHECKPOINT_INVALID" } });
    await expect(repository().get(report.reportVersionId, report.sectionKey)).resolves.toMatchObject({
      ok: true,
      value: {
        status: "generating",
        generationAttemptCount: 1,
        rewriteAttemptCount: 0,
      },
    });
  });

  it("terminalizes candidate and parent together after a claimed deterministic rewrite", async () => {
    const prepared = await prepareQualityCandidate(29, "quality-terminal-success");
    const claimed = await repository().claimQualityRewrite({
      ...prepared.report, jobId: prepared.job.id, workerId: prepared.job.workerId, attemptNumber: 1,
    });
    expect(claimed.ok).toBe(true);
    if (!claimed.ok || !claimed.value.candidate) return;
    await expect(repository().markQualityRewriteTerminalFailure({
      ...prepared.report, jobId: prepared.job.id, workerId: prepared.job.workerId,
      rewriteOrdinal: 1, expectedStateVersion: claimed.value.candidate.stateVersion,
      failureCode: "AI_OUTPUT_INVALID",
    })).resolves.toMatchObject({ ok: true, value: { status: "terminal_failure", activeAttemptNumber: null } });
    const [parent] = await database().select().from(reportSectionCheckpoints).where(
      eq(reportSectionCheckpoints.reportVersionId, prepared.report.reportVersionId),
    );
    const [candidate] = await database().select().from(reportSectionQualityCandidates).where(
      eq(reportSectionQualityCandidates.checkpointId, parent.id),
    );
    expect(parent).toMatchObject({ status: "terminal_failure", failureCode: "AI_OUTPUT_INVALID" });
    expect(candidate).toMatchObject({
      status: "terminal_failure",
      activeJobId: null,
      activeWorkerId: null,
      activeAttemptNumber: null,
      failureCode: "AI_OUTPUT_INVALID",
    });
  });
});
