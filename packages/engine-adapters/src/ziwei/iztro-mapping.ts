import type {
  CalculationProvenanceV1,
  NormalizedBirthProfileV1,
  NormalizedZiweiChartV1,
  ZiweiPalaceId,
} from "@lasoviet/contracts";

type RawStar = {
  name: string;
  brightness?: string;
  mutagen?: string;
  type?: string;
  category?: "major" | "minor" | "adjective" | "decorative";
  scope?: string;
};

type RawPalace = {
  name: string;
  earthlyBranch: string;
  isBodyPalace: boolean;
  isOriginalPalace?: boolean;
  heavenlyStem?: string;
  heavenlyStemId?: string;
  changsheng12?: string;
  cycleStateId?: string;
  majorStars: RawStar[];
  minorStars: RawStar[];
  adjectiveStars?: RawStar[];
  decorativeStars?: RawStar[];
};

export type RawIztroAstrolabe = {
  palaces: RawPalace[];
};

const palaceIds: Record<string, ZiweiPalaceId> = {
  soul: "ziwei.palace.life",
  siblings: "ziwei.palace.siblings",
  spouse: "ziwei.palace.spouse",
  children: "ziwei.palace.children",
  wealth: "ziwei.palace.wealth",
  health: "ziwei.palace.health",
  surface: "ziwei.palace.travel",
  friends: "ziwei.palace.friends",
  career: "ziwei.palace.career",
  property: "ziwei.palace.property",
  spirit: "ziwei.palace.fortune",
  parents: "ziwei.palace.parents",
};

const branchIds: Record<
  string,
  NormalizedZiweiChartV1["palaces"][number]["earthlyBranchId"]
> = {
  zi: "ziwei.branch.rat",
  chou: "ziwei.branch.ox",
  yin: "ziwei.branch.tiger",
  mao: "ziwei.branch.rabbit",
  chen: "ziwei.branch.dragon",
  si: "ziwei.branch.snake",
  woo: "ziwei.branch.horse",
  wei: "ziwei.branch.goat",
  shen: "ziwei.branch.monkey",
  you: "ziwei.branch.rooster",
  xu: "ziwei.branch.dog",
  hai: "ziwei.branch.pig",
};

const starIds: Record<string, string> = {
  emperor: "ziwei.star.ziwei",
  advisor: "ziwei.star.tianji",
  sun: "ziwei.star.taiyang",
  general: "ziwei.star.wuqu",
  fortunate: "ziwei.star.tiantong",
  judge: "ziwei.star.lianzhen",
  empress: "ziwei.star.tianfu",
  moon: "ziwei.star.taiyin",
  wolf: "ziwei.star.tanlang",
  advocator: "ziwei.star.jumen",
  minister: "ziwei.star.tianxiang",
  sage: "ziwei.star.tianliang",
  marshal: "ziwei.star.qisha",
  rebel: "ziwei.star.pojun",
  officer: "ziwei.star.zuofu",
  helper: "ziwei.star.youbi",
  scholar: "ziwei.star.wenchang",
  artist: "ziwei.star.wenqu",
  money: "ziwei.star.lucun",
  horse: "ziwei.star.tianma",
  driven: "ziwei.star.qingyang",
  tangled: "ziwei.star.tuoluo",
  impulsive: "ziwei.star.huoxing",
  spark: "ziwei.star.lingxing",
  assistant: "ziwei.star.tiankui",
  aide: "ziwei.star.tianyue",
  ideologue: "ziwei.star.dikong",
  fickle: "ziwei.star.dijie",
};

const stemIds: Record<string, string> = {
  jia: "ziwei.stem.jia",
  yi: "ziwei.stem.yi",
  bing: "ziwei.stem.bing",
  ding: "ziwei.stem.ding",
  wu: "ziwei.stem.wu",
  ji: "ziwei.stem.ji",
  geng: "ziwei.stem.geng",
  xin: "ziwei.stem.xin",
  ren: "ziwei.stem.ren",
  gui: "ziwei.stem.gui",
  jiaHeavenly: "ziwei.stem.jia",
  yiHeavenly: "ziwei.stem.yi",
  bingHeavenly: "ziwei.stem.bing",
  dingHeavenly: "ziwei.stem.ding",
  wuHeavenly: "ziwei.stem.wu",
  jiHeavenly: "ziwei.stem.ji",
  gengHeavenly: "ziwei.stem.geng",
  xinHeavenly: "ziwei.stem.xin",
  renHeavenly: "ziwei.stem.ren",
  guiHeavenly: "ziwei.stem.gui",
};

const cycleStateIds: Record<string, string> = {
  born: "ziwei.cycle.born",
  infancy: "ziwei.cycle.infancy",
  adolescence: "ziwei.cycle.adolescence",
  adulthood: "ziwei.cycle.adulthood",
  prime: "ziwei.cycle.prime",
  weak: "ziwei.cycle.weak",
  sick: "ziwei.cycle.sick",
  dead: "ziwei.cycle.dead",
  buried: "ziwei.cycle.buried",
  dissipated: "ziwei.cycle.dissipated",
  embryo: "ziwei.cycle.embryo",
  molding: "ziwei.cycle.molding",
  changsheng: "ziwei.cycle.born",
  muyu: "ziwei.cycle.infancy",
  guandai: "ziwei.cycle.adolescence",
  linguan: "ziwei.cycle.adulthood",
  diwang: "ziwei.cycle.prime",
  shuai: "ziwei.cycle.weak",
  bing: "ziwei.cycle.sick",
  si: "ziwei.cycle.dead",
  mu: "ziwei.cycle.buried",
  jue: "ziwei.cycle.dissipated",
  tai: "ziwei.cycle.embryo",
  yang: "ziwei.cycle.molding",
};

function resolveStarId(star: RawStar): string | undefined {
  if (star.name && /^ziwei\.star\.[a-z0-9-]+$/.test(star.name)) {
    return star.name;
  }
  return starIds[star.name];
}

function resolveHeavenlyStemId(palace: RawPalace): string | undefined {
  if (palace.heavenlyStemId && /^ziwei\.stem\.[a-z0-9-]+$/.test(palace.heavenlyStemId)) {
    return palace.heavenlyStemId;
  }
  if (palace.heavenlyStem) {
    if (palace.heavenlyStem.startsWith("ziwei.stem.")) {
      return palace.heavenlyStem;
    }
    return stemIds[palace.heavenlyStem];
  }
  return undefined;
}

function resolveCycleStateId(palace: RawPalace): string | undefined {
  if (palace.cycleStateId && /^ziwei\.cycle\.[a-z0-9-]+$/.test(palace.cycleStateId)) {
    return palace.cycleStateId;
  }
  const rawCycle = palace.changsheng12;
  if (rawCycle) {
    if (rawCycle.startsWith("ziwei.cycle.")) {
      return rawCycle;
    }
    return cycleStateIds[rawCycle];
  }
  return undefined;
}

function brightness(value: string | undefined) {
  switch (value) {
    case "[+3]":
      return "ziwei.brightness.exalted" as const;
    case "[+2]":
      return "ziwei.brightness.prosperous" as const;
    case "[+1]":
      return "ziwei.brightness.favorable" as const;
    case "[-1]":
      return "ziwei.brightness.unfavorable" as const;
    case "[-2]":
    case "[-3]":
      return "ziwei.brightness.weak" as const;
    default:
      return "ziwei.brightness.neutral" as const;
  }
}

function transformation(value: string | undefined) {
  switch (value) {
    case "A":
      return "ziwei.transformation.prosperity" as const;
    case "B":
      return "ziwei.transformation.power" as const;
    case "C":
      return "ziwei.transformation.fame" as const;
    case "D":
      return "ziwei.transformation.obstacle" as const;
    default:
      return undefined;
  }
}

function warningCodes(profile: NormalizedBirthProfileV1) {
  return [
    {
      code: "ziwei.warning.no-true-solar-time-correction",
      severity: "limitation" as const,
    },
    ...profile.limitations.map((limitation) => ({
      code: `ziwei.warning.${limitation.toLowerCase().replaceAll("_", "-")}`,
      severity: "limitation" as const,
    })),
  ];
}

export function normalizeIztroAstrolabe(
  raw: RawIztroAstrolabe,
  profile: NormalizedBirthProfileV1,
  provenance: CalculationProvenanceV1,
): NormalizedZiweiChartV1 {
  let internalSkippedDecorativeCount = 0;

  const palaces = raw.palaces.map((palace) => {
    const id = palaceIds[palace.name];
    const earthlyBranchId = branchIds[palace.earthlyBranch];
    if (id === undefined || earthlyBranchId === undefined) {
      throw new Error("IZTRO_MAPPING_INVALID");
    }

    const mappedStars: Array<{
      id: string;
      brightness: "ziwei.brightness.exalted" | "ziwei.brightness.prosperous" | "ziwei.brightness.favorable" | "ziwei.brightness.neutral" | "ziwei.brightness.unfavorable" | "ziwei.brightness.weak";
      category: "major" | "minor" | "adjective" | "decorative";
    }> = [];

    for (const star of palace.majorStars) {
      const starId = resolveStarId(star);
      if (starId === undefined) {
        throw new Error("IZTRO_MAPPING_INVALID");
      }
      mappedStars.push({
        id: starId,
        brightness: brightness(star.brightness),
        category: star.category ?? "major",
      });
    }

    for (const star of palace.minorStars) {
      const starId = resolveStarId(star);
      if (starId === undefined) {
        throw new Error("IZTRO_MAPPING_INVALID");
      }
      mappedStars.push({
        id: starId,
        brightness: brightness(star.brightness),
        category: star.category ?? "minor",
      });
    }

    for (const star of (palace.adjectiveStars ?? [])) {
      const starId = resolveStarId(star);
      if (starId === undefined) {
        internalSkippedDecorativeCount += 1;
        continue;
      }
      mappedStars.push({
        id: starId,
        brightness: brightness(star.brightness),
        category: star.category ?? "adjective",
      });
    }

    for (const star of (palace.decorativeStars ?? [])) {
      const starId = resolveStarId(star);
      if (starId === undefined) {
        internalSkippedDecorativeCount += 1;
        continue;
      }
      mappedStars.push({
        id: starId,
        brightness: brightness(star.brightness),
        category: star.category ?? "decorative",
      });
    }

    const heavenlyStemId = resolveHeavenlyStemId(palace);
    const cycleStateId = resolveCycleStateId(palace);

    return {
      id,
      earthlyBranchId,
      ...(heavenlyStemId !== undefined ? { heavenlyStemId } : {}),
      ...(palace.isBodyPalace !== undefined ? { isBodyPalace: Boolean(palace.isBodyPalace) } : {}),
      ...(palace.isOriginalPalace !== undefined ? { isOriginalPalace: Boolean(palace.isOriginalPalace) } : {}),
      ...(cycleStateId !== undefined ? { cycleStateId } : {}),
      stars: mappedStars,
    };
  });
  const transformations = raw.palaces.flatMap((palace) => {
    const allStars = [
      ...palace.majorStars,
      ...palace.minorStars,
      ...(palace.adjectiveStars ?? []),
      ...(palace.decorativeStars ?? []),
    ];
    return allStars.flatMap((star) => {
      const starId = resolveStarId(star);
      const id = transformation(star.mutagen);
      return starId === undefined || id === undefined ? [] : [{ starId, id }];
    });
  });
  const soulPalaceId = palaceIds.soul;
  const bodyPalace = raw.palaces.find((palace) => palace.isBodyPalace);
  const bodyPalaceId = bodyPalace === undefined
    ? undefined
    : palaceIds[bodyPalace.name];
  if (soulPalaceId === undefined || bodyPalaceId === undefined) {
    throw new Error("IZTRO_MAPPING_INVALID");
  }
  return {
    version: 1,
    systemId: "ziwei",
    palaces,
    transformations,
    soulPalaceId,
    bodyPalaceId,
    horoscopeCapabilities: [
      { id: "ziwei.horoscope.decadal", supported: true },
      { id: "ziwei.horoscope.annual", supported: true },
      { id: "ziwei.horoscope.monthly", supported: true },
      { id: "ziwei.horoscope.daily", supported: true },
    ],
    warnings: warningCodes(profile),
    provenance,
  };
}
