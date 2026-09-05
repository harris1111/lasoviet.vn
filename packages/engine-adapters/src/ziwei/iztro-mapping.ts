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
};

type RawPalace = {
  name: string;
  earthlyBranch: string;
  isBodyPalace: boolean;
  majorStars: RawStar[];
  minorStars: RawStar[];
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
  const palaces = raw.palaces.map((palace) => {
    const id = palaceIds[palace.name];
    const earthlyBranchId = branchIds[palace.earthlyBranch];
    if (id === undefined || earthlyBranchId === undefined) {
      throw new Error("IZTRO_MAPPING_INVALID");
    }
    return {
      id,
      earthlyBranchId,
      stars: [...palace.majorStars, ...palace.minorStars].map((star) => {
        const starId = starIds[star.name];
        if (starId === undefined) {
          throw new Error("IZTRO_MAPPING_INVALID");
        }
        return { id: starId, brightness: brightness(star.brightness) };
      }),
    };
  });
  const transformations = raw.palaces.flatMap((palace) =>
    [...palace.majorStars, ...palace.minorStars].flatMap((star) => {
      const starId = starIds[star.name];
      const id = transformation(star.mutagen);
      return starId === undefined || id === undefined ? [] : [{ starId, id }];
    }),
  );
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
