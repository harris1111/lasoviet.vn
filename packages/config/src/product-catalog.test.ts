import { describe, expect, it } from "vitest";

import {
  productCatalog,
  validateProductCatalog,
} from "./product-catalog.js";

describe("product catalog", () => {
  it("exposes only the configured first paid Zi Wei identity offer", () => {
    expect(productCatalog.firstPaidOffers()).toEqual([expect.objectContaining({
      sku: "ZIWEI-IDENTITY-P0",
      method: "ziwei",
      price: 79000,
      currency: "VND",
    })]);
    expect(productCatalog.findSelectableOffer("ZIWEI-IDENTITY-P0")).toBeDefined();
    expect(productCatalog.findSelectableOffer("ZIWEI-RELATIONSHIP-P0")).toBeUndefined();
  });

  it("rejects duplicated SKUs and more than one first paid flow product", () => {
    const duplicate = {
      currency: "VND",
      products: [
        { sku: "ZIWEI-IDENTITY-P0", method: "ziwei", price: 79000, availability: "first_paid_flow", sections: ["personal_summary"] },
        { sku: "ZIWEI-IDENTITY-P0", method: "ziwei", price: 79000, availability: "reserved", sections: ["strengths"] },
      ],
    };
    expect(() => validateProductCatalog(duplicate)).toThrow("PRODUCT_CATALOG_INVALID");
    expect(() => validateProductCatalog({
      ...duplicate,
      products: [
        { ...duplicate.products[0], sku: "ZIWEI-IDENTITY-P0" },
        { ...duplicate.products[1], sku: "ZIWEI-CAREER-P0", availability: "first_paid_flow" },
      ],
    })).toThrow("PRODUCT_CATALOG_INVALID");
  });

  it("keeps reserved Bazi and Western products unselectable without payment activation", () => {
    expect(productCatalog.findSelectableOffer("BAZI-COMPREHENSIVE-P0")).toBeUndefined();
    expect(productCatalog.findSelectableOffer("WESTERN-NATAL-P0")).toBeUndefined();
  });

  it("rejects non-ZiWei first paid flow offers or unauthorized first paid SKU changes", () => {
    const baziAsFirstPaid = {
      currency: "VND",
      pricing_status: "hypothesis_to_test",
      products: [
        {
          sku: "BAZI-COMPREHENSIVE-P0",
          name: "Luận giải Bát Tự toàn diện",
          method: "bazi",
          price: 79000,
          phase: "P8",
          availability: "first_paid_flow",
          decision_ref: "OD-002",
          sections: ["day_master_summary"],
        },
      ],
    };
    expect(() => validateProductCatalog(baziAsFirstPaid)).toThrow("PRODUCT_CATALOG_INVALID");
  });
});
