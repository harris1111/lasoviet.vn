import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  createDatabase,
  reportQueueJobs,
  runMigrations,
} from "@lasoviet/database";
import {
  createDatabaseReportQueueStore,
  createReportService,
} from "./report.service.js";

describe("createReportService terminal recovery", () => {
  function createMockTx(options: {
    reservation: Record<string, unknown> | null;
    existingVersion?: Record<string, unknown> | null;
  }) {
    let selectCallCount = 0;
    const insertedValues: Array<Record<string, unknown>> = [];

    const tx = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => {
            selectCallCount += 1;
            if (selectCallCount === 1) {
              // reservation query with for("update")
              return {
                for: vi.fn().mockResolvedValue(options.reservation ? [options.reservation] : []),
              };
            }
            // existingVersion query with limit(1)
            return {
              limit: vi.fn().mockResolvedValue(options.existingVersion ? [options.existingVersion] : []),
            };
          }),
        })),
      })),
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => ({
            returning: vi.fn().mockResolvedValue([
              {
                ...(options.reservation ?? {}),
                status: "requested",
                stateVersion: Number(options.reservation?.stateVersion ?? 1) + 1,
              },
            ]),
          })),
        })),
      })),
      insert: vi.fn(() => ({
        values: vi.fn((vals: Record<string, unknown>) => {
          insertedValues.push(vals);
          return {
            onConflictDoNothing: vi.fn(() => ({
              returning: vi.fn().mockResolvedValue([vals]),
            })),
          };
        }),
      })),
    };

    return { tx, insertedValues };
  }

  it("reconstructs V2 payload and event report.generation.requested.v2 when all 4 timing fields are non-null", async () => {
    const mockReservation = {
      id: "res-1",
      reportId: "report-1",
      reportVersionId: "version-1",
      entitlementId: "entitlement-1",
      chartVersionId: "chart-1",
      evidenceVersionId: "evidence-1",
      knowledgeVersionId: "knowledge-4",
      promptVersion: "prompt-4",
      reportConfigVersion: "config-4",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      status: "terminal_failure",
      lastErrorCode: "REPORT_EVIDENCE_INVALID",
      stateVersion: 2,
      asOfDate: "2026-09-12",
      targetYear: 2026,
      timingRuleVersion: "ziwei.timing.v1",
      sensitivityRuleVersion: "ziwei.sensitivity.v1",
      readingContextRevisionId: "reading-context-revision-1",
    };

    const { tx, insertedValues } = createMockTx({ reservation: mockReservation });
    const mockDb = {
      transaction: vi.fn(async (callback: (txArg: typeof tx) => Promise<unknown>) => callback(tx)),
    };

    const service = createReportService(mockDb as never);

    // Call recovery with a date far in 2027 to prove it never derives a fresh date/year
    const clockIn2027 = new Date("2027-05-20T10:00:00.000Z");
    const result = await service.recoverEvidenceInvalidGeneration({
      reportVersionId: "version-1",
      expectedStateVersion: 2,
      recoveryId: "rec-1",
      now: clockIn2027,
    });

    expect(result).toEqual({ ok: true, stateVersion: 3 });

    // Verify outbox was enqueued with V2 event and preserved frozen 2026 timing fields
    expect(insertedValues.length).toBe(1);
    const outboxRow = insertedValues[0];
    expect(outboxRow?.eventType).toBe("report.generation.requested.v2");
    expect(outboxRow?.schemaVersion).toBe(1);
    expect(outboxRow?.payload).toEqual({
      reportId: "report-1",
      reportVersionId: "version-1",
      entitlementId: "entitlement-1",
      chartVersionId: "chart-1",
      evidenceVersionId: "evidence-1",
      knowledgeVersionId: "knowledge-4",
      promptVersion: "prompt-4",
      reportConfigVersion: "config-4",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      asOfDate: "2026-09-12",
      targetYear: 2026,
      timingRuleVersion: "ziwei.timing.v1",
      sensitivityRuleVersion: "ziwei.sensitivity.v1",
      readingContextRevisionId: "reading-context-revision-1",
    });
  });

  it("reconstructs V1 payload and event report.generation.requested.v1 when timing fields are null", async () => {
    const mockReservation = {
      id: "res-v1",
      reportId: "report-v1",
      reportVersionId: "version-v1",
      entitlementId: "entitlement-v1",
      chartVersionId: "chart-1",
      evidenceVersionId: "evidence-1",
      knowledgeVersionId: "knowledge-3",
      promptVersion: "prompt-3",
      reportConfigVersion: "config-3",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      status: "terminal_failure",
      lastErrorCode: "AI_OUTPUT_INVALID",
      stateVersion: 1,
      asOfDate: null,
      targetYear: null,
      timingRuleVersion: null,
      sensitivityRuleVersion: null,
    };

    const { tx, insertedValues } = createMockTx({ reservation: mockReservation });
    const mockDb = {
      transaction: vi.fn(async (callback: (txArg: typeof tx) => Promise<unknown>) => callback(tx)),
    };

    const service = createReportService(mockDb as never);

    const result = await service.recoverInvalidOutputGeneration({
      reportVersionId: "version-v1",
      expectedStateVersion: 1,
      recoveryId: "rec-v1",
    });

    expect(result).toEqual({ ok: true, stateVersion: 2 });

    expect(insertedValues.length).toBe(1);
    const outboxRow = insertedValues[0];
    expect(outboxRow?.eventType).toBe("report.generation.requested.v1");
    expect(outboxRow?.schemaVersion).toBe(1);
    expect(outboxRow?.payload).toEqual({
      reportId: "report-v1",
      reportVersionId: "version-v1",
      entitlementId: "entitlement-v1",
      chartVersionId: "chart-1",
      evidenceVersionId: "evidence-1",
      knowledgeVersionId: "knowledge-3",
      promptVersion: "prompt-3",
      reportConfigVersion: "config-3",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
    });
  });

  it("fails with WORKFLOW_STATE_CONFLICT if reservation state does not match expectations", async () => {
    const mockReservation = {
      id: "res-mismatch",
      reportVersionId: "version-mismatch",
      status: "generating", // not terminal_failure
      lastErrorCode: "AI_OUTPUT_INVALID",
      stateVersion: 1,
    };

    const { tx } = createMockTx({ reservation: mockReservation });
    const mockDb = {
      transaction: vi.fn(async (callback: (txArg: typeof tx) => Promise<unknown>) => callback(tx)),
    };

    const service = createReportService(mockDb as never);

    const result = await service.recoverInvalidOutputGeneration({
      reportVersionId: "version-mismatch",
      expectedStateVersion: 1,
      recoveryId: "rec-mismatch",
    });

    expect(result).toEqual({ ok: false, code: "WORKFLOW_STATE_CONFLICT" });
  });

  it("fails with REPORT_NOT_FOUND if reservation does not exist", async () => {
    const { tx } = createMockTx({ reservation: null });
    const mockDb = {
      transaction: vi.fn(async (callback: (txArg: typeof tx) => Promise<unknown>) => callback(tx)),
    };

    const service = createReportService(mockDb as never);

    const result = await service.recoverEvidenceInvalidGeneration({
      reportVersionId: "missing-version",
      expectedStateVersion: 1,
      recoveryId: "rec-missing",
    });

    expect(result).toEqual({ ok: false, code: "REPORT_NOT_FOUND" });
  });

  it("fails closed with REPORT_TIMING_LINEAGE_INVALID when timing lineage is partial, never updating reservation or enqueuing outbox", async () => {
    const partialReservations = [
      {
        id: "res-partial-1",
        reportVersionId: "ver-part-1",
        status: "terminal_failure",
        lastErrorCode: "REPORT_EVIDENCE_INVALID",
        stateVersion: 1,
        asOfDate: "2026-09-12",
        targetYear: null,
        timingRuleVersion: "ziwei.timing.v1",
        sensitivityRuleVersion: "ziwei.sensitivity.v1",
      },
      {
        id: "res-partial-2",
        reportVersionId: "ver-part-2",
        status: "terminal_failure",
        lastErrorCode: "AI_OUTPUT_INVALID",
        stateVersion: 1,
        asOfDate: "2026-09-12",
        targetYear: 2026,
        timingRuleVersion: null,
        sensitivityRuleVersion: "ziwei.sensitivity.v1",
      },
      {
        id: "res-partial-3",
        reportVersionId: "ver-part-3",
        status: "terminal_failure",
        lastErrorCode: "REPORT_EVIDENCE_INVALID",
        stateVersion: 1,
        asOfDate: null,
        targetYear: 2026,
        timingRuleVersion: null,
        sensitivityRuleVersion: null,
      },
    ];

    for (const partialRes of partialReservations) {
      const { tx, insertedValues } = createMockTx({ reservation: partialRes });
      const mockDb = {
        transaction: vi.fn(async (callback: (txArg: typeof tx) => Promise<unknown>) => callback(tx)),
      };

      const service = createReportService(mockDb as never);

      const result =
        partialRes.lastErrorCode === "REPORT_EVIDENCE_INVALID"
          ? await service.recoverEvidenceInvalidGeneration({
              reportVersionId: partialRes.reportVersionId,
              expectedStateVersion: 1,
              recoveryId: "rec-partial",
            })
          : await service.recoverInvalidOutputGeneration({
              reportVersionId: partialRes.reportVersionId,
              expectedStateVersion: 1,
              recoveryId: "rec-partial",
            });

      expect(result).toEqual({ ok: false, code: "REPORT_TIMING_LINEAGE_INVALID" });
      expect(tx.update).not.toHaveBeenCalled();
      expect(tx.insert).not.toHaveBeenCalled();
      expect(insertedValues).toHaveLength(0);
    }
  });

  it("recovers REPORT_SAFETY_REJECTED reservation with complete V2 timing lineage, requeues report.generation.requested.v2, preserves frozen timing, and increments stateVersion", async () => {
    const mockReservation = {
      id: "res-safety-v2",
      reportId: "report-safety-1",
      reportVersionId: "version-safety-1",
      entitlementId: "entitlement-safety-1",
      chartVersionId: "chart-1",
      evidenceVersionId: "evidence-1",
      knowledgeVersionId: "knowledge-4",
      promptVersion: "prompt-4",
      reportConfigVersion: "config-4",
      locale: "vi",
      sku: "ZIWEI-NATAL-V4",
      status: "terminal_failure",
      lastErrorCode: "REPORT_SAFETY_REJECTED",
      stateVersion: 2,
      asOfDate: "2026-09-12",
      targetYear: 2026,
      timingRuleVersion: "ziwei.timing.v1",
      sensitivityRuleVersion: "ziwei.sensitivity.v1",
    };

    const { tx, insertedValues } = createMockTx({ reservation: mockReservation });
    const mockDb = {
      transaction: vi.fn(async (callback: (txArg: typeof tx) => Promise<unknown>) => callback(tx)),
    };

    const service = createReportService(mockDb as never);

    // Provide a future date in 2027 to verify frozen timing is preserved, not derived freshly
    const clockIn2027 = new Date("2027-08-15T12:00:00.000Z");
    const result = await service.recoverInvalidOutputGeneration({
      reportVersionId: "version-safety-1",
      expectedStateVersion: 2,
      recoveryId: "rec-safety-1",
      now: clockIn2027,
    });

    expect(result).toEqual({ ok: true, stateVersion: 3 });

    expect(insertedValues.length).toBe(1);
    const outboxRow = insertedValues[0];
    expect(outboxRow?.eventType).toBe("report.generation.requested.v2");
    expect(outboxRow?.schemaVersion).toBe(1);
    expect(outboxRow?.payload).toEqual({
      reportId: "report-safety-1",
      reportVersionId: "version-safety-1",
      entitlementId: "entitlement-safety-1",
      chartVersionId: "chart-1",
      evidenceVersionId: "evidence-1",
      knowledgeVersionId: "knowledge-4",
      promptVersion: "prompt-4",
      reportConfigVersion: "config-4",
      locale: "vi",
      sku: "ZIWEI-NATAL-V4",
      asOfDate: "2026-09-12",
      targetYear: 2026,
      timingRuleVersion: "ziwei.timing.v1",
      sensitivityRuleVersion: "ziwei.sensitivity.v1",
      readingContextRevisionId: null,
    });
  });

  it("rejects recovery with WORKFLOW_STATE_CONFLICT and performs no update or outbox enqueue when lastErrorCode is an unrelated terminal code", async () => {
    const mockReservation = {
      id: "res-unrelated",
      reportId: "report-unrelated",
      reportVersionId: "version-unrelated",
      status: "terminal_failure",
      lastErrorCode: "AI_TIMEOUT", // unrelated terminal code not in allowedErrorCodes
      stateVersion: 1,
      asOfDate: "2026-09-12",
      targetYear: 2026,
      timingRuleVersion: "ziwei.timing.v1",
      sensitivityRuleVersion: "ziwei.sensitivity.v1",
    };

    const { tx, insertedValues } = createMockTx({ reservation: mockReservation });
    const mockDb = {
      transaction: vi.fn(async (callback: (txArg: typeof tx) => Promise<unknown>) => callback(tx)),
    };

    const service = createReportService(mockDb as never);

    const result = await service.recoverInvalidOutputGeneration({
      reportVersionId: "version-unrelated",
      expectedStateVersion: 1,
      recoveryId: "rec-unrelated",
    });

    expect(result).toEqual({ ok: false, code: "WORKFLOW_STATE_CONFLICT" });
    expect(tx.update).not.toHaveBeenCalled();
    expect(tx.insert).not.toHaveBeenCalled();
    expect(insertedValues).toHaveLength(0);
  });

});

describe("createDatabaseReportQueueStore renewLease", () => {
  const frozenNow = new Date("2026-09-15T00:00:00.000Z");
  let container: Awaited<ReturnType<PostgreSqlContainer["start"]>> | undefined;
  let databaseUrl = "";
  let sequence = 0;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine")
      .withDatabase("lasoviet_report_queue_renewal_test")
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

  async function insertJob(params: {
    status: "waiting" | "retryable_failure" | "leased" | "processed";
    leasedBy?: string | null;
    leasedUntil?: Date | null;
  }) {
    sequence += 1;
    const id = `renewal-job-${sequence}`;
    await database().insert(reportQueueJobs).values({
      id,
      name: "report.generate.v2",
      sourceEventId: `renewal-source-${sequence}`,
      traceId: `renewal-trace-${sequence}`,
      idempotencyKey: `renewal-idempotency-${sequence}`,
      payload: {},
      status: params.status,
      attemptCount: 1,
      availableAt: frozenNow,
      leasedBy: params.leasedBy ?? null,
      leasedUntil: params.leasedUntil ?? null,
      createdAt: frozenNow,
      updatedAt: frozenNow,
    });
    return id;
  }

  async function row(id: string) {
    const [stored] = await database()
      .select()
      .from(reportQueueJobs)
      .where(eq(reportQueueJobs.id, id));
    return stored;
  }

  it("extends a live same-worker lease by exactly ten minutes", async () => {
    const id = await insertJob({
      status: "leased",
      leasedBy: "worker-a",
      leasedUntil: new Date(frozenNow.getTime() + 60_000),
    });

    await expect(
      createDatabaseReportQueueStore(database(), "worker-a").renewLease(id, frozenNow),
    ).resolves.toEqual({ ok: true });

    expect((await row(id))?.leasedUntil).toEqual(new Date(frozenNow.getTime() + 600_000));
  });

  it.each([
    ["expired lease", "leased", "worker-a", new Date(frozenNow.getTime() - 1)],
    ["wrong worker", "leased", "worker-a", new Date(frozenNow.getTime() + 60_000)],
    ["waiting status", "waiting", null, null],
    ["retryable status", "retryable_failure", null, null],
    ["processed status", "processed", null, null],
  ] as const)(
    "returns LEASE_LOST and leaves a %s row unchanged",
    async (_label, status, leasedBy, leasedUntil) => {
      const id = await insertJob({ status, leasedBy, leasedUntil });
      const before = await row(id);
      const workerId = status === "leased" && leasedBy === "worker-a" && leasedUntil === null
        ? "worker-b"
        : status === "leased" && leasedUntil && leasedUntil > frozenNow
          ? "worker-b"
          : "worker-a";

      await expect(
        createDatabaseReportQueueStore(database(), workerId).renewLease(id, frozenNow),
      ).resolves.toEqual({ ok: false, code: "LEASE_LOST" });

      expect(await row(id)).toEqual(before);
    },
  );
});
