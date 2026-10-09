import { createHash } from "node:crypto";
import { FreeReadingFrozenCallV2Schema, type FreeReadingFrozenCallV2 } from "@lasoviet/contracts";
import { buildFreeReadingPrompt } from "./free-reading-prompt.js";
import { freePalaceArtifactKey, type FreePalaceArtifactLineage } from "./free-palace-selection.js";

export function validFreeReadingCall(input: unknown): FreeReadingFrozenCallV2 | null {
  const parsed = FreeReadingFrozenCallV2Schema.safeParse(input);
  if (!parsed.success) return null;
  const call = parsed.data;
  try {
    if (createHash("sha256").update(JSON.stringify(call.source)).digest("hex") !== call.sourceHash ||
        JSON.stringify(buildFreeReadingPrompt(call.source)) !== call.serializedPrompt) return null;
  } catch {return null;}
  return call;
}
export function freeReadingLineage(call: FreeReadingFrozenCallV2): FreePalaceArtifactLineage {
  const versions = buildFreeReadingPrompt(call.source).versions;
  return {chartVersionId: call.chartVersionId, palaceId: call.source.focusPalaceId, locale: call.source.locale,
    provider: call.tariff.providerId, model: call.tariff.modelId, promptVersion: versions.prompt,
    rulesVersion: versions.rules, knowledgeVersion: `${versions.cards}:${call.sourceHash}`,
    scorerVersion: versions.quality, schemaVersion: versions.schema};
}
export const freeReadingLineageHash = (call: FreeReadingFrozenCallV2) => freePalaceArtifactKey(freeReadingLineage(call));
