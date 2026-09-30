import { z } from "zod";
import { PalaceIdSchema } from "./normalized-ziwei-chart-v1.js";

const Evidence = z.array(z.string().trim().min(1)).min(1);
export const ZiweiPeriodFactV1Schema = z.object({
  id: z.string().min(1), year: z.number().int(), month: z.number().int().min(1).max(12),
  isLeapMonth: z.boolean(), part: z.enum(["normal", "first", "second"]),
  dayRange: z.tuple([z.number().int().min(1).max(30), z.number().int().min(1).max(30)]),
  palaceId: PalaceIdSchema, starIds: z.array(z.string().regex(/^ziwei\.star\./)),
  obstacleStarIds: z.array(z.string().regex(/^ziwei\.star\./)), evidenceKeys: Evidence,
}).strict();
export const ZiweiPeriodReadingFactsV1Schema = z.object({
  version: z.literal(1), chartId: z.string().min(1), chartVersionId: z.string().min(1),
  kind: z.enum(["monthly", "annual"]), targetYear: z.number().int().min(1900).max(2100),
  calendar: z.literal("lunar"), asOfDate: z.iso.date(), periodKey: z.string().min(1),
  annualPalaceId: PalaceIdSchema, periods: z.array(ZiweiPeriodFactV1Schema).min(1).max(14),
  evidenceKeys: Evidence,
}).strict();
export type ZiweiPeriodReadingFactsV1 = z.infer<typeof ZiweiPeriodReadingFactsV1Schema>;
export const ZiweiPeriodReadingContentV1Schema = z.object({
  version: z.literal(1), contentVersion: z.literal("ziwei.period-reading.v1"), locale: z.literal("vi"),
  kind: z.enum(["monthly", "annual"]), targetYear: z.number().int().min(1900).max(2100), calendar: z.literal("lunar"), periodKey: z.string().min(1),
  title: z.string().min(1), overview: z.object({ narrative: z.string().min(1), evidenceKeys: Evidence }).strict(),
  periods: z.array(z.object({
    periodId: z.string().min(1), title: z.string().min(1), narrative: z.string().min(1),
    recommendations: z.array(z.string().min(1)).min(2).max(5), cautions: z.array(z.string().min(1)).min(1).max(5), evidenceKeys: Evidence,
  }).strict()).min(1).max(14),
}).strict();
export type ZiweiPeriodReadingContentV1 = z.infer<typeof ZiweiPeriodReadingContentV1Schema>;
