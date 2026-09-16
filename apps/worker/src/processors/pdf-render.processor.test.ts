import { describe, expect, it, vi } from "vitest";

import { createPdfRenderProcessor } from "./pdf-render.processor.js";

const item = {
  assetId: "asset-1",
  reportId: "report-1",
  reportVersionId: "version-1",
  immutableHtml: "<p>immutable</p>",
  renderVersion: "identity-report-pdf.v1" as const,
  candidateObjectKey: "reports/asset-1.pdf",
  objectKey: "reports/asset-1/lease-1.pdf",
  assetStateVersion: 2,
  reportStateVersion: 4,
  leaseToken: "lease-1",
  ownerId: "owner-1",
  ownerEmail: "owner@example.test",
  locale: "vi" as const,
};

function job(overrides: Partial<{ attemptCount: number; payload: Record<string, unknown> }> = {}) {
  return {
    id: "job-1",
    name: "report.pdf.render.v1",
    sourceEventId: "event-1",
    traceId: "trace-1",
    idempotencyKey: "pdf:asset-1",
    attemptCount: 1,
    payload: {
      reportId: item.reportId,
      reportVersionId: item.reportVersionId,
      assetId: item.assetId,
      renderVersion: item.renderVersion,
    },
    ...overrides,
  };
}

function dependencies(next = job()) {
  const queueStore = {
    claimNext: vi.fn().mockResolvedValue(next),
    recordRetryableFailure: vi.fn().mockResolvedValue({ ok: true }),
    markProcessed: vi.fn().mockResolvedValue({ ok: true }),
    recordTerminalFailure: vi.fn().mockResolvedValue({ ok: true }),
  };
  const assetRepository = {
    claimPdfWork: vi.fn().mockResolvedValue({ ok: true, item }),
    markRendered: vi.fn().mockResolvedValue({ ok: true, stateVersion: 3 }),
    markStoring: vi.fn().mockResolvedValue({ ok: true, stateVersion: 4 }),
    finalizeStored: vi.fn().mockResolvedValue({ ok: true }),
    releaseRetryableFailure: vi.fn().mockResolvedValue({ ok: true }),
    finalizePdfTerminalFailure: vi.fn().mockResolvedValue({ ok: true }),
  };
  return {
    queueStore,
    assetRepository,
    dependencies: {
      queueStore,
      workerId: "pdf-worker",
      assetRepository,
      render: vi.fn().mockResolvedValue({ ok: true, bytes: new Uint8Array([1, 2, 3]) }),
      store: vi.fn().mockResolvedValue({
        ok: true,
        objectKey: item.objectKey,
        sha256: "a".repeat(64),
        byteLength: 3,
        etag: "etag-1",
        versionId: "version-1",
      }),
      now: () => new Date("2026-09-16T12:00:00.000Z"),
    },
  };
}

describe("createPdfRenderProcessor", () => {
  it("claims only PDF jobs and finalizes the exact immutable asset lineage", async () => {
    const setup = dependencies();
    const processor = createPdfRenderProcessor(setup.dependencies);

    await expect(processor.processNext()).resolves.toEqual({ processed: true });
    expect(setup.queueStore.claimNext).toHaveBeenCalledWith(undefined, ["report.pdf.render.v1"]);
    expect(setup.assetRepository.claimPdfWork).toHaveBeenCalledWith("job-1", "pdf-worker", "asset-1");
    expect(setup.assetRepository.markRendered).toHaveBeenCalledWith(expect.objectContaining({
      assetStateVersion: 2,
    }));
    expect(setup.assetRepository.markStoring).toHaveBeenCalledWith(expect.objectContaining({
      assetStateVersion: 3,
    }));
    expect(setup.assetRepository.finalizeStored).toHaveBeenCalledWith(expect.objectContaining({
      item: expect.objectContaining({ assetStateVersion: 4 }),
      objectKey: item.objectKey,
      sha256: "a".repeat(64),
      byteLength: 3,
      garageEtag: "etag-1",
      garageVersionId: "version-1",
    }));
    expect(setup.dependencies.store).toHaveBeenCalledWith({
      candidateObjectKey: item.candidateObjectKey,
      objectKey: item.objectKey,
      bytes: new Uint8Array([1, 2, 3]),
    });
  });

  it("releases retryable render failure with bounded delay while preserving pdf_pending", async () => {
    const setup = dependencies();
    setup.dependencies.render = vi.fn().mockResolvedValue({ ok: false, code: "PDF_RENDER_FAILED" });
    const processor = createPdfRenderProcessor(setup.dependencies);

    await expect(processor.processNext()).resolves.toEqual({ processed: false });
    expect(setup.assetRepository.releaseRetryableFailure).toHaveBeenCalledWith(expect.objectContaining({
      errorCode: "PDF_RENDER_FAILED",
      nextAttemptAt: new Date("2026-09-16T12:00:30.000Z"),
    }));
    expect(setup.assetRepository.finalizePdfTerminalFailure).not.toHaveBeenCalled();
  });

  it("terminalizes immediate checksum conflict and leaves repository-settled replays untouched", async () => {
    const setup = dependencies();
    setup.dependencies.store = vi.fn().mockResolvedValue({ ok: false, code: "ASSET_KEY_CONFLICT" });
    const processor = createPdfRenderProcessor(setup.dependencies);

    await expect(processor.processNext()).resolves.toEqual({ processed: false });
    expect(setup.assetRepository.finalizePdfTerminalFailure).toHaveBeenCalledWith(expect.objectContaining({
      errorCode: "ASSET_KEY_CONFLICT",
      failureStage: "garage",
    }));

    const replay = dependencies();
    replay.assetRepository.claimPdfWork.mockResolvedValue({ ok: false, code: "REPLAY_SETTLED" });
    await expect(createPdfRenderProcessor(replay.dependencies).processNext()).resolves.toEqual({ processed: false });
    expect(replay.queueStore.markProcessed).not.toHaveBeenCalled();
    expect(replay.queueStore.recordTerminalFailure).not.toHaveBeenCalled();
    expect(replay.queueStore.recordRetryableFailure).not.toHaveBeenCalled();
    expect(replay.dependencies.render).not.toHaveBeenCalled();
    expect(replay.dependencies.store).not.toHaveBeenCalled();
  });

  it("fences an invalid payload rather than leaving the lease active", async () => {
    const setup = dependencies(job({ payload: {} }));
    const processor = createPdfRenderProcessor(setup.dependencies);

    await expect(processor.processNext()).resolves.toEqual({ processed: false });
    expect(setup.queueStore.recordRetryableFailure).toHaveBeenCalledWith(
      "job-1",
      "JOB_PAYLOAD_INVALID",
      new Date("2026-09-16T12:00:30.000Z"),
    );
  });
});
