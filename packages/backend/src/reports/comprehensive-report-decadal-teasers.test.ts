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
  it("has no teasers for inconsistent or ambiguous timing", () => {
    expect(teaserCyclesFor(buildFacts())).toEqual([]);
    const facts = teaserFacts();
    expect(teaserCyclesFor({ ...facts, timing: { ...facts.timing, decadal: { state: "not_started", firstCycleStartAge: 2, firstCycleStartYear: 2002 } } })).toEqual([]);
    expect(teaserCyclesFor({ ...facts, timing: { ...facts.timing, decadal: { ...facts.timing.decadal, ageRange: [2, 11], earthlyBranchId: "ziwei.branch.tiger" } } })).toEqual([]);
  });
});
