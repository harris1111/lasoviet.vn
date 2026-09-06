import { z } from "@lasoviet/contracts";

import {
  createAiProductionGate,
  type AiProductionGate,
  type AiProvider,
  type AiProviderError,
  type GenerateStructuredRequest,
} from "./ai-provider.js";

export type OpenAiCompatibleAdapterOptions = {
  baseUrl: string;
  apiKey: string;
  modelId: string;
  timeoutMs: number;
  retryCount: number;
  productionGate?: AiProductionGate;
  fetchImpl?: typeof fetch;
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

function extractFirstJsonObject(raw: string): string | undefined {
  const trimmed = raw.trimStart();
  if (!trimmed.startsWith("{") || trimmed.startsWith("```")) {
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
): z.output<TSchema> | undefined {
  const content = (response as {
    choices?: Array<{ message?: { content?: unknown } }>;
  }).choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    return undefined;
  }
  const jsonStr = extractFirstJsonObject(content);
  if (!jsonStr) {
    return undefined;
  }
  try {
    const parsed = schema.safeParse(JSON.parse(jsonStr));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
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

  return {
    async generateStructured<TSchema extends z.ZodType>(
      request: GenerateStructuredRequest<TSchema>,
    ) {
      if (!gate.allows(request.use)) {
        return failure("AI_PROVIDER_NOT_APPROVED", false);
      }
      let hasInvalidOutput = false;
      for (let attempt = 0; attempt <= options.retryCount; attempt += 1) {
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
        const result = await fetchAttempt(fetchImpl, endpoint(options.baseUrl), {
          method: "POST",
          headers: {
            authorization: `Bearer ${options.apiKey}`,
            "content-type": "application/json",
          },
          body,
        }, options.timeoutMs);
        if (result === "timeout") {
          if (attempt < options.retryCount) continue;
          return failure("AI_TIMEOUT", true);
        }
        if (result === "network") {
          if (attempt < options.retryCount) continue;
          return failure("AI_PROVIDER_REQUEST_FAILED", true);
        }
        if (!result.ok) {
          if (isRetryableStatus(result.status) && attempt < options.retryCount) continue;
          if (isUnsupportedStatus(result.status)) return failure("AI_CAPABILITY_UNSUPPORTED", false);
          return failure("AI_PROVIDER_REQUEST_FAILED", isRetryableStatus(result.status));
        }
        let payload: unknown;
        try {
          payload = await result.json();
        } catch {
          if (attempt < options.retryCount) {
            hasInvalidOutput = true;
            continue;
          }
          return failure("AI_OUTPUT_INVALID", false);
        }
        const value = parseContent(payload, request.schema);
        if (value === undefined) {
          if (attempt < options.retryCount) {
            hasInvalidOutput = true;
            continue;
          }
          return failure("AI_OUTPUT_INVALID", false);
        }
        const modelId = typeof (payload as { model?: unknown }).model === "string"
          ? (payload as { model: string }).model
          : options.modelId;
        return {
          ok: true as const,
          value: { value, providerId: "9router-an", modelId },
        };
      }
      return failure("AI_PROVIDER_REQUEST_FAILED", true);
    },
  };
}

export { createAiProductionGate };
