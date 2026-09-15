import { describe, expect, it } from "vitest";
import {
  claimReportOpened,
  claimReportSectionRead,
  createReportReaderAnalyticsState,
  toReadDepthBucket,
} from "./report-analytics";

describe("report analytics", () => {
  it("maps progress percentages accurately into integer depth buckets 0, 25, 50, 75, 100", () => {
    expect(toReadDepthBucket(0)).toBe(0);
    expect(toReadDepthBucket(12)).toBe(0);
    expect(toReadDepthBucket(24.9)).toBe(0);
    expect(toReadDepthBucket(25)).toBe(25);
    expect(toReadDepthBucket(49)).toBe(25);
    expect(toReadDepthBucket(50)).toBe(50);
    expect(toReadDepthBucket(74.9)).toBe(50);
    expect(toReadDepthBucket(75)).toBe(75);
    expect(toReadDepthBucket(99.9)).toBe(75);
    expect(toReadDepthBucket(100)).toBe(100);
    expect(toReadDepthBucket(105)).toBe(100);
  });

  it("claims report_opened once and skips repeats, omitting reportId, content, or evidence", () => {
    const state = createReportReaderAnalyticsState();
    const first = claimReportOpened(state, "ZIWEI-IDENTITY-P0", "v4");
    expect(first).toEqual({
      name: "report_opened",
      properties: {
        sku: "ZIWEI-IDENTITY-P0",
        report_version: "v4",
      },
    });
    expect(first?.properties).not.toHaveProperty("reportId");
    expect(first?.properties).not.toHaveProperty("reportVersionId");
    expect(first?.properties).not.toHaveProperty("content");
    expect(first?.properties).not.toHaveProperty("evidence");

    // Second claim is skipped
    const second = claimReportOpened(state, "ZIWEI-IDENTITY-P0", "v4");
    expect(second).toBeNull();
  });

  it("does not claim report_section_read below 25% (0/10/24.9 do not claim); claims at 25%, dedupes same bucket, and advances on later buckets or new sections", () => {
    const state = createReportReaderAnalyticsState();

    // Undefined sectionId returns null
    expect(claimReportSectionRead(state, { sku: "ZIWEI-IDENTITY-P0", sectionId: undefined, progressPercent: 25 })).toBeNull();

    // 0%, 10%, 24.9% do not claim (bucket 0 returns null)
    expect(claimReportSectionRead(state, { sku: "ZIWEI-IDENTITY-P0", sectionId: "overview", progressPercent: 0 })).toBeNull();
    expect(claimReportSectionRead(state, { sku: "ZIWEI-IDENTITY-P0", sectionId: "overview", progressPercent: 10 })).toBeNull();
    expect(claimReportSectionRead(state, { sku: "ZIWEI-IDENTITY-P0", sectionId: "overview", progressPercent: 24.9 })).toBeNull();

    // Exactly 25% claims bucket 25
    const claim25 = claimReportSectionRead(state, {
      sku: "ZIWEI-IDENTITY-P0",
      sectionId: "overview",
      progressPercent: 25,
    });
    expect(claim25).toEqual({
      name: "report_section_read",
      properties: {
        sku: "ZIWEI-IDENTITY-P0",
        section_id: "overview",
        read_depth_percent: 25,
      },
    });
    expect(claim25?.properties).not.toHaveProperty("reportId");
    expect(claim25?.properties).not.toHaveProperty("content");

    // Same bucket 25 (e.g. at 35% progress) dedupes and returns null
    expect(claimReportSectionRead(state, { sku: "ZIWEI-IDENTITY-P0", sectionId: "overview", progressPercent: 35 })).toBeNull();

    // Progress advances to 50% (claims bucket 50)
    const claim50 = claimReportSectionRead(state, { sku: "ZIWEI-IDENTITY-P0", sectionId: "overview", progressPercent: 50 });
    expect(claim50?.properties.read_depth_percent).toBe(50);

    // Switch to new section at 50% progress (claims bucket 50 for new section)
    const claimNewSec = claimReportSectionRead(state, { sku: "ZIWEI-IDENTITY-P0", sectionId: "core_axis", progressPercent: 50 });
    expect(claimNewSec?.properties.section_id).toBe("core_axis");
    expect(claimNewSec?.properties.read_depth_percent).toBe(50);
  });
});
