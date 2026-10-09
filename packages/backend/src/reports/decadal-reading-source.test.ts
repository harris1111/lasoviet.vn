import { createRequire } from "node:module";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NormalizedBirthProfileV1Schema, ZiweiDecadalReadingSourceV1Schema,
  type NormalizedBirthProfileV1, type NormalizedZiweiChartV1 } from "@lasoviet/contracts";
import { IztroAdapter, iztroDefaultConfig } from "@lasoviet/engine-adapters";
import { palaceIds, starIds } from "../../../engine-adapters/src/ziwei/iztro-mapping.js";
import { computeNormalizedPalaceScores } from "./structural-palace-score.js";
import { buildDecadalReadingSource } from "./decadal-reading-source.js";

// Resolve the exact vendor from its owning workspace package, not a new dependency.
const {astro} = createRequire(new URL("../../../engine-adapters/package.json", import.meta.url))("iztro");
function profile(gender: "male" | "female", date = "1992-06-15"): NormalizedBirthProfileV1 {
  const time = {precision: "exact_minute", localTime: "08:30"}, calendar = {kind: "solar", date};
  return NormalizedBirthProfileV1Schema.parse({version: 1,
    originalInput: {version: 1, calendar, time, gender, timezone: {offsetMinutes: 420}, displayName: "PRIVATE_PERSON", consentVersion: "PRIVATE_CONSENT"},
    normalizedCalendar: calendar, normalizedTime: time, timezoneProvenance: {source: "offset", offsetMinutes: 420}, normalizationWarnings: [], limitations: []});
}
async function natal(birthProfile: NormalizedBirthProfileV1) {
  const calculated = await new IztroAdapter().calculate({birthProfile}, iztroDefaultConfig);
  if (!calculated.ok) throw new Error("Synthetic natal calculation failed");
  return calculated.output;
}
describe("private decadal source bound to actual Iztro natal output", () => {
  const charts = new Map<string, NormalizedZiweiChartV1>();
  beforeAll(async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-09T06:00:00Z"));
    for (const gender of ["male", "female"] as const) charts.set(gender, await natal(profile(gender)));
  });
  afterAll(() => vi.useRealTimers());
  const input = (gender: "male" | "female" = "male", selection: "current" | "next" = "current", asOfDate = "2026-10-09") => ({
    chartId: "PRIVATE_CHART", chartVersionId: "PRIVATE_VERSION", birthProfile: profile(gender), storedChart: charts.get(gender)!, asOfDate, selection,
  });
  it.each(["male", "female"] as const)("preserves original current/next %s vendor cycles and all ten actual annual rows", async gender => {
    const vendor = astro.withOptions({type: "solar", dateStr: "1992-06-15", timeIndex: 4, gender, language: "en-US",
      config: {algorithm: "default", yearDivide: "normal", horoscopeDivide: "normal", ageDivide: "normal", dayDivide: "current"}});
    for (const selection of ["current", "next"] as const) {
      const source = await buildDecadalReadingSource(input(gender, selection));
      const expected = vendor.decadalList()[source.cycle.ordinal];
      expect(source).toMatchObject({status: "draft_source", manualAccepted: false, lunarYear: 2026, calendar: "lunar", selection});
      expect(source.cycle).toMatchObject({palaceId: palaceIds[expected.palaceName], startAge: expected.ageRange[0], endAge: expected.ageRange[1],
        startYear: expected.yearRange[0], endYear: expected.yearRange[1]});
      expect(source.cycle.transformations.map(t => t.starId)).toEqual(expected.mutagen.map((star: string) => starIds[star]));
      expect(source.cycle.annualPalaces.map(row => [row.year, row.age, row.palaceId]))
        .toEqual(vendor.yearlyList(source.cycle.ordinal).map((row: {year: number; age: number; index: number}) => [row.year, row.age, palaceIds[vendor.palaces[row.index].name]]));
      const score = computeNormalizedPalaceScores(charts.get(gender)!).get(source.cycle.palaceId)!;
      expect(source.cycle.structuralScore).toEqual({value: score.score, band: score.band, parts: score.parts, formulaVersion: "fd107-fd111-v1"});
      expect(source.evidenceKeys.filter(key => /^annual\.year\.\d+\.palace\./.test(key))).toHaveLength(10);
      for (const secret of ["PRIVATE_PERSON", "PRIVATE_CONSENT", "1992-06-15", "08:30", "originalInput", "normalizedInput", '"gender"']) expect(JSON.stringify(source)).not.toContain(secret);
    }
  });
  it.each([["1995-10-09", 0], ["2055-10-09", 6]] as const)("keeps actual ordinal at ambiguous direction anchor %s", async (asOfDate, ordinal) => {
    const source = await buildDecadalReadingSource(input("male", "current", asOfDate));
    expect(source.currentOrdinal).toBe(ordinal); expect(source.cycle.ordinal).toBe(ordinal);
    expect(source.cycle.annualPalaces).toHaveLength(10);
    expect((await buildDecadalReadingSource(input("male", "next", asOfDate))).cycle.ordinal).toBe(ordinal + 1);
  });
  it("uses the actual lunar year at Tet and crosses real decadal boundaries", async () => {
    const before = await buildDecadalReadingSource(input("male", "current", "2027-02-05"));
    const after = await buildDecadalReadingSource(input("male", "current", "2027-02-06"));
    expect([before.lunarYear, after.lunarYear]).toEqual([2026, 2027]);
    expect(before.cycle).toEqual(after.cycle); expect(before.sourceHash).not.toBe(after.sourceHash);
    expect((await buildDecadalReadingSource(input("male", "current", "2025-01-28"))).currentOrdinal).toBe(2);
    expect((await buildDecadalReadingSource(input("male", "current", "2025-01-29"))).currentOrdinal).toBe(3);
  });
  it("rejects a young pre-cycle chart and a next cycle beyond the vendor's last cycle", async () => {
    const birthProfile = profile("female", "2026-01-01");
    await expect(buildDecadalReadingSource({...input(), birthProfile, storedChart: await natal(birthProfile), asOfDate: "2026-01-15"})).rejects.toThrow("NOT_STARTED");
    const oldest = profile("male", "1980-06-15");
    await expect(buildDecadalReadingSource({...input("male", "next", "2099-10-09"), birthProfile: oldest, storedChart: await natal(oldest)})).rejects.toThrow("CYCLE_UNAVAILABLE");
  });
  it.each(["unknown", "range"] as const)("rejects provisional %s input before definite decadal projection", async precision => {
    const birthProfile = structuredClone(profile("male"));
    const time = precision === "unknown" ? {precision} : {precision, startLocalTime: "07:00", endLocalTime: "09:00"};
    birthProfile.normalizedTime = time; birthProfile.originalInput.time = time;
    await expect(buildDecadalReadingSource({...input(), birthProfile})).rejects.toThrow("PROVISIONAL");
    await expect(buildDecadalReadingSource({...input(), storedChart: {...charts.get("male")!, provisional: true, timePrecision: precision}})).rejects.toThrow("PROVISIONAL");
  });
  it("recomputes vendor provenance and refuses other profile, raw hash, config and self-consistent natal tampering", async () => {
    await expect(buildDecadalReadingSource({...input(), birthProfile: profile("female")})).rejects.toThrow("NATAL_MISMATCH");
    for (const key of ["inputHash", "configHash", "rawSnapshotHash", "engineVersion", "adapterVersion", "ruleSetId"] as const) {
      const changed = structuredClone(input());
      changed.storedChart.provenance[key] = key.endsWith("Hash") ? "a".repeat(64) : "other.version";
      await expect(buildDecadalReadingSource(changed)).rejects.toThrow("NATAL_MISMATCH");
    }
    const changed = structuredClone(input()); changed.storedChart.palaces[0]!.stars[0]!.brightness = "ziwei.brightness.neutral";
    await expect(buildDecadalReadingSource(changed)).rejects.toThrow("NATAL_MISMATCH");
  });
  it("replays deterministically and tolerates JSONB key order and a prior calculation timestamp", async () => {
    const initial = await buildDecadalReadingSource(input());
    expect(await buildDecadalReadingSource(input())).toEqual(initial);
    const reordered = {...input(), storedChart: Object.fromEntries(Object.entries(charts.get("male")!).reverse()) as NormalizedZiweiChartV1};
    expect(await buildDecadalReadingSource(reordered)).toEqual(initial);
    const older = structuredClone(input()); older.storedChart.provenance.calculatedAt = "2026-09-01T00:00:00+00:00";
    expect((await buildDecadalReadingSource(older)).cycle).toEqual(initial.cycle);
  });
  it("refuses invalid dates and identities, and its closed contract rejects paid acceptance and mismatched cycle lineage", async () => {
    for (const asOfDate of ["2026-02-30", "not-a-date", "2026-2-01"]) await expect(buildDecadalReadingSource({...input(), asOfDate})).rejects.toThrow("INPUT_INVALID");
    await expect(buildDecadalReadingSource({...input(), chartId: " "})).rejects.toThrow("INPUT_INVALID");
    const source = await buildDecadalReadingSource(input());
    for (const candidate of [{...source, manualAccepted: true}, {...source, paid: true}, {...source, selection: "next"},
      {...source, lineage: {...source.lineage, inputHash: "a".repeat(64)}}, {...source, cycle: {...source.cycle, structuralScore: undefined}},
      {...source, cycle: {...source.cycle, annualPalaces: source.cycle.annualPalaces.slice(1)}}]) expect(ZiweiDecadalReadingSourceV1Schema.safeParse(candidate).success).toBe(false);
  });
});
