import { describe, expect, it } from "vitest";

import { buildFreeIdentityPreview } from "./free-identity-preview.js";

const item = (id: string) => ({
  id,
  factReferences: [`fact.${id}`],
  confidence: "high" as const,
  interpretationBounds: ["identity-only"],
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
        item("ziwei.identity.soul"),
        item("ziwei.identity.body"),
        item("ziwei.identity.configuration"),
      ],
    });

    expect(result).toMatchObject({
      ok: true,
      value: {
        insights: { length: 3 },
        strengthSignal: { evidence: { evidenceId: "ziwei.identity.soul" } },
        tensionSignal: { evidence: { length: 2 } },
        paidPreview: { coveragePercent: 12, sku: "ZIWEI-IDENTITY-P0" },
      },
    });
    if (result.ok) {
      expect(result.value.insights.map((insight) => insight.evidence.evidenceId)).toEqual([
        "ziwei.identity.soul",
        "ziwei.identity.body",
        "ziwei.identity.configuration",
      ]);
    }
  });

  it.each([
    [[item("ziwei.identity.soul"), item("ziwei.identity.body")]],
    [[item("ziwei.identity.soul"), item("ziwei.identity.body"), item("ziwei.identity.body")]],
  ])("returns insufficient evidence for missing or duplicate canonical items", (evidence) => {
    expect(buildFreeIdentityPreview({
      chartId: "chart-1",
      chartVersionId: "chart-version-1",
      evidence,
    })).toMatchObject({ ok: false, error: { code: "INSUFFICIENT_EVIDENCE" } });
  });
});
