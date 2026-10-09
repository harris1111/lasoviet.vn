import { createHash } from "node:crypto";
import { BAZI_NORMALIZED_METHOD_V1, NormalizedBaziChartV1Schema,
  type BaziFactsInputV1, type NormalizedBaziChartV1 } from "@lasoviet/contracts";
import { calculateBaziFacts } from "./lunar-bazi-facts.js";
import { buildBaziStructure } from "./lunar-bazi-structure.js";

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${canonical(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
const hash = (value: unknown) => createHash("sha256").update(canonical(value)).digest("hex");
export const BAZI_NORMALIZED_CONFIG_HASH_V1 = hash(BAZI_NORMALIZED_METHOD_V1);
function snapshot(chart: Pick<NormalizedBaziChartV1, "facts" | "structure" | "timePrecision" | "provisional">) {
  return {facts: chart.facts, structure: chart.structure, timePrecision: chart.timePrecision, provisional: chart.provisional};
}

/** Private normalized calculation; callers authorize and resolve their stored input. */
export function calculateNormalizedBaziChart(input: BaziFactsInputV1, calculatedAt: Date): NormalizedBaziChartV1 {
  const facts = calculateBaziFacts(input), structure = buildBaziStructure(facts);
  const output = {facts, structure, timePrecision: input.localTime === null ? "unknown" as const : "exact_minute" as const,
    provisional: structure.uncertainty.hourMissing || structure.uncertainty.pillarAlternatives};
  return NormalizedBaziChartV1Schema.parse({version: 1, systemId: "bazi", ...output,
    provenance: {version: 1, engineId: BAZI_NORMALIZED_METHOD_V1.engineId, engineVersion: facts.engineVersion,
      adapterId: BAZI_NORMALIZED_METHOD_V1.adapterId, adapterVersion: BAZI_NORMALIZED_METHOD_V1.adapterVersion,
      schemaId: BAZI_NORMALIZED_METHOD_V1.schemaId, ruleSetId: facts.ruleVersion,
      inputHash: facts.inputHash, configHash: BAZI_NORMALIZED_CONFIG_HASH_V1, rawSnapshotHash: hash(output),
      calculatedAt: calculatedAt.toISOString().replace("Z", "+00:00"), limitations: [...facts.limitations]}});
}

/** Hashes detect corruption; this does not authenticate a vendor or chart owner. */
export function validateNormalizedBaziChart(input: unknown): NormalizedBaziChartV1 {
  const chart = NormalizedBaziChartV1Schema.parse(input);
  if (chart.provenance.configHash !== BAZI_NORMALIZED_CONFIG_HASH_V1 ||
      chart.provenance.rawSnapshotHash !== hash(snapshot(chart)) ||
      canonical(chart.structure) !== canonical(buildBaziStructure(chart.facts))) throw new Error("BAZI_NORMALIZED_SOURCE_MISMATCH");
  return chart;
}

export function baziCalculationKey(input: unknown): string {
  const chart = validateNormalizedBaziChart(input), p = chart.provenance;
  return [chart.systemId, p.inputHash, p.engineVersion, p.adapterVersion, p.configHash].join(":");
}
