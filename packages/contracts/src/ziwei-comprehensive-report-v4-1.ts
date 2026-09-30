import { ZiweiComprehensiveReportBirthTimeSensitivityV2Schema, ZiweiComprehensiveReportContentV2Schema } from "./ziwei-comprehensive-report-v2.js";
import { ZIWEI_PALACE_IDS } from "./ziwei-comprehensive-report-v1.js";
import { z } from "zod";

export const ZiweiComprehensiveReportDecadalTeaserV1Schema = z.object({
  ordinal: z.number().int().min(0).max(11),
  palaceId: z.enum(ZIWEI_PALACE_IDS),
  ageRange: z.tuple([z.number().int(), z.number().int()]),
  yearRange: z.tuple([z.number().int(), z.number().int()]),
  narrative: z.string().trim().min(1).max(2_000),
  evidenceKeys: z.array(z.string().trim().min(1)).min(1),
}).strict();

export const ZiweiComprehensiveReportContentV3Schema =
  ZiweiComprehensiveReportContentV2Schema.extend({
    birthTimeSensitivity: ZiweiComprehensiveReportBirthTimeSensitivityV2Schema,
    decadalTeasers: z.array(ZiweiComprehensiveReportDecadalTeaserV1Schema).max(7).optional(),
  }).strict();

export type ZiweiComprehensiveReportContentV3 = z.infer<typeof ZiweiComprehensiveReportContentV3Schema>;
