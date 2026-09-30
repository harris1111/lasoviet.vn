import { describe, expect, it } from "vitest";
import { teaserCyclesFor } from "./comprehensive-report-decadal-teasers.js";
import { buildFacts } from "./comprehensive-report-test-facts.js";

export function teaserFacts() {
  const facts = buildFacts();
  if (facts.timing.decadal.state !== "active") throw new Error("Expected active timing");
  return { ...facts, timing: { ...facts.timing, decadal: { ...facts.timing.decadal, earthlyBranchId: "ziwei.branch.dragon" } } };
}

describe("derived decadal teaser cycles", () => {
  it("freezes seven non-current cycles from the chart direction", () => {
    const cycles = teaserCyclesFor(teaserFacts());
    expect(cycles.map((cycle) => cycle.ordinal)).toEqual([0, 1, 3, 4, 5, 6, 7]);
    expect(cycles[0]).toEqual({ ordinal: 0, palaceId: "ziwei.palace.life", ageRange: [2, 11], yearRange: [2002, 2011] });
  });

  it("selects a clamped 8-cycle window when current ordinal is 8", () => {
    const facts = teaserFacts();
    // When current ordinal is 8 (ageRange: [82, 91], earthlyBranchId: "ziwei.branch.dog", index: 8):
    const outsideFacts = {
      ...facts,
      timing: {
        ...facts.timing,
        decadal: {
          ...facts.timing.decadal,
          index: 8,
          ageRange: [82, 91] as [number, number],
          yearRange: [2082, 2091] as [number, number],
          earthlyBranchId: "ziwei.branch.dog",
        },
      },
    };
    const cycles = teaserCyclesFor(outsideFacts);
    // start = Math.max(0, Math.min(12 - 8, 8 - 3)) = 4 (ordinals 4..11)
    // Excluding current (8), remaining ordinals are [4, 5, 6, 7, 9, 10, 11] (7 teasers).
    expect(cycles).toHaveLength(7);
    expect(cycles.map((cycle) => cycle.ordinal)).toEqual([4, 5, 6, 7, 9, 10, 11]);
  });

  it("selects window for current ordinal 9 (3 before / 4 after clamped to 4..11)", () => {
    const facts = teaserFacts();
    // When current ordinal is 9 (ageRange: [92, 101], earthlyBranchId: "ziwei.branch.pig", index: 9):
    const outsideFacts9 = {
      ...facts,
      timing: {
        ...facts.timing,
        decadal: {
          ...facts.timing.decadal,
          index: 9,
          ageRange: [92, 101] as [number, number],
          yearRange: [2092, 2101] as [number, number],
          earthlyBranchId: "ziwei.branch.pig",
        },
      },
    };
    const cycles = teaserCyclesFor(outsideFacts9);
    // start = Math.max(0, Math.min(4, 9 - 3)) = 4 (ordinals 4..11 clamped at upper bound 4)
    // Excluding current (9): [4, 5, 6, 7, 8, 10, 11]
    expect(cycles).toHaveLength(7);
    expect(cycles.map((cycle) => cycle.ordinal)).toEqual([4, 5, 6, 7, 8, 10, 11]);
  });

  it("selects window for boundary ordinal 11 clamped at upper boundary", () => {
    const facts = teaserFacts();
    // When current ordinal is 11 (ageRange: [112, 121], earthlyBranchId: "ziwei.branch.ox", index: 11):
    const boundaryFacts = {
      ...facts,
      timing: {
        ...facts.timing,
        decadal: {
          ...facts.timing.decadal,
          index: 11,
          ageRange: [112, 121] as [number, number],
          yearRange: [2112, 2121] as [number, number],
          earthlyBranchId: "ziwei.branch.ox",
        },
      },
    };
    const cycles = teaserCyclesFor(boundaryFacts);
    // Window is 4..11, excluding 11: [4, 5, 6, 7, 8, 9, 10]
    expect(cycles).toHaveLength(7);
    expect(cycles.map((cycle) => cycle.ordinal)).toEqual([4, 5, 6, 7, 8, 9, 10]);
  });

  it("has no teasers for inconsistent or ambiguous timing (confirms 0/6 ambiguous closed)", () => {
    expect(teaserCyclesFor(buildFacts())).toEqual([]);
    const facts = teaserFacts();
    expect(teaserCyclesFor({ ...facts, timing: { ...facts.timing, decadal: { state: "not_started", firstCycleStartAge: 2, firstCycleStartYear: 2002 } } })).toEqual([]);
    // Ambiguous ordinal 0 (anchor on life palace branch itself: tiger): deriveDecadalCycles returns null -> []
    expect(teaserCyclesFor({ ...facts, timing: { ...facts.timing, decadal: { ...facts.timing.decadal, ageRange: [2, 11], earthlyBranchId: "ziwei.branch.tiger" } } })).toEqual([]);
    // Ambiguous ordinal 6 (opposite branch monkey from tiger): deriveDecadalCycles returns null -> []
    expect(teaserCyclesFor({ ...facts, timing: { ...facts.timing, decadal: { ...facts.timing.decadal, ageRange: [62, 71], earthlyBranchId: "ziwei.branch.monkey" } } })).toEqual([]);
  });
});
