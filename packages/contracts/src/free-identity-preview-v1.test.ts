import { describe, expect, it } from "vitest";

import {
  FreeIdentityPreviewV1Schema,
  PaidTopicSelectionRequestV1Schema,
  PaidTopicSelectionViewV1Schema,
} from "./free-identity-preview-v1.js";
import { ZiweiChartViewV1Schema } from "./ziwei-view-v1.js";

const evidence = {
  evidenceId: "ziwei.identity.soul",
  factReferences: ["fact.soul"],
  confidence: "high",
  interpretationBounds: ["identity-only"],
  interpretationBoundCodes: ["reflective_identity_only"],
  limitations: ["birth-time-dependent"],
};

describe("free identity preview contracts", () => {
  it("requires three unique evidence-backed insights and literal 12 percent coverage", () => {
    const result = FreeIdentityPreviewV1Schema.safeParse({
      version: 1,
      chartId: "chart-1",
      chartVersionId: "chart-version-1",
      capabilityId: "ziwei.identity.p0",
      summaryVersion: "ziwei.identity.free.v1",
      insights: [
        { id: "soul", evidence },
        { id: "body", evidence: { ...evidence, evidenceId: "ziwei.identity.body" } },
        { id: "configuration", evidence: { ...evidence, evidenceId: "ziwei.identity.configuration" } },
      ],
      strengthSignal: { id: "soul-strength", evidence },
      tensionSignal: {
        id: "body-configuration-tension",
        evidence: [
          { ...evidence, evidenceId: "ziwei.identity.body" },
          { ...evidence, evidenceId: "ziwei.identity.configuration" },
        ],
      },
      paidPreview: {
        sku: "ZIWEI-IDENTITY-P0",
        sectionId: "personal_summary",
        coveragePercent: 12,
        evidence: [evidence],
      },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.insights[0]?.evidence.interpretationBoundCodes).toEqual([
        "reflective_identity_only",
      ]);
      expect(result.data.strengthSignal.evidence.interpretationBoundCodes).toEqual([
        "reflective_identity_only",
      ]);
      expect(result.data.tensionSignal.evidence[0]?.interpretationBoundCodes).toEqual([
        "reflective_identity_only",
      ]);
      expect(result.data.paidPreview.evidence[0]?.interpretationBoundCodes).toEqual([
        "reflective_identity_only",
      ]);
    }
    expect(FreeIdentityPreviewV1Schema.safeParse({
      ...result.data,
      insights: [result.data?.insights[0], result.data?.insights[0], result.data?.insights[2]],
    }).success).toBe(false);
    expect(FreeIdentityPreviewV1Schema.safeParse({
      ...result.data,
      paidPreview: { ...result.data?.paidPreview, coveragePercent: 15 },
    }).success).toBe(false);
    expect(FreeIdentityPreviewV1Schema.safeParse({
      ...result.data,
      strengthSignal: {
        ...result.data?.strengthSignal,
        evidence: { ...evidence, evidenceId: "ziwei.identity.foreign" },
      },
    }).success).toBe(false);
    expect(FreeIdentityPreviewV1Schema.safeParse({
      ...result.data,
      tensionSignal: {
        ...result.data?.tensionSignal,
        evidence: [
          { ...evidence, evidenceId: "ziwei.identity.body", factReferences: ["mismatched.fact"] },
          { ...evidence, evidenceId: "ziwei.identity.configuration" },
        ],
      },
    }).success).toBe(false);
    expect(FreeIdentityPreviewV1Schema.safeParse({
      ...result.data,
      paidPreview: {
        ...result.data?.paidPreview,
        evidence: [{ ...evidence, evidenceId: "ziwei.identity.body", factReferences: ["mismatched.fact"] }],
      },
    }).success).toBe(false);
  });

  it("preserves interpretationBoundCodes on evidence references", () => {
    const result = FreeIdentityPreviewV1Schema.safeParse({
      version: 1,
      chartId: "chart-1",
      chartVersionId: "chart-version-1",
      capabilityId: "ziwei.identity.p0",
      summaryVersion: "ziwei.identity.free.v1",
      insights: [
        { id: "soul", evidence },
        { id: "body", evidence: { ...evidence, evidenceId: "ziwei.identity.body" } },
        { id: "configuration", evidence: { ...evidence, evidenceId: "ziwei.identity.configuration" } },
      ],
      strengthSignal: { id: "soul-strength", evidence },
      tensionSignal: {
        id: "body-configuration-tension",
        evidence: [
          { ...evidence, evidenceId: "ziwei.identity.body" },
          { ...evidence, evidenceId: "ziwei.identity.configuration" },
        ],
      },
      paidPreview: {
        sku: "ZIWEI-IDENTITY-P0",
        sectionId: "personal_summary",
        coveragePercent: 12,
        evidence: [evidence],
      },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.insights[0]?.evidence.interpretationBoundCodes).toEqual([
        "reflective_identity_only",
      ]);
    }
  });

  const branches = [
    "ziwei.branch.rat",
    "ziwei.branch.ox",
    "ziwei.branch.tiger",
    "ziwei.branch.rabbit",
    "ziwei.branch.dragon",
    "ziwei.branch.snake",
    "ziwei.branch.horse",
    "ziwei.branch.goat",
    "ziwei.branch.monkey",
    "ziwei.branch.rooster",
    "ziwei.branch.dog",
    "ziwei.branch.pig",
  ] as const;

  it("requires birthSummary in ZiweiChartViewV1Schema", () => {
    const chart = {
      version: 1,
      systemId: "ziwei",
      palaces: [
        "life", "siblings", "spouse", "children", "wealth", "health",
        "travel", "friends", "career", "property", "fortune", "parents",
      ].map((name, index) => ({
        id: `ziwei.palace.${name}`,
        earthlyBranchId: branches[index]!,
        stars: [],
      })),
      transformations: [{ starId: "ziwei.star.wuqu", id: "ziwei.transformation.prosperity" }],
      soulPalaceId: "ziwei.palace.life",
      bodyPalaceId: "ziwei.palace.career",
      horoscopeCapabilities: [{ id: "ziwei.horoscope.annual", supported: true }],
      warnings: [],
      provenance: {
        version: 1,
        engineId: "ziwei.iztro",
        engineVersion: "2.6.0",
        adapterId: "ziwei.iztro-adapter",
        adapterVersion: "1",
        schemaId: "ziwei.chart.v1",
        ruleSetId: "ziwei.default",
        inputHash: "a".repeat(64),
        configHash: "b".repeat(64),
        rawSnapshotHash: "c".repeat(64),
        calculatedAt: "2026-09-02T00:00:00+00:00",
        limitations: ["IZTRO_NO_TRUE_SOLAR_TIME_CORRECTION"],
      },
    };
    const evidenceIndex = {
      version: 1,
      evidenceSetId: "evidence-set-1",
      capabilityId: "ziwei.identity.p0",
      chartVersionId: "chart-version-1",
      ruleVersion: "ziwei.identity.v1",
      itemIds: ["ziwei.identity.soul", "ziwei.identity.body", "ziwei.identity.configuration"],
    };

    const withoutSummary = ZiweiChartViewV1Schema.safeParse({
      version: 1,
      chartId: "chart-1",
      chartVersionId: "chart-version-1",
      chart,
      evidenceIndex,
    });
    expect(withoutSummary.success).toBe(false);

    const withSummary = ZiweiChartViewV1Schema.safeParse({
      version: 1,
      chartId: "chart-1",
      chartVersionId: "chart-version-1",
      chart,
      evidenceIndex,
      birthSummary: {
        normalizedCalendar: { kind: "solar", date: "2000-01-01" },
        normalizedTime: { precision: "exact_minute", localTime: "12:00" },
        timezoneProvenance: { source: "offset", offsetMinutes: 420 },
        gender: "male",
      },
    });
    expect(withSummary.success).toBe(true);
  });

  it("allows only the identity topic request and one catalog-backed VND offer", () => {
    expect(PaidTopicSelectionRequestV1Schema.safeParse({
      sku: "ZIWEI-IDENTITY-P0",
    }).success).toBe(true);
    expect(PaidTopicSelectionRequestV1Schema.safeParse({
      sku: "ZIWEI-RELATIONSHIP-P0",
    }).success).toBe(false);
    expect(PaidTopicSelectionViewV1Schema.safeParse({
      version: 1,
      chartId: "chart-1",
      chartVersionId: "chart-version-1",
      offers: [{
        sku: "ZIWEI-IDENTITY-P0",
        method: "ziwei",
        price: 79000,
        currency: "VND",
        sections: ["personal_summary"],
      }],
    }).success).toBe(true);
  });
});
