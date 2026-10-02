import { describe, expect, it } from "vitest";
import type { NormalizedZiweiChartV1 } from "@lasoviet/contracts";
import { computeNormalizedPalaceScores } from "./structural-palace-score.js";

describe("backend structural palace selection scores", () => {
  it("uses auxiliary Hoa Ky and its opposite contribution without borrowing the aux star", () => {
    const chart = {
      soulPalaceId: "ziwei.palace.life", bodyPalaceId: "ziwei.palace.travel",
      palaces: [
        { id: "ziwei.palace.life", earthlyBranchId: "ziwei.branch.rat", stars: [{ id: "ziwei.star.wenqu", category: "minor" }] },
        { id: "ziwei.palace.travel", earthlyBranchId: "ziwei.branch.horse", stars: [] },
      ],
      transformations: [{ id: "ziwei.transformation.obstacle", starId: "ziwei.star.wenqu" }],
    } as unknown as NormalizedZiweiChartV1;
    const scores = computeNormalizedPalaceScores(chart);
    expect(scores.get("ziwei.palace.life")?.score).toBe(44);
    expect(scores.get("ziwei.palace.travel")?.score).toBe(48);
  });
});
