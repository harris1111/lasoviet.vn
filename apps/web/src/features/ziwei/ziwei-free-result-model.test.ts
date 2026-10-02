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
    expect(model.insights[0]?.description).toContain("Tử Vi");
    expect(model.insights[0]?.description).not.toBe("VISIBLE");
    expect(model.annual).toEqual({ year: 2026, caution: 2, favorable: 3, neutral: 7 });
    const serialized = JSON.stringify(model);
    for (const secret of ["SECOND_", "LOCKED_", "PAID_", "MONTH_", "YEAR_", "DAILY_"]) {
      expect(serialized).not.toContain(secret);
    }
  });
  it("includes the actual structural Body insight for verified actors, not ungrounded API prose", () => {
    const model = buildFreeResultModel({ ...input, isGuest: false });
    expect(model.insights).toHaveLength(2);
    expect(model.insights[1]?.id).toBe("body-palace");
    expect(model.insights[1]?.description).toContain("Quan Lộc");
    expect(JSON.stringify(model)).not.toContain("SECOND_PROSE_SECRET");
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
  it("does not serialize unmarked Vietnamese API prose into the English view and falls back to mapped concern", () => {
    const model = buildFreeResultModel({ ...input, locale: "en", isGuest: false, preview: { ...preview, topConcern: "career" } });
    expect(model.insights).toHaveLength(2);
    expect(JSON.stringify(model)).not.toContain("VISIBLE");
    expect(JSON.stringify(model)).not.toContain("SECOND_PROSE_SECRET");
    expect(model.insights[1]?.id).toBe("top-concern");
    expect(model.insights[1]?.title).toBe("Career Palace");
    expect(model.insights[1]?.description).toContain("Zi Wei");
    expect(model.insights[1]?.evidenceId).toBeUndefined();
  });

  describe("minimal #53 concern fallback behavior", () => {
    it.each([
      ["career", "Career Palace"],
      ["money", "Wealth Palace"],
      ["love", "Spouse Palace"],
      ["family", "Parents Palace"],
      ["wellbeing", "Fortune Palace"],
      ["self_understanding", "Career Palace"], // chart.bodyPalaceId is career
    ] as const)("falls back to localized structural facts for concern %s in EN without prose", (topConcern, expectedTitle) => {
      const model = buildFreeResultModel({
        chart,
        preview: { topConcern } as FreeIdentityPreviewV1,
        isGuest: false,
        locale: "en",
      });
      expect(model.insights).toHaveLength(2);
      expect(model.insights[1]?.id).toBe("top-concern");
      expect(model.insights[1]?.title).toBe(expectedTitle);
      expect(model.insights[1]?.description).toBe(model.palaces.find((p) => p.name === expectedTitle)!.facts);
      expect(model.insights[1]?.description).toContain("Zi Wei");
      expect(model.insights[1]?.evidenceId).toBeUndefined();
    });

    it("falls back to body palace if topConcern maps to a palace not present in chart", () => {
      const incompleteChart = {
        ...chart,
        palaces: chart.palaces.filter((p) => p.id !== "ziwei.palace.spouse"),
      };
      const model = buildFreeResultModel({
        chart: incompleteChart,
        preview: { topConcern: "love" } as FreeIdentityPreviewV1,
        isGuest: false,
        locale: "en",
      });
      expect(model.insights).toHaveLength(2);
      expect(model.insights[1]?.id).toBe("body-palace");
      expect(model.insights[1]?.evidenceId).toBe("ziwei.identity.body-palace");
    });

    it("falls back to body palace when topConcern is absent and no authorized second prose exists", () => {
      const model = buildFreeResultModel({
        chart,
        preview: {} as FreeIdentityPreviewV1,
        isGuest: false,
        locale: "en",
      });
      expect(model.insights).toHaveLength(2);
      expect(model.insights[1]?.id).toBe("body-palace");
      expect(model.insights[1]?.evidenceId).toBe("ziwei.identity.body-palace");
    });

    it("keeps only 1 insight for guest even if topConcern is provided", () => {
      const model = buildFreeResultModel({
        chart,
        preview: { topConcern: "career" } as FreeIdentityPreviewV1,
        isGuest: true,
        locale: "en",
      });
      expect(model.insights).toHaveLength(1);
      expect(model.insights[0]?.id).toBe("life-palace");
    });

    it("uses chart facts instead of unverified Vietnamese concern prose and unknown evidence", () => {
      const model = buildFreeResultModel({
        ...input,
        isGuest: false,
        locale: "vi",
        preview: {
          insightDetails: [
            { id: "life-palace", title: "Mệnh", description: "Mệnh info", evidenceId: "ziwei.identity.life-palace", isLocked: false },
            { id: "top-concern", title: "Quan tâm", description: "Luận giải sự nghiệp", evidenceId: "ziwei.identity.career-preview", isLocked: false },
          ],
          topConcern: "career",
        } as unknown as FreeIdentityPreviewV1,
      });
      expect(model.insights).toHaveLength(2);
      expect(model.insights[1]?.id).toBe("top-concern");
      expect(model.insights[1]?.title).toBe("Cung Quan Lộc");
      expect(model.insights[1]?.description).toContain("Tử Vi");
      expect(model.insights[1]?.evidenceId).toBeUndefined();
    });

    it("prevents locked or private prose leak and uses structural fallback instead", () => {
      const model = buildFreeResultModel({
        ...input,
        isGuest: false,
        locale: "vi",
        preview: {
          insightDetails: [
            { id: "life-palace", title: "Mệnh", description: "Mệnh info", evidenceId: "ziwei.identity.life-palace", isLocked: false },
            { id: "top-concern", title: "SECRET_TITLE", description: "SECRET_LOCKED_PROSE", evidenceId: "ziwei.identity.career-preview", isLocked: true },
          ],
          topConcern: "career",
        } as unknown as FreeIdentityPreviewV1,
      });
      expect(model.insights).toHaveLength(2);
      expect(model.insights[1]?.id).toBe("top-concern");
      expect(model.insights[1]?.title).toBe("Cung Quan Lộc");
      expect(model.insights[1]?.evidenceId).toBeUndefined();
      const serialized = JSON.stringify(model);
      expect(serialized).not.toContain("SECRET_TITLE");
      expect(serialized).not.toContain("SECRET_LOCKED_PROSE");
    });
  });
});
