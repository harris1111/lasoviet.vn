import { z } from "zod";

import {
  CalculationProvenanceV1Schema,
  type CalculationProvenanceV1,
} from "./calculation-provenance.js";

const palaceIds = [
  "ziwei.palace.life",
  "ziwei.palace.siblings",
  "ziwei.palace.spouse",
  "ziwei.palace.children",
  "ziwei.palace.wealth",
  "ziwei.palace.health",
  "ziwei.palace.travel",
  "ziwei.palace.friends",
  "ziwei.palace.career",
  "ziwei.palace.property",
  "ziwei.palace.fortune",
  "ziwei.palace.parents",
] as const;

const branchIds = [
  "ziwei.branch.rat",
  "ziwei.branch.ox",
  "ziwei.branch.tiger",
  "ziwei.branch.rabbit",
  "ziwei.branch.dragon",
  "ziwei.branch.snake",
  "ziwei.branch.horse",
  "ziwei.branch.goat",
  "ziwei.branch.monkey",
  "ziwei.branch.rooster",
  "ziwei.branch.dog",
  "ziwei.branch.pig",
] as const;

const PalaceIdSchema = z.enum(palaceIds);
const canonicalStarId = z.string().regex(/^ziwei\.star\.[a-z0-9-]+$/);
const canonicalWarningCode = z.string().regex(/^ziwei\.warning\.[a-z0-9-]+$/);

export type ZiweiPalaceId = z.infer<typeof PalaceIdSchema>;
export type ZiweiStarId = string;

const palaceStarSchema = z
  .object({
    id: canonicalStarId,
    brightness: z.enum([
      "ziwei.brightness.exalted",
      "ziwei.brightness.prosperous",
      "ziwei.brightness.favorable",
      "ziwei.brightness.neutral",
      "ziwei.brightness.unfavorable",
      "ziwei.brightness.weak",
    ]),
    category: z.enum(["major", "minor", "adjective", "decorative"]).optional(),
  })
  .strict();

const chartRelationshipSchema = z
  .object({
    id: z.string().optional(),
    type: z.string().optional(),
    palaceId: PalaceIdSchema.optional(),
    targetPalaceIds: z.array(PalaceIdSchema).optional(),
  })
  .strict();

const chartPatternSchema = z
  .object({
    id: z.string(),
    palaceIds: z.array(PalaceIdSchema),
    starIds: z.array(z.string()),
  })
  .strict();

const palaceSchema = z
  .object({
    id: PalaceIdSchema,
    earthlyBranchId: z.enum(branchIds),
    heavenlyStemId: z.string().regex(/^ziwei\.stem\.[a-z0-9-]+$/).optional(),
    isBodyPalace: z.boolean().optional(),
    isOriginalPalace: z.boolean().optional(),
    cycleStateId: z.string().regex(/^ziwei\.cycle\.[a-z0-9-]+$/).optional(),
    stars: z.array(palaceStarSchema),
  })
  .strict();

const transformationSchema = z
  .object({
    starId: canonicalStarId,
    id: z.enum([
      "ziwei.transformation.prosperity",
      "ziwei.transformation.power",
      "ziwei.transformation.fame",
      "ziwei.transformation.obstacle",
    ]),
  })
  .strict();

const horoscopeCapabilitySchema = z
  .object({
    id: z.enum([
      "ziwei.horoscope.decadal",
      "ziwei.horoscope.annual",
      "ziwei.horoscope.monthly",
      "ziwei.horoscope.daily",
    ]),
    supported: z.boolean(),
  })
  .strict();

const warningSchema = z
  .object({
    code: canonicalWarningCode,
    severity: z.enum(["warning", "limitation"]),
  })
  .strict();

export type NormalizedZiweiChartV1 = {
  version: 1;
  systemId: "ziwei";
  palaces: Array<z.infer<typeof palaceSchema>>;
  transformations: Array<z.infer<typeof transformationSchema>>;
  soulPalaceId: ZiweiPalaceId;
  bodyPalaceId: ZiweiPalaceId;
  horoscopeCapabilities: Array<z.infer<typeof horoscopeCapabilitySchema>>;
  warnings: Array<z.infer<typeof warningSchema>>;
  provenance: CalculationProvenanceV1;
  relationships?: Array<z.infer<typeof chartRelationshipSchema>>;
  patterns?: Array<z.infer<typeof chartPatternSchema>>;
};

export const NormalizedZiweiChartV1Schema: z.ZodType<
  NormalizedZiweiChartV1
> = z
  .object({
    version: z.literal(1),
    systemId: z.literal("ziwei"),
    palaces: z.array(palaceSchema).length(12),
    transformations: z.array(transformationSchema).min(1),
    soulPalaceId: PalaceIdSchema,
    bodyPalaceId: PalaceIdSchema,
    horoscopeCapabilities: z.array(horoscopeCapabilitySchema).min(1),
    warnings: z.array(warningSchema),
    provenance: CalculationProvenanceV1Schema,
    relationships: z.array(chartRelationshipSchema).optional(),
    patterns: z.array(chartPatternSchema).optional(),
  })
  .strict()
  .superRefine((chart, context) => {
    const palaceIds = new Set(chart.palaces.map((palace) => palace.id));
    if (palaceIds.size !== chart.palaces.length) {
      context.addIssue({
        code: "custom",
        path: ["palaces"],
        message: "Palaces must have unique canonical IDs",
      });
    }
    const branchIds = new Set(chart.palaces.map((palace) => palace.earthlyBranchId));
    if (branchIds.size !== chart.palaces.length) {
      context.addIssue({
        code: "custom",
        path: ["palaces"],
        message: "Palaces must have unique earthly branch IDs",
      });
    }
    if (!palaceIds.has(chart.soulPalaceId)) {
      context.addIssue({
        code: "custom",
        path: ["soulPalaceId"],
        message: "Soul palace must be present in palaces",
      });
    }
    if (!palaceIds.has(chart.bodyPalaceId)) {
      context.addIssue({
        code: "custom",
        path: ["bodyPalaceId"],
        message: "Body palace must be present in palaces",
      });
    }
  });
