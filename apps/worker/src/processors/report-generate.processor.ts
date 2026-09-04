import type { Database } from "@lasoviet/database";
import {
  parseReportGenerateJob,
  type createReportService,
  type ReportJobQueueStore,
} from "@lasoviet/backend";

export function createReportGenerateProcessor(dependencies: {
  database: Database;
  reportService: ReturnType<typeof createReportService>;
  queueStore: ReportJobQueueStore;
  workerId: string;
}) {
  return {
    async processJobFailure(params: {
      jobId: string;
      reportVersionId: string | undefined;
      attemptCount: number;
      errorCode: string;
      expectedStateVersion?: number;
    }): Promise<{ ok: true } | { ok: false; code: string }> {
      if (params.attemptCount >= 3) {
        if (params.reportVersionId) {
          const terminalResult = await dependencies.reportService.recordTerminalFailure({
            reportVersionId: params.reportVersionId,
            jobId: params.jobId,
            workerId: dependencies.workerId,
            errorCode: "JOB_RETRY_EXHAUSTED",
            failureStage: "generation",
            expectedStateVersion: params.expectedStateVersion,
          });
          if (!terminalResult.ok) return terminalResult;
          return { ok: false, code: "JOB_RETRY_EXHAUSTED" };
        }

        const fenceResult = await dependencies.queueStore.recordTerminalFailure(
          params.jobId,
          "JOB_RETRY_EXHAUSTED",
        );
        if (!fenceResult.ok) return fenceResult;
        return { ok: false, code: "JOB_RETRY_EXHAUSTED" };
      }

      const nextAttemptAt = new Date(Date.now() + 30_000);
      const retryResult = await dependencies.queueStore.recordRetryableFailure(
        params.jobId,
        params.errorCode,
        nextAttemptAt,
      );
      if (!retryResult.ok) return retryResult;
      return { ok: true };
    },

    async processNext(): Promise<{ processed: boolean }> {
      const job = await dependencies.queueStore.claimNext();
      if (!job) return { processed: false };

      const parsed = parseReportGenerateJob({
        schemaVersion: 1,
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
    },
  };
}
