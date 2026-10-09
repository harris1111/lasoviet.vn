import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { FreeReadingFactsV2Schema, type NormalizedBirthProfileV1 } from "@lasoviet/contracts";
import { IztroAdapter, calculateZiweiHoroscope } from "../../../engine-adapters/src/index.js";
import { buildFreeReadingFacts } from "./free-reading-facts.js";
import { compileFreeReadingFallback } from "./free-reading-fallback.js";
import { buildFreeReadingPrompt } from "./free-reading-prompt.js";
import { checkFreeReadingQuality } from "./free-reading-quality.js";

const profile: NormalizedBirthProfileV1 = { version: 1,
  originalInput: { version: 1, calendar: { kind: "solar", date: "1992-06-15" }, time: { precision: "exact_minute", localTime: "08:30" }, timezone: { offsetMinutes: 420 }, gender: "male", consentVersion: "synthetic" },
  normalizedCalendar: { kind: "solar", date: "1992-06-15" }, normalizedTime: { precision: "exact_minute", localTime: "08:30" },
  timezoneProvenance: { source: "offset", offsetMinutes: 420 }, normalizationWarnings: [], limitations: [] };
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-08T00:00:00Z")); });
afterEach(() => vi.useRealTimers());

async function fixture(locale: "vi" | "en" = "vi", date = "2026-10-08", targetYear?: number) {
  const result = await new IztroAdapter().calculateWithPrivateSnapshot({ birthProfile: profile });
  if (!result.result.ok) throw new Error("SYNTHETIC_ENGINE_FAILED");
  const chart = result.result.output;
  const horoscope = calculateZiweiHoroscope(profile, { chartId: "private-chart", chartVersionId: "private-version", asOfDate: date, targetYear });
  const temporalSource = { horoscope, chartId: "private-chart", chartVersionId: "private-version", asOfDate: date, chartVersionInputHash: chart.provenance.inputHash };
  const input = { chart, focusPalaceId: chart.soulPalaceId, locale, temporalSource };
  return { input, source: buildFreeReadingFacts(input) };
}

it.each(["vi", "en"] as const)("projects genuine complete temporal facts and strips private source in %s", async locale => {
  const { input, source } = await fixture(locale, "2026-10-08", 2027);
  expect(source.timing).toMatchObject({ targetYear: 2027, lunarAge: 36 });
  expect(source.timing?.cycles).toHaveLength(12);
  expect(source.facts.filter(f => f.key.startsWith("timing:cycle:"))).toHaveLength(12);
  expect(source.allowedWithheld).toEqual(["annual_palace_meaning"]);
  const serialized = JSON.stringify(source);
  for (const privateValue of ["private-chart", "private-version", "1992-06-15", "08:30", input.chart.provenance.inputHash, input.chart.provenance.rawSnapshotHash]) expect(serialized).not.toContain(privateValue);
  expect(serialized).not.toContain("structuralScore");
  expect(serialized).not.toContain("hanMonthCount");
  const shuffled = { ...input, temporalSource: { ...input.temporalSource,
    horoscope: { ...input.temporalSource.horoscope, decadalCycles: [...input.temporalSource.horoscope.decadalCycles!].reverse() } } };
  expect(buildFreeReadingFacts(shuffled)).toEqual(source);
  const fallback = compileFreeReadingFallback(source);
  expect(fallback.yearHook).toBeNull();
  expect(checkFreeReadingQuality({ content: fallback, source }).ok).toBe(true);
  expect(buildFreeReadingPrompt(source)).toMatchObject({ providerCalls: 0, accepted: false });
  expect(buildFreeReadingPrompt(source).system).toContain("selected year need not be this year");
});

it.each([["2027-01-15", 2026], ["2027-02-05", 2026], ["2027-02-06", 2027]] as const)(
  "retains the engine lunar-year boundary at %s", async (date, year) => {
    expect((await fixture("vi", date)).source.timing?.targetYear).toBe(year);
  });

it.each(["chartId", "chartVersionId", "asOfDate", "chartVersionInputHash"] as const)("rejects a mismatched bound %s", async key => {
  const { input } = await fixture();
  const value = key === "asOfDate" ? "2026-10-09" : key === "chartVersionInputHash" ? "f".repeat(64) : "other";
  expect(() => buildFreeReadingFacts({ ...input, temporalSource: { ...input.temporalSource, [key]: value } })).toThrow("FREE_READING_TIMING_SOURCE_MISMATCH");
});

it("rejects a daily date disagreement and broken/incomplete temporal sequence", async () => {
  const { input } = await fixture();
  const original = input.temporalSource.horoscope;
  expect(() => buildFreeReadingFacts({ ...input, temporalSource: { ...input.temporalSource,
    horoscope: { ...original, daily: { ...original.daily, solarDate: "2026-10-09" } } } })).toThrow("FREE_READING_TIMING_SOURCE_MISMATCH");
  for (const cycles of [original.decadalCycles!.slice(1), original.decadalCycles!.map((c, i) => i === 1 ? { ...c, ordinal: 0 } : c)]) {
    expect(() => buildFreeReadingFacts({ ...input, temporalSource: { ...input.temporalSource, horoscope: { ...original, decadalCycles: cycles } } })).toThrow();
  }
});

it.each(["unknown", "range"] as const)("withholds timing for %s birth time despite a supplied horoscope", async timePrecision => {
  const { input } = await fixture();
  const source = buildFreeReadingFacts({ ...input, chart: { ...input.chart, provisional: true, timePrecision } });
  expect(source.timing).toBeUndefined();
  expect(source.allowedWithheld).toEqual([]);
  expect(source.facts.some(f => f.key.startsWith("timing:"))).toBe(false);
});

it.each(["vi", "en"] as const)("requires exact computed year/age and local fact keys in %s", async locale => {
  const { source } = await fixture(locale, "2026-10-08", 2027);
  const good = compileFreeReadingFallback(source);
  const keys = ["timing:year", "timing:age", "timing:annual-palace"];
  const facts = keys.map(key => source.facts.find(f => f.key === key)!);
  good.yearHook = { shown: locale === "vi" ? ["Năm âm lịch được chọn là 2027.", "Tuổi âm trong năm được chọn là 36 tuổi."] : ["Selected lunar year is 2027.", "Lunar age is 36 years old."],
    clip: locale === "vi" ? "Ý nghĩa cung lưu niên còn ở phần riêng." : "Annual-palace meaning remains in the dedicated reading.",
    keys, withheld: "annual_palace_meaning", basis: { keys, chain: facts.map(f => ({ k: f.key, say: `${f.label}: ${f.value}` })) } };
  const initial = checkFreeReadingQuality({ content: good, source });
  expect(initial.findings.filter(f => f.hard)).toEqual([]);
  for (const literal of locale === "vi" ? ["Năm 2028.", "Tuổi 37.", "Tháng 3.", "Ngày 15/6.", "Tuổi 36.5.", "Tuổi 36–99.", "Tuổi 36 đến 99.", "Tuổi âm là37."] : ["Year 2028.", "Age 37.", "Month 3.", "15/6.", "Age 36.5.", "Age 36–99.", "Age 36 to 99.", "Lunar age is37."]) {
    const bad = structuredClone(good); bad.yearHook!.shown[0] = literal;
    expect(checkFreeReadingQuality({ content: bad, source }).findings.some(f => f.code === "uncomputed_date" && f.hard)).toBe(true);
  }
  const wrongScope = structuredClone(good); wrongScope.overview.portrait.text += " 2027.";
  expect(checkFreeReadingQuality({ content: wrongScope, source }).findings.some(f => f.block === "overview.portrait" && f.code === "uncomputed_date" && f.hard)).toBe(true);
  const fakeScore = structuredClone(good); fakeScore.yearHook!.clip = locale === "vi" ? "Điểm cấu trúc là 36/100." : "Structural score is 36/100.";
  expect(checkFreeReadingQuality({ content: fakeScore, source }).findings.some(f => f.code === "uncomputed_number" && f.hard)).toBe(true);
  const malformed = structuredClone(source); malformed.facts.find(f => f.key === "timing:year")!.value = "2028";
  expect(FreeReadingFactsV2Schema.safeParse(malformed).success).toBe(false);
  const wrongAge = structuredClone(source); wrongAge.timing!.lunarAge = 37;
  wrongAge.facts.find(f => f.key === "timing:age")!.value = "37";
  expect(FreeReadingFactsV2Schema.safeParse(wrongAge).success).toBe(false);
  const cycle = source.timing!.cycles.find(c => c.startAge <= 36 && c.endAge >= 36)!;
  const cycleKey = `timing:cycle:${cycle.ordinal}`, cycleFact = source.facts.find(f => f.key === cycleKey)!;
  const scoped = structuredClone(good);
  scoped.yearHook!.keys = [cycleKey];
  scoped.yearHook!.basis = { keys: [cycleKey], chain: [{ k: cycleKey, say: `${cycleFact.label}: ${cycleFact.value}` }, { k: cycleKey, say: `${cycleFact.label}: ${cycleFact.value}` }] };
  scoped.yearHook!.shown = locale === "vi" ? [`Tuổi ${cycle.startAge}–${cycle.endAge}.`, `Năm ${cycle.startYear}–${cycle.endYear}.`] : [`Ages ${cycle.startAge} to ${cycle.endAge}.`, `Years ${cycle.startYear} to ${cycle.endYear}.`];
  expect(checkFreeReadingQuality({ content: scoped, source }).findings.filter(f => f.hard)).toEqual([]);
  const wrongCycle = structuredClone(scoped); wrongCycle.yearHook!.shown[0] = locale === "vi" ? `Tuổi ${cycle.startAge}–${cycle.endAge + 1}.` : `Ages ${cycle.startAge} to ${cycle.endAge + 1}.`;
  expect(checkFreeReadingQuality({ content: wrongCycle, source }).findings.some(f => f.code === "uncomputed_date" && f.hard)).toBe(true);
});
