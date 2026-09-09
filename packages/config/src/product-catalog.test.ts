import { describe, expect, it } from "vitest";

import {
  productCatalog,
  validateProductCatalog,
} from "./product-catalog.js";

describe("product catalog", () => {
  it("exposes both active comprehensive and natal excerpt offers and keeps other products reserved", () => {
    expect(productCatalog.firstPaidOffers()).toEqual([
      expect.objectContaining({
        sku: "ZIWEI-IDENTITY-P0",
        method: "ziwei",
        price: 79000,
        currency: "VND",
      }),
      expect.objectContaining({
        sku: "ZIWEI-NATAL-EXCERPT-P0",
        method: "ziwei",
        price: 19000,
        currency: "VND",
      }),
    ]);
    expect(productCatalog.findSelectableOffer("ZIWEI-IDENTITY-P0")).toBeDefined();
    expect(productCatalog.findSelectableOffer("ZIWEI-NATAL-EXCERPT-P0")).toBeDefined();
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

    // Missing the approved first-paid flow SKU
    expect(() => validateProductCatalog({
      currency: "VND",
      pricing_status: "hypothesis_to_test",
      products: [
        { sku: "ZIWEI-IDENTITY-P0", name: "Bản mệnh", method: "ziwei", price: 79000, phase: "P0", availability: "first_paid_flow", sections: ["personal_summary"] },
        { sku: "ZIWEI-CAREER-P0", name: "Công việc", method: "ziwei", price: 79000, phase: "P7", availability: "reserved", sections: ["career"] },
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

  it("rejects wrong active identity price", () => {
    const wrongNatalPrice = {
      currency: "VND",
      pricing_status: "hypothesis_to_test",
      products: [
        { sku: "ZIWEI-IDENTITY-P0", name: "Bản mệnh & tiềm năng", method: "ziwei", price: 79000, phase: "P0", availability: "first_paid_flow", sections: ["personal_summary"] },
        { sku: "ZIWEI-NATAL-EXCERPT-P0", name: "Bản mệnh và tiềm năng", method: "ziwei", price: 29000, phase: "P1", availability: "first_paid_flow", sections: ["overview", "coreAxis", "strengthsAndTensions", "practicalDirection"] },
      ],
    };
    expect(() => validateProductCatalog(wrongNatalPrice)).toThrow("PRODUCT_CATALOG_INVALID");

    const wrongIdentityPrice = {
      currency: "VND",
      pricing_status: "hypothesis_to_test",
      products: [
        { sku: "ZIWEI-IDENTITY-P0", name: "Bản mệnh & tiềm năng", method: "ziwei", price: 19000, phase: "P0", availability: "first_paid_flow", sections: ["personal_summary"] },
        { sku: "ZIWEI-NATAL-EXCERPT-P0", name: "Bản mệnh và tiềm năng", method: "ziwei", price: 19000, phase: "P1", availability: "first_paid_flow", sections: ["overview", "coreAxis", "strengthsAndTensions", "practicalDirection"] },
      ],
    };
    expect(() => validateProductCatalog(wrongIdentityPrice)).toThrow("PRODUCT_CATALOG_INVALID");
  });

  it("requires exact active natal excerpt policy metadata", () => {
    const validIdentity = {
      sku: "ZIWEI-IDENTITY-P0",
      name: "Bản mệnh & tiềm năng",
      method: "ziwei",
      price: 79000,
      phase: "P0",
      availability: "first_paid_flow",
      sections: ["personal_summary"],
    };
    const validNatal = {
      sku: "ZIWEI-NATAL-EXCERPT-P0",
      name: "Bản mệnh và tiềm năng",
      method: "ziwei",
      price: 19000,
      phase: "P1",
      availability: "first_paid_flow",
      sections: ["overview", "coreAxis", "strengthsAndTensions", "practicalDirection"],
    };
    const source = (natal: unknown, includeNatal = true) => ({
      currency: "VND",
      pricing_status: "hypothesis_to_test",
      products: includeNatal ? [validIdentity, natal] : [validIdentity],
    });

    expect(() => validateProductCatalog(source(validNatal))).not.toThrow();
    expect(() => validateProductCatalog(source(validNatal, false))).toThrow("PRODUCT_CATALOG_INVALID");
    expect(() => validateProductCatalog(source({ ...validNatal, method: "bazi" }))).toThrow("PRODUCT_CATALOG_INVALID");
    expect(() => validateProductCatalog(source({ ...validNatal, price: 29000 }))).toThrow("PRODUCT_CATALOG_INVALID");
    expect(() => validateProductCatalog(source({ ...validNatal, phase: "P0" }))).toThrow("PRODUCT_CATALOG_INVALID");
    expect(() => validateProductCatalog(source({ ...validNatal, availability: "reserved" }))).toThrow("PRODUCT_CATALOG_INVALID");
    expect(() => validateProductCatalog(source({ ...validNatal, sections: ["overview"] }))).toThrow("PRODUCT_CATALOG_INVALID");
  });

  it("rejects malformed schema such as missing sections or invalid sku syntax", () => {
    const malformedSku = {
      currency: "VND",
      pricing_status: "hypothesis_to_test",
      products: [
        { sku: "ZIWEI--P0", name: "Bad SKU", method: "ziwei", price: 79000, phase: "P0", availability: "first_paid_flow", sections: ["personal_summary"] },
        { sku: "ZIWEI-NATAL-EXCERPT-P0", name: "Bản mệnh và tiềm năng", method: "ziwei", price: 19000, phase: "P1", availability: "first_paid_flow", sections: ["overview", "coreAxis", "strengthsAndTensions", "practicalDirection"] },
      ],
    };
    expect(() => validateProductCatalog(malformedSku)).toThrow("PRODUCT_CATALOG_INVALID");

    const emptySections = {
      currency: "VND",
      pricing_status: "hypothesis_to_test",
      products: [
        { sku: "ZIWEI-IDENTITY-P0", name: "Bản mệnh & tiềm năng", method: "ziwei", price: 79000, phase: "P0", availability: "first_paid_flow", sections: [] },
        { sku: "ZIWEI-NATAL-EXCERPT-P0", name: "Bản mệnh và tiềm năng", method: "ziwei", price: 19000, phase: "P1", availability: "first_paid_flow", sections: ["overview", "coreAxis", "strengthsAndTensions", "practicalDirection"] },
      ],
    };
    expect(() => validateProductCatalog(emptySections)).toThrow("PRODUCT_CATALOG_INVALID");

    const invalidCurrency = {
      currency: "USD",
    };
    expect(() => validateProductCatalog(invalidCurrency)).toThrow("PRODUCT_CATALOG_INVALID");
  });
});
