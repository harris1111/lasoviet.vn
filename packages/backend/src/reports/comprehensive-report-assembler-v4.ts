import {
  ZIWEI_PALACE_IDS,
  ZIWEI_THEMATIC_SYNTHESIS_IDS,
  ZiweiComprehensiveReportContentV2Schema,
  type ZiweiComprehensiveReportContentV2,
  type ZiweiPalaceId,
  type ZiweiThematicSynthesisId,
} from "@lasoviet/contracts";

import {
  CANONICAL_COMPREHENSIVE_SECTION_TITLES,
  CANONICAL_PALACE_TITLES_VI,
  CANONICAL_THEMATIC_TITLES_VI,
} from "./identity-report-config.js";
import type { ComprehensiveZiweiFactsV4 } from "./comprehensive-ziwei-facts-v4.js";
import {
  parseCompleteComprehensiveReportAcceptedSections,
  type ComprehensiveReportAcceptedSection,
} from "./comprehensive-report-section-v4.js";
import { normalizeComprehensiveReportModelProse } from "./comprehensive-report-writer.js";

function fail(): never {
  throw new Error("COMPREHENSIVE_REPORT_ASSEMBLER_INVALID");
}

function sectionMap(sections: readonly ComprehensiveReportAcceptedSection[]) {
  return new Map(sections.map((section) => [section.key, section]));
}

function getSection(
  sections: Map<string, ComprehensiveReportAcceptedSection>,
  key: ComprehensiveReportAcceptedSection["key"],
): ComprehensiveReportAcceptedSection {
  return sections.get(key) ?? fail();
}

function sameRange(left: readonly number[], right: readonly number[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function timingMatchesFacts(
  currentDecadal: Extract<ComprehensiveReportAcceptedSection, { key: "currentDecadal" }>["value"],
  annualSnapshot: Extract<ComprehensiveReportAcceptedSection, { key: "annualSnapshot" }>["value"],
  facts: ComprehensiveZiweiFactsV4,
): boolean {
  const decadal = facts.timing.decadal;
  if (currentDecadal.state !== decadal.state) return false;
  if (decadal.state === "active") {
    if (
      currentDecadal.state !== "active" ||
      currentDecadal.index !== decadal.index ||
      !sameRange(currentDecadal.ageRange, decadal.ageRange) ||
      !sameRange(currentDecadal.yearRange, decadal.yearRange)
    ) return false;
  } else if (
    currentDecadal.state !== "not_started" ||
    currentDecadal.firstCycleStartAge !== decadal.firstCycleStartAge ||
    currentDecadal.firstCycleStartYear !== decadal.firstCycleStartYear
  ) return false;

  return annualSnapshot.targetYear === facts.timing.annual.targetYear &&
    annualSnapshot.asOfDate === facts.sourceSnapshot.asOfDate;
}

export function assembleComprehensiveReportV4(
  source: readonly unknown[],
  facts: ComprehensiveZiweiFactsV4,
): ZiweiComprehensiveReportContentV2 {
  const sections = sectionMap(parseCompleteComprehensiveReportAcceptedSections(source));
  const overview = getSection(sections, "overview");
  const coreAxis = getSection(sections, "coreAxis");
  const keyConfigurations = getSection(sections, "keyConfigurations");
  const strengthsAndTensions = getSection(sections, "strengthsAndTensions");
  const currentDecadal = getSection(sections, "currentDecadal");
  const annualSnapshot = getSection(sections, "annualSnapshot");
  const practicalDirection = getSection(sections, "practicalDirection");

  if (
    overview.key !== "overview" ||
    coreAxis.key !== "coreAxis" ||
    keyConfigurations.key !== "keyConfigurations" ||
    strengthsAndTensions.key !== "strengthsAndTensions" ||
    currentDecadal.key !== "currentDecadal" ||
    annualSnapshot.key !== "annualSnapshot" ||
    practicalDirection.key !== "practicalDirection"
  ) fail();
  if (!timingMatchesFacts(currentDecadal.value, annualSnapshot.value, facts)) fail();

  const palaceReadings = ZIWEI_PALACE_IDS.map((palaceId: ZiweiPalaceId) => {
    const section = getSection(sections, `palace:${palaceId}` as const);
    if (!section.key.startsWith("palace:")) fail();
    const value = section.value as Extract<ComprehensiveReportAcceptedSection, { key: `palace:${ZiweiPalaceId}` }>["value"];
    return {
      palaceId,
      title: CANONICAL_PALACE_TITLES_VI[palaceId],
      narrative: normalizeComprehensiveReportModelProse(value.narrative),
      evidenceKeys: [...value.evidenceKeys],
    };
  });

  const thematicSynthesis = ZIWEI_THEMATIC_SYNTHESIS_IDS.map((id: ZiweiThematicSynthesisId) => {
    const section = getSection(sections, `thematic:${id}` as const);
    if (!section.key.startsWith("thematic:")) fail();
    const value = section.value as Extract<ComprehensiveReportAcceptedSection, { key: `thematic:${ZiweiThematicSynthesisId}` }>["value"];
    return {
      id,
      title: CANONICAL_THEMATIC_TITLES_VI[id],
      narrative: normalizeComprehensiveReportModelProse(value.narrative),
      evidenceKeys: [...value.evidenceKeys],
    };
  });

  const decadal = facts.timing.decadal.state === "active"
    ? {
        title: currentDecadal.value.title,
        state: "active" as const,
        index: facts.timing.decadal.index,
        ageRange: [...facts.timing.decadal.ageRange] as [number, number],
        yearRange: [...facts.timing.decadal.yearRange] as [number, number],
        narrative: normalizeComprehensiveReportModelProse(currentDecadal.value.narrative),
        evidenceKeys: [...currentDecadal.value.evidenceKeys],
      }
    : {
        title: currentDecadal.value.title,
        state: "not_started" as const,
        firstCycleStartAge: facts.timing.decadal.firstCycleStartAge,
        firstCycleStartYear: facts.timing.decadal.firstCycleStartYear,
        narrative: normalizeComprehensiveReportModelProse(currentDecadal.value.narrative),
        evidenceKeys: [...currentDecadal.value.evidenceKeys],
      };

  const report = {
    overview: {
      title: CANONICAL_COMPREHENSIVE_SECTION_TITLES.overview,
      narrative: normalizeComprehensiveReportModelProse(overview.value.narrative),
      evidenceKeys: [...overview.value.evidenceKeys],
    },
    coreAxis: {
      title: CANONICAL_COMPREHENSIVE_SECTION_TITLES.coreAxis,
      narrative: normalizeComprehensiveReportModelProse(coreAxis.value.narrative),
      evidenceKeys: [...coreAxis.value.evidenceKeys],
    },
    keyConfigurations: (keyConfigurations.value as ZiweiComprehensiveReportContentV2["keyConfigurations"]).map((item) => ({
      title: normalizeComprehensiveReportModelProse(item.title),
      narrative: normalizeComprehensiveReportModelProse(item.narrative),
      evidenceKeys: [...item.evidenceKeys],
    })),
    palaceReadings,
    thematicSynthesis,
    strengthsAndTensions: {
      title: CANONICAL_COMPREHENSIVE_SECTION_TITLES.strengthsAndTensions,
      narrative: normalizeComprehensiveReportModelProse(strengthsAndTensions.value.narrative),
      evidenceKeys: [...strengthsAndTensions.value.evidenceKeys],
    },
    currentDecadal: decadal,
    annualSnapshot: {
      title: annualSnapshot.value.title,
      targetYear: facts.timing.annual.targetYear,
      asOfDate: facts.sourceSnapshot.asOfDate,
      narrative: normalizeComprehensiveReportModelProse(annualSnapshot.value.narrative),
      evidenceKeys: [...annualSnapshot.value.evidenceKeys],
    },
    practicalDirection: (practicalDirection.value as ZiweiComprehensiveReportContentV2["practicalDirection"]).map((item) => ({
      recommendation: normalizeComprehensiveReportModelProse(item.recommendation),
      rationale: normalizeComprehensiveReportModelProse(item.rationale),
      avoid: normalizeComprehensiveReportModelProse(item.avoid),
      evidenceKeys: [...item.evidenceKeys],
    })),
  };

  const parsed = ZiweiComprehensiveReportContentV2Schema.safeParse(report);
  if (!parsed.success) fail();
  return parsed.data;
}
