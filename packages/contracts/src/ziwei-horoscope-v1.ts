import { z } from "zod";

import { PalaceIdSchema, type ZiweiPalaceId } from "./normalized-ziwei-chart-v1.js";
import { ZIWEI_BRANCH_IDS, type ZiweiBranchId } from "./ziwei-report-snapshot-v1.js";

export const ZiweiBranchIdSchema = z.enum(ZIWEI_BRANCH_IDS);

export const ZiweiMonthMarkerSchema = z.enum(["warn", "good", "neutral"]);
export type ZiweiMonthMarker = z.infer<typeof ZiweiMonthMarkerSchema>;

export const ZiweiMonthlyHanV1Schema = z
  .object({
    monthIndex: z.number().int().min(1).max(12),
    marker: ZiweiMonthMarkerSchema,
    isLocked: z.boolean(),
    monthNumberDisplay: z.string().min(1),
    label: z.string().min(1),
    palaceId: PalaceIdSchema.optional(),
    palaceName: z.string().min(1).optional(),
    earthlyBranch: z.string().min(1).optional(),
    heavenlyStem: z.string().min(1).optional(),
    primaryFocus: z.string().min(1).optional(),
    preparationText: z.string().min(1).optional(),
    evidenceKeys: z.array(z.string().min(1)),
  })
  .strict();

export type ZiweiMonthlyHanV1 = z.infer<typeof ZiweiMonthlyHanV1Schema>;

export const ZiweiYearlyHanV1Schema = z
  .object({
    targetYear: z.number().int().min(1900).max(2100),
    lunarYear: z.string().min(1),
    lunarAge: z.number().int().min(1).max(120),
    annualPalaceId: PalaceIdSchema,
    annualPalaceName: z.string().min(1),
    annualBranch: z.string().min(1),
    annualStem: z.string().min(1),
    hanMonthCount: z.number().int().min(0).max(12),
    favorableMonthCount: z.number().int().min(0).max(12),
    neutralMonthCount: z.number().int().min(0).max(12),
    focusAreas: z.array(z.string().min(1)),
    summary: z.string().min(1),
    months: z.array(ZiweiMonthlyHanV1Schema).length(12),
    evidenceKeys: z.array(z.string().min(1)),
  })
  .strict();

export type ZiweiYearlyHanV1 = z.infer<typeof ZiweiYearlyHanV1Schema>;

export const ZiweiDailyHoroscopeV1Schema = z
  .object({
    solarDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    solarDateFormatted: z.string().min(1),
    lunarDateFormatted: z.string().min(1),
    dayStemBranch: z.string().min(1),
    solarTerm: z.string().min(1),
    touchedPalaceId: PalaceIdSchema,
    touchedPalaceName: z.string().min(1),
    headline: z.string().min(1),
    evidenceKeys: z.array(z.string().min(1)),
  })
  .strict();

export type ZiweiDailyHoroscopeV1 = z.infer<typeof ZiweiDailyHoroscopeV1Schema>;

export const ZiweiHoroscopeResultV1Schema = z
  .object({
    version: z.literal(1),
    chartId: z.string().trim().min(1),
    chartVersionId: z.string().trim().min(1),
    asOfDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    isUnlocked: z.boolean(),
    yearly: ZiweiYearlyHanV1Schema,
    daily: ZiweiDailyHoroscopeV1Schema,
  })
  .strict();

export type ZiweiHoroscopeResultV1 = z.infer<typeof ZiweiHoroscopeResultV1Schema>;
