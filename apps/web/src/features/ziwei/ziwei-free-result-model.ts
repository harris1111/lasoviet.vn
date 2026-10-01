import type {
  FreeIdentityPreviewV1, NormalizedZiweiChartV1, TopConcernV1, ZiweiHoroscopeResultV1,
} from "@lasoviet/contracts";
import { computeNormalizedPalaceScores, type PalaceScoreBandKey } from "../reports/report-palace-score";
import { buildFreeInsights } from "./ziwei-free-insights";
import { ziweiPresentation, type ZiweiPresentationLocale } from "./ziwei-presentation";

export type FreeResultPalace = {
  id: string;
  name: string;
  score: number;
  band: PalaceScoreBandKey;
  facts: string;
};
export type FreeResultModel = {
  insights: { id: string; title: string; description: string; evidenceId: string }[];
  palaces: FreeResultPalace[];
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
  preview: FreeIdentityPreviewV1;
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
      facts: starNames
        ? `${presentation.branch(palace.earthlyBranchId)} · ${starNames}`
        : `${presentation.branch(palace.earthlyBranchId)} · ${locale === "vi" ? "Không có chính tinh tại cung" : "No main stars in this palace"}`,
    };
  });
  const strongest = [...palaces].sort((a, b) => b.score - a.score)[0]!;
  const concernId = preview.topConcern ? concernPalaces[preview.topConcern] : undefined;
  const requested = concernId === "ziwei.palace.body" ? chart.bodyPalaceId : concernId;
  const selectedPalaceId = palaces.find((palace) => palace.id === requested)?.id ?? strongest.id;
  const allowedIds = isGuest ? ["life-palace"] : ["life-palace", "top-concern", "body-palace"];
  // The current API preview has no locale marker and is authored in Vietnamese.
  // Do not pass it as English prose; use the localized structural fallback.
  const details = (locale === "vi" ? preview.insightDetails ?? [] : []).filter(
    (item) => allowedIds.includes(item.id) && !item.isLocked && item.description,
  );
  const fallback = buildFreeInsights(chart, locale, input.displayName).items;
  const first = details.find((item) => item.id === "life-palace") ?? fallback[0]!;
  const second = details.find((item) => item.id === "top-concern")
    ?? details.find((item) => item.id === "body-palace") ?? fallback[1]!;
  const insights = (isGuest ? [first] : [first, second]).map((item) => ({
    id: item.id, title: item.title, description: item.description ?? "",
    evidenceId: item.evidenceId,
  }));
  const yearly = input.horoscope?.yearly;
  return {
    insights, palaces, selectedPalaceId, isGuest,
    annual: yearly ? {
      year: yearly.targetYear, caution: yearly.hanMonthCount,
      favorable: yearly.favorableMonthCount, neutral: yearly.neutralMonthCount,
    } : null,
  };
}
