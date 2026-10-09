import { z } from "zod";
import { NormalizedZiweiChartV1Schema } from "./normalized-ziwei-chart-v1.js";
import { ZiweiDecadalCycleV1Schema, ZiweiHoroscopeResultV1Schema } from "./ziwei-horoscope-v1.js";

/** Private factual input; paid text, ownership and manual acceptance are separate. */
export const ZiweiDecadalReadingSourceV1Schema = z.object({
  version: z.literal(1), sourceVersion: z.literal("ziwei.decadal-reading.source.v1"),
  status: z.literal("draft_source"), manualAccepted: z.literal(false), calendar: z.literal("lunar"),
  asOfDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  lunarYear: z.number().int(), selection: z.enum(["current", "next"]),
  currentOrdinal: z.number().int().min(0).max(11),
  direction: z.enum(["forward", "reverse"]),
  lineage: z.object({chartId: z.string().trim().min(1), chartVersionId: z.string().trim().min(1),
    inputHash: z.string().regex(/^[a-f0-9]{64}$/), configHash: z.string().regex(/^[a-f0-9]{64}$/),
    rawSnapshotHash: z.string().regex(/^[a-f0-9]{64}$/)}).strict(),
  chart: NormalizedZiweiChartV1Schema,
  metadata: ZiweiHoroscopeResultV1Schema.shape.chartMetadata.unwrap(),
  cycle: ZiweiDecadalCycleV1Schema.refine(cycle => cycle.structuralScore !== undefined,
    {message: "A decade requires the published natal-palace structural score"}),
  evidenceKeys: z.array(z.string().min(1)).min(1),
  sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
}).strict().superRefine((source, ctx) => {
  const expectedOrdinal = source.currentOrdinal + (source.selection === "next" ? 1 : 0);
  const provenance = source.chart.provenance;
  if (source.cycle.ordinal !== expectedOrdinal ||
      source.cycle.state !== (source.selection === "current" ? "current" : "future") ||
      (source.selection === "current" ? source.lunarYear < source.cycle.startYear || source.lunarYear > source.cycle.endYear
        : source.lunarYear >= source.cycle.startYear) ||
      source.chart.provisional === true || ["unknown", "range"].includes(source.chart.timePrecision ?? "") ||
      source.lineage.inputHash !== provenance.inputHash || source.lineage.configHash !== provenance.configHash ||
      source.lineage.rawSnapshotHash !== provenance.rawSnapshotHash) {
    ctx.addIssue({code: "custom", message: "Decadal source must retain selected cycle and natal lineage"});
  }
});
export type ZiweiDecadalReadingSourceV1 = z.infer<typeof ZiweiDecadalReadingSourceV1Schema>;
