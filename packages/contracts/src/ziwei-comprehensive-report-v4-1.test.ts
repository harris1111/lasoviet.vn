import { describe, expect, it } from "vitest";

import {
  ZIWEI_PALACE_IDS,
  ZIWEI_THEMATIC_SYNTHESIS_IDS,
} from "./ziwei-comprehensive-report-v1.js";
import {
  ComprehensiveReportPublicContentV3Schema,
  type ComprehensiveReportTier1PublicContentV3,
  ComprehensiveReportTier1PublicContentV3Schema,
  type ComprehensiveReportTier2PublicContentV3,
  ComprehensiveReportTier2PublicContentV3Schema,
  projectComprehensiveReportPublicContentV3,
  ReportReadyViewV1Schema,
} from "./identity-report-v1.js";
import {
  TIER_1_ENTITLEMENT_SCOPE,
  TIER_2_V4_1_ENTITLEMENT_SCOPE,
} from "./commerce.js";
import { ZiweiComprehensiveReportContentV2Schema } from "./ziwei-comprehensive-report-v2.js";
import {
  ZiweiComprehensiveReportContentV3Schema,
  type ZiweiComprehensiveReportContentV3,
} from "./ziwei-comprehensive-report-v4-1.js";

function report(): ZiweiComprehensiveReportContentV3 {
  return {
    overview: { title: "Tổng quan", narrative: "Nội dung tổng quan.", evidenceKeys: ["overview"] },
    coreAxis: { title: "Trục chính", narrative: "Nội dung trục chính.", evidenceKeys: ["core"] },
    keyConfigurations: [{
      title: "Cách cục",
      narrative: "Nội dung cách cục.",
      evidenceKeys: ["configuration"],
    }],
    palaceReadings: ZIWEI_PALACE_IDS.map((palaceId) => ({
      palaceId,
      title: palaceId,
      narrative: `Nội dung ${palaceId}.`,
      evidenceKeys: [palaceId],
    })),
    thematicSynthesis: ZIWEI_THEMATIC_SYNTHESIS_IDS.map((id) => ({
      id,
      title: id,
      narrative: `Nội dung ${id}.`,
      evidenceKeys: [id],
    })),
    strengthsAndTensions: {
      title: "Điểm mạnh",
      narrative: "Nội dung điểm mạnh.",
      evidenceKeys: ["strengths"],
    },
    currentDecadal: {
      title: "Đại vận",
      state: "active",
      index: 1,
      ageRange: [21, 30],
      yearRange: [2021, 2030],
      narrative: "Nội dung đại vận.",
      evidenceKeys: ["decadal"],
    },
    annualSnapshot: {
      title: "Lưu niên",
      targetYear: 2026,
      asOfDate: "2026-09-16",
      narrative: "Nội dung lưu niên.",
      evidenceKeys: ["annual"],
    },
    birthTimeSensitivity: {
      title: "Độ nhạy giờ sinh",
      stableFactors: {
        title: "Yếu tố ổn định",
        narrative: "Nội dung ổn định.",
        evidenceKeys: ["sensitivity.stable"],
      },
      sensitiveFactors: {
        title: "Yếu tố nhạy cảm",
        narrative: "Nội dung nhạy cảm.",
        evidenceKeys: ["sensitivity.sensitive"],
      },
    },
    practicalDirection: [1, 2, 3].map((index) => ({
      recommendation: `Khuyến nghị ${index}.`,
      rationale: `Lý do ${index}.`,
      avoid: `Tránh ${index}.`,
      evidenceKeys: [`action.${index}`],
    })),
  };
}

describe("Ziwei comprehensive report V4.1 contracts", () => {
  it("requires birth-time sensitivity in strict V3 stored content while V2 rejects it", () => {
    const stored = report();
    expect(ZiweiComprehensiveReportContentV3Schema.safeParse(stored).success).toBe(true);
    expect(ZiweiComprehensiveReportContentV3Schema.safeParse({
      ...stored,
      birthTimeSensitivity: undefined,
    }).success).toBe(false);
    expect(ZiweiComprehensiveReportContentV3Schema.safeParse({
      ...stored,
      unknown: true,
    }).success).toBe(false);
    expect(ZiweiComprehensiveReportContentV2Schema.safeParse(stored).success).toBe(false);
  });

  it("projects Tier-1 without sensitivity and Tier-2 with narrative-only sensitivity", () => {
    const stored = report();
    const tier1: ComprehensiveReportTier1PublicContentV3 =
      ComprehensiveReportTier1PublicContentV3Schema.parse(
        projectComprehensiveReportPublicContentV3(stored, TIER_1_ENTITLEMENT_SCOPE),
      );
    expect(ComprehensiveReportTier1PublicContentV3Schema.safeParse(tier1).success).toBe(true);
    expect(tier1).not.toHaveProperty("birthTimeSensitivity");
    expect(tier1.lockedSections).toContain("birthTimeSensitivity");

    const tier2: ComprehensiveReportTier2PublicContentV3 =
      ComprehensiveReportTier2PublicContentV3Schema.parse(
        projectComprehensiveReportPublicContentV3(stored, TIER_2_V4_1_ENTITLEMENT_SCOPE),
      );
    expect(ComprehensiveReportTier2PublicContentV3Schema.safeParse(tier2).success).toBe(true);
    expect(tier2).toMatchObject({
      birthTimeSensitivity: {
        title: "Độ nhạy giờ sinh",
        stableFactors: { title: "Yếu tố ổn định", narrative: "Nội dung ổn định." },
        sensitiveFactors: { title: "Yếu tố nhạy cảm", narrative: "Nội dung nhạy cảm." },
      },
    });
    expect(JSON.stringify(tier2)).not.toContain("evidenceKeys");
  });

  it("rejects mixed, missing, and unknown V3 public fields and accepts the V3 ready member", () => {
    const tier1: ComprehensiveReportTier1PublicContentV3 =
      ComprehensiveReportTier1PublicContentV3Schema.parse(
        projectComprehensiveReportPublicContentV3(report(), TIER_1_ENTITLEMENT_SCOPE),
      );
    const tier2: ComprehensiveReportTier2PublicContentV3 =
      ComprehensiveReportTier2PublicContentV3Schema.parse(
        projectComprehensiveReportPublicContentV3(report(), TIER_2_V4_1_ENTITLEMENT_SCOPE),
      );

    expect(ComprehensiveReportPublicContentV3Schema.safeParse({
      ...tier1,
      birthTimeSensitivity: tier2.birthTimeSensitivity,
    }).success).toBe(false);
    expect(ComprehensiveReportPublicContentV3Schema.safeParse({
      ...tier2,
      unknown: true,
    }).success).toBe(false);
    expect(ComprehensiveReportPublicContentV3Schema.safeParse({
      ...tier2,
      birthTimeSensitivity: {
        ...tier2.birthTimeSensitivity,
        stableFactors: {
          ...tier2.birthTimeSensitivity.stableFactors,
          evidenceKeys: ["leak"],
        },
      },
    }).success).toBe(false);

    expect(ReportReadyViewV1Schema.safeParse({
      version: 1,
      state: "ready",
      contentVersion: "ziwei-comprehensive.v3",
      reportId: "report-1",
      reportVersionId: "version-1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      fulfillmentStatus: "complete",
      lineage: { supersedesReportVersionId: null },
      content: tier2,
    }).success).toBe(true);
  });
});
