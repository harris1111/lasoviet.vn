import { describe, expect, it } from "vitest";

import {
  ReportAssetStoredV1Schema,
  ReportPdfRenderJobV1Schema,
  ReportPdfRequestedV1Schema,
} from "./report-assets.js";

const requested = {
  reportId: "report-1",
  reportVersionId: "report-version-1",
  assetId: "asset-1",
  renderVersion: "identity-report-pdf.v1" as const,
};

describe("report asset contracts", () => {
  it("accepts only the exact supported PDF render literals", () => {
    expect(ReportPdfRequestedV1Schema.safeParse(requested).success).toBe(true);
    expect(
      ReportPdfRequestedV1Schema.safeParse({
        ...requested,
        renderVersion: "identity-report-pdf.v3",
      }).success,
    ).toBe(false);
  });

  it("preserves the requested render literal in PDF queue jobs", () => {
    const parsed = ReportPdfRenderJobV1Schema.safeParse({
      schemaVersion: 1,
      name: "report.pdf.render.v1",
      sourceEventId: "event-1",
      traceId: "trace-1",
      idempotencyKey: "pdf-render:asset-1:identity-report-pdf.v2",
      payload: { ...requested, renderVersion: "identity-report-pdf.v2" },
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.payload.renderVersion).toBe("identity-report-pdf.v2");
    }
  });

  it("requires immutable stored-asset integrity metadata", () => {
    expect(
      ReportAssetStoredV1Schema.safeParse({
        ...requested,
        sha256: "a".repeat(64),
        byteLength: 1,
      }).success,
    ).toBe(true);
    expect(
      ReportAssetStoredV1Schema.safeParse({
        ...requested,
        sha256: "invalid",
        byteLength: 0,
      }).success,
    ).toBe(false);
  });
});
