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

const TemporalTransformationSchema = z.object({
  starId: z.string().regex(/^ziwei\.star\./),
  transformationId: z.enum(["ziwei.transformation.prosperity", "ziwei.transformation.power", "ziwei.transformation.fame", "ziwei.transformation.obstacle"]),
}).strict();
export const ZiweiDecadalCycleV1Schema = z.object({
  ordinal: z.number().int().min(0).max(11), palaceId: PalaceIdSchema,
  startAge: z.number().int().positive(), endAge: z.number().int().positive(),
  startYear: z.number().int(), endYear: z.number().int(),
  state: z.enum(["past", "current", "future"]),
  transformations: z.array(TemporalTransformationSchema).length(4),
  annualPalaces: z.array(z.object({ year: z.number().int(), age: z.number().int().positive(),
    palaceId: PalaceIdSchema, transformations: z.array(TemporalTransformationSchema).length(4) }).strict()).length(10),
  structuralScore: z.object({ value: z.number().int().min(0).max(100),
    band: z.enum(["manh", "thuan", "can", "canh", "kho"]),
    parts: z.object({ base: z.number(), own: z.number(), chieu: z.number() }).strict(),
    formulaVersion: z.literal("fd107-fd111-v1") }).strict().optional(),
}).strict().superRefine((cycle, ctx) => {
  if (cycle.endAge !== cycle.startAge + 9 || cycle.endYear !== cycle.startYear + 9 ||
      cycle.annualPalaces.some((annual, i) => annual.year !== cycle.startYear + i || annual.age !== cycle.startAge + i)) {
    ctx.addIssue({ code: "custom", message: "Cycle must preserve ten consecutive lunar ages and years" });
  }
});

export type ZiweiDecadalCycleV1 = z.infer<typeof ZiweiDecadalCycleV1Schema>;

const purchaseDecade = z.object({
  ordinal: z.number().int().min(0).max(11), palaceId: PalaceIdSchema,
  startAge: z.number().int().positive(), endAge: z.number().int().positive(),
  startYear: z.number().int(), endYear: z.number().int(),
}).strict().refine(span => span.endAge === span.startAge + 9 && span.endYear === span.startYear + 9);

export const ZiweiPurchaseFactsV1Schema = z.object({
  version: z.literal(1), lunarYear: z.number().int(),
  lunarMonth: z.object({ number: z.number().int().min(1).max(12), isLeap: z.boolean() }).strict(),
  // Complete calendar month intervals strictly after the current interval.
  // A future leap month counts separately; the current partial month is excluded.
  remainingLunarMonths: z.number().int().min(0).max(12),
  nearYearEndThreshold: z.number().int().min(0).max(12), nearYearEnd: z.boolean(),
  provisional: z.boolean(),
  currentDecade: z.object({ span: purchaseDecade,
    yearInCycle: z.number().int().min(1).max(10), remainingYears: z.number().int().min(0).max(9),
  }).strict().nullable(),
  nextDecade: purchaseDecade.nullable(),
  annualPalaces: z.array(z.object({ year: z.number().int(), palaceId: PalaceIdSchema }).strict()).length(2),
}).strict().superRefine((value, ctx) => {
  const current = value.currentDecade;
  if (value.nearYearEnd !== (value.remainingLunarMonths <= value.nearYearEndThreshold) ||
      value.annualPalaces.some((annual, i) => annual.year !== value.lunarYear + i) ||
      (current && (current.yearInCycle !== value.lunarYear - current.span.startYear + 1 ||
        current.remainingYears !== 10 - current.yearInCycle)) ||
      (value.nextDecade && (value.nextDecade.startYear <= value.lunarYear ||
        (current && (value.nextDecade.ordinal !== current.span.ordinal + 1 ||
          value.nextDecade.startYear !== current.span.endYear + 1 ||
          value.nextDecade.startAge !== current.span.endAge + 1))))) {
    ctx.addIssue({ code: "custom", message: "Purchase context must retain computed calendar and cycle relationships" });
  }
});
export type ZiweiPurchaseFactsV1 = z.infer<typeof ZiweiPurchaseFactsV1Schema>;

/** Computed tiểu hạn is distinct from the yearly/lưu niên palace. */
export const ZiweiMinorLimitV1Schema = z.object({
  version: z.literal(1),
  calculationVersion: z.literal("iztro-age-normal-v1"),
  targetYear: z.number().int().min(1900).max(2100),
  lunarAge: z.number().int().min(1).max(120),
  palaceId: PalaceIdSchema,
  provisional: z.boolean(),
  evidenceKeys: z.array(z.string()).length(2),
}).strict().superRefine((value, ctx) => {
  if (value.evidenceKeys[0] !== `minor.year.${value.targetYear}.lunar-age.${value.lunarAge}` ||
      value.evidenceKeys[1] !== `minor.palace.${value.palaceId}`) {
    ctx.addIssue({ code: "custom", message: "Minor limit evidence must match its computed facts" });
  }
});
export type ZiweiMinorLimitV1 = z.infer<typeof ZiweiMinorLimitV1Schema>;

export const ZiweiHoroscopeResultV1Schema = z
  .object({
    version: z.literal(1),
    chartId: z.string().trim().min(1),
    chartVersionId: z.string().trim().min(1),
    asOfDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    isUnlocked: z.boolean(),
    yearly: ZiweiYearlyHanV1Schema,
    minorLimit: ZiweiMinorLimitV1Schema.optional(),
    daily: ZiweiDailyHoroscopeV1Schema,
    purchaseFacts: ZiweiPurchaseFactsV1Schema.optional(),
    decadalCycles: z.array(ZiweiDecadalCycleV1Schema).length(12).optional(),
    currentDecadalOrdinal: z.number().int().min(0).max(11).nullable().optional(),
    decadalDirection: z.enum(["forward", "reverse"]).optional(),
    chartMetadata: z.object({
      bureau: z.enum(["water2", "wood3", "metal4", "earth5", "fire6"]),
      lifeMasterStarId: z.string().regex(/^ziwei\.star\./), bodyMasterStarId: z.string().regex(/^ziwei\.star\./),
      naYinCycleIndex: z.number().int().min(0).max(29),
    }).strict().optional(),
    decadal: z.object({ palaceId: PalaceIdSchema, startAge: z.number().int().min(1), endAge: z.number().int().min(1), startYear: z.number().int(), endYear: z.number().int() }).strict().refine(value => value.endAge === value.startAge + 9 && value.endYear === value.startYear + 9).optional(),
  })
  .strict().superRefine((value, ctx) => {
    const minor = value.minorLimit;
    if (minor && (minor.targetYear !== value.yearly.targetYear || minor.lunarAge !== value.yearly.lunarAge ||
        (value.purchaseFacts && minor.provisional !== value.purchaseFacts.provisional))) {
      ctx.addIssue({ code: "custom", message: "Minor limit must retain selected year, age and uncertainty" });
    }
  });

export type ZiweiHoroscopeResultV1 = z.infer<typeof ZiweiHoroscopeResultV1Schema>;
