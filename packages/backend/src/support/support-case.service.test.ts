import { describe, expect, it, vi } from "vitest";

import { createSupportCaseService } from "./support-case.service.js";

describe("createSupportCaseService", () => {
  it("validates bounded terminal lineage before inserting", async () => {
    const insert = vi.fn().mockResolvedValue("case-1");
    const service = createSupportCaseService({ insert } as never);

    await expect(service.createTerminalCase({} as never, {
      reportId: "report-1", reportVersionId: "version-1", assetId: "asset-1",
      failureStage: "pdf", errorCode: "PDF_RENDER_FAILED",
    })).resolves.toBe("case-1");
    expect(insert).toHaveBeenCalledOnce();
  });

  it("rejects unsupported stage and unbounded error code", async () => {
    const service = createSupportCaseService({ insert: vi.fn() } as never);
    await expect(service.createTerminalCase({} as never, {
      reportId: "report-1", reportVersionId: "version-1", assetId: "asset-1",
      failureStage: "other" as never, errorCode: "PDF_RENDER_FAILED",
    })).rejects.toThrow("SUPPORT_CASE_INVALID");
    await expect(service.createTerminalCase({} as never, {
      reportId: "report-1", reportVersionId: "version-1", assetId: "asset-1",
      failureStage: "pdf", errorCode: "UNBOUNDED",
    })).rejects.toThrow();
  });
});
