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

  it("requests immediate dispatch on processJobFailure when attemptCount >= 3", async () => {
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
      errorCode: "JOB_RETRY_EXHAUSTED",
      failureStage: "generation",
      expectedStateVersion: 1,
    });
    expect(mockAlertDispatcher.dispatchPendingAlerts).toHaveBeenCalledWith("report_terminal_failure");
    expect(mockAlertDispatcher.dispatchPendingAlerts).toHaveBeenCalledTimes(1);
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
});
