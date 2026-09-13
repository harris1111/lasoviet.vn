import { createHash } from "node:crypto";

import { astro } from "iztro";

import {
  ZIWEI_PALACE_IDS,
  ZiweiReportSnapshotV1Schema,
  type NormalizedBirthProfileV1,
  type NormalizedZiweiChartV1,
  type Result,
  type ZiweiBranchId,
  type ZiweiPalaceId,
  type ZiweiReportSnapshotV1,
  type ZiweiSensitiveFact,
  type ZiweiSensitivitySnapshotV1,
  type ZiweiTimeFrame,
  type ZiweiTimingAnnualLayerV1,
  type ZiweiTimingConfigV1,
  type ZiweiTimingDecadalLayerV1,
  type ZiweiTimingPalace,
  type ZiweiTimingProvenanceV1,
  type ZiweiTimingSnapshotV1,
  type ZiweiTimingStar,
  type ZiweiTimingTransformation,
} from "@lasoviet/contracts";

import { IZTRO_ADAPTER_VERSION, iztroGender, iztroTimeIndex } from "./iztro-adapter.js";
import {
  branchIds,
  cycleStateIds,
  normalizeIztroAstrolabe,
  palaceIds,
  starIds,
  stemIds,
  type RawIztroAstrolabe,
} from "./iztro-mapping.js";

export const ZIWEI_TIMING_RULE_VERSION_V1 = "ziwei.timing.v1";
export const ZIWEI_SENSITIVITY_RULE_VERSION_V1 = "ziwei.sensitivity.v1";

export type CalculateIztroReportSnapshotInput = {
  chartVersionId: string;
  birthProfile: NormalizedBirthProfileV1;
  asOfDate: string;
  targetYear: number;
  timingRuleVersion?: string;
  sensitivityRuleVersion?: string;
};

const MUTAGEN_TRANSFORMATIONS = [
  "ziwei.transformation.prosperity",
  "ziwei.transformation.power",
  "ziwei.transformation.fame",
  "ziwei.transformation.obstacle",
] as const;

const TIME_FRAME_BRANCH_NAMES: Record<number, string> = {
  0: "rat",
  1: "ox",
  2: "tiger",
  3: "rabbit",
  4: "dragon",
  5: "snake",
  6: "horse",
  7: "goat",
  8: "monkey",
  9: "rooster",
  10: "dog",
  11: "pig",
  12: "late-rat",
};

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function failure(
  code: "ENGINE_INPUT_INVALID" | "ENGINE_UNAVAILABLE" | "NORMALIZATION_INVALID",
): Result<never, "ENGINE_INPUT_INVALID" | "ENGINE_UNAVAILABLE" | "NORMALIZATION_INVALID"> {
  return {
    ok: false,
    error: {
      code,
      messageKey: `ziwei.${code.toLowerCase()}`,
      retryable: code === "ENGINE_UNAVAILABLE",
    },
  };
}

function resolveTimingStarId(starName: string): string | undefined {
  if (starIds[starName]) {
    return starIds[starName];
  }
  const baseName = starName.replace(/\([A-Z]\)$/, "");
  return starIds[baseName];
}

function resolveStarCategory(starName: string): "major" | "minor" | "adjective" | "decorative" | undefined {
  const baseName = starName.replace(/\([A-Z]\)$/, "");
  const minorNames = new Set([
    "officer", "helper", "scholar", "artist", "money", "horse",
    "driven", "tangled", "impulsive", "spark", "assistant", "aide", "ideologue", "fickle",
  ]);
  const adjectiveNames = new Set([
    "attractive", "cheerful", "social", "passionate", "considery", "considery(Y)",
    "senior", "dignified", "grateful", "noble", "talented", "refined", "gifted",
    "ageless", "honorable", "awarded", "psychic", "religious", "solemn", "lucky",
    "gourmet", "sickly", "blessed", "peaceful", "utopian", "fancied", "intercepted",
    "bottomless", "virtuous", "interrupted", "murder", "wastrel", "alone", "lonely",
    "instigated", "broken", "serious", "gloomy", "upset", "frail", "heaven", "wounded",
  ]);
  if (minorNames.has(baseName)) return "minor";
  if (adjectiveNames.has(baseName) || adjectiveNames.has(starName)) return "adjective";
  return undefined;
}

function buildTimingPalaces(
  cycleData: {
    palaceNames: string[];
    stars?: Array<Array<{ name: string; brightness?: string }>>;
    mutagen?: string[];
  },
  astrolabe: ReturnType<typeof astro.withOptions>,
): ZiweiTimingPalace[] | null {
  const palaces: ZiweiTimingPalace[] = [];

  for (const expectedPalaceId of ZIWEI_PALACE_IDS) {
    const physicalIdx = cycleData.palaceNames.findIndex(
      (pName) => palaceIds[pName] === expectedPalaceId,
    );
    if (physicalIdx === -1) {
      return null;
    }

    const physicalPalace = astrolabe.palaces[physicalIdx];
    if (!physicalPalace) {
      return null;
    }

    const earthlyBranchId = branchIds[physicalPalace.earthlyBranch];
    const heavenlyStemId = stemIds[physicalPalace.heavenlyStem];
    const isOriginalPalace = Boolean(physicalPalace.isOriginalPalace);
    const rawCycle = physicalPalace.changsheng12;
    const cycleStateId = rawCycle ? cycleStateIds[rawCycle] : undefined;

    if (!earthlyBranchId || !heavenlyStemId || !cycleStateId) {
      return null;
    }

    const rawStars = (cycleData.stars && cycleData.stars[physicalIdx]) ?? [];
    const timingStars: ZiweiTimingStar[] = [];
    for (const rawStar of rawStars) {
      const id = resolveTimingStarId(rawStar.name);
      if (!id) {
        return null;
      }
      const category = resolveStarCategory(rawStar.name);
      timingStars.push({
        id,
        ...(category !== undefined ? { category } : {}),
      });
    }
    timingStars.sort((a, b) => a.id.localeCompare(b.id));

    const transformations: ZiweiTimingTransformation[] = [];
    const mutagenList = cycleData.mutagen ?? [];
    for (let pos = 0; pos < 4; pos++) {
      const mutStarName = mutagenList[pos];
      if (!mutStarName) continue;
      const mutStarId = resolveTimingStarId(mutStarName);
      if (!mutStarId) {
        return null;
      }

      let natalPhysicalIdx = -1;
      for (let pIdx = 0; pIdx < 12; pIdx++) {
        const natP = astrolabe.palaces[pIdx]!;
        const allStars = [
          ...natP.majorStars,
          ...natP.minorStars,
          ...(natP.adjectiveStars ?? []),
        ];
        if (allStars.some((st) => st.name === mutStarName || resolveTimingStarId(st.name) === mutStarId)) {
          natalPhysicalIdx = pIdx;
          break;
        }
      }

      if (natalPhysicalIdx === physicalIdx) {
        transformations.push({
          starId: mutStarId,
          id: MUTAGEN_TRANSFORMATIONS[pos]!,
        });
      }
    }
    transformations.sort((a, b) => a.starId.localeCompare(b.starId) || a.id.localeCompare(b.id));

    palaces.push({
      palaceId: expectedPalaceId,
      heavenlyStemId,
      earthlyBranchId: earthlyBranchId as ZiweiBranchId,
      isOriginalPalace,
      cycleStateId,
      stars: timingStars,
      transformations,
    });
  }

  return palaces;
}

function getShiftedSolarDate(solarDateStr: string, offset: -1 | 0 | 1): string {
  const [y, m, d] = solarDateStr.split("-").map(Number);
  if (offset === 0) {
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  const date = new Date(Date.UTC(y!, m! - 1, d! + offset));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function areStringArraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export async function calculateIztroReportSnapshot(
  input: CalculateIztroReportSnapshotInput,
  config?: Partial<ZiweiTimingConfigV1>,
): Promise<
  Result<
    ZiweiReportSnapshotV1,
    "ENGINE_INPUT_INVALID" | "ENGINE_UNAVAILABLE" | "NORMALIZATION_INVALID"
  >
> {
  const timingRuleVersion = input.timingRuleVersion ?? ZIWEI_TIMING_RULE_VERSION_V1;
  const sensitivityRuleVersion = input.sensitivityRuleVersion ?? ZIWEI_SENSITIVITY_RULE_VERSION_V1;

  if (!input.chartVersionId || typeof input.chartVersionId !== "string") {
    return failure("ENGINE_INPUT_INVALID");
  }

  if (!input.asOfDate || !/^\d{4}-\d{2}-\d{2}$/.test(input.asOfDate)) {
    return failure("ENGINE_INPUT_INVALID");
  }

  const asOfDateYear = parseInt(input.asOfDate.slice(0, 4), 10);
  if (input.targetYear !== asOfDateYear) {
    return failure("ENGINE_INPUT_INVALID");
  }

  const resolvedGender = iztroGender(input.birthProfile);
  if (resolvedGender === undefined) {
    return failure("ENGINE_INPUT_INVALID");
  }

  const selectedVendorTimeIndex = iztroTimeIndex(input.birthProfile);
  if (
    selectedVendorTimeIndex === undefined ||
    selectedVendorTimeIndex < 0 ||
    selectedVendorTimeIndex > 12
  ) {
    return failure("ENGINE_INPUT_INVALID");
  }

  if (config) {
    if (
      (config.yearDivide !== undefined && config.yearDivide !== "normal") ||
      (config.horoscopeDivide !== undefined && config.horoscopeDivide !== "normal") ||
      (config.ageDivide !== undefined && config.ageDivide !== "normal") ||
      (config.dayDivide !== undefined && config.dayDivide !== "current")
    ) {
      return failure("ENGINE_INPUT_INVALID");
    }
  }

  let selectedAstrolabe: ReturnType<typeof astro.withOptions>;
  try {
    selectedAstrolabe = astro.withOptions({
      type: input.birthProfile.normalizedCalendar.kind,
      dateStr: input.birthProfile.normalizedCalendar.date,
      timeIndex: selectedVendorTimeIndex,
      gender: resolvedGender,
      isLeapMonth: input.birthProfile.normalizedCalendar.kind === "lunar"
        ? input.birthProfile.normalizedCalendar.isLeapMonth
        : undefined,
      language: "en-US",
      config: {
        algorithm: "default",
        yearDivide: "normal",
        horoscopeDivide: "normal",
        ageDivide: "normal",
        dayDivide: "current",
      },
    });
  } catch {
    return failure("ENGINE_UNAVAILABLE");
  }

  let decadalList: ReturnType<typeof selectedAstrolabe.decadalList>;
  try {
    decadalList = selectedAstrolabe.decadalList();
  } catch {
    return failure("ENGINE_UNAVAILABLE");
  }

  if (decadalList.length === 0) {
    return failure("NORMALIZATION_INVALID");
  }

  const earliestDecadal = decadalList.reduce((min, cur) =>
    cur.yearRange[0] < min.yearRange[0] ? cur : min,
  decadalList[0]!);

  const matchedDecadal = decadalList.find(
    (item) => input.targetYear >= item.yearRange[0] && input.targetYear <= item.yearRange[1],
  );

  let decadalLayer: ZiweiTimingDecadalLayerV1;

  if (matchedDecadal) {
    const decadalPalaces = buildTimingPalaces(matchedDecadal, selectedAstrolabe);
    if (!decadalPalaces) {
      return failure("NORMALIZATION_INVALID");
    }

    const decadalPalaceId = palaceIds[matchedDecadal.palaceName];
    const decadalStemId = stemIds[matchedDecadal.heavenlyStem];
    const decadalBranchId = branchIds[matchedDecadal.earthlyBranch];
    if (!decadalPalaceId || !decadalStemId || !decadalBranchId) {
      return failure("NORMALIZATION_INVALID");
    }

    decadalLayer = {
      state: "active",
      index: matchedDecadal.index,
      ageRange: [matchedDecadal.ageRange[0], matchedDecadal.ageRange[1]],
      yearRange: [matchedDecadal.yearRange[0], matchedDecadal.yearRange[1]],
      palaceId: decadalPalaceId,
      heavenlyStemId: decadalStemId,
      earthlyBranchId: decadalBranchId as ZiweiBranchId,
      palaces: decadalPalaces,
    };
  } else if (input.targetYear < earliestDecadal.yearRange[0]) {
    decadalLayer = {
      state: "not_started",
      firstCycleStartAge: earliestDecadal.ageRange[0],
      firstCycleStartYear: earliestDecadal.yearRange[0],
    };
  } else {
    return failure("ENGINE_INPUT_INVALID");
  }

  let hs: ReturnType<typeof selectedAstrolabe.horoscope>;
  try {
    hs = selectedAstrolabe.horoscope(input.asOfDate, selectedVendorTimeIndex);
  } catch {
    return failure("ENGINE_UNAVAILABLE");
  }
  const yearly = hs.yearly;

  const annualPalaces = buildTimingPalaces(yearly, selectedAstrolabe);
  if (!annualPalaces) {
    return failure("NORMALIZATION_INVALID");
  }

  const annualCyclePalaceName = yearly.palaceNames[yearly.index];
  const annualPalaceId = annualCyclePalaceName ? palaceIds[annualCyclePalaceName] : undefined;
  const annualStemId = stemIds[yearly.heavenlyStem];
  const annualBranchId = branchIds[yearly.earthlyBranch];
  if (!annualPalaceId || !annualStemId || !annualBranchId) {
    return failure("NORMALIZATION_INVALID");
  }

  const annualLayer: ZiweiTimingAnnualLayerV1 = {
    targetYear: input.targetYear,
    palaceId: annualPalaceId,
    heavenlyStemId: annualStemId,
    earthlyBranchId: annualBranchId as ZiweiBranchId,
    palaces: annualPalaces,
  };

  const timingProvenance: ZiweiTimingProvenanceV1 = {
    engineId: "ziwei.iztro",
    engineVersion: "2.6.0",
    adapterId: "ziwei.iztro-adapter",
    adapterVersion: IZTRO_ADAPTER_VERSION,
    ruleSetId: "ziwei.default",
    config: {
      yearDivide: "normal",
      horoscopeDivide: "normal",
      ageDivide: "normal",
      dayDivide: "current",
    },
  };

  const timingSnapshot: ZiweiTimingSnapshotV1 = {
    decadal: decadalLayer,
    annual: annualLayer,
    provenance: timingProvenance,
  };

  let prevIndex: number;
  let prevOffset: -1 | 0 | 1;
  let nextIndex: number;
  let nextOffset: -1 | 0 | 1;

  if (selectedVendorTimeIndex === 0) {
    prevIndex = 12;
    prevOffset = -1;
    nextIndex = 1;
    nextOffset = 0;
  } else if (selectedVendorTimeIndex === 12) {
    prevIndex = 11;
    prevOffset = 0;
    nextIndex = 0;
    nextOffset = 1;
  } else {
    prevIndex = selectedVendorTimeIndex - 1;
    prevOffset = 0;
    nextIndex = selectedVendorTimeIndex + 1;
    nextOffset = 0;
  }

  const selectedFrame: ZiweiTimeFrame = {
    position: "selected",
    vendorTimeIndex: selectedVendorTimeIndex,
    civilDateOffset: 0,
    frameId: `ziwei.time-frame.${TIME_FRAME_BRANCH_NAMES[selectedVendorTimeIndex]}`,
  };

  const previousFrame: ZiweiTimeFrame = {
    position: "previous",
    vendorTimeIndex: prevIndex,
    civilDateOffset: prevOffset,
    frameId: `ziwei.time-frame.${TIME_FRAME_BRANCH_NAMES[prevIndex]}`,
  };

  const nextFrame: ZiweiTimeFrame = {
    position: "next",
    vendorTimeIndex: nextIndex,
    civilDateOffset: nextOffset,
    frameId: `ziwei.time-frame.${TIME_FRAME_BRANCH_NAMES[nextIndex]}`,
  };

  const prevDateStr = getShiftedSolarDate(selectedAstrolabe.solarDate, prevOffset);
  const nextDateStr = getShiftedSolarDate(selectedAstrolabe.solarDate, nextOffset);

  let prevAstrolabe: ReturnType<typeof astro.withOptions>;
  let nextAstrolabe: ReturnType<typeof astro.withOptions>;

  try {
    prevAstrolabe = astro.withOptions({
      type: "solar",
      dateStr: prevDateStr,
      timeIndex: prevIndex,
      gender: resolvedGender,
      language: "en-US",
      config: {
        algorithm: "default",
        yearDivide: "normal",
        horoscopeDivide: "normal",
        ageDivide: "normal",
        dayDivide: "current",
      },
    });

    nextAstrolabe = astro.withOptions({
      type: "solar",
      dateStr: nextDateStr,
      timeIndex: nextIndex,
      gender: resolvedGender,
      language: "en-US",
      config: {
        algorithm: "default",
        yearDivide: "normal",
        horoscopeDivide: "normal",
        ageDivide: "normal",
        dayDivide: "current",
      },
    });
  } catch {
    return failure("ENGINE_UNAVAILABLE");
  }

  const internalProvenance = {
    version: 1 as const,
    engineId: "ziwei.iztro",
    engineVersion: "2.6.0",
    adapterId: "ziwei.iztro-adapter",
    adapterVersion: IZTRO_ADAPTER_VERSION,
    schemaId: "normalized-ziwei-chart-v1",
    ruleSetId: "ziwei.default",
    inputHash: "0".repeat(64),
    configHash: "0".repeat(64),
    rawSnapshotHash: "0".repeat(64),
    calculatedAt: "2026-09-12T00:00:00+00:00",
    limitations: [],
  };

  let chartPrev: NormalizedZiweiChartV1;
  let chartSel: NormalizedZiweiChartV1;
  let chartNext: NormalizedZiweiChartV1;

  try {
    chartPrev = normalizeIztroAstrolabe(
      prevAstrolabe.toJSON() as unknown as RawIztroAstrolabe,
      input.birthProfile,
      internalProvenance,
    );
    chartSel = normalizeIztroAstrolabe(
      selectedAstrolabe.toJSON() as unknown as RawIztroAstrolabe,
      input.birthProfile,
      internalProvenance,
    );
    chartNext = normalizeIztroAstrolabe(
      nextAstrolabe.toJSON() as unknown as RawIztroAstrolabe,
      input.birthProfile,
      internalProvenance,
    );
  } catch {
    return failure("NORMALIZATION_INVALID");
  }

  type FactDimension = {
    factKey: string;
    extract: (chart: NormalizedZiweiChartV1) => {
      valueIds: string[];
      evidenceKeys: string[];
    };
  };

  const dimensions: FactDimension[] = [
    {
      factKey: "ziwei.fact.soul-palace",
      extract: (c) => ({
        valueIds: [c.soulPalaceId],
        evidenceKeys: [c.soulPalaceId],
      }),
    },
    {
      factKey: "ziwei.fact.body-palace",
      extract: (c) => ({
        valueIds: [c.bodyPalaceId],
        evidenceKeys: [c.bodyPalaceId],
      }),
    },
    {
      factKey: "ziwei.fact.transformations",
      extract: (c) => {
        const sorted = [...c.transformations].sort(
          (a, b) => a.starId.localeCompare(b.starId) || a.id.localeCompare(b.id),
        );
        return {
          valueIds: sorted.map((t) => `${t.starId}:${t.id}`),
          evidenceKeys: sorted.length > 0 ? sorted.map((t) => t.starId) : ["ziwei.palace.life"],
        };
      },
    },
  ];

  for (const palaceId of ZIWEI_PALACE_IDS) {
    const shortName = palaceId.replace("ziwei.palace.", "");

    dimensions.push({
      factKey: `ziwei.fact.${shortName}-palace-branch`,
      extract: (c) => {
        const p = c.palaces.find((pal) => pal.id === palaceId);
        return {
          valueIds: p ? [p.earthlyBranchId] : [],
          evidenceKeys: [palaceId],
        };
      },
    });

    dimensions.push({
      factKey: `ziwei.fact.${shortName}-palace-stem`,
      extract: (c) => {
        const p = c.palaces.find((pal) => pal.id === palaceId);
        return {
          valueIds: p?.heavenlyStemId ? [p.heavenlyStemId] : [],
          evidenceKeys: [palaceId],
        };
      },
    });

    dimensions.push({
      factKey: `ziwei.fact.${shortName}-palace-is-body`,
      extract: (c) => {
        const p = c.palaces.find((pal) => pal.id === palaceId);
        return {
          valueIds: [String(Boolean(p?.isBodyPalace))],
          evidenceKeys: [palaceId],
        };
      },
    });

    dimensions.push({
      factKey: `ziwei.fact.${shortName}-palace-is-original`,
      extract: (c) => {
        const p = c.palaces.find((pal) => pal.id === palaceId);
        return {
          valueIds: [String(Boolean(p?.isOriginalPalace))],
          evidenceKeys: [palaceId],
        };
      },
    });

    dimensions.push({
      factKey: `ziwei.fact.${shortName}-palace-cycle-state`,
      extract: (c) => {
        const p = c.palaces.find((pal) => pal.id === palaceId);
        return {
          valueIds: p?.cycleStateId ? [p.cycleStateId] : [],
          evidenceKeys: [palaceId],
        };
      },
    });

    dimensions.push({
      factKey: `ziwei.fact.${shortName}-palace-stars`,
      extract: (c) => {
        const p = c.palaces.find((pal) => pal.id === palaceId);
        const sorted = p ? [...p.stars].sort((a, b) => a.id.localeCompare(b.id)) : [];
        return {
          valueIds: sorted.map((s) => `${s.id}:${s.brightness}:${s.category}`),
          evidenceKeys: [palaceId],
        };
      },
    });
  }

  const stableFactKeys: string[] = [];
  const sensitiveFacts: ZiweiSensitiveFact[] = [];

  for (const dim of dimensions) {
    const prevVal = dim.extract(chartPrev);
    const selVal = dim.extract(chartSel);
    const nextVal = dim.extract(chartNext);

    const isStable =
      areStringArraysEqual(prevVal.valueIds, selVal.valueIds) &&
      areStringArraysEqual(selVal.valueIds, nextVal.valueIds);

    if (isStable) {
      stableFactKeys.push(dim.factKey);
    } else {
      sensitiveFacts.push({
        factKey: dim.factKey,
        variants: [
          {
            position: "previous",
            valueIds: prevVal.valueIds,
            evidenceKeys: prevVal.evidenceKeys,
          },
          {
            position: "selected",
            valueIds: selVal.valueIds,
            evidenceKeys: selVal.evidenceKeys,
          },
          {
            position: "next",
            valueIds: nextVal.valueIds,
            evidenceKeys: nextVal.evidenceKeys,
          },
        ],
      });
    }
  }

  const sensitivitySnapshot: ZiweiSensitivitySnapshotV1 = {
    selectedFrame,
    previousFrame,
    nextFrame,
    stableFactKeys,
    sensitiveFacts,
  };

  const unhashedProvenance = {
    chartVersionId: input.chartVersionId,
    timingRuleVersion,
    sensitivityRuleVersion,
  };

  const payloadWithoutHash = {
    version: 1 as const,
    chartVersionId: input.chartVersionId,
    asOfDate: input.asOfDate,
    timezone: "Asia/Ho_Chi_Minh" as const,
    timingRuleVersion,
    sensitivityRuleVersion,
    timing: timingSnapshot,
    sensitivity: sensitivitySnapshot,
    provenance: unhashedProvenance,
  };

  const snapshotHash = createHash("sha256")
    .update(canonicalJson(payloadWithoutHash))
    .digest("hex");

  const finalSnapshot: ZiweiReportSnapshotV1 = {
    ...payloadWithoutHash,
    provenance: {
      ...unhashedProvenance,
      snapshotHash,
    },
  };

  const parseResult = ZiweiReportSnapshotV1Schema.safeParse(finalSnapshot);
  if (!parseResult.success) {
    return failure("NORMALIZATION_INVALID");
  }

  return {
    ok: true,
    value: parseResult.data,
  };
}
