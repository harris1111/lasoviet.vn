import { describe, expect, it } from "vitest";

import {
  resolveZiweiReportQualityConfig,
  resolveZiweiReportQualitySectionThreshold,
  validateZiweiReportQualityConfig,
  ziweiComprehensiveReportQualityV1,
  ziweiComprehensiveReportQualityV2_2Sensitivity,
  ziweiComprehensiveReportQualityV2_1Sensitivity,
  ziweiComprehensiveReportQualityV2Sensitivity,
  ziweiComprehensiveReportQualityV2_3Sensitivity,
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

  it("keeps the V2.1 tuple immutable", () => {
    const oldConfig = ziweiComprehensiveReportQualityV2Sensitivity;
    const newConfig = ziweiComprehensiveReportQualityV2_1Sensitivity;
    expect(newConfig.version).toBe("ziwei.comprehensive.quality.v2.1-sensitivity");
    expect(newConfig.maxProperNamesPer100Syllables).toBe(8);
    expect(newConfig.reportConfigVersion).toBe(
      "ziwei.comprehensive.report.v4.1.1-sectioned-sensitivity",
    );
    expect(newConfig.sections.thematic.maxOutputTokens).toBe(3500);
    expect(oldConfig.sections.thematic.maxOutputTokens).toBe(2500);
    expect(newConfig.sectionRewriteCap).toBe(2);
    expect(oldConfig.sectionRewriteCap).toBe(1);
    expect(ziweiComprehensiveReportQualityV1.sectionRewriteCap).toBe(1);

    const oldComparable = structuredClone(oldConfig) as Record<string, unknown>;
    const newComparable = structuredClone(newConfig) as Record<string, unknown>;
    delete oldComparable.version;
    delete oldComparable.reportConfigVersion;
    delete newComparable.version;
    delete newComparable.reportConfigVersion;
    (
      newComparable.sections as typeof newConfig.sections
    ).thematic.maxOutputTokens = oldConfig.sections.thematic.maxOutputTokens;
    newComparable.sectionRewriteCap = oldConfig.sectionRewriteCap;
    newComparable.maxProperNamesPer100Syllables = oldConfig.maxProperNamesPer100Syllables;
    expect(newComparable).toEqual(oldComparable);
    expect(
      resolveZiweiReportQualityConfig(newConfig.reportConfigVersion, newConfig.version),
    ).toBe(newConfig);
  });

  it("adds V2.2 with a moderate proper-name density increase", () => {
    const config = ziweiComprehensiveReportQualityV2_2Sensitivity;
    expect(config.version).toBe("ziwei.comprehensive.quality.v2.2-sensitivity");
    expect(config.reportConfigVersion).toBe(
      "ziwei.comprehensive.report.v4.1.1-sectioned-sensitivity",
    );
    expect(config.maxProperNamesPer100Syllables).toBe(10);
    expect(
      resolveZiweiReportQualityConfig(config.reportConfigVersion, config.version),
    ).toBe(config);
    expect(
      resolveZiweiReportQualitySectionThreshold(
        config.reportConfigVersion,
        config.version,
        "coreAxis",
      ),
    ).toEqual(config.sections.coreAxis);
  });

  it("loads V2.3 as the active lineage with the density gate disabled in the validator", () => {
    const config = ziweiComprehensiveReportQualityV2_3Sensitivity;
    expect(config.version).toBe("ziwei.comprehensive.quality.v2.3-sensitivity");
    expect(config.reportConfigVersion).toBe(
      "ziwei.comprehensive.report.v4.1.1-sectioned-sensitivity",
    );
    expect(config).not.toHaveProperty("properNames");
    expect(config).not.toHaveProperty("maxProperNamesPer100Syllables");
    expect(
      resolveZiweiReportQualityConfig(config.reportConfigVersion, config.version),
    ).toBe(config);
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
    expect(() => resolveZiweiReportQualityConfig(
      "ziwei.comprehensive.report.v4.1-sectioned-sensitivity",
      "ziwei.comprehensive.quality.v2.1-sensitivity",
    )).toThrow("ZIWEI_REPORT_QUALITY_VERSION_MISMATCH");
    expect(() => resolveZiweiReportQualityConfig(
      "ziwei.comprehensive.report.v4.1.1-sectioned-sensitivity",
      "ziwei.comprehensive.quality.v2-sensitivity",
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
