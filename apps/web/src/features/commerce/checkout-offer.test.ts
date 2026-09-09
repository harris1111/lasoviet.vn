import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  DEFAULT_PUBLIC_OFFER_KEY,
  isPublicOfferKey,
  resolveActiveSkuFromPublicOfferKey,
  resolvePublicOfferKeyFromSku,
} from "./checkout-offer";

describe("checkout-offer", () => {
  it("resolves default public offer key to active comprehensive SKU", () => {
    expect(DEFAULT_PUBLIC_OFFER_KEY).toBe("ziwei-comprehensive");
    expect(resolveActiveSkuFromPublicOfferKey("ziwei-comprehensive")).toBe("ZIWEI-IDENTITY-P0");
  });

  it("fails closed for unknown or arbitrary offer keys", () => {
    expect(resolveActiveSkuFromPublicOfferKey("unknown")).toBeNull();
    expect(resolveActiveSkuFromPublicOfferKey("ZIWEI-IDENTITY-P0")).toBeNull();
    expect(resolveActiveSkuFromPublicOfferKey("ziwei-natal-excerpt")).toBe("ZIWEI-NATAL-EXCERPT-P0");
    expect(resolveActiveSkuFromPublicOfferKey("")).toBeNull();
    expect(resolveActiveSkuFromPublicOfferKey(null)).toBeNull();
    expect(resolveActiveSkuFromPublicOfferKey(undefined)).toBeNull();
  });

  it("maps active SKU to public offer key", () => {
    expect(resolvePublicOfferKeyFromSku("ZIWEI-IDENTITY-P0")).toBe("ziwei-comprehensive");
  });

  it("returns null for unapproved, reserved, or unknown SKUs", () => {
    expect(resolvePublicOfferKeyFromSku("ZIWEI-NATAL-EXCERPT-P0")).toBe("ziwei-natal-excerpt");
    expect(resolvePublicOfferKeyFromSku("ZIWEI-RELATIONSHIP-P0")).toBeNull();
    expect(resolvePublicOfferKeyFromSku("UNKNOWN-SKU")).toBeNull();
    expect(resolvePublicOfferKeyFromSku(null)).toBeNull();
  });

  it("validates public offer keys correctly", () => {
    expect(isPublicOfferKey("ziwei-comprehensive")).toBe(true);
    expect(isPublicOfferKey("ziwei-natal-excerpt")).toBe(true);
    expect(isPublicOfferKey("ZIWEI-IDENTITY-P0")).toBe(false);
    expect(isPublicOfferKey("")).toBe(false);
  });

  it("ensures public offer keys contain no internal technical SKU strings", () => {
    expect(DEFAULT_PUBLIC_OFFER_KEY).not.toMatch(/ZIWEI-[A-Z0-9]+/);
  });
});
