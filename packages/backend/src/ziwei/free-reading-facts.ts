import {
  FreeReadingFactsV2Schema, NormalizedZiweiChartV1Schema, PalaceIdSchema,
  ziweiMajorStarMeaning, type FreePalaceGiftFactV1, type FreeReadingFactsV2,
  type NormalizedZiweiChartV1, type ZiweiPalaceId,
} from "@lasoviet/contracts";
import { freePalaceLabel } from "./free-palace-labels.js";
import { getPalaceRelations } from "../reports/structural-palace-score.js";

export const FREE_READING_FACTS_VERSION = "free-reading-structural-facts-v2-draft-1";

/** Pure private projection from an already authorized frozen chart; no provider or database access. */
export function buildFreeReadingFacts(input: {
  chart: NormalizedZiweiChartV1; focusPalaceId: ZiweiPalaceId; locale: "vi" | "en";
}): FreeReadingFactsV2 {
  const chart = NormalizedZiweiChartV1Schema.parse(input.chart);
  const focusPalaceId = PalaceIdSchema.parse(input.focusPalaceId);
  const vi = input.locale === "vi";
  const label = (id: string) => {
    const value = freePalaceLabel(input.locale, id);
    if (!value) throw new Error("FREE_READING_LABEL_UNAVAILABLE");
    return value;
  };
  const suffix = (id: string) => id.split(".").at(-1)!;
  const facts: FreePalaceGiftFactV1[] = [{ key: "axis:life-body", label: vi ? "Mệnh và Thân" : "Life and Body",
    value: `${label(chart.soulPalaceId)} / ${label(chart.bodyPalaceId)}` }];
  for (const id of PalaceIdSchema.options) {
    const palace = chart.palaces.find(item => item.id === id)!;
    const key = `palace:${suffix(id)}`;
    facts.push({ key, label: label(id), value: `${label(id)} · ${label(palace.earthlyBranchId)}` });
    const relations = getPalaceRelations(id, chart.palaces);
    if (relations.oppositeId) facts.push({ key: `rel:${suffix(id)}:opp`, label: vi ? "Cung đối" : "Opposite palace", value: label(relations.oppositeId) });
    facts.push({ key: `rel:${suffix(id)}:tri`, label: vi ? "Tam hợp" : "Trine palaces", value: relations.trineIds.map(label).join(" / ") });
    // Existing reviewed major-star meanings only. Auxiliary cards are still awaiting approval.
    for (const star of [...palace.stars].sort((a, b) => a.id.localeCompare(b.id))) {
      if (star.category !== "major" || !ziweiMajorStarMeaning(input.locale, star.id)) continue;
      const transformations = chart.transformations.filter(item => item.starId === star.id)
        .map(item => label(item.id)).sort();
      facts.push({ key: `${key}:star:${suffix(star.id)}`, label: label(star.id),
        value: [label(star.id), label(id), label(star.brightness), ...transformations].join(" · ") });
    }
    if (!palace.stars.some(star => star.category === "major")) {
      facts.push({ key: `${key}:empty`, label: label(id), value: vi ? "Không có chính tinh" : "No principal star" });
    }
  }
  const provisional = chart.provisional === true || chart.timePrecision === "unknown" || chart.timePrecision === "range";
  if (provisional) facts.push({ key: "data:time-uncertain", label: vi ? "Giờ sinh" : "Birth time",
    value: vi ? "Vị trí Mệnh, Thân và đại vận đang tạm tính" : "Life, Body and decadal positions are provisional" });
  // No timing hooks until forced-month/target-year lineage is reconciled. No fake counts or events.
  return FreeReadingFactsV2Schema.parse({ version: 2, locale: input.locale, focusPalaceId, provisional, facts,
    locked: [...PalaceIdSchema.options.filter(id => id !== focusPalaceId).map(id => `palace:${suffix(id)}`),
      "topic:career_wealth", "topic:relationship_marriage"], allowedWithheld: [] });
}
