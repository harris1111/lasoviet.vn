import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { calculateZiweiHoroscope, calculatePeriodReadingFacts } from "../packages/engine-adapters/dist/index.js";

const histogram = {}, cases = [];
for (let i = 0; i < 200; i++) {
  const date = `${1960 + i % 46}-${String(1 + i % 12).padStart(2, "0")}-${String(1 + i % 27).padStart(2, "0")}`;
  const time = `${String(i % 12 * 2).padStart(2, "0")}:30`, gender = i % 2 ? "female" : "male";
  const profile = { version: 1, originalInput: { gender, birthDate: date, birthTime: time },
    normalizedCalendar: { kind: "solar", date }, normalizedTime: { precision: "exact_minute", localTime: time },
    timezoneProvenance: { source: "offset", offsetMinutes: 420 }, normalizationWarnings: [], limitations: [] };
  const options = { asOfDate: "2026-09-22", targetYear: 2026 };
  const free = calculateZiweiHoroscope(profile, options);
  assert.deepEqual(calculateZiweiHoroscope(profile, options), free);
  const paid = calculatePeriodReadingFacts({ birthProfile: profile, chartId: "synthetic", chartVersionId: "synthetic", kind: "annual", ...options });
  const warnMonths = free.yearly.months.filter(month => month.marker === "warn").map(month => month.monthIndex);
  assert.deepEqual(warnMonths, paid.periods.filter(period => period.obstacleStarIds.length).map(period => period.month));
  histogram[warnMonths.length] = (histogram[warnMonths.length] ?? 0) + 1;
  cases.push({ id: `synthetic-${i + 1}`, birthDate: date, birthTime: time, gender, warnMonths,
    evidence: free.yearly.months.filter(month => month.marker === "warn").map(month => ({ month: month.monthIndex,
      keys: month.evidenceKeys.filter(key => key.includes(".obstacle.")) })) });
}
const report = { ruleVersion: "monthly-attention-v1", targetYear: 2026, sampleCount: 200,
  interpretation: "A real monthly or annual Hua Ji must occur in the touched monthly palace. Natal malefics are context, never a standalone warning. This synthetic distribution is not empirical prediction accuracy or owner acceptance.",
  deterministicReplay: true, freePaidAgreement: true, zeroWarningCharts: histogram[0] ?? 0, histogram, cases };
const path = process.argv[2] ?? "plan/evidence/lsv87/monthly-attention-200.json";
await mkdir(dirname(path), { recursive: true });
await writeFile(path, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({ path, sampleCount: 200, histogram, zeroWarningCharts: report.zeroWarningCharts }));
