import type { NormalizedZiweiChartV1, ReportSourceSnapshotV1, ZiweiPalaceId } from "@lasoviet/contracts";
import { buildComprehensiveZiweiFactsV4 } from "./comprehensive-ziwei-facts-v4.js";
const palaceIds: ZiweiPalaceId[] = [
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
];

const branches = [
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
  "ziwei.branch.rat",
  "ziwei.branch.ox",
] as const;

export function buildFacts(
  starsByPalace: Partial<Record<ZiweiPalaceId, Array<{ id: string; category?: string }>>> = {},
) {
  const chart: NormalizedZiweiChartV1 = {
    version: 1,
    systemId: "ziwei",
    palaces: palaceIds.map((id, index) => ({
      id,
      earthlyBranchId: branches[index]!,
      heavenlyStemId: "ziwei.stem.jia",
      isBodyPalace: id === "ziwei.palace.career",
      isOriginalPalace: index === 0,
      cycleStateId: "ziwei.cycle.born",
      stars: (starsByPalace[id] ?? (
        id === "ziwei.palace.life"
          ? [
              { id: "ziwei.star.ziwei", category: "major" },
              { id: "ziwei.star.tianfu", category: "major" },
            ]
          : []
      )).map((star) => ({
        ...star,
        brightness: "ziwei.brightness.prosperous",
      })) as NormalizedZiweiChartV1["palaces"][number]["stars"],
    })),
    transformations: [{ starId: "ziwei.star.ziwei", id: "ziwei.transformation.power" }],
    soulPalaceId: "ziwei.palace.life",
    bodyPalaceId: "ziwei.palace.career",
    horoscopeCapabilities: [
      { id: "ziwei.horoscope.decadal", supported: true },
      { id: "ziwei.horoscope.annual", supported: true },
    ],
    warnings: [],
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
      limitations: [],
    },
  };
  const snapshot: ReportSourceSnapshotV1 = {
    version: 1,
    reportId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    reportVersionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    chartVersionId: "chart-v1",
    asOfDate: "2026-09-12",
    targetYear: 2026,
    timingRuleVersion: "ziwei.timing.v1",
    sensitivityRuleVersion: "ziwei.sensitivity.v1",
    snapshotHash: "c".repeat(64),
    snapshot: {
      version: 1,
      chartVersionId: "chart-v1",
      asOfDate: "2026-09-12",
      timezone: "Asia/Ho_Chi_Minh",
      timingRuleVersion: "ziwei.timing.v1",
      sensitivityRuleVersion: "ziwei.sensitivity.v1",
      timing: {
        decadal: {
          state: "active",
          index: 2,
          ageRange: [22, 31],
          yearRange: [2022, 2031],
          palaceId: "ziwei.palace.fortune",
          heavenlyStemId: "ziwei.stem.yi",
          earthlyBranchId: "ziwei.branch.rabbit",
          palaces: chart.palaces.map((palace) => ({
            palaceId: palace.id,
            heavenlyStemId: "ziwei.stem.jia",
            earthlyBranchId: palace.earthlyBranchId,
            isOriginalPalace: palace.isOriginalPalace ?? false,
            cycleStateId: "ziwei.cycle.born",
            stars: palace.stars,
            transformations: [],
          })),
        },
        annual: {
          targetYear: 2026,
          palaceId: "ziwei.palace.career",
          heavenlyStemId: "ziwei.stem.bing",
          earthlyBranchId: "ziwei.branch.horse",
          palaces: chart.palaces.map((palace) => ({
            palaceId: palace.id,
            heavenlyStemId: "ziwei.stem.jia",
            earthlyBranchId: palace.earthlyBranchId,
            isOriginalPalace: palace.isOriginalPalace ?? false,
            cycleStateId: "ziwei.cycle.born",
            stars: palace.stars,
            transformations: [],
          })),
        },
        provenance: {
          engineId: "ziwei.iztro",
          engineVersion: "2.6.0",
          adapterId: "ziwei.iztro-adapter",
          adapterVersion: "1.0.0",
          ruleSetId: "ziwei.default",
          config: {
            yearDivide: "normal",
            horoscopeDivide: "normal",
            ageDivide: "normal",
            dayDivide: "current",
          },
        },
      },
      sensitivity: {
        selectedFrame: { position: "selected", vendorTimeIndex: 6, civilDateOffset: 0, frameId: "ziwei.time-frame.horse" },
        previousFrame: { position: "previous", vendorTimeIndex: 5, civilDateOffset: 0, frameId: "ziwei.time-frame.snake" },
        nextFrame: { position: "next", vendorTimeIndex: 7, civilDateOffset: 0, frameId: "ziwei.time-frame.goat" },
        stableFactKeys: ["ziwei.fact.soul-palace"],
        sensitiveFacts: [],
      },
      provenance: {
        chartVersionId: "chart-v1",
        timingRuleVersion: "ziwei.timing.v1",
        sensitivityRuleVersion: "ziwei.sensitivity.v1",
        snapshotHash: "c".repeat(64),
      },
    },
  };
  return buildComprehensiveZiweiFactsV4(chart, snapshot);
}

