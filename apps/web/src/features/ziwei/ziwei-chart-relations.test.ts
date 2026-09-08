import { describe, expect, it } from "vitest";

import {
  CANONICAL_BRANCH_SEQUENCE,
  getBranchIndex,
  getOppositeBranchId,
  getPalaceGridPosition,
  getPalaceLifeArea,
  getPalaceRelations,
  getTrineBranchIds,
} from "./ziwei-chart-relations";

describe("Zi Wei chart relations and grid positions", () => {
  it("maintains the 12 canonical branches in traditional sequence", () => {
    expect(CANONICAL_BRANCH_SEQUENCE).toEqual([
      "ziwei.branch.rat",
      "ziwei.branch.ox",
      "ziwei.branch.tiger",
      "ziwei.branch.rabbit",
      "ziwei.branch.dragon",
      "ziwei.branch.snake",
      "ziwei.branch.horse",
      "ziwei.branch.goat",
      "ziwei.branch.monkey",
      "ziwei.branch.rooster",
      "ziwei.branch.dog",
      "ziwei.branch.pig",
    ]);
  });

  it("calculates accurate opposition across the 12 branches", () => {
    expect(getOppositeBranchId("ziwei.branch.rat")).toBe("ziwei.branch.horse");
    expect(getOppositeBranchId("ziwei.branch.horse")).toBe("ziwei.branch.rat");
    expect(getOppositeBranchId("ziwei.branch.tiger")).toBe("ziwei.branch.monkey");
    expect(getOppositeBranchId("ziwei.branch.monkey")).toBe("ziwei.branch.tiger");
    expect(getOppositeBranchId("ziwei.branch.ox")).toBe("ziwei.branch.goat");
    expect(getOppositeBranchId("ziwei.branch.dragon")).toBe("ziwei.branch.dog");
  });

  it("calculates accurate trines for all four cardinal groups", () => {
    // Dần - Ngọ - Tuất (Fire / Tiger group)
    const [trine1, trine2] = getTrineBranchIds("ziwei.branch.tiger");
    expect(trine1).toBe("ziwei.branch.horse");
    expect(trine2).toBe("ziwei.branch.dog");

    // Thân - Tý - Thìn (Water / Monkey group)
    const [w1, w2] = getTrineBranchIds("ziwei.branch.monkey");
    expect(w1).toBe("ziwei.branch.rat");
    expect(w2).toBe("ziwei.branch.dragon");

    // Tỵ - Dậu - Sửu (Metal / Snake group)
    const [m1, m2] = getTrineBranchIds("ziwei.branch.snake");
    expect(m1).toBe("ziwei.branch.rooster");
    expect(m2).toBe("ziwei.branch.ox");

    // Hợi - Mão - Mùi (Wood / Pig group)
    const [wd1, wd2] = getTrineBranchIds("ziwei.branch.pig");
    expect(wd1).toBe("ziwei.branch.rabbit");
    expect(wd2).toBe("ziwei.branch.goat");
  });

  it("assigns each branch to a distinct perimeter position on the 4x4 grid", () => {
    const positions = CANONICAL_BRANCH_SEQUENCE.map(getPalaceGridPosition);
    const seen = new Set<string>();

    for (const pos of positions) {
      // Must be on perimeter: row is 1 or 4, OR col is 1 or 4
      const isPerimeter = pos.row === 1 || pos.row === 4 || pos.col === 1 || pos.col === 4;
      expect(isPerimeter).toBe(true);

      const key = `${pos.row}-${pos.col}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }

    expect(seen.size).toBe(12);

    // Specific traditional corners
    expect(getPalaceGridPosition("ziwei.branch.snake")).toMatchObject({ row: 1, col: 1 });
    expect(getPalaceGridPosition("ziwei.branch.monkey")).toMatchObject({ row: 1, col: 4 });
    expect(getPalaceGridPosition("ziwei.branch.pig")).toMatchObject({ row: 4, col: 4 });
    expect(getPalaceGridPosition("ziwei.branch.tiger")).toMatchObject({ row: 4, col: 1 });
  });

  it("calculates relations independent of input palace array ordering", () => {
    // Array of palaces in reversed order
    const reversedPalaces = [
      { id: "ziwei.palace.parents", earthlyBranchId: "ziwei.branch.pig" },
      { id: "ziwei.palace.fortune", earthlyBranchId: "ziwei.branch.dog" },
      { id: "ziwei.palace.property", earthlyBranchId: "ziwei.branch.rooster" },
      { id: "ziwei.palace.career", earthlyBranchId: "ziwei.branch.monkey" },
      { id: "ziwei.palace.friends", earthlyBranchId: "ziwei.branch.goat" },
      { id: "ziwei.palace.travel", earthlyBranchId: "ziwei.branch.horse" },
      { id: "ziwei.palace.health", earthlyBranchId: "ziwei.branch.snake" },
      { id: "ziwei.palace.wealth", earthlyBranchId: "ziwei.branch.dragon" },
      { id: "ziwei.palace.children", earthlyBranchId: "ziwei.branch.rabbit" },
      { id: "ziwei.palace.spouse", earthlyBranchId: "ziwei.branch.tiger" },
      { id: "ziwei.palace.siblings", earthlyBranchId: "ziwei.branch.ox" },
      { id: "ziwei.palace.life", earthlyBranchId: "ziwei.branch.rat" },
    ];

    // Select Cung Mệnh at Rat (Tý)
    const relations = getPalaceRelations("ziwei.palace.life", reversedPalaces);

    expect(relations.selectedId).toBe("ziwei.palace.life");
    expect(relations.selectedBranchId).toBe("ziwei.branch.rat");

    // Opposition of Rat is Horse (Cung Thiên Di at Ngọ)
    expect(relations.oppositeId).toBe("ziwei.palace.travel");
    expect(relations.oppositeBranchId).toBe("ziwei.branch.horse");

    // Trines of Rat are Dragon (Thìn - Cung Tài Bạch) and Monkey (Thân - Cung Quan Lộc)
    expect(relations.trineIds).toContain("ziwei.palace.wealth");
    expect(relations.trineIds).toContain("ziwei.palace.career");

    // Test getRelation helper
    expect(relations.getRelation("ziwei.palace.life")).toBe("selected");
    expect(relations.getRelation("ziwei.palace.travel")).toBe("opposite");
    expect(relations.getRelation("ziwei.palace.wealth")).toBe("trine");
    expect(relations.getRelation("ziwei.palace.career")).toBe("trine");
    expect(relations.getRelation("ziwei.palace.spouse")).toBe("none");
  });

  it("returns localized life area descriptions for all twelve palaces", () => {
    const palaces = [
      "life", "siblings", "spouse", "children", "wealth", "health",
      "travel", "friends", "career", "property", "fortune", "parents",
    ];

    for (const p of palaces) {
      const vi = getPalaceLifeArea(p, "vi");
      const en = getPalaceLifeArea(p, "en");

      expect(vi.name.length).toBeGreaterThan(0);
      expect(vi.domain.length).toBeGreaterThan(0);
      expect(en.name.length).toBeGreaterThan(0);
      expect(en.domain.length).toBeGreaterThan(0);
    }
  });
});
