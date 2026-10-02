import type {
  FreeIdentityPreviewV1, NormalizedZiweiChartV1, TopConcernV1, ZiweiHoroscopeResultV1,
} from "@lasoviet/contracts";
import { computeNormalizedPalaceScores, type PalaceScoreBandKey } from "../reports/report-palace-score";
import { buildFreeResultTopics, type FreeResultTopic } from "./free-result-topic-catalog";
import { buildFreeInsights } from "./ziwei-free-insights";
import { ziweiPresentation, type ZiweiPresentationLocale } from "./ziwei-presentation";

export type FreeResultPalace = {
  id: string;
  name: string;
  score: number;
  band: PalaceScoreBandKey;
  facts: string;
  sourceKind: "structural";
  state: "locked";
};
export type FreeResultModel = {
  insights: { id: string; title: string; description: string; evidenceId?: string }[];
  palaces: FreeResultPalace[];
  topics: FreeResultTopic[];
  selectedPalaceId: string;
  annual: { year: number; caution: number; favorable: number; neutral: number } | null;
  isGuest: boolean;
};

const concernPalaces: Record<TopConcernV1, string> = {
  career: "ziwei.palace.career", money: "ziwei.palace.wealth",
  love: "ziwei.palace.spouse", family: "ziwei.palace.parents",
  wellbeing: "ziwei.palace.fortune", self_understanding: "ziwei.palace.body",
};

/**
 * Server-side allowlist. The client gets only authorized prose and aggregate
 * annual counts, never a raw horoscope, paid preview or locked insight.
 * This deterministic fallback is not an AI cache or a frozen generation record.
 */
export function buildFreeResultModel(input: {
  chart: NormalizedZiweiChartV1;
  preview: Pick<FreeIdentityPreviewV1, "topConcern">;
  horoscope?: ZiweiHoroscopeResultV1;
  isGuest: boolean;
  locale: ZiweiPresentationLocale;
  displayName?: string;
}): FreeResultModel {
  const { chart, preview, isGuest, locale } = input;
  const presentation = ziweiPresentation(locale);
  const scores = computeNormalizedPalaceScores(chart);
  const palaces = chart.palaces.map((palace): FreeResultPalace => {
    const score = scores.get(palace.id)!;
    const stars = palace.stars.filter((star) => star.category === "major");
    const starNames = stars.map((star) => presentation.star(star.id)).join(", ");
    return {
      id: palace.id, name: presentation.palace(palace.id),
      score: score.score, band: score.band,
      sourceKind: "structural", state: "locked",
      facts: starNames
        ? `${presentation.branch(palace.earthlyBranchId)} · ${starNames}`
        : `${presentation.branch(palace.earthlyBranchId)} · ${locale === "vi" ? "Không có chính tinh tại cung" : "No main stars in this palace"}`,
    };
  });
  const strongest = [...palaces].sort((a, b) => b.score - a.score)[0]!;
  const concernId = preview.topConcern ? concernPalaces[preview.topConcern] : undefined;
  const requested = concernId === "ziwei.palace.body" ? chart.bodyPalaceId : concernId;
  const selectedPalaceId = palaces.find((palace) => palace.id === requested)?.id ?? strongest.id;
  // The API preview has no validated chart/locale/artifact lineage. Its prose
  // must not outrank source-grounded structural insights on this surface.
  const fallback = buildFreeInsights(chart, locale, input.displayName).items;
  // A02 (first) / A03+A04 (second): neither insight trusts the preview API's
  // prose anymore. The API's palace blurbs are generic per-palace-type text
  // (not grounded in this chart's own stars/brightness, same defect audit
  // finding 1 found for insight 1), and its id/evidenceId pairing for insight
  // 2 was observed mislabeled as Cung Thân regardless of the real concern
  // (finding 7). Both insights are now always this chart's own structural
  // facts from buildFreeInsights/the palace map; no evidenceId is invented
  // for a concern palace that identity evidence does not actually cover.
  const first = fallback[0]!;
  const matchedPalace = preview.topConcern
    ? palaces.find((palace) => palace.id === requested)
    : undefined;
  const second = matchedPalace ? {
    id: "top-concern", title: matchedPalace.name, description: matchedPalace.facts,
    // Identity evidence covers Life/Body/transformations, not an arbitrary
    // concern palace. Omit the link rather than relabel it as Body evidence.
  } : fallback[1]!;
  const insights = (isGuest ? [first] : [first, second]).map((item) => ({
    ...("evidenceId" in item && typeof item.evidenceId === "string" ? { evidenceId: item.evidenceId } : {}),
    id: item.id, title: item.title, description: item.description ?? "",
  }));
  const yearly = input.horoscope?.yearly;
  return {
    insights, palaces, topics: buildFreeResultTopics(locale, preview.topConcern), selectedPalaceId, isGuest,
    annual: yearly ? {
      year: yearly.targetYear, caution: yearly.hanMonthCount,
      favorable: yearly.favorableMonthCount, neutral: yearly.neutralMonthCount,
    } : null,
  };
}
