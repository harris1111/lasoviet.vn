import { findLaProduct, type LaSku, type WalletQuoteV1 } from "@lasoviet/contracts";

export function claimLadderViewEvents(input: {
  sku: LaSku; locale: "vi" | "en"; quote?: WalletQuoteV1;
  nowMs: number; seen: Set<string>;
}) {
  if (!findLaProduct(input.sku)) return [];
  const events: Array<{ name: "offer_view" | "upgrade_view"; properties: Record<string, string | number> }> = [];
  const offerKey = `${input.locale}:${input.sku}`;
  if (!input.seen.has(offerKey)) {
    input.seen.add(offerKey);
    events.push({ name: "offer_view", properties: { offer_id: input.sku, sku: input.sku, locale: input.locale, placement: "paid_topic_selector" } });
  }
  const quote = input.quote;
  if (quote?.sku === "ZIWEI-IDENTITY-P0" && quote.state === "available" && quote.creditLa > 0 && quote.creditExpiresAt) {
    const expiry = Date.parse(quote.creditExpiresAt);
    if (!Number.isFinite(expiry) || expiry <= input.nowMs) return events;
    for (const source of quote.creditSourceSkus) {
      const key = `${input.locale}:${source}->${quote.sku}:${quote.creditExpiresAt}`;
      if (input.seen.has(key)) continue;
      input.seen.add(key);
      events.push({ name: "upgrade_view", properties: { source_sku: source, target_sku: quote.sku, days_remaining: Math.ceil((expiry - input.nowMs) / 86_400_000) } });
    }
  }
  return events;
}
