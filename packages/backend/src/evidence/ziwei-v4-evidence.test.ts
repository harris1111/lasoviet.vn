import { describe, expect, it } from "vitest";

import {
  ZIWEI_PALACE_IDS,
  type ReportSourceSnapshotV1,
  type ZiweiTimingPalace,
} from "@lasoviet/contracts";

import type { ComprehensiveZiweiFacts } from "../reports/comprehensive-ziwei-facts.js";
import {
  buildZiweiV4Evidence,
  ZiweiV4EvidenceError,
} from "./ziwei-v4-evidence.js";

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

function createSamplePalaces(): ZiweiTimingPalace[] {
  return ZIWEI_PALACE_IDS.map((id, index) => ({
    palaceId: id,
    heavenlyStemId: "ziwei.stem.jia",
    earthlyBranchId: branches[index]!,
    isOriginalPalace: index === 0,
    cycleStateId: "ziwei.cycle.born",
    stars: [
      {
        id: "ziwei.star.ziwei",
        brightness: "ziwei.brightness.prosperous",
        category: "major",
      },
    ],
    transformations: [
      {
        starId: "ziwei.star.ziwei",
        id: "ziwei.transformation.power",
      },
    ],
  }));
}

function createSampleNatalFacts(): ComprehensiveZiweiFacts {
  return {
    palaces: [],
    transformations: [],
    patterns: [{ id: "zi-fu-tong-gong", palaceIds: ["ziwei.palace.life"], starIds: ["ziwei.star.ziwei"] }],
    evidenceKeys: [
      "ziwei.palace.life",
      "ziwei.branch.tiger",
      "ziwei.star.ziwei",
      "zi-fu-tong-gong",
    ],
  };
}

function createSampleSourceSnapshot(decadalState: "active" | "not_started" = "active"): ReportSourceSnapshotV1 {
  const hash = "b".repeat(64);
  const decadal =
    decadalState === "active"
      ? {
          state: "active" as const,
          index: 2,
          ageRange: [22, 31] as [number, number],
          yearRange: [2022, 2031] as [number, number],
          palaceId: "ziwei.palace.spouse" as const,
          heavenlyStemId: "ziwei.stem.bing",
          earthlyBranchId: "ziwei.branch.dragon" as const,
          palaces: createSamplePalaces(),
        }
      : {
          state: "not_started" as const,
          firstCycleStartAge: 3,
          firstCycleStartYear: 2029,
        };

  return {
    version: 1,
    reportId: "11111111-1111-4111-8111-111111111111",
    reportVersionId: "22222222-2222-4222-8222-222222222222",
    chartVersionId: "chart-ver-999",
    asOfDate: "2026-09-12",
    targetYear: 2026,
    timingRuleVersion: "ziwei.timing.v1",
    sensitivityRuleVersion: "ziwei.sensitivity.v1",
    snapshotHash: hash,
    snapshot: {
      version: 1,
      chartVersionId: "chart-ver-999",
      asOfDate: "2026-09-12",
      timezone: "Asia/Ho_Chi_Minh",
      timingRuleVersion: "ziwei.timing.v1",
      sensitivityRuleVersion: "ziwei.sensitivity.v1",
      timing: {
        decadal,
        annual: {
          targetYear: 2026,
          palaceId: "ziwei.palace.travel",
          heavenlyStemId: "ziwei.stem.bing",
          earthlyBranchId: "ziwei.branch.horse",
          palaces: createSamplePalaces(),
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
        selectedFrame: {
          position: "selected",
          vendorTimeIndex: 6,
          civilDateOffset: 0,
          frameId: "ziwei.time-frame.horse",
        },
        previousFrame: {
          position: "previous",
          vendorTimeIndex: 5,
          civilDateOffset: 0,
          frameId: "ziwei.time-frame.snake",
        },
        nextFrame: {
          position: "next",
          vendorTimeIndex: 7,
          civilDateOffset: 0,
          frameId: "ziwei.time-frame.goat",
        },
        stableFactKeys: ["ziwei.fact.soul-palace", "ziwei.fact.life-palace-branch"],
        sensitiveFacts: [
          {
            factKey: "ziwei.fact.career-palace-stars",
            variants: [
              {
                position: "previous",
                valueIds: ["ziwei.star.tianji"],
                evidenceKeys: ["ziwei.star.tianji"],
              },
              {
                position: "selected",
                valueIds: ["ziwei.star.taiyin"],
                evidenceKeys: ["ziwei.star.taiyin"],
              },
              {
                position: "next",
                valueIds: ["ziwei.star.tiantong"],
                evidenceKeys: ["ziwei.star.tiantong"],
              },
            ],
          },
        ],
      },
      provenance: {
        chartVersionId: "chart-ver-999",
        timingRuleVersion: "ziwei.timing.v1",
        sensitivityRuleVersion: "ziwei.sensitivity.v1",
        snapshotHash: hash,
      },
    },
  };
}

describe("buildZiweiV4Evidence", () => {
  it("builds a valid evidence set with active decadal timing", () => {
    const natalFacts = createSampleNatalFacts();
    const natalCopy = JSON.parse(JSON.stringify(natalFacts));
    const snapshot = createSampleSourceSnapshot("active");

    const evidence = buildZiweiV4Evidence(natalFacts, snapshot);

    expect(evidence.version).toBe(2);
    expect(evidence.capabilityId).toBe("ziwei.identity.p0");
    expect(evidence.ruleVersion).toBe("ziwei.comprehensive.v4");
    expect(evidence.chartVersionId).toBe("chart-ver-999");
    expect(evidence.reportVersionId).toBe(snapshot.reportVersionId);
    expect(evidence.snapshotHash).toBe(snapshot.snapshotHash);

    // Verify natal evidence items
    const natalItem = evidence.items.find((i) => i.key === "natal.ziwei.palace.life");
    expect(natalItem).toBeDefined();
    expect(natalItem?.dimension).toBe("natal");
    expect(natalItem?.confidence).toBe("moderate");
    expect(natalItem?.sourceKeys).toEqual(["ziwei.palace.life"]);

    // Verify active decadal items
    const decadalStateItem = evidence.items.find((i) => i.key === "decadal.state.active");
    expect(decadalStateItem).toBeDefined();
    expect(decadalStateItem?.dimension).toBe("decadal");
    expect(evidence.items.some((i) => i.key === "decadal.age-range.22-31")).toBe(true);

    // Verify annual items
    const annualYearItem = evidence.items.find((i) => i.key === "annual.target-year.2026");
    expect(annualYearItem).toBeDefined();
    expect(annualYearItem?.dimension).toBe("annual");

    // Verify stable sensitivity items
    const stableItem = evidence.items.find((i) => i.key === "sensitivity.stable.ziwei.fact.soul-palace");
    expect(stableItem).toBeDefined();
    expect(stableItem?.dimension).toBe("sensitivity_stable");
    expect(stableItem?.confidence).toBe("high");

    // Verify sensitive items
    const sensitiveItem = evidence.items.find((i) => i.key === "sensitivity.sensitive.ziwei.fact.career-palace-stars");
    expect(sensitiveItem).toBeDefined();
    expect(sensitiveItem?.dimension).toBe("sensitivity_sensitive");
    expect(sensitiveItem?.confidence).toBe("conditional");
    expect(sensitiveItem?.sourceKeys).toEqual(
      expect.arrayContaining(["ziwei.star.taiyin", "ziwei.star.tianji", "ziwei.star.tiantong"]),
    );

    // Verify natalFacts was not mutated
    expect(natalFacts).toEqual(natalCopy);
  });

  it("builds a valid evidence set with not_started decadal timing", () => {
    const natalFacts = createSampleNatalFacts();
    const snapshot = createSampleSourceSnapshot("not_started");

    const evidence = buildZiweiV4Evidence(natalFacts, snapshot);

    const stateItem = evidence.items.find((i) => i.key === "decadal.state.not_started");
    expect(stateItem).toBeDefined();
    expect(evidence.items.some((i) => i.key === "decadal.first-cycle-start-age.3")).toBe(true);
    expect(evidence.items.some((i) => i.key === "decadal.first-cycle-start-year.2029")).toBe(true);
  });

  it("fails closed with ZiweiV4EvidenceError when snapshot is invalid", () => {
    const natalFacts = createSampleNatalFacts();
    expect(() => buildZiweiV4Evidence(natalFacts, null as any)).toThrow(ZiweiV4EvidenceError);
  });

  it("fails closed when natalFacts is invalid", () => {
    const snapshot = createSampleSourceSnapshot("active");
    expect(() => buildZiweiV4Evidence({} as any, snapshot)).toThrow(ZiweiV4EvidenceError);
  });
});
