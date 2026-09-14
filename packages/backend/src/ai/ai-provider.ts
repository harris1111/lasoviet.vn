import {
  type AiCostRequestContext,
  type AiRequestPurpose,
  z,
} from "@lasoviet/contracts";

export type AiRequestUse =
  | "synthetic_capability_probe"
  | "production_report_generation";
export type AiProviderErrorCode =
  | "AI_PROVIDER_NOT_APPROVED"
  | "AI_CAPABILITY_UNSUPPORTED"
  | "AI_COST_RECORDING_FAILED"
  | "AI_TIMEOUT"
  | "AI_OUTPUT_INVALID"
  | "AI_PROVIDER_REQUEST_FAILED";

export type AiProviderError = {
  code: AiProviderErrorCode;
  retryable: boolean;
};

export type GenerateStructuredRequest<TSchema extends z.ZodType = z.ZodType> = {
  schema: TSchema;
  schemaName: string;
  system: string;
  user: string;
  use: AiRequestUse;
  purpose?: AiRequestPurpose;
  maxOutputTokens: number;
  costContext?: AiCostRequestContext;
};

export type AiStructuredOutputValue<T> = {
  value: T;
  providerId: string;
  modelId: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    cachedTokens?: number;
    totalTokens?: number;
    tokensUnknown: boolean;
    costMicroVnd?: string;
    costVnd?: number;
    costStatus: "resolved" | "unknown";
  };
};

export type AiProvider = {
  generateStructured<TSchema extends z.ZodType>(
    request: GenerateStructuredRequest<TSchema>,
  ): Promise<
    | { ok: true; value: AiStructuredOutputValue<z.output<TSchema>> }
    | { ok: false; error: AiProviderError }
  >;
};

export type AiProductionGate = {
  allows(use: AiRequestUse): boolean;
};

export function createAiProductionGate(
  decision: "pending" | "approved",
): AiProductionGate {
  return {
    allows(use) {
      return use === "synthetic_capability_probe" || decision === "approved";
    },
  };
}

export function resolveRequestPurpose(
  use: AiRequestUse,
  purpose?: AiRequestPurpose,
  costContext?: AiCostRequestContext,
): AiRequestPurpose {
  if (costContext?.purpose) return costContext.purpose;
  if (purpose) return purpose;
  if (use === "synthetic_capability_probe") return "synthetic_probe";
  return "report";
}
