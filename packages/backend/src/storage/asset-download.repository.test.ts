import { beforeEach, describe, expect, it, vi } from "vitest";

const ports = vi.hoisted(() => ({ read: vi.fn(), getReport: vi.fn() }));
vi.mock("../reports/report-query.repository.js", () => ({
  createDatabaseReportQueryRepository: () => ({ readAuthorizedReport: ports.read }),
}));
vi.mock("../reports/report-query.service.js", () => ({
  createReportQueryService: () => ({ getReport: ports.getReport }),
}));
import { createDatabaseAssetDownloadRepository } from "./asset-download.service.js";

function repository() {
  const query = { from: vi.fn(), innerJoin: vi.fn(), where: vi.fn(), limit: vi.fn() };
  query.from.mockReturnValue(query);
  query.innerJoin.mockReturnValue(query);
  query.where.mockReturnValue(query);
  query.limit.mockResolvedValue([{ reportId: "report", objectKey: "private/full.pdf" }]);
  return createDatabaseAssetDownloadRepository({ select: () => query } as never);
}

describe("full report PDF authorization", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([null, { entitlements: [{ active: true, sku: "ZIWEI-PALACE-LIFE-P0" }] }, { entitlements: [{ active: true, sku: "ZIWEI-NATAL-EXCERPT-P0" }] }])(
    "denies absent, palace-only and excerpt-only authority", async (record) => {
      ports.read.mockResolvedValue(record);
      expect(await repository().findOwnedStoredPdf("asset", "owner")).toBeNull();
      expect(ports.getReport).not.toHaveBeenCalled();
    },
  );

  it.each([
    { ok: false },
    { ok: true, value: { state: "pending" } },
    { ok: true, value: { state: "ready", contentVersion: "ziwei-palaces.v1", content: {} } },
    { ok: true, value: { state: "ready", contentVersion: "ziwei-comprehensive.v3", content: { lockedSections: ["palaceReadings"] } } },
  ])("denies invalid or partial projections even with a lifetime SKU", async (result) => {
    ports.read.mockResolvedValue({ entitlements: [{ active: true, sku: "ZIWEI-IDENTITY-P0" }] });
    ports.getReport.mockResolvedValue(result);
    expect(await repository().findOwnedStoredPdf("asset", "owner")).toBeNull();
  });

  it("allows only an authorized complete lifetime projection", async () => {
    ports.read.mockResolvedValue({ entitlements: [{ active: true, sku: "ZIWEI-IDENTITY-P0" }] });
    ports.getReport.mockResolvedValue({ ok: true, value: { state: "ready", contentVersion: "ziwei-comprehensive.v3", content: {} } });
    expect(await repository().findOwnedStoredPdf("asset", "owner")).toEqual({ objectKey: "private/full.pdf" });
    expect(ports.read).toHaveBeenCalledWith("owner", "report");
  });
});
