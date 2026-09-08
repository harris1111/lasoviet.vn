import { describe, expect, it, vi } from "vitest";
import { createDatabaseReportVersionRepository } from "./report-version.repository.js";

describe("createDatabaseReportVersionRepository - consumeRewriteBudget", () => {
  it("returns consumed: true when reservation exists and rewriteConsumedAt is null", async () => {
    const mockDb = {
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: "res-1", rewriteConsumedAt: new Date() }]),
          }),
        }),
      }),
      select: vi.fn(),
    };

    const repo = createDatabaseReportVersionRepository(mockDb as never);
    const result = await repo.consumeRewriteBudget("version-1");

    expect(result).toEqual({ ok: true, value: { consumed: true } });
  });

  it("returns consumed: false when reservation exists but rewriteConsumedAt is already set", async () => {
    const mockDb = {
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]), // No rows updated because rewriteConsumedAt was not null
          }),
        }),
      }),
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: "res-1", rewriteConsumedAt: new Date() }]),
          }),
        }),
      }),
    };

    const repo = createDatabaseReportVersionRepository(mockDb as never);
    const result = await repo.consumeRewriteBudget("version-1");

    expect(result).toEqual({ ok: true, value: { consumed: false } });
  });

  it("returns REPORT_VERSION_CONFLICT when reservation does not exist", async () => {
    const mockDb = {
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]), // Not found
          }),
        }),
      }),
    };

    const repo = createDatabaseReportVersionRepository(mockDb as never);
    const result = await repo.consumeRewriteBudget("version-missing");

    expect(result).toEqual({
      ok: false,
      error: {
        code: "REPORT_VERSION_CONFLICT",
        messageKey: "reports.report_version_conflict",
        retryable: false,
      },
    });
  });
});

describe("createDatabaseReportVersionRepository - commitImmutableVersion lineage guards", () => {
  it("rejects commit when BETTER_AUTH_URL is loopback", async () => {
    const mockTx = {
      select: vi.fn().mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
          innerJoin: vi.fn().mockReturnThis(),
        }),
      })),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: "res-1", stateVersion: 1 }]),
          }),
        }),
      }),
      insert: vi.fn(),
    };

    const mockDb = {
      transaction: vi.fn().mockImplementation(async (callback) => {
        return callback(mockTx);
      }),
    };

    const repo = createDatabaseReportVersionRepository(mockDb as never, {
      betterAuthUrl: "http://127.0.0.1:3000",
      recipientFingerprintSecret: "secret",
    });

    const result = await repo.commitImmutableVersion({
      reportId: "rep-1",
      reportVersionId: "ver-1",
      entitlementId: "ent-1",
      chartVersionId: "chart-1",
      evidenceVersionId: "ev-1",
      knowledgeVersionId: "kn-1",
      promptVersion: "prompt-1",
      reportConfigVersion: "cfg-1",
      templateVersion: "tpl-1",
      renderVersion: "identity-report-pdf.v1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      providerId: "prov-1",
      modelId: "mod-1",
      structuredContent: {} as never,
      htmlContent: "<html></html>",
      jobId: "job-1",
      workerId: "worker-1",
      attemptNumber: 1,
      traceId: "trace-1",
    });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "REPORT_VERSION_CONFLICT",
        messageKey: "reports.report_version_conflict",
        retryable: false,
      },
    });
  });
});
