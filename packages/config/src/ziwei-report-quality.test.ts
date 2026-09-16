import { describe, expect, it } from "vitest";

import {
  resolveZiweiReportQualityConfig,
  resolveZiweiReportQualitySectionThreshold,
  validateZiweiReportQualityConfig,
  ziweiComprehensiveReportQualityV1,
  ziweiComprehensiveReportQualityV2Sensitivity,
} from "./ziwei-report-quality.js";

function source() {
  return structuredClone(ziweiComprehensiveReportQualityV1);
}

describe("ziwei comprehensive report quality config", () => {
  it("loads every section threshold and immutable bounded limit", () => {
    const config = ziweiComprehensiveReportQualityV1;
    expect(config.version).toBe("ziwei.comprehensive.quality.v1");
    expect(config.reportConfigVersion).toBe("ziwei.comprehensive.report.v4.1-sectioned");
    expect(Object.keys(config.sections)).toEqual([
      "overview", "coreAxis", "keyConfigurations", "palace", "thematic",
      "strengthsAndTensions", "currentDecadal", "annualSnapshot", "practicalAction",
    ]);
    for (const section of Object.values(config.sections)) {
      expect(Object.isFrozen(section)).toBe(true);
      expect(section.minimumSyllables).toBeLessThanOrEqual(section.targetMinimumSyllables);
      expect(section.targetMinimumSyllables).toBeLessThanOrEqual(section.targetMaximumSyllables);
      expect(section.maxOutputTokens).toBeGreaterThan(0);
    }
    expect(config).toMatchObject({
      maxProperNamesPer100Syllables: 8,
      minimumPalaceStars: 2,
      minimumEvidenceAnchors: 2,
      generationAttemptCap: 3,
      sectionRewriteCap: 1,
      providerConcurrency: 2,
      digestMaxEntries: 32,
      digestMaxChars: 8000,
      retrievalMaxPassages: 6,
      retrievalMaxChars: 4000,
    });
    expect(Object.isFrozen(config)).toBe(true);
    expect(Object.isFrozen(config.sections)).toBe(true);
    expect(Object.isFrozen(config.discouragedTerms)).toBe(true);
  });

  it("keeps every required vocabulary list non-empty and rejects NFC/case duplicates", () => {
    const config = ziweiComprehensiveReportQualityV1;
    for (const list of [
      config.discouragedTerms, config.deathTerms, config.certaintyPhrases,
      config.misfortuneTerms, config.adverseDatePatterns, config.preparationIndicators,
      config.properNames,
    ]) expect(list.length).toBeGreaterThan(0);

    for (const key of [
      "discouragedTerms", "deathTerms", "certaintyPhrases", "misfortuneTerms",
      "adverseDatePatterns", "preparationIndicators", "properNames",
    ] as const) {
      const duplicate = source();
      duplicate[key] = [...duplicate[key], duplicate[key][0]!.toUpperCase()] as never;
      expect(() => validateZiweiReportQualityConfig(duplicate)).toThrow("ZIWEI_REPORT_QUALITY_INVALID");
    }
  });

  it("rejects invalid caps, malformed patterns, unknown fields, and section thresholds", () => {
    const invalidCap = source();
    invalidCap.providerConcurrency = 0;
    expect(() => validateZiweiReportQualityConfig(invalidCap)).toThrow("ZIWEI_REPORT_QUALITY_INVALID");

    const invalidPattern = source();
    invalidPattern.adverseDatePatterns = ["["];
    expect(() => validateZiweiReportQualityConfig(invalidPattern)).toThrow("ZIWEI_REPORT_QUALITY_INVALID");

    const invalidThreshold = source();
    invalidThreshold.sections.overview.targetMinimumSyllables = 500;
    expect(() => validateZiweiReportQualityConfig(invalidThreshold)).toThrow("ZIWEI_REPORT_QUALITY_INVALID");

    const unknown = { ...source(), unexpected: true };
    expect(() => validateZiweiReportQualityConfig(unknown)).toThrow("ZIWEI_REPORT_QUALITY_INVALID");
  });

  it("returns only the canonical deep-frozen V1 config for the exact report and quality pair", () => {
    expect(
      resolveZiweiReportQualityConfig(
        "ziwei.comprehensive.report.v4.1-sectioned",
        "ziwei.comprehensive.quality.v1",
      ),
    ).toBe(ziweiComprehensiveReportQualityV1);

    expect(() => {
      (ziweiComprehensiveReportQualityV1.sections.overview as { minimumSyllables: number }).minimumSyllables = 1;
    }).toThrow(TypeError);
    expect(() => {
      (ziweiComprehensiveReportQualityV1.discouragedTerms as string[]).push("injected");
    }).toThrow(TypeError);
    expect(ziweiComprehensiveReportQualityV1.sections.overview.minimumSyllables).toBe(600);
    expect(ziweiComprehensiveReportQualityV1.discouragedTerms).not.toContain("injected");
  });

  it("loads and resolves the immutable V2 sensitivity pair only", () => {
    const config = ziweiComprehensiveReportQualityV2Sensitivity;
    expect(config.version).toBe("ziwei.comprehensive.quality.v2-sensitivity");
    expect(config.reportConfigVersion).toBe(
      "ziwei.comprehensive.report.v4.1-sectioned-sensitivity",
    );
    expect(config.sections.birthTimeSensitivity).toEqual({
      minimumSyllables: 300,
      targetMinimumSyllables: 400,
      targetMaximumSyllables: 600,
      maxOutputTokens: 1800,
    });
    expect(Object.isFrozen(config)).toBe(true);
    expect(Object.isFrozen(config.sections.birthTimeSensitivity)).toBe(true);
    expect(
      resolveZiweiReportQualityConfig(
        "ziwei.comprehensive.report.v4.1-sectioned-sensitivity",
        "ziwei.comprehensive.quality.v2-sensitivity",
      ),
    ).toBe(config);
    expect(
      resolveZiweiReportQualitySectionThreshold(
        "ziwei.comprehensive.report.v4.1-sectioned-sensitivity",
        "ziwei.comprehensive.quality.v2-sensitivity",
        "birthTimeSensitivity",
      ),
    ).toEqual(config.sections.birthTimeSensitivity);
    expect(() =>
      resolveZiweiReportQualitySectionThreshold(
        "ziwei.comprehensive.report.v4.1-sectioned",
        "ziwei.comprehensive.quality.v1",
        "birthTimeSensitivity",
      ),
    ).toThrow("ZIWEI_REPORT_QUALITY_SECTION_UNAVAILABLE");
  });

  it("fails closed for unknown, remapped, or injected alternate configs", () => {
    expect(() => resolveZiweiReportQualityConfig("unknown", "ziwei.comprehensive.quality.v1")).toThrow("ZIWEI_REPORT_QUALITY_VERSION_MISMATCH");
    expect(() => resolveZiweiReportQualityConfig("ziwei.comprehensive.report.v4.1-sectioned", "unknown")).toThrow("ZIWEI_REPORT_QUALITY_VERSION_MISMATCH");
    expect(() => resolveZiweiReportQualityConfig(
      "ziwei.comprehensive.report.v4.1-sectioned",
      "ziwei.comprehensive.quality.v2-sensitivity",
    )).toThrow("ZIWEI_REPORT_QUALITY_VERSION_MISMATCH");
    expect(() => resolveZiweiReportQualityConfig(
      "ziwei.comprehensive.report.v4.1-sectioned-sensitivity",
      "ziwei.comprehensive.quality.v1",
    )).toThrow("ZIWEI_REPORT_QUALITY_VERSION_MISMATCH");
    const remapped = source();
    remapped.reportConfigVersion = "ziwei.comprehensive.report.v4.0" as never;
    expect(() => validateZiweiReportQualityConfig(remapped)).toThrow("ZIWEI_REPORT_QUALITY_INVALID");
    expect(() => (
      resolveZiweiReportQualityConfig as unknown as (
        reportConfigVersion: string,
        qualityVersion: string,
        alternate: unknown,
      ) => ZiweiReportQualityConfig
    )(
      "ziwei.comprehensive.report.v4.1-sectioned",
      "ziwei.comprehensive.quality.v1",
      { ...source(), sections: { ...source().sections, overview: { ...source().sections.overview, minimumSyllables: 1 } } },
    )).not.toThrow();
    expect(
      resolveZiweiReportQualityConfig(
        "ziwei.comprehensive.report.v4.1-sectioned",
        "ziwei.comprehensive.quality.v1",
      ).sections.overview.minimumSyllables,
    ).toBe(600);
  });
});
