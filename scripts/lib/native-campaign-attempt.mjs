import { createHash } from "node:crypto";
import { inspectNativeReceipt, isNativeCampaignPreflight } from "./native-campaign-preflight.mjs";
import { nativeApiReferencePricing, quoteNativeApiReference } from "./native-campaign-api-pricing.mjs";
import { sendNativeOnce } from "./native-campaign-transport.mjs";

const fail = code => { throw Object.assign(new Error(code), { code }); };
const sha = value => typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
const record = value => value !== null && typeof value === "object" && !Array.isArray(value);
function visibleOutput(payload) {
  const native = payload.response ?? payload;
  if (!Array.isArray(native.candidates) || native.candidates.length !== 1) fail("NATIVE_CANDIDATE_UNVERIFIED");
  const candidate = native.candidates[0];
  if (candidate?.finishReason !== "STOP" || !record(candidate.content) || candidate.content.role !== "model" || !Array.isArray(candidate.content.parts) || !candidate.content.parts.length) fail("NATIVE_CANDIDATE_UNVERIFIED");
  const parts = candidate.content.parts;
  if (parts.some(part => !record(part) || typeof part.text !== "string" || Object.keys(part).some(key => !["text", "thought", "thoughtSignature"].includes(key)) || (part.thought !== undefined && typeof part.thought !== "boolean") || (part.thoughtSignature !== undefined && typeof part.thoughtSignature !== "string"))) fail("NATIVE_CANDIDATE_UNVERIFIED");
  const text = parts.filter(part => part.thought !== true).map(part => part.text).join("");
  if (!text.trim()) fail("NATIVE_CANDIDATE_UNVERIFIED");
  return text;
}

// The private caller must persist and reuse attemptKey across restarts. This
// primitive does not verify reserveVnd's token bound or authorize live traffic.
export async function runNativeCampaignAttempt(preflight, { budget, attemptKey, reserveVnd, requestImpl, now = () => new Date() } = {}) {
  if (!isNativeCampaignPreflight(preflight) || !sha(attemptKey) || !Number.isSafeInteger(reserveVnd) || reserveVnd <= 0 || !budget || ["reserveAttempt", "markDispatched", "settleAttempt"].some(key => typeof budget[key] !== "function")) fail("NATIVE_ATTEMPT_INVALID");
  function validateDispatchTime(trace) {
    const at = now();
    const pricing = nativeApiReferencePricing(at);
    nativeApiReferencePricing(new Date(at.getTime() + preflight.deadlineMs));
    if (pricing.snapshotSha256 !== trace.pricingSnapshotSha256) fail("NATIVE_ATTEMPT_PRICING_CHANGED");
    if (preflight.expiresAtMs <= at.getTime() + preflight.deadlineMs) fail("NATIVE_CREDENTIAL_EXPIRED");
  }
  let reservationId;
  const response = await sendNativeOnce(preflight, { requestImpl, now, beforeSend: trace => {
    validateDispatchTime(trace);
    // Both calls fsync under flock before the transport can construct a request.
    // Crash or failure between them keeps exposure open and blocks continuation.
    reservationId = budget.reserveAttempt("v4.2-report", reserveVnd, { attemptKey, trace });
    validateDispatchTime(trace);
    budget.markDispatched(reservationId);
    return true;
  } });
  const receipt = inspectNativeReceipt(response.body);
  const quote = quoteNativeApiReference(receipt, { at: now() });
  if (BigInt(quote.quoteVnd) > BigInt(reserveVnd)) fail("NATIVE_ATTEMPT_COST_EXCEEDS_RESERVATION");
  const outputText = visibleOutput(response.body);
  budget.settleAttempt(reservationId, { receipt, outputSha256: createHash("sha256").update(outputText).digest("hex") });
  // Only visible text reaches the private writer caller; no thought text/body is
  // persisted here. Full report quality acceptance belongs to the campaign runner.
  return Object.freeze({ attemptKey, reservationId, receipt: Object.freeze(receipt), quote, outputText });
}
