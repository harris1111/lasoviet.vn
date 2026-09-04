import { z } from "@lasoviet/contracts";

export type AiRequestUse = "synthetic_capability_probe" | "production_report_generation";
export type AiProviderErrorCode =
  | "AI_PROVIDER_NOT_APPROVED"
  | "AI_CAPABILITY_UNSUPPORTED"
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
  maxOutputTokens: number;
};

export type AiProvider = {
  generateStructured<TSchema extends z.ZodType>(
    request: GenerateStructuredRequest<TSchema>,
  ): Promise<
    | { ok: true; value: { value: z.output<TSchema>; providerId: string; modelId: string } }
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
