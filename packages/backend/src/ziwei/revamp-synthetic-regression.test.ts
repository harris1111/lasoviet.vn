import { performance } from "node:perf_hooks";
import { Solar } from "lunar-typescript";
import { afterAll, expect, it } from "vitest";
import { NormalizedBirthProfileV1Schema, ZiweiHoroscopeResultV1Schema, validateFreeReadingReferences } from "@lasoviet/contracts";
import { IztroAdapter, calculateZiweiHoroscope } from "../../../engine-adapters/src/index.js";
import { buildFreeReadingFacts } from "./free-reading-facts.js";
import { compileFreeReadingFallback } from "./free-reading-fallback.js";
import { checkFreeReadingQuality } from "./free-reading-quality.js";
import { buildFreeReadingPrompt } from "./free-reading-prompt.js";

const asOfDate = "2026-09-30";
const bureauAges = {water2: 2, wood3: 3, metal4: 4, earth5: 5, fire6: 6} as const;
const branches = ["rat", "ox", "tiger", "rabbit", "dragon", "snake", "horse", "goat", "monkey", "rooster", "dog", "pig"];
function syntheticProfile(index: number) {
  const year = index >= 188 ? 2024 : 1940 + Math.floor(index / 12);
  const month = index % 12 + 1;
  const day = index % 25 + 1;
  const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const localTime = `${String(index % 24).padStart(2, "0")}:30`;
  const time = index % 17 === 0 ? {precision: "unknown" as const} : {precision: "exact_minute" as const, localTime};
  const gender = index % 2 ? "female" : "male";
  return NormalizedBirthProfileV1Schema.parse({version: 1,
    originalInput: {version: 1, calendar: {kind: "solar", date}, time, timezone: {offsetMinutes: 420}, gender, consentVersion: "synthetic"},
    normalizedCalendar: {kind: "solar", date}, normalizedTime: time, timezoneProvenance: {source: "offset", offsetMinutes: 420},
    normalizationWarnings: [], limitations: []});
}

const profiles = Array.from({length: 200}, (_, index) => syntheticProfile(index));
const bureaus = new Set<string>(); const directions = new Set<string>();
let annualRows = 0, currentCycles = 0, preCycleCharts = 0, provisionalCharts = 0, preparedLocales = 0;
const started = performance.now();
it("contains 200 distinct normalized synthetic profiles", () => {
  expect(new Set(profiles.map(profile => JSON.stringify(profile))).size).toBe(200);
});
it.each(profiles.map((profile, index) => ({index, profile})))
  ("checks complete cycles and private VI/EN fallback for synthetic chart$index", async ({index, profile}) => {

    const targetYear = index % 2 ? 2027 : 2026;
    const result = await new IztroAdapter().calculateWithPrivateSnapshot({birthProfile: profile});
    if (!result.result.ok) throw new Error(`SYNTHETIC_CHART_FAILED:${index}`);
    const chart = result.result.output;
    const calculationOptions = {asOfDate, targetYear, chartId: `synthetic-chart-${index}`, chartVersionId: `synthetic-version-${index}`};
    const horoscope = calculateZiweiHoroscope(profile, calculationOptions);
    expect(ZiweiHoroscopeResultV1Schema.safeParse(horoscope).success, `horoscope:${index}`).toBe(true);
    const cycles = horoscope.decadalCycles!;
    const metadata = horoscope.chartMetadata!;
    bureaus.add(metadata.bureau); directions.add(horoscope.decadalDirection!);
    expect(cycles).toHaveLength(12);
    expect(new Set(cycles.map(cycle => cycle.palaceId)).size).toBe(12);
    const birth = profile.normalizedCalendar.date.split("-").map(Number);
    const birthYear = Solar.fromYmd(birth[0]!, birth[1]!, birth[2]!).getLunar().getYear();
    const age = targetYear - birthYear + 1;
    const forward = (birthYear % 2 === 0) === (profile.originalInput.gender === "male");
    expect(horoscope.decadalDirection).toBe(forward ? "forward" : "reverse");
    const soulBranch = chart.palaces.find(palace => palace.id === chart.soulPalaceId)!.earthlyBranchId.split(".").at(-1)!;
    const soulIndex = branches.indexOf(soulBranch);
    expect(soulIndex).toBeGreaterThanOrEqual(0);
    const current = cycles.filter(cycle => cycle.startAge <= age && cycle.endAge >= age);
    expect(current.length).toBeLessThanOrEqual(1);
    if (current.length) currentCycles++;
    else preCycleCharts++;
    expect(horoscope.currentDecadalOrdinal).toBe(current[0]?.ordinal ?? null);
    for (const [ordinal, cycle] of cycles.entries()) {
      expect(cycle.ordinal).toBe(ordinal);
      expect(cycle.startAge).toBe(bureauAges[metadata.bureau] + ordinal * 10);
      expect(cycle.endAge).toBe(cycle.startAge + 9);
      expect(cycle.startYear).toBe(birthYear + cycle.startAge - 1);
      expect(cycle.endYear).toBe(cycle.startYear + 9);
      expect(cycle.state).toBe(age < cycle.startAge ? "future" : age > cycle.endAge ? "past" : "current");
      const expectedBranch = branches[(soulIndex + (forward ? ordinal : -ordinal) + 120) % 12];
      expect(chart.palaces.find(palace => palace.id === cycle.palaceId)!.earthlyBranchId).toBe(`ziwei.branch.${expectedBranch}`);
      expect(cycle.annualPalaces).toHaveLength(10);
      expect(cycle.annualPalaces.map(row => row.year)).toEqual(Array.from({length: 10}, (_, offset) => cycle.startYear + offset));
      expect(cycle.annualPalaces.map(row => row.age)).toEqual(Array.from({length: 10}, (_, offset) => cycle.startAge + offset));
      annualRows += cycle.annualPalaces.length;
    }
    if (index < 8) {
      expect(calculateZiweiHoroscope(profile, calculationOptions)).toEqual(horoscope);
      expect(calculateZiweiHoroscope(profile, {asOfDate, targetYear: targetYear === 2026 ? 2027 : 2026}).purchaseFacts).toEqual(horoscope.purchaseFacts);
    }
    for (const locale of ["vi", "en"] as const) {
      const source = buildFreeReadingFacts({chart, focusPalaceId: chart.soulPalaceId, locale,
        temporalSource: {horoscope, chartId: `synthetic-chart-${index}`, chartVersionId: `synthetic-version-${index}`,
          asOfDate, chartVersionInputHash: chart.provenance.inputHash}});
      const fallback = compileFreeReadingFallback(source);
      expect(validateFreeReadingReferences(fallback, source).ok, `references:${index}:${locale}`).toBe(true);
      const quality = checkFreeReadingQuality({content: fallback, source});
      expect(quality.findings.filter(finding => finding.hard), `hard-quality:${index}:${locale}`).toEqual([]);
      expect(quality.ok).toBe(true);
      const prompt = buildFreeReadingPrompt(source);
      expect(prompt).toMatchObject({providerCalls: 0, accepted: false});
      expect(fallback.teasers).toHaveLength(13);
      if (source.provisional) {
        expect(source.timing).toBeUndefined(); expect(fallback.yearHook).toBeNull();
        if (locale === "vi") provisionalCharts++;
      } else {
        expect(source.timing?.targetYear).toBe(targetYear);
        expect(source.timing?.cycles).toHaveLength(12);
      }
      const serialized = JSON.stringify({source, prompt, fallback});
      for (const privateValue of [profile.normalizedCalendar.date, chart.provenance.inputHash, chart.provenance.rawSnapshotHash,
        `synthetic-chart-${index}`, `synthetic-version-${index}`]) expect(serialized).not.toContain(privateValue);
      preparedLocales++;
    }
  });

afterAll(() => {
  expect(bureaus.size).toBe(5); expect(directions.size).toBe(2);
  expect(annualRows).toBe(24_000); expect(preparedLocales).toBe(400);
  expect(preCycleCharts).toBeGreaterThan(0); expect(currentCycles).toBeGreaterThan(0); expect(provisionalCharts).toBe(12);
  console.info(JSON.stringify({syntheticCharts: 200, cycles: 2400, annualRows, preparedLocales,
    bureaus: [...bureaus].sort(), directions: [...directions].sort(), preCycleCharts, provisionalCharts,
    durationMs: Math.round(performance.now() - started), providerCalls: 0, financialWrites: 0,
    customerSends: 0, nativeAccepted: false, manualAccepted: false, independentComparison: false}));
});
