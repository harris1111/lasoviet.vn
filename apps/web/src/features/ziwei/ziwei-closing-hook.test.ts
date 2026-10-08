import { describe, expect, it } from "vitest";
import type { NormalizedZiweiChartV1 } from "@lasoviet/contracts";
import { buildClosingHook } from "./ziwei-closing-hook";

const star = (id: string, category = "major") => ({ id, category, brightness: "bright" });
const chart = {
  provisional: false,
  transformations: [{ id: "ziwei.transformation.prosperity", starId: "ziwei.star.pojun" }],
  palaces: [
    { id: "ziwei.palace.travel", stars: [star("ziwei.star.lianzhen")] },
    { id: "ziwei.palace.wealth", stars: [star("ziwei.star.pojun"), star("ziwei.star.zuofu", "minor")] },
    { id: "ziwei.palace.health", stars: [] },
    { id: "ziwei.palace.siblings", stars: [star("ziwei.star.taiyang"), star("ziwei.star.taiyin")] },
  ],
} as unknown as NormalizedZiweiChartV1;
const locked = ["ziwei.palace.travel", "ziwei.palace.wealth", "ziwei.palace.health", "ziwei.palace.siblings"];

describe("closing hook facts", () => {
  it("prefers a star carrying a transformation, then an empty palace", () => {
    const hook = buildClosingHook({ chart, lockedPalaceIds: locked, annual: null })!;
    expect(hook.lockedCount).toBe(4);
    expect(hook.facts).toEqual([
      { kind: "hoa", palaceId: "ziwei.palace.wealth", starId: "ziwei.star.pojun", transformationId: "ziwei.transformation.prosperity" },
      { kind: "empty", palaceId: "ziwei.palace.health" },
    ]);
  });
  it("only names stars and palaces that exist in the chart", () => {
    const hook = buildClosingHook({ chart, lockedPalaceIds: locked, annual: null })!;
    const ids = new Set(chart.palaces.flatMap((palace) => [palace.id, ...palace.stars.map((s) => s.id)]));
    for (const fact of hook.facts) {
      if ("palaceId" in fact) expect(ids.has(fact.palaceId)).toBe(true);
      if ("starId" in fact) expect(ids.has(fact.starId)).toBe(true);
    }
  });
  it("adds the month count only when it cannot be the forced single month", () => {
    expect(buildClosingHook({ chart, lockedPalaceIds: locked, annual: { year: 2026, caution: 1 } })!.facts.some((f) => f.kind === "months")).toBe(false);
    expect(buildClosingHook({ chart, lockedPalaceIds: locked, annual: { year: 2026, caution: 3 } })!.facts.at(-1)).toEqual({ kind: "months", year: 2026, count: 3 });
  });
  it("skips months for a provisional birth time and returns null with nothing locked", () => {
    const provisional = { ...chart, provisional: true } as NormalizedZiweiChartV1;
    expect(buildClosingHook({ chart: provisional, lockedPalaceIds: locked, annual: { year: 2026, caution: 3 } })!.facts.some((f) => f.kind === "months")).toBe(false);
    expect(buildClosingHook({ chart, lockedPalaceIds: [], annual: null })).toBeNull();
  });
});
