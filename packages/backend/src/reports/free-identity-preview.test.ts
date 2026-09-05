import { describe, expect, it } from "vitest";

import type { NormalizedZiweiChartV1 } from "@lasoviet/contracts";

import { buildZiweiIdentityEvidence } from "../evidence/ziwei-identity-rules.js";
import { buildFreeIdentityPreview } from "./free-identity-preview.js";

const item = (id: string) => ({
  id,
  factReferences: [`fact.${id}`],
  confidence: "high" as const,
  interpretationBounds: ["identity-only"],
  interpretationBoundCodes: ["reflective_identity_only"],
  limitations: ["birth-time-dependent"],
  riskTags: ["identity" as const],
  allowedActionCategories: ["reflect" as const],
});

describe("free identity preview builder", () => {
  it("builds three evidence-linked insights, linked strength/tension, and 12 percent paid coverage", () => {
    const result = buildFreeIdentityPreview({
      chartId: "chart-1",
      chartVersionId: "chart-version-1",
      evidence: [
        item("ziwei.identity.life-palace"),
        item("ziwei.identity.body-palace"),
        item("ziwei.identity.transformations"),
      ],
    });

    expect(result).toMatchObject({
      ok: true,
      value: {
        insights: { length: 3 },
        strengthSignal: { evidence: { evidenceId: "ziwei.identity.life-palace" } },
        tensionSignal: { evidence: { length: 2 } },
        paidPreview: { coveragePercent: 12, sku: "ZIWEI-IDENTITY-P0" },
      },
    });
    if (result.ok) {
      expect(result.value.insights.map((insight) => insight.evidence.evidenceId)).toEqual([
        "ziwei.identity.life-palace",
        "ziwei.identity.body-palace",
        "ziwei.identity.transformations",
      ]);
    }
  });

  it.each([
    [[item("ziwei.identity.life-palace"), item("ziwei.identity.body-palace")]],
    [[item("ziwei.identity.life-palace"), item("ziwei.identity.body-palace"), item("ziwei.identity.body-palace")]],
  ])("returns insufficient evidence for missing or duplicate canonical items", (evidence) => {
    expect(buildFreeIdentityPreview({
      chartId: "chart-1",
      chartVersionId: "chart-version-1",
      evidence,
    })).toMatchObject({ ok: false, error: { code: "INSUFFICIENT_EVIDENCE" } });
  });

  it("maps persisted Zi Wei evidence into stable insight categories", () => {
    const chart: NormalizedZiweiChartV1 = {
      version: 1,
      systemId: "ziwei",
      palaces: [
        "life", "siblings", "spouse", "children", "wealth", "health",
        "travel", "friends", "career", "property", "fortune", "parents",
      ].map((id) => ({
        id: `ziwei.palace.${id}` as NormalizedZiweiChartV1["palaces"][number]["id"],
        earthlyBranchId: "ziwei.branch.tiger",
        stars: [],
      })),
      transformations: [{
        starId: "ziwei.star.wuqu",
        id: "ziwei.transformation.prosperity",
      }],
      soulPalaceId: "ziwei.palace.life",
      bodyPalaceId: "ziwei.palace.career",
      horoscopeCapabilities: [{ id: "ziwei.horoscope.annual", supported: true }],
      warnings: [],
      provenance: {
        version: 1, engineId: "ziwei.iztro", engineVersion: "2.6.0",
        adapterId: "ziwei.iztro-adapter", adapterVersion: "1",
        schemaId: "ziwei.chart.v1", ruleSetId: "ziwei.default",
        inputHash: "a".repeat(64), configHash: "b".repeat(64),
        rawSnapshotHash: "c".repeat(64),
        calculatedAt: "2026-09-02T00:00:00+00:00",
        limitations: ["IZTRO_NO_TRUE_SOLAR_TIME_CORRECTION"],
      },
    };
    const evidence = buildZiweiIdentityEvidence(chart, "chart-version-1");
    expect(evidence).toMatchObject({ ok: true });
    if (!evidence.ok) return;

    const preview = buildFreeIdentityPreview({
      chartId: "chart-1",
      chartVersionId: "chart-version-1",
      evidence: evidence.value.items,
    });

    expect(preview).toMatchObject({
      ok: true,
      value: {
        insights: [
          { id: "life-palace", evidence: { evidenceId: "ziwei.identity.life-palace" } },
          { id: "body-palace", evidence: { evidenceId: "ziwei.identity.body-palace" } },
          { id: "transformations", evidence: { evidenceId: "ziwei.identity.transformations" } },
        ],
      },
    });
  });
});
