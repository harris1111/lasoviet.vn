import { z } from "@lasoviet/contracts";

import type { AiProvider } from "./ai-provider.js";

const sentinel = "LASOVIET_CAPABILITY_PROBE_V1";
const ProbeSchema = z.object({
  sentinel: z.literal(sentinel),
  boundedValue: z.enum(["ok", "ready"]),
}).strict();

export type AiCapabilityResult =
  | { ok: true; value: { providerId: "9router-an"; modelId: string } }
  | { ok: false; error: { code: string; retryable: boolean } };

export async function runAiCapabilityProbe(
  provider: AiProvider,
): Promise<AiCapabilityResult> {
  const result = await provider.generateStructured({
    schema: ProbeSchema,
    schemaName: "lasoviet_capability_probe_v1",
    system: "Return the requested synthetic capability object only.",
    user: `Return sentinel "${sentinel}" and boundedValue "ok".`,
    use: "synthetic_capability_probe",
    maxOutputTokens: 80,
  });
  if (!result.ok) return result;
  if (
    result.value.value.sentinel !== sentinel ||
    result.value.providerId !== "9router-an" ||
    result.value.modelId.trim() === ""
  ) {
    return { ok: false, error: { code: "AI_CAPABILITY_UNSUPPORTED", retryable: false } };
  }
  return {
    ok: true,
    value: { providerId: "9router-an", modelId: result.value.modelId },
  };
}
