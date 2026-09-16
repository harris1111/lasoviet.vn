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

describe("createDatabaseReportVersionRepository - notification configuration", () => {
  const database = {} as never;

  it("accepts the canonical public HTTPS origin", () => {
    expect(() =>
      createDatabaseReportVersionRepository(database, repositoryOptions),
    ).not.toThrow();
  });

  it.each([
    ["HTTP", "http://lasoviet.net"],
    ["private IP", "https://10.0.0.1"],
    ["credentials", "https://user:password@lasoviet.net"],
    ["internal hostname", "https://reports.internal"],
  ])("rejects %s origin", (_name, betterAuthUrl) => {
    expect(() =>
      createDatabaseReportVersionRepository(database, {
        betterAuthUrl,
        recipientFingerprintSecret: "synthetic-secret",
      }),
    ).toThrow("REPORT_NOTIFICATION_CONFIG_INVALID");
  });

  it("rejects an empty recipient fingerprint secret", () => {
    expect(() =>
      createDatabaseReportVersionRepository(database, {
        betterAuthUrl: "https://lasoviet.net",
        recipientFingerprintSecret: "   ",
      }),
    ).toThrow("REPORT_NOTIFICATION_CONFIG_INVALID");
  });
});

describe("createDatabaseReportVersionRepository - immutable PDF requests", () => {
  it("persists and requests the exact V2 render version", async () => {
    const selectResults = [
      [],
      [{ id: "job-1" }],
      [{
        user: {
          id: "user-1",
          isAnonymous: false,
          emailVerified: true,
          email: "reader@lasoviet.net",
        },
        order: {
          paidAt: new Date("2026-09-16T00:00:00.000Z"),
        },
      }],
    ];
    const updateResults = [
      [{ id: "reservation-1", stateVersion: 3 }],
      [{ id: "reservation-1", stateVersion: 4 }],
      [{ id: "attempt-1" }],
      [{ id: "job-1" }],
    ];
    const reportVersionValues = vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ reportVersionId: "report-version-1" }]),
    });
    const outboxValues = vi.fn().mockResolvedValue(undefined);
    const notificationValues = vi.fn().mockResolvedValue(undefined);
    const insert = vi
      .fn()
      .mockReturnValueOnce({ values: reportVersionValues })
      .mockReturnValueOnce({ values: outboxValues })
      .mockReturnValueOnce({ values: notificationValues });
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
    });

    expect(result).toEqual({
      ok: true,
      value: { reportVersionId: "report-version-1" },
    });
    expect(reportVersionValues).toHaveBeenCalledWith(
      expect.objectContaining({ renderVersion: "identity-report-pdf.v2" }),
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
  });
});
