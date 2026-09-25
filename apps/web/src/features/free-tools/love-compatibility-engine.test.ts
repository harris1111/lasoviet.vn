import { describe, expect, it } from "vitest";

import {
  evaluateLoveCompatibility,
  getPersonZodiacInfo,
} from "./love-compatibility-engine";

describe("love-compatibility-engine", () => {
  it("computes accurate Can Chi and Nạp Âm for birth years", () => {
    // 1990: Canh Ngọ (Lộ Bàng Thổ)
    const p1990 = getPersonZodiacInfo("Quân", 1990);
    expect(p1990.canName).toBe("Canh");
    expect(p1990.chiName).toBe("Ngọ");
    expect(p1990.napAmName).toBe("Lộ Bàng Thổ");
    expect(p1990.element).toBe("Thổ");

    // 1992: Nhâm Thân (Kiếm Phong Kim)
    const p1992 = getPersonZodiacInfo("Mẫu", 1992);
    expect(p1992.canName).toBe("Nhâm");
    expect(p1992.chiName).toBe("Thân");
    expect(p1992.napAmName).toBe("Kiếm Phong Kim");
    expect(p1992.element).toBe("Kim");
  });

  it("evaluates compatibility for prototype example (1992 Mẫu & 1990 Quân)", () => {
    // Thân and Ngọ: neutral branch relation
    // Thổ (1990) generates Kim (1992): Tương sinh!
    const res = evaluateLoveCompatibility("Mẫu", 1992, "Quân", 1990, "vi");

    expect(res.zodiacRelation.kind).toBe("binh_hoa");
    expect(res.zodiacRelation.title).toBe("Bình thường");

    expect(res.elementRelation.kind).toBe("sinh_backward");
    expect(res.elementRelation.title).toBe("Tương sinh");
    expect(res.elementRelation.description).toContain("Quân (Thổ) sinh Mẫu (Kim)");
  });

  it("identifies Tam Hợp pairs correctly (e.g. Thân 1992 and Tý 1996)", () => {
    const res = evaluateLoveCompatibility("Nam", 1992, "Nữ", 1996, "vi");
    expect(res.zodiacRelation.kind).toBe("tam_hop");
    expect(res.zodiacRelation.title).toBe("Tam hợp");
    expect(res.zodiacRelation.tagClass).toBe("tag-gold");
  });

  it("identifies Lục Xung pairs correctly (e.g. Tý 1996 and Ngọ 1990)", () => {
    const res = evaluateLoveCompatibility("Anh", 1996, "Em", 1990, "vi");
    expect(res.zodiacRelation.kind).toBe("luc_xung");
    expect(res.zodiacRelation.title).toBe("Lục xung");
    expect(res.zodiacRelation.tagClass).toBe("tag-seal");
  });
});
