import {
  NormalizedZiweiChartV1Schema,
  ReportChartSnapshotV1Schema,
  ZiweiReportSnapshotV1Schema,
  type NormalizedZiweiChartV1,
  type ReportChartSnapshotV1,
  type ZiweiPalaceId,
} from "@lasoviet/contracts";

import { buildComprehensiveZiweiFacts } from "./comprehensive-ziwei-facts.js";

// Display projection of a report's frozen chart for the reader (FD-104 wave 1).

const BRANCH_RING = [
  "ziwei.branch.rat", "ziwei.branch.ox", "ziwei.branch.tiger", "ziwei.branch.rabbit",
  "ziwei.branch.dragon", "ziwei.branch.snake", "ziwei.branch.horse", "ziwei.branch.goat",
  "ziwei.branch.monkey", "ziwei.branch.rooster", "ziwei.branch.dog", "ziwei.branch.pig",
] as const;

// The first decadal cycle starts at the bureau number: age 2 to 6.
const FIRST_CYCLE_MIN_AGE = 2;
const FIRST_CYCLE_MAX_AGE = 6;

type Range = [number, number];

export type DecadalAnchor = { earthlyBranchId: string; ageRange: Range; yearRange: Range };
export type DerivedDecadalCycle = { ordinal: number; branchId: string; ageRange: Range; yearRange: Range };

export type ChartSnapshotTimingInput = {
  decadal:
    | ({ state: "active"; palaceId: ZiweiPalaceId } & DecadalAnchor)
    | { state: "not_started"; firstCycleStartAge: number; firstCycleStartYear: number };
  annual: { targetYear: number; palaceId: ZiweiPalaceId };
};

export function findDecadalOrdinal(ageStart: number): number | null {
  for (let k = 0; k < 12; k++) {
    const first = ageStart - 10 * k;
    if (first >= FIRST_CYCLE_MIN_AGE && first <= FIRST_CYCLE_MAX_AGE) return k;
  }
  return null;
}

export function deriveDecadalCycles(lifeBranchId: string, anchor: DecadalAnchor): DerivedDecadalCycle[] | null {
  const ordinal = findDecadalOrdinal(anchor.ageRange[0]);
  const life = BRANCH_RING.indexOf(lifeBranchId as (typeof BRANCH_RING)[number]);
  const current = BRANCH_RING.indexOf(anchor.earthlyBranchId as (typeof BRANCH_RING)[number]);
  if (ordinal === null || life < 0 || current < 0) return null;
  const forward = (life + ordinal) % 12 === current;
  const backward = (life - ordinal + 120) % 12 === current;
  if (forward === backward) return null; // ordinal 0 or 6, or inconsistent data
  const step = forward ? 1 : -1;
  return Array.from({ length: 12 }, (_, k) => {
    const shift = 10 * (k - ordinal);
    return {
      ordinal: k,
      branchId: BRANCH_RING[(life + step * k + 120) % 12]!,
      ageRange: [anchor.ageRange[0] + shift, anchor.ageRange[1] + shift] as Range,
      yearRange: [anchor.yearRange[0] + shift, anchor.yearRange[1] + shift] as Range,
    };
  });
}

export function buildReportChartSnapshot(
  chart: NormalizedZiweiChartV1,
  timing: ChartSnapshotTimingInput,
): ReportChartSnapshotV1 {
  const facts = buildComprehensiveZiweiFacts(chart);
  const transformationByStar = new Map(chart.transformations.map((t) => [t.starId, t.id]));
  const palaces = facts.palaces.map((p) => ({
    palaceId: p.palaceId,
    earthlyBranchId: p.earthlyBranchId,
    ...(p.heavenlyStemId ? { heavenlyStemId: p.heavenlyStemId } : {}),
    isLife: p.isLifePalace,
    isBody: p.isBodyPalace,
    triadPalaceIds: [p.triadPalaceIds[0]!, p.triadPalaceIds[1]!] as [ZiweiPalaceId, ZiweiPalaceId],
    oppositePalaceId: p.oppositePalaceId,
    stars: p.stars.map((s) => {
      const transformationId = transformationByStar.get(s.id);
      return {
        starId: s.id,
        kind: s.category === "major" ? ("main" as const) : ("aux" as const),
        brightnessId: s.brightness,
        ...(transformationId ? { transformationId } : {}),
      };
    }),
  }));
  const palaceByBranch = new Map(palaces.map((p) => [p.earthlyBranchId, p.palaceId]));
  const life = palaces.find((p) => p.isLife)!;

  let decadal: ReportChartSnapshotV1["decadal"];
  if (timing.decadal.state === "active") {
    const anchor = timing.decadal;
    const derived = deriveDecadalCycles(life.earthlyBranchId, anchor);
    const ordinal = findDecadalOrdinal(anchor.ageRange[0]) ?? 0;
    decadal = derived
      ? {
          currentOrdinal: ordinal,
          cycles: derived.map((c) => ({
            ordinal: c.ordinal,
            palaceId: palaceByBranch.get(c.branchId)!,
            ageRange: c.ageRange,
            yearRange: c.yearRange,
          })),
        }
      : {
          currentOrdinal: ordinal,
          cycles: [{ ordinal, palaceId: anchor.palaceId, ageRange: anchor.ageRange, yearRange: anchor.yearRange }],
        };
  } else {
    const { firstCycleStartAge: age, firstCycleStartYear: year } = timing.decadal;
    decadal = {
      currentOrdinal: null,
      cycles: [{ ordinal: 0, palaceId: life.palaceId, ageRange: [age, age + 9], yearRange: [year, year + 9] }],
    };
  }

  return ReportChartSnapshotV1Schema.parse({
    version: 1,
    palaces,
    decadal,
    annual: { targetYear: timing.annual.targetYear, palaceId: timing.annual.palaceId },
  });
}

// Read path: stored rows are untrusted; any problem hides the visuals, never the report.
export function buildReportChartSnapshotFromStored(
  normalizedOutput: unknown,
  storedSnapshot: unknown,
  chartVersionId: string,
): ReportChartSnapshotV1 | null {
  try {
    const chart = NormalizedZiweiChartV1Schema.safeParse(normalizedOutput);
    const snapshot = ZiweiReportSnapshotV1Schema.safeParse(storedSnapshot);
    if (!chart.success || !snapshot.success || snapshot.data.chartVersionId !== chartVersionId) {
      return null;
    }
    return buildReportChartSnapshot(chart.data, snapshot.data.timing);
  } catch {
    return null;
  }
}
