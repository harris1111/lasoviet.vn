import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import type { BaziFactsInputV1, BaziFactsV1 } from "@lasoviet/contracts";
import { calculateBaziFacts } from "./lunar-bazi-facts.js";

type Pair = { stemId: string; branchId: string };
type Reference = {
  synthetic: boolean;
  reference: { engine: string; version: string; dayBoundary: string };
  profiles: Array<{ id: string; input: BaziFactsInputV1; expected: {
    year: Pair[]; month: Pair[]; day: Pair[]; hour: Pair | null;
  } }>;
};
const fixture: Reference = JSON.parse(readFileSync(new URL("./fixtures/sxtwl-2.0.7-reference.json", import.meta.url), "utf8"));
const pair = (value: NonNullable<BaziFactsV1["pillars"]["hour"]>): Pair => ({ stemId: value.stemId, branchId: value.branchId });

it("keeps the independent corpus synthetic, pinned and broad across clocks", () => {
  expect(fixture.synthetic).toBe(true);
  expect(fixture.reference).toMatchObject({ engine: "sxtwl", version: "2.0.7", dayBoundary: "local-midnight" });
  expect(fixture.profiles.filter(p => p.id.startsWith("synthetic-"))).toHaveLength(30);
  expect(fixture.profiles.filter(p => p.id.startsWith("jie-"))).toHaveLength(72);
  expect(new Set(fixture.profiles.map(p => p.input.offsetMinutes)).size).toBe(6);
  expect(new Set(fixture.profiles.map(p => p.id)).size).toBe(fixture.profiles.length);
});

it.each(fixture.profiles)("matches independent four-pillar reference: $id", ({ input, expected }) => {
  const actual = calculateBaziFacts(input);
  expect({ year: actual.pillars.year.map(pair), month: actual.pillars.month.map(pair),
    day: actual.pillars.day.map(pair), hour: actual.pillars.hour ? pair(actual.pillars.hour) : null }).toEqual(expected);
  if (input.localTime === null) {
    expect(actual.limitations).toContain("BAZI_HOUR_UNKNOWN");
    expect(actual.evidence.some(item => item.pillar === "hour")).toBe(false);
    if (expected.year.length > 1 || expected.month.length > 1) {
      expect(actual.limitations).toContain("BAZI_SOLAR_TERM_TIME_UNCERTAIN");
    }
  }
});
