import { Solar } from "lunar-typescript";
import { expect, it } from "vitest";
import { BaziFactsV1Schema } from "@lasoviet/contracts";
import { calculateBaziFacts } from "./lunar-bazi-facts.js";
const base = { localSolarDate:"1992-06-15", localTime:"08:30", offsetMinutes:420 };
const gan = "甲乙丙丁戊己庚辛壬癸", ids = ["jia","yi","bing","ding","wu","ji","geng","xin","ren","gui"];
const zhi = "子丑寅卯辰巳午未申酉戌亥", branches = ["rat","ox","tiger","rabbit","dragon","snake","horse","goat","monkey","rooster","dog","pig"];
const pair = (name: string) => ({ stemId: `bazi.stem.${ids[gan.indexOf(name[0]!)]}`, branchId: `bazi.branch.${branches[zhi.indexOf(name[1]!)]}` });
it("projects installed vendor year/month and local civil day/hour exactly", () => {
  const result = calculateBaziFacts(base);
  const local = Solar.fromYmdHms(1992,6,15,8,30,0).getLunar().getEightChar(); local.setSect(2);
  const terms = Solar.fromYmdHms(1992,6,15,9,30,0).getLunar().getEightChar(); terms.setSect(2);
  expect(result.pillars.year[0]).toMatchObject(pair(terms.getYear()));
  expect(result.pillars.month[0]).toMatchObject(pair(terms.getMonth()));
  expect(result.pillars.day[0]).toMatchObject(pair(local.getDay()));
  expect(result.pillars.hour).toMatchObject(pair(local.getTime()));
  expect(result.pillars.day[0]!.hiddenStemIds).toEqual(local.getDayHideGan().map(g => `bazi.stem.${ids[gan.indexOf(g)]}`));
  expect(BaziFactsV1Schema.safeParse(result).success).toBe(true);
  expect(JSON.stringify(result)).not.toContain(base.localSolarDate);
  expect(JSON.stringify(result)).not.toContain(base.localTime);
  expect(calculateBaziFacts(base)).toEqual(result);
});
it("never manufactures an hour pillar from a date-only counterpart", () => {
  const result = calculateBaziFacts({ ...base, localTime:null });
  expect(result.pillars.hour).toBeNull();
  expect(result.evidence.some(e => e.pillar === "hour")).toBe(false);
  expect(result.limitations).toContain("BAZI_HOUR_UNKNOWN");
});
it("uses local-midnight sect2 at lateZi while preserving exact vendor hour", () => {
  const before = calculateBaziFacts({ ...base, localTime:"22:59" });
  const late = calculateBaziFacts({ ...base, localTime:"23:30" });
  const next = calculateBaziFacts({ ...base, localSolarDate:"1992-06-16", localTime:"00:00" });
  expect(late.pillars.day).toEqual(before.pillars.day);
  expect(next.pillars.day).not.toEqual(late.pillars.day);
});
it("uses LiChun rather than Tet and exposes uncertainty when the time is unknown", () => {
  const result = calculateBaziFacts({ ...base, localSolarDate:"2027-02-04", localTime:null });
  expect(result.pillars.year).toHaveLength(2);
  expect(result.pillars.month).toHaveLength(2);
  expect(result.limitations).toContain("BAZI_SOLAR_TERM_TIME_UNCERTAIN");
  expect(result.pillars.day).toHaveLength(1);
});
it("normalizes solar-term comparisons across timezones at the exact vendor boundary", () => {
  const term = Solar.fromYmd(2027,2,4).getLunar().getJieQiTable()["立春"]!;
  const utc = Date.UTC(term.getYear(),term.getMonth()-1,term.getDay(),term.getHour()-8,term.getMinute(),term.getSecond());
  const at = (delta: number, offsetMinutes: number) => {
    const d = new Date(utc + delta + offsetMinutes*60000);
    return calculateBaziFacts({ localSolarDate:d.toISOString().slice(0,10), localTime:d.toISOString().slice(11,16), offsetMinutes });
  };
  const before = at(-120000,420), after = at(120000,420);
  expect(before.pillars.year).not.toEqual(after.pillars.year);
  expect(after.pillars.year).toEqual(at(120000,480).pillars.year);
  expect(after.pillars.month).toEqual(at(120000,-300).pillars.month);
});
it.each([{...base,localSolarDate:"2026-02-30"}, {...base,localTime:"24:00"}, {...base,offsetMinutes:1000}, {...base,localSolarDate:"1899-12-31"}])("rejects invalid normalized input %j", input => {
  expect(() => calculateBaziFacts(input)).toThrow("BAZI_INPUT_INVALID");
});
