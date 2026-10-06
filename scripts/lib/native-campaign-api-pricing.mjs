import { createHash } from "node:crypto";

// FD-114 accepts this public API tariff as campaign accounting for the private route.
const snapshot = {
  version: "gemini-3.8-flash-standard-20261006-fx26110",
  decision: "FD-114", basis: "owner_approved_api_reference",
  model: "gemini-3.8-flash", tier: "STANDARD",
  sourceUrl: "https://ai.google.dev/gemini-api/docs/pricing.md",
  checkedAt: "2026-10-06", validFrom: "2026-10-06T00:00:00.000Z", validUntilExclusive: "2027-01-01T00:00:00.000Z",
  fxVndPerUsd: 26_110,
  ratesUsdPerMillion: Object.freeze({ uncachedInput: "0.75", outputIncludingThinking: "3.75", cacheRead: "0.075" }),
};
export const API_REFERENCE_PRICING = Object.freeze({ ...snapshot, snapshotSha256: createHash("sha256").update(JSON.stringify(snapshot)).digest("hex") });
const fail = code => { throw Object.assign(new Error(code), { code }); };
const counter = value => Number.isSafeInteger(value) && value >= 0;

export function nativeApiReferencePricing(at) {
  if (!(at instanceof Date) || !Number.isFinite(at.getTime()) || at.getTime() < Date.parse(snapshot.validFrom) || at.getTime() >= Date.parse(snapshot.validUntilExclusive)) fail("NATIVE_API_PRICING_OUTSIDE_VALIDITY");
  return API_REFERENCE_PRICING;
}

export function quoteNativeApiReference(receipt, { at } = {}) {
  const pricing = nativeApiReferencePricing(at);
  if (receipt?.rawCountersComplete !== true || !["gemini-3.8-flash", "gemini-3.8-flash-medium"].includes(receipt.modelVersion) ||
      ![receipt.inputTokens, receipt.outputTokens, receipt.cachedTokens, receipt.reasoningTokens, receipt.totalTokens].every(counter) ||
      receipt.cachedTokens > receipt.inputTokens || !Number.isSafeInteger(receipt.inputTokens + receipt.outputTokens + receipt.reasoningTokens) ||
      receipt.totalTokens !== receipt.inputTokens + receipt.outputTokens + receipt.reasoningTokens) fail("NATIVE_API_PRICING_USAGE_UNVERIFIED");
  // 20 * micro-VND/token, exact at the frozen USD/M rates and FX reference.
  const numerator = BigInt(receipt.inputTokens - receipt.cachedTokens) * 391_650n +
    (BigInt(receipt.outputTokens) + BigInt(receipt.reasoningTokens)) * 1_958_250n + BigInt(receipt.cachedTokens) * 39_165n;
  const microVnd = (numerator + 19n) / 20n;
  return Object.freeze({ quoteKind: pricing.basis, accountingStatus: "api_reference", providerBillingVerified: false,
    pricingVersion: pricing.version, snapshotSha256: pricing.snapshotSha256, sourceUrl: pricing.sourceUrl, quotedAt: at.toISOString(),
    fxReferenceVndPerUsd: pricing.fxVndPerUsd, quoteMicroVnd: String(microVnd), quoteVnd: String((microVnd + 999_999n) / 1_000_000n), executionReady: false });
}
