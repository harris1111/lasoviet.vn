import assert from "node:assert/strict";
import { test } from "node:test";
import { buildNativeCampaignPreflight, inspectNativeReceipt, NATIVE_CAMPAIGN_ENDPOINT } from "./lib/native-campaign-preflight.mjs";

import { quoteNativeApiReference } from "./lib/native-campaign-api-pricing.mjs";

const at = new Date("2026-10-06T08:00:00Z");
const base = { system: "synthetic system", user: "synthetic user", maxOutputTokens: 9_000, now: () => at, credential: { accessToken: "synthetic-token", projectId: "synthetic-project", expiresAt: "2026-10-07T08:00:00Z" } };
const raw = () => ({ response: { modelVersion: "gemini-3.8-flash", usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 50, cachedContentTokenCount: 20, thoughtsTokenCount: 30, totalTokenCount: 180 } } });

test("source-pinned medium builder is text-only, explicit about floor, and never execution-ready", () => {
  const value = buildNativeCampaignPreflight(base); const body = JSON.parse(value.body);
  assert.equal(value.endpoint, NATIVE_CAMPAIGN_ENDPOINT); assert.equal(body.model, "gemini-3.8-flash-medium");
  assert.deepEqual(body.request.generationConfig.thinkingConfig, { thinkingLevel: "medium", includeThoughts: true });
  assert.equal(value.trace.effectiveMaxOutputTokens, 16_384); assert.equal(body.request.generationConfig.maxOutputTokens, 16_384);
  assert.equal(value.executionReady, false); assert.deepEqual(value.blockers, ["private_route_thinking_output_bound_unverified"]);
  assert.equal(value.pricing.basis, "owner_approved_api_reference"); assert.equal(value.trace.pricingVersion, value.pricing.version);
  assert.equal(body.request.tools, undefined); assert.equal(body.request.cachedContent, undefined);
  assert.match(value.trace.requestSha256, /^[a-f0-9]{64}$/); assert.match(body.requestId, /^agent\/[^/]+\/1791273600000\/[^/]+\/1$/);
  assert.ok(!JSON.stringify(value.trace).includes("synthetic-token")); assert.ok(!JSON.stringify(value.trace).includes("synthetic-project"));
  assert.ok(!JSON.stringify(value.trace).includes("synthetic user")); assert.ok(Object.isFrozen(value)); assert.ok(Object.isFrozen(value.headers));
});

test("missing/expired credential and project fail before transport", () => {
  for (const credential of [null, {}, { ...base.credential, projectId: "" }, { ...base.credential, expiresAt: at.toISOString() }, { ...base.credential, accessToken: "secret\nheader" }]) {
    assert.throws(() => buildNativeCampaignPreflight({ ...base, credential }), error => error.code.startsWith("NATIVE_CREDENTIAL_"));
  }
  for (const maxOutputTokens of [0, -1, 64_001, NaN, 1.5]) assert.throws(() => buildNativeCampaignPreflight({ ...base, maxOutputTokens }), { code: "NATIVE_PREFLIGHT_INVALID_REQUEST" });
});

test("native counters remain separate without thoughts being added to input/output", () => {
  const receipt = inspectNativeReceipt(raw());
  assert.deepEqual(receipt, { rawCountersComplete: true, accountingStatus: "unverified", modelVersion: "gemini-3.8-flash", inputTokens: 100, outputTokens: 50, cachedTokens: 20, reasoningTokens: 30, totalTokens: 180 });
  const quote = quoteNativeApiReference(receipt, { at });
  assert.equal(quote.quoteMicroVnd, "9438765"); assert.equal(quote.quoteVnd, "10");
  assert.equal(quote.executionReady, false); assert.equal(quote.accountingStatus, "api_reference");
});

test("absent native counters preserve absence and never become an authoritative zero", () => {
  for (const key of Object.keys(raw().response.usageMetadata)) {
    const value = raw(); delete value.response.usageMetadata[key];
    const result = inspectNativeReceipt(value); assert.equal(result.rawCountersComplete, false); assert.equal(result.counterPresence[key], false);
    assert.throws(() => quoteNativeApiReference(result, { at }), { code: "NATIVE_API_PRICING_USAGE_UNVERIFIED" });
  }
});

test("complete-looking normalized usage, wrong model, contradictory/unsafe/new dimensions fail closed", () => {
  assert.equal(inspectNativeReceipt({ modelVersion: "gemini-3.8-flash", usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 } }).rawCountersComplete, false);
  for (const change of [u => { u.totalTokenCount = 150; }, u => { u.cachedContentTokenCount = 101; }, u => { u.thoughtsTokenCount = -1; }, u => { u.promptTokenCount = "100"; }, u => { u.toolUsePromptTokenCount = 1; }, u => { u.newBillingCounter = 1; }, u => { u.serviceTier = "PRIORITY"; }, u => { u.promptTokensDetails = [{ modality: "AUDIO", tokenCount: 100 }]; }, u => { u.promptTokensDetails = [{ modality: "TEXT", tokenCount: 99 }]; }, u => { u.totalTokenCount = Number.MAX_SAFE_INTEGER + 1; }]) {
    const value = raw(); change(value.response.usageMetadata); assert.equal(inspectNativeReceipt(value).rawCountersComplete, false);
  }
  const wrong = raw(); wrong.response.modelVersion = "gemini-3.7-flash"; assert.equal(inspectNativeReceipt(wrong).rawCountersComplete, false);
  const ambiguous = raw(); ambiguous.usageMetadata = ambiguous.response.usageMetadata; assert.equal(inspectNativeReceipt(ambiguous).rawCountersComplete, false);
});

test("preflight rejects a deadline crossing the API tariff expiry", () => {
  assert.throws(() => buildNativeCampaignPreflight({ ...base, now: () => new Date("2026-12-31T23:59:30Z"), credential: { ...base.credential, expiresAt: "2027-01-02T00:00:00Z" } }), { code: "NATIVE_API_PRICING_OUTSIDE_VALIDITY" });
});
