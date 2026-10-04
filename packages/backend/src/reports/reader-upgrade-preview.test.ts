import {describe, expect, it} from "vitest";
import {
  ReportUpgradePreviewV1Schema, ZIWEI_PALACE_IDS, ZIWEI_THEMATIC_SYNTHESIS_IDS,
  ZiweiComprehensiveReportContentV1Schema, ZiweiComprehensiveReportContentV2Schema,
  ZiweiComprehensiveReportContentV3Schema,
} from "@lasoviet/contracts";
import {buildReaderUpgradePreview} from "./reader-upgrade-preview.js";

const opening = "This immutable source sentence is deliberately long enough to form an actual preview.";
function stored() {
  const part = (title: string) => ({title, narrative: opening + " Hidden meaningful remaining prose with several distinct source words. ".repeat(8), evidenceKeys: ["ziwei.palace.life"]});
  return ZiweiComprehensiveReportContentV3Schema.parse({
    overview: part("Overview"), coreAxis: part("Core"), keyConfigurations: [part("Configuration")],
    palaceReadings: ZIWEI_PALACE_IDS.map(palaceId => ({...part("Stored " + palaceId), palaceId})),
    thematicSynthesis: ZIWEI_THEMATIC_SYNTHESIS_IDS.map(id => ({...part(id), id})),
    strengthsAndTensions: part("Strengths"),
    currentDecadal: {...part("Decadal"), state: "active", index: 2, ageRange: [25, 34], yearRange: [2020, 2029]},
    annualSnapshot: {...part("Annual"), targetYear: 2026, asOfDate: "2026-10-04"},
    practicalDirection: [1, 2, 3].map(() => ({recommendation: "Reflect on this source.", rationale: "Deterministic test fixture.", avoid: "No quality acceptance claim.", evidenceKeys: ["ziwei.palace.life"]})),
    birthTimeSensitivity: {title: "Sensitivity", stableFactors: part("Stable"), sensitiveFactors: part("Sensitive")},
  });
}
const binding = {reportVersionId: "report-version-1", chartVersionId: "chart-version-1", locale: "vi" as const};
const excerpt = (content: ReturnType<typeof stored>) => ({overview: content.overview, coreAxis: content.coreAxis,
  strengthsAndTensions: content.strengthsAndTensions, practicalDirection: content.practicalDirection});

describe("authorized immutable upgrade source", () => {
  it("counts actual combined projection and previews a still-locked palace only", () => {
    const content = stored();
    const view = buildReaderUpgradePreview({...binding, stored: content, projected: {...excerpt(content), palaceReadings: content.palaceReadings.slice(0, 2)}})!;
    expect(view.coverage).toEqual({openedSections: 4, lockedSections: 5, openedPalaces: 2, lockedPalaces: 10});
    expect(view.lockedPart).toMatchObject({palaceId: content.palaceReadings[2]!.palaceId, title: content.palaceReadings[2]!.title, clippedSentences: [opening + "…"]});
    expect(JSON.stringify(view)).not.toContain("Hidden meaningful remaining prose");
  });
  it("retains separate palace coverage without treating a partial group as an open section", () => {
    const content = stored();
    expect(buildReaderUpgradePreview({...binding, stored: content, projected: {palaceReadings: content.palaceReadings.slice(0, 1)}})?.coverage)
      .toEqual({openedSections: 0, lockedSections: 9, openedPalaces: 1, lockedPalaces: 11});
  });
  it("omits previews when the whole stored report is already readable", () => {
    const content = stored(), view = buildReaderUpgradePreview({...binding, stored: content, projected: content})!;
    expect(view.coverage).toEqual({openedSections: 9, lockedSections: 0, openedPalaces: 12, lockedPalaces: 0});
    expect(view.lockedPart).toBeUndefined();
  });
  it("counts only six/eight/nine sections present in the actual version family", () => {
    const content = stored();
    const v4 = ZiweiComprehensiveReportContentV2Schema.parse(Object.fromEntries(Object.entries(content).filter(([key]) => key !== "birthTimeSensitivity")));
    const v3 = ZiweiComprehensiveReportContentV1Schema.parse({...Object.fromEntries(Object.entries(content).filter(([key]) => !["birthTimeSensitivity", "currentDecadal", "annualSnapshot"].includes(key))), practicalDirection: ["Reflect.", "Observe.", "Review."]});
    for (const [source, locked] of [[v3, 2], [v4, 4], [content, 5]] as const) {
      expect(buildReaderUpgradePreview({...binding, stored: source, projected: excerpt(content)})?.coverage.lockedSections).toBe(locked);
    }
  });
  for (const [name, narrative] of [["short source", "All meaningful prose."], ["whitespace padding", opening + " ".repeat(100) + "."], ["punctuation padding", opening + " !!! ".repeat(30)], ["numeric padding", opening + " 12345 ".repeat(30)], ["many tiny sentences", "Short. Tiny. " + "Hidden source remains here. ".repeat(15)]] as const) {
    it("omits " + name + " without inventing a source", () => {
      const content = stored(); content.palaceReadings.forEach(item => {item.narrative = narrative;});
      const view = buildReaderUpgradePreview({...binding, stored: content, projected: excerpt(content)})!;
      expect(view.lockedPart).toBeUndefined();
      expect(view.coverage.lockedPalaces).toBe(12);
    });
  }
  it("clips a long Unicode source without splitting a surrogate or returning its remaining prose", () => {
    const content = stored(); content.palaceReadings[0]!.narrative = "🙂".repeat(66) + " actual long source beginning with words ".repeat(20);
    const view = buildReaderUpgradePreview({...binding, stored: content, projected: excerpt(content)})!;
    const clipped = view.lockedPart!.clippedSentences[0]!;
    expect(clipped.length).toBeLessThanOrEqual(201);
    expect(content.palaceReadings[0]!.narrative.startsWith(clipped.slice(0, -1))).toBe(true);
    expect(/[\uD800-\uDBFF]$/u.test(clipped.slice(0, -1))).toBe(false);
  });
  it("omits coverage rather than inventing it from duplicate or foreign source palace IDs", () => {
    const content = stored(); content.palaceReadings[1]!.palaceId = content.palaceReadings[0]!.palaceId;
    expect(buildReaderUpgradePreview({...binding, stored: content, projected: excerpt(content)})).toBeUndefined();
    const valid = stored();
    expect(buildReaderUpgradePreview({...binding, stored: valid, projected: {palaceReadings: [{palaceId: "foreign"}]}})).toBeUndefined();
  });
  it("rejects full-source extra fields and impossible coverage at the contract boundary", () => {
    const content = stored(), view = buildReaderUpgradePreview({...binding, stored: content, projected: excerpt(content)})!;
    expect(ReportUpgradePreviewV1Schema.safeParse({...view, lockedPart: {...view.lockedPart, fullNarrative: content.palaceReadings[0]!.narrative}}).success).toBe(false);
    expect(ReportUpgradePreviewV1Schema.safeParse({...view, coverage: {...view.coverage, openedSections: 9, lockedSections: 5}}).success).toBe(false);
  });
});
