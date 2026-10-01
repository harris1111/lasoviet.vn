import { describe, expect, it } from "vitest";
import { ZIWEI_PALACE_IDS, type FreeIdentityPreviewV1, type NormalizedZiweiChartV1, type ZiweiHoroscopeResultV1 } from "@lasoviet/contracts";
import { CANONICAL_BRANCH_SEQUENCE } from "./ziwei-chart-relations";
import { computeNormalizedPalaceScores } from "../reports/report-palace-score";
import { buildFreeResultModel } from "./ziwei-free-result-model";

const chart = {
  palaces: ZIWEI_PALACE_IDS.map((id, index) => ({
    id, earthlyBranchId: CANONICAL_BRANCH_SEQUENCE[index]!,
    stars: [{ id: "ziwei.star.ziwei", brightness: "ziwei.brightness.exalted", category: "major" }],
  })),
  soulPalaceId: "ziwei.palace.life", bodyPalaceId: "ziwei.palace.career",
  transformations: [],
} as unknown as NormalizedZiweiChartV1;
const preview = {
  insightDetails: [
    { id: "life-palace", title: "Visible insight", description: "VISIBLE", evidenceId: "ziwei.identity.life-palace", isLocked: false },
    { id: "top-concern", title: "SECOND_TITLE_SECRET", description: "SECOND_PROSE_SECRET", evidenceId: "ziwei.identity.life-palace", isLocked: false },
    { id: "transformations", title: "LOCKED_TITLE_SECRET", description: "LOCKED_PROSE_SECRET", evidenceId: "ziwei.identity.transformations", isLocked: true },
  ],
  banMenhPreview: { opening: "PAID_OPENING_SECRET" },
  palaceTitleLines: [{ palaceId: "ziwei.palace.career", clippedOpening: "PAID_PALACE_SECRET" }],
} as FreeIdentityPreviewV1;
const horoscope = {
  yearly: {
    targetYear: 2026, hanMonthCount: 2, favorableMonthCount: 3, neutralMonthCount: 7,
    summary: "YEAR_SECRET", evidenceKeys: ["YEAR_EVIDENCE_SECRET"],
    months: [{ monthIndex: 3, label: "MONTH_SECRET", marker: "warn", preparationText: "MONTH_PROSE_SECRET" }],
  },
  daily: { headline: "DAILY_SECRET" },
} as unknown as ZiweiHoroscopeResultV1;
const input = { chart, preview, horoscope, isGuest: true, locale: "vi" as const };

describe("FD109 server-side free-result projection", () => {
  it("serializes one guest insight and aggregate year counts only", () => {
    const model = buildFreeResultModel(input);
    expect(model.insights).toHaveLength(1);
    expect(model.insights[0]?.description).toBe("VISIBLE");
    expect(model.annual).toEqual({ year: 2026, caution: 2, favorable: 3, neutral: 7 });
    const serialized = JSON.stringify(model);
    for (const secret of ["SECOND_", "LOCKED_", "PAID_", "MONTH_", "YEAR_", "DAILY_"]) {
      expect(serialized).not.toContain(secret);
    }
  });
  it("includes the authorized second insight for verified actors, not locked prose", () => {
    const model = buildFreeResultModel({ ...input, isGuest: false });
    expect(model.insights).toHaveLength(2);
    expect(model.insights[1]?.description).toBe("SECOND_PROSE_SECRET");
    expect(JSON.stringify(model)).not.toContain("LOCKED_");
    expect(JSON.stringify(model)).not.toContain("MONTH_");
  });
  it.each([
    ["career", "career"], ["money", "wealth"], ["love", "spouse"],
    ["family", "parents"], ["wellbeing", "fortune"], ["self_understanding", "career"],
  ] as const)("matches %s to a real palace", (topConcern, suffix) => {
    const model = buildFreeResultModel({ ...input, preview: { ...preview, topConcern } });
    expect(model.selectedPalaceId).toBe(`ziwei.palace.${suffix}`);
    expect(model.palaces).toHaveLength(12);
  });
  it("defaults deterministically to the strongest published structural score", () => {
    const model = buildFreeResultModel(input);
    const scores = computeNormalizedPalaceScores(chart);
    const strongest = [...scores.values()].sort((a, b) => b.score - a.score)[0]!;
    expect(model.selectedPalaceId).toBe(strongest.palaceId);
    expect(buildFreeResultModel(input)).toEqual(model);
    expect(JSON.stringify(model)).not.toContain("costVnd");
  });
  it("uses the real body palace for the fallback second insight", () => {
    const model = buildFreeResultModel({ ...input, preview: {} as FreeIdentityPreviewV1, isGuest: false });
    expect(model.insights[1]?.id).toBe("body-palace");
    expect(model.insights[1]?.description).toContain("Quan Lộc");
  });
  it("has no invented annual data if the engine is unavailable", () => {
    expect(buildFreeResultModel({ ...input, horoscope: undefined }).annual).toBeNull();
  });
  it("does not serialize unmarked Vietnamese API prose into the English view", () => {
    const model = buildFreeResultModel({ ...input, locale: "en", isGuest: false });
    expect(model.insights).toHaveLength(2);
    expect(JSON.stringify(model)).not.toContain("VISIBLE");
    expect(JSON.stringify(model)).not.toContain("SECOND_PROSE_SECRET");
    expect(model.insights[1]?.id).toBe("body-palace");
  });
});
