import { createHash } from "node:crypto";
import { PalaceIdSchema, type NormalizedZiweiChartV1, type TopConcernV1, type ZiweiPalaceId } from "@lasoviet/contracts";
import { computeNormalizedPalaceScores } from "../reports/structural-palace-score.js";

const concernPalaces: Record<Exclude<TopConcernV1, "self_understanding">, ZiweiPalaceId> = {
  career: "ziwei.palace.career", money: "ziwei.palace.wealth", love: "ziwei.palace.spouse",
  family: "ziwei.palace.parents", wellbeing: "ziwei.palace.fortune",
};

// Input is the server-authorized, normalized source, never a browser selection.
export function selectFreePalace(chart: NormalizedZiweiChartV1, concern?: TopConcernV1): ZiweiPalaceId {
  const ids = new Set(chart.palaces.map((palace) => palace.id));
  if (ids.size === 0 || ids.size !== chart.palaces.length || [...ids].some((id) => !PalaceIdSchema.safeParse(id).success)) {
    throw new Error("FREE_PALACE_SOURCE_INVALID");
  }
  const preferred = concern === "self_understanding" ? chart.bodyPalaceId : concern ? concernPalaces[concern] : undefined;
  if (preferred && ids.has(preferred)) return preferred;
  const scores = computeNormalizedPalaceScores(chart);
  let selected: ZiweiPalaceId | undefined;
  let strongest = -Infinity;
  for (const id of PalaceIdSchema.options) {
    const score = scores.get(id)?.score;
    if (score !== undefined && Number.isFinite(score) && score > strongest) {
      strongest = score; selected = id;
    }
  }
  if (!selected) throw new Error("FREE_PALACE_SOURCE_INVALID");
  return selected;
}

export type FreePalaceArtifactLineage = Readonly<{
  chartVersionId: string; palaceId: ZiweiPalaceId; locale: "vi" | "en";
  promptVersion: string; rulesVersion: string; knowledgeVersion: string; scorerVersion: string;
  schemaVersion: string; provider: string; model: string;
}>;
export function freePalaceArtifactKey(lineage: FreePalaceArtifactLineage): string {
  return createHash("sha256").update(JSON.stringify([
    lineage.chartVersionId, lineage.palaceId, lineage.locale, lineage.promptVersion,
    lineage.rulesVersion, lineage.knowledgeVersion, lineage.scorerVersion,
    lineage.schemaVersion, lineage.provider, lineage.model,
  ])).digest("hex");
}

// Resolve the chartVersion slot before considering a different technical key.
export function resolveFreePalaceSlot(slot: { requestId: string; supportedArtifact: boolean } | null):
  { kind: "eligible" } | { kind: "cache" | "fallback"; requestId: string } {
  return slot === null ? { kind: "eligible" } : { kind: slot.supportedArtifact ? "cache" : "fallback", requestId: slot.requestId };
}
