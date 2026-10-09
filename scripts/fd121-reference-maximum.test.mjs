import assert from "node:assert/strict";
import { test } from "node:test";
import { prepareFd121ReferenceMaximum } from "./lib/fd121-reference-maximum.mjs";
import { inspectNativeReceipt } from "./lib/native-campaign-preflight.mjs";

const at = new Date("2026-10-09T12:00:00Z");
const response = () => ({ response: { modelVersion: "gemini-3.8-flash", usageMetadata: {
  promptTokenCount: 8143, candidatesTokenCount: 3253, thoughtsTokenCount: 1951, totalTokenCount: 13347,
}, candidates: [{ finishReason: "STOP", content: { role: "model", parts: [{ text: "SYNTHETIC_PRIVATE_THOUGHT", thought: true }, { text: '{"synthetic":true}' }] } }] } });
const prepare = value => prepareFd121ReferenceMaximum(value, { httpStatus: 200, at });
test("FD121 preparation proves a conservative maximum without inventing cache zero or releasing funds", () => {
  const value = response(), maximum = prepare(value);
  assert.equal(maximum.quoteMaximumVnd, "669"); assert.equal(maximum.cachedTokensUnknown, true);
  assert.equal(Object.hasOwn(maximum, "cachedTokens"), false); assert.equal(maximum.accountingStatus, "api_reference_upper_bound");
  assert.equal(maximum.ledgerSettlementAuthorized, false); assert.equal(maximum.continuationAuthorized, false);
  assert.equal(inspectNativeReceipt(value).rawCountersComplete, false);
  assert.ok(!JSON.stringify(maximum).includes("SYNTHETIC_PRIVATE_THOUGHT"));
});
test("selected diagnostics, missing billable counters and noncompleted responses are insufficient", () => {
  assert.throws(() => prepare({ modelVersion: "gemini-3.8-flash", usageMetadata: response().response.usageMetadata }), { code: "FD121_NATIVE_RECEIPT_UNVERIFIED" });
  for (const key of ["promptTokenCount", "candidatesTokenCount", "thoughtsTokenCount", "totalTokenCount"]) {
    const value = response(); delete value.response.usageMetadata[key]; assert.throws(() => prepare(value));
  }
  const value = response(); value.response.candidates[0].finishReason = "MAX_TOKENS"; assert.throws(() => prepare(value));
});
test("tier, tool, extra usage, modality and conflicting metadata remain hard stops", () => {
  for (const extra of [{ serviceTier: "PRIORITY" }, { toolUsePromptTokenCount: 1 }, { extraFeeTokens: 1 },
    { cacheTokensDetails: [] }, { promptTokensDetails: [{ modality: "IMAGE", tokenCount: 8143 }] }, { cachedContentTokenCount: 0 }]) {
    const value = response(); Object.assign(value.response.usageMetadata, extra); assert.throws(() => prepare(value));
  }
  const value = response(); value.usageMetadata = {}; assert.throws(() => prepare(value));
});
