import { z } from "zod";
import { BAZI_STEM_IDS, BAZI_BRANCH_IDS } from "./bazi-facts-v1.js";
import { BAZI_ELEMENT_IDS, BAZI_TEN_GOD_IDS } from "./bazi-structure-v1.js";
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const stem = z.enum(BAZI_STEM_IDS), branch = z.enum(BAZI_BRANCH_IDS), god = z.enum(BAZI_TEN_GOD_IDS);
const year = z.number().int().min(1899).max(2250);
const preCycle = z.object({index: z.literal(0), state: z.enum(["empty", "pre_cycle"]),
  startYear: year, endYear: year, startAge: z.literal(1), endAge: z.number().int().min(0).max(12),
}).strict();
const cycle = z.object({index: z.number().int().min(1).max(10), startYear: year, endYear: year,
  startAge: z.number().int().min(1).max(120), endAge: z.number().int().min(1).max(130),
  stemId: stem, branchId: branch, stemElement: z.enum(BAZI_ELEMENT_IDS), branchElement: z.enum(BAZI_ELEMENT_IDS),
  stemTenGod: god, hiddenStems: z.array(z.object({stemId: stem, tenGod: god}).strict()).min(1).max(3),
  evidenceKeys: z.array(z.string().min(1)).min(4).max(4),
}).strict();
export const BaziDecadalSourceV1Schema = z.object({version: z.literal(1), systemId: z.literal("bazi"),
  sourceVersion: z.literal("bazi.decadal.source.v1"), status: z.literal("draft_source"), manualAccepted: z.literal(false),
  engineVersion: z.literal("lunar-typescript1.8.6"), methodId: z.literal("bazi.yun.vendor-minute-sect2.v1"),
  yunSect: z.literal(2), solarTermsOffsetMinutes: z.literal(480),
  calendar: z.literal("vendor-civil-year-and-counting-age"), gender: z.enum(["male", "female"]),
  lineage: z.object({inputHash: hash, configHash: hash, rawSnapshotHash: hash}).strict(),
  yearPillar: z.object({stemId: stem, branchId: branch}).strict(),
  monthPillar: z.object({stemId: stem, branchId: branch}).strict(), dayMasterStemId: stem,
  direction: z.enum(["forward", "reverse"]),
  firstStartSolarUtc8: z.iso.datetime({offset: true}).refine(value => value.endsWith("+08:00")),
  preCycle, cycles: z.array(cycle).length(10), sourceHash: hash,
}).strict().superRefine((value, ctx) => {
  const fail = (message: string) => ctx.addIssue({code: "custom", message});
  const forward = (BAZI_STEM_IDS.indexOf(value.yearPillar.stemId) % 2 === 0) === (value.gender === "male");
  if ((value.direction === "forward") !== forward) fail("Direction differs from explicit gender/year stem");
  const first = value.cycles[0]!;
  if (first.index !== 1 || first.startYear !== Number(value.firstStartSolarUtc8.slice(0,4)) ||
    value.preCycle.endYear !== first.startYear - 1 || value.preCycle.endAge !== first.startAge - 1 ||
    first.startYear - value.preCycle.startYear + 1 !== first.startAge ||
    (value.preCycle.state === "empty") !== (value.preCycle.endAge === 0) ||
    value.preCycle.endYear - value.preCycle.startYear + 1 !== value.preCycle.endAge) fail("Pre-cycle lineage differs");
  for (let i = 0; i < value.cycles.length; i++) {
    const row = value.cycles[i]!;
    if (row.index !== i + 1 || row.startYear !== first.startYear + 10*i || row.startAge !== first.startAge + 10*i ||
      row.endYear !== row.startYear + 9 || row.endAge !== row.startAge + 9 ||
      new Set(row.evidenceKeys).size !== 4 || new Set(row.hiddenStems.map(s => s.stemId)).size !== row.hiddenStems.length) fail("Decadal rows differ");
    const delta = forward ? row.index : -row.index;
    if (row.stemId !== BAZI_STEM_IDS[(BAZI_STEM_IDS.indexOf(value.monthPillar.stemId) + delta + 20) % 10] ||
      row.branchId !== BAZI_BRANCH_IDS[(BAZI_BRANCH_IDS.indexOf(value.monthPillar.branchId) + delta + 24) % 12]) fail("Cycle pillar differs from month/direction");
  }
});
export type BaziDecadalSourceV1 = z.infer<typeof BaziDecadalSourceV1Schema>;
