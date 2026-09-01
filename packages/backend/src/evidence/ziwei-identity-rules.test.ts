import { describe, expect, it } from "vitest";

import type { NormalizedZiweiChartV1 } from "@lasoviet/contracts";

import { getCapability, listCapabilities } from "../capabilities/capability.registry.js";
import { buildZiweiIdentityEvidence } from "./ziwei-identity-rules.js";

const palaceIds = [
  "life", "siblings", "spouse", "children", "wealth", "health",
  "travel", "friends", "career", "property", "fortune", "parents",
] as const;

function chart(ruleSetId = "ziwei.default"): NormalizedZiweiChartV1 {
  return {
    version: 1,
    systemId: "ziwei",
    palaces: palaceIds.map((id) => ({
      id: `ziwei.palace.${id}` as NormalizedZiweiChartV1["palaces"][number]["id"],
      earthlyBranchId: "ziwei.branch.tiger",
      stars: [],
    })),
    transformations: [{ starId: "ziwei.star.wuqu", id: "ziwei.transformation.prosperity" }],
    soulPalaceId: "ziwei.palace.life",
    bodyPalaceId: "ziwei.palace.career",
    horoscopeCapabilities: [{ id: "ziwei.horoscope.annual", supported: true }],
    warnings: [{ code: "ziwei.warning.no-true-solar-time-correction", severity: "limitation" }],
    provenance: {
      version: 1, engineId: "ziwei.iztro", engineVersion: "2.6.0",
      adapterId: "ziwei.iztro-adapter", adapterVersion: "1",
      schemaId: "ziwei.chart.v1", ruleSetId, inputHash: "a".repeat(64),
      configHash: "b".repeat(64), rawSnapshotHash: "c".repeat(64),
      calculatedAt: "2026-09-02T00:00:00+00:00",
      limitations: ["IZTRO_NO_TRUE_SOLAR_TIME_CORRECTION"],
    },
  };
}

describe("Zi Wei identity evidence", () => {
  it("creates bounded fact-linked evidence for the only P0 capability", () => {
    const result = buildZiweiIdentityEvidence(chart(), "chart-version-1");
    expect(listCapabilities()).toHaveLength(1);
    expect(getCapability("ziwei.identity.p0")).toMatchObject({
      publicAvailable: true, paidAvailable: true, skuId: "ZIWEI-IDENTITY-P0",
    });
    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(result.value.items.map((item) => item.id)).toEqual([
      "ziwei.identity.life-palace",
      "ziwei.identity.body-palace",
      "ziwei.identity.transformations",
    ]);
    for (const item of result.value.items) {
      expect(item.factReferences.length).toBeGreaterThan(0);
      expect(item.interpretationBounds.length).toBeGreaterThan(0);
      expect(item.limitations.length).toBeGreaterThan(0);
    }
  });

  it("rejects unsupported rule sets and missing normalized facts", () => {
    expect(buildZiweiIdentityEvidence(chart("ziwei.other"), "chart-version-1"))
      .toMatchObject({ ok: false, error: { code: "UNSUPPORTED_ZIWEI_RULE_SET" } });
    const missing = chart();
    missing.transformations = [];
    expect(buildZiweiIdentityEvidence(missing, "chart-version-1"))
      .toMatchObject({ ok: false, error: { code: "ZIWEI_EVIDENCE_FACT_MISSING" } });
  });
});
