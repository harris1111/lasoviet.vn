import { LunarUtil } from "lunar-typescript";
import { BAZI_BRANCH_IDS, BAZI_ELEMENT_IDS, BAZI_STEM_IDS, BaziFactsV1Schema, BaziStructureV1Schema,
  type BaziFactsV1, type BaziStructureV1, type BaziElementId, type BaziTenGodId } from "@lasoviet/contracts";
const stems = "甲乙丙丁戊己庚辛壬癸", branches = "子丑寅卯辰巳午未申酉戌亥";
const elements: Record<string, BaziElementId> = {木: "wood", 火: "fire", 土: "earth", 金: "metal", 水: "water"};
const gods: Record<string, BaziTenGodId> = {比肩: "peer", 劫财: "rob_wealth", 食神: "eating_god", 伤官: "hurting_officer",
  偏财: "indirect_wealth", 正财: "direct_wealth", 七杀: "seven_killings", 正官: "direct_officer", 偏印: "indirect_resource", 正印: "direct_resource"};
const rawStem = (id: typeof BAZI_STEM_IDS[number]) => stems[BAZI_STEM_IDS.indexOf(id)]!;
function element(value: string | undefined) {
  const mapped = value && elements[value]; if (!mapped) throw new Error("BAZI_VENDOR_ELEMENT_UNMAPPED"); return mapped;
}
export function baziStemElement(id: typeof BAZI_STEM_IDS[number]): BaziElementId {
  return element(LunarUtil.WU_XING_GAN[rawStem(id)]);
}
export function baziBranchElement(id: typeof BAZI_BRANCH_IDS[number]): BaziElementId {
  return element(LunarUtil.WU_XING_ZHI[branches[BAZI_BRANCH_IDS.indexOf(id)]!]);
}
export function baziTenGod(dayMaster: typeof BAZI_STEM_IDS[number], relative: typeof BAZI_STEM_IDS[number]): BaziTenGodId {
  const value = gods[LunarUtil.SHI_SHEN[rawStem(dayMaster) + rawStem(relative)]!];
  if (!value) throw new Error("BAZI_VENDOR_TEN_GOD_UNMAPPED"); return value;
}

/** Private deterministic inventory; makes no elemental-strength or compatibility assertion. */
export function buildBaziStructure(input: BaziFactsV1): BaziStructureV1 {
  const source = BaziFactsV1Schema.parse(input);
  const entries = (["year", "month", "day", "hour"] as const).flatMap(pillar => {
    const values = pillar === "hour" ? (source.pillars.hour ? [source.pillars.hour] : []) : source.pillars[pillar];
    return values.map((value, variant) => ({pillar, variant, value}));
  });
  if (source.evidence.length !== entries.length || new Set(source.evidence.map(item => item.key)).size !== entries.length) {
    throw new Error("BAZI_STRUCTURE_EVIDENCE_MISMATCH");
  }
  const keyFor = (entry: typeof entries[number]) => {
    const matches = source.evidence.filter(evidence => evidence.pillar === entry.pillar && evidence.variant === entry.variant &&
      evidence.stemId === entry.value.stemId && evidence.branchId === entry.value.branchId);
    if (matches.length !== 1) throw new Error("BAZI_STRUCTURE_EVIDENCE_MISMATCH"); return matches[0]!.key;
  };
  for (const entry of entries) {
    const names = LunarUtil.ZHI_HIDE_GAN[branches[BAZI_BRANCH_IDS.indexOf(entry.value.branchId)]!] ?? [];
    const expected = names.map(name => BAZI_STEM_IDS[stems.indexOf(name)]);
    if (!expected.length || expected.some(id => !id) || expected.length !== entry.value.hiddenStemIds.length ||
        expected.some((id, index) => id !== entry.value.hiddenStemIds[index])) {
      throw new Error("BAZI_STRUCTURE_HIDDEN_STEMS_MISMATCH");
    }
  }
  const bound = entries.map(entry => ({...entry, key: keyFor(entry)}));
  const alternatives = [source.pillars.year, source.pillars.month, source.pillars.day].some(values => values.length !== 1);
  const relativeReadings = bound.filter(entry => entry.pillar === "day").map(day => ({
    dayMasterStemId: day.value.stemId, dayVariant: day.variant, dayMasterEvidenceKey: day.key,
    pillars: bound.filter(entry => entry.pillar !== "day" || entry.variant === day.variant).map(entry => ({pillar: entry.pillar, variant: entry.variant,
      stemId: entry.value.stemId, branchId: entry.value.branchId,
      stemElement: baziStemElement(entry.value.stemId), branchElement: baziBranchElement(entry.value.branchId),
      stemRole: entry.pillar === "day" ? "day_master" as const : "relative" as const,
      stemTenGod: entry.pillar === "day" ? null : baziTenGod(day.value.stemId, entry.value.stemId),
      hiddenStems: entry.value.hiddenStemIds.map(stemId => ({stemId, element: baziStemElement(stemId), tenGod: baziTenGod(day.value.stemId, stemId)})),
      sourceEvidenceKeys: [...new Set([day.key, entry.key])],
    })),
  }));
  const counts = Object.fromEntries(BAZI_ELEMENT_IDS.map(id => [id, 0])) as Record<BaziElementId, number>;
  if (!alternatives) for (const entry of bound) {
    counts[baziStemElement(entry.value.stemId)]++; counts[baziBranchElement(entry.value.branchId)]++;
  }
  return BaziStructureV1Schema.parse({version: 1, systemId: "bazi", ruleVersion: "bazi.structure.vendor-table.v1",
    sourceInputHash: source.inputHash, engineVersion: source.engineVersion, relativeReadings,
    visibleElementInventory: alternatives ? null : {method: "unweighted-visible-stem-and-branch-count",
      characterCount: source.pillars.hour ? 8 : 6, complete: source.pillars.hour !== null, counts},
    uncertainty: {hourMissing: source.pillars.hour === null, pillarAlternatives: alternatives, trueSolarCorrection: false}});
}
