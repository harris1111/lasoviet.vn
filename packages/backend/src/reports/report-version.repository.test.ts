import { createHash } from "node:crypto";

import { describe, expect, it, vi } from "vitest";
import { createDatabaseReportVersionRepository } from "./report-version.repository.js";

const repositoryOptions = {
  betterAuthUrl: "https://lasoviet.net",
  recipientFingerprintSecret: "synthetic-secret",
};

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

    const repo = createDatabaseReportVersionRepository(
      mockDb as never,
      repositoryOptions,
    );
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

    const repo = createDatabaseReportVersionRepository(
      mockDb as never,
      repositoryOptions,
    );
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

    const repo = createDatabaseReportVersionRepository(
      mockDb as never,
      repositoryOptions,
    );
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

describe("createDatabaseReportVersionRepository - immutable PDF requests", () => {
  it("persists and requests the exact V2 render version", async () => {
    const selectResults = [
      [],
      [{ id: "job-1" }],
    ];
    const updateResults = [
      [{ id: "reservation-1", stateVersion: 3 }],
      [{ id: "reservation-1", stateVersion: 4 }],
      [{ id: "reservation-1", stateVersion: 5 }],
      [{ id: "attempt-1" }],
      [{ id: "job-1" }],
    ];
    const reportVersionValues = vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ reportVersionId: "report-version-1" }]),
    });
    const outboxValues = vi.fn().mockResolvedValue(undefined);
    const insert = vi
      .fn()
      .mockReturnValueOnce({ values: reportVersionValues })
      .mockReturnValueOnce({ values: vi.fn().mockResolvedValue(undefined) })
      .mockReturnValueOnce({ values: outboxValues })
    const select = vi.fn(() => {
      const query = {
        from: vi.fn(),
        innerJoin: vi.fn(),
        where: vi.fn(),
        limit: vi.fn().mockImplementation(() => Promise.resolve(selectResults.shift())),
      };
      query.from.mockReturnValue(query);
      query.innerJoin.mockReturnValue(query);
      query.where.mockReturnValue(query);
      return query;
    });
    const transaction = vi.fn(async (callback) =>
      callback({
        select,
        update: vi.fn(() => ({
          set: vi.fn(() => ({
            where: vi.fn(() => ({
              returning: vi.fn().mockImplementation(() => Promise.resolve(updateResults.shift())),
            })),
          })),
        })),
        insert,
      }),
    );
    const database = { transaction } as never;
    const repo = createDatabaseReportVersionRepository(database, repositoryOptions);

    const result = await repo.commitImmutableVersion({
      reportId: "report-1",
      reportVersionId: "report-version-1",
      entitlementId: "entitlement-1",
      chartVersionId: "chart-version-1",
      evidenceVersionId: "evidence-version-1",
      knowledgeVersionId: "knowledge-version-1",
      promptVersion: "ziwei.comprehensive.prompt.v4.1-sensitivity",
      reportConfigVersion: "ziwei.comprehensive.report.v4.1-sectioned-sensitivity",
      templateVersion: "ziwei-comprehensive-html.v2",
      renderVersion: "identity-report-pdf.v2",
      locale: "vi",
      sku: "ZIWEI-COMPREHENSIVE-P1",
      providerId: "provider-1",
      modelId: "model-1",
      structuredContent: {} as never,
      htmlContent: "<html>immutable</html>",
      jobId: "job-1",
      workerId: "worker-1",
      attemptNumber: 1,
      traceId: "trace-1",
      supersedesReportVersionId: "00000000-0000-4000-8000-000000000001",
    });

    expect(result).toEqual({
      ok: true,
      value: { reportVersionId: "report-version-1" },
    });
    expect(reportVersionValues).toHaveBeenCalledWith(
      expect.objectContaining({
        renderVersion: "identity-report-pdf.v2",
        supersedesReportVersionId: "00000000-0000-4000-8000-000000000001",
      }),
    );
    expect(insert.mock.results[1]?.value.values).toHaveBeenCalledWith(
      expect.objectContaining({
        reportVersionId: "report-version-1",
        renderVersion: "identity-report-pdf.v2",
        status: "render_pending",
        objectKey: expect.stringMatching(/^reports\/[^/]+\.pdf$/),
      }),
    );
    expect(outboxValues).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "report.pdf.requested.v1",
        idempotencyKey: "pdf-request:report-version-1:identity-report-pdf.v2",
        payload: expect.objectContaining({
          renderVersion: "identity-report-pdf.v2",
        }),
      }),
    );
    expect(insert).toHaveBeenCalledTimes(3);
  });

  it("treats supersession lineage as part of immutable replay equality", async () => {
    const htmlContent = "<html>immutable replay</html>";
    const input = {
      reportId: "report-1",
      reportVersionId: "report-version-1",
      entitlementId: "entitlement-1",
      chartVersionId: "chart-version-1",
      evidenceVersionId: "evidence-version-1",
      knowledgeVersionId: "knowledge-version-1",
      promptVersion: "prompt-version-1",
      reportConfigVersion: "report-config-version-1",
      templateVersion: "template-version-1",
      renderVersion: "identity-report-pdf.v2" as const,
      locale: "vi" as const,
      sku: "ZIWEI-COMPREHENSIVE-P1",
      providerId: "provider-1",
      modelId: "model-1",
      structuredContent: {} as never,
      htmlContent,
      jobId: "job-1",
      workerId: "worker-1",
      attemptNumber: 1,
      traceId: "trace-1",
      supersedesReportVersionId: "00000000-0000-4000-8000-000000000001",
    };
    const existing = {
      ...input,
      id: "stored-version-1",
      contentHash: createHash("sha256").update(Buffer.from(htmlContent, "utf8")).digest("hex"),
      pdfAssetId: "pdf-asset-1",
      supersedesReportVersionId: input.supersedesReportVersionId,
      createdAt: new Date("2026-09-20T00:00:00.000Z"),
    };

    function repositoryFor(stored: typeof existing) {
      const selectResults = [[stored], [{ status: "processed", leasedBy: null, leasedUntil: null }]];
      const select = vi.fn(() => {
        const query = {
          from: vi.fn(),
          where: vi.fn(),
          limit: vi.fn().mockImplementation(() => Promise.resolve(selectResults.shift())),
        };
        query.from.mockReturnValue(query);
        query.where.mockReturnValue(query);
        return query;
      });
      return createDatabaseReportVersionRepository({
        transaction: vi.fn(async (callback) => callback({ select })),
      } as never, repositoryOptions);
    }

    await expect(
      repositoryFor(existing).commitImmutableVersion(input),
    ).resolves.toEqual({ ok: true, value: existing });
    await expect(
      repositoryFor(existing).commitImmutableVersion({
        ...input,
        supersedesReportVersionId: "00000000-0000-4000-8000-000000000002",
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "REPORT_VERSION_CONFLICT" },
    });
  });

  it("persists null supersession lineage for normal immutable versions", async () => {
    const selectResults = [
      [],
      [{ id: "job-1" }],
    ];
    const updateResults = [
      [{ id: "reservation-1", stateVersion: 3 }],
      [{ id: "reservation-1", stateVersion: 4 }],
      [{ id: "reservation-1", stateVersion: 5 }],
      [{ id: "attempt-1" }],
      [{ id: "job-1" }],
    ];
    const reportVersionValues = vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ reportVersionId: "report-version-normal" }]),
    });
    const insert = vi
      .fn()
      .mockReturnValueOnce({ values: reportVersionValues })
      .mockReturnValueOnce({ values: vi.fn().mockResolvedValue(undefined) })
      .mockReturnValueOnce({ values: vi.fn().mockResolvedValue(undefined) });
    const select = vi.fn(() => {
      const query = {
        from: vi.fn(),
        innerJoin: vi.fn(),
        where: vi.fn(),
        limit: vi.fn().mockImplementation(() => Promise.resolve(selectResults.shift())),
      };
      query.from.mockReturnValue(query);
      query.innerJoin.mockReturnValue(query);
      query.where.mockReturnValue(query);
      return query;
    });
    const repo = createDatabaseReportVersionRepository({
      transaction: vi.fn(async (callback) => callback({
        select,
        update: vi.fn(() => ({
          set: vi.fn(() => ({
            where: vi.fn(() => ({
              returning: vi.fn().mockImplementation(() => Promise.resolve(updateResults.shift())),
            })),
          })),
        })),
        insert,
      })),
    } as never, repositoryOptions);

    await repo.commitImmutableVersion({
      reportId: "report-normal",
      reportVersionId: "report-version-normal",
      entitlementId: "entitlement-normal",
      chartVersionId: "chart-normal",
      evidenceVersionId: "evidence-normal",
      knowledgeVersionId: "knowledge-normal",
      promptVersion: "prompt-normal",
      reportConfigVersion: "config-normal",
      templateVersion: "template-normal",
      renderVersion: "identity-report-pdf.v2",
      locale: "vi",
      sku: "ZIWEI-COMPREHENSIVE-P1",
      providerId: "provider-normal",
      modelId: "model-normal",
      structuredContent: {} as never,
      htmlContent: "<html>normal</html>",
      jobId: "job-1",
      workerId: "worker-1",
      attemptNumber: 1,
      traceId: "trace-normal",
    });

    expect(reportVersionValues).toHaveBeenCalledWith(
      expect.objectContaining({ supersedesReportVersionId: null }),
    );
  });
});
