import {
  ReportPdfRenderJobV1Schema,
  type ReportAssetFailureCode,
} from "@lasoviet/contracts";
import type { PdfWorkItem } from "@lasoviet/backend";

const PDF_NAMES = ["report.pdf.render.v1"] as const;
const PDF_RETRY_DELAYS_MS = [30_000, 60_000] as const;
const PDF_MAX_ATTEMPTS = 3;

export type PdfRenderQueueStore = {
  claimNext(
    now?: Date,
    allowedNames?: readonly typeof PDF_NAMES[number][],
  ): Promise<{
    id: string;
    name: string;
    sourceEventId: string;
    traceId: string;
    idempotencyKey: string;
    attemptCount: number;
    payload: Record<string, unknown>;
  } | null>;
  recordRetryableFailure(
    id: string,
    code: string,
    nextAttemptAt: Date,
  ): Promise<{ ok: true } | { ok: false; code: "LEASE_LOST" }>;
  markProcessed(
    id: string,
  ): Promise<{ ok: true } | { ok: false; code: "LEASE_LOST" }>;
  recordTerminalFailure(
    id: string,
    code: string,
  ): Promise<{ ok: true } | { ok: false; code: "LEASE_LOST" }>;
};

export type PdfRenderProcessorDependencies = {
  queueStore: PdfRenderQueueStore;
  workerId: string;
  render(input: { html: string; renderVersion: string }): Promise<
    | { ok: true; bytes: Uint8Array }
    | { ok: false; code: "PDF_RENDER_FAILED" | "PDF_TEMP_CLEANUP_FAILED" | "PDF_FONT_MISSING" | "PDF_RENDER_VERSION_UNSUPPORTED" }
  >;
  assetRepository: {
    claimPdfWork(
      jobId: string,
      workerId: string,
      assetId: string,
    ): Promise<
      | { ok: true; item: PdfWorkItem }
      | { ok: false; code: string }
    >;
    markRendered(input: Pick<PdfWorkItem, "assetId" | "leaseToken" | "assetStateVersion">): Promise<
      | { ok: true; stateVersion: number }
      | { ok: false; code: "LEASE_LOST" }
    >;
    markStoring(input: Pick<PdfWorkItem, "assetId" | "leaseToken" | "assetStateVersion">): Promise<
      | { ok: true; stateVersion: number }
      | { ok: false; code: "LEASE_LOST" }
    >;
    finalizeStored(input: {
      item: PdfWorkItem;
      jobId: string;
      workerId: string;
      objectKey: string;
      sha256: string;
      byteLength: number;
      garageEtag?: string;
      garageVersionId?: string;
    }): Promise<{ ok: boolean }>;
    releaseRetryableFailure(input: {
      item: PdfWorkItem;
      jobId: string;
      workerId: string;
      errorCode: Extract<ReportAssetFailureCode, "PDF_RENDER_FAILED" | "PDF_TEMP_CLEANUP_FAILED" | "GARAGE_UNAVAILABLE">;
      nextAttemptAt: Date;
    }): Promise<{ ok: boolean }>;
    finalizePdfTerminalFailure(input: {
      item: PdfWorkItem;
      jobId: string;
      workerId: string;
      errorCode: ReportAssetFailureCode;
      failureStage: "pdf" | "garage";
    }): Promise<{ ok: boolean }>;
  };
  store(input: { candidateObjectKey: string; objectKey: string; bytes: Uint8Array }): Promise<
    | { ok: true; objectKey: string; sha256: string; byteLength: number; etag?: string; versionId?: string }
    | { ok: false; code: "GARAGE_UNAVAILABLE" | "ASSET_CHECKSUM_MISMATCH" | "ASSET_KEY_CONFLICT" }
  >;
  now?: () => Date;
};

export function createPdfRenderProcessor(dependencies: PdfRenderProcessorDependencies) {
  const now = dependencies.now ?? (() => new Date());

  async function fenceInvalidJob(job: { id: string; attemptCount: number }): Promise<void> {
    if (job.attemptCount >= PDF_MAX_ATTEMPTS) {
      await dependencies.queueStore.recordTerminalFailure(job.id, "JOB_PAYLOAD_INVALID");
      return;
    }
    const delay = PDF_RETRY_DELAYS_MS[job.attemptCount - 1] ?? PDF_RETRY_DELAYS_MS.at(-1)!;
    await dependencies.queueStore.recordRetryableFailure(
      job.id,
      "JOB_PAYLOAD_INVALID",
      new Date(now().getTime() + delay),
    );
  }

  async function settleAssetFailure(input: {
    item: PdfWorkItem;
    jobId: string;
    attemptCount: number;
    code: ReportAssetFailureCode;
    stage: "pdf" | "garage";
  }): Promise<boolean> {
    const terminal = input.code === "PDF_FONT_MISSING" ||
      input.code === "PDF_RENDER_VERSION_UNSUPPORTED" ||
      input.code === "ASSET_CHECKSUM_MISMATCH" ||
      input.code === "ASSET_KEY_CONFLICT" ||
      input.attemptCount >= PDF_MAX_ATTEMPTS;
    if (terminal) {
      return (await dependencies.assetRepository.finalizePdfTerminalFailure({
        item: input.item,
        jobId: input.jobId,
        workerId: dependencies.workerId,
        errorCode: input.code,
        failureStage: input.stage,
      })).ok;
    }
    const delay = PDF_RETRY_DELAYS_MS[input.attemptCount - 1] ?? PDF_RETRY_DELAYS_MS.at(-1)!;
    return (await dependencies.assetRepository.releaseRetryableFailure({
      item: input.item,
      jobId: input.jobId,
      workerId: dependencies.workerId,
      errorCode: input.code as Extract<
        ReportAssetFailureCode,
        "PDF_RENDER_FAILED" | "PDF_TEMP_CLEANUP_FAILED" | "GARAGE_UNAVAILABLE"
      >,
      nextAttemptAt: new Date(now().getTime() + delay),
    })).ok;
  }

  return {
    async processNext(): Promise<{ processed: boolean }> {
      const job = await dependencies.queueStore.claimNext(undefined, PDF_NAMES);
      if (!job) return { processed: false };
      const parsed = ReportPdfRenderJobV1Schema.safeParse({
        schemaVersion: 1,
        name: job.name,
        sourceEventId: job.sourceEventId,
        traceId: job.traceId,
        idempotencyKey: job.idempotencyKey,
        payload: job.payload,
      });
      if (!parsed.success) {
        await fenceInvalidJob(job);
        return { processed: false };
      }

      const claim = await dependencies.assetRepository.claimPdfWork(
        job.id,
        dependencies.workerId,
        parsed.data.payload.assetId,
      );
      if (!claim.ok) {
        if (claim.code !== "REPLAY_SETTLED") {
          await fenceInvalidJob(job);
        }
        return { processed: false };
      }

      let item = claim.item;
      if (item.renderVersion !== parsed.data.payload.renderVersion) {
        await dependencies.assetRepository.finalizePdfTerminalFailure({
          item,
          jobId: job.id,
          workerId: dependencies.workerId,
          errorCode: "PDF_RENDER_VERSION_UNSUPPORTED",
          failureStage: "pdf",
        });
        return { processed: false };
      }
      const rendered = await dependencies.render({
        html: item.immutableHtml,
        renderVersion: item.renderVersion,
      });
      if (!rendered.ok) {
        await settleAssetFailure({
          item, jobId: job.id, attemptCount: job.attemptCount,
          code: rendered.code, stage: "pdf",
        });
        return { processed: false };
      }

      const renderedState = await dependencies.assetRepository.markRendered(item);
      if (!renderedState.ok) return { processed: false };
      item = { ...item, assetStateVersion: renderedState.stateVersion };
      const storingState = await dependencies.assetRepository.markStoring(item);
      if (!storingState.ok) return { processed: false };
      item = { ...item, assetStateVersion: storingState.stateVersion };

      const stored = await dependencies.store({
        candidateObjectKey: item.candidateObjectKey,
        objectKey: item.objectKey,
        bytes: rendered.bytes,
      });
      if (!stored.ok) {
        await settleAssetFailure({
          item, jobId: job.id, attemptCount: job.attemptCount,
          code: stored.code, stage: "garage",
        });
        return { processed: false };
      }

      return {
        processed: (await dependencies.assetRepository.finalizeStored({
          item,
          jobId: job.id,
          workerId: dependencies.workerId,
          objectKey: stored.objectKey,
          sha256: stored.sha256,
          byteLength: stored.byteLength,
          garageEtag: stored.etag,
          garageVersionId: stored.versionId,
        })).ok,
      };
    },
  };
}
