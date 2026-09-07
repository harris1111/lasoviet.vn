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
