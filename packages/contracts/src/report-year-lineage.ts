/** Legacy timing stays solar-year exact; lunar v2 also permits frozen current/next-year selection. */
export function matchesReportYearLineage(asOfDate: string, targetYear: number, timingRuleVersion?: string): boolean {
  const solarYear = Number(asOfDate.slice(0, 4));
  return timingRuleVersion === "ziwei.timing.lunar-year.v2"
    ? Number.isInteger(targetYear) && targetYear >= 1900 && targetYear <= 2100 && targetYear >= solarYear - 1 && targetYear <= solarYear + 1
    : targetYear === solarYear;
}
