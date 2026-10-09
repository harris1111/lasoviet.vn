import { findLaProduct } from "@lasoviet/contracts";
import { compileFreeStructuralOverview, compileFreeStructuralPalace } from "@lasoviet/backend/ziwei/free-structural-overview";
import type {
  FreeStructuralOverviewDocV1, FreeStructuralPalaceDocV1, LaSku, FreeIdentityPreviewV1, FreePalaceGiftViewV1, NormalizedZiweiChartV1, TopConcernV1, ZiweiHoroscopeResultV1,
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
// Allowlisted projection of a validated, ready gift. It carries only prose and numbered facts: no
// request id, content hash, lineage or any operational field ever reaches the client.
export type FreeResultGiftPoint = { text: string; refs: number[] };
export type FreeResultGift = {
  palaceId: string;
  palaceName: string;
  title: string;
  conclusion: string;
  keyPoints: FreeResultGiftPoint[];
  paragraphs: string[];
  doItems: FreeResultGiftPoint[];
  avoidItems: FreeResultGiftPoint[];
  facts: { n: number; label: string; value: string }[];
};
export type FreeResultDecadeCycle = {
  ordinal: number; palaceId: string; palaceName: string; startAge: number; endAge: number;
  state: "past" | "current" | "future"; score: number; band: PalaceScoreBandKey;
};
export type FreeResultModel = {
  overview: FreeStructuralOverviewDocV1;
  structuralPalace: FreeStructuralPalaceDocV1;
  periodTeaser: { sentences: string[]; sku: LaSku } | null;
  insights: { id: string; title: string; description: string; evidenceId?: string }[];
  palaces: FreeResultPalace[];
  topics: FreeResultTopic[];
  selectedPalaceId: string;
  annual: { year: number; caution: number; favorable: number; neutral: number } | null;
  // Marker only: a caution month never carries its palace, focus or evidence before it is unlocked.
  months: { index: number; marker: "warn" | "good" | "neutral" }[] | null;
  // Decade strip: structural score of the palace each decade passes through (FD-107/111), free to show.
  decade: { cycles: FreeResultDecadeCycle[]; annualPalaceId: string | null } | null;
  isGuest: boolean;
  // Present ONLY for an actual ready, validated artifact on a palace of this chart.
  gift: FreeResultGift | null;
  // A request exists but is not ready yet. Display-only: nothing here can trigger generation.
  giftPreparing: boolean;
};

function projectGift(
  gift: FreePalaceGiftViewV1 | null | undefined,
  chart: NormalizedZiweiChartV1,
  presentation: ReturnType<typeof ziweiPresentation>,
): FreeResultGift | null {
  if (!gift || gift.status !== "ready" || !chart.palaces.some((palace) => palace.id === gift.palaceId)) return null;
  const number = new Map(gift.facts.map((fact, index) => [fact.key, index + 1]));
  const refs = (keys: string[]) => [...new Set(keys.map((key) => number.get(key)).filter((n): n is number => n !== undefined))].sort((a, b) => a - b);
  const point = (item: { text: string; evidenceKeys: string[] }): FreeResultGiftPoint => ({ text: item.text, refs: refs(item.evidenceKeys) });
  const { reading } = gift;
  return {
    palaceId: gift.palaceId, palaceName: presentation.palace(gift.palaceId), title: reading.title, conclusion: reading.conclusion,
    keyPoints: reading.keyPoints.map(point), doItems: reading.do.map(point), avoidItems: reading.avoid.map(point),
    paragraphs: reading.narrative.split(/\n{2,}/u).map((part) => part.trim()).filter(Boolean),
    facts: gift.facts.map((fact, index) => ({ n: index + 1, label: fact.label, value: fact.value })),
  };
}

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
  overview?: FreeStructuralOverviewDocV1;
  // The server-loaded gift view. Anything other than a ready artifact leaves Phase A copy untouched.
  gift?: FreePalaceGiftViewV1 | null;
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
  const gift = projectGift(input.gift, chart, presentation);
  // The gift is about one frozen palace, so the surface follows it rather than re-deriving a palace.
  const selectedPalaceId = gift?.palaceId ?? palaces.find((palace) => palace.id === requested)?.id ?? strongest.id;
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
  // Cycles past age 90 are left out: the strip is a life overview, not an actuarial table.
  const decadeCycles: FreeResultDecadeCycle[] = chart.provisional ? [] : (input.horoscope?.decadalCycles ?? [])
    .filter((cycle) => cycle.startAge <= 90)
    .flatMap((cycle) => {
      const own = palaces.find((palace) => palace.id === cycle.palaceId);
      const score = cycle.structuralScore?.value ?? own?.score;
      const band = cycle.structuralScore?.band ?? own?.band;
      return score === undefined || band === undefined ? [] : [{
        ordinal: cycle.ordinal, palaceId: cycle.palaceId, palaceName: presentation.palace(cycle.palaceId),
        startAge: cycle.startAge, endAge: cycle.endAge, state: cycle.state, score, band,
      }];
    });
  return {
    overview: input.overview ?? compileFreeStructuralOverview(chart, locale),
    structuralPalace: compileFreeStructuralPalace(chart, selectedPalaceId, locale),
    periodTeaser: yearly && input.horoscope?.asOfDate?.startsWith(`${yearly.targetYear}-`) && chart.palaces.some(palace => palace.id === yearly.annualPalaceId) && !chart.provisional ? {
      sku: findLaProduct(`ZIWEI-YEAR-${yearly.targetYear}-P0`)?.availability === "active" ? `ZIWEI-YEAR-${yearly.targetYear}-P0` as LaSku : "ZIWEI-IDENTITY-P0",
      sentences: [
        locale === "vi" ? `Năm ${yearly.targetYear}, lưu niên đi vào ${presentation.palace(yearly.annualPalaceId)}; có ${yearly.hanMonthCount} tháng cần chú ý và ${yearly.favorableMonthCount} tháng thuận theo cấu trúc đã tính.` : `In ${yearly.targetYear}, the annual layer enters ${presentation.palace(yearly.annualPalaceId)}; the calculated structure marks ${yearly.hanMonthCount} caution months and ${yearly.favorableMonthCount} favourable months.`,
        ...(input.horoscope?.decadal ? [locale === "vi" ? `Đại vận ${input.horoscope.decadal.startAge}–${input.horoscope.decadal.endAge} tuổi nằm tại ${presentation.palace(input.horoscope.decadal.palaceId)}. Khi đặt hai lớp cạnh nhau, điều cần xem kỹ là…` : `The ${input.horoscope.decadal.startAge}–${input.horoscope.decadal.endAge} age cycle is placed in ${presentation.palace(input.horoscope.decadal.palaceId)}. When the two layers are considered together, the point to examine is…`] : [locale === "vi" ? "Khi đối chiếu cung này với cấu trúc bản sinh, điều cần xem kỹ là…" : "When this palace is compared with the natal structure, the point to examine is…"]),
      ],
    } : null,
    insights, palaces, topics: buildFreeResultTopics(locale, preview.topConcern), selectedPalaceId, isGuest,
    gift, giftPreparing: !gift && (input.gift?.status === "requested" || input.gift?.status === "generating"),
    annual: yearly ? {
      year: yearly.targetYear, caution: yearly.hanMonthCount,
      favorable: yearly.favorableMonthCount, neutral: yearly.neutralMonthCount,
    } : null,
    months: yearly && !chart.provisional ? yearly.months.map((month) => ({ index: month.monthIndex, marker: month.marker })) : null,
    decade: decadeCycles.length ? { cycles: decadeCycles, annualPalaceId: yearly?.annualPalaceId ?? null } : null,
  };
}
