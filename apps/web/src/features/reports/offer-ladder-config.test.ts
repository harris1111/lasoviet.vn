import { describe, expect, it } from "vitest";
import { visibleLadder } from "./offer-ladder-config";

const catalog = (active: string[]) => (sku: string) => ({ availability: active.includes(sku) || sku.startsWith("ZIWEI-PALACE-") ? "active" : "reserved", locales: ["vi", "en"], category: sku.startsWith("ZIWEI-PALACE-") ? "palace" : "report" });
const skus = (active: string[], locale: "vi" | "en" = "vi") => visibleLadder(locale, "ZIWEI-PALACE-LIFE-P0", catalog(active)).flatMap((tier) => tier.entries.map((entry) => entry.resolved));

describe("offer ladder visibility", () => {
  it("never shows a product the catalog holds back", () => {
    const shown = skus(["ZIWEI-TODAY-P0", "ZIWEI-IDENTITY-P0"]);
    expect(shown).toContain("ZIWEI-TODAY-P0");
    expect(shown).not.toContain("ZIWEI-YEAR-2026-P0");
    expect(shown).not.toContain("ZIWEI-CAREER-P0");
    expect(shown).not.toContain("ZIWEI-COMBO-2026-P0");
  });
  it("shows a product by itself once the catalog switches it on", () => {
    expect(skus(["ZIWEI-IDENTITY-P0"])).not.toContain("ZIWEI-CAREER-P0");
    expect(skus(["ZIWEI-IDENTITY-P0", "ZIWEI-CAREER-P0"])).toContain("ZIWEI-CAREER-P0");
  });
  it("keeps time order: today, palace, topic, life, bundle", () => {
    const tiers = visibleLadder("vi", "ZIWEI-PALACE-LIFE-P0", catalog(["ZIWEI-TODAY-P0", "ZIWEI-NATAL-EXCERPT-P0", "ZIWEI-CAREER-P0", "ZIWEI-IDENTITY-P0", "ZIWEI-COMBO-2026-P0"])).map((t) => t.tier);
    expect(tiers).toEqual(["today", "palace", "topic", "life", "bundle"]);
  });
  it("hides the single-palace card for English, where palace sales are not supported", () => {
    expect(skus(["ZIWEI-IDENTITY-P0"], "en")).not.toContain("ZIWEI-PALACE-LIFE-P0");
    expect(skus(["ZIWEI-IDENTITY-P0"], "vi")).toContain("ZIWEI-PALACE-LIFE-P0");
  });
});
