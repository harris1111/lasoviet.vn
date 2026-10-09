import { createHash } from "node:crypto";
import { NormalizedZiweiChartV1Schema, ReportSourceSnapshotV1Schema,
  type NormalizedZiweiChartV1, type ReportSourceSnapshotV1, type ZiweiPalaceId } from "@lasoviet/contracts";
import { buildComprehensiveZiweiFactsV4 } from "./comprehensive-ziwei-facts-v4.js";

export const ANNUAL_ROMANCE_SCOPE = {
  primary: ["ziwei.palace.spouse"],
  supporting: ["ziwei.palace.life", "ziwei.palace.fortune", "ziwei.palace.travel", "ziwei.palace.children"],
} as const;
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${canonical(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

// Trusted private callers supply the authorized stored chart and its frozen snapshot.
// Hashes detect inconsistent payloads; they do not prove ownership or vendor authenticity.
// This projects computed data, not relationship events, advice or manual acceptance.
export function buildAnnualRomanceSource(input: {
  chartId: string; chartVersionId: string; targetYear: number;
  chart: NormalizedZiweiChartV1; sourceSnapshot: ReportSourceSnapshotV1;
}) {
  const chart = NormalizedZiweiChartV1Schema.parse(input.chart);
  const frozen = ReportSourceSnapshotV1Schema.parse(input.sourceSnapshot);
  const annual = frozen.snapshot.timing.annual, periods = frozen.snapshot.periodReading;
  if (chart.provisional === true || chart.timePrecision === "unknown" || chart.timePrecision === "range") {
    throw new Error("ANNUAL_ROMANCE_SOURCE_PROVISIONAL");
  }
  if (!input.chartId || !input.chartVersionId || input.chartVersionId !== frozen.chartVersionId || input.targetYear !== frozen.targetYear ||
      !periods || periods.kind !== "annual" || periods.calendar !== "lunar" || periods.chartId !== input.chartId ||
      periods.chartVersionId !== input.chartVersionId || periods.targetYear !== input.targetYear ||
      periods.periodKey !== String(input.targetYear) || periods.asOfDate !== frozen.asOfDate ||
      new Set(periods.periods.map(p => p.month)).size !== 12 ||
      periods.periods.some(p => p.year !== input.targetYear)) throw new Error("ANNUAL_ROMANCE_SOURCE_LINEAGE_MISMATCH");
  // The annual role and the natal palace beneath it use different coordinates.
  // Bind their physical branch rather than incorrectly comparing their role IDs.
  const annualPhysical = annual.palaces.find(p => p.palaceId === annual.palaceId);
  const natalPhysical = chart.palaces.find(p => p.id === periods.annualPalaceId);
  if (!annualPhysical || !natalPhysical || annualPhysical.earthlyBranchId !== natalPhysical.earthlyBranchId) {
    throw new Error("ANNUAL_ROMANCE_SOURCE_LINEAGE_MISMATCH");
  }
  const {snapshotHash: _snapshotHash, ...unhashedProvenance} = frozen.snapshot.provenance;
  const hash = createHash("sha256").update(canonical({...frozen.snapshot, provenance: unhashedProvenance})).digest("hex");
  if (hash !== frozen.snapshotHash) throw new Error("ANNUAL_ROMANCE_SOURCE_HASH_MISMATCH");
  const facts = buildComprehensiveZiweiFactsV4(chart, frozen);
  const ids: readonly ZiweiPalaceId[] = [...ANNUAL_ROMANCE_SCOPE.primary, ...ANNUAL_ROMANCE_SCOPE.supporting];
  const natal = ids.map(id => {
    const palace = chart.palaces.find(p => p.id === id)!;
    return {palaceId: palace.id, earthlyBranchId: palace.earthlyBranchId,
      ...(palace.heavenlyStemId ? {heavenlyStemId: palace.heavenlyStemId} : {}),
      stars: palace.stars.map(star => ({...star})),
      transformations: chart.transformations.filter(t => palace.stars.some(s => s.id === t.starId)).map(t => ({...t}))};
  });
  const yearly = ids.map(id => {
    const palace = annual.palaces.find(p => p.palaceId === id)!;
    return {...palace, stars: palace.stars.map(star => ({...star})), transformations: palace.transformations.map(t => ({...t}))};
  });
  const natalSourceIds = new Set<string>(natal.flatMap(p => [p.palaceId, p.earthlyBranchId, ...(p.heavenlyStemId ? [p.heavenlyStemId] : []),
    ...p.stars.flatMap(s => [s.id, ...(s.brightness ? [s.brightness] : [])]), ...p.transformations.flatMap(t => [t.starId, t.id])]));
  const annualHeaders = new Set([`annual.target-year.${input.targetYear}`, `annual.palace.${annual.palaceId}`,
    `annual.stem.${annual.heavenlyStemId}`, `annual.branch.${annual.earthlyBranchId}`]);
  const evidence = facts.evidence.items.filter(item => item.dimension === "natal"
    ? item.sourceKeys.every(key => natalSourceIds.has(key))
    : item.dimension === "annual" && (annualHeaders.has(item.key) || ids.some(id => item.key.startsWith(`annual.palace.${id}.`))))
    .map(item => ({...item, sourceKeys: [...item.sourceKeys]}));
  if (!evidence.some(e => e.key === `annual.target-year.${input.targetYear}`) ||
      !evidence.some(e => e.key.startsWith("annual.palace.ziwei.palace.spouse."))) throw new Error("ANNUAL_ROMANCE_SOURCE_EVIDENCE_MISSING");
  return {version: 1 as const, status: "draft_source" as const, manualAccepted: false as const,
    sourceVersion: "ziwei.annual-romance.source.v1" as const, calendar: "lunar" as const,
    targetYear: input.targetYear, asOfDate: frozen.asOfDate,
    lineage: {chartId: input.chartId, chartVersionId: input.chartVersionId, reportVersionId: frozen.reportVersionId,
      snapshotHash: frozen.snapshotHash, timingRuleVersion: frozen.timingRuleVersion, sensitivityRuleVersion: frozen.sensitivityRuleVersion},
    scope: {primary: [...ANNUAL_ROMANCE_SCOPE.primary], supporting: [...ANNUAL_ROMANCE_SCOPE.supporting]},
    annualContext: {annualRolePalaceId: annual.palaceId, natalAnnualPalaceId: periods.annualPalaceId, heavenlyStemId: annual.heavenlyStemId, earthlyBranchId: annual.earthlyBranchId},
    natal, yearly, evidence};
}
export type AnnualRomanceSource = ReturnType<typeof buildAnnualRomanceSource>;
