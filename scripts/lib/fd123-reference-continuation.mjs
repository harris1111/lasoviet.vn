import { createHash } from "node:crypto";
import { inspectNativeAccountingEvidence } from "./prod-9router-child.mjs";
import { inspectNativeReceipt } from "./native-campaign-preflight.mjs";
import { quoteNativeApiReference } from "./native-campaign-api-pricing.mjs";
import { quoteMissingCacheReferenceUsage } from "./fd121-reference-maximum.mjs";

export const FD123_POLICY = "FD123-paid-nine-v1";
export const FD123_MODEL_BOUND_MODE = "FD123-model-bounds-v2";
export const FD123_RESERVE_VND = 33368;
export const FD123_TECHNICAL_CAP_VND = FD123_RESERVE_VND * 18;
export const FD123_SLOTS = Object.freeze(["relationship_marriage:1", "career_wealth:0", "career_wealth:1", "monthly:0", "monthly:1",
  "current_annual:0", "current_annual:1", "next_annual:0", "next_annual:1"]);
const fail = code => { throw Object.assign(new Error(code), { code }); };
export function fd123AttemptKey(slot, purpose) {
  if (!FD123_SLOTS.includes(slot) || !["report", "rewrite"].includes(purpose)) fail("FD123_SLOT_OR_PURPOSE_INVALID");
  return createHash("sha256").update(`${FD123_POLICY}:${slot}:${purpose}`).digest("hex");
}
const attemptKeys = new Set(FD123_SLOTS.flatMap(slot => ["report", "rewrite"].map(purpose => fd123AttemptKey(slot, purpose))));
export const isFd123AttemptKey = value => attemptKeys.has(value);
export const fd123RewritePrerequisite = value => {
  const slot = FD123_SLOTS.find(key => fd123AttemptKey(key, "rewrite") === value);
  return slot ? fd123AttemptKey(slot, "report") : undefined;
};

/** Accounting authorization is scoped by the immutable FD123 ledger marker.
 * Proof authenticity comes from the reviewed pinned TLS child; hashes bind its
 * observation to the request/output rather than proving authenticity themselves. */
export function quoteFd123ReferenceSettlement(settlement, trace, { at } = {}) {
  const fullBoundMode = settlement?.referenceMode === FD123_MODEL_BOUND_MODE;
  if (!settlement || Object.keys(settlement).length !== (fullBoundMode ? 4 : 3) ||
      !["receipt", "outputSha256", "accountingEvidence"].every(key => Object.hasOwn(settlement, key))) fail("FD123_REFERENCE_UNVERIFIED");
  const { receipt, outputSha256, accountingEvidence } = settlement;
  if (!receipt || Object.keys(receipt).length !== 2 || !Object.hasOwn(receipt, "modelVersion") || !Object.hasOwn(receipt, "usageMetadata")) fail("FD123_REFERENCE_UNVERIFIED");
  const proof = inspectNativeAccountingEvidence(accountingEvidence, { requestSha256: trace.requestSha256,
    outputSha256, receipt, conflictingUsage: false });
  if (!proof.completionVerified || proof.metadataRedacted || proof.conflictingUsage) fail("FD123_REFERENCE_UNVERIFIED");
  if (fullBoundMode && (!proof.envelopeComplete || !Object.hasOwn(proof.usageMetadata, "thoughtsTokenCount"))) return quoteFd123ModelBound(proof, trace, at);
  if (!proof.envelopeComplete) fail("FD123_REFERENCE_UNVERIFIED");
  const usage = structuredClone(proof.usageMetadata);
  if (Object.hasOwn(usage, "trafficType") && usage.trafficType !== "ON_DEMAND") fail("FD123_REFERENCE_UNVERIFIED");
  // Retain the original traffic tag in proof; project only the expressly
  // supported on-demand enum for the unchanged strict counter parser.
  delete usage.trafficType;
  let quote;
  if (Object.hasOwn(proof.usageMetadata, "cachedContentTokenCount")) {
    const native = inspectNativeReceipt({ modelVersion: receipt.modelVersion, usageMetadata: usage });
    quote = { ...quoteNativeApiReference(native, { at }), inputTokens: native.inputTokens,
      outputTokens: native.outputTokens, reasoningTokens: native.reasoningTokens, cachedTokensUnknown: false };
  } else {
    const maximum = quoteMissingCacheReferenceUsage(proof.modelVersion, usage, { at });
    quote = { ...maximum, quoteVnd: maximum.quoteMaximumVnd, quoteMicroVnd: maximum.quoteMaximumMicroVnd,
      snapshotSha256: maximum.pricingSnapshotSha256 };
  }
  if (quote.pricingVersion !== trace.pricingVersion || quote.snapshotSha256 !== trace.pricingSnapshotSha256 ||
      quote.inputTokens > 1048576 || quote.outputTokens > 65536 || quote.reasoningTokens > 65536 ||
      BigInt(quote.quoteVnd) > BigInt(FD123_RESERVE_VND)) fail("FD123_REFERENCE_UNVERIFIED");
  return Object.freeze({ ...quote, nativeTrafficType: proof.usageMetadata.trafficType ?? "unspecified", ownerDecision: "FD-123", providerBillingVerified: false });
}


function quoteFd123ModelBound(proof, trace, at) {
  const usage = proof.usageMetadata;
  const integer = value => Number.isSafeInteger(value) && value >= 0;
  const required = ["promptTokenCount", "candidatesTokenCount", "totalTokenCount"];
  if (required.some(key => !integer(usage[key])) || usage.promptTokenCount > 1048576 || usage.candidatesTokenCount > 65536 ||
      (Object.hasOwn(usage, "thoughtsTokenCount") && (!integer(usage.thoughtsTokenCount) || usage.thoughtsTokenCount > 65536)) ||
      (Object.hasOwn(usage, "cachedContentTokenCount") && (!integer(usage.cachedContentTokenCount) || usage.cachedContentTokenCount > usage.promptTokenCount)) ||
      (usage.toolUsePromptTokenCount !== undefined && usage.toolUsePromptTokenCount !== 0) ||
      (usage.serviceTier !== undefined && !["STANDARD", "SERVICE_TIER_UNSPECIFIED"].includes(usage.serviceTier)) ||
      (usage.trafficType !== undefined && usage.trafficType !== "ON_DEMAND")) fail("FD123_REFERENCE_UNVERIFIED");
  const minimumTotal = usage.promptTokenCount + usage.candidatesTokenCount;
  if (Object.hasOwn(usage, "thoughtsTokenCount") ? usage.totalTokenCount !== minimumTotal + usage.thoughtsTokenCount
    : usage.totalTokenCount < minimumTotal || usage.totalTokenCount > minimumTotal + 65536) fail("FD123_REFERENCE_UNVERIFIED");
  for (const [name, expected] of [["promptTokensDetails", usage.promptTokenCount], ["candidatesTokensDetails", usage.candidatesTokenCount],
    ["toolUsePromptTokensDetails", 0], ["cacheTokensDetails", usage.cachedContentTokenCount]]) {
    if (usage[name] === undefined) continue;
    const rows = usage[name];
    if (!Array.isArray(rows) || rows.some(row => row.modality !== "TEXT" || !integer(row.tokenCount))) fail("FD123_REFERENCE_UNVERIFIED");
    const sum = rows.reduce((value, row) => value + row.tokenCount, 0);
    if (!Number.isSafeInteger(sum) || (expected === undefined ? sum > usage.promptTokenCount : sum !== expected)) fail("FD123_REFERENCE_UNVERIFIED");
  }
  // This deliberately prices the verified model limits, not observed usage.
  // No absent thinking/cache counter is inferred as zero; the complete held
  // exposure remains counted even when exact/discounted usage is unknowable.
  const tokenBounds = { inputTokens: 1048576, outputTokens: 65536, reasoningTokens: 65536 };
  const maximum = quoteNativeApiReference({ rawCountersComplete: true, modelVersion: proof.modelVersion,
    ...tokenBounds, cachedTokens: 0, totalTokens: 1179648 }, { at });
  if (maximum.pricingVersion !== trace.pricingVersion || maximum.snapshotSha256 !== trace.pricingSnapshotSha256 ||
      Number(maximum.quoteVnd) !== FD123_RESERVE_VND) fail("FD123_REFERENCE_UNVERIFIED");
  return Object.freeze({ quoteKind: "owner_approved_model_bound_API_reference", accountingStatus: "api_reference_model_bound",
    referenceMode: FD123_MODEL_BOUND_MODE, quoteVnd: maximum.quoteVnd, quoteMicroVnd: maximum.quoteMicroVnd,
    pricingVersion: maximum.pricingVersion, snapshotSha256: maximum.snapshotSha256, tokenBounds,
    unknownNativeCounters: ["cachedContentTokenCount", "thoughtsTokenCount"].filter(key => !Object.hasOwn(usage, key)),
    nativeEnvelopeComplete: proof.envelopeComplete, tokensUnknown: true, actualUsageVerified: false,
    providerBillingVerified: false, exposureReduced: false, ownerDecision: "FD-123" });
}
