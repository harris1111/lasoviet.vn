import "server-only";

import type { CommerceSku } from "@lasoviet/contracts";

export const PUBLIC_OFFER_KEYS = [
  "ziwei-comprehensive",
  "ziwei-natal-excerpt",
] as const;
export type PublicOfferKey = (typeof PUBLIC_OFFER_KEYS)[number];

export const DEFAULT_PUBLIC_OFFER_KEY: PublicOfferKey = "ziwei-comprehensive";

const PUBLIC_OFFER_TO_SKU: Readonly<Record<PublicOfferKey, CommerceSku>> = Object.freeze({
  "ziwei-comprehensive": "ZIWEI-IDENTITY-P0",
  "ziwei-natal-excerpt": "ZIWEI-NATAL-EXCERPT-P0",
});

const SKU_TO_PUBLIC_OFFER: Readonly<Record<CommerceSku, PublicOfferKey>> = Object.freeze({
  "ZIWEI-IDENTITY-P0": "ziwei-comprehensive",
  "ZIWEI-NATAL-EXCERPT-P0": "ziwei-natal-excerpt",
});

export function isPublicOfferKey(value: unknown): value is PublicOfferKey {
  return typeof value === "string" && (PUBLIC_OFFER_KEYS as readonly string[]).includes(value);
}

export function resolveActiveSkuFromPublicOfferKey(offerKey: unknown): CommerceSku | null {
  if (!isPublicOfferKey(offerKey)) {
    return null;
  }
  return PUBLIC_OFFER_TO_SKU[offerKey] ?? null;
}

export function resolvePublicOfferKeyFromSku(sku: unknown): PublicOfferKey | null {
  if (typeof sku !== "string") {
    return null;
  }
  return SKU_TO_PUBLIC_OFFER[sku as CommerceSku] ?? null;
}
