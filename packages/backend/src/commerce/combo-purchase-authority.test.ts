import { findLaProduct } from "@lasoviet/contracts";
import { describe, expect, it } from "vitest";
import { isComboReleaseReady } from "./combo-purchase-authority.js";

describe("new Combo release authority", () => {
  const released: typeof findLaProduct = sku => {
    const product = findLaProduct(sku);
    return product ? {...product, availability: "active"} : product;
  };
  it("keeps both shipped aliases reserved and rejects non-bundle identities", () => {
    for (const sku of ["ZIWEI-COMBO-P0", "ZIWEI-COMBO-2026-P0"]) expect(isComboReleaseReady(sku)).toBe(false);
    for (const sku of ["ZIWEI-YEAR-P0", "ZIWEI-IDENTITY-P0", "ZIWEI-COMBO-2027-P0", ""]) expect(isComboReleaseReady(sku, released)).toBe(false);
  });
  it.each([
    ["ZIWEI-COMBO-P0", "ZIWEI-YEAR-P0", "ZIWEI-YEAR-2026-P0"],
    ["ZIWEI-COMBO-2026-P0", "ZIWEI-YEAR-2026-P0", "ZIWEI-YEAR-P0"],
  ])("requires exact children of %s rather than another year's alias", (sku, annual, otherAnnual) => {
    expect(isComboReleaseReady(sku, released)).toBe(true);
    const held: typeof findLaProduct = key => key === annual ? findLaProduct(key) : released(key);
    expect(isComboReleaseReady(sku, held)).toBe(false);
    const unrelatedHeld: typeof findLaProduct = key => key === otherAnnual ? findLaProduct(key) : released(key);
    expect(isComboReleaseReady(sku, unrelatedHeld)).toBe(true);
    for (const key of [sku, "ZIWEI-IDENTITY-P0", annual]) {
      expect(isComboReleaseReady(sku, candidate => candidate === key ? undefined : released(candidate))).toBe(false);
      expect(isComboReleaseReady(sku, candidate => {
        const product = released(candidate);
        return product && candidate === key ? {...product, locales: ["en"]} : product;
      })).toBe(false);
    }
  });
});
