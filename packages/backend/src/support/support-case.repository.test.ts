import { describe, expect, it, vi } from "vitest";

import { createSupportCaseRepository } from "./support-case.repository.js";

describe("createSupportCaseRepository", () => {
  it("returns the persisted support-case id from the caller transaction", async () => {
    const values = vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ id: "case-1" }]),
    });
    const transaction = { insert: vi.fn().mockReturnValue({ values }) };

    await expect(createSupportCaseRepository().insert(transaction as never, {
      reportId: "report-1", reportVersionId: "version-1", assetId: "asset-1",
      failureStage: "pdf", errorCode: "PDF_RENDER_FAILED",
    })).resolves.toBe("case-1");
  });

  it("fails closed when persistence did not return an id", async () => {
    const transaction = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([]) }),
      }),
    };

    await expect(createSupportCaseRepository().insert(transaction as never, {
      reportId: "report-1", reportVersionId: "version-1", assetId: "asset-1",
      failureStage: "garage", errorCode: "GARAGE_UNAVAILABLE",
    })).rejects.toThrow("SUPPORT_CASE_INSERT_FAILED");
  });
});
