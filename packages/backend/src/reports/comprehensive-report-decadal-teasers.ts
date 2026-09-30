// Which decadal cycles get a short teaser (FD-106b): ordinals 0-7 minus the current one.
import type { ZiweiPalaceId } from "@lasoviet/contracts";

import type { ComprehensiveZiweiFactsV4 } from "./comprehensive-ziwei-facts-v4.js";
import { deriveDecadalCycles } from "./report-chart-snapshot.js";

export type TeaserCycle = {
  ordinal: number;
  palaceId: ZiweiPalaceId;
  ageRange: [number, number];
  yearRange: [number, number];
};

const TEASER_ORDINALS = 8;

export function teaserCyclesFor(facts: ComprehensiveZiweiFactsV4): TeaserCycle[] {
  const decadal = facts.timing.decadal;
  if (decadal.state !== "active") return [];
  const life = facts.natal.palaces.find((p) => p.isLifePalace);
  if (!life) return [];
  const cycles = deriveDecadalCycles(life.earthlyBranchId, decadal);
  if (!cycles) return [];
  const palaceByBranch = new Map(facts.natal.palaces.map((p) => [p.earthlyBranchId, p.palaceId]));
  const current = cycles.find((c) => c.ageRange[0] === decadal.ageRange[0])?.ordinal;
  return cycles
    .filter((c) => c.ordinal < TEASER_ORDINALS && c.ordinal !== current)
    .flatMap((c) => {
      const palaceId = palaceByBranch.get(c.branchId);
      return palaceId ? [{ ordinal: c.ordinal, palaceId, ageRange: c.ageRange, yearRange: c.yearRange }] : [];
    });
}
