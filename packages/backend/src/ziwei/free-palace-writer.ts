import {
  FreePalaceGiftContentV1Schema,
  FreePalaceGiftFactV1Schema,
  FreePalaceGiftViewV1Schema,
  PalaceIdSchema,
  z,
  type FreePalaceGiftContentV1,
  type FreePalaceGiftFactV1,
  type FreePalaceGiftFrozenCallV1,
} from "@lasoviet/contracts";
import type { AiProvider } from "../ai/ai-provider.js";
import type { AiCostRecorder, CompleteAttemptInput } from "../ai/ai-cost.js";
import type { FreeAiAttemptSettlement } from "./free-ai-settlement.service.js";
import { freePalaceContentHash } from "./free-palace-artifact.repository.js";
import { FREE_PALACE_QUALITY_VERSION, validateFreePalaceGift } from "./free-palace-quality.js";

export const FREE_PALACE_PROMPT_VERSION = "free-palace-gift-prompt-v1";
export const FREE_PALACE_SCHEMA_VERSION = "free-palace-gift-v1";
export const FREE_PALACE_RULES_VERSION = FREE_PALACE_QUALITY_VERSION;
export const FREE_PALACE_SCHEMA_NAME = "free_palace_gift_v1";

export type FreePalacePromptInput = Readonly<{
  locale: "vi" | "en";
  palaceId: z.infer<typeof PalaceIdSchema>;
  palaceLabel: string;
  facts: ReadonlyArray<FreePalaceGiftFactV1>;
  concern: string | null;
}>;

// The serialized, frozen request. It carries the authorized facts so the writer needs nothing
// but the frozen call, and the publication step reuses exactly these facts.
const FrozenPromptSchema = z.object({
  v: z.literal(1), locale: z.enum(["vi", "en"]), palaceId: PalaceIdSchema, schemaName: z.string().min(1),
  system: z.string().min(1), user: z.string().min(1), facts: FreePalaceGiftFactV1Schema.array().min(1).max(64),
}).strict();
export type FreePalaceFrozenPrompt = z.infer<typeof FrozenPromptSchema>;

const RULES: Record<"vi" | "en", string> = {
  vi: [
    "Bạn viết một bài đọc ngắn, ấm áp và cụ thể về MỘT cung duy nhất của lá số Tử Vi cho người đọc là người mới.",
    "Chỉ dùng các dữ kiện được cung cấp, mỗi ý quan trọng phải dẫn chiếu evidenceKeys lấy từ danh sách dữ kiện.",
    "Không nhắc năm, ngày, tháng hay độ tuổi cụ thể. Không nói về bệnh tật, sức khỏe, cái chết, cúng bái giải hạn, xổ số hay cờ bạc.",
    "Không dùng chữ Hán, không dùng mã định danh kỹ thuật, không chia tiêu đề nhỏ trong phần diễn giải.",
    "Không hứa hẹn kết quả. Cuối bài có phần Nên làm và Nên tránh, mỗi mục là hành động đời thường.",
    "Chỉ trả về một đối tượng JSON đúng lược đồ.",
  ].join(" "),
  en: [
    "You write one short, warm, concrete reading about ONE palace of a Zi Wei Dou Shu chart for a beginner.",
    "Use only the supplied facts, and cite evidenceKeys taken from the facts list for every important point.",
    "Do not mention specific years, dates, months or ages. Do not discuss illness, health, death, ritual remedies, lottery or gambling.",
    "No Han characters, no technical identifiers, no sub-headings inside the narrative.",
    "Promise no outcomes. End with Do and Avoid items that are everyday actions.",
    "Return exactly one JSON object that matches the schema.",
  ].join(" "),
};

export function buildFreePalacePrompt(input: FreePalacePromptInput): FreePalaceFrozenPrompt {
  const factLines = input.facts.map((fact) => `[${fact.key}] ${fact.label}: ${fact.value}`).join("\n");
  const focus = input.concern ? `Chủ đề người đọc quan tâm: ${input.concern}\n` : "";
  return FrozenPromptSchema.parse({
    v: 1, locale: input.locale, palaceId: input.palaceId, schemaName: FREE_PALACE_SCHEMA_NAME, system: RULES[input.locale],
    user: `${focus}Cung được chọn: ${input.palaceLabel} (palaceId=${input.palaceId})\nDữ kiện được phép dùng:\n${factLines}`,
    facts: input.facts,
  });
}
export const serializeFreePalacePrompt = (prompt: FreePalaceFrozenPrompt): string => JSON.stringify(FrozenPromptSchema.parse(prompt));
export function parseFreePalacePrompt(serialized: string): FreePalaceFrozenPrompt | null {
  try {
    const parsed = FrozenPromptSchema.safeParse(JSON.parse(serialized));
    return parsed.success ? parsed.data : null;
  } catch { return null; }
}

// Wraps the real cost recorder for exactly ONE physical attempt. A second begin is refused (a
// misconfigured retrying adapter still cannot send twice), only `free_preview` is accepted
// (never the synthetic probe's pricing bypass), and the reserved tariff snapshot is verified
// before any request leaves the process. It also captures usage even when the output is invalid,
// because invalid output is still billed.
export function createFreePalaceAttemptRecorder(inner: AiCostRecorder, reservedPricingSnapshotId: string) {
  const state: { begun: number; refused: string | null; completed: CompleteAttemptInput | null } = { begun: 0, refused: null, completed: null };
  const recorder: AiCostRecorder = {
    async beginAttempt(input) {
      const refuse = (message: string, code: "AI_PROVIDER_NOT_APPROVED" | "AI_COST_RECORDING_FAILED") => {
        state.refused ??= message;
        return { ok: false as const, error: { code, retryable: false, message } };
      };
      if (state.begun >= 1) return refuse("second physical attempt refused", "AI_COST_RECORDING_FAILED");
      if (input.purpose !== "free_preview") return refuse("free palace gift may only record free_preview", "AI_PROVIDER_NOT_APPROVED");
      const began = await inner.beginAttempt(input);
      if (!began.ok) return refuse(began.error.message, began.error.code);
      if (began.value.pricing.id !== reservedPricingSnapshotId) {
        // Nothing was sent: close the attempt at zero so it never dangles as unknown legacy exposure.
        await inner.completeAttempt({ attemptId: began.value.attemptId, errorCode: "AI_PROVIDER_NOT_APPROVED", inputTokens: 0, outputTokens: 0, cachedTokens: 0, totalTokens: 0 });
        return refuse("reserved pricing snapshot is no longer the active tariff", "AI_PROVIDER_NOT_APPROVED");
      }
      state.begun = 1;
      return began;
    },
    async completeAttempt(input) {
      state.completed = input;
      return inner.completeAttempt(input);
    },
  };
  return { recorder, snapshot: () => ({ ...state }) };
}

export type FreePalaceWriterDeps = Readonly<{
  // Builds the gift-only provider (retryCount 0) around the recorder it is handed.
  createProvider: (recorder: AiCostRecorder) => AiProvider;
  costRecorder: AiCostRecorder;
  // Tariff of the snapshot reserved at admission (VND per million tokens == micro-VND per token).
  loadTariff: (pricingSnapshotId: string) => Promise<Readonly<{ inputPricePerMillion: bigint; outputPricePerMillion: bigint }> | null>;
}>;

export type FreePalaceWriterOutcome = Readonly<{
  settlement: FreeAiAttemptSettlement;
  publication?: Readonly<{ content: FreePalaceGiftContentV1; facts: ReadonlyArray<FreePalaceGiftFactV1> }>;
  // Redacted diagnostic: a short code only, never prose, prompt or identifiers.
  diagnostic: string;
}>;

export function createFreePalaceWriter(deps: FreePalaceWriterDeps) {
  return {
    // Exactly one provider call, no retry, no rewrite, no critic. Quality failure is billed and
    // falls back; unknown capture keeps the whole hold.
    async run(call: FreePalaceGiftFrozenCallV1, attemptId: string): Promise<FreePalaceWriterOutcome> {
      const unsent = (diagnostic: string): FreePalaceWriterOutcome => ({ settlement: { kind: "resolved", actualMicroVnd: 0n, disposition: "failed" }, diagnostic });
      const prompt = parseFreePalacePrompt(call.serializedPrompt);
      if (!prompt || prompt.palaceId !== call.palaceId || prompt.locale !== call.locale) return unsent("frozen_prompt_invalid");
      const tariff = await deps.loadTariff(call.pricingSnapshotId);
      if (!tariff) return unsent("pricing_unavailable");

      const attempt = createFreePalaceAttemptRecorder(deps.costRecorder, call.pricingSnapshotId);
      const provider = deps.createProvider(attempt.recorder);
      let result: Awaited<ReturnType<AiProvider["generateStructured"]>> | null = null;
      try {
        result = await provider.generateStructured({
          schema: FreePalaceGiftContentV1Schema, schemaName: prompt.schemaName, system: prompt.system, user: prompt.user,
          use: "production_report_generation", purpose: "free_preview", maxOutputTokens: call.maxOutputTokens,
          costContext: { purpose: "free_preview", chartVersionId: call.chartVersionId, idempotencyKey: `free-palace:${call.requestId}:${attemptId}` },
        });
      } catch {
        result = null;
      }
      const seen = attempt.snapshot();
      if (seen.begun === 0) return unsent(seen.refused ? "refused_before_send" : "not_sent");

      const usage = seen.completed;
      if (!usage || usage.tokensUnknown || usage.inputTokens === undefined || usage.outputTokens === undefined) {
        return { settlement: { kind: "unknown" }, diagnostic: "usage_unknown" };
      }
      // No cached-input discount: cached tokens are priced as ordinary input.
      const actualMicroVnd = BigInt(usage.inputTokens) * tariff.inputPricePerMillion + BigInt(usage.outputTokens) * tariff.outputPricePerMillion;
      const billedFailure = (diagnostic: string): FreePalaceWriterOutcome => ({ settlement: { kind: "resolved", actualMicroVnd, disposition: "failed" }, diagnostic });
      if (!result || !result.ok) return billedFailure(result ? result.error.code.toLowerCase() : "provider_threw");

      const parsedContent = FreePalaceGiftContentV1Schema.safeParse(result.value.value);
      if (!parsedContent.success) return billedFailure("quality:schema_invalid");
      const content = parsedContent.data;
      const quality = validateFreePalaceGift({ content, facts: prompt.facts, palaceId: call.palaceId, locale: call.locale });
      if (!quality.ok) return billedFailure(`quality:${[...new Set(quality.findings.map((f) => f.code))].join(",")}`);
      // The contract's refinement is the single source of truth for palace match and evidence resolution.
      const view = FreePalaceGiftViewV1Schema.safeParse({
        version: 1, status: "ready", requestId: call.requestId, chartVersionId: call.chartVersionId, palaceId: call.palaceId,
        locale: call.locale, sourceKind: "validated_artifact", contentHash: freePalaceContentHash(content, prompt.facts),
        reading: content, facts: prompt.facts,
      });
      if (!view.success) return billedFailure("quality:evidence_unresolved");
      return { settlement: { kind: "resolved", actualMicroVnd, disposition: "publishable" }, publication: { content, facts: prompt.facts }, diagnostic: "ok" };
    },
  };
}

