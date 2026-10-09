import { createHash } from "node:crypto";
import {
  FreeReadingCandidateV2Schema, FreeReadingContentV2Schema, FreeReadingFactsV2Schema,
  validateFreeReadingReferences, z, type FreeReadingCandidateV2, type FreeReadingFactsV2,
} from "@lasoviet/contracts";
import { calculateTokenCostMicroVnd, type AiCostRecorder, type CompleteAttemptInput } from "../ai/ai-cost.js";
import type { AiProvider } from "../ai/ai-provider.js";
import type { FreeAiAttemptSettlement } from "./free-ai-settlement.service.js";
import { buildFreeReadingPrompt } from "./free-reading-prompt.js";
import { compileFreeReadingFallback } from "./free-reading-fallback.js";
import { checkFreeReadingQuality } from "./free-reading-quality.js";

const integer = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const TariffSchema = z.object({
  id: z.string().uuid(), pricingVersion: z.string().min(1),
  providerId: z.string().min(1), modelId: z.string().min(1),
  inputPricePerMillion: integer, outputPricePerMillion: integer, cachedInputPricePerMillion: integer,
}).strict();
const FrozenCallSchema = z.object({
  version: z.literal(2), requestId: z.string().min(1), chartVersionId: z.string().min(1),
  source: FreeReadingFactsV2Schema, sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
  serializedPrompt: z.string().min(1), tariff: TariffSchema,
  maxOutputTokens: z.literal(10_000),
}).strict();
export type FreeReadingFrozenCallV2 = z.infer<typeof FrozenCallSchema>;
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

/** Private preparation only. Durable chart/day admission and native bound proof precede dispatch. */
export function freezeFreeReadingCall(input: {
  requestId: string; chartVersionId: string; source: FreeReadingFactsV2;
  tariff: z.infer<typeof TariffSchema>;
}): FreeReadingFrozenCallV2 {
  const source = FreeReadingFactsV2Schema.parse(input.source);
  return FrozenCallSchema.parse({ ...input, source, version: 2, sourceHash: hash(source),
    serializedPrompt: JSON.stringify(buildFreeReadingPrompt(source)), maxOutputTokens: 10_000 });
}

export type FreeReadingWriterOutcome = {
  settlement: FreeAiAttemptSettlement;
  candidate?: FreeReadingCandidateV2;
  diagnostic: string;
};
type Receipt = { input: CompleteAttemptInput; actual: bigint; clean: boolean };
const failure = (message: string) => ({ ok: false as const, error: {
  code: "AI_COST_RECORDING_FAILED" as const, retryable: false, message,
} });

// Claim the one begin synchronously, before awaiting persistence. A provider configured
// with retries still cannot obtain a second send authorization through this recorder.
function singleAttemptRecorder(inner: AiCostRecorder, call: FreeReadingFrozenCallV2, key: string) {
  let claimed = false, begun = false, completed = false, protocolError = false;
  let attemptId: string | null = null, receipt: Receipt | null = null;
  const recorder: AiCostRecorder = {
    async beginAttempt(input) {
      if (claimed) { protocolError = true; return failure("Second attempt refused"); }
      claimed = true;
      if (input.purpose !== "free_preview" || input.providerId !== call.tariff.providerId ||
          input.requestedModelId !== call.tariff.modelId || input.maxOutputTokens !== call.maxOutputTokens ||
          input.idempotencyKey !== key || input.costContext?.idempotencyKey !== key ||
          input.costContext?.chartVersionId !== call.chartVersionId || input.costContext?.purpose !== "free_preview") {
        return failure("Frozen request context mismatch");
      }
      const result = await inner.beginAttempt(input);
      if (!result.ok) return result;
      const p = result.value.pricing, t = call.tariff;
      if (p.id !== t.id || p.pricingVersion !== t.pricingVersion || p.providerId !== t.providerId ||
          p.modelId !== t.modelId || p.currency !== "VND" || p.status !== "active" ||
          p.inputPricePerMillion !== t.inputPricePerMillion || p.outputPricePerMillion !== t.outputPricePerMillion ||
          p.cachedInputPricePerMillion !== t.cachedInputPricePerMillion) {
        // No send is authorized. Close the persisted attempt at zero, without accepting a new tariff.
        await inner.completeAttempt({ attemptId: result.value.attemptId, errorCode: "AI_PROVIDER_NOT_APPROVED",
          inputTokens: 0, outputTokens: 0, cachedTokens: 0, totalTokens: 0 });
        return failure("Frozen tariff mismatch");
      }
      attemptId = result.value.attemptId;
      begun = true;
      return result;
    },
    async completeAttempt(input) {
      if (!begun || completed || input.attemptId !== attemptId) {
        protocolError = true; return failure("Unexpected or repeated outcome");
      }
      completed = true;
      const validCount = (n: number | undefined): n is number => n !== undefined && Number.isSafeInteger(n) && n >= 0;
      const known = input.tokensUnknown !== true && validCount(input.inputTokens) && validCount(input.outputTokens) &&
        validCount(input.cachedTokens) && validCount(input.totalTokens) && input.cachedTokens <= input.inputTokens &&
        Number.isSafeInteger(input.inputTokens + input.outputTokens) &&
        input.totalTokens === input.inputTokens + input.outputTokens && input.responseModelId === call.tariff.modelId;
      // Malformed counters must persist as unknown exposure, never be silently clamped into a bill.
      const captured = known ? input : { attemptId: input.attemptId, responseModelId: input.responseModelId,
        httpStatus: input.httpStatus, errorCode: input.errorCode, invalidOutputReason: input.invalidOutputReason, tokensUnknown: true };
      const result = await inner.completeAttempt(captured);
      if (result.ok && known) {
        const actual = calculateTokenCostMicroVnd({ inputTokens: input.inputTokens!, outputTokens: input.outputTokens!,
          cachedTokens: input.cachedTokens!, ...call.tariff });
        if (result.value.costStatus === "resolved" && result.value.costMicroVnd === actual.toString()) {
          receipt = { input: structuredClone(input), actual,
            clean: !input.errorCode && !input.invalidOutputReason && input.httpStatus !== undefined &&
              input.httpStatus >= 200 && input.httpStatus < 300 };
        }
      }
      return result;
    },
  };
  return { recorder, snapshot: () => ({ begun, receipt, protocolError }) };
}

function candidate(call: FreeReadingFrozenCallV2, ai?: unknown): FreeReadingCandidateV2 {
  const fallback = compileFreeReadingFallback(call.source);
  if (!checkFreeReadingQuality({ content: fallback, source: call.source }).ok) throw new Error("RULE_FALLBACK_INVALID");
  let content = structuredClone(fallback);
  const sections: FreeReadingCandidateV2["sections"] = { overview: "rule_v2", focusPalace: "rule_v2",
    teasers: fallback.teasers.map(t => ({ targetKey: t.targetKey, status: "rule_v2" })), yearHook: "rule_v2" };
  const validated = validateFreeReadingReferences(ai, call.source);
  if (validated.ok) {
    const hard = checkFreeReadingQuality({ content: validated.content, source: call.source }).findings.filter(f => f.hard);
    const recognized = hard.every(f => /^(overview(?:\.|$)|focus\.|teaser\.\d+(?:\.|$)|yearHook(?:\.|$))/u.test(f.block));
    if (recognized) {
      const has = (prefix: string) => hard.some(f => f.block === prefix || f.block.startsWith(`${prefix}.`));
      if (!has("overview")) { content.overview = validated.content.overview; sections.overview = "ai"; }
      if (!has("focus")) { content.focusPalace = validated.content.focusPalace; sections.focusPalace = "ai"; }
      content.teasers = fallback.teasers.map(t => {
        const i = validated.content.teasers.findIndex(item => item.targetKey === t.targetKey);
        if (has(`teaser.${i}`)) return t;
        sections.teasers.find(item => item.targetKey === t.targetKey)!.status = "ai";
        return validated.content.teasers[i]!;
      });
      if (!has("yearHook")) { content.yearHook = validated.content.yearHook; sections.yearHook = "ai"; }
      if (!checkFreeReadingQuality({ content, source: call.source }).ok || !validateFreeReadingReferences(content, call.source).ok) {
        return candidate(call);
      }
    }
  }
  // Draft cards and lexical checks cannot establish semantic acceptance or authorize public release.
  return FreeReadingCandidateV2Schema.parse({ version: 2, status: "draft", manualAccepted: false,
    locale: call.source.locale, content, sections, versions: buildFreeReadingPrompt(call.source).versions });
}

export function createFreeReadingWriter(deps: {
  expected: { provider: string; model: string };
  createProvider: (recorder: AiCostRecorder) => AiProvider;
  costRecorder: AiCostRecorder;
}) {
  return {
    async run(input: FreeReadingFrozenCallV2): Promise<FreeReadingWriterOutcome> {
      const unsent = (diagnostic: string): FreeReadingWriterOutcome => ({
        settlement: { kind: "resolved", actualMicroVnd: 0n, disposition: "failed" }, diagnostic });
      const parsed = FrozenCallSchema.safeParse(input);
      if (!parsed.success) return unsent("frozen_call_invalid");
      const call = parsed.data;
      let prompt: ReturnType<typeof buildFreeReadingPrompt>;
      try { prompt = buildFreeReadingPrompt(call.source); } catch { return unsent("frozen_source_invalid"); }
      if (hash(call.source) !== call.sourceHash || JSON.stringify(prompt) !== call.serializedPrompt) {
        return unsent("frozen_prompt_invalid");
      }
      if (call.tariff.providerId !== deps.expected.provider || call.tariff.modelId !== deps.expected.model) {
        return unsent("provider_model_mismatch");
      }
      let rule: FreeReadingCandidateV2;
      try { rule = candidate(call); } catch { return unsent("fallback_unavailable"); }
      const key = `free-reading:${call.requestId}`;
      const attempt = singleAttemptRecorder(deps.costRecorder, call, key);
      let result: Awaited<ReturnType<AiProvider["generateStructured"]>> | null = null;
      try {
        result = await deps.createProvider(attempt.recorder).generateStructured({
          schema: FreeReadingContentV2Schema, schemaName: "free_reading_v2", system: prompt.system, user: prompt.user,
          use: "production_report_generation", purpose: "free_preview", maxOutputTokens: call.maxOutputTokens,
          costContext: { purpose: "free_preview", chartVersionId: call.chartVersionId, idempotencyKey: key },
        });
      } catch { result = null; }
      const seen = attempt.snapshot();
      if (!seen.begun) return { ...unsent("refused_before_send"), candidate: rule };
      if (!seen.receipt) return { settlement: { kind: "unknown" }, candidate: rule, diagnostic: "usage_unknown" };
      const cost = seen.receipt.actual;
      const eligible = !seen.protocolError && seen.receipt.clean && cost <= 3_000_000_000n &&
        seen.receipt.input.inputTokens! <= 16_000 && seen.receipt.input.outputTokens! <= call.maxOutputTokens &&
        result?.ok === true && result.value.providerId === deps.expected.provider && result.value.modelId === deps.expected.model;
      const view = eligible && result?.ok === true ? candidate(call, result.value.value) : rule;
      const usedAi = view.sections.overview === "ai" || view.sections.focusPalace === "ai" ||
        view.sections.teasers.some(t => t.status === "ai") || (view.sections.yearHook === "ai" && view.content.yearHook !== null);
      return { settlement: { kind: "resolved", actualMicroVnd: cost, disposition: usedAi ? "publishable" : "failed" },
        candidate: view, diagnostic: usedAi ? "draft_candidate" : "rule_fallback" };
    },
  };
}
