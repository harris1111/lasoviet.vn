import { z } from "zod";
import { BaziFactsV1Schema } from "./bazi-facts-v1.js";
import { BaziStructureV1Schema } from "./bazi-structure-v1.js";
import { CalculationProvenanceV1Schema } from "./calculation-provenance.js";

export const BAZI_NORMALIZED_METHOD_V1 = Object.freeze({
  engineId: "lunar-typescript", engineVersion: "lunar-typescript1.8.6",
  adapterId: "lasoviet.bazi.lunar", adapterVersion: "1.0.0",
  schemaId: "lasoviet.normalized-bazi.v1", ruleSetId: "bazi.vendor-civil-midnight.v1",
  structureRuleVersion: "bazi.structure.vendor-table.v1",
  solarTermsOffsetMinutes: 480, yearBoundary: "li-chun", monthBoundary: "solar-terms",
  dayBoundary: "local-midnight", trueSolarCorrection: false,
} as const);

export const NormalizedBaziChartV1Schema = z.object({
  version: z.literal(1), systemId: z.literal("bazi"),
  timePrecision: z.enum(["exact_minute", "unknown"]), provisional: z.boolean(),
  facts: BaziFactsV1Schema, structure: BaziStructureV1Schema,
  provenance: CalculationProvenanceV1Schema,
}).strict().superRefine((chart, ctx) => {
  const fail = (message: string) => ctx.addIssue({code: "custom", message});
  const {facts, structure, provenance} = chart;
  for (const field of ["engineId", "engineVersion", "adapterId", "adapterVersion", "schemaId", "ruleSetId"] as const) {
    if (provenance[field] !== BAZI_NORMALIZED_METHOD_V1[field]) fail(`Unsupported Bazi provenance ${field}`);
  }
  if (facts.inputHash !== structure.sourceInputHash || facts.inputHash !== provenance.inputHash) fail("Bazi input hashes differ");
  const hourMissing = facts.pillars.hour === null;
  const alternatives = [facts.pillars.year, facts.pillars.month, facts.pillars.day].some(p => p.length !== 1);
  if (structure.uncertainty.hourMissing !== hourMissing || structure.uncertainty.pillarAlternatives !== alternatives ||
      chart.timePrecision !== (hourMissing ? "unknown" : "exact_minute") || chart.provisional !== (hourMissing || alternatives)) fail("Bazi uncertainty differs");
  const expectedLimitations = ["BAZI_NO_TRUE_SOLAR_TIME_CORRECTION", ...(hourMissing ? ["BAZI_HOUR_UNKNOWN"] : []),
    ...(facts.pillars.year.length > 1 || facts.pillars.month.length > 1 ? ["BAZI_SOLAR_TERM_TIME_UNCERTAIN"] : [])];
  if (JSON.stringify(facts.limitations) !== JSON.stringify(expectedLimitations) ||
      JSON.stringify(provenance.limitations) !== JSON.stringify(expectedLimitations)) fail("Bazi limitations differ");
  const entries = (["year", "month", "day", "hour"] as const).flatMap(pillar => {
    const values = pillar === "hour" ? (facts.pillars.hour ? [facts.pillars.hour] : []) : facts.pillars[pillar];
    return values.map((value, variant) => ({pillar, variant, value}));
  });
  const evidenceFor = (entry: typeof entries[number]) => facts.evidence.filter(e => e.pillar === entry.pillar &&
    e.variant === entry.variant && e.stemId === entry.value.stemId && e.branchId === entry.value.branchId);
  if (facts.evidence.length !== entries.length || new Set(facts.evidence.map(e => e.key)).size !== entries.length ||
      entries.some(e => evidenceFor(e).length !== 1)) fail("Bazi evidence binding differs");
  if (structure.relativeReadings.length !== facts.pillars.day.length ||
      new Set(structure.relativeReadings.map(r => r.dayVariant)).size !== facts.pillars.day.length) fail("Bazi day variants differ");
  for (const reading of structure.relativeReadings) {
    const day = entries.find(e => e.pillar === "day" && e.variant === reading.dayVariant);
    if (!day || reading.dayMasterStemId !== day.value.stemId || reading.dayMasterEvidenceKey !== evidenceFor(day)[0]?.key) {
      fail("Bazi day master binding differs"); continue;
    }
    const scoped = entries.filter(e => e.pillar !== "day" || e.variant === day.variant);
    if (reading.pillars.length !== scoped.length || new Set(reading.pillars.map(p => `${p.pillar}.${p.variant}`)).size !== scoped.length) fail("Bazi relative pillar variants differ");
    for (const pillar of reading.pillars) {
      const source = scoped.find(e => e.pillar === pillar.pillar && e.variant === pillar.variant);
      if (!source || source.value.stemId !== pillar.stemId || source.value.branchId !== pillar.branchId ||
          JSON.stringify(source.value.hiddenStemIds) !== JSON.stringify(pillar.hiddenStems.map(s => s.stemId)) ||
          JSON.stringify([...new Set([reading.dayMasterEvidenceKey, source && evidenceFor(source)[0]?.key])]) !== JSON.stringify(pillar.sourceEvidenceKeys)) fail("Bazi structural source binding differs");
    }
  }
  if ((structure.visibleElementInventory === null) !== alternatives ||
      (structure.visibleElementInventory !== null && structure.visibleElementInventory.complete === hourMissing)) fail("Bazi inventory completeness differs");
});
export type NormalizedBaziChartV1 = z.infer<typeof NormalizedBaziChartV1Schema>;
