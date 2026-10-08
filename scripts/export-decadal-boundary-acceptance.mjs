import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { calculateZiweiHoroscope } from "../packages/engine-adapters/dist/index.js";
const requireEngine = createRequire(new URL("../packages/engine-adapters/package.json", import.meta.url));
const {Solar} = requireEngine("lunar-typescript");
const dates = ["2026-02-16", "2026-02-17", "2027-02-05", "2027-02-06", "2028-01-25", "2028-01-26", "2026-09-22", "2027-10-08"];
const sourceFiles = ["packages/engine-adapters/src/ziwei/iztro-horoscope.ts", "packages/engine-adapters/src/ziwei/monthly-attention.ts",
  "packages/engine-adapters/src/ziwei/iztro-mapping.ts", "scripts/export-decadal-boundary-acceptance.mjs"];
const hashes = Object.fromEntries(await Promise.all(sourceFiles.map(async path => [path, createHash("sha256").update(await readFile(new URL(`../${path}`, import.meta.url))).digest("hex")])));
let invariants = 0;
const cases = [];
for (let index = 0; index < 30; index++) {
  const birthDate = `${1970 + index}-${String(1 + index % 12).padStart(2, "0")}-${String(1 + index % 27).padStart(2, "0")}`;
  const birthTime = `${String((index % 12) * 2).padStart(2, "0")}:30`, gender = index % 2 ? "female" : "male";
  const profile = {version: 1, originalInput: {gender, birthDate, birthTime}, normalizedCalendar: {kind: "solar", date: birthDate},
    normalizedTime: {precision: "exact_minute", localTime: birthTime}, timezoneProvenance: {source: "offset", offsetMinutes: 420}, normalizationWarnings: [], limitations: []};
  for (const asOfDate of dates) {
    const [y,m,d] = asOfDate.split("-").map(Number), targetYear = Solar.fromYmd(y,m,d).getLunar().getYear();
    const actual = calculateZiweiHoroscope(profile, {asOfDate, targetYear});
    assert.equal(actual.yearly.targetYear, targetYear); invariants++;
    assert.equal(actual.decadalCycles.length, 12); invariants++;
    assert.equal(new Set(actual.decadalCycles.map(c => c.palaceId)).size, 12); invariants++;
    assert.ok(actual.decadalDirection === "forward" || actual.decadalDirection === "reverse"); invariants++;
    assert.equal(actual.decadalCycles.filter(c => c.state === "current").length, actual.currentDecadalOrdinal === null ? 0 : 1); invariants++;
    for (const [ordinal, cycle] of actual.decadalCycles.entries()) {
      assert.equal(cycle.ordinal, ordinal); invariants++;
      assert.equal(cycle.endAge - cycle.startAge, 9); invariants++;
      assert.equal(cycle.endYear - cycle.startYear, 9); invariants++;
      assert.equal(cycle.annualPalaces.length, 10); invariants++;
      assert.equal(cycle.state, targetYear < cycle.startYear ? "future" : targetYear > cycle.endYear ? "past" : "current"); invariants++;
      if (ordinal) {assert.equal(cycle.startAge, actual.decadalCycles[ordinal-1].startAge+10); invariants++;
        assert.equal(cycle.startYear, actual.decadalCycles[ordinal-1].startYear+10); invariants++;}
      for (const [offset, annual] of cycle.annualPalaces.entries()) {
        assert.equal(annual.year, cycle.startYear + offset); invariants++;
        assert.equal(annual.age, cycle.startAge + offset); invariants++;
        assert.ok(actual.decadalCycles.some(c => c.palaceId === annual.palaceId)); invariants++;
      }
    }
    cases.push({id: `synthetic-${String(index+1).padStart(2,"0")}`, birthDate, birthTime, gender, asOfDate, targetYear,
      bureau: actual.chartMetadata.bureau, direction: actual.decadalDirection, currentOrdinal: actual.currentDecadalOrdinal,
      cycles: actual.decadalCycles.map(c => ({ordinal:c.ordinal,palaceId:c.palaceId,startAge:c.startAge,endAge:c.endAge,startYear:c.startYear,endYear:c.endYear,state:c.state,
        annualPalaces:c.annualPalaces.map(a=>({year:a.year,age:a.age,palaceId:a.palaceId}))}))});
  }
}
assert.ok(invariants >= 200);
process.stdout.write(JSON.stringify({engineVersion: "iztro2.6.0", calendarVersion:"lunar-typescript1.8.6", sourceSha256: hashes,
  chartCount:30, dates, evaluationCount: cases.length, invariantAssertionCount:invariants, timezoneOffsetMinutes:420, cases})+"\n");
