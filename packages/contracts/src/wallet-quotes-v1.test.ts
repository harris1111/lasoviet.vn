import { describe, expect, it } from "vitest";
import { WalletQuoteV1Schema, WalletQuotesV1Schema, WalletQuoteRequestV1Schema } from "./wallet-quotes-v1.js";
const quote = { sku: "ZIWEI-IDENTITY-P0", state: "available", basePriceLa: 960, priceLa: 720, creditLa: 240, discountLa: 0, creditExpiresAt: "2026-10-10T00:00:00Z", creditSourceSkus: ["ZIWEI-NATAL-EXCERPT-P0"], reportId: null, reportState: null };
describe("wallet quotes", () => {
  it("requires closed, arithmetically consistent advisory terms", () => {
    expect(WalletQuoteV1Schema.safeParse(quote).success).toBe(true);
    for (const changed of [{ priceLa: 721 }, { sku: "ATTACK" }, { priceLa: -1 }, { reportId: "report" }, { state: "coming_soon" }, { secret: "private" }]) expect(WalletQuoteV1Schema.safeParse({ ...quote, ...changed }).success).toBe(false);
    const owned = { ...quote, state: "owned", priceLa: null, creditLa: 0, creditExpiresAt: null, creditSourceSkus: [], reportState: "unavailable" };
    expect(WalletQuoteV1Schema.safeParse(owned).success).toBe(true);
    expect(WalletQuoteV1Schema.safeParse({ ...owned, reportState: "ready" }).success).toBe(false);
  });
  it("rejects duplicate SKU and unknown request fields", () => {
    const request = { chartId: "chart", chartVersionId: "version", locale: "vi" };
    expect(WalletQuoteRequestV1Schema.safeParse({ ...request, priceLa: 0 }).success).toBe(false);
    expect(WalletQuotesV1Schema.safeParse({ ...request, version: 1, quotedAt: "2026-10-04T00:00:00.000Z", quotes: [quote, quote] }).success).toBe(false);
  });
});
