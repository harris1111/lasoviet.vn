import { z } from "zod";
import { BAZI_STEM_IDS, BAZI_BRANCH_IDS } from "./bazi-facts-v1.js";
import { BAZI_TEN_GOD_IDS } from "./bazi-structure-v1.js";
import { NormalizedBaziChartV1Schema } from "./normalized-bazi-chart-v1.js";

const Role = z.enum(["primary", "counterpart"]);
const source = z.object({sourceId: z.string().trim().min(1), calculationKey: z.string().min(1),
  chart: NormalizedBaziChartV1Schema}).strict();
const relation = z.object({referenceRole: Role, dayVariant: z.number().int().min(0).max(1),
  dayMasterStemId: z.enum(BAZI_STEM_IDS), relativePillar: z.enum(["year", "month", "day", "hour"]),
  relativeVariant: z.number().int().min(0).max(1), stemId: z.enum(BAZI_STEM_IDS), branchId: z.enum(BAZI_BRANCH_IDS),
  stemTenGod: z.enum(BAZI_TEN_GOD_IDS),
  hiddenStems: z.array(z.object({stemId: z.enum(BAZI_STEM_IDS), tenGod: z.enum(BAZI_TEN_GOD_IDS)}).strict()).min(1).max(3),
  evidenceKeys: z.tuple([z.string().min(1), z.string().min(1)]),
}).strict();

/** Private structural facts; this carries no compatibility verdict or paid prose. */
export const BaziTwoPersonSourceV1Schema = z.object({version: z.literal(1),
  sourceVersion: z.literal("bazi.two-person.structural.source.v1"), status: z.literal("draft_source"),
  manualAccepted: z.literal(false),
  primary: source, counterpart: source,
  relations: z.array(relation).min(6).max(28),
  sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
}).strict().superRefine((value, ctx) => {
  const fail = () => ctx.addIssue({code: "custom", message: "Ordered Bazi comparison evidence/uncertainty must match both sources"});
  if (value.primary.sourceId === value.counterpart.sourceId || value.counterpart.chart.timePrecision !== "unknown" ||
      value.counterpart.chart.facts.pillars.hour !== null) fail();
  for (const entry of [value.primary, value.counterpart]) {
    const p = entry.chart.provenance;
    if (entry.calculationKey !== [entry.chart.systemId, p.inputHash, p.engineVersion, p.adapterVersion, p.configHash].join(":")) fail();
  }
  const entries = (role: "primary" | "counterpart") => {
    const facts = value[role].chart.facts;
    return (["year", "month", "day", "hour"] as const).flatMap(pillar => {
      const variants = pillar === "hour" ? facts.pillars.hour ? [facts.pillars.hour] : [] : facts.pillars[pillar];
      return variants.map((candidate, variant) => ({pillar, variant, candidate,
        evidence: facts.evidence.find(e => e.pillar === pillar && e.variant === variant)}));
    });
  };
  const seen = new Set<string>();
  for (const row of value.relations) {
    const other = row.referenceRole === "primary" ? "counterpart" : "primary";
    const day = entries(row.referenceRole).find(e => e.pillar === "day" && e.variant === row.dayVariant);
    const relative = entries(other).find(e => e.pillar === row.relativePillar && e.variant === row.relativeVariant);
    const key = `${row.referenceRole}.${row.dayVariant}.${row.relativePillar}.${row.relativeVariant}`;
    if (seen.has(key) || !day || !relative || row.dayMasterStemId !== day.candidate.stemId ||
        row.stemId !== relative.candidate.stemId || row.branchId !== relative.candidate.branchId ||
        JSON.stringify(row.hiddenStems.map(s => s.stemId)) !== JSON.stringify(relative.candidate.hiddenStemIds) ||
        JSON.stringify(row.evidenceKeys) !== JSON.stringify([`${row.referenceRole}.${day?.evidence?.key}`, `${other}.${relative?.evidence?.key}`])) fail();
    seen.add(key);
  }
  const expected = value.primary.chart.facts.pillars.day.length * entries("counterpart").length +
    value.counterpart.chart.facts.pillars.day.length * entries("primary").length;
  if (value.relations.length !== expected) fail();
});
export type BaziTwoPersonSourceV1 = z.infer<typeof BaziTwoPersonSourceV1Schema>;
