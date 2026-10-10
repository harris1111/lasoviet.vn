import { FreeReadingContentV2Schema, type FreeReadingFrozenCallV2 } from "@lasoviet/contracts";
import { prepareOpenAiCompatibleStructuredRequest } from "../ai/openai-compatible-adapter.js";
import type { GenerateStructuredRequest } from "../ai/ai-provider.js";
import { validFreeReadingCall } from "./free-reading-lineage.js";
import { buildFreeReadingPrompt } from "./free-reading-prompt.js";

// Private preparation only. An exact wire descriptor is necessary for a future proof but
// cannot authorize admission, supply token semantics or bypass quarantined native usage.
export function prepareFreeReadingOpenAiCompatibleWire(
  input: FreeReadingFrozenCallV2,
  options: { baseUrl: string; modelId: string },
) {
  const call = validFreeReadingCall(input);
  if (!call) return { kind: "refused" as const, reason: "frozen_call_invalid" as const };
  try {
    const url = new URL(options.baseUrl);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
      return { kind: "refused" as const, reason: "endpoint_invalid" as const };
    }
  } catch { return { kind: "refused" as const, reason: "endpoint_invalid" as const }; }
  const prompt = buildFreeReadingPrompt(call.source);
  const request: GenerateStructuredRequest<typeof FreeReadingContentV2Schema> = {
    schema: FreeReadingContentV2Schema, schemaName: "free_reading_v2", system: prompt.system, user: prompt.user,
    use: "production_report_generation", purpose: "free_preview", maxOutputTokens: call.maxOutputTokens,
    costContext: { purpose: "free_preview", chartVersionId: call.chartVersionId, idempotencyKey: `free-reading:${call.requestId}` },
  };
  const wire = prepareOpenAiCompatibleStructuredRequest(request, options);
  if (wire.providerId !== call.tariff.providerId || wire.modelId !== call.tariff.modelId) {
    return { kind: "refused" as const, reason: "provider_model_mismatch" as const };
  }
  const expectedWire = { endpoint: wire.endpoint, providerId: wire.providerId, modelId: wire.modelId,
    serializerVersion: wire.serializerVersion, bodySha256: wire.bodySha256 };
  return Object.freeze({ kind: "prepared_unproven" as const, tokenBoundProof: null,
    wire, request: Object.freeze({ ...request, costContext: Object.freeze(request.costContext!),
      expectedWire: Object.freeze(expectedWire) }),
  });
}
