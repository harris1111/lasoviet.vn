import { deriveReportTimingLineage, REPORT_KNOWLEDGE_VERSION_V4, REPORT_TIMING_RULE_VERSION_V1, CURRENT_REPORT_RENDER_VERSION } from "./identity-report-config.js";
import { PERIOD_READING_TUPLE } from "./period-reading-writer.js";

export function periodKindForSku(sku: string): "monthly" | "annual" | null {
  return sku === "ZIWEI-MONTHLY-P0" ? "monthly" : sku === "ZIWEI-YEAR-2026-P0" ? "annual" : null;
}
export function purchasePeriodKey(sku: string, now: Date, resolveMonthlyPeriodKey?: (asOfDate: string) => string): string {
  return sku === "ZIWEI-MONTHLY-P0" ? (resolveMonthlyPeriodKey?.(deriveReportTimingLineage(now).asOfDate) ?? "unavailable")
    : sku === "ZIWEI-YEAR-2026-P0" ? "2026" : "lifetime";
}
export function periodReportVersions() {
  return { ...PERIOD_READING_TUPLE, family: "v4_1" as const, knowledgeVersion: REPORT_KNOWLEDGE_VERSION_V4,
    templateVersion: "ziwei.period-reading.html.v1" as const, renderVersion: CURRENT_REPORT_RENDER_VERSION, timingRuleVersion: REPORT_TIMING_RULE_VERSION_V1 };
}
export function isPeriodReportTuple(value: {sku:string;locale:string;promptVersion:string;reportConfigVersion:string;knowledgeVersionId:string}): boolean {
  return periodKindForSku(value.sku) !== null && value.locale === "vi" && value.promptVersion === PERIOD_READING_TUPLE.promptVersion &&
    value.reportConfigVersion === PERIOD_READING_TUPLE.reportConfigVersion && value.knowledgeVersionId === REPORT_KNOWLEDGE_VERSION_V4;
}
