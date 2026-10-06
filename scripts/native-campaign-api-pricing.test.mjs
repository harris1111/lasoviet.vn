import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { API_REFERENCE_PRICING, nativeApiReferencePricing, quoteNativeApiReference } from "./lib/native-campaign-api-pricing.mjs";

const at = new Date("2026-10-06T08:00:00Z");
const receipt = (inputTokens = 100, outputTokens = 50, cachedTokens = 20, reasoningTokens = 30) => ({
  rawCountersComplete: true, modelVersion: "gemini-3.8-flash", inputTokens, outputTokens, cachedTokens, reasoningTokens,
  totalTokens: inputTokens + outputTokens + reasoningTokens,
});
const quote = value => quoteNativeApiReference(value, { at });

test("owner API reference charges the cache subset and visible/thinking output once", () => {
  const value = quote(receipt());
  assert.equal(value.quoteMicroVnd, "9438765"); assert.equal(value.quoteVnd, "10");
  assert.equal(value.accountingStatus, "api_reference"); assert.equal(value.quoteKind, "owner_approved_api_reference");
  assert.equal(value.providerBillingVerified, false); assert.equal(value.executionReady, false);
  assert.equal(value.quotedAt, at.toISOString());
  assert.equal(quote(receipt(0, 1, 0, 0)).quoteMicroVnd, quote(receipt(0, 0, 0, 1)).quoteMicroVnd);
  assert.equal(quote(receipt(0, 1, 0, 1)).quoteMicroVnd, "195825");
});

test("fractional micro-VND and whole VND round upward without floating-point rates", () => {
  assert.equal(quote(receipt(1, 0, 1, 0)).quoteMicroVnd, "1959");
  assert.equal(quote(receipt(1, 1, 0, 1)).quoteMicroVnd, "215408");
  assert.equal(quote(receipt(1, 1, 0, 1)).quoteVnd, "1");
  assert.equal(quote(receipt(0, 0, 0, 0)).quoteVnd, "0");
  const large = quote(receipt(1_000_000_000_000, 1_000_000_000_000, 0, 1_000_000_000_000));
  assert.equal(large.quoteMicroVnd, "215407500000000000"); assert.equal(large.quoteVnd, "215407500000");
});

test("pricing snapshot is immutable, source/version pinned and hash verifiable", () => {
  const pricing = nativeApiReferencePricing(at);
  assert.equal(pricing, API_REFERENCE_PRICING); assert.equal(pricing.decision, "FD-114");
  assert.deepEqual(pricing.ratesUsdPerMillion, { uncachedInput: "0.75", outputIncludingThinking: "3.75", cacheRead: "0.075" });
  assert.equal(pricing.fxVndPerUsd, 26_110); assert.equal(pricing.tier, "STANDARD");
  assert.equal(pricing.sourceUrl, "https://ai.google.dev/gemini-api/docs/pricing.md");
  const { snapshotSha256, ...snapshot } = pricing;
  assert.equal(snapshotSha256, createHash("sha256").update(JSON.stringify(snapshot)).digest("hex"));
  assert.throws(() => { pricing.ratesUsdPerMillion.uncachedInput = "0"; }, TypeError);
  assert.throws(() => { pricing.validUntilExclusive = "2099-01-01"; }, TypeError);
});

test("explicit frozen quote time accepts validity boundaries and rejects expired or unknown rates", () => {
  for (const date of ["2026-10-06T00:00:00.000Z", "2026-12-31T23:59:59.999Z"]) {
    assert.equal(quoteNativeApiReference(receipt(), { at: new Date(date) }).quoteVnd, "10");
  }
  for (const value of [undefined, null, "2026-10-06", new Date(NaN), new Date("2026-10-05T23:59:59.999Z"), new Date("2027-01-01T00:00:00.000Z")]) {
    assert.throws(() => quoteNativeApiReference(receipt(), { at: value }), { code: "NATIVE_API_PRICING_OUTSIDE_VALIDITY" });
  }
});

test("wrong model and absent, normalized, contradictory or unsafe counters cannot be priced", () => {
  const bad = [null, {}, { ...receipt(), rawCountersComplete: false }, { ...receipt(), modelVersion: "gemini-3.8-pro" },
    { ...receipt(), cachedTokens: 101 }, { ...receipt(), totalTokens: 150 }, { ...receipt(), reasoningTokens: undefined },
    { ...receipt(), inputTokens: -1 }, { ...receipt(), outputTokens: 1.5 }, { ...receipt(), totalTokens: Number.MAX_SAFE_INTEGER + 1 },
    { ...receipt(), inputTokens: Number.MAX_SAFE_INTEGER, outputTokens: 1, reasoningTokens: 0, totalTokens: Number.MAX_SAFE_INTEGER },
    { rawCountersComplete: true, modelVersion: "gemini-3.8-flash", usage: { prompt_tokens: 100, completion_tokens: 80 } }];
  for (const value of bad) assert.throws(() => quote(value), { code: "NATIVE_API_PRICING_USAGE_UNVERIFIED" });
  assert.equal(quote({ ...receipt(), modelVersion: "gemini-3.8-flash-medium" }).quoteVnd, "10");
});
