import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { NormalizedBirthProfileV1Schema, ZiweiPurchaseFactsV1Schema } from "@lasoviet/contracts";
import { calculateZiweiHoroscope } from "./iztro-horoscope.js";

const profileFor = (date = "1992-06-15", time = "08:30", gender = "male") => NormalizedBirthProfileV1Schema.parse({ version: 1,
  originalInput: { version: 1, calendar: { kind: "solar", date }, time: { precision: "exact_minute", localTime: time }, timezone: { offsetMinutes: 420 }, gender, consentVersion: "synthetic" },
  normalizedCalendar: { kind: "solar", date }, normalizedTime: { precision: "exact_minute", localTime: time },
  timezoneProvenance: { source: "offset", offsetMinutes: 420 }, normalizationWarnings: [], limitations: [] });
const factsAt = (asOfDate: string, targetYear?: number) => calculateZiweiHoroscope(profileFor(), { asOfDate, targetYear }).purchaseFacts!;

it.each([
  ["2026-09-11", 2026, 8, false, 4, false], ["2026-10-10", 2026, 9, false, 3, true],
  ["2027-01-08", 2026, 12, false, 0, true], ["2027-02-05", 2026, 12, false, 0, true],
  ["2027-02-06", 2027, 1, false, 11, false],
  ["2025-06-25", 2025, 6, false, 7, false], ["2025-07-25", 2025, 6, true, 6, false],
  ["2025-08-23", 2025, 7, false, 5, false],
] as const)("counts actual lunar month intervals after %s", (date, year, month, leap, remaining, near) => {
  expect(factsAt(date)).toMatchObject({ lunarYear: year, lunarMonth: { number: month, isLeap: leap },
    remainingLunarMonths: remaining, nearYearEndThreshold: 3, nearYearEnd: near });
});

it("keeps current-cycle progress independent of the selected next-year report", () => {
  const current = calculateZiweiHoroscope(profileFor(), { asOfDate: "2026-10-08", targetYear: 2026 });
  const next = calculateZiweiHoroscope(profileFor(), { asOfDate: "2026-10-08", targetYear: 2027 });
  expect(current.purchaseFacts).toEqual(next.purchaseFacts);
  expect(current.purchaseFacts!.currentDecade).toMatchObject({ span: { ordinal: 3, startAge: 34, endAge: 43, startYear: 2025, endYear: 2034 }, yearInCycle: 2, remainingYears: 8 });
  expect(current.purchaseFacts!.nextDecade).toMatchObject({ ordinal: 4, startAge: 44, endAge: 53, startYear: 2035, endYear: 2044 });
  expect(current.purchaseFacts!.annualPalaces).toEqual([
    { year: 2026, palaceId: current.yearly.annualPalaceId }, { year: 2027, palaceId: next.yearly.annualPalaceId },
  ]);
});

it("derives seven frozen cycle-progress cases from the independently compared reference cohort", () => {
  type Reference = { id: string; birthDate: string; birthTime: string; gender: string; asOfDate: string;
    targetLunarYear: number; referenceLunarBirthYear: number; bureau: string; currentOrdinal: number };
  const reference = JSON.parse(readFileSync(new URL("../../../../plan/evidence/lsv88/decadal-boundary-reference-30.json", import.meta.url), "utf8"));
  expect(reference.scopedComparisonPassed).toBe(true);
  const cases = (reference.cases as Reference[]).filter(item => item.asOfDate === "2026-09-22").slice(0, 7);
  expect(cases).toHaveLength(7);
  const firstAge: Record<string, number> = { water2: 2, wood3: 3, metal4: 4, earth5: 5, fire6: 6 };
  for (const item of cases) {
    const actual = calculateZiweiHoroscope(profileFor(item.birthDate, item.birthTime, item.gender), { asOfDate: item.asOfDate }).purchaseFacts!;
    const startAge = firstAge[item.bureau]! + item.currentOrdinal * 10;
    const startYear = item.referenceLunarBirthYear + startAge - 1;
    const k = item.targetLunarYear - startYear + 1;
    expect(actual.currentDecade, item.id).toMatchObject({ span: { ordinal: item.currentOrdinal, startAge, endAge: startAge + 9, startYear, endYear: startYear + 9 }, yearInCycle: k, remainingYears: 10 - k });
    expect(actual).toMatchObject({ lunarYear: 2026, remainingLunarMonths: 4, provisional: false });
  }
});

it("handles before-first and final-cycle boundaries without fabricating another span", () => {
  const child = calculateZiweiHoroscope(profileFor("2026-01-01"), { asOfDate: "2026-01-15" }).purchaseFacts!;
  expect(child.currentDecade).toBeNull(); expect(child.nextDecade?.ordinal).toBe(0);
  expect(child.annualPalaces.map(item => item.year)).toEqual([2025, 2026]);
  const first = factsAt("1995-07-01"); expect(first.currentDecade).toMatchObject({ span: { ordinal: 0 }, yearInCycle: 1, remainingYears: 9 });
  const older = profileFor("1970-01-01", "00:30");
  const last = calculateZiweiHoroscope(older, { asOfDate: "2079-07-01" }).purchaseFacts!; expect(last.currentDecade).toMatchObject({ span: { ordinal: 10 }, yearInCycle: 10, remainingYears: 0 });
  const final = calculateZiweiHoroscope(older, { asOfDate: "2080-07-01" }).purchaseFacts!; expect(final.currentDecade?.span.ordinal).toBe(11); expect(final.nextDecade).toBeNull();
});

it.each([{ precision: "unknown" } as const, { precision: "range", startLocalTime: "07:00", endLocalTime: "11:00" } as const])("flags existing tentative time selection %j", time => {
  const profile = profileFor(); profile.normalizedTime = time; profile.originalInput.time = time;
  const facts = calculateZiweiHoroscope(profile, { asOfDate: "2026-10-08" }).purchaseFacts!;
  expect(facts.provisional).toBe(true);
});

it("makes the near-year-end threshold configurable and rejects contradictory contract values", () => {
  const facts = calculateZiweiHoroscope(profileFor(), { asOfDate: "2026-09-11", nearYearEndMonthThreshold: 4 }).purchaseFacts!;
  expect(facts.nearYearEnd).toBe(true);
  expect(() => calculateZiweiHoroscope(profileFor(), { asOfDate: "2026-09-11", nearYearEndMonthThreshold: -1 })).toThrow();
  expect(ZiweiPurchaseFactsV1Schema.safeParse({ ...facts, nearYearEnd: false }).success).toBe(false);
  expect(ZiweiPurchaseFactsV1Schema.safeParse({ ...facts, currentDecade: { ...facts.currentDecade, remainingYears: 9 } }).success).toBe(false);
  expect(ZiweiPurchaseFactsV1Schema.safeParse({ ...facts, annualPalaces: [...facts.annualPalaces].reverse() }).success).toBe(false);
  for (const privateKey of ["birthDate", "displayName", "ownerId", "chartId", "chartVersionId", "inputHash", "structuralScore", "evidenceKeys"]) {
    expect(Object.hasOwn(facts, privateKey)).toBe(false);
  }
});
