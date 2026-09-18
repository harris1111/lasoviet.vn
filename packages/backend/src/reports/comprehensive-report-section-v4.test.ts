import { ZIWEI_PALACE_IDS } from "@lasoviet/contracts";
import { describe, expect, it } from "vitest";

import {
  COMPREHENSIVE_REPORT_SECTION_KEYS,
  COMPREHENSIVE_REPORT_SECTION_KEYS_V4_1,
  ComprehensiveReportSectionV4Error,
  parseCompleteComprehensiveReportAcceptedSections,
  parseComprehensiveReportAcceptedSection,
  resolveComprehensiveReportSectionKeys,
} from "./comprehensive-report-section-v4.js";
import {
  REPORT_CONFIG_VERSION_V4_1_1_SECTIONED_SENSITIVITY,
  REPORT_CONFIG_VERSION_V4_1_SECTIONED_SENSITIVITY,
} from "./identity-report-config.js";

const narrative = (title = "Tiêu đề") => ({
  title,
  narrative: "Nội dung có căn cứ.",
  evidenceKeys: ["ziwei.evidence.one"],
});

function completeSections(): unknown[] {
  return [
    { key: "overview", value: narrative() },
    { key: "coreAxis", value: narrative() },
    { key: "keyConfigurations", value: [narrative()] },
    ...ZIWEI_PALACE_IDS.map((palaceId) => ({
      key: `palace:${palaceId}`,
      value: { ...narrative(), palaceId },
    })),
    { key: "thematic:career_wealth", value: { ...narrative(), id: "career_wealth" } },
    { key: "thematic:relationships_family", value: { ...narrative(), id: "relationships_family" } },
    { key: "thematic:social_environment", value: { ...narrative(), id: "social_environment" } },
    { key: "thematic:wellbeing_inner_resources", value: { ...narrative(), id: "wellbeing_inner_resources" } },
    { key: "strengthsAndTensions", value: narrative() },
    {
      key: "currentDecadal",
      value: { ...narrative(), state: "not_started", firstCycleStartAge: 6, firstCycleStartYear: 2000 },
    },
    { key: "annualSnapshot", value: { ...narrative(), targetYear: 2026, asOfDate: "2026-09-15" } },
    {
      key: "practicalDirection",
      value: Array.from({ length: 3 }, () => ({
        recommendation: "Thực hiện bước cụ thể.",
        rationale: "Phù hợp với dữ kiện.",
        avoid: "Không vội vàng.",
        evidenceKeys: ["ziwei.evidence.one"],
      })),
    },
  ];
}

describe("comprehensive report section V4 registry", () => {
  it("defines the exact canonical section sequence", () => {
    expect(COMPREHENSIVE_REPORT_SECTION_KEYS).toHaveLength(23);
    expect(COMPREHENSIVE_REPORT_SECTION_KEYS.slice(0, 3)).toEqual([
      "overview",
      "coreAxis",
      "keyConfigurations",
    ]);
    expect(COMPREHENSIVE_REPORT_SECTION_KEYS.at(-1)).toBe("practicalDirection");
  });

  it("rejects unknown keys, mismatched IDs, extra fields, and sensitivity", () => {
    expect(() => parseComprehensiveReportAcceptedSection({ key: "unknown", value: narrative() }))
      .toThrow(ComprehensiveReportSectionV4Error);
    expect(() => parseComprehensiveReportAcceptedSection({
      key: `palace:${ZIWEI_PALACE_IDS[0]}`,
      value: { ...narrative(), palaceId: ZIWEI_PALACE_IDS[1] },
    })).toThrow(ComprehensiveReportSectionV4Error);
    expect(() => parseComprehensiveReportAcceptedSection({
      key: "overview",
      value: { ...narrative(), birthTimeSensitivity: "no" },
    })).toThrow(ComprehensiveReportSectionV4Error);
    expect(() => parseComprehensiveReportAcceptedSection({
      key: "overview",
      value: narrative(),
      extra: true,
    })).toThrow(ComprehensiveReportSectionV4Error);
  });

  it("keeps configuration and practical direction as single bounded units", () => {
    expect(parseComprehensiveReportAcceptedSection({
      key: "keyConfigurations",
      value: Array.from({ length: 12 }, () => narrative()),
    }).key).toBe("keyConfigurations");
    expect(parseComprehensiveReportAcceptedSection({
      key: "practicalDirection",
      value: Array.from({ length: 3 }, () => ({
        recommendation: "Làm việc có kế hoạch.",
        rationale: "Căn cứ rõ ràng.",
        avoid: "Không hấp tấp.",
        evidenceKeys: ["ziwei.evidence.one"],
      })),
    }).key).toBe("practicalDirection");
  });

  it("requires the complete exact non-duplicate section set", () => {
    const complete = completeSections();
    expect(parseCompleteComprehensiveReportAcceptedSections([...complete].reverse()).map((item) => item.key))
      .toEqual(COMPREHENSIVE_REPORT_SECTION_KEYS);
    expect(() => parseCompleteComprehensiveReportAcceptedSections(complete.slice(1)))
      .toThrow(ComprehensiveReportSectionV4Error);
    expect(() => parseCompleteComprehensiveReportAcceptedSections([...complete, complete[0]]))
      .toThrow(ComprehensiveReportSectionV4Error);
  });

  it("uses the separate V4.1 registry and requires sensitivity between annual and practical sections", () => {
    expect(COMPREHENSIVE_REPORT_SECTION_KEYS_V4_1).toHaveLength(24);
    expect(COMPREHENSIVE_REPORT_SECTION_KEYS_V4_1.indexOf("birthTimeSensitivity")).toBe(
      COMPREHENSIVE_REPORT_SECTION_KEYS_V4_1.indexOf("annualSnapshot") + 1,
    );
    expect(resolveComprehensiveReportSectionKeys(REPORT_CONFIG_VERSION_V4_1_SECTIONED_SENSITIVITY))
      .toEqual(COMPREHENSIVE_REPORT_SECTION_KEYS_V4_1);
    expect(resolveComprehensiveReportSectionKeys(REPORT_CONFIG_VERSION_V4_1_1_SECTIONED_SENSITIVITY))
      .toEqual(COMPREHENSIVE_REPORT_SECTION_KEYS_V4_1);

    const sections = completeSections();
    sections.splice(-1, 0, {
      key: "birthTimeSensitivity",
      value: {
        title: "Độ nhạy thời điểm sinh",
        stableFactors: narrative("Yếu tố ổn định"),
        sensitiveFactors: narrative("Yếu tố cần đối chiếu"),
      },
    });
    expect(parseCompleteComprehensiveReportAcceptedSections(
      sections,
      REPORT_CONFIG_VERSION_V4_1_SECTIONED_SENSITIVITY,
    ).map((item) => item.key)).toEqual(COMPREHENSIVE_REPORT_SECTION_KEYS_V4_1);
    expect(parseCompleteComprehensiveReportAcceptedSections(
      sections,
      REPORT_CONFIG_VERSION_V4_1_1_SECTIONED_SENSITIVITY,
    ).map((item) => item.key)).toEqual(COMPREHENSIVE_REPORT_SECTION_KEYS_V4_1);
    expect(() => resolveComprehensiveReportSectionKeys("unknown")).toThrow(
      ComprehensiveReportSectionV4Error,
    );
  });
});
