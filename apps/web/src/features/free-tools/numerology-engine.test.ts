import { describe, expect, it } from "vitest";

import {
  calculateNumerology,
  getPythagoreanLetterValue,
  normalizeNameLetters,
  reduceToSingleOrMaster,
} from "./numerology-engine";

describe("numerology-engine", () => {
  it("reduces numbers properly preserving master numbers 11, 22, 33", () => {
    expect(reduceToSingleOrMaster(15)).toBe(6);
    expect(reduceToSingleOrMaster(28)).toBe(1); // 2+8 = 10 -> 1+0 = 1
    expect(reduceToSingleOrMaster(11)).toBe(11); // Master 11 preserved
    expect(reduceToSingleOrMaster(22)).toBe(22); // Master 22 preserved
    expect(reduceToSingleOrMaster(33)).toBe(33); // Master 33 preserved
    expect(reduceToSingleOrMaster(29)).toBe(11); // 2+9 = 11 (Master preserved)
  });

  it("normalizes Vietnamese names into uppercase ASCII letters", () => {
    expect(normalizeNameLetters("Trần Thị Mẫu")).toBe("TRANTHIMAU");
    expect(normalizeNameLetters("Đỗ Đăng Khoa")).toBe("DODANGKHOA");
  });

  it("computes letter values correctly under Pythagorean table", () => {
    expect(getPythagoreanLetterValue("A")).toBe(1);
    expect(getPythagoreanLetterValue("I")).toBe(9);
    expect(getPythagoreanLetterValue("J")).toBe(1);
    expect(getPythagoreanLetterValue("R")).toBe(9);
    expect(getPythagoreanLetterValue("S")).toBe(1);
  });

  it("computes full numerology profile from prototype example (1992-06-15, Trần Thị Mẫu)", () => {
    // 15/06/1992: 1+5+0+6+1+9+9+2 = 33 (Master 33!)
    const res = calculateNumerology("1992-06-15", "Trần Thị Mẫu", "vi");

    expect(res.lifePathNumber).toBe(33);
    expect(res.isMasterLifePath).toBe(true);
    expect(res.lifePathDisplay).toBe("33/6");
    expect(res.lifePathMeaning).toContain("Số bậc thầy 33");

    // Grid counts for digits in 1992-06-15:
    // 1: two (1, 1) -> 2
    // 2: one (2) -> 1
    // 5: one (5) -> 1
    // 6: one (6) -> 1
    // 9: two (9, 9) -> 2
    expect(res.gridCounts[1]).toBe(2);
    expect(res.gridCounts[2]).toBe(1);
    expect(res.gridCounts[5]).toBe(1);
    expect(res.gridCounts[6]).toBe(1);
    expect(res.gridCounts[9]).toBe(2);
    expect(res.gridCounts[3]).toBe(0);
    expect(res.gridCounts[4]).toBe(0);
    expect(res.gridCounts[7]).toBe(0);
    expect(res.gridCounts[8]).toBe(0);
    expect(res.emptyNumbers).toEqual([3, 8, 4, 7]);
  });

  it("computes standard single-digit life path (e.g. 1990-10-24)", () => {
    // 2+4+1+0+1+9+9+0 = 26 -> 8
    const res = calculateNumerology("1990-10-24", "Nguyễn Văn An", "vi");
    expect(res.lifePathNumber).toBe(8);
    expect(res.isMasterLifePath).toBe(false);
    expect(res.lifePathDisplay).toBe("8");
    expect(res.lifePathTitle).toBe("Số chủ đạo 8");
  });
});
