import { describe, expect, it } from "vitest";
import { residualBalanceSuggestion } from "./residual-balance";

describe("residual balance suggestions", () => {
  it.each([
    ["ZIWEI-PALACE-LIFE-P0", 180, "residualPalaceToday", 180, false],
    ["ZIWEI-NATAL-EXCERPT-P0", 60, "residualToday", 60, false],
    ["ZIWEI-IDENTITY-P0", 140, "residualTwoDays", 120, false],
    ["ZIWEI-CAREER-P0", 620, "residualTopicPalace", 600, true],
  ] as const)("uses catalog prices for %s and marks unsold products", (sku, balance, key, cost, reserved) => {
    expect(residualBalanceSuggestion(sku, balance, "vi")).toEqual({ key, cost, reserved });
    expect(residualBalanceSuggestion(sku, cost - 1, "vi")).toBeNull();
  });
  it("does not suggest Vietnamese-only daily products in English", () => {
    for (const sku of ["ZIWEI-PALACE-LIFE-P0", "ZIWEI-NATAL-EXCERPT-P0", "ZIWEI-IDENTITY-P0"]) {
      expect(residualBalanceSuggestion(sku, 1000, "en")).toBeNull();
    }
  });
  it("does not invent an offer for unknown or unsupported purchases", () => {
    expect(residualBalanceSuggestion("unknown", 1000, "vi")).toBeNull();
    expect(residualBalanceSuggestion("MEMBERSHIP-YEARLY-P0", 0, "vi")).toBeNull();
  });
});
