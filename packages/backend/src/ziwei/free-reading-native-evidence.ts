// Private offline diagnostics only. No caller-supplied metadata can mint a proof.
const counters = ["promptTokenCount", "candidatesTokenCount", "cachedContentTokenCount", "thoughtsTokenCount", "totalTokenCount"] as const;
const modules = ["serializer", "executor", "thinking", "usage", "transport"] as const;
const model = "gemini-3.8-flash-medium";
const endpoint = "https://daily-cloudcode-pa.googleapis.com/v1internal:generateContent";
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
const closed = (value: unknown, keys: readonly string[]): value is Record<string, unknown> => object(value) && Object.keys(value).every(key => keys.includes(key));
const sha = (value: unknown): value is string => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const integer = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;

export interface FreeReadingNativeExpectedPins {
  clientRequestSha256: string;
  nativeRequestSha256: string;
  visibleOutputSha256: string;
  imageSha256: string;
  moduleSha256: Record<typeof modules[number], string>;
}

function inspectUsage(input: unknown, expected: FreeReadingNativeExpectedPins) {
  const presence = Object.fromEntries(counters.map(key => [key, object(input) && object(input.usageMetadata) && Object.hasOwn(input.usageMetadata, key)]));
  const unknown = (reason: string) => ({ kind: "unknown_usage" as const, reason, counterPresence: presence });
  if (!closed(input, ["requestSha256", "responseSha256", "visibleOutputSha256", "modelVersion", "finishReason", "candidateCount", "usageMetadata"])) return unknown("envelope_invalid");
  if (!sha(expected.nativeRequestSha256) || !sha(expected.visibleOutputSha256) || input.requestSha256 !== expected.nativeRequestSha256 ||
      input.visibleOutputSha256 !== expected.visibleOutputSha256 || !sha(input.responseSha256)) return unknown("hash_mismatch");
  if (!["gemini-3.8-flash", model].includes(input.modelVersion as string) || input.finishReason !== "STOP" || input.candidateCount !== 1) return unknown("completion_or_model_mismatch");
  const usage = input.usageMetadata;
  if (!closed(usage, [...counters, "toolUsePromptTokenCount", "promptTokensDetails", "cacheTokensDetails", "candidatesTokensDetails", "toolUsePromptTokensDetails", "serviceTier", "trafficType"])) return unknown("usage_fields_invalid");
  if (counters.some(key => !Object.hasOwn(usage, key) || !integer(usage[key]))) return unknown("counter_missing_or_invalid");
  const inputTokens = usage.promptTokenCount as number, candidateTokens = usage.candidatesTokenCount as number;
  const cachedTokens = usage.cachedContentTokenCount as number, thinkingTokens = usage.thoughtsTokenCount as number, totalTokens = usage.totalTokenCount as number;
  const billableOutputTokens = candidateTokens + thinkingTokens;
  if (cachedTokens > inputTokens || !Number.isSafeInteger(billableOutputTokens) || !Number.isSafeInteger(inputTokens + billableOutputTokens) || totalTokens !== inputTokens + billableOutputTokens) return unknown("counter_contradiction");
  if ((Object.hasOwn(usage, "toolUsePromptTokenCount") && usage.toolUsePromptTokenCount !== 0) ||
      (Object.hasOwn(usage, "serviceTier") && !["STANDARD", "SERVICE_TIER_UNSPECIFIED"].includes(usage.serviceTier as string)) ||
      (Object.hasOwn(usage, "trafficType") && usage.trafficType !== "ON_DEMAND")) return unknown("unsupported_billing_dimension");
  for (const [key, count] of [["promptTokensDetails", inputTokens], ["cacheTokensDetails", cachedTokens], ["candidatesTokensDetails", candidateTokens], ["toolUsePromptTokensDetails", 0]] as const) {
    if (!Object.hasOwn(usage, key)) continue;
    const details = usage[key];
    if (!Array.isArray(details) || details.length > 1 || details.some(row => !closed(row, ["modality", "tokenCount"]) || row.modality !== "TEXT" || !integer(row.tokenCount)) ||
        details.reduce((sum: number, row: { tokenCount: number }) => sum + row.tokenCount, 0) !== count) return unknown("modality_details_invalid");
  }
  return { kind: "complete_unverified" as const, counterPresence: presence, inputTokens, candidateTokens, cachedTokens, thinkingTokens, billableOutputTokens, totalTokens,
    inputWithinRequestedLimit: inputTokens <= 16000, outputWithinRequestedLimit: billableOutputTokens <= 10000 };
}

export function inspectFreeReadingNativeEvidence(input: unknown, expected: FreeReadingNativeExpectedPins) {
  const reasons: string[] = ["input_enforcement_unproven", "output_thinking_enforcement_unproven", "single_physical_send_unproven"];
  const envelopeValid = closed(input, ["wire", "receipt", "singlePhysicalCallBoundProof"]);
  const wire = envelopeValid ? input.wire : undefined;
  const wireValid = closed(wire, ["clientRequestSha256", "nativeRequestSha256", "imageSha256", "moduleSha256", "model", "endpoint", "requestedOutputTokens", "effectiveOutputTokens", "thinkingLevel", "includeThoughts", "retryCapable"]);
  if (!envelopeValid || !wireValid) reasons.push("wire_envelope_invalid");
  else {
    if (!["clientRequestSha256", "nativeRequestSha256", "imageSha256"].every(key => sha(wire[key]) && sha(expected[key as keyof FreeReadingNativeExpectedPins]) && wire[key] === expected[key as keyof FreeReadingNativeExpectedPins]) ||
        !closed(wire.moduleSha256, modules) || modules.some(key => !Object.hasOwn(wire.moduleSha256 as object, key) || !sha((wire.moduleSha256 as Record<string, unknown>)[key]) || !sha(expected.moduleSha256[key]) || (wire.moduleSha256 as Record<string, unknown>)[key] !== expected.moduleSha256[key])) reasons.push("wire_pins_mismatch");
    if (wire.model !== model || wire.endpoint !== endpoint) reasons.push("native_destination_or_model_mismatch");
    if (wire.requestedOutputTokens !== 10000 || !integer(wire.effectiveOutputTokens) || wire.effectiveOutputTokens !== 10000) reasons.push("native_output_limit_drift");
    if (wire.thinkingLevel !== "medium" || wire.includeThoughts !== true) reasons.push("thinking_configuration_mismatch");
    if (wire.retryCapable !== false) reasons.push("retry_capable_or_unknown_transport");
  }
  if (envelopeValid && Object.hasOwn(input, "singlePhysicalCallBoundProof")) reasons.push("caller_send_claim_untrusted");
  return { kind: "prepared_unproven" as const, boundStatus: "unproven_bound" as const, executionReady: false as const,
    tokenBoundProof: null, singlePhysicalCallBoundProof: null, settlementAuthorized: false as const,
    reasons, usage: inspectUsage(envelopeValid ? input.receipt : undefined, expected) };
}
