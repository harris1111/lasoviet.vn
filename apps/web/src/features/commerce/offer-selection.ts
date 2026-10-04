import { CANONICAL_PALACE_SKU_MAP, PalaceIdSchema, type LaSku } from "@lasoviet/contracts";

const OFFERS: Record<string, LaSku> = {
  "ziwei-comprehensive": "ZIWEI-IDENTITY-P0",
  "ziwei-natal-excerpt": "ZIWEI-NATAL-EXCERPT-P0",
  "ziwei-relationship": "ZIWEI-RELATIONSHIP-P0",
  "ziwei-career": "ZIWEI-CAREER-P0",
  "ziwei-year-2026": "ZIWEI-YEAR-2026-P0",
  "ziwei-combo-2026": "ZIWEI-COMBO-2026-P0",
};
export function resolveLadderSelection(offer: unknown, palace: unknown): LaSku {
  if (offer === "ziwei-palace") {
    const parsed = PalaceIdSchema.safeParse(palace);
    if (parsed.success) return CANONICAL_PALACE_SKU_MAP[parsed.data] as LaSku;
  }
  return typeof offer === "string" ? OFFERS[offer] ?? "ZIWEI-IDENTITY-P0" : "ZIWEI-IDENTITY-P0";
}
export function ladderSelectionQuery(sku: LaSku): Record<string, string> {
  const palace = Object.entries(CANONICAL_PALACE_SKU_MAP).find(([, value]) => value === sku);
  if (palace) return { offer: "ziwei-palace", palace: palace[0] };
  return { offer: Object.entries(OFFERS).find(([, value]) => value === sku)?.[0] ?? "ziwei-comprehensive" };
}
