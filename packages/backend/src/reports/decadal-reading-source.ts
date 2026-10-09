import { createHash } from "node:crypto";
import { NormalizedBirthProfileV1Schema, NormalizedZiweiChartV1Schema,
  ZiweiDecadalReadingSourceV1Schema, ZiweiHoroscopeResultV1Schema,
  type NormalizedBirthProfileV1, type NormalizedZiweiChartV1, type ZiweiDecadalReadingSourceV1 } from "@lasoviet/contracts";
import { calculateZiweiHoroscope, IztroAdapter, iztroDefaultConfig } from "@lasoviet/engine-adapters";
import { computeNormalizedPalaceScores } from "./structural-palace-score.js";

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).filter(key => record[key] !== undefined).sort()
      .map(key => `${JSON.stringify(key)}:${canonical(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}
function natalBinding(chart: NormalizedZiweiChartV1) {
  const {calculatedAt: _calculatedAt, ...provenance} = chart.provenance;
  return {...chart, provenance};
}

/** Trusted callers must authorize the stored profile/chart IDs before invocation.
 * Recalculation binds the actual normalized revision and pinned vendor output.
 * This does not grant actor access, persist data or accept a paid report. */
export async function buildDecadalReadingSource(input: {
  chartId: string; chartVersionId: string; birthProfile: NormalizedBirthProfileV1;
  storedChart: NormalizedZiweiChartV1; asOfDate: string; selection: "current" | "next";
}): Promise<ZiweiDecadalReadingSourceV1> {
  const profile = NormalizedBirthProfileV1Schema.parse(input.birthProfile);
  const chart = NormalizedZiweiChartV1Schema.parse(input.storedChart);
  const date = new Date(`${input.asOfDate}T00:00:00Z`);
  if (!input.chartId.trim() || !input.chartVersionId.trim() ||
      !/^\d{4}-\d{2}-\d{2}$/.test(input.asOfDate) || !Number.isFinite(date.getTime()) ||
      date.toISOString().slice(0, 10) !== input.asOfDate ||
      !["current", "next"].includes(input.selection)) throw new Error("DECADAL_SOURCE_INPUT_INVALID");
  if (["unknown", "range"].includes(profile.normalizedTime.precision) || chart.provisional === true ||
      ["unknown", "range"].includes(chart.timePrecision ?? "")) throw new Error("DECADAL_SOURCE_PROVISIONAL");
  const natal = await new IztroAdapter().calculate({birthProfile: profile}, iztroDefaultConfig);
  if (!natal.ok || canonical(natalBinding(natal.output)) !== canonical(natalBinding(chart))) {
    throw new Error("DECADAL_SOURCE_NATAL_MISMATCH");
  }
  const horoscope = ZiweiHoroscopeResultV1Schema.parse(calculateZiweiHoroscope(profile,
    {chartId: input.chartId, chartVersionId: input.chartVersionId, asOfDate: input.asOfDate}));
  const current = horoscope.currentDecadalOrdinal;
  if (current === null || current === undefined || !horoscope.decadalCycles || !horoscope.decadalDirection || !horoscope.chartMetadata) {
    throw new Error("DECADAL_SOURCE_NOT_STARTED");
  }
  const selected = horoscope.decadalCycles.find(cycle => cycle.ordinal === current + (input.selection === "next" ? 1 : 0));
  if (!selected) throw new Error("DECADAL_SOURCE_CYCLE_UNAVAILABLE");
  const score = computeNormalizedPalaceScores(chart).get(selected.palaceId);
  if (!score) throw new Error("DECADAL_SOURCE_SCORE_UNAVAILABLE");
  const source = {
    version: 1 as const, sourceVersion: "ziwei.decadal-reading.source.v1" as const,
    status: "draft_source" as const, manualAccepted: false as const, calendar: "lunar" as const,
    asOfDate: input.asOfDate, lunarYear: horoscope.yearly.targetYear, selection: input.selection,
    currentOrdinal: current, direction: horoscope.decadalDirection,
    lineage: {chartId: input.chartId, chartVersionId: input.chartVersionId,
      inputHash: chart.provenance.inputHash, configHash: chart.provenance.configHash, rawSnapshotHash: chart.provenance.rawSnapshotHash},
    chart, metadata: horoscope.chartMetadata,
    cycle: {...selected, structuralScore: {value: score.score, band: score.band, parts: {...score.parts}, formulaVersion: "fd107-fd111-v1" as const}},
    evidenceKeys: [`decadal.ordinal.${selected.ordinal}`, `decadal.palace.${selected.palaceId}`,
      "structural.formula.fd107-fd111-v1", ...selected.transformations.map(t => `decadal.transformation.${t.starId}.${t.transformationId}`),
      ...selected.annualPalaces.flatMap(annual => [`annual.year.${annual.year}.palace.${annual.palaceId}`,
        ...annual.transformations.map(t => `annual.year.${annual.year}.transformation.${t.starId}.${t.transformationId}`)])],
  };
  return ZiweiDecadalReadingSourceV1Schema.parse({...source,
    sourceHash: createHash("sha256").update(canonical(source)).digest("hex")});
}
