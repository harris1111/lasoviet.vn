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
  insights: { id: string; title: string; description: string; evidenceId?: string }[];
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

// A03 / ui-contract.md: the only engine evidence ids the UI may ever link to.
// Anything else (an invented id such as "ziwei.identity.career-preview") is
// not a real fact reference and must not become a clickable link.
const RECOGNIZED_EVIDENCE_IDS = new Set([
  "ziwei.identity.life-palace",
  "ziwei.identity.body-palace",
  "ziwei.identity.transformations",
]);

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
  // A02: the first insight is always this chart's own stars/branch/brightness,
  // never the preview API's generic "life-palace" literal (it does not vary
  // by chart and was being shown to every guest as if it were personal).
  const first = fallback[0]!;
  let second: { id: string; title: string; description?: string; evidenceId?: string };
  const authorizedSecond = details.find((item) => item.id === "top-concern")
    ?? details.find((item) => item.id === "body-palace");
  if (authorizedSecond) {
    // A03 / audit finding 7: the preview API always tags insight 2 as
    // id="body-palace" / evidenceId="ziwei.identity.body-palace", even when
    // its title/description were actually written for a different concern
    // palace (e.g. topConcern "money" describing cung Tài Bạch). The prose
    // itself is real and kept; the id and evidence are only trustworthy when
    // this insight genuinely is about the chart's actual Body palace.
    const isActualBodyPalace = !preview.topConcern || requested === chart.bodyPalaceId;
    second = (authorizedSecond.id === "body-palace"
        && authorizedSecond.evidenceId === "ziwei.identity.body-palace"
        && !isActualBodyPalace)
      ? { ...authorizedSecond, id: "top-concern", evidenceId: undefined }
      : authorizedSecond;
    if (second.evidenceId && !RECOGNIZED_EVIDENCE_IDS.has(second.evidenceId)) {
      second = { ...second, evidenceId: undefined };
    }
  } else if (preview.topConcern) {
    const matchedPalace = palaces.find((palace) => palace.id === requested);
    if (matchedPalace) {
      second = {
        id: "top-concern",
        title: matchedPalace.name,
        description: matchedPalace.facts,
      };
    } else {
      second = fallback[1]!;
    }
  } else {
    second = fallback[1]!;
  }
  const insights = (isGuest ? [first] : [first, second]).map((item) => ({
    ...(item.evidenceId ? { evidenceId: item.evidenceId } : {}),
    id: item.id, title: item.title, description: item.description ?? "",
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
