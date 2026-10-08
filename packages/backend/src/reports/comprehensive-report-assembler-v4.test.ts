import {
  ZIWEI_PALACE_IDS,
  ZIWEI_THEMATIC_SYNTHESIS_IDS,
  ZiweiComprehensiveReportContentV2Schema,
} from "@lasoviet/contracts";
import { describe, expect, it } from "vitest";

import {
  assembleComprehensiveReportV4,
  assembleComprehensiveReportV4_1,
} from "./comprehensive-report-assembler-v4.js";
import type { ComprehensiveZiweiFactsV4 } from "./comprehensive-ziwei-facts-v4.js";
import {
  CANONICAL_PALACE_TITLES_VI,
  CANONICAL_THEMATIC_TITLES_VI,
  REPORT_CONFIG_VERSION_V4_1_1_SECTIONED_SENSITIVITY,
  REPORT_CONFIG_VERSION_V4_1_SECTIONED_SENSITIVITY,
} from "./identity-report-config.js";

const evidenceKeys = ["ziwei.evidence.one"];
const narrative = (title: string, content = "Nội dung đã được chuẩn hóa.") => ({
  title,
  narrative: content,
  evidenceKeys,
});

function facts(state: "active" | "not_started" = "active"): ComprehensiveZiweiFactsV4 {
  const decadal = state === "active"
    ? { state, index: 2, ageRange: [22, 31], yearRange: [2022, 2031] }
    : { state, firstCycleStartAge: 6, firstCycleStartYear: 2000 };
  return {
    timing: {
      decadal,
      annual: { targetYear: 2026 },
    },
    sourceSnapshot: { asOfDate: "2026-09-15" },
  } as unknown as ComprehensiveZiweiFactsV4;
}

function acceptedSections(state: "active" | "not_started" = "active"): unknown[] {
  const reportFacts = facts(state);
  const decadal = reportFacts.timing.decadal;
  return [
    { key: "overview", value: narrative("Bất kỳ") },
    { key: "coreAxis", value: narrative("Bất kỳ") },
    { key: "keyConfigurations", value: [narrative("Cách cục")] },
    ...ZIWEI_PALACE_IDS.map((palaceId, index) => ({
      key: `palace:${palaceId}`,
      value: { ...narrative(`Sai ${index}`), palaceId },
    })),
    ...ZIWEI_THEMATIC_SYNTHESIS_IDS.map((id, index) => ({
      key: `thematic:${id}`,
      value: { ...narrative(`Sai chuyên đề ${index}`), id },
    })),
    { key: "strengthsAndTensions", value: narrative("Bất kỳ") },
    {
      key: "currentDecadal",
      value: decadal.state === "active"
        ? {
            ...narrative("Đại vận do mô hình viết"),
            state: "active",
            index: decadal.index,
            ageRange: [...decadal.ageRange],
            yearRange: [...decadal.yearRange],
          }
        : {
            ...narrative("Đại vận do mô hình viết"),
            state: "not_started",
            firstCycleStartAge: decadal.firstCycleStartAge,
            firstCycleStartYear: decadal.firstCycleStartYear,
          },
    },
    {
      key: "annualSnapshot",
      value: {
        ...narrative("Lưu niên do mô hình viết"),
        targetYear: reportFacts.timing.annual.targetYear,
        asOfDate: reportFacts.sourceSnapshot.asOfDate,
      },
    },
    {
      key: "practicalDirection",
      value: Array.from({ length: 3 }, (_, index) => ({
        recommendation: `Hành động ${index}`,
        rationale: `Lý do ${index}.`,
        avoid: `Tránh ${index}.`,
        evidenceKeys,
      })),
    },
  ];
}

function acceptedSensitivitySections(): unknown[] {
  const sections = acceptedSections();
  sections.splice(-1, 0, {
    key: "birthTimeSensitivity",
    value: {
      title: "Độ nhạy thời điểm sinh",
      stableFactors: narrative("Yếu tố ổn định"),
      sensitiveFactors: narrative("Yếu tố cần đối chiếu"),
    },
  });
  return sections;
}

describe("comprehensive report V4 assembler", () => {
  it("restores canonical section, palace, and theme titles and order", () => {
    const report = assembleComprehensiveReportV4([...acceptedSections()].reverse(), facts());
    expect(report.overview.title).toBe("Tổng quan lá số");
    expect(report.palaceReadings.map((item) => item.palaceId)).toEqual(ZIWEI_PALACE_IDS);
    expect(report.palaceReadings.map((item) => item.title)).toEqual(
      ZIWEI_PALACE_IDS.map((id) => CANONICAL_PALACE_TITLES_VI[id]),
    );
    expect(report.thematicSynthesis.map((item) => item.id)).toEqual(ZIWEI_THEMATIC_SYNTHESIS_IDS);
    expect(report.thematicSynthesis.map((item) => item.title)).toEqual(
      ZIWEI_THEMATIC_SYNTHESIS_IDS.map((id) => CANONICAL_THEMATIC_TITLES_VI[id]),
    );
  });

  it("freezes active and not-started decadal timing plus annual fields from facts", () => {
    const active = assembleComprehensiveReportV4(acceptedSections(), facts("active"));
    expect(active.currentDecadal).toMatchObject({
      state: "active",
      index: 2,
      ageRange: [22, 31],
      yearRange: [2022, 2031],
    });
    expect(active.annualSnapshot).toMatchObject({ targetYear: 2026, asOfDate: "2026-09-15" });

    const pending = assembleComprehensiveReportV4(acceptedSections("not_started"), facts("not_started"));
    expect(pending.currentDecadal).toMatchObject({
      state: "not_started",
      firstCycleStartAge: 6,
      firstCycleStartYear: 2000,
    });
  });

  it.each([2026, 2028])("preserves lunar v2 metadata for frozen annual %i", (targetYear) => {
    const reportFacts = facts();
    reportFacts.sourceSnapshot.asOfDate = "2027-01-15";
    reportFacts.sourceSnapshot.timingRuleVersion = "ziwei.timing.lunar-year.v2";
    reportFacts.timing.annual.targetYear = targetYear;
    const sections = acceptedSections();
    const annual = sections.find((section) => (section as { key: string }).key === "annualSnapshot") as { value: Record<string, unknown> };
    Object.assign(annual.value, { asOfDate: "2027-01-15", targetYear, timingRuleVersion: "ziwei.timing.lunar-year.v2" });
    const report = assembleComprehensiveReportV4(sections, reportFacts);
    expect(ZiweiComprehensiveReportContentV2Schema.safeParse(report).success).toBe(true);
    expect(report.annualSnapshot).toMatchObject({ targetYear, timingRuleVersion: "ziwei.timing.lunar-year.v2" });
  });

  it("rejects timing state, value, range, and annual checkpoint mismatches", () => {
    const invalidState = acceptedSections("not_started");
    expect(() => assembleComprehensiveReportV4(invalidState, facts("active"))).toThrow(
      "COMPREHENSIVE_REPORT_ASSEMBLER_INVALID",
    );

    const invalidValue = acceptedSections();
    (invalidValue.find((section) => (section as { key: string }).key === "currentDecadal") as {
      value: { index: number };
    }).value.index = 3;
    expect(() => assembleComprehensiveReportV4(invalidValue, facts())).toThrow(
      "COMPREHENSIVE_REPORT_ASSEMBLER_INVALID",
    );

    const invalidRange = acceptedSections();
    (invalidRange.find((section) => (section as { key: string }).key === "currentDecadal") as {
      value: { ageRange: [number, number]; yearRange: [number, number] };
    }).value.ageRange = [23, 32];
    expect(() => assembleComprehensiveReportV4(invalidRange, facts())).toThrow(
      "COMPREHENSIVE_REPORT_ASSEMBLER_INVALID",
    );

    const invalidAnnual = acceptedSections();
    (invalidAnnual.find((section) => (section as { key: string }).key === "annualSnapshot") as {
      value: { targetYear: number; asOfDate: string };
    }).value.asOfDate = "2025-09-15";
    (invalidAnnual.find((section) => (section as { key: string }).key === "annualSnapshot") as {
      value: { targetYear: number; asOfDate: string };
    }).value.targetYear = 2025;
    expect(() => assembleComprehensiveReportV4(invalidAnnual, facts())).toThrow(
      "COMPREHENSIVE_REPORT_ASSEMBLER_INVALID",
    );
  });

  it("rejects missing, duplicate, unknown, and mismatched section units", () => {
    const sections = acceptedSections();
    expect(() => assembleComprehensiveReportV4(sections.slice(1), facts())).toThrow(
      "COMPREHENSIVE_REPORT_SECTION_INVALID",
    );
    expect(() => assembleComprehensiveReportV4([...sections, sections[0]], facts())).toThrow(
      "COMPREHENSIVE_REPORT_SECTION_INVALID",
    );
    expect(() => assembleComprehensiveReportV4([
      ...sections.slice(0, -1),
      { key: "unknown", value: narrative("Không hợp lệ") },
    ], facts())).toThrow("COMPREHENSIVE_REPORT_SECTION_INVALID");
    const mismatched = acceptedSections();
    (mismatched[3] as { value: { palaceId: string } }).value.palaceId = ZIWEI_PALACE_IDS[1]!;
    expect(() => assembleComprehensiveReportV4(mismatched, facts())).toThrow(
      "COMPREHENSIVE_REPORT_SECTION_INVALID",
    );
  });

  it("produces V2-valid, sensitivity-free byte-stable output", () => {
    const sections = acceptedSections();
    const first = assembleComprehensiveReportV4(sections, facts());
    const second = assembleComprehensiveReportV4([...sections].reverse(), facts());
    expect(ZiweiComprehensiveReportContentV2Schema.safeParse(first).success).toBe(true);
    expect("birthTimeSensitivity" in first).toBe(false);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it.each([
    REPORT_CONFIG_VERSION_V4_1_SECTIONED_SENSITIVITY,
    REPORT_CONFIG_VERSION_V4_1_1_SECTIONED_SENSITIVITY,
  ])("assembles V4.1 content with selected config %s", (reportConfigVersion) => {
    const report = assembleComprehensiveReportV4_1(
      acceptedSensitivitySections(),
      facts(),
      reportConfigVersion,
    );
    expect(report.birthTimeSensitivity.stableFactors.title).toBe("Yếu tố ổn định");
  });

  it("defaults V4.1 assembly to the old config and rejects unknown config", () => {
    expect(() => assembleComprehensiveReportV4_1(
      acceptedSensitivitySections(),
      facts(),
    )).not.toThrow();
    expect(() => assembleComprehensiveReportV4_1(
      acceptedSensitivitySections(),
      facts(),
      "unknown" as never,
    )).toThrow("COMPREHENSIVE_REPORT_SECTION_INVALID");
  });
});

import { buildFacts } from "./comprehensive-report-test-facts.js";
import { teaserCyclesFor } from "./comprehensive-report-decadal-teasers.js";
import { REPORT_CONFIG_VERSION_V4_2_SECTIONED_BEGINNER } from "./identity-report-config.js";
import { projectComprehensiveReportPublicContentV3, ZiweiComprehensiveReportContentV3Schema } from "@lasoviet/contracts";

function beginnerFacts() {
  const value = buildFacts();
  if (value.timing.decadal.state !== "active") throw new Error("Expected active timing");
  value.timing.decadal.earthlyBranchId = "ziwei.branch.dragon";
  value.sourceSnapshot.asOfDate = "2026-09-15";
  return value;
}

describe("beginner teaser assembly and disclosure", () => {
  it("freezes cycle metadata and discloses prose only to Tier 2", () => {
    const chartFacts = beginnerFacts();
    const cycles = teaserCyclesFor(chartFacts);
    const teasers = cycles.map((cycle) => ({ ordinal: cycle.ordinal, narrative: "Chặng này cần kiên nhẫn.", evidenceKeys }));
    const report = assembleComprehensiveReportV4_1([...acceptedSensitivitySections(), { key: "decadalTeasers", value: teasers }], chartFacts, REPORT_CONFIG_VERSION_V4_2_SECTIONED_BEGINNER);
    expect(report.decadalTeasers).toEqual(cycles.map((cycle) => ({ ...cycle, narrative: "Chặng này cần kiên nhẫn.", evidenceKeys })));
    const publicContent = projectComprehensiveReportPublicContentV3(report, null);
    expect("decadalTeasers" in publicContent && publicContent.decadalTeasers?.length).toBe(7);
    expect(JSON.stringify(publicContent)).not.toContain("evidenceKeys");
    expect("decadalTeasers" in projectComprehensiveReportPublicContentV3(report, ["overview"])).toBe(false);
    expect(ZiweiComprehensiveReportContentV3Schema.safeParse({ ...report, decadalTeasers: [...report.decadalTeasers!, report.decadalTeasers![0]] }).success).toBe(false);
  });
  it("rejects missing, duplicate, reordered or forged teaser ordinals", () => {
    const chartFacts = beginnerFacts();
    const items = teaserCyclesFor(chartFacts).map((cycle) => ({ ordinal: cycle.ordinal, narrative: "Chặng này cần kiên nhẫn.", evidenceKeys }));
    for (const value of [items.slice(1), [...items].reverse(), items.map((item) => ({ ...item, ordinal: 0 }))]) {
      expect(() => assembleComprehensiveReportV4_1([...acceptedSensitivitySections(), { key: "decadalTeasers", value }], chartFacts, REPORT_CONFIG_VERSION_V4_2_SECTIONED_BEGINNER)).toThrow();
    }
  });

  it("assembles decadalTeasers when current ordinal is outside 0..7", () => {
    const chartFacts = beginnerFacts();
    chartFacts.timing.decadal = {
      ...chartFacts.timing.decadal,
      index: 8,
      ageRange: [82, 91] as [number, number],
      yearRange: [2082, 2091] as [number, number],
      earthlyBranchId: "ziwei.branch.dog",
    };
    const cycles = teaserCyclesFor(chartFacts);
    expect(cycles.map((c) => c.ordinal)).toEqual([4, 5, 6, 7, 9, 10, 11]);
    const teasers = cycles.map((cycle) => ({ ordinal: cycle.ordinal, narrative: "Chặng này cần kiên nhẫn.", evidenceKeys }));
    const baseSections = acceptedSensitivitySections().map((s) => {
      if ((s as any).key === "currentDecadal") {
        return {
          key: "currentDecadal",
          value: {
            ...narrative("Đại vận"),
            state: "active",
            index: 8,
            ageRange: [82, 91],
            yearRange: [2082, 2091],
          },
        };
      }
      return s;
    });
    const report = assembleComprehensiveReportV4_1([...baseSections, { key: "decadalTeasers", value: teasers }], chartFacts, REPORT_CONFIG_VERSION_V4_2_SECTIONED_BEGINNER);
    expect(report.decadalTeasers).toEqual(cycles.map((cycle) => ({ ...cycle, narrative: "Chặng này cần kiên nhẫn.", evidenceKeys })));
  });
});
