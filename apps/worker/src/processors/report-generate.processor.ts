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
      reportVersionId: string;
      attemptCount: number;
      errorCode: string;
    }): Promise<{ ok: true } | { ok: false; code: string }> {
      if (params.attemptCount >= 3) {
        await dependencies.reportService.recordTerminalFailure({
          reportVersionId: params.reportVersionId,
          jobId: params.jobId,
          errorCode: "JOB_RETRY_EXHAUSTED",
          failureStage: "generation",
        });
        return { ok: false, code: "JOB_RETRY_EXHAUSTED" };
      }

      const nextAttemptAt = new Date(Date.now() + 30_000);
      await dependencies.queueStore.recordRetryableFailure(
        params.jobId,
        params.errorCode,
        nextAttemptAt,
      );
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
        await dependencies.queueStore.recordRetryableFailure(
          job.id,
          "JOB_PAYLOAD_INVALID",
          new Date(Date.now() + 60_000),
        );
        return { processed: false };
      }

      const reportVersionId = parsed.value.payload.reportVersionId;
      const startResult = await dependencies.reportService.startGenerating({
        reportVersionId,
        jobId: job.id,
      });

      if (!startResult.ok) {
        return this.processJobFailure({
          jobId: job.id,
          reportVersionId,
          attemptCount: job.attemptCount,
          errorCode: startResult.code,
        }).then(() => ({ processed: false }));
      }

      await dependencies.queueStore.markProcessed(job.id);
      return { processed: true };
    },
  };
}
