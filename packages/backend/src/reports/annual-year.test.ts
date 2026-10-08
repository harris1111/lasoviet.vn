import { expect, it } from "vitest";
import { deriveReportTimingLineage } from "./identity-report-config.js";
import { annualPurchaseYear, purchasePeriodKey } from "./period-report-config.js";

it.each([["2027-01-15T12:00:00Z", 2026], ["2027-02-05T16:59:59Z", 2026], ["2027-02-05T17:00:00Z", 2027]])(
  "rolls the annual key at Vietnam Tet midnight %s", (at, year) => {
    const now = new Date(at as string);
    expect(deriveReportTimingLineage(now).targetYear).toBe(year);
    expect(purchasePeriodKey("ZIWEI-YEAR-P0", now)).toBe(String(year));
    expect(annualPurchaseYear("ZIWEI-YEAR-P0", now, Number(year) + 1)).toBe(Number(year) + 1);
    expect(annualPurchaseYear("ZIWEI-YEAR-P0", now, Number(year) + 2)).toBeNull();
    expect(annualPurchaseYear("ZIWEI-YEAR-P0", now, Number(year) - 1)).toBeNull();
  });
it("keeps explicit historical timing rules reconstructible and legacy SKU year immutable", () => {
  const now = new Date("2027-01-15T12:00:00Z");
  expect(deriveReportTimingLineage(now, { timingRuleVersion: "ziwei.timing.v1" }).targetYear).toBe(2027);
  expect(annualPurchaseYear("ZIWEI-YEAR-2026-P0", now)).toBe(2026);
  expect(annualPurchaseYear("ZIWEI-YEAR-2026-P0", now, 2027)).toBeNull();
  expect(purchasePeriodKey("ZIWEI-COMBO-P0", now, undefined, 2027)).toBe("2027");
});
