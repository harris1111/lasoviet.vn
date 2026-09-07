import { describe, expect, it } from "vitest";

import type { NormalizedZiweiChartV1, ZiweiPalaceId } from "@lasoviet/contracts";

import {
  buildComprehensiveZiweiFacts,
  type ComprehensiveZiweiFacts,
} from "./comprehensive-ziwei-facts.js";

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
  "ziwei.branch.tiger",   // 0: life
  "ziwei.branch.rabbit",  // 1: siblings
  "ziwei.branch.dragon",  // 2: spouse
  "ziwei.branch.snake",   // 3: children
  "ziwei.branch.horse",   // 4: wealth
  "ziwei.branch.goat",    // 5: health
  "ziwei.branch.monkey",  // 6: travel
  "ziwei.branch.rooster", // 7: friends
  "ziwei.branch.dog",     // 8: career
  "ziwei.branch.pig",     // 9: property
  "ziwei.branch.rat",     // 10: fortune
  "ziwei.branch.ox",      // 11: parents
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

describe("buildComprehensiveZiweiFacts", () => {
  it("emits exactly twelve palace facts with correct branch-derived relationships", () => {
    const chart = createSampleChart();
    const facts = buildComprehensiveZiweiFacts(chart);

    expect(facts.palaces).toHaveLength(12);

    const lifeFact = facts.palaces.find((p) => p.palaceId === "ziwei.palace.life")!;
    expect(lifeFact).toBeDefined();
    expect(lifeFact.isLifePalace).toBe(true);
    expect(lifeFact.isBodyPalace).toBe(false);
    expect(lifeFact.earthlyBranchId).toBe("ziwei.branch.tiger");
    expect(lifeFact.heavenlyStemId).toBe("ziwei.stem.jia");

    // Canonical branches:
    // Tiger is index 2.
    // +4 offset: index 6 = Horse ("ziwei.branch.horse") -> mapped to "ziwei.palace.wealth"
    // +8 offset: index 10 = Dog ("ziwei.branch.dog") -> mapped to "ziwei.palace.career"
    expect(lifeFact.triadPalaceIds).toEqual([
      "ziwei.palace.wealth",
      "ziwei.palace.career",
    ]);

    // +6 offset: index 8 = Monkey ("ziwei.branch.monkey") -> mapped to "ziwei.palace.travel"
    expect(lifeFact.oppositePalaceId).toBe("ziwei.palace.travel");

    // Flankers: -1 offset is Ox ("ziwei.branch.ox") -> mapped to "ziwei.palace.parents"
    //           +1 offset is Rabbit ("ziwei.branch.rabbit") -> mapped to "ziwei.palace.siblings"
    expect(lifeFact.flankingPalaceIds).toEqual([
      "ziwei.palace.parents",
      "ziwei.palace.siblings",
    ]);

    const bodyFact = facts.palaces.find((p) => p.palaceId === "ziwei.palace.career")!;
    expect(bodyFact.isBodyPalace).toBe(true);
  });

  it("preserves chart transformations and builds deterministic deduplicated evidence keys", () => {
    const chart = createSampleChart();
    const facts = buildComprehensiveZiweiFacts(chart);

    expect(facts.transformations).toEqual(chart.transformations);

    // Evidence keys must include palace IDs, earthlyBranch IDs, heavenlyStem IDs, cycle state IDs, star IDs, brightness IDs, transformation IDs, transformation source star IDs, relation IDs, and matched pattern IDs
    expect(facts.evidenceKeys).toEqual(
      expect.arrayContaining([
        "ziwei.palace.life",
        "ziwei.palace.career",
        "ziwei.branch.tiger",
        "ziwei.stem.jia",
        "ziwei.cycle.born",
        "ziwei.star.ziwei",
        "ziwei.star.tianfu",
        "ziwei.brightness.prosperous",
        "ziwei.transformation.power",
        "ziwei.transformation.prosperity",
        "ziwei.relation.triad",
        "ziwei.relation.opposition",
        "ziwei.relation.flanking",
        "zi-fu-tong-gong",
      ]),
    );

    // No duplicates in evidenceKeys
    const uniqueKeys = new Set(facts.evidenceKeys);
    expect(uniqueKeys.size).toBe(facts.evidenceKeys.length);
  });

  it("detects zi-fu-tong-gong pattern when Zi Wei and Tian Fu are in Life at Tiger or Monkey", () => {
    const chart = createSampleChart();
    const facts = buildComprehensiveZiweiFacts(chart);

    const pattern = facts.patterns.find((p) => p.id === "zi-fu-tong-gong");
    expect(pattern).toBeDefined();
    expect(pattern).toEqual({
      id: "zi-fu-tong-gong",
      palaceIds: ["ziwei.palace.life"],
      starIds: ["ziwei.star.ziwei", "ziwei.star.tianfu"],
    });
  });

  it("detects sha-po-lang pattern across Life four-direction scope", () => {
    const chart = createSampleChart();
    // Place Qi Sha in Life, Po Jun in Wealth (triad 1), Tan Lang in Travel (opposite)
    chart.palaces[0]!.stars = [
      { id: "ziwei.star.qisha", brightness: "ziwei.brightness.exalted", category: "major" },
    ];
    chart.palaces[4]!.stars = [
      { id: "ziwei.star.pojun", brightness: "ziwei.brightness.prosperous", category: "major" },
    ];
    chart.palaces[6]!.stars = [
      { id: "ziwei.star.tanlang", brightness: "ziwei.brightness.favorable", category: "major" },
    ];

    const facts = buildComprehensiveZiweiFacts(chart);
    const pattern = facts.patterns.find((p) => p.id === "sha-po-lang");
    expect(pattern).toBeDefined();
    expect(pattern).toEqual({
      id: "sha-po-lang",
      palaceIds: ["ziwei.palace.life", "ziwei.palace.wealth", "ziwei.palace.travel"],
      starIds: ["ziwei.star.qisha", "ziwei.star.pojun", "ziwei.star.tanlang"],
    });
  });

  it("detects ji-yue-tong-liang pattern across Life four-direction scope", () => {
    const chart = createSampleChart();
    // Life has Tian Ji, Wealth has Tai Yin, Career has Tian Tong, Travel has Tian Liang
    chart.palaces[0]!.stars = [
      { id: "ziwei.star.tianji", brightness: "ziwei.brightness.exalted", category: "major" },
    ];
    chart.palaces[4]!.stars = [
      { id: "ziwei.star.taiyin", brightness: "ziwei.brightness.prosperous", category: "major" },
    ];
    chart.palaces[8]!.stars = [
      { id: "ziwei.star.tiantong", brightness: "ziwei.brightness.favorable", category: "major" },
    ];
    chart.palaces[6]!.stars = [
      { id: "ziwei.star.tianliang", brightness: "ziwei.brightness.exalted", category: "major" },
    ];

    const facts = buildComprehensiveZiweiFacts(chart);
    const pattern = facts.patterns.find((p) => p.id === "ji-yue-tong-liang");
    expect(pattern).toBeDefined();
    expect(pattern).toEqual({
      id: "ji-yue-tong-liang",
      palaceIds: [
        "ziwei.palace.life",
        "ziwei.palace.wealth",
        "ziwei.palace.career",
        "ziwei.palace.travel",
      ],
      starIds: [
        "ziwei.star.tianji",
        "ziwei.star.taiyin",
        "ziwei.star.tiantong",
        "ziwei.star.tianliang",
      ],
    });
  });

  it("detects san-qi-jia-hui when prosperity, power, and fame stars are in Life scope", () => {
    const chart = createSampleChart();
    chart.palaces[0]!.stars = [
      { id: "ziwei.star.wuqu", brightness: "ziwei.brightness.exalted", category: "major" },
    ];
    chart.palaces[4]!.stars = [
      { id: "ziwei.star.taiyang", brightness: "ziwei.brightness.prosperous", category: "major" },
    ];
    chart.palaces[8]!.stars = [
      { id: "ziwei.star.wenchang", brightness: "ziwei.brightness.favorable", category: "minor" },
    ];
    chart.transformations = [
      { starId: "ziwei.star.wuqu", id: "ziwei.transformation.prosperity" },
      { starId: "ziwei.star.taiyang", id: "ziwei.transformation.power" },
      { starId: "ziwei.star.wenchang", id: "ziwei.transformation.fame" },
      { starId: "ziwei.star.lianzhen", id: "ziwei.transformation.obstacle" },
    ];

    const facts = buildComprehensiveZiweiFacts(chart);
    const pattern = facts.patterns.find((p) => p.id === "san-qi-jia-hui");
    expect(pattern).toBeDefined();
    expect(pattern).toEqual({
      id: "san-qi-jia-hui",
      palaceIds: [
        "ziwei.palace.life",
        "ziwei.palace.wealth",
        "ziwei.palace.career",
      ],
      starIds: [
        "ziwei.star.wuqu",
        "ziwei.star.taiyang",
        "ziwei.star.wenchang",
      ],
    });
  });


  it("rejects charts with duplicate earthly branches to prevent malformed topology", () => {
    const chart = createSampleChart();
    chart.palaces[1]!.earthlyBranchId = chart.palaces[0]!.earthlyBranchId;
    expect(() => buildComprehensiveZiweiFacts(chart)).toThrow("MALFORMED_BRANCH_TOPOLOGY");
  });

  it("does not detect san-qi-jia-hui when a transformed star is outside Life four-direction scope", () => {
    const chart = createSampleChart();
    // Lu in Life, Quan in Wealth (triad 1), Ke in Siblings (outside 4-direction scope!)
    chart.palaces[0]!.stars = [
      { id: "ziwei.star.wuqu", brightness: "ziwei.brightness.exalted", category: "major" },
    ];
    chart.palaces[4]!.stars = [
      { id: "ziwei.star.taiyang", brightness: "ziwei.brightness.prosperous", category: "major" },
    ];
    // Siblings is index 1, which is not in Life scope (Life is 0, triads are 4, 8, opposite is 6)
    chart.palaces[1]!.stars = [
      { id: "ziwei.star.wenchang", brightness: "ziwei.brightness.favorable", category: "minor" },
    ];
    chart.transformations = [
      { starId: "ziwei.star.wuqu", id: "ziwei.transformation.prosperity" },
      { starId: "ziwei.star.taiyang", id: "ziwei.transformation.power" },
      { starId: "ziwei.star.wenchang", id: "ziwei.transformation.fame" },
    ];

    const facts = buildComprehensiveZiweiFacts(chart);
    expect(facts.patterns.find((p) => p.id === "san-qi-jia-hui")).toBeUndefined();
  });

  it("does not detect patterns when conditions are not satisfied", () => {
    const chart = createSampleChart();
    // Swap branches between palace 0 (tiger) and palace 10 (rat) so topology remains valid but zi-fu-tong-gong branch fails
    const temp = chart.palaces[0]!.earthlyBranchId;
    chart.palaces[0]!.earthlyBranchId = chart.palaces[10]!.earthlyBranchId;
    chart.palaces[10]!.earthlyBranchId = temp;
    // Also remove tianfu
    chart.palaces[0]!.stars = [
      { id: "ziwei.star.ziwei", brightness: "ziwei.brightness.prosperous", category: "major" },
    ];

    const facts = buildComprehensiveZiweiFacts(chart);
    expect(facts.patterns).toEqual([]);
  });
});
