import type {
  NormalizedZiweiChartV1,
  ZiweiPalaceId,
} from "@lasoviet/contracts";

export type ComprehensiveZiweiPalaceFact = {
  palaceId: ZiweiPalaceId;
  earthlyBranchId: string;
  heavenlyStemId?: string;
  isLifePalace: boolean;
  isBodyPalace: boolean;
  stars: NormalizedZiweiChartV1["palaces"][number]["stars"];
  triadPalaceIds: ZiweiPalaceId[];
  oppositePalaceId: ZiweiPalaceId;
  flankingPalaceIds: [ZiweiPalaceId, ZiweiPalaceId];
};

export type ComprehensiveZiweiPatternFact = {
  id: string;
  palaceIds: ZiweiPalaceId[];
  starIds: string[];
};

export type ComprehensiveZiweiFacts = {
  palaces: ComprehensiveZiweiPalaceFact[];
  transformations: NormalizedZiweiChartV1["transformations"];
  patterns: ComprehensiveZiweiPatternFact[];
  evidenceKeys: string[];
};

const CANONICAL_BRANCH_ORDER = [
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

function buildPalaceFacts(chart: NormalizedZiweiChartV1): ComprehensiveZiweiPalaceFact[] {
  const branchToPalaceId = new Map<string, ZiweiPalaceId>();
  for (const palace of chart.palaces) {
    if (branchToPalaceId.has(palace.earthlyBranchId)) {
      throw new Error("MALFORMED_BRANCH_TOPOLOGY");
    }
    branchToPalaceId.set(palace.earthlyBranchId, palace.id);
  }

  return chart.palaces.map((palace) => {
    const branchIndex = CANONICAL_BRANCH_ORDER.indexOf(
      palace.earthlyBranchId as (typeof CANONICAL_BRANCH_ORDER)[number],
    );
    const validIndex = branchIndex >= 0 ? branchIndex : 0;
    const triad1Branch = CANONICAL_BRANCH_ORDER[(validIndex + 4) % 12]!;
    const triad2Branch = CANONICAL_BRANCH_ORDER[(validIndex + 8) % 12]!;
    const oppositeBranch = CANONICAL_BRANCH_ORDER[(validIndex + 6) % 12]!;
    const flankerMinus1Branch = CANONICAL_BRANCH_ORDER[(validIndex + 11) % 12]!;
    const flankerPlus1Branch = CANONICAL_BRANCH_ORDER[(validIndex + 1) % 12]!;

    const triadPalaceIds: ZiweiPalaceId[] = [
      branchToPalaceId.get(triad1Branch) ?? palace.id,
      branchToPalaceId.get(triad2Branch) ?? palace.id,
    ];
    const oppositePalaceId: ZiweiPalaceId =
      branchToPalaceId.get(oppositeBranch) ?? palace.id;
    const flankingPalaceIds: [ZiweiPalaceId, ZiweiPalaceId] = [
      branchToPalaceId.get(flankerMinus1Branch) ?? palace.id,
      branchToPalaceId.get(flankerPlus1Branch) ?? palace.id,
    ];

    return {
      palaceId: palace.id,
      earthlyBranchId: palace.earthlyBranchId,
      ...(palace.heavenlyStemId ? { heavenlyStemId: palace.heavenlyStemId } : {}),
      isLifePalace: palace.id === "ziwei.palace.life",
      isBodyPalace: palace.id === chart.bodyPalaceId || palace.isBodyPalace === true,
      stars: palace.stars,
      triadPalaceIds,
      oppositePalaceId,
      flankingPalaceIds,
    };
  });
}

function collectPatternOccurrence(
  scopePalaces: ComprehensiveZiweiPalaceFact[],
  targetStarIds: string[],
): { palaceIds: ZiweiPalaceId[]; starIds: string[] } {
  const palaceIds: ZiweiPalaceId[] = [];
  const starIds: string[] = [];

  for (const palace of scopePalaces) {
    let palaceAdded = false;
    for (const targetStarId of targetStarIds) {
      if (palace.stars.some((s) => s.id === targetStarId)) {
        if (!palaceAdded) {
          palaceIds.push(palace.palaceId);
          palaceAdded = true;
        }
        if (!starIds.includes(targetStarId)) {
          starIds.push(targetStarId);
        }
      }
    }
  }

  return { palaceIds, starIds };
}

function detectPatterns(
  palaceFacts: ComprehensiveZiweiPalaceFact[],
  transformations: NormalizedZiweiChartV1["transformations"],
): ComprehensiveZiweiPatternFact[] {
  const lifePalace = palaceFacts.find((p) => p.isLifePalace);
  if (!lifePalace) {
    return [];
  }

  const palaceMap = new Map(palaceFacts.map((p) => [p.palaceId, p]));
  const lifeScopePalaces: ComprehensiveZiweiPalaceFact[] = [
    lifePalace,
    palaceMap.get(lifePalace.triadPalaceIds[0]!)!,
    palaceMap.get(lifePalace.triadPalaceIds[1]!)!,
    palaceMap.get(lifePalace.oppositePalaceId)!,
  ].filter((p): p is ComprehensiveZiweiPalaceFact => p !== undefined);

  const lifeScopeStarIds = new Set(
    lifeScopePalaces.flatMap((p) => p.stars.map((s) => s.id)),
  );

  const patterns: ComprehensiveZiweiPatternFact[] = [];

  // 1. zi-fu-tong-gong
  const lifeHasZiwei = lifePalace.stars.some((s) => s.id === "ziwei.star.ziwei");
  const lifeHasTianfu = lifePalace.stars.some((s) => s.id === "ziwei.star.tianfu");
  const lifeIsTigerOrMonkey =
    lifePalace.earthlyBranchId === "ziwei.branch.tiger" ||
    lifePalace.earthlyBranchId === "ziwei.branch.monkey";

  if (lifeHasZiwei && lifeHasTianfu && lifeIsTigerOrMonkey) {
    patterns.push({
      id: "zi-fu-tong-gong",
      palaceIds: [lifePalace.palaceId],
      starIds: ["ziwei.star.ziwei", "ziwei.star.tianfu"],
    });
  }

  // 2. sha-po-lang
  const shaPoLangStars = [
    "ziwei.star.qisha",
    "ziwei.star.pojun",
    "ziwei.star.tanlang",
  ];
  if (shaPoLangStars.every((starId) => lifeScopeStarIds.has(starId))) {
    const { palaceIds, starIds } = collectPatternOccurrence(
      lifeScopePalaces,
      shaPoLangStars,
    );
    patterns.push({ id: "sha-po-lang", palaceIds, starIds });
  }

  // 3. ji-yue-tong-liang
  const jiYueTongLiangStars = [
    "ziwei.star.tianji",
    "ziwei.star.taiyin",
    "ziwei.star.tiantong",
    "ziwei.star.tianliang",
  ];
  if (jiYueTongLiangStars.every((starId) => lifeScopeStarIds.has(starId))) {
    const { palaceIds, starIds } = collectPatternOccurrence(
      lifeScopePalaces,
      jiYueTongLiangStars,
    );
    patterns.push({ id: "ji-yue-tong-liang", palaceIds, starIds });
  }

  // 4. san-qi-jia-hui
  const lu = transformations.find((t) => t.id === "ziwei.transformation.prosperity");
  const quan = transformations.find((t) => t.id === "ziwei.transformation.power");
  const ke = transformations.find((t) => t.id === "ziwei.transformation.fame");

  if (lu && quan && ke) {
    const sanQiStars = [lu.starId, quan.starId, ke.starId];
    if (sanQiStars.every((starId) => lifeScopeStarIds.has(starId))) {
      const { palaceIds, starIds } = collectPatternOccurrence(
        lifeScopePalaces,
        sanQiStars,
      );
      patterns.push({ id: "san-qi-jia-hui", palaceIds, starIds });
    }
  }

  return patterns;
}

function buildEvidenceKeys(
  chart: NormalizedZiweiChartV1,
  patterns: ComprehensiveZiweiPatternFact[],
): string[] {
  const keys: string[] = [];

  // 1. Palace IDs
  for (const palace of chart.palaces) {
    keys.push(palace.id);
  }

  // 2. EarthlyBranch IDs
  for (const palace of chart.palaces) {
    keys.push(palace.earthlyBranchId);
  }

  // 3. HeavenlyStem IDs
  for (const palace of chart.palaces) {
    if (palace.heavenlyStemId) {
      keys.push(palace.heavenlyStemId);
    }
  }

  // 4. Cycle state IDs
  for (const palace of chart.palaces) {
    if (palace.cycleStateId) {
      keys.push(palace.cycleStateId);
    }
  }

  // 5. Star IDs
  for (const palace of chart.palaces) {
    for (const star of palace.stars) {
      keys.push(star.id);
    }
  }

  // 6. Brightness IDs
  for (const palace of chart.palaces) {
    for (const star of palace.stars) {
      if (star.brightness) {
        keys.push(star.brightness);
      }
    }
  }

  // 7. Transformation IDs and source star IDs
  for (const transformation of chart.transformations) {
    keys.push(transformation.id);
    keys.push(transformation.starId);
  }

  // 8. Relation IDs
  keys.push("ziwei.relation.triad");
  keys.push("ziwei.relation.opposition");
  keys.push("ziwei.relation.flanking");

  // 9. Matched pattern IDs
  for (const pattern of patterns) {
    keys.push(pattern.id);
  }

  return Array.from(new Set(keys));
}

export function buildComprehensiveZiweiFacts(
  chart: NormalizedZiweiChartV1,
): ComprehensiveZiweiFacts {
  const palaces = buildPalaceFacts(chart);
  const patterns = detectPatterns(palaces, chart.transformations);
  const evidenceKeys = buildEvidenceKeys(chart, patterns);

  return {
    palaces,
    transformations: chart.transformations,
    patterns,
    evidenceKeys,
  };
}
