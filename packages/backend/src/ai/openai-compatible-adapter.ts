import { randomUUID } from "node:crypto";
import { z } from "@lasoviet/contracts";

import {
  createAiProductionGate,
  resolveRequestPurpose,
  type AiProductionGate,
  type AiProvider,
  type AiProviderError,
  type GenerateStructuredRequest,
} from "./ai-provider.js";
import type { AiCostRecorder, InvalidOutputReason } from "./ai-cost.js";

export type OpenAiCompatibleAdapterOptions = {
  baseUrl: string;
  apiKey: string;
  modelId: string;
  allowedResolvedModelIds: readonly string[];
  providerId?: string;
  timeoutMs: number;
  retryCount: number;
  productionGate?: AiProductionGate;
  fetchImpl?: typeof fetch;
  costRecorder?: AiCostRecorder;
};

const GENERIC_JSON_INSTRUCTION =
  "Return strictly one JSON object only, with no Markdown, code fences, wrappers, or trailing prose.";
const INVALID_OUTPUT_CORRECTION =
  "Correction: The previous response was invalid. Return strictly one JSON object only with no Markdown or prose.";

function failure(
  code: AiProviderError["code"],
  retryable: boolean,
): { ok: false; error: AiProviderError } {
  return { ok: false, error: { code, retryable } };
}

function endpoint(baseUrl: string): string {
  return `${baseUrl.trim().replace(/\/+$/, "")}/chat/completions`;
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

function isUnsupportedStatus(status: number): boolean {
  return status === 400 || status === 404 || status === 422;
}

function extractUsage(payload: unknown): {
  inputTokens?: number;
  outputTokens?: number;
  cachedTokens?: number;
  totalTokens?: number;
  tokensUnknown: boolean;
} {
  const usage = (payload as { usage?: Record<string, unknown> })?.usage;
  if (!usage || typeof usage !== "object") {
    return { tokensUnknown: true };
  }
  const promptTokens = typeof usage.prompt_tokens === "number" ? usage.prompt_tokens : undefined;
  const completionTokens =
    typeof usage.completion_tokens === "number" ? usage.completion_tokens : undefined;
  const totalTokens = typeof usage.total_tokens === "number" ? usage.total_tokens : undefined;

  let cachedTokens = 0;
  if (typeof usage.cached_tokens === "number") {
    cachedTokens = usage.cached_tokens;
  } else if (typeof usage.prompt_cache_hit_tokens === "number") {
    cachedTokens = usage.prompt_cache_hit_tokens;
  } else if (
    usage.prompt_tokens_details &&
    typeof usage.prompt_tokens_details === "object" &&
    typeof (usage.prompt_tokens_details as Record<string, unknown>).cached_tokens === "number"
  ) {
    cachedTokens = (usage.prompt_tokens_details as Record<string, unknown>).cached_tokens as number;
  }

  if (promptTokens === undefined && completionTokens === undefined) {
    return { tokensUnknown: true };
  }

  const input = promptTokens ?? 0;
  const output = completionTokens ?? 0;
  const total = totalTokens ?? input + output;
  return {
    inputTokens: input,
    outputTokens: output,
    cachedTokens,
    totalTokens: total,
    tokensUnknown: false,
  };
}

function extractFirstJsonObject(raw: string): string | undefined {
  const trimmed = raw.trimStart();
  if (!trimmed.startsWith("{")) {
    return undefined;
  }
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = 0; i < trimmed.length; i += 1) {
    const char = trimmed[i];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (char === "\\") {
        escape = true;
      } else if (char === "\"") {
        inString = false;
      }
    } else {
      if (char === "\"") {
        inString = true;
      } else if (char === "{") {
        depth += 1;
      } else if (char === "}") {
        depth -= 1;
        if (depth === 0) {
          return trimmed.slice(0, i + 1);
        }
      }
    }
  }

  return undefined;
}

function parseContent<TSchema extends z.ZodType>(
  response: unknown,
  schema: TSchema,
):
  | { ok: true; value: z.output<TSchema> }
  | { ok: false; reason: InvalidOutputReason } {
  const content = (response as {
    choices?: Array<{ message?: { content?: unknown } }>;
  }).choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    return { ok: false, reason: "message_content_missing_or_non_string" };
  }
  if (!content.trimStart().startsWith("{")) {
    return { ok: false, reason: "content_not_json_object" };
  }
  const jsonStr = extractFirstJsonObject(content);
  if (!jsonStr) {
    return { ok: false, reason: "json_object_malformed" };
  }
  try {
    const parsedJson = JSON.parse(jsonStr);
    if (
      parsedJson === null ||
      typeof parsedJson !== "object" ||
      Array.isArray(parsedJson)
    ) {
      return { ok: false, reason: "json_object_malformed" };
    }
    const parsed = schema.safeParse(parsedJson);
    return parsed.success
      ? { ok: true, value: parsed.data }
      : { ok: false, reason: "schema_validation_failed" };
  } catch {
    return { ok: false, reason: "json_object_malformed" };
  }
}

async function fetchAttempt(
  fetchImpl: typeof fetch,
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response | "timeout" | "network"> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { ...init, signal: controller.signal });
  } catch (error) {
    return error instanceof DOMException && error.name === "AbortError"
      ? "timeout"
      : "network";
  } finally {
    clearTimeout(timer);
  }
}

export function createOpenAiCompatibleAdapter(
  options: OpenAiCompatibleAdapterOptions,
): AiProvider {
  const gate = options.productionGate ?? createAiProductionGate("pending");
  const fetchImpl = options.fetchImpl ?? fetch;
  const providerId = options.providerId ?? "9router-an";
  const allowedResolvedModelIds = new Set(options.allowedResolvedModelIds);

  return {
    async generateStructured<TSchema extends z.ZodType>(
      request: GenerateStructuredRequest<TSchema>,
    ) {
      if (!gate.allows(request.use)) {
        return failure("AI_PROVIDER_NOT_APPROVED", false);
      }

      // Requirement 1: Production calls strictly require a recorder
      if (request.use === "production_report_generation" && !options.costRecorder) {
        return failure("AI_COST_RECORDING_FAILED", false);
      }

      const purpose = resolveRequestPurpose(request.use, request.purpose, request.costContext);
      const callId = randomUUID();
      const idempotencyKey = request.costContext?.idempotencyKey;
      let hasInvalidOutput = false;

      for (let attempt = 0; attempt <= options.retryCount; attempt += 1) {
        let attemptId: string | undefined;

        // Two-step lifecycle: beginAttempt runs before EACH actual HTTP attempt
        if (options.costRecorder) {
          const beginRes = await options.costRecorder.beginAttempt({
            callId,
            attemptNumber: attempt,
            idempotencyKey,
            purpose,
            providerId,
            requestedModelId: options.modelId,
            maxOutputTokens: request.maxOutputTokens,
            costContext: request.costContext,
          });
          if (!beginRes.ok) {
            return failure(beginRes.error.code, beginRes.error.retryable);
          }
          attemptId = beginRes.value.attemptId;
        }

        let systemPrompt = `${request.system} ${GENERIC_JSON_INSTRUCTION}`;
        if (hasInvalidOutput) {
          systemPrompt += ` ${INVALID_OUTPUT_CORRECTION}`;
        }
        const body = JSON.stringify({
          model: options.modelId,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: request.user },
          ],
          stream: false,
          max_tokens: request.maxOutputTokens,
          response_format: {
            type: "json_schema",
            json_schema: {
              name: request.schemaName,
              strict: true,
              schema: z.toJSONSchema(request.schema),
            },
          },
        });

        const result = await fetchAttempt(
          fetchImpl,
          endpoint(options.baseUrl),
          {
            method: "POST",
            headers: {
              authorization: `Bearer ${options.apiKey}`,
              "content-type": "application/json",
            },
            body,
          },
          options.timeoutMs,
        );

        if (result === "timeout") {
          if (options.costRecorder && attemptId) {
            const compRes = await options.costRecorder.completeAttempt({
              attemptId,
              errorCode: "AI_TIMEOUT",
              tokensUnknown: true,
            });
            if (!compRes.ok) return failure("AI_COST_RECORDING_FAILED", compRes.error.retryable);
          }
          if (attempt < options.retryCount) continue;
          return failure("AI_TIMEOUT", true);
        }

        if (result === "network") {
          if (options.costRecorder && attemptId) {
            const compRes = await options.costRecorder.completeAttempt({
              attemptId,
              errorCode: "AI_PROVIDER_REQUEST_FAILED",
              tokensUnknown: true,
            });
            if (!compRes.ok) return failure("AI_COST_RECORDING_FAILED", compRes.error.retryable);
          }
          if (attempt < options.retryCount) continue;
          return failure("AI_PROVIDER_REQUEST_FAILED", true);
        }

        if (!result.ok) {
          let errorUsage = { tokensUnknown: true };
          try {
            const errJson = await result.clone().json();
            errorUsage = extractUsage(errJson);
          } catch {}

          const errCode = isUnsupportedStatus(result.status)
            ? "AI_CAPABILITY_UNSUPPORTED"
            : "AI_PROVIDER_REQUEST_FAILED";

          if (options.costRecorder && attemptId) {
            const compRes = await options.costRecorder.completeAttempt({
              attemptId,
              httpStatus: result.status,
              errorCode: errCode,
              ...errorUsage,
            });
            if (!compRes.ok) return failure("AI_COST_RECORDING_FAILED", compRes.error.retryable);
          }
          if (isRetryableStatus(result.status) && attempt < options.retryCount) continue;
          if (isUnsupportedStatus(result.status)) return failure("AI_CAPABILITY_UNSUPPORTED", false);
          return failure("AI_PROVIDER_REQUEST_FAILED", isRetryableStatus(result.status));
        }

        let payload: unknown;
        try {
          payload = await result.json();
        } catch {
          if (options.costRecorder && attemptId) {
            const compRes = await options.costRecorder.completeAttempt({
              attemptId,
              httpStatus: result.status,
              errorCode: "AI_OUTPUT_INVALID",
              invalidOutputReason: "response_json_parse_failed",
              tokensUnknown: true,
            });
            if (!compRes.ok) return failure("AI_COST_RECORDING_FAILED", compRes.error.retryable);
          }
          if (attempt < options.retryCount) {
            hasInvalidOutput = true;
            continue;
          }
          return failure("AI_OUTPUT_INVALID", false);
        }

        const usage = extractUsage(payload);
        const payloadRecord =
          payload !== null && typeof payload === "object"
            ? (payload as Record<string, unknown>)
            : undefined;
        const responseModelId =
          typeof payloadRecord?.model === "string"
            ? payloadRecord.model
            : undefined;

        const invalidOutputReason =
          responseModelId === undefined || responseModelId.trim() === ""
            ? "resolved_model_missing"
            : !allowedResolvedModelIds.has(responseModelId)
              ? "resolved_model_disallowed"
              : undefined;
        const parsedContent =
          invalidOutputReason === undefined
            ? parseContent(payload, request.schema)
            : undefined;
        const reason =
          invalidOutputReason ??
          (parsedContent?.ok === false ? parsedContent.reason : undefined);
        if (reason !== undefined) {
          if (options.costRecorder && attemptId) {
            const compRes = await options.costRecorder.completeAttempt({
              attemptId,
              responseModelId,
              httpStatus: result.status,
              errorCode: "AI_OUTPUT_INVALID",
              invalidOutputReason: reason,
              ...usage,
            });
            if (!compRes.ok) return failure("AI_COST_RECORDING_FAILED", compRes.error.retryable);
          }
          if (attempt < options.retryCount) {
            hasInvalidOutput = true;
            continue;
          }
          return failure("AI_OUTPUT_INVALID", false);
        }
        if (!parsedContent || !parsedContent.ok) {
          return failure("AI_OUTPUT_INVALID", false);
        }

        let recordedCostVnd: number | undefined;
        let recordedCostMicroVnd: string | undefined;
        let recordedCostStatus: "resolved" | "unknown" = "resolved";

        if (options.costRecorder && attemptId) {
          const compRes = await options.costRecorder.completeAttempt({
            attemptId,
            responseModelId,
            httpStatus: result.status,
            errorCode: undefined,
            ...usage,
          });
          if (!compRes.ok) return failure("AI_COST_RECORDING_FAILED", compRes.error.retryable);
          recordedCostVnd = compRes.value.costVnd;
          recordedCostMicroVnd = compRes.value.costMicroVnd;
          recordedCostStatus = compRes.value.costStatus;
        }

        return {
          ok: true as const,
          value: {
            value: parsedContent.value,
            providerId,
            modelId: responseModelId ?? options.modelId,
            usage: {
              ...usage,
              costMicroVnd: recordedCostMicroVnd,
              costVnd: recordedCostVnd,
              costStatus: recordedCostStatus,
            },
          },
        };
      }
      return failure("AI_PROVIDER_REQUEST_FAILED", true);
    },
  };
}

export { createAiProductionGate };
