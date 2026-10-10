import { describe, expect, it } from "vitest";
import { freezePurchaseCommercialTerms, readPurchaseCommercialTerms } from "./purchase-commercial-terms.js";

const base = {ownerId: "owner", chartId: "chart", chartVersionId: "version", sku: "ZIWEI-IDENTITY-P0",
  locale: "vi", periodKey: "lifetime", priceLa: 960, createdAt: new Date("2026-10-08T00:00:00Z")};
describe("frozen commercial policy", () => {
  it("preserves legacy prices and guarantee eligibility without the current sale catalog", () => {
    expect(readPurchaseCommercialTerms({...base, commercialTerms: null})).toMatchObject({basePriceLa: 960, guarantee: "none"});
    expect(readPurchaseCommercialTerms({...base, sku: "ZIWEI-PALACE-LIFE-P0", priceLa: 120, commercialTerms: null}))
      .toMatchObject({basePriceLa: 120, chargedLa: 120, guarantee: "full"});
    expect(readPurchaseCommercialTerms({...base, priceLa: 1200, commercialTerms: null})).toBeNull();
  });
  it("binds every frozen authority field and rejects malformed policy", () => {
    const commercialTerms = freezePurchaseCommercialTerms(base, undefined, "pre-fd119");
    expect(readPurchaseCommercialTerms({...base, commercialTerms})).not.toBeNull();
    for (const [key, value] of Object.entries({ownerId: "foreign", chartId: "other", chartVersionId: "other", locale: "en",
      sku: "ZIWEI-YEAR-P0", periodKey: "2027", createdAt: "2026-10-09T00:00:00.000Z", chargedLa: 720,
      policy: "fd119", guarantee: "full", version: 2, basePriceLa: 1200, discountBasis: "legacy_unknown"})) {
      expect(readPurchaseCommercialTerms({...base, commercialTerms: {...commercialTerms, [key]: value}})).toBeNull();
    }
  });
  it("distinguishes membership discount, free monthly grant and fully priced purchases", () => {
    expect(freezePurchaseCommercialTerms({...base, priceLa: 768}, undefined, "pre-fd119")).toMatchObject({discountBasis: "membership", discountLa: 192});
    expect(freezePurchaseCommercialTerms({...base, sku: "ZIWEI-MONTHLY-P0", priceLa: 0, periodKey: "2026-08-regular"}, undefined, "pre-fd119"))
      .toMatchObject({discountBasis: "monthly_grant", guarantee: "none"});
    expect(freezePurchaseCommercialTerms({...base, sku: "ZIWEI-COMBO-P0", priceLa: 1300, periodKey: "2026"}, undefined, "pre-fd119"))
      .toMatchObject({basePriceLa: 1300, guarantee: "none"});
  });
});

describe("FD119 new purchases", () => {
  it("uses 1200 lifetime and an exact half guarantee, preserving old intents", () => {
    const current = {...base, priceLa: 1200};
    const commercialTerms = freezePurchaseCommercialTerms(current);
    expect(readPurchaseCommercialTerms({...current, commercialTerms})).toMatchObject({version: 2, policy: "fd119", basePriceLa: 1200, guarantee: "half"});
    expect(readPurchaseCommercialTerms({...base, commercialTerms: null})).toMatchObject({version: 1, basePriceLa: 960, guarantee: "none"});
    expect(() => freezePurchaseCommercialTerms({...base, priceLa: 1199})).toThrow();
    expect(readPurchaseCommercialTerms({...current, commercialTerms: {...commercialTerms, version: 1}})).toBeNull();
  });
  it("keeps full below500 and no guarantee on a zero-price purchase", () => {
    expect(freezePurchaseCommercialTerms({...base, sku: "ZIWEI-PALACE-LIFE-P0", priceLa: 120})).toMatchObject({guarantee: "full"});
    expect(freezePurchaseCommercialTerms({...base, sku: "ZIWEI-MONTHLY-P0", priceLa: 0})).toMatchObject({guarantee: "none"});
  });
});
