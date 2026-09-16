import { describe, expect, it, vi } from "vitest";
import { createReportGenerateProcessor } from "./report-generate.processor.js";
import type { Database } from "@lasoviet/database";

describe("createReportGenerateProcessor alert dispatching", () => {
  const dummyDb = {} as Database;
  const workerId = "test-worker-1";

  it("requests immediate post-commit dispatch on non-retryable generation terminal failure", async () => {
    const mockReportService = {
      recordTerminalFailure: vi.fn().mockResolvedValue({ ok: true }),
      startGenerating: vi.fn().mockResolvedValue({ ok: true }),
    };
    const mockQueueStore = {
      claimNext: vi.fn().mockResolvedValue({
        id: "job-1",
        name: "report.generate.v1",
        sourceEventId: "evt-1",
        traceId: "trace-1",
        idempotencyKey: "idem-1",
        attemptCount: 1,
        payload: {
          reportId: "00000000-0000-0000-0000-000000000001",
          reportVersionId: "00000000-0000-0000-0000-000000000002",
          entitlementId: "00000000-0000-0000-0000-000000000003",
          chartVersionId: "chart-1",
          evidenceVersionId: "ev-1",
          knowledgeVersionId: "kn-1",
          promptVersion: "p-1",
          reportConfigVersion: "c-1",
          locale: "vi",
          sku: "ZIWEI-IDENTITY-P0",
        },
      }),
      recordRetryableFailure: vi.fn(),
      recordTerminalFailure: vi.fn(),
      markProcessed: vi.fn(),
    };
    const mockGenService = {
      replayExisting: vi.fn().mockResolvedValue({ ok: true, value: null }),
      generateReport: vi.fn().mockResolvedValue({
        ok: false,
        error: { code: "AI_OUTPUT_INVALID", retryable: false },
      }),
    };
    const mockAlertDispatcher = {
      dispatchPendingAlerts: vi.fn().mockResolvedValue({ delivered: 1, failed: 0, unconfigured: false }),
    };

    const processor = createReportGenerateProcessor({
      database: dummyDb,
      reportService: mockReportService as never,
      queueStore: mockQueueStore as never,
      workerId,
      generationService: mockGenService as never,
      alertDispatcher: mockAlertDispatcher,
    });

    const result = await processor.processNext();
    expect(result).toEqual({ processed: false });

    expect(mockReportService.recordTerminalFailure).toHaveBeenCalledWith({
      reportVersionId: "00000000-0000-0000-0000-000000000002",
      jobId: "job-1",
      workerId,
      errorCode: "AI_OUTPUT_INVALID",
      failureStage: "generation",
    });

    expect(mockAlertDispatcher.dispatchPendingAlerts).toHaveBeenCalledWith("report_terminal_failure");
    expect(mockAlertDispatcher.dispatchPendingAlerts).toHaveBeenCalledTimes(1);
  });

  it("requests immediate dispatch on processJobFailure when the non-timeout attempt cap is reached", async () => {
    const mockReportService = {
      recordTerminalFailure: vi.fn().mockResolvedValue({ ok: true }),
    };
    const mockQueueStore = {
      claimNext: vi.fn(),
      recordRetryableFailure: vi.fn(),
      recordTerminalFailure: vi.fn(),
      markProcessed: vi.fn(),
    };
    const mockAlertDispatcher = {
      dispatchPendingAlerts: vi.fn().mockResolvedValue({ delivered: 1, failed: 0, unconfigured: false }),
    };

    const processor = createReportGenerateProcessor({
      database: dummyDb,
      reportService: mockReportService as never,
      queueStore: mockQueueStore as never,
      workerId,
      alertDispatcher: mockAlertDispatcher,
    });

    const failureRes = await processor.processJobFailure({
      jobId: "job-3",
      reportVersionId: "ver-3",
      attemptCount: 3,
      errorCode: "JOB_PAYLOAD_INVALID",
      expectedStateVersion: 1,
    });

    expect(failureRes).toEqual({ ok: false, code: "JOB_RETRY_EXHAUSTED" });
    expect(mockReportService.recordTerminalFailure).toHaveBeenCalledWith({
      reportVersionId: "ver-3",
      jobId: "job-3",
      workerId,
      errorCode: "JOB_PAYLOAD_INVALID",
      failureStage: "generation",
      expectedStateVersion: 1,
    });
    expect(mockAlertDispatcher.dispatchPendingAlerts).toHaveBeenCalledWith("report_terminal_failure");
    expect(mockAlertDispatcher.dispatchPendingAlerts).toHaveBeenCalledTimes(1);
  });

  it("uses the persisted AI_TIMEOUT backoff schedule through attempt seven", async () => {
    const frozenNow = new Date("2026-09-15T00:00:00.000Z");
    const mockReportService = {
      recordTerminalFailure: vi.fn().mockResolvedValue({ ok: true }),
    };
    const mockQueueStore = {
      claimNext: vi.fn(),
      recordRetryableFailure: vi.fn().mockResolvedValue({ ok: true }),
      recordTerminalFailure: vi.fn(),
      markProcessed: vi.fn(),
    };
    const processor = createReportGenerateProcessor({
      database: dummyDb,
      reportService: mockReportService as never,
      queueStore: mockQueueStore as never,
      workerId,
      clock: {
        now: () => frozenNow,
        setInterval: vi.fn(),
        clearInterval: vi.fn(),
      },
    });

    const delays = [30_000, 60_000, 120_000, 300_000, 600_000, 1_200_000, 1_800_000];
    for (const [index, delay] of delays.entries()) {
      await expect(
        processor.processJobFailure({
          jobId: `timeout-job-${index + 1}`,
          reportVersionId: `timeout-version-${index + 1}`,
          attemptCount: index + 1,
          errorCode: "AI_TIMEOUT",
        }),
      ).resolves.toEqual({ ok: true });
      expect(mockQueueStore.recordRetryableFailure).toHaveBeenLastCalledWith(
        `timeout-job-${index + 1}`,
        "AI_TIMEOUT",
        new Date(frozenNow.getTime() + delay),
      );
    }

    expect(mockReportService.recordTerminalFailure).not.toHaveBeenCalled();
  });

  it("terminal-fails AI_TIMEOUT on attempt eight with the original code and one alert", async () => {
    const mockReportService = {
      recordTerminalFailure: vi.fn().mockResolvedValue({ ok: true }),
    };
    const mockQueueStore = {
      claimNext: vi.fn(),
      recordRetryableFailure: vi.fn(),
      recordTerminalFailure: vi.fn(),
      markProcessed: vi.fn(),
    };
    const mockAlertDispatcher = {
      dispatchPendingAlerts: vi.fn().mockResolvedValue({ delivered: 1, failed: 0, unconfigured: false }),
    };
    const processor = createReportGenerateProcessor({
      database: dummyDb,
      reportService: mockReportService as never,
      queueStore: mockQueueStore as never,
      workerId,
      alertDispatcher: mockAlertDispatcher,
    });

    await expect(
      processor.processJobFailure({
        jobId: "timeout-job-8",
        reportVersionId: "timeout-version-8",
        attemptCount: 8,
        errorCode: "AI_TIMEOUT",
      }),
    ).resolves.toEqual({ ok: false, code: "JOB_RETRY_EXHAUSTED" });

    expect(mockReportService.recordTerminalFailure).toHaveBeenCalledTimes(1);
    expect(mockReportService.recordTerminalFailure).toHaveBeenCalledWith({
      reportVersionId: "timeout-version-8",
      jobId: "timeout-job-8",
      workerId,
      errorCode: "AI_TIMEOUT",
      failureStage: "generation",
    });
    expect(mockAlertDispatcher.dispatchPendingAlerts).toHaveBeenCalledWith("report_terminal_failure");
    expect(mockAlertDispatcher.dispatchPendingAlerts).toHaveBeenCalledTimes(1);
    expect(mockQueueStore.recordRetryableFailure).not.toHaveBeenCalled();
  });

  it("does not dispatch if recordTerminalFailure returns conflict / lease lost", async () => {
    const mockReportService = {
      recordTerminalFailure: vi.fn().mockResolvedValue({ ok: false, code: "WORKFLOW_STATE_CONFLICT" }),
    };
    const mockQueueStore = {
      claimNext: vi.fn(),
      recordRetryableFailure: vi.fn(),
      recordTerminalFailure: vi.fn(),
      markProcessed: vi.fn(),
    };
    const mockAlertDispatcher = {
      dispatchPendingAlerts: vi.fn(),
    };

    const processor = createReportGenerateProcessor({
      database: dummyDb,
      reportService: mockReportService as never,
      queueStore: mockQueueStore as never,
      workerId,
      alertDispatcher: mockAlertDispatcher,
    });

    const failureRes = await processor.processJobFailure({
      jobId: "job-conflict",
      reportVersionId: "ver-conflict",
      attemptCount: 3,
      errorCode: "JOB_RETRY_EXHAUSTED",
    });

    expect(failureRes).toEqual({ ok: false, code: "WORKFLOW_STATE_CONFLICT" });
    expect(mockAlertDispatcher.dispatchPendingAlerts).not.toHaveBeenCalled();
  });

  it("does not dispatch on retryable failure when attemptCount < 3", async () => {
    const mockReportService = {
      recordTerminalFailure: vi.fn(),
    };
    const mockQueueStore = {
      claimNext: vi.fn(),
      recordRetryableFailure: vi.fn().mockResolvedValue({ ok: true }),
      recordTerminalFailure: vi.fn(),
      markProcessed: vi.fn(),
    };
    const mockAlertDispatcher = {
      dispatchPendingAlerts: vi.fn(),
    };

    const processor = createReportGenerateProcessor({
      database: dummyDb,
      reportService: mockReportService as never,
      queueStore: mockQueueStore as never,
      workerId,
      alertDispatcher: mockAlertDispatcher,
    });

    const failureRes = await processor.processJobFailure({
      jobId: "job-retry",
      reportVersionId: "ver-retry",
      attemptCount: 1,
      errorCode: "AI_TIMEOUT",
    });

    expect(failureRes).toEqual({ ok: true });
    expect(mockReportService.recordTerminalFailure).not.toHaveBeenCalled();
    expect(mockAlertDispatcher.dispatchPendingAlerts).not.toHaveBeenCalled();
  });

  it("absorbs immediate dispatch failure without altering terminal failure outcome", async () => {
    const mockReportService = {
      recordTerminalFailure: vi.fn().mockResolvedValue({ ok: true }),
    };
    const mockQueueStore = {
      claimNext: vi.fn(),
      recordRetryableFailure: vi.fn(),
      recordTerminalFailure: vi.fn(),
      markProcessed: vi.fn(),
    };
    const mockAlertDispatcher = {
      dispatchPendingAlerts: vi.fn().mockRejectedValue(new Error("Telegram network timeout")),
    };

    const processor = createReportGenerateProcessor({
      database: dummyDb,
      reportService: mockReportService as never,
      queueStore: mockQueueStore as never,
      workerId,
      alertDispatcher: mockAlertDispatcher,
    });

    const failureRes = await processor.processJobFailure({
      jobId: "job-throw",
      reportVersionId: "ver-throw",
      attemptCount: 3,
      errorCode: "JOB_RETRY_EXHAUSTED",
    });

    expect(failureRes).toEqual({ ok: false, code: "JOB_RETRY_EXHAUSTED" });
    expect(mockAlertDispatcher.dispatchPendingAlerts).toHaveBeenCalledWith("report_terminal_failure");
  });

  it("handles absent alertDispatcher gracefully", async () => {
    const mockReportService = {
      recordTerminalFailure: vi.fn().mockResolvedValue({ ok: true }),
    };
    const mockQueueStore = {
      claimNext: vi.fn(),
      recordRetryableFailure: vi.fn(),
      recordTerminalFailure: vi.fn(),
      markProcessed: vi.fn(),
    };

    const processor = createReportGenerateProcessor({
      database: dummyDb,
      reportService: mockReportService as never,
      queueStore: mockQueueStore as never,
      workerId,
    });

    const failureRes = await processor.processJobFailure({
      jobId: "job-no-dispatcher",
      reportVersionId: "ver-no-dispatcher",
      attemptCount: 3,
      errorCode: "JOB_RETRY_EXHAUSTED",
    });

    expect(failureRes).toEqual({ ok: false, code: "JOB_RETRY_EXHAUSTED" });
  });
  it("reconstructs schemaVersion 2 when job name is report.generate.v2 and processes successfully", async () => {
    const mockReportService = {
      startGenerating: vi.fn().mockResolvedValue({ ok: true }),
      recordTerminalFailure: vi.fn().mockResolvedValue({ ok: true }),
    };
    const mockQueueStore = {
      claimNext: vi.fn().mockResolvedValue({
        id: "job-v2-1",
        name: "report.generate.v2",
        sourceEventId: "evt-v2-1",
        traceId: "trace-v2-1",
        idempotencyKey: "report-generate:00000000-0000-0000-0000-000000000002",
        attemptCount: 1,
        payload: {
          reportId: "00000000-0000-0000-0000-000000000001",
          reportVersionId: "00000000-0000-0000-0000-000000000002",
          entitlementId: "00000000-0000-0000-0000-000000000003",
          chartVersionId: "chart-1",
          evidenceVersionId: "ev-1",
          knowledgeVersionId: "kn-4",
          promptVersion: "p-4",
          reportConfigVersion: "c-4",
          locale: "vi",
          sku: "ZIWEI-IDENTITY-P0",
          asOfDate: "2026-09-12",
          targetYear: 2026,
          timingRuleVersion: "ziwei.timing.v1",
          sensitivityRuleVersion: "ziwei.sensitivity.v1",
        },
      }),
      markProcessed: vi.fn().mockResolvedValue({ ok: true }),
      recordRetryableFailure: vi.fn(),
      recordTerminalFailure: vi.fn(),
    };

    const processor = createReportGenerateProcessor({
      database: dummyDb,
      reportService: mockReportService as never,
      queueStore: mockQueueStore as never,
      workerId,
    });

    const result = await processor.processNext();
    expect(result).toEqual({ processed: true });

    expect(mockReportService.startGenerating).toHaveBeenCalledWith({
      reportVersionId: "00000000-0000-0000-0000-000000000002",
      jobId: "job-v2-1",
      workerId,
    });
    expect(mockQueueStore.markProcessed).toHaveBeenCalledWith("job-v2-1");
  });

  it("fails job processing when report.generate.v2 job payload is invalid", async () => {
    const mockReportService = {
      recordTerminalFailure: vi.fn().mockResolvedValue({ ok: true }),
    };
    const mockQueueStore = {
      claimNext: vi.fn().mockResolvedValue({
        id: "job-v2-invalid",
        name: "report.generate.v2",
        sourceEventId: "evt-v2-inv",
        traceId: "trace-v2-inv",
        idempotencyKey: "idem-inv",
        attemptCount: 1,
        payload: {
          reportId: "00000000-0000-0000-0000-000000000001",
          // Missing required V2 fields like asOfDate, targetYear
        },
      }),
      recordRetryableFailure: vi.fn().mockResolvedValue({ ok: true }),
      recordTerminalFailure: vi.fn(),
      markProcessed: vi.fn(),
    };

    const processor = createReportGenerateProcessor({
      database: dummyDb,
      reportService: mockReportService as never,
      queueStore: mockQueueStore as never,
      workerId,
    });

    const result = await processor.processNext();
    expect(result).toEqual({ processed: false });
    expect(mockQueueStore.recordRetryableFailure).toHaveBeenCalledWith(
      "job-v2-invalid",
      "JOB_PAYLOAD_INVALID",
      expect.any(Date),
    );
  });

  function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((resolvePromise) => {
      resolve = resolvePromise;
    });
    return { promise, resolve };
  }

  function job(reportConfigVersion = "ziwei.comprehensive.report.v4.1-sectioned") {
    return {
      id: `job-${reportConfigVersion}`,
      name: "report.generate.v2",
      sourceEventId: `evt-${reportConfigVersion}`,
      traceId: `trace-${reportConfigVersion}`,
      idempotencyKey: "report-generate:00000000-0000-0000-0000-000000000002",
      attemptCount: 1,
      payload: {
        reportId: "00000000-0000-0000-0000-000000000001",
        reportVersionId: "00000000-0000-0000-0000-000000000002",
        entitlementId: "00000000-0000-0000-0000-000000000003",
        chartVersionId: "chart-1",
        evidenceVersionId: "ev-1",
        knowledgeVersionId: "ziwei.comprehensive.knowledge.v3",
        promptVersion: "ziwei.comprehensive.prompt.v4.0.1",
        reportConfigVersion,
        locale: "vi",
        sku: "ZIWEI-IDENTITY-P0",
        asOfDate: "2026-09-12",
        targetYear: 2026,
        timingRuleVersion: "ziwei.timing.v1",
        sensitivityRuleVersion: "ziwei.sensitivity.v1",
      },
    };
  }

  function clockAt(initial: Date) {
    let current = initial;
    let callback: (() => void) | undefined;
    return {
      clock: {
        now: () => current,
        setInterval: vi.fn((next: () => void, milliseconds: number) => {
          callback = next;
          return "heartbeat";
        }),
        clearInterval: vi.fn(),
      },
      advance(milliseconds: number) {
        current = new Date(current.getTime() + milliseconds);
      },
      tick() {
        callback?.();
      },
    };
  }

  function queueFor(currentJob = job()) {
    return {
      claimNext: vi.fn().mockResolvedValue(currentJob),
      renewLease: vi.fn().mockResolvedValue({ ok: true }),
      recordRetryableFailure: vi.fn().mockResolvedValue({ ok: true }),
      recordTerminalFailure: vi.fn().mockResolvedValue({ ok: true }),
      markProcessed: vi.fn().mockResolvedValue({ ok: true }),
    };
  }

  it("schedules a 120-second sectioned heartbeat, renews before expiry, and never overlaps callbacks", async () => {
    const frozenNow = new Date("2026-09-15T00:00:00.000Z");
    const timer = clockAt(frozenNow);
    const firstRenewal = deferred<{ ok: true }>();
    const secondRenewal = deferred<{ ok: true }>();
    const generation = deferred<{ ok: true; value: Record<string, never> }>();
    const queueStore = queueFor();
    queueStore.renewLease
      .mockImplementationOnce(() => firstRenewal.promise)
      .mockImplementationOnce(() => secondRenewal.promise);
    const processor = createReportGenerateProcessor({
      database: dummyDb,
      reportService: { startGenerating: vi.fn().mockResolvedValue({ ok: true }) } as never,
      queueStore: queueStore as never,
      workerId,
      clock: timer.clock,
      generationService: {
        replayExisting: vi.fn().mockResolvedValue({ ok: true, value: null }),
        generateReport: vi.fn().mockReturnValue(generation.promise),
      } as never,
    });

    const processing = processor.processNext();
    await vi.waitFor(() => expect(timer.clock.setInterval).toHaveBeenCalledWith(expect.any(Function), 120_000));
    timer.advance(120_000);
    timer.tick();
    timer.tick();
    expect(queueStore.renewLease).toHaveBeenCalledTimes(1);
    expect(queueStore.renewLease).toHaveBeenCalledWith(job().id, new Date(frozenNow.getTime() + 120_000));

    firstRenewal.resolve({ ok: true });
    await firstRenewal.promise;
    await Promise.resolve();
    await Promise.resolve();
    timer.advance(120_000);
    timer.tick();
    expect(queueStore.renewLease).toHaveBeenCalledTimes(2);
    secondRenewal.resolve({ ok: true });
    generation.resolve({ ok: true, value: {} });

    await expect(processing).resolves.toEqual({ processed: true });
    expect(timer.clock.clearInterval).toHaveBeenCalledWith("heartbeat");
  });

  it("does not create a heartbeat or execution guard for the legacy configuration", async () => {
    const timer = clockAt(new Date("2026-09-15T00:00:00.000Z"));
    const queueStore = queueFor(job("ziwei.comprehensive.report.v4"));
    const generateReport = vi.fn().mockResolvedValue({ ok: true, value: {} });
    const processor = createReportGenerateProcessor({
      database: dummyDb,
      reportService: { startGenerating: vi.fn().mockResolvedValue({ ok: true }) } as never,
      queueStore: queueStore as never,
      workerId,
      clock: timer.clock,
      generationService: {
        replayExisting: vi.fn().mockResolvedValue({ ok: true, value: null }),
        generateReport,
      } as never,
    });

    await expect(processor.processNext()).resolves.toEqual({ processed: true });
    expect(timer.clock.setInterval).not.toHaveBeenCalled();
    expect(queueStore.renewLease).not.toHaveBeenCalled();
    expect(generateReport.mock.calls[0]?.[0]).not.toHaveProperty("executionGuard");
  });

  it("stops stale-worker completion without recording terminal failure or an alert", async () => {
    const timer = clockAt(new Date("2026-09-15T00:00:00.000Z"));
    const generation = deferred<{ ok: false; error: { code: string; retryable: false } }>();
    const leaseLoss = deferred<{ ok: false; code: "LEASE_LOST" }>();
    const queueStore = queueFor();
    queueStore.renewLease.mockReturnValue(leaseLoss.promise);
    const reportService = {
      startGenerating: vi.fn().mockResolvedValue({ ok: true }),
      recordTerminalFailure: vi.fn().mockResolvedValue({ ok: true }),
    };
    const alertDispatcher = { dispatchPendingAlerts: vi.fn() };
    const processor = createReportGenerateProcessor({
      database: dummyDb,
      reportService: reportService as never,
      queueStore: queueStore as never,
      workerId,
      clock: timer.clock,
      alertDispatcher,
      generationService: {
        replayExisting: vi.fn().mockResolvedValue({ ok: true, value: null }),
        generateReport: vi.fn().mockReturnValue(generation.promise),
      } as never,
    });

    const processing = processor.processNext();
    await vi.waitFor(() => expect(timer.clock.setInterval).toHaveBeenCalledTimes(1));
    timer.advance(120_000);
    timer.tick();
    await vi.waitFor(() => expect(queueStore.renewLease).toHaveBeenCalledTimes(1));
    generation.resolve({ ok: false, error: { code: "AI_OUTPUT_INVALID", retryable: false } });
    await Promise.resolve();
    expect(timer.clock.clearInterval).toHaveBeenCalledWith("heartbeat");
    leaseLoss.resolve({ ok: false, code: "LEASE_LOST" });

    await expect(processing).resolves.toEqual({ processed: false });
    expect(reportService.recordTerminalFailure).not.toHaveBeenCalled();
    expect(alertDispatcher.dispatchPendingAlerts).not.toHaveBeenCalled();
    expect(timer.clock.clearInterval).toHaveBeenCalledWith("heartbeat");
  });

  it("exhausts the sectioned wall clock without another renewal and suppresses success", async () => {
    const frozenNow = new Date("2026-09-15T00:00:00.000Z");
    const timer = clockAt(frozenNow);
    const generation = deferred<{ ok: true; value: Record<string, never> }>();
    const queueStore = queueFor();
    let guardState: string | undefined;
    const processor = createReportGenerateProcessor({
      database: dummyDb,
      reportService: { startGenerating: vi.fn().mockResolvedValue({ ok: true }) } as never,
      queueStore: queueStore as never,
      workerId,
      clock: timer.clock,
      generationService: {
        replayExisting: vi.fn().mockResolvedValue({ ok: true, value: null }),
        generateReport: vi.fn((input) => {
          guardState = input.executionGuard.state();
          return generation.promise;
        }),
      } as never,
    });

    const processing = processor.processNext();
    await vi.waitFor(() => expect(timer.clock.setInterval).toHaveBeenCalledTimes(1));
    timer.advance(60 * 60 * 1_000);
    timer.tick();
    expect(queueStore.renewLease).not.toHaveBeenCalled();
    generation.resolve({ ok: true, value: {} });

    await expect(processing).resolves.toEqual({ processed: false });
    expect(guardState).toBe("active");
    expect(timer.clock.clearInterval).toHaveBeenCalledWith("heartbeat");
  });

  it("clears sectioned heartbeats and settles an in-flight renewal on success and generation failure", async () => {
    for (const generationResult of [
      { ok: true, value: {} },
      { ok: false, error: { code: "AI_TIMEOUT", retryable: true } },
    ] as const) {
      const timer = clockAt(new Date("2026-09-15T00:00:00.000Z"));
      const renewal = deferred<{ ok: true }>();
      const queueStore = queueFor();
      queueStore.renewLease.mockReturnValue(renewal.promise);
      const generation = deferred<typeof generationResult>();
      const processor = createReportGenerateProcessor({
        database: dummyDb,
        reportService: { startGenerating: vi.fn().mockResolvedValue({ ok: true }) } as never,
        queueStore: queueStore as never,
        workerId,
        clock: timer.clock,
        generationService: {
          replayExisting: vi.fn().mockResolvedValue({ ok: true, value: null }),
          generateReport: vi.fn().mockReturnValue(generation.promise),
        } as never,
      });

      const processing = processor.processNext();
      await vi.waitFor(() => expect(timer.clock.setInterval).toHaveBeenCalledTimes(1));
      timer.tick();
      generation.resolve(generationResult);
      await Promise.resolve();
      expect(timer.clock.clearInterval).toHaveBeenCalledWith("heartbeat");
      renewal.resolve({ ok: true });
      await processing;
    }
  });

  it("cleans up the timer for replay and a thrown generation", async () => {
    const replayTimer = clockAt(new Date("2026-09-15T00:00:00.000Z"));
    const replayProcessor = createReportGenerateProcessor({
      database: dummyDb,
      reportService: { startGenerating: vi.fn() } as never,
      queueStore: queueFor() as never,
      workerId,
      clock: replayTimer.clock,
      generationService: {
        replayExisting: vi.fn().mockResolvedValue({ ok: true, value: {} }),
        generateReport: vi.fn(),
      } as never,
    });
    await expect(replayProcessor.processNext()).resolves.toEqual({ processed: true });
    expect(replayTimer.clock.setInterval).not.toHaveBeenCalled();

    const throwTimer = clockAt(new Date("2026-09-15T00:00:00.000Z"));
    const throwProcessor = createReportGenerateProcessor({
      database: dummyDb,
      reportService: { startGenerating: vi.fn().mockResolvedValue({ ok: true }) } as never,
      queueStore: queueFor() as never,
      workerId,
      clock: throwTimer.clock,
      generationService: {
        replayExisting: vi.fn().mockResolvedValue({ ok: true, value: null }),
        generateReport: vi.fn(() => {
          throw new Error("generation exploded");
        }),
      } as never,
    });
    await expect(throwProcessor.processNext()).rejects.toThrow("generation exploded");
    expect(throwTimer.clock.clearInterval).toHaveBeenCalledWith("heartbeat");
  });
});
