import { Solar } from "lunar-typescript";
import { expect, it } from "vitest";
import { BAZI_BRANCH_IDS, BAZI_STEM_IDS, BaziStructureV1Schema } from "@lasoviet/contracts";
import { calculateBaziFacts } from "./lunar-bazi-facts.js";
import { baziBranchElement, baziStemElement, baziTenGod, buildBaziStructure } from "./lunar-bazi-structure.js";
const base = {localSolarDate: "1992-06-15", localTime: "08:30", offsetMinutes: 420};
const rawStems = "甲乙丙丁戊己庚辛壬癸";
const expectedGod = (day: number, relative: number) => {
  const relation = (Math.floor(relative / 2) - Math.floor(day / 2) + 5) % 5;
  const same = day % 2 === relative % 2;
  return [same ? "peer" : "rob_wealth", same ? "eating_god" : "hurting_officer",
    same ? "indirect_wealth" : "direct_wealth", same ? "seven_killings" : "direct_officer",
    same ? "indirect_resource" : "direct_resource"][relation];
};
it.each(BAZI_STEM_IDS)("maps all ten relative stems for %s against element/polarity rules", day => {
  for (const relative of BAZI_STEM_IDS) expect(baziTenGod(day, relative)).toBe(expectedGod(BAZI_STEM_IDS.indexOf(day), BAZI_STEM_IDS.indexOf(relative)));
});
it("maps every visible stem and branch without an unverified default", () => {
  expect(BAZI_STEM_IDS.map(baziStemElement)).toEqual(["wood", "wood", "fire", "fire", "earth", "earth", "metal", "metal", "water", "water"]);
  expect(BAZI_BRANCH_IDS.map(baziBranchElement)).toEqual(["water", "earth", "wood", "wood", "earth", "fire", "fire", "earth", "metal", "metal", "earth", "water"]);
});
it("retains factual hidden stems, day master and private deterministic inventory", () => {
  const source = calculateBaziFacts(base); const result = buildBaziStructure(source);
  expect(BaziStructureV1Schema.safeParse(result).success).toBe(true);
  const reading = result.relativeReadings[0]!;
  expect(result.relativeReadings).toHaveLength(1);
  expect(reading.dayMasterStemId).toBe(source.pillars.day[0]!.stemId);
  expect(reading.pillars).toHaveLength(4);
  for (const pillar of reading.pillars) {
    const input = pillar.pillar === "hour" ? source.pillars.hour! : source.pillars[pillar.pillar][pillar.variant]!;
    expect(pillar.hiddenStems.map(hidden => hidden.stemId)).toEqual(input.hiddenStemIds);
    expect(pillar.sourceEvidenceKeys.every(key => source.evidence.some(evidence => evidence.key === key))).toBe(true);
    for (const hidden of pillar.hiddenStems) expect(hidden.tenGod).toBe(expectedGod(BAZI_STEM_IDS.indexOf(reading.dayMasterStemId), BAZI_STEM_IDS.indexOf(hidden.stemId)));
  }
  expect(reading.pillars.find(pillar => pillar.pillar === "day")).toMatchObject({stemRole: "day_master", stemTenGod: null});
  expect(result.visibleElementInventory).toMatchObject({method: "unweighted-visible-stem-and-branch-count", characterCount: 8, complete: true});
  expect(Object.values(result.visibleElementInventory!.counts).reduce((sum, count) => sum + count, 0)).toBe(8);
  expect(buildBaziStructure(source)).toEqual(result);
  expect(JSON.stringify(result)).not.toMatch(/1992-06-15|08:30|strength|percentage|score|compatibility/);
});
it("uses local civil day master when term comparison crosses midnight", () => {
  const source = calculateBaziFacts({...base, localTime: "23:30"});
  const result = buildBaziStructure(source).relativeReadings[0]!;
  const local = Solar.fromYmdHms(1992, 6, 15, 23, 30, 0).getLunar().getEightChar(); local.setSect(2);
  const shifted = Solar.fromYmdHms(1992, 6, 16, 0, 30, 0).getLunar().getEightChar(); shifted.setSect(2);
  const index = rawStems.indexOf(local.getDayGan());
  expect(result.dayMasterStemId).toBe(BAZI_STEM_IDS[index]);
  expect(result.dayMasterStemId).not.toBe(BAZI_STEM_IDS[rawStems.indexOf(shifted.getDayGan())]);
  const year = result.pillars.find(pillar => pillar.pillar === "year")!;
  expect(year.stemTenGod).toBe(expectedGod(index, rawStems.indexOf(local.getYearGan())));
});
it("keeps date-only counterpart inventory incomplete and supplies no hour", () => {
  const result = buildBaziStructure(calculateBaziFacts({...base, localTime: null}));
  expect(result.uncertainty.hourMissing).toBe(true);
  expect(result.relativeReadings[0]!.pillars.map(pillar => pillar.pillar)).toEqual(["year", "month", "day"]);
  expect(result.visibleElementInventory).toMatchObject({characterCount: 6, complete: false});
  expect(Object.values(result.visibleElementInventory!.counts).reduce((sum, count) => sum + count, 0)).toBe(6);
});
it("preserves term alternatives without guessing combined counts", () => {
  const result = buildBaziStructure(calculateBaziFacts({...base, localSolarDate: "2027-02-04", localTime: null}));
  expect(result.visibleElementInventory).toBeNull();
  expect(result.uncertainty).toMatchObject({hourMissing: true, pillarAlternatives: true});
  for (const kind of ["year", "month"]) expect(result.relativeReadings[0]!.pillars.filter(pillar => pillar.pillar === kind).map(pillar => pillar.variant)).toEqual([0, 1]);
});
it("rejects missing, duplicate and mismatched source evidence", () => {
  const original = calculateBaziFacts(base);
  const missing = structuredClone(original); missing.evidence.pop();
  const duplicate = structuredClone(original); duplicate.evidence[1]!.key = duplicate.evidence[0]!.key;
  const mismatch = structuredClone(original); mismatch.evidence[0]!.stemId = "bazi.stem.gui";
  for (const source of [missing, duplicate, mismatch]) expect(() => buildBaziStructure(source)).toThrow("BAZI_STRUCTURE_EVIDENCE_MISMATCH");
});

it("rejects forged, duplicated and reordered hidden stems despite matching pillar evidence", () => {
  const original = calculateBaziFacts(base);
  const wrong = structuredClone(original); wrong.pillars.year[0]!.hiddenStemIds = ["bazi.stem.jia"];
  const duplicate = structuredClone(original); duplicate.pillars.year[0]!.hiddenStemIds = ["bazi.stem.gui", "bazi.stem.gui"];
  const reordered = structuredClone(original); reordered.pillars.day[0]!.hiddenStemIds.reverse();
  for (const source of [wrong, duplicate, reordered]) expect(() => buildBaziStructure(source)).toThrow("BAZI_STRUCTURE_HIDDEN_STEMS_MISMATCH");
});
