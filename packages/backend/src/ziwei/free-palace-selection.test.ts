import { describe, expect, it } from "vitest";
import type { NormalizedZiweiChartV1 } from "@lasoviet/contracts";
import { selectFreePalace, freePalaceArtifactKey, resolveFreePalaceSlot } from "./free-palace-selection.js";
const chart = { palaces: [
  { id: "ziwei.palace.wealth", earthlyBranchId: "ziwei.branch.dragon", stars: [] },
  { id: "ziwei.palace.life", earthlyBranchId: "ziwei.branch.rat", stars: [] },
  { id: "ziwei.palace.career", earthlyBranchId: "ziwei.branch.monkey", stars: [] },
], transformations: [] } as unknown as NormalizedZiweiChartV1;
const lineage = { chartVersionId: "c1", palaceId: "ziwei.palace.life" as const, locale: "vi" as const, promptVersion: "p1", rulesVersion: "r1", knowledgeVersion: "k1", scorerVersion: "s1", schemaVersion: "v1", provider: "provider", model: "model" };
describe("server free palace selection", () => {
  it("uses approved concern mapping, otherwise canonical ties independent of chart ordering", () => {
    expect(selectFreePalace(chart, "career")).toBe("ziwei.palace.career");
    expect(selectFreePalace(chart, "money")).toBe("ziwei.palace.wealth");
    expect(selectFreePalace(chart)).toBe("ziwei.palace.life");
    expect(selectFreePalace({ ...chart, palaces: [...chart.palaces].reverse() })).toBe("ziwei.palace.life");
  });
  it("preserves the existing wellbeing/Body concern mapping", () => {
    const source = { ...chart, bodyPalaceId: "ziwei.palace.career", palaces: [...chart.palaces, { id: "ziwei.palace.fortune", earthlyBranchId: "ziwei.branch.goat", stars: [] }] } as NormalizedZiweiChartV1;
    expect(selectFreePalace(source, "wellbeing")).toBe("ziwei.palace.fortune");
    expect(selectFreePalace(source, "self_understanding")).toBe("ziwei.palace.career");
  });
  it("fails closed for missing canonical chart data", () => {
    expect(() => selectFreePalace({ ...chart, palaces: [] })).toThrow("FREE_PALACE_SOURCE_INVALID");
  });
  it("distinguishes artifact keys without regranting chart slots", () => {
    const original = freePalaceArtifactKey(lineage);
    expect(freePalaceArtifactKey({ ...lineage, locale: "en" })).not.toBe(original);
    expect(freePalaceArtifactKey({ ...lineage, promptVersion: "p2" })).not.toBe(original);
    expect(resolveFreePalaceSlot({ requestId: "existing", supportedArtifact: false })).toEqual({ kind: "fallback", requestId: "existing" });
    expect(resolveFreePalaceSlot({ requestId: "existing", supportedArtifact: true })).toEqual({ kind: "cache", requestId: "existing" });
    expect(resolveFreePalaceSlot(null)).toEqual({ kind: "eligible" });
  });
});
