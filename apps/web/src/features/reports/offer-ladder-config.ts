import { findLaProduct, isSinglePalaceSku, type LaSku } from "@lasoviet/contracts";

export type LadderTier = "today" | "monthly" | "year" | "palace" | "topic" | "life" | "bundle";
export type LadderEntry = { sku: LaSku | "palace"; tier: LadderTier; copy: string };

/**
 * Every product the ladder can ever show, in time order. Visibility is not decided here: an entry
 * appears only when the catalog says its product is active, so switching a product on in the catalog
 * is all it takes for its card to show up (and a held product never shows).
 */
export const LADDER_ENTRIES: readonly LadderEntry[] = [
  { sku: "ZIWEI-TODAY-P0", tier: "today", copy: "today" },
  { sku: "ZIWEI-MONTHLY-P0", tier: "monthly", copy: "monthly" },
  { sku: "ZIWEI-YEAR-2026-P0", tier: "year", copy: "year" },
  { sku: "palace", tier: "palace", copy: "palace" },
  { sku: "ZIWEI-NATAL-EXCERPT-P0", tier: "palace", copy: "natal" },
  { sku: "ZIWEI-CAREER-P0", tier: "topic", copy: "career" },
  { sku: "ZIWEI-RELATIONSHIP-P0", tier: "topic", copy: "relationship" },
  { sku: "ZIWEI-IDENTITY-P0", tier: "life", copy: "identity" },
  { sku: "ZIWEI-COMBO-2026-P0", tier: "bundle", copy: "combo" },
];

type ProductLookup = (sku: string) => { availability: string; locales: readonly string[]; category?: string } | undefined;

export function visibleLadder(locale: "vi" | "en", palaceSku: LaSku, lookup: ProductLookup = findLaProduct) {
  const tiers: { tier: LadderTier; entries: (LadderEntry & { resolved: LaSku })[] }[] = [];
  for (const entry of LADDER_ENTRIES) {
    const resolved = entry.sku === "palace" ? palaceSku : entry.sku;
    const product = lookup(resolved);
    if (!product || product.availability !== "active" || !product.locales.includes(locale)) continue;
    if (entry.sku === "palace" && locale === "en" && isSinglePalaceSku(resolved) && product.category === "palace") continue;
    const group = tiers.find((item) => item.tier === entry.tier) ?? (tiers.push({ tier: entry.tier, entries: [] }), tiers[tiers.length - 1]!);
    group.entries.push({ ...entry, resolved });
  }
  return tiers;
}
