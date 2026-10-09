import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { NormalizedBirthProfileV1, NormalizedZiweiChartV1, ReportSourceSnapshotV1 } from "@lasoviet/contracts";
import { IztroAdapter } from "../../../engine-adapters/src/index.js";
import { calculateIztroReportSnapshot } from "../../../engine-adapters/src/ziwei/iztro-report-snapshot.js";
import { buildAnnualRomanceSource, ANNUAL_ROMANCE_SCOPE } from "./annual-romance-source.js";
const time = {precision: "exact_minute" as const, localTime: "08:30"};
const profile: NormalizedBirthProfileV1 = {version: 1, originalInput: {version: 1, calendar: {kind: "solar", date: "1992-06-15"}, time,
  timezone: {offsetMinutes: 420}, gender: "male", consentVersion: "synthetic"}, normalizedCalendar: {kind: "solar", date: "1992-06-15"},
  normalizedTime: time, timezoneProvenance: {source: "offset", offsetMinutes: 420}, normalizationWarnings: [], limitations: []};
describe("private annual-romance source from actual frozen Iztro snapshots", () => {
  let chart: NormalizedZiweiChartV1;
  const chartId = "PRIVATE_CHART", chartVersionId = "PRIVATE_VERSION", asOfDate = "2026-10-09";
  const sources = new Map<number, ReportSourceSnapshotV1>();
  beforeAll(async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-09T04:00:00Z"));
    const natal = await new IztroAdapter().calculate({birthProfile: profile}); if (!natal.ok) throw new Error("Synthetic chart failed"); chart = natal.output;
    for (const year of [2026, 2027]) {
      const result = await calculateIztroReportSnapshot({chartVersionId, birthProfile: profile, asOfDate, targetYear: year,
        timingRuleVersion: "ziwei.timing.lunar-year.v2", periodReading: {chartId, kind: "annual"}});
      if (!result.ok) throw new Error("Synthetic annual source failed");
      const snapshot = result.value;
      sources.set(year, {version: 1, reportId: randomUUID(), reportVersionId: randomUUID(), chartVersionId, asOfDate, targetYear: year,
        timingRuleVersion: snapshot.timingRuleVersion, sensitivityRuleVersion: snapshot.sensitivityRuleVersion,
        snapshotHash: snapshot.provenance.snapshotHash, snapshot});
    }
  });
  afterAll(() => vi.useRealTimers());
  const input = (year = 2026) => ({chart, chartId, chartVersionId, targetYear: year, sourceSnapshot: sources.get(year)!});
  it("keeps lifetime and annual matrices separate and projects only the approved relationship scope", () => {
    const source = buildAnnualRomanceSource(input());
    expect(source).toMatchObject({status: "draft_source", manualAccepted: false, targetYear: 2026, calendar: "lunar"});
    const ids = [...ANNUAL_ROMANCE_SCOPE.primary, ...ANNUAL_ROMANCE_SCOPE.supporting];
    expect(source.natal.map(p => p.palaceId)).toEqual(ids); expect(source.yearly.map(p => p.palaceId)).toEqual(ids);
    expect(source.annualContext).toMatchObject({annualRolePalaceId: "ziwei.palace.life", natalAnnualPalaceId: "ziwei.palace.career"});
    expect(source.yearly).toEqual(ids.map(id => sources.get(2026)!.snapshot.timing.annual.palaces.find(p => p.palaceId === id)));
    expect(source.natal.map(p => p.earthlyBranchId)).toEqual(ids.map(id => chart.palaces.find(p => p.id === id)!.earthlyBranchId));
    expect(source.evidence.some(e => e.key.startsWith("annual.palace.ziwei.palace.spouse."))).toBe(true);
    expect(source.evidence.some(e => e.key.startsWith("annual.palace.ziwei.palace.health."))).toBe(false);
    expect(source.evidence.some(e => e.dimension === "decadal" || e.dimension === "sensitivity")).toBe(false);
    for (const secret of ["1992-06-15", "08:30", "consentVersion", "originalInput", "gender"]) expect(JSON.stringify(source)).not.toContain(secret);
  });
  it("actual next-year matrices and evidence differ rather than relabeling a lifetime report", () => {
    const current = buildAnnualRomanceSource(input()), next = buildAnnualRomanceSource(input(2027));
    expect(current.natal).toEqual(next.natal); expect(current.yearly).not.toEqual(next.yearly);
    expect(current.lineage.snapshotHash).not.toBe(next.lineage.snapshotHash);
    expect(next.evidence.some(e => e.key === "annual.target-year.2027")).toBe(true);
    expect(next.evidence.some(e => e.key === "annual.target-year.2026")).toBe(false);
  });
  it("rejects year, chart and period substitution before projection", () => {
    expect(() => buildAnnualRomanceSource({...input(), targetYear: 2027})).toThrow("LINEAGE_MISMATCH");
    expect(() => buildAnnualRomanceSource({...input(), chartVersionId: "OTHER"})).toThrow("LINEAGE_MISMATCH");
    expect(() => buildAnnualRomanceSource({...input(), chartId: "OTHER"})).toThrow("LINEAGE_MISMATCH");
    const missing = structuredClone(input()); delete missing.sourceSnapshot.snapshot.periodReading;
    expect(() => buildAnnualRomanceSource(missing)).toThrow("LINEAGE_MISMATCH");
    const wrongPhysical = structuredClone(input()); wrongPhysical.sourceSnapshot.snapshot.periodReading!.annualPalaceId = "ziwei.palace.spouse";
    expect(() => buildAnnualRomanceSource(wrongPhysical)).toThrow("LINEAGE_MISMATCH");
    const monthly = structuredClone(input()); monthly.sourceSnapshot.snapshot.periodReading!.kind = "monthly";
    expect(() => buildAnnualRomanceSource(monthly)).toThrow("LINEAGE_MISMATCH");
  });
  it("rejects forged annual data under the original frozen hash", () => {
    const forged = structuredClone(input()); forged.sourceSnapshot.snapshot.timing.annual.palaces[2]!.stars.push({id: "ziwei.star.ziwei"});
    expect(() => buildAnnualRomanceSource(forged)).toThrow("HASH_MISMATCH");
    const missingMonth = structuredClone(input()); missingMonth.sourceSnapshot.snapshot.periodReading!.periods = missingMonth.sourceSnapshot.snapshot.periodReading!.periods.filter(p => p.month !== 12);
    expect(() => buildAnnualRomanceSource(missingMonth)).toThrow("LINEAGE_MISMATCH");
  });
  it.each(["unknown", "range"] as const)("refuses a definite annual source with %s birth time", timePrecision => {
    expect(() => buildAnnualRomanceSource({...input(), chart: {...chart, timePrecision, provisional: true}})).toThrow("SOURCE_PROVISIONAL");
  });
  it("rejects a natal/sensitivity mismatch and remains stable after JSONB-like key reordering", () => {
    const changed = structuredClone(input()); changed.chart.bodyPalaceId = changed.chart.bodyPalaceId === "ziwei.palace.life" ? "ziwei.palace.career" : "ziwei.palace.life";
    expect(() => buildAnnualRomanceSource(changed)).toThrow("Body palace");
    const source = sources.get(2026)!, reordered = {...source, snapshot: Object.fromEntries(Object.entries(source.snapshot).reverse())} as ReportSourceSnapshotV1;
    expect(buildAnnualRomanceSource({...input(), sourceSnapshot: reordered})).toEqual(buildAnnualRomanceSource(input()));
  });
});
