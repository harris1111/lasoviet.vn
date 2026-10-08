import { expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { NormalizedBirthProfileV1Schema, ReportGenerationRequestedV2Schema, ReportSourceSnapshotV1Schema,
  ZiweiComprehensiveReportAnnualSnapshotV2Schema } from "@lasoviet/contracts";
import { calculateIztroReportSnapshot } from "./iztro-report-snapshot.js";
import { calculateZiweiHoroscope } from "./iztro-horoscope.js";

const profile = NormalizedBirthProfileV1Schema.parse({ version: 1,
  originalInput: { version: 1, calendar: { kind: "solar", date: "1990-05-12" }, time: { precision: "exact_minute", localTime: "08:30" }, timezone: { offsetMinutes: 420 }, consentVersion: "synthetic", gender: "male" },
  normalizedCalendar: { kind: "solar", date: "1990-05-12" }, normalizedTime: { precision: "exact_minute", localTime: "08:30" }, timezoneProvenance: { source: "offset", offsetMinutes: 420 }, normalizationWarnings: [], limitations: [] });

it.each([["2027-01-15", 2026], ["2027-02-06", 2028]])("passes a v2 job/source/engine/annual contract for %s -> %i", async (asOfDate, targetYear) => {
  const job = { reportId: randomUUID(), reportVersionId: randomUUID(), entitlementId: randomUUID(),
    chartVersionId: "synthetic-version", evidenceVersionId: "synthetic-evidence", knowledgeVersionId: "knowledge",
    promptVersion: "prompt", reportConfigVersion: "report", locale: "vi", sku: "ZIWEI-YEAR-P0", asOfDate, targetYear,
    timingRuleVersion: "ziwei.timing.lunar-year.v2", sensitivityRuleVersion: "ziwei.sensitivity.v1" };
  expect(ReportGenerationRequestedV2Schema.safeParse(job).success).toBe(true);
  const input = { birthProfile: profile, chartVersionId: job.chartVersionId, asOfDate: asOfDate as string,
    targetYear: targetYear as number, timingRuleVersion: job.timingRuleVersion, periodReading: { chartId: "synthetic", kind: "annual" as const } };
  const calculated = await calculateIztroReportSnapshot(input);
  if (!calculated.ok) throw new Error(calculated.error.code);
  expect(calculated.value.periodReading?.periodKey).toBe(String(targetYear));
  expect(calculated.value.periodReading?.annualPalaceId).toBe(calculateZiweiHoroscope(profile, { asOfDate: asOfDate as string, targetYear: targetYear as number }).yearly.annualPalaceId);
  expect(ReportSourceSnapshotV1Schema.safeParse({ version: 1, reportId: job.reportId, reportVersionId: job.reportVersionId,
    chartVersionId: job.chartVersionId, asOfDate, targetYear, timingRuleVersion: job.timingRuleVersion,
    sensitivityRuleVersion: job.sensitivityRuleVersion, snapshotHash: calculated.value.provenance.snapshotHash, snapshot: calculated.value }).success).toBe(true);
  const annual = { title: "Synthetic", asOfDate, targetYear, timingRuleVersion: job.timingRuleVersion,
    narrative: "Synthetic engine source", evidenceKeys: ["synthetic"] };
  expect(ZiweiComprehensiveReportAnnualSnapshotV2Schema.safeParse(annual).success).toBe(true);
  expect(ZiweiComprehensiveReportAnnualSnapshotV2Schema.safeParse({ ...annual, timingRuleVersion: "ziwei.timing.v1" }).success).toBe(false);
  expect(ReportGenerationRequestedV2Schema.safeParse({ ...job, timingRuleVersion: "ziwei.timing.v1" }).success).toBe(false);
  expect(await calculateIztroReportSnapshot({ ...input, timingRuleVersion: "ziwei.timing.v1" })).toMatchObject({ ok: false, error: { code: "ENGINE_INPUT_INVALID" } });
  expect(await calculateIztroReportSnapshot({ ...input, targetYear: 2035 })).toMatchObject({ ok: false });
});
