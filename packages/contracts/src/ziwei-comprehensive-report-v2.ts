import { z } from "zod";
import {
  ZIWEI_PALACE_IDS,
  ZIWEI_THEMATIC_SYNTHESIS_IDS,
  type ZiweiThematicSynthesisId,
} from "./ziwei-comprehensive-report-v1.js";
import type { ZiweiPalaceId } from "./normalized-ziwei-chart-v1.js";

const narrativeSectionSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    narrative: z.string().trim().min(1).max(5_000),
    evidenceKeys: z.array(z.string().trim().min(1)).min(1),
  })
  .strict();

const keyConfigurationItemSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    narrative: z.string().trim().min(1).max(5_000),
    evidenceKeys: z.array(z.string().trim().min(1)).min(1),
  })
  .strict();

const palaceReadingItemSchema = z
  .object({
    palaceId: z.enum(ZIWEI_PALACE_IDS),
    title: z.string().trim().min(1).max(120),
    narrative: z.string().trim().min(1).max(5_000),
    evidenceKeys: z.array(z.string().trim().min(1)).min(1),
  })
  .strict();

const thematicSynthesisItemSchema = z
  .object({
    id: z.enum(ZIWEI_THEMATIC_SYNTHESIS_IDS),
    title: z.string().trim().min(1).max(120),
    narrative: z.string().trim().min(1).max(5_000),
    evidenceKeys: z.array(z.string().trim().min(1)).min(1),
  })
  .strict();

export const ZiweiComprehensiveReportActionItemV2Schema = z
  .object({
    recommendation: z.string().trim().min(1).max(5_000),
    rationale: z.string().trim().min(1).max(5_000),
    avoid: z.string().trim().min(1).max(5_000),
    evidenceKeys: z.array(z.string().trim().min(1)).min(1),
  })
  .strict();
export type ZiweiComprehensiveReportActionItemV2 = z.infer<
  typeof ZiweiComprehensiveReportActionItemV2Schema
>;

export const ZiweiComprehensiveReportBirthTimeSensitivityV2Schema = z
  .object({
    title: z.string().trim().min(1).max(120),
    stableFactors: narrativeSectionSchema,
    sensitiveFactors: narrativeSectionSchema,
  })
  .strict();
export type ZiweiComprehensiveReportBirthTimeSensitivityV2 = z.infer<
  typeof ZiweiComprehensiveReportBirthTimeSensitivityV2Schema
>;

export const ZiweiComprehensiveReportCurrentDecadalActiveV2Schema = z
  .object({
    title: z.string().trim().min(1).max(120),
    state: z.literal("active"),
    index: z.number().int().nonnegative(),
    ageRange: z.tuple([
      z.number().int().positive(),
      z.number().int().positive(),
    ]),
    yearRange: z.tuple([
      z.number().int(),
      z.number().int(),
    ]),
    narrative: z.string().trim().min(1).max(5_000),
    evidenceKeys: z.array(z.string().trim().min(1)).min(1),
  })
  .strict()
  .superRefine((decadal, ctx) => {
    const [ageMin, ageMax] = decadal.ageRange;
    if (ageMax - ageMin !== 9) {
      ctx.addIssue({
        code: "custom",
        path: ["ageRange"],
        message: `currentDecadal ageRange must span exactly 10 inclusive values (end - start === 9), got [${ageMin}, ${ageMax}]`,
      });
    }
    const [yearMin, yearMax] = decadal.yearRange;
    if (yearMax - yearMin !== 9) {
      ctx.addIssue({
        code: "custom",
        path: ["yearRange"],
        message: `currentDecadal yearRange must span exactly 10 inclusive values (end - start === 9), got [${yearMin}, ${yearMax}]`,
      });
    }
  });
export type ZiweiComprehensiveReportCurrentDecadalActiveV2 = z.infer<
  typeof ZiweiComprehensiveReportCurrentDecadalActiveV2Schema
>;

export const ZiweiComprehensiveReportCurrentDecadalNotStartedV2Schema = z
  .object({
    title: z.string().trim().min(1).max(120),
    state: z.literal("not_started"),
    firstCycleStartAge: z.number().int().positive(),
    firstCycleStartYear: z.number().int(),
    narrative: z.string().trim().min(1).max(5_000),
    evidenceKeys: z.array(z.string().trim().min(1)).min(1),
  })
  .strict();
export type ZiweiComprehensiveReportCurrentDecadalNotStartedV2 = z.infer<
  typeof ZiweiComprehensiveReportCurrentDecadalNotStartedV2Schema
>;

export const ZiweiComprehensiveReportCurrentDecadalV2Schema = z.discriminatedUnion("state", [
  ZiweiComprehensiveReportCurrentDecadalActiveV2Schema,
  ZiweiComprehensiveReportCurrentDecadalNotStartedV2Schema,
]);
export type ZiweiComprehensiveReportCurrentDecadalV2 = z.infer<
  typeof ZiweiComprehensiveReportCurrentDecadalV2Schema
>;

export const ZiweiComprehensiveReportAnnualSnapshotV2Schema = z
  .object({
    title: z.string().trim().min(1).max(120),
    targetYear: z.number().int(),
    asOfDate: z.iso.date(),
    narrative: z.string().trim().min(1).max(5_000),
    evidenceKeys: z.array(z.string().trim().min(1)).min(1),
  })
  .strict()
  .superRefine((annual, ctx) => {
    const asOfDateYear = parseInt(annual.asOfDate.slice(0, 4), 10);
    if (annual.targetYear !== asOfDateYear) {
      ctx.addIssue({
        code: "custom",
        path: ["targetYear"],
        message: `annualSnapshot targetYear (${annual.targetYear}) must match asOfDate year (${asOfDateYear})`,
      });
    }
  });
export type ZiweiComprehensiveReportAnnualSnapshotV2 = z.infer<
  typeof ZiweiComprehensiveReportAnnualSnapshotV2Schema
>;

export const ZiweiComprehensiveReportContentV2Schema = z
  .object({
    overview: narrativeSectionSchema,
    coreAxis: narrativeSectionSchema,
    keyConfigurations: z.array(keyConfigurationItemSchema).min(1).max(12),
    palaceReadings: z.array(palaceReadingItemSchema).length(ZIWEI_PALACE_IDS.length),
    thematicSynthesis: z.array(thematicSynthesisItemSchema).length(ZIWEI_THEMATIC_SYNTHESIS_IDS.length),
    strengthsAndTensions: narrativeSectionSchema,
    currentDecadal: ZiweiComprehensiveReportCurrentDecadalV2Schema,
    annualSnapshot: ZiweiComprehensiveReportAnnualSnapshotV2Schema,
    practicalDirection: z.array(ZiweiComprehensiveReportActionItemV2Schema).min(3).max(5),
  })
  .strict()
  .superRefine((report, ctx) => {
    for (let i = 0; i < report.palaceReadings.length; i++) {
      const reading = report.palaceReadings[i]!;
      const expectedPalaceId = ZIWEI_PALACE_IDS[i]!;
      if (reading.palaceId !== expectedPalaceId) {
        ctx.addIssue({
          code: "custom",
          path: ["palaceReadings", i, "palaceId"],
          message: `palaceReading at index ${i} must match canonical palace ID ${expectedPalaceId}, got ${reading.palaceId}`,
        });
      }
    }

    for (let i = 0; i < report.thematicSynthesis.length; i++) {
      const theme = report.thematicSynthesis[i]!;
      const expectedThemeId = ZIWEI_THEMATIC_SYNTHESIS_IDS[i]!;
      if (theme.id !== expectedThemeId) {
        ctx.addIssue({
          code: "custom",
          path: ["thematicSynthesis", i, "id"],
          message: `thematicSynthesis at index ${i} must match canonical theme ID ${expectedThemeId}, got ${theme.id}`,
        });
      }
    }
  });

export type ZiweiComprehensiveReportContentV2 = z.infer<
  typeof ZiweiComprehensiveReportContentV2Schema
>;
