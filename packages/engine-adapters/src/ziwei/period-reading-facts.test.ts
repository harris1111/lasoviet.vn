import { describe, expect, it } from "vitest";
import { NormalizedBirthProfileV1Schema } from "@lasoviet/contracts";
import { calculatePeriodReadingFacts } from "./period-reading-facts.js";
import { calculateIztroReportSnapshot } from "./iztro-report-snapshot.js";
const profile = NormalizedBirthProfileV1Schema.parse({ version: 1,
  originalInput: { version: 1, calendar: { kind: "solar", date: "1990-05-12" }, time: { precision: "exact_minute", localTime: "08:30" }, timezone: { offsetMinutes: 420 }, consentVersion: "synthetic-test", gender: "male" },
  normalizedCalendar: { kind: "solar", date: "1990-05-12" }, normalizedTime: { precision: "exact_minute", localTime: "08:30" }, timezoneProvenance: { source: "offset", offsetMinutes: 420 }, normalizationWarnings: [], limitations: [] });
const base = { birthProfile: profile, chartId: "synthetic-chart", chartVersionId: "synthetic-version", asOfDate: "2026-09-30" };
describe("computed paid lunar periods", () => {
  it("keeps twelve genuine months and exact evidence for 2026", () => {
    const facts = calculatePeriodReadingFacts({ ...base, kind: "annual", targetYear: 2026 });
    expect(facts.periods).toHaveLength(12);
    expect(facts.periods.map(period => period.month)).toEqual(Array.from({ length: 12 }, (_, i) => i + 1));
    expect(facts.periods.every(period => period.evidenceKeys.includes(`period.${period.id}.palace.${period.palaceId}`))).toBe(true);
  });
  it("preserves leap-month halves rather than renumbering fourteen entries", () => {
    const facts = calculatePeriodReadingFacts({ ...base, kind: "annual", targetYear: 2025 });
    expect(facts.periods).toHaveLength(14);
    expect(facts.periods.filter(period => period.isLeapMonth).map(period => [period.month, period.part])).toEqual([[6, "first"], [6, "second"]]);
    expect(facts.periods.at(-1)?.month).toBe(12);
  });
  it("uses lunar month/year before Lunar New Year and retains both leap halves", () => {
    const january = calculatePeriodReadingFacts({ ...base, kind: "monthly", asOfDate: "2026-01-01" });
    expect(january.targetYear).toBe(2025);
    expect(january.periods[0]?.month).toBe(11);
    const leap = calculatePeriodReadingFacts({ ...base, kind: "monthly", asOfDate: "2025-08-01" });
    expect(leap.periods).toHaveLength(2);
    expect(leap.periodKey).toBe("2025-06-leap");
  });
  it("freezes period facts inside the report snapshot hash while preserving natal output", async () => {
    const input = { birthProfile: profile, chartVersionId: base.chartVersionId, asOfDate: base.asOfDate, targetYear: 2026 };
    const plain = await calculateIztroReportSnapshot(input);
    const enriched = await calculateIztroReportSnapshot({ ...input, periodReading: { chartId: base.chartId, kind: "annual" } });
    const repeated = await calculateIztroReportSnapshot({ ...input, periodReading: { chartId: base.chartId, kind: "annual" } });
    expect(plain.ok && enriched.ok && repeated.ok).toBe(true);
    if (!plain.ok || !enriched.ok || !repeated.ok) return;
    expect(plain.value.periodReading).toBeUndefined();
    expect(enriched.value.periodReading?.periods).toHaveLength(12);
    expect(enriched.value.provenance.snapshotHash).not.toBe(plain.value.provenance.snapshotHash);
    expect(enriched.value).toEqual(repeated.value);
  });
});
