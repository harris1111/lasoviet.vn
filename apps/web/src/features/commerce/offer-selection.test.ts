import { describe, expect, it } from "vitest";
import { resolveLadderSelection, ladderSelectionQuery } from "./offer-selection.js";
describe("closed ladder selection", () => {
  it("round trips active and reserved choices without granting availability", () => {
    for (const sku of ["ZIWEI-PALACE-SPOUSE-P0", "ZIWEI-IDENTITY-P0", "ZIWEI-COMBO-2026-P0"] as const) {
      const query = ladderSelectionQuery(sku);
      expect(resolveLadderSelection(query.offer, query.palace)).toBe(sku);
    }
  });
  it("fails closed for unknown or duplicate values", () => {
    for (const [offer, palace] of [["ziwei-palace", "https://evil.test"], ["arbitrary", "ziwei.palace.life"], [["ziwei-palace", "ziwei-comprehensive"], "ziwei.palace.life"], ["ziwei-palace", ["ziwei.palace.life", "ziwei.palace.spouse"]]]) {
      expect(resolveLadderSelection(offer, palace)).toBe("ZIWEI-IDENTITY-P0");
    }
  });
});
