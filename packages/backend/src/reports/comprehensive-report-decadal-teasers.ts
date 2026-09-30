// Which decadal cycles get a short teaser (FD-106b): 7 teasers selected around current cycle.
import type { ZiweiPalaceId } from "@lasoviet/contracts";

import type { ComprehensiveZiweiFactsV4 } from "./comprehensive-ziwei-facts-v4.js";
import { deriveDecadalCycles } from "./report-chart-snapshot.js";

export type TeaserCycle = {
  ordinal: number;
  palaceId: ZiweiPalaceId;
  ageRange: [number, number];
  yearRange: [number, number];
};

export function teaserCyclesFor(facts: ComprehensiveZiweiFactsV4): TeaserCycle[] {
  const decadal = facts.timing.decadal;
  if (decadal.state !== "active") return [];
  const life = facts.natal.palaces.find((p) => p.isLifePalace);
  if (!life) return [];
  const cycles = deriveDecadalCycles(life.earthlyBranchId, decadal);
  if (!cycles) return [];
  const palaceByBranch = new Map(facts.natal.palaces.map((p) => [p.earthlyBranchId, p.palaceId]));
  const current = cycles.find(
    (c) => c.ageRange[0] === decadal.ageRange[0] && c.ageRange[1] === decadal.ageRange[1],
  )?.ordinal;
  if (current === undefined) return [];

  // 8 consecutive engine cycles containing current (3 before / 4 after clamped at boundaries [0, 4])
  const start = current < 8 ? 0 : Math.max(0, Math.min(cycles.length - 8, current - 3));
  const selectedCycles = cycles.slice(start, start + 8);

  return selectedCycles
    .filter((c) => c.ordinal !== current)
    .flatMap((c) => {
      const palaceId = palaceByBranch.get(c.branchId);
      return palaceId ? [{ ordinal: c.ordinal, palaceId, ageRange: c.ageRange, yearRange: c.yearRange }] : [];
    });
}
