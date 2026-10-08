import { z } from "zod";
export const BAZI_STEM_IDS = ["bazi.stem.jia", "bazi.stem.yi", "bazi.stem.bing", "bazi.stem.ding", "bazi.stem.wu", "bazi.stem.ji", "bazi.stem.geng", "bazi.stem.xin", "bazi.stem.ren", "bazi.stem.gui"] as const;
export const BAZI_BRANCH_IDS = ["bazi.branch.rat", "bazi.branch.ox", "bazi.branch.tiger", "bazi.branch.rabbit", "bazi.branch.dragon", "bazi.branch.snake", "bazi.branch.horse", "bazi.branch.goat", "bazi.branch.monkey", "bazi.branch.rooster", "bazi.branch.dog", "bazi.branch.pig"] as const;
export const BaziFactsInputV1Schema = z.object({
  localSolarDate: z.iso.date().refine(date => Number(date.slice(0,4)) >= 1900 && Number(date.slice(0,4)) <= 2100),
  localTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/).nullable(),
  offsetMinutes: z.number().int().min(-720).max(840),
}).strict();
export type BaziFactsInputV1 = z.infer<typeof BaziFactsInputV1Schema>;
const candidate = z.object({ stemId: z.enum(BAZI_STEM_IDS), branchId: z.enum(BAZI_BRANCH_IDS),
  hiddenStemIds: z.array(z.enum(BAZI_STEM_IDS)).min(1).max(3) }).strict();
export const BaziFactsV1Schema = z.object({
  version: z.literal(1), systemId: z.literal("bazi"),
  engineVersion: z.literal("lunar-typescript1.8.6"), ruleVersion: z.literal("bazi.vendor-civil-midnight.v1"),
  inputHash: z.string().regex(/^[a-f0-9]{64}$/),
  timing: z.object({ solarTermsOffsetMinutes: z.literal(480), localOffsetMinutes: z.number().int().min(-720).max(840),
    yearBoundary: z.literal("li-chun"), monthBoundary: z.literal("solar-terms"), dayBoundary: z.literal("local-midnight"),
    trueSolarCorrection: z.literal(false) }).strict(),
  pillars: z.object({ year: z.array(candidate).min(1).max(2), month: z.array(candidate).min(1).max(2),
    day: z.array(candidate).min(1).max(2), hour: candidate.nullable() }).strict(),
  limitations: z.array(z.enum(["BAZI_NO_TRUE_SOLAR_TIME_CORRECTION", "BAZI_HOUR_UNKNOWN", "BAZI_SOLAR_TERM_TIME_UNCERTAIN"])),
  evidence: z.array(z.object({ key: z.string().min(1), pillar: z.enum(["year","month","day","hour"]),
    variant: z.number().int().min(0).max(1), stemId: z.enum(BAZI_STEM_IDS), branchId: z.enum(BAZI_BRANCH_IDS) }).strict()).min(3).max(7),
}).strict();
export type BaziFactsV1 = z.infer<typeof BaziFactsV1Schema>;
