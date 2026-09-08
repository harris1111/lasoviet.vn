import { z } from "zod";
import type { ZiweiPalaceId } from "./normalized-ziwei-chart-v1.js";

export const ZIWEI_PALACE_IDS = [
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

export const ZIWEI_THEMATIC_SYNTHESIS_IDS = [
  "career_wealth",
  "relationships_family",
  "social_environment",
  "wellbeing_inner_resources",
] as const;

export type ZiweiThematicSynthesisId = (typeof ZIWEI_THEMATIC_SYNTHESIS_IDS)[number];

const overviewSectionSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    narrative: z.string().trim().min(1).max(5_000),
    evidenceKeys: z.array(z.string().trim().min(1)).min(1),
  })
  .strict();

const coreAxisSectionSchema = z
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

const strengthsAndTensionsSectionSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    narrative: z.string().trim().min(1).max(5_000),
    evidenceKeys: z.array(z.string().trim().min(1)).min(1),
  })
  .strict();

export const ZiweiComprehensiveReportContentV1Schema = z
  .object({
    overview: overviewSectionSchema,
    coreAxis: coreAxisSectionSchema,
    keyConfigurations: z.array(keyConfigurationItemSchema).min(1).max(12),
    palaceReadings: z.array(palaceReadingItemSchema).length(ZIWEI_PALACE_IDS.length),
    thematicSynthesis: z.array(thematicSynthesisItemSchema).length(ZIWEI_THEMATIC_SYNTHESIS_IDS.length),
    strengthsAndTensions: strengthsAndTensionsSectionSchema,
    practicalDirection: z.array(z.string().trim().min(1).max(1_000)).min(1).max(10),
  })
  .strict()
  .superRefine((report, ctx) => {
    const seenPalaceIds = new Set<ZiweiPalaceId>();
    for (let i = 0; i < report.palaceReadings.length; i++) {
      const reading = report.palaceReadings[i]!;
      if (seenPalaceIds.has(reading.palaceId)) {
        ctx.addIssue({
          code: "custom",
          path: ["palaceReadings", i, "palaceId"],
          message: `Duplicate palace reading for palace: ${reading.palaceId}`,
        });
      }
      seenPalaceIds.add(reading.palaceId);
    }

    const seenThemeIds = new Set<ZiweiThematicSynthesisId>();
    for (let i = 0; i < report.thematicSynthesis.length; i++) {
      const theme = report.thematicSynthesis[i]!;
      if (seenThemeIds.has(theme.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["thematicSynthesis", i, "id"],
          message: `Duplicate thematic synthesis for ID: ${theme.id}`,
        });
      }
      seenThemeIds.add(theme.id);
    }
  });

export type ZiweiComprehensiveReportContentV1 = z.infer<
  typeof ZiweiComprehensiveReportContentV1Schema
>;
