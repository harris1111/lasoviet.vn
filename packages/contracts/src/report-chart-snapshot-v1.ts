import { z } from "zod";

import { ZIWEI_PALACE_IDS } from "./ziwei-comprehensive-report-v1.js";

// Display-only projection of a report's frozen chart (FD-104). Canonical IDs
// only; labels are resolved by the web. Never carries birth date, time or place.

const PalaceId = z.enum(ZIWEI_PALACE_IDS);
const Year = z.number().int();
const Age = z.number().int().positive();

export const ReportChartStarV1Schema = z
  .object({
    starId: z.string().regex(/^ziwei\.star\.[a-z0-9-]+$/),
    kind: z.enum(["main", "aux"]),
    brightnessId: z.string().regex(/^ziwei\.brightness\.[a-z]+$/).optional(),
    transformationId: z.string().regex(/^ziwei\.transformation\.[a-z]+$/).optional(),
  })
  .strict();

export const ReportChartPalaceV1Schema = z
  .object({
    palaceId: PalaceId,
    earthlyBranchId: z.string().regex(/^ziwei\.branch\.[a-z]+$/),
    heavenlyStemId: z.string().regex(/^ziwei\.stem\.[a-z0-9-]+$/).optional(),
    cycleStateId: z.string().regex(/^ziwei\.cycle\.[a-z0-9-]+$/).optional(),
    isLife: z.boolean(),
    isBody: z.boolean(),
    triadPalaceIds: z.tuple([PalaceId, PalaceId]),
    oppositePalaceId: PalaceId,
    stars: z.array(ReportChartStarV1Schema),
  })
  .strict();

export const ReportDecadalCycleV1Schema = z
  .object({
    ordinal: z.number().int().nonnegative(),
    palaceId: PalaceId,
    ageRange: z.tuple([Age, Age]),
    yearRange: z.tuple([Year, Year]),
  })
  .strict();

export const ReportChartSnapshotV1Schema = z
  .object({
    version: z.literal(1),
    palaces: z.array(ReportChartPalaceV1Schema).length(12),
    decadal: z
      .object({
        currentOrdinal: z.number().int().nonnegative().nullable(),
        cycles: z.array(ReportDecadalCycleV1Schema).max(12),
      })
      .strict(),
    annual: z.object({ targetYear: Year, palaceId: PalaceId }).strict(),
  })
  .strict();

export type ReportChartStarV1 = z.infer<typeof ReportChartStarV1Schema>;
export type ReportChartPalaceV1 = z.infer<typeof ReportChartPalaceV1Schema>;
export type ReportDecadalCycleV1 = z.infer<typeof ReportDecadalCycleV1Schema>;
export type ReportChartSnapshotV1 = z.infer<typeof ReportChartSnapshotV1Schema>;
