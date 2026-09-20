import type { Database } from "@lasoviet/database";
import {
  parseReportGenerateJob,
  resolveReportRuntimePolicy,
  type createReportService,
  type ReportGenerationService,
  type ReportJobQueueStore,
} from "@lasoviet/backend";

const LEASE_HEARTBEAT_INTERVAL_MS = 120_000;
const AI_TIMEOUT_RETRY_DELAYS_MS = [30_000, 60_000, 120_000, 300_000, 600_000, 1_200_000, 1_800_000];

export type ReportProcessorClock = {
  now(): Date;
  setInterval(callback: () => void, milliseconds: number): unknown;
  clearInterval(handle: unknown): void;
};

type ReportGenerationExecutionGuard = {
  state(): "active" | "lease_lost" | "wall_clock_exhausted";
};

type LeaseRenewingQueueStore = ReportJobQueueStore & {
  renewLease(id: string, now?: Date): Promise<{ ok: true } | { ok: false; code: "LEASE_LOST" }>;
};

const systemClock: ReportProcessorClock = {
  now: () => new Date(),
  setInterval: (callback, milliseconds) => setInterval(callback, milliseconds),
  clearInterval: (handle) => clearInterval(handle as ReturnType<typeof setInterval>),
};

export function createReportGenerateProcessor(dependencies: {
  database: Database;
  reportService: ReturnType<typeof createReportService>;
  queueStore: ReportJobQueueStore;
  workerId: string;
  generationService?: ReportGenerationService;
  alertDispatcher?: {
    dispatchPendingAlerts(
      filterKind?: "stale_payment" | "circuit_open" | "report_terminal_failure",
    ): Promise<unknown>;
  };
  dispatchPendingAlerts?: (
    filterKind?: "stale_payment" | "circuit_open" | "report_terminal_failure",
  ) => Promise<unknown>;
  clock?: ReportProcessorClock;
}) {
  const clock = dependencies.clock ?? systemClock;
  const queueStore = dependencies.queueStore as LeaseRenewingQueueStore;
  async function triggerImmediateAlertDispatch(): Promise<void> {
    try {
      if (dependencies.alertDispatcher?.dispatchPendingAlerts) {
        await dependencies.alertDispatcher.dispatchPendingAlerts("report_terminal_failure");
      } else if (dependencies.dispatchPendingAlerts) {
        await dependencies.dispatchPendingAlerts("report_terminal_failure");
      }
    } catch {
      // Immediate dispatch failure or unconfigured Telegram must not undo
      // or misreport the already committed report terminal state.
    }
  }
  return {
    async processJobFailure(params: {
      jobId: string;
      reportVersionId: string | undefined;
      attemptCount: number;
      errorCode: string;
      expectedStateVersion?: number;
    }): Promise<{ ok: true } | { ok: false; code: string }> {
      const isAiTimeout = params.errorCode === "AI_TIMEOUT";
      const maxAttempts = isAiTimeout ? 8 : 3;
      if (params.attemptCount >= maxAttempts) {
        if (params.reportVersionId) {
          const terminalResult = await dependencies.reportService.recordTerminalFailure({
            reportVersionId: params.reportVersionId,
            jobId: params.jobId,
            workerId: dependencies.workerId,
            errorCode: params.errorCode,
            failureStage: "generation",
            expectedStateVersion: params.expectedStateVersion,
          });
          if (!terminalResult.ok) return terminalResult;
          await triggerImmediateAlertDispatch();
          return { ok: false, code: "JOB_RETRY_EXHAUSTED" };
        }

        const fenceResult = await dependencies.queueStore.recordTerminalFailure(params.jobId, params.errorCode);
        if (!fenceResult.ok) return fenceResult;
        return { ok: false, code: "JOB_RETRY_EXHAUSTED" };
      }

      const retryDelayMs = isAiTimeout
        ? AI_TIMEOUT_RETRY_DELAYS_MS[params.attemptCount - 1] ?? AI_TIMEOUT_RETRY_DELAYS_MS.at(-1)!
        : 30_000;
      const nextAttemptAt = new Date(clock.now().getTime() + retryDelayMs);
      const retryResult = await dependencies.queueStore.recordRetryableFailure(
        params.jobId,
        params.errorCode,
        nextAttemptAt,
      );
      if (!retryResult.ok) return retryResult;
      return { ok: true };
    },

    async processNext(): Promise<{ processed: boolean }> {
      const job = await dependencies.queueStore.claimNext(undefined, [
        "report.generate.v1",
        "report.generate.v2",
      ]);
      if (!job) return { processed: false };

      const parsed = parseReportGenerateJob({
        schemaVersion: job.name === "report.generate.v2" ? 2 : 1,
        name: job.name,
        sourceEventId: job.sourceEventId,
        traceId: job.traceId,
        idempotencyKey: job.idempotencyKey,
        payload: job.payload,
      });

      if (!parsed.ok) {
        const failureResult = await this.processJobFailure({
          jobId: job.id,
          reportVersionId: undefined,
          attemptCount: job.attemptCount,
          errorCode: "JOB_PAYLOAD_INVALID",
        });
        if (!failureResult.ok) return { processed: false };
        return { processed: false };
      }

      const reportVersionId = parsed.value.payload.reportVersionId;

      if (!dependencies.generationService) {
        const startResult = await dependencies.reportService.startGenerating({
          reportVersionId,
          jobId: job.id,
          workerId: dependencies.workerId,
        });

        if (!startResult.ok) {
          const failureResult = await this.processJobFailure({
            jobId: job.id,
            reportVersionId,
            attemptCount: job.attemptCount,
            errorCode: startResult.code,
          });
          if (!failureResult.ok) return { processed: false };
          return { processed: false };
        }

        const markResult = await dependencies.queueStore.markProcessed(job.id);
        if (!markResult.ok) return { processed: false };
        return { processed: true };
      }

      const replayResult = await dependencies.generationService.replayExisting({
        job: parsed.value,
        jobId: job.id,
        attemptNumber: job.attemptCount,
        workerId: dependencies.workerId,
      });

      if (!replayResult.ok) {
        return { processed: false };
      }

      if (replayResult.value !== null) {
        return { processed: true };
      }

      const startResult = await dependencies.reportService.startGenerating({
        reportVersionId,
        jobId: job.id,
        workerId: dependencies.workerId,
      });

      if (!startResult.ok) {
        const failureResult = await this.processJobFailure({
          jobId: job.id,
          reportVersionId,
          attemptCount: job.attemptCount,
          errorCode: startResult.code,
        });
        if (!failureResult.ok) return { processed: false };
        return { processed: false };
      }

      let sectionedPolicy: { maximumWallClockMs: number } | null = null;
      try {
        sectionedPolicy = resolveReportRuntimePolicy(parsed.value.payload.reportConfigVersion);
      } catch {
        sectionedPolicy = null;
      }
      const isSectioned = sectionedPolicy !== null;
      let heartbeat: unknown;
      let renewal: Promise<void> | undefined;
      let renewalInFlight = false;
      let executionState: "active" | "lease_lost" | "wall_clock_exhausted" = "active";
      const deadline = new Date(clock.now().getTime() + (sectionedPolicy?.maximumWallClockMs ?? 0));
      const guard: ReportGenerationExecutionGuard = {
        state() {
          if (executionState === "active" && clock.now().getTime() >= deadline.getTime()) {
            executionState = "wall_clock_exhausted";
          }
          return executionState;
        },
      };

      const renew = () => {
        if (renewalInFlight || guard.state() !== "active") return;
        renewalInFlight = true;
        renewal = queueStore.renewLease(job.id, clock.now())
          .then((result) => {
            if (!result.ok) executionState = "lease_lost";
          })
          .catch(() => {
            executionState = "lease_lost";
          })
          .finally(() => {
            renewalInFlight = false;
          });
      };

      if (isSectioned) heartbeat = clock.setInterval(renew, LEASE_HEARTBEAT_INTERVAL_MS);
      let genResult;
      try {
        genResult = await dependencies.generationService.generateReport({
          job: parsed.value,
          jobId: job.id,
          attemptNumber: job.attemptCount,
          workerId: dependencies.workerId,
          ...(isSectioned ? { executionGuard: guard } : {}),
        });
      } finally {
        if (heartbeat !== undefined) clock.clearInterval(heartbeat);
        if (renewal) await renewal;
      }

      if (isSectioned && guard.state() !== "active") {
        return { processed: false };
      }

      if (genResult.ok) {
        return { processed: true };
      }

      if (genResult.error.code === "REPORT_VERSION_CONFLICT") {
        return { processed: false };
      }

      if (genResult.error.retryable) {
        await this.processJobFailure({
          jobId: job.id,
          reportVersionId,
          attemptCount: job.attemptCount,
          errorCode: genResult.error.code,
        });
        return { processed: false };
      }

      const termResult = await dependencies.reportService.recordTerminalFailure({
        reportVersionId,
        jobId: job.id,
        workerId: dependencies.workerId,
        errorCode: genResult.error.code,
        failureStage: "generation",
      });
      if (termResult.ok) {
        await triggerImmediateAlertDispatch();
      }
      return { processed: false };
    },
  };
}
