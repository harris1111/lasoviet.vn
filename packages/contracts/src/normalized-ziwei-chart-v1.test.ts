import { describe, expect, it } from "vitest";

import {
  NormalizedZiweiChartV1Schema,
  type NormalizedZiweiChartV1,
} from "./normalized-ziwei-chart-v1.js";

const palaceIds = [
  "ziwei.palace.life",
  "ziwei.palace.siblings",
  "ziwei.palace.spouse",
  "ziwei.palace.children",
  "ziwei.palace.wealth",
  "ziwei.palace.health",
  "ziwei.palace.travel",
  "ziwei.palace.friends",
  "ziwei.palace.career",
  "ziwei.palace.property",
  "ziwei.palace.fortune",
  "ziwei.palace.parents",
] as const;

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

function chart(): NormalizedZiweiChartV1 {
  return {
    version: 1,
    systemId: "ziwei",
    palaces: palaceIds.map((id, index) => ({
      id,
      earthlyBranchId: branches[index]!,
      stars: index === 0
        ? [{
            id: "ziwei.star.purple-emperor",
            brightness: "ziwei.brightness.exalted",
          }]
        : [],
    })),
    transformations: [
      {
        starId: "ziwei.star.purple-emperor",
        id: "ziwei.transformation.prosperity",
      },
    ],
    soulPalaceId: "ziwei.palace.life",
    bodyPalaceId: "ziwei.palace.career",
    horoscopeCapabilities: [
      { id: "ziwei.horoscope.decadal", supported: true },
      { id: "ziwei.horoscope.annual", supported: true },
    ],
    warnings: [{ code: "ziwei.warning.time-range", severity: "limitation" }],
    provenance: {
      version: 1,
      engineId: "ziwei.iztro",
      engineVersion: "2.6.0",
      adapterId: "ziwei.iztro-adapter",
      adapterVersion: "1.0.0",
      schemaId: "normalized-ziwei-chart-v1",
      ruleSetId: "ziwei.default",
      inputHash: "a".repeat(64),
      configHash: "b".repeat(64),
      rawSnapshotHash: "c".repeat(64),
      calculatedAt: "2026-09-02T00:00:00+00:00",
      limitations: ["TIME_RANGE_WITHIN_SINGLE_BRANCH"],
    },
  };
}

describe("Normalized Zi Wei chart v1", () => {
  it("accepts a complete language-neutral P0 chart", () => {
    expect(NormalizedZiweiChartV1Schema.parse(chart())).toMatchObject({
      palaces: { length: 12 },
      soulPalaceId: "ziwei.palace.life",
      bodyPalaceId: "ziwei.palace.career",
    });
  });

  it.each([
    ["missing palace", (value: NormalizedZiweiChartV1) => value.palaces.pop()],
    ["duplicate palace", (value: NormalizedZiweiChartV1) => {
      value.palaces[11] = { ...value.palaces[11]!, id: "ziwei.palace.life" };
    }],
    ["vendor-localized star", (value: NormalizedZiweiChartV1) => {
      value.palaces[0]!.stars[0] = {
        id: "紫微",
        brightness: "ziwei.brightness.exalted",
      };
    }],
    ["unmapped body palace", (value: NormalizedZiweiChartV1) => {
      value.bodyPalaceId = "ziwei.palace.unknown" as never;
    }],
  ])("rejects %s", (_name, mutate) => {
    const value = structuredClone(chart());
    mutate(value);
    expect(() => NormalizedZiweiChartV1Schema.parse(value)).toThrow();
  });
});
