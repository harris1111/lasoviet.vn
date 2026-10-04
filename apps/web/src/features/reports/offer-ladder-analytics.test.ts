import { describe, expect, it } from "vitest";
import { claimLadderViewEvents } from "./offer-ladder-analytics.js";
import type { WalletQuoteV1 } from "@lasoviet/contracts";
const nowMs = Date.parse("2026-10-04T00:00:00Z");
const quote: WalletQuoteV1 = { sku: "ZIWEI-IDENTITY-P0", state: "available", basePriceLa: 960, priceLa: 720, creditLa: 240, discountLa: 0, creditExpiresAt: "2026-10-06T00:00:00Z", creditSourceSkus: ["ZIWEI-PALACE-LIFE-P0", "ZIWEI-PALACE-WEALTH-P0"], reportId: null, reportState: null };
describe("actual ladder impressions", () => {
  it("uses displayed SKU, locale and placement, with authoritative expiry and source dedupe", () => {
    const input = { sku: quote.sku, locale: "vi" as const, quote, nowMs, seen: new Set<string>() };
    expect(claimLadderViewEvents(input)).toEqual([
      { name: "offer_view", properties: { offer_id: quote.sku, sku: quote.sku, locale: "vi", placement: "paid_topic_selector" } },
      ...quote.creditSourceSkus.map(source => ({ name: "upgrade_view", properties: { source_sku: source, target_sku: quote.sku, days_remaining: 2 } })),
    ]);
    expect(claimLadderViewEvents(input)).toEqual([]);
  });
  it("does not invent credit timing for missing, expired, discounted or reserved terms", () => {
    for (const changed of [{ creditExpiresAt: null }, { creditExpiresAt: "invalid" }, { creditExpiresAt: "2026-10-04T00:00:00Z" }, { creditLa: 0 }, { state: "coming_soon" }]) {
      const events = claimLadderViewEvents({ sku: quote.sku, locale: "en", quote: { ...quote, ...changed } as WalletQuoteV1, nowMs, seen: new Set() });
      expect(events.map(item => item.name)).toEqual(["offer_view"]);
    }
  });
});
