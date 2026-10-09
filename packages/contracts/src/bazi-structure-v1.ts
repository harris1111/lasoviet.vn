import { z } from "zod";
import { BAZI_BRANCH_IDS, BAZI_STEM_IDS } from "./bazi-facts-v1.js";
export const BAZI_ELEMENT_IDS = ["wood", "fire", "earth", "metal", "water"] as const;
export const BAZI_TEN_GOD_IDS = ["peer", "rob_wealth", "eating_god", "hurting_officer", "indirect_wealth", "direct_wealth", "seven_killings", "direct_officer", "indirect_resource", "direct_resource"] as const;
export type BaziElementId = typeof BAZI_ELEMENT_IDS[number];
export type BaziTenGodId = typeof BAZI_TEN_GOD_IDS[number];
const evidenceKey = z.string().trim().min(1);
const stem = z.enum(BAZI_STEM_IDS), element = z.enum(BAZI_ELEMENT_IDS), god = z.enum(BAZI_TEN_GOD_IDS);
const relativePillar = z.object({
  pillar: z.enum(["year", "month", "day", "hour"]), variant: z.number().int().min(0).max(1),
  stemId: stem, branchId: z.enum(BAZI_BRANCH_IDS), stemElement: element, branchElement: element,
  stemRole: z.enum(["day_master", "relative"]), stemTenGod: god.nullable(),
  hiddenStems: z.array(z.object({stemId: stem, element, tenGod: god}).strict()).min(1).max(3),
  sourceEvidenceKeys: z.array(evidenceKey).min(1).max(2),
}).strict().superRefine((value, ctx) => {
  if ((value.pillar === "day") !== (value.stemRole === "day_master") ||
      (value.stemRole === "day_master") !== (value.stemTenGod === null)) {
    ctx.addIssue({code: "custom", message: "Day stem is the day master, not a counted relative god"});
  }
});
export const BaziStructureV1Schema = z.object({
  version: z.literal(1), systemId: z.literal("bazi"), ruleVersion: z.literal("bazi.structure.vendor-table.v1"),
  sourceInputHash: z.string().regex(/^[a-f0-9]{64}$/), engineVersion: z.literal("lunar-typescript1.8.6"),
  relativeReadings: z.array(z.object({dayMasterStemId: stem, dayVariant: z.number().int().min(0).max(1),
    dayMasterEvidenceKey: evidenceKey, pillars: z.array(relativePillar).min(3).max(7)}).strict()).min(1).max(2),
  visibleElementInventory: z.object({method: z.literal("unweighted-visible-stem-and-branch-count"),
    characterCount: z.union([z.literal(6), z.literal(8)]), complete: z.boolean(),
    counts: z.record(element, z.number().int().nonnegative()),
  }).strict().superRefine((value, ctx) => {
    if (Object.values(value.counts).reduce((sum, count) => sum + count, 0) !== value.characterCount ||
        value.complete !== (value.characterCount === 8)) ctx.addIssue({code: "custom", message: "Inventory counts must match known visible characters"});
  }).nullable(),
  uncertainty: z.object({hourMissing: z.boolean(), pillarAlternatives: z.boolean(), trueSolarCorrection: z.literal(false)}).strict(),
}).strict();
export type BaziStructureV1 = z.infer<typeof BaziStructureV1Schema>;
