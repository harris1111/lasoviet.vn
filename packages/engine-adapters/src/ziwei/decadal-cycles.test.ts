import { performance } from "node:perf_hooks";
import { astro } from "iztro";
import { expect, it } from "vitest";
import { NormalizedBirthProfileV1Schema, ZiweiHoroscopeResultV1Schema } from "@lasoviet/contracts";
import { calculateZiweiHoroscope } from "./iztro-horoscope.js";
import { palaceIds, starIds } from "./iztro-mapping.js";

const profileFor = (gender: string, date = "1992-06-15") => NormalizedBirthProfileV1Schema.parse({ version: 1,
  originalInput: { version: 1, calendar: { kind: "solar", date }, time: { precision: "exact_minute", localTime: "08:30" }, timezone: { offsetMinutes: 420 }, consentVersion: "synthetic", gender },
  normalizedCalendar: { kind: "solar", date }, normalizedTime: { precision: "exact_minute", localTime: "08:30" }, timezoneProvenance: { source: "offset", offsetMinutes: 420 }, normalizationWarnings: [], limitations: [] });

it.each(["male", "female"])("preserves all twelve %s vendor cycles and first/seventh annual palaces", (gender) => {
  const profile = profileFor(gender);
  const calculated = calculateZiweiHoroscope(profile, { asOfDate: "2026-09-22", targetYear: 2026 });
  expect(ZiweiHoroscopeResultV1Schema.safeParse(calculated).success).toBe(true);
  const vendor = astro.withOptions({ type: "solar", dateStr: "1992-06-15", timeIndex: 4, gender, language: "en-US", config: { algorithm: "default", yearDivide: "normal", horoscopeDivide: "normal", ageDivide: "normal", dayDivide: "current" } });
  const cycles = vendor.decadalList();
  expect(calculated.decadalCycles).toHaveLength(12);
  expect(new Set(calculated.decadalCycles!.map(c => c.palaceId)).size).toBe(12);
  for (const ordinal of [0, 6]) {
    const actual = calculated.decadalCycles![ordinal]!;
    const expected = cycles[ordinal]!;
    expect(actual).toMatchObject({ ordinal, palaceId: palaceIds[expected.palaceName], startAge: expected.ageRange[0], endAge: expected.ageRange[1], startYear: expected.yearRange[0], endYear: expected.yearRange[1] });
    expect(actual.transformations.map(t => t.starId)).toEqual(expected.mutagen.map(s => starIds[s]));
    expect(actual.annualPalaces.map(a => [a.year, a.age, a.palaceId])).toEqual(vendor.yearlyList(ordinal).map(a => [a.year, a.age, palaceIds[vendor.palaces[a.index]!.name]]));
  }
  const step = (cycles[1]!.index - cycles[0]!.index + 12) % 12;
  expect(calculated.decadalDirection).toBe(step === 1 ? "forward" : "reverse");
  const current = calculated.decadalCycles!.find(c => c.state === "current")!;
  expect(calculated.currentDecadalOrdinal).toBe(current.ordinal);
  expect(calculated.decadal).toMatchObject({ palaceId: current.palaceId, startAge: current.startAge, endAge: current.endAge });
});

it("uses the lunar birth year and remains before the first cycle for a young child", () => {
  const result = calculateZiweiHoroscope(profileFor("female", "2026-01-01"), { asOfDate: "2026-01-15" });
  expect(result.yearly.targetYear).toBe(2025);
  expect(result.yearly.lunarAge).toBe(1);
  expect(result.currentDecadalOrdinal).toBeNull();
  expect(result.decadal).toBeUndefined();
  expect(result.decadalCycles!.every(c => c.state === "future")).toBe(true);
  expect(result.decadalCycles![0]!.startYear).toBe(2025 + result.decadalCycles![0]!.startAge - 1);
});

it("moves state at the exact cycle year boundary while the daily layer stays frozen", () => {
  const profile = profileFor("male");
  const before = calculateZiweiHoroscope(profile, { asOfDate: "2026-09-22", targetYear: 2024 });
  const after = calculateZiweiHoroscope(profile, { asOfDate: "2026-09-22", targetYear: 2025 });
  expect(before.currentDecadalOrdinal).toBe(2);
  expect(after.currentDecadalOrdinal).toBe(3);
  expect(before.daily).toEqual(after.daily);
  const seventh = calculateZiweiHoroscope(profile, { asOfDate: "2026-09-22", targetYear: 2055 });
  expect(seventh.currentDecadalOrdinal).toBe(6);
});

it("replays deterministically with metadata from the vendor rather than a default", () => {
  const profile = profileFor("male");
  const started = performance.now();
  const result = calculateZiweiHoroscope(profile, { asOfDate: "2026-09-22" });
  expect(calculateZiweiHoroscope(profile, { asOfDate: "2026-09-22" })).toEqual(result);
  expect(result.chartMetadata).toEqual({ bureau: "metal4", lifeMasterStarId: "ziwei.star.lucun", bodyMasterStarId: "ziwei.star.tianliang", naYinCycleIndex: 4 });
  // A broad smoke ceiling catches accidental unbounded expansion without encoding CPU speed.
  expect(performance.now() - started).toBeLessThan(5000);
});
