import { createHash } from "node:crypto";
import { Solar } from "lunar-typescript";
import { describe, expect, it } from "vitest";
import { BAZI_STEM_IDS, BAZI_BRANCH_IDS, BaziDecadalSourceV1Schema, type BaziFactsInputV1 } from "@lasoviet/contracts";
import { buildBaziDecadalSource } from "./bazi-decadal-source.js";
import { calculateNormalizedBaziChart } from "./normalized-bazi-chart.js";
import { baziTenGod } from "./lunar-bazi-structure.js";
const frozen = new Date("2026-10-09T10:00:00Z"), stems = "甲乙丙丁戊己庚辛壬癸", branches = "子丑寅卯辰巳午未申酉戌亥";
const dates = ["1900-01-01","1920-02-10","1950-08-15","1980-06-15","1988-02-29","1992-06-15","1994-05-20","2000-01-01","2000-02-29","2024-02-04","2026-01-01","2027-02-06","2030-05-01","2099-12-31","2100-12-31"];
const cases = dates.flatMap(date => (["male", "female"] as const).map(gender => ({date, gender})));
const resolved = (date = "1992-06-15", localTime: string | null = "09:30", offsetMinutes = 480): BaziFactsInputV1 => ({localSolarDate: date, localTime, offsetMinutes});
const input = (value = resolved(), gender: "male" | "female" = "male") => ({resolvedInput: value, storedChart: calculateNormalizedBaziChart(value, frozen), gender});
describe("private Bazi decadal pinned vendor consistency, not traditional acceptance", () => {
  it.each(cases)("keeps all ten actual cycles and pre-cycle for $date/$gender", ({date, gender}) => {
    const request = input(resolved(date), gender), source = buildBaziDecadalSource(request);
    const [year, month, day] = date.split("-").map(Number) as [number, number, number];
    const eight = Solar.fromYmdHms(year,month,day,9,30,0).getLunar().getEightChar(); eight.setSect(2);
    const yun = eight.getYun(gender === "male" ? 1 : 0,2), rows = yun.getDaYun(11);
    expect(source).toMatchObject({status: "draft_source", manualAccepted: false, yunSect: 2, calendar: "vendor-civil-year-and-counting-age",
      direction: yun.isForward() ? "forward" : "reverse", firstStartSolarUtc8: `${yun.getStartSolar().toYmdHms().replace(" ","T")}+08:00`});
    expect(source.preCycle).toMatchObject({index: 0, startYear: rows[0]!.getStartYear(), endYear: rows[0]!.getEndYear(), startAge: 1, endAge: rows[0]!.getEndAge()});
    expect(source.cycles).toHaveLength(10);
    for (const [i, row] of rows.slice(1).entries()) {
      const raw = row.getGanZhi(), actual = source.cycles[i]!;
      expect(actual).toMatchObject({index: row.getIndex(), startYear: row.getStartYear(), endYear: row.getEndYear(),
        startAge: row.getStartAge(), endAge: row.getEndAge(), stemId: BAZI_STEM_IDS[stems.indexOf(raw[0]!)], branchId: BAZI_BRANCH_IDS[branches.indexOf(raw[1]!)]});
      expect(actual.stemTenGod).toBe(baziTenGod(request.storedChart.facts.pillars.day[0]!.stemId, actual.stemId));
      for (const hidden of actual.hiddenStems) expect(hidden.tenGod).toBe(baziTenGod(source.dayMasterStemId, hidden.stemId));
      expect(actual.evidenceKeys).toContain(`bazi.decadal.${row.getIndex()}.${actual.stemId}.${actual.branchId}`);
      expect(actual.endYear - actual.startYear).toBe(9); expect(actual.endAge - actual.startAge).toBe(9);
    }
    expect(BaziDecadalSourceV1Schema.parse(source)).toEqual(source);
    if (date.startsWith("2100")) expect(source.cycles[9]!.endYear).toBeGreaterThan(2100);
    for (const secret of [date, '"localTime"', '"localSolarDate"', '"originalInput"', '"startDelay"', '"score"', '"currentOrdinal"']) expect(JSON.stringify(source)).not.toContain(secret);
    expect(buildBaziDecadalSource(request)).toEqual(source);
  });
  it.each([["male","1999-09-21T05:30:00+08:00",1999,8,"bazi.stem.ding","bazi.branch.goat"],
    ["female","1995-08-31T01:30:00+08:00",1995,4,"bazi.stem.yi","bazi.branch.snake"]] as const)("matches pinned first-start reference for %s", (gender, start, year, age, stemId, branchId) => {
    const source = buildBaziDecadalSource(input(resolved(), gender));
    expect(source.firstStartSolarUtc8).toBe(start); expect(source.cycles[0]).toMatchObject({startYear: year, startAge: age, stemId, branchId});
  });
  it("preserves an actual empty pre-cycle without assigning it a fabricated pillar", () => {
    const source = buildBaziDecadalSource(input(resolved("2024-02-04","16:30"),"female"));
    expect(source.preCycle).toEqual({index: 0,state: "empty",startYear: 2024,endYear: 2023,startAge: 1,endAge: 0});
    expect(source.cycles[0]!.index).toBe(1); expect(source.cycles[0]!.startAge).toBe(1);
    expect(source.preCycle).not.toHaveProperty("stemId");
  });
  it("converts only the terms carrier to UTC8 and retains the actual local-civil day master", () => {
    const one = buildBaziDecadalSource(input(resolved("1992-06-15","23:30",0)));
    const two = buildBaziDecadalSource(input(resolved("1992-06-16","06:30",420)));
    expect(one.firstStartSolarUtc8).toBe(two.firstStartSolarUtc8); expect(one.yearPillar).toEqual(two.yearPillar); expect(one.monthPillar).toEqual(two.monthPillar);
    expect(one.dayMasterStemId).not.toBe(two.dayMasterStemId); expect(one.cycles[0]!.stemTenGod).not.toBe(two.cycles[0]!.stemTenGod);
    expect(one.cycles.map(c => [c.stemId,c.branchId,c.startYear])).toEqual(two.cycles.map(c => [c.stemId,c.branchId,c.startYear]));
  });
  it("retains vendor UTC8 birth-year/counting-age semantics at local civil New Year rollover", () => {
    const source = buildBaziDecadalSource(input(resolved("1992-12-31","23:30",0)));
    expect(source.preCycle.startYear).toBe(1993);
    expect(source.cycles[0]!.startAge).toBe(source.cycles[0]!.startYear - 1993 + 1);
  });
  it("uses year/month terms and explicit gender around actual Li Chun rather than lunar Tet", () => {
    const before = buildBaziDecadalSource(input(resolved("2024-02-04","15:00",420)));
    const after = buildBaziDecadalSource(input(resolved("2024-02-04","15:30",420)));
    expect(before.yearPillar.stemId).not.toBe(after.yearPillar.stemId); expect(before.monthPillar).not.toEqual(after.monthPillar);
    expect(before.direction).toBe("reverse"); expect(after.direction).toBe("forward");
    const changed = buildBaziDecadalSource(input(resolved("2024-02-04","15:30",420),"female"));
    expect(changed.direction).toBe("reverse"); expect(changed.sourceHash).not.toBe(after.sourceHash);
  });
  it("refuses unknown hour or missing gender without mutating normalized-v1 source", () => {
    const missing = input(resolved("2024-02-04",null));
    expect(() => buildBaziDecadalSource(missing)).toThrow("PRECISION_UNAVAILABLE"); expect(missing.storedChart.facts.pillars.hour).toBeNull();
    expect(() => buildBaziDecadalSource({...input(), gender: undefined})).toThrow("GENDER_UNAVAILABLE");
    const request = input(), original = structuredClone(request.storedChart); buildBaziDecadalSource(request); expect(request.storedChart).toEqual(original);
  });
  it("recalculates trusted input rather than accepting another profile or internally consistent forged source", () => {
    const request = input();
    expect(() => buildBaziDecadalSource({...request,resolvedInput: resolved("1994-05-20")})).toThrow("SOURCE_MISMATCH");
    const changed = structuredClone(request); changed.storedChart.provenance.rawSnapshotHash = "a".repeat(64);
    expect(() => buildBaziDecadalSource(changed)).toThrow("SOURCE_MISMATCH");
  });
  it("closed DTO rejects false acceptance, extra fields, missing tenth cycle, direction and year/age corruption", () => {
    const source = buildBaziDecadalSource(input());
    for (const changed of [{...source,manualAccepted:true},{...source,currentOrdinal:1},{...source,cycles:source.cycles.slice(0,9)},
      {...source,direction:"reverse"},{...source,preCycle:{...source.preCycle,endAge:0}}]) expect(BaziDecadalSourceV1Schema.safeParse(changed).success).toBe(false);
    const changed = structuredClone(source); changed.cycles[0]!.stemId = BAZI_STEM_IDS[0]; expect(BaziDecadalSourceV1Schema.safeParse(changed).success).toBe(false);
    const {sourceHash,...rest} = source;
    const canonical = (v: unknown): string => Array.isArray(v) ? `[${v.map(canonical).join(",")}]` : v !== null && typeof v === "object" ? `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${canonical((v as Record<string,unknown>)[k])}`).join(",")}}` : JSON.stringify(v);
    expect(createHash("sha256").update(canonical(rest)).digest("hex")).toBe(sourceHash);
  });
});
