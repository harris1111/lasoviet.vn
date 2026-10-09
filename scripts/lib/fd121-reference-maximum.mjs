import { nativeApiReferencePricing } from "./native-campaign-api-pricing.mjs";

const fail = code => { throw Object.assign(new Error(code), { code }); };
const count = value => Number.isSafeInteger(value) && value >= 0;
const fields = ["promptTokenCount", "candidatesTokenCount", "thoughtsTokenCount", "totalTokenCount"];
const allowed = new Set([...fields, "cachedContentTokenCount", "toolUsePromptTokenCount", "promptTokensDetails",
  "cacheTokensDetails", "candidatesTokensDetails", "toolUsePromptTokensDetails", "serviceTier"]);

/** Preparation only: no transport, ledger settlement, recovery or continuation.
 * This requires a trustworthy COMPLETE original native response. Selected-counter
 * diagnostics cannot exclude additional usage and are deliberately insufficient. */
export function prepareFd121ReferenceMaximum(payload, { httpStatus, at } = {}) {
  const pricing = nativeApiReferencePricing(at);
  if (httpStatus !== 200 || !payload || typeof payload !== "object" || Array.isArray(payload) ||
      (payload.response && payload.usageMetadata !== undefined)) fail("FD121_NATIVE_RECEIPT_UNVERIFIED");
  const native = payload.response ?? payload, usage = native?.usageMetadata;
  if (!["gemini-3.8-flash", "gemini-3.8-flash-medium"].includes(native?.modelVersion) || !usage || typeof usage !== "object" ||
      Array.isArray(usage) || fields.some(key => !count(usage[key])) || Object.keys(usage).some(key => !allowed.has(key)) ||
      Object.hasOwn(usage, "cachedContentTokenCount") || usage.cacheTokensDetails !== undefined ||
      (usage.toolUsePromptTokenCount !== undefined && usage.toolUsePromptTokenCount !== 0) ||
      (usage.serviceTier !== undefined && !["STANDARD", "SERVICE_TIER_UNSPECIFIED"].includes(usage.serviceTier))) fail("FD121_NATIVE_RECEIPT_UNVERIFIED");
  const [input, output, reasoning, total] = fields.map(key => usage[key]);
  if (!Number.isSafeInteger(input + output + reasoning) || total !== input + output + reasoning ||
      input > 1048576 || output > 65536 || reasoning > 65536) fail("FD121_NATIVE_RECEIPT_UNVERIFIED");
  for (const [name, expected] of [["promptTokensDetails", input], ["candidatesTokensDetails", output], ["toolUsePromptTokensDetails", 0]]) {
    if (usage[name] === undefined) continue;
    const rows = usage[name];
    if (!Array.isArray(rows) || rows.length > 1 || rows.some(row => !row || typeof row !== "object" ||
        Object.keys(row).some(key => !["modality", "tokenCount"].includes(key)) || row.modality !== "TEXT" || !count(row.tokenCount)) ||
        rows.reduce((sum, row) => sum + row.tokenCount, 0) !== expected) fail("FD121_NATIVE_RECEIPT_UNVERIFIED");
  }
  const candidate = native.candidates?.[0];
  if (native.candidates?.length !== 1 || candidate?.finishReason !== "STOP" || candidate.content?.role !== "model" ||
      !Array.isArray(candidate.content.parts) || candidate.content.parts.some(part => !part || typeof part !== "object" ||
        typeof part.text !== "string" || Object.keys(part).some(key => !["text", "thought", "thoughtSignature"].includes(key)) ||
        (part.thought !== undefined && typeof part.thought !== "boolean") || (part.thoughtSignature !== undefined && typeof part.thoughtSignature !== "string")) ||
      !candidate.content.parts.filter(part => part.thought !== true).map(part => part.text).join("").trim()) fail("FD121_NATIVE_RECEIPT_UNVERIFIED");
  // Every input token is charged at the uncached rate, irrespective of the
  // unknown discount. No cached-token value is invented or persisted as zero.
  const numerator = BigInt(input) * 391650n + (BigInt(output) + BigInt(reasoning)) * 1958250n;
  const maximumMicroVnd = (numerator + 19n) / 20n;
  return Object.freeze({ receiptKind: "fd121.reference-maximum.v1", accountingStatus: "api_reference_upper_bound",
    modelVersion: native.modelVersion, inputTokens: input, outputTokens: output, reasoningTokens: reasoning, totalTokens: total,
    cachedTokensUnknown: true, cachedCounterPresent: false, pricingVersion: pricing.version,
    pricingSnapshotSha256: pricing.snapshotSha256, quoteMaximumMicroVnd: String(maximumMicroVnd),
    quoteMaximumVnd: String((maximumMicroVnd + 999999n) / 1000000n), providerBillingVerified: false,
    executionReady: false, ledgerSettlementAuthorized: false, continuationAuthorized: false });
}
