import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { Solar, LunarUtil } from "lunar-typescript";
import { BAZI_STEM_IDS, BAZI_BRANCH_IDS, BaziFactsInputV1Schema, BaziDecadalSourceV1Schema,
  type BaziFactsInputV1, type BaziDecadalSourceV1, type NormalizedBaziChartV1 } from "@lasoviet/contracts";
import { calculateNormalizedBaziChart, validateNormalizedBaziChart } from "./normalized-bazi-chart.js";
import { baziStemElement, baziBranchElement, baziTenGod } from "./lunar-bazi-structure.js";
const stems = "甲乙丙丁戊己庚辛壬癸", branches = "子丑寅卯辰巳午未申酉戌亥";
function pillar(raw: string) {
  const stemId = raw.length === 2 ? BAZI_STEM_IDS[stems.indexOf(raw[0]!)] : undefined;
  const branchId = raw.length === 2 ? BAZI_BRANCH_IDS[branches.indexOf(raw[1]!)] : undefined;
  if (!stemId || !branchId) throw new Error("BAZI_DECADAL_VENDOR_UNMAPPED");
  return {stemId, branchId};
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {const r = value as Record<string, unknown>;
    return `{${Object.keys(r).sort().map(key => `${JSON.stringify(key)}:${canonical(r[key])}`).join(",")}}`;}
  return JSON.stringify(value) ?? "null";
}

/** Pure private vendor source. Caller must authorize the stored input/chart/gender.
 * Separate draft Yun method; no normalized-v1 change or traditional acceptance. */
export function buildBaziDecadalSource(input: {resolvedInput: BaziFactsInputV1;
  storedChart: NormalizedBaziChartV1; gender?: "male" | "female"}): BaziDecadalSourceV1 {
  const resolved = BaziFactsInputV1Schema.parse(input.resolvedInput);
  const chart = validateNormalizedBaziChart(input.storedChart);
  const recomputed = calculateNormalizedBaziChart(resolved, new Date(chart.provenance.calculatedAt));
  if (!isDeepStrictEqual(chart, recomputed)) throw new Error("BAZI_DECADAL_SOURCE_MISMATCH");
  if (!resolved.localTime || chart.provisional || chart.structure.uncertainty.pillarAlternatives) throw new Error("BAZI_DECADAL_PRECISION_UNAVAILABLE");
  if (!["male", "female"].includes(input.gender ?? "")) throw new Error("BAZI_DECADAL_GENDER_UNAVAILABLE");
  const gender = input.gender!;
  const [year, month, day] = resolved.localSolarDate.split("-").map(Number) as [number, number, number];
  const [hour, minute] = resolved.localTime.split(":").map(Number) as [number, number];
  // Installed astronomy compares Jie at UTC+8; local day-master semantics stay
  // in the verified normalized chart rather than this terms-only carrier.
  const termsAt = new Date(Date.UTC(year, month-1, day, hour, minute + 480 - resolved.offsetMinutes));
  const eight = Solar.fromYmdHms(termsAt.getUTCFullYear(), termsAt.getUTCMonth()+1, termsAt.getUTCDate(),
    termsAt.getUTCHours(), termsAt.getUTCMinutes(), 0).getLunar().getEightChar(); eight.setSect(2);
  const yearPillar = pillar(eight.getYear()), monthPillar = pillar(eight.getMonth());
  for (const [kind, actual] of [["year", yearPillar], ["month", monthPillar]] as const) {
    const stored = chart.facts.pillars[kind][0]!;
    if (stored.stemId !== actual.stemId || stored.branchId !== actual.branchId) throw new Error("BAZI_DECADAL_TERMS_MISMATCH");
  }
  const dayMasterStemId = chart.facts.pillars.day[0]!.stemId;
  const yun = eight.getYun(gender === "male" ? 1 : 0, 2), rows = yun.getDaYun(11), pre = rows[0]!;
  const anchors = (["year", "month", "day"] as const).map(kind => {
    const entry = chart.facts.evidence.find(e => e.pillar === kind && e.variant === 0);
    if (!entry) throw new Error("BAZI_DECADAL_EVIDENCE_MISSING"); return entry.key;
  });
  const cycles = rows.slice(1).map(row => {
    const p = pillar(row.getGanZhi());
    const hidden = LunarUtil.ZHI_HIDE_GAN[branches[BAZI_BRANCH_IDS.indexOf(p.branchId)]!]!;
    const hiddenStems = hidden.map(name => {
      const stemId = BAZI_STEM_IDS[stems.indexOf(name)]; if (!stemId) throw new Error("BAZI_DECADAL_VENDOR_UNMAPPED");
      return {stemId, tenGod: baziTenGod(dayMasterStemId, stemId)};
    });
    return {index: row.getIndex(), startYear: row.getStartYear(), endYear: row.getEndYear(),
      startAge: row.getStartAge(), endAge: row.getEndAge(), ...p,
      stemElement: baziStemElement(p.stemId), branchElement: baziBranchElement(p.branchId),
      stemTenGod: baziTenGod(dayMasterStemId, p.stemId), hiddenStems,
      evidenceKeys: [...anchors, `bazi.decadal.${row.getIndex()}.${p.stemId}.${p.branchId}`]};
  });
  const value = {version: 1 as const, systemId: "bazi" as const, sourceVersion: "bazi.decadal.source.v1" as const,
    status: "draft_source" as const, manualAccepted: false as const, engineVersion: "lunar-typescript1.8.6" as const,
    methodId: "bazi.yun.vendor-minute-sect2.v1" as const, yunSect: 2 as const, solarTermsOffsetMinutes: 480 as const,
    calendar: "vendor-civil-year-and-counting-age" as const, gender,
    lineage: {inputHash: chart.provenance.inputHash, configHash: chart.provenance.configHash, rawSnapshotHash: chart.provenance.rawSnapshotHash},
    yearPillar, monthPillar, dayMasterStemId, direction: yun.isForward() ? "forward" as const : "reverse" as const,
    firstStartSolarUtc8: `${yun.getStartSolar().toYmdHms().replace(" ", "T")}+08:00`,
    preCycle: {index: 0 as const, state: pre.getEndAge() === 0 ? "empty" as const : "pre_cycle" as const,
      startYear: pre.getStartYear(), endYear: pre.getEndYear(), startAge: 1 as const, endAge: pre.getEndAge()}, cycles};
  return BaziDecadalSourceV1Schema.parse({...value, sourceHash: createHash("sha256").update(canonical(value)).digest("hex")});
}
