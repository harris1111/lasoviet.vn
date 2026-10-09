import assert from "node:assert/strict";
import {readFileSync, writeFileSync, mkdirSync} from "node:fs";
import {dirname} from "node:path";
import {fileURLToPath} from "node:url";
import {calculateZiweiHoroscope} from "../packages/engine-adapters/dist/index.js";
import {NormalizedBirthProfileV1Schema} from "../packages/contracts/dist/index.js";

const reference = JSON.parse(readFileSync(new URL("../plan/evidence/lsv88/decadal-boundary-reference-30.json", import.meta.url), "utf8"));
assert(reference.scopedComparisonPassed);
const cases = reference.cases.filter(item => item.asOfDate === "2026-09-22").slice(0, 7);
assert.equal(cases.length, 7);
const samples = cases.map(item => {
  const calendar = {kind: "solar", date: item.birthDate};
  const time = {precision: "exact_minute", localTime: item.birthTime};
  const profile = NormalizedBirthProfileV1Schema.parse({version: 1,
    originalInput: {version: 1, calendar, time, timezone: {offsetMinutes: 420}, gender: item.gender, consentVersion: "synthetic"},
    normalizedCalendar: calendar, normalizedTime: time, timezoneProvenance: {source: "offset", offsetMinutes: 420},
    normalizationWarnings: [], limitations: []});
  return {id: item.id, asOfDate: item.asOfDate,
    purchaseFacts: calculateZiweiHoroscope(profile, {asOfDate: item.asOfDate}).purchaseFacts};
});
const output = fileURLToPath(new URL("../plan/evidence/lsv89/purchase-context-seven.json", import.meta.url));
mkdirSync(dirname(output), {recursive: true});
writeFileSync(output, JSON.stringify({version: 1, synthetic: true, providerCalls: 0,
  evaluationDate: "2026-09-22", timezoneOffsetMinutes: 420, currentMonthExcluded: true,
  futureLeapMonthCountsSeparately: true, ownerManualAccepted: false, samples}, null, 2) + "\n");
process.stdout.write("Exported seven synthetic purchase-context samples; owner manual acceptance remains open.\n");
