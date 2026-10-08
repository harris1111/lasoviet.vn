import { deriveReportTimingLineage, REPORT_KNOWLEDGE_VERSION_V4, REPORT_TIMING_RULE_VERSION_V2, CURRENT_REPORT_RENDER_VERSION } from "./identity-report-config.js";
import { PERIOD_READING_TUPLE } from "./period-reading-writer.js";

export function periodKindForSku(sku: string): "monthly" | "annual" | null {
  return sku === "ZIWEI-MONTHLY-P0" ? "monthly" : (sku === "ZIWEI-YEAR-P0" || sku === "ZIWEI-YEAR-2026-P0") ? "annual" : null;
}
export function isAnnualPurchaseSku(sku: string): boolean {
  return ["ZIWEI-YEAR-P0", "ZIWEI-YEAR-2026-P0", "ZIWEI-COMBO-P0", "ZIWEI-COMBO-2026-P0"].includes(sku);
}
export function annualPurchaseYear(sku: string, now: Date, requestedYear?: number): number | null {
  if (!isAnnualPurchaseSku(sku)) return null;
  const current = deriveReportTimingLineage(now).targetYear;
  const legacy = sku === "ZIWEI-YEAR-2026-P0" || sku === "ZIWEI-COMBO-2026-P0";
  const year = legacy ? 2026 : requestedYear ?? current;
  if (legacy && requestedYear !== undefined && requestedYear !== 2026) return null;
  return Number.isInteger(year) && year >= 1900 && year <= 2100 && (year === current || year === current + 1) ? year : null;
}
export function purchasePeriodKey(sku: string, now: Date, resolveMonthlyPeriodKey?: (asOfDate: string) => string, requestedYear?: number): string {
  if (sku === "ZIWEI-MONTHLY-P0") return resolveMonthlyPeriodKey?.(deriveReportTimingLineage(now).asOfDate) ?? "unavailable";
  if (isAnnualPurchaseSku(sku)) return String(annualPurchaseYear(sku, now, requestedYear) ?? "unavailable");
  return "lifetime";
}
export function periodReportVersions() {
  return { ...PERIOD_READING_TUPLE, family: "v4_1" as const, knowledgeVersion: REPORT_KNOWLEDGE_VERSION_V4,
    templateVersion: "ziwei.period-reading.html.v1" as const, renderVersion: CURRENT_REPORT_RENDER_VERSION, timingRuleVersion: REPORT_TIMING_RULE_VERSION_V2 };
}
export function isPeriodReportTuple(value: {sku:string;locale:string;promptVersion:string;reportConfigVersion:string;knowledgeVersionId:string}): boolean {
  return periodKindForSku(value.sku) !== null && value.locale === "vi" && value.promptVersion === PERIOD_READING_TUPLE.promptVersion &&
    value.reportConfigVersion === PERIOD_READING_TUPLE.reportConfigVersion && value.knowledgeVersionId === REPORT_KNOWLEDGE_VERSION_V4;
}

/** Generic2026 is the same owned reading as its historical2026 SKU. */
export function annualSkuAliases(sku: string, periodKey: string): string[] {
  return periodKey === "2026" && ["ZIWEI-YEAR-P0", "ZIWEI-YEAR-2026-P0"].includes(sku)
    ? ["ZIWEI-YEAR-P0", "ZIWEI-YEAR-2026-P0"] : [sku];
}
