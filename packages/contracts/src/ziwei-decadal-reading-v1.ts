import { z } from "zod";
import { PalaceIdSchema } from "./normalized-ziwei-chart-v1.js";

const Evidence = z.array(z.string().trim().min(1)).min(1);
export const ZiweiDecadalReadingContentV1Schema = z.object({
  version: z.literal(1), contentVersion: z.literal("ziwei.decadal-reading.v1"),
  locale: z.literal("vi"), calendar: z.literal("lunar"),
  sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
  ordinal: z.number().int().min(0).max(11),
  startAge: z.number().int().positive(), endAge: z.number().int().positive(),
  startYear: z.number().int(), endYear: z.number().int(),
  title: z.string().min(1),
  overview: z.object({narrative: z.string().min(1), evidenceKeys: Evidence}).strict(),
  years: z.array(z.object({year: z.number().int(), age: z.number().int().positive(),
    palaceId: PalaceIdSchema, title: z.string().min(1), narrative: z.string().min(1),
    recommendations: z.array(z.string().min(1)).min(2).max(5),
    cautions: z.array(z.string().min(1)).min(1).max(5), evidenceKeys: Evidence,
  }).strict()).length(10),
}).strict();
export type ZiweiDecadalReadingContentV1 = z.infer<typeof ZiweiDecadalReadingContentV1Schema>;
