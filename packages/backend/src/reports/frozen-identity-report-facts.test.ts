import { describe, expect, it } from "vitest";

import type { NormalizedZiweiChartV1 } from "@lasoviet/contracts";

import { buildZiweiIdentityEvidence } from "../evidence/ziwei-identity-rules.js";
import { buildFrozenIdentityReportFacts } from "./frozen-identity-report-facts.js";

const palaceIds = [
  "life", "siblings", "spouse", "children", "wealth", "health",
  "travel", "friends", "career", "property", "fortune", "parents",
] as const;

function chart(): NormalizedZiweiChartV1 {
  return {
    version: 1,
    systemId: "ziwei",
    palaces: palaceIds.map((id) => ({
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
      rawSnapshotHash: "c".repeat(64), calculatedAt: "2026-09-02T00:00:00Z",
      limitations: [],
    },
  };
}

describe("frozen identity report facts", () => {
  it("builds a PII-free production-shaped snapshot from chart and generated evidence", () => {
    const sourceChart = chart();
    const evidence = buildZiweiIdentityEvidence(sourceChart, "chart-version-1");
    expect(evidence).toMatchObject({ ok: true });
    if (!evidence.ok) return;

    expect(buildFrozenIdentityReportFacts(sourceChart, evidence.value)).toEqual({
      ok: true,
      value: expect.objectContaining({
        chartVersionId: "chart-version-1",
        facts: expect.objectContaining({
          transformations: [{
            starId: "ziwei.star.wuqu",
            id: "ziwei.transformation.prosperity",
          }],
        }),
      }),
    });
  });
});
