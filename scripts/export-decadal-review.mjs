import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { performance } from "node:perf_hooks";
import { calculateZiweiHoroscope } from "../packages/engine-adapters/dist/index.js";
import { palaceIds, starIds } from "../packages/engine-adapters/dist/ziwei/iztro-mapping.js";
const requireEngine = createRequire(new URL("../packages/engine-adapters/package.json", import.meta.url));
const { astro } = requireEngine("iztro");
const transformationIds = ["ziwei.transformation.prosperity", "ziwei.transformation.power", "ziwei.transformation.fame", "ziwei.transformation.obstacle"];
const mutations = list => list.map((name, index) => ({ starId: starIds[name], transformationId: transformationIds[index] }));
const cases = [], started = performance.now();
for (let i = 0; i < 20; i++) {
  const date = `${1970 + i}-${String(1 + i % 12).padStart(2, "0")}-${String(1 + i % 27).padStart(2, "0")}`;
  const timeIndex = i % 12, time = `${String(timeIndex * 2).padStart(2, "0")}:30`, gender = i % 2 ? "female" : "male";
  const profile = { version: 1, originalInput: { gender, birthDate: date, birthTime: time }, normalizedCalendar: { kind: "solar", date }, normalizedTime: { precision: "exact_minute", localTime: time }, timezoneProvenance: { source: "offset", offsetMinutes: 420 }, normalizationWarnings: [], limitations: [] };
  const actual = calculateZiweiHoroscope(profile, { asOfDate: "2026-09-22", targetYear: 2026 });
  const vendor = astro.withOptions({ type: "solar", dateStr: date, timeIndex, gender, language: "en-US", config: { algorithm: "default", yearDivide: "normal", horoscopeDivide: "normal", ageDivide: "normal", dayDivide: "current" } });
  const cycles = vendor.decadalList();
  for (const [ordinal, cycle] of actual.decadalCycles.entries()) {
    const expected = cycles[ordinal];
    assert.deepEqual([cycle.palaceId, cycle.startAge, cycle.endAge, cycle.startYear, cycle.endYear], [palaceIds[expected.palaceName], ...expected.ageRange, ...expected.yearRange]);
    assert.deepEqual(cycle.transformations, mutations(expected.mutagen));
    const annualRows = vendor.yearlyList(ordinal);
    assert.deepEqual(cycle.annualPalaces.map(a => [a.year, a.age, a.palaceId]), annualRows.map(a => [a.year, a.age, palaceIds[vendor.palaces[a.index].name]]));
    assert.deepEqual(cycle.annualPalaces.map(a => a.transformations), annualRows.map(a => mutations(a.mutagen)));
  }
  cases.push({ id: `synthetic-${String(i + 1).padStart(2, "0")}`, birthDate: date, birthTime: time, gender, metadata: actual.chartMetadata, direction: actual.decadalDirection, currentOrdinal: actual.currentDecadalOrdinal, vendorParity: true,
    externalReference: null, ownerAcceptance: "pending", cycles: actual.decadalCycles });
}
const path = process.argv[2] ?? "plan/evidence/lsv88/decadal-vendor-parity-20.json";
await mkdir(dirname(path), { recursive: true });
await writeFile(path, JSON.stringify({ engineVersion: "iztro2.6.0", asOfDate: "2026-09-22", sampleCount: 20, note: "Synthetic vendor parity only. Independent reference-chart comparison and owner acceptance remain pending. Structural scores are attached by the authorized backend using the published FD107/FD111 natal-palace formula, never an invented fortune score.", cases }, null, 2) + "\n");
console.log(JSON.stringify({ path, cases: cases.length, elapsedMs: Math.round(performance.now() - started) }));
