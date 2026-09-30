import { z } from "zod";

import { PalaceIdSchema } from "./normalized-ziwei-chart-v1.js";

export const DailyAspectKeySchema = z.enum([
  "work",
  "finances",
  "relationships",
  "wellbeing",
]);
export type DailyAspectKey = z.infer<typeof DailyAspectKeySchema>;

export const PersonalDailyReadingAspectSchema = z
  .object({
    key: DailyAspectKeySchema,
    title: z.string().trim().min(1),
    guidance: z.string().trim().min(1),
    evidenceKeys: z.array(z.string().trim().min(1)).min(1),
  })
  .strict();
export type PersonalDailyReadingAspect = z.infer<
  typeof PersonalDailyReadingAspectSchema
>;

export const PersonalDailyReadingActionPlanSchema = z
  .object({
    recommendations: z.array(z.string().trim().min(1)).min(1),
    cautions: z.array(z.string().trim().min(1)).min(1),
    evidenceKeys: z.array(z.string().trim().min(1)).min(1),
  })
  .strict();
export type PersonalDailyReadingActionPlan = z.infer<
  typeof PersonalDailyReadingActionPlanSchema
>;

export const PersonalDailyReadingQualityGateSchema = z
  .object({
    passed: z.boolean(),
    checkedAt: z.string().trim().min(1),
    rulesChecked: z.array(z.string().trim().min(1)).min(1),
    violations: z.array(z.string().trim().min(1)).optional(),
  })
  .strict();
export type PersonalDailyReadingQualityGate = z.infer<
  typeof PersonalDailyReadingQualityGateSchema
>;

export const PersonalDailyReadingV1Schema = z
  .object({
    version: z.literal(1),
    chartId: z.string().trim().min(1),
    chartVersionId: z.string().trim().min(1),
    asOfDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    calendar: z
      .object({
        solarDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        solarDateFormatted: z.string().trim().min(1),
        lunarDateFormatted: z.string().trim().min(1),
        dayStemBranch: z.string().trim().min(1),
        solarTerm: z.string().trim().min(1),
      })
      .strict(),
    chartGrounding: z
      .object({
        touchedPalaceId: PalaceIdSchema,
        touchedPalaceName: z.string().trim().min(1),
        earthlyBranch: z.string().trim().min(1),
        majorStars: z.array(z.string().trim().min(1)),
        dailyStars: z.array(z.string().trim().min(1)),
        dailyMutagens: z.array(
          z
            .object({
              mutagen: z.enum(["loc", "quyen", "khoa", "ky"]),
              starName: z.string().trim().min(1),
            })
            .strict(),
        ),
      })
      .strict(),
    reading: z
      .object({
        headline: z.string().trim().min(1),
        overview: z.string().trim().min(1),
        aspects: z.array(PersonalDailyReadingAspectSchema).length(4),
        actionPlan: PersonalDailyReadingActionPlanSchema,
      })
      .strict(),
    evidenceKeys: z.array(z.string().trim().min(1)).min(1),
    qualityGate: PersonalDailyReadingQualityGateSchema,
  })
  .strict();

export type PersonalDailyReadingV1 = z.infer<
  typeof PersonalDailyReadingV1Schema
>;
