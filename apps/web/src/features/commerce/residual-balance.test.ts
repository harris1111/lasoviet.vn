import { describe, expect, it } from "vitest";
import { residualBalanceSuggestion } from "./residual-balance";

describe("residual balance suggestions", () => {
  it.each([
    ["ZIWEI-PALACE-LIFE-P0", 180, "residualPalaceToday", 180],
    ["ZIWEI-NATAL-EXCERPT-P0", 60, "residualToday", 60],
    ["ZIWEI-IDENTITY-P0", 140, "residualTwoDays", 120],
    ["ZIWEI-CAREER-P0", 620, "residualTopicPalace", 600],
  ] as const)("uses catalog prices for %s and marks unsold products", (sku, balance, key, cost) => {
    expect(residualBalanceSuggestion(sku, balance, "vi")).toEqual({ key, cost, reserved: true });
    expect(residualBalanceSuggestion(sku, cost - 1, "vi")).toBeNull();
  });
  it("does not invent an offer for unknown or unsupported purchases", () => {
    expect(residualBalanceSuggestion("unknown", 1000, "vi")).toBeNull();
    expect(residualBalanceSuggestion("MEMBERSHIP-YEARLY-P0", 0, "vi")).toBeNull();
  });
});
