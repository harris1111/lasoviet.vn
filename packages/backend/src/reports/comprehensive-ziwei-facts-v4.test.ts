import { describe, expect, it } from "vitest";

import {
  ZIWEI_PALACE_IDS,
  type NormalizedZiweiChartV1,
  type ReportSourceSnapshotV1,
  type ZiweiPalaceId,
  type ZiweiTimingPalace,
} from "@lasoviet/contracts";

import { buildComprehensiveZiweiFacts } from "./comprehensive-ziwei-facts.js";
import {
  buildComprehensiveZiweiFactsV4,
  ComprehensiveZiweiFactsV4Error,
} from "./comprehensive-ziwei-facts-v4.js";

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

function createSampleChart(): NormalizedZiweiChartV1 {
  return {
    version: 1,
    systemId: "ziwei",
    palaces: palaceIds.map((id, index) => ({
      id,
      earthlyBranchId: branches[index]!,
      heavenlyStemId: "ziwei.stem.jia",
      isBodyPalace: id === "ziwei.palace.career",
      isOriginalPalace: index === 0,
      cycleStateId: "ziwei.cycle.born",
      stars:
        id === "ziwei.palace.life"
          ? [
              {
                id: "ziwei.star.ziwei",
                brightness: "ziwei.brightness.prosperous",
                category: "major",
              },
              {
                id: "ziwei.star.tianfu",
                brightness: "ziwei.brightness.prosperous",
                category: "major",
              },
            ]
          : [],
    })),
    transformations: [
      {
        starId: "ziwei.star.ziwei",
        id: "ziwei.transformation.power",
      },
      {
        starId: "ziwei.star.tianfu",
        id: "ziwei.transformation.prosperity",
      },
    ],
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
}

function createSampleTimingPalaces(): ZiweiTimingPalace[] {
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

function createSampleSnapshot(
  decadalState: "active" | "not_started" = "active",
): ReportSourceSnapshotV1 {
  const hash = "c".repeat(64);
  const decadal =
    decadalState === "active"
      ? {
          state: "active" as const,
          index: 1,
          ageRange: [15, 24] as [number, number],
          yearRange: [2020, 2029] as [number, number],
          palaceId: "ziwei.palace.siblings" as const,
          heavenlyStemId: "ziwei.stem.yi",
          earthlyBranchId: "ziwei.branch.rabbit" as const,
          palaces: createSampleTimingPalaces(),
        }
      : {
          state: "not_started" as const,
          firstCycleStartAge: 4,
          firstCycleStartYear: 2030,
        };

  return {
    version: 1,
    reportId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    reportVersionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    chartVersionId: "chart-version-1",
    asOfDate: "2026-09-12",
    targetYear: 2026,
    timingRuleVersion: "ziwei.timing.v1",
    sensitivityRuleVersion: "ziwei.sensitivity.v1",
    snapshotHash: hash,
    snapshot: {
      version: 1,
      chartVersionId: "chart-version-1",
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
          palaces: createSampleTimingPalaces(),
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
        chartVersionId: "chart-version-1",
        timingRuleVersion: "ziwei.timing.v1",
        sensitivityRuleVersion: "ziwei.sensitivity.v1",
        snapshotHash: hash,
      },
    },
  };
}

describe("buildComprehensiveZiweiFactsV4", () => {
  it("builds V4 comprehensive facts with active decadal timing", () => {
    const chart = createSampleChart();
    const snapshot = createSampleSnapshot("active");

    const facts = buildComprehensiveZiweiFactsV4(chart, snapshot);

    expect(facts.version).toBe(4);
    expect(facts.natal.palaces).toHaveLength(12);
    expect(facts.timing.decadal.state).toBe("active");
    expect(facts.sourceSnapshot).toEqual({
      reportVersionId: snapshot.reportVersionId,
      chartVersionId: snapshot.chartVersionId,
      asOfDate: snapshot.asOfDate,
      targetYear: snapshot.targetYear,
      timingRuleVersion: snapshot.timingRuleVersion,
      sensitivityRuleVersion: snapshot.sensitivityRuleVersion,
      snapshotHash: snapshot.snapshotHash,
    });
    expect(facts.evidenceKeys).toEqual(facts.evidence.items.map((i) => i.key));
    expect(facts.evidenceKeys).toContain("natal.ziwei.palace.life");
    expect(facts.evidenceKeys).toContain("decadal.state.active");
    expect(facts.evidenceKeys).toContain("annual.target-year.2026");
    expect(facts.evidenceKeys).toContain("sensitivity.stable.ziwei.fact.soul-palace");
    expect(facts.evidenceKeys).toContain("sensitivity.sensitive.ziwei.fact.career-palace-stars");
  });

  it("builds V4 comprehensive facts with not_started decadal timing", () => {
    const chart = createSampleChart();
    const snapshot = createSampleSnapshot("not_started");

    const facts = buildComprehensiveZiweiFactsV4(chart, snapshot);

    expect(facts.version).toBe(4);
    expect(facts.timing.decadal.state).toBe("not_started");
    expect(facts.evidenceKeys).toContain("decadal.state.not_started");
    expect(facts.evidenceKeys).toContain("decadal.first-cycle-start-age.4");
    expect(facts.evidenceKeys).toContain("decadal.first-cycle-start-year.2030");
  });

  it("includes annual timing evidence and snapshot", () => {
    const chart = createSampleChart();
    const snapshot = createSampleSnapshot("active");

    const facts = buildComprehensiveZiweiFactsV4(chart, snapshot);

    expect(facts.timing.annual.targetYear).toBe(2026);
    expect(facts.evidenceKeys).toContain("annual.target-year.2026");
    expect(facts.evidenceKeys).toContain("annual.palace.ziwei.palace.travel");
    expect(facts.evidenceKeys).toContain("annual.branch.ziwei.branch.horse");
  });

  it("includes stable and sensitive hour evidence with respective confidencies", () => {
    const chart = createSampleChart();
    const snapshot = createSampleSnapshot("active");

    const facts = buildComprehensiveZiweiFactsV4(chart, snapshot);

    const stableItem = facts.evidence.items.find((i) => i.dimension === "sensitivity_stable");
    expect(stableItem).toBeDefined();
    expect(stableItem?.confidence).toBe("high");

    const sensitiveItem = facts.evidence.items.find((i) => i.dimension === "sensitivity_sensitive");
    expect(sensitiveItem).toBeDefined();
    expect(sensitiveItem?.confidence).toBe("conditional");
  });

  it("preserves deterministic ordering and has no duplicate evidence keys", () => {
    const chart = createSampleChart();
    const snapshot = createSampleSnapshot("active");

    const facts1 = buildComprehensiveZiweiFactsV4(chart, snapshot);
    const facts2 = buildComprehensiveZiweiFactsV4(chart, snapshot);

    expect(JSON.stringify(facts1)).toBe(JSON.stringify(facts2));

    const keySet = new Set(facts1.evidenceKeys);
    expect(keySet.size).toBe(facts1.evidenceKeys.length);

    const itemKeySet = new Set(facts1.evidence.items.map((i) => i.key));
    expect(itemKeySet.size).toBe(facts1.evidence.items.length);
  });

  it("fails closed with ComprehensiveZiweiFactsV4Error on invalid snapshot or chart mismatch", () => {
    const chart = createSampleChart();
    const snapshot = createSampleSnapshot("active");

    // Invalid snapshot hash
    const corruptSnapshot = { ...snapshot, snapshotHash: "invalid-hash" };
    expect(() => buildComprehensiveZiweiFactsV4(chart, corruptSnapshot as any)).toThrow(
      ComprehensiveZiweiFactsV4Error,
    );

    // Chart mismatch (soul palace in chart differs from sensitive selected fact)
    const mismatchedSnapshot = createSampleSnapshot("active");
    mismatchedSnapshot.snapshot.sensitivity.sensitiveFacts.push({
      factKey: "ziwei.fact.soul-palace",
      variants: [
        { position: "previous", valueIds: ["ziwei.palace.career"], evidenceKeys: ["soul"] },
        { position: "selected", valueIds: ["ziwei.palace.career"], evidenceKeys: ["soul"] },
        { position: "next", valueIds: ["ziwei.palace.career"], evidenceKeys: ["soul"] },
      ],
    });
    expect(() => buildComprehensiveZiweiFactsV4(chart, mismatchedSnapshot)).toThrow(
      ComprehensiveZiweiFactsV4Error,
    );
  });

  it("recursively guarantees absence of raw birth date/time/location fixture strings", () => {
    const chart = createSampleChart();
    const snapshot = createSampleSnapshot("active");

    const facts = buildComprehensiveZiweiFactsV4(chart, snapshot);

    const prohibitedStrings = [
      "1995-10-24",
      "1995/10/24",
      "10:30",
      "10:30:00",
      "Hanoi",
      "Ho Chi Minh",
      "Vietnam",
      "solar:1995",
    ];

    function checkObjectRecursively(obj: unknown, path = ""): void {
      if (!obj) return;
      if (typeof obj === "string") {
        for (const prohibited of prohibitedStrings) {
          expect(obj).not.toContain(prohibited);
        }
        return;
      }
      if (typeof obj === "object") {
        for (const [k, v] of Object.entries(obj)) {
          for (const prohibited of prohibitedStrings) {
            expect(k).not.toContain(prohibited);
          }
          checkObjectRecursively(v, `${path}.${k}`);
        }
      }
    }

    checkObjectRecursively(facts);
  });

  it("verifies V3 output equality before and after V4 build without mutation", () => {
    const chart = createSampleChart();
    const snapshot = createSampleSnapshot("active");

    const v3Before = buildComprehensiveZiweiFacts(chart);
    const v4 = buildComprehensiveZiweiFactsV4(chart, snapshot);
    const v3After = buildComprehensiveZiweiFacts(chart);

    expect(v3Before).toEqual(v3After);
    expect(v4.natal).toEqual(v3Before);
  });
});
