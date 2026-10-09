import { describe, expect, it } from "vitest";
import { ZIWEI_PALACE_IDS, type NormalizedZiweiChartV1 } from "@lasoviet/contracts";
import { compileFreeStructuralOverview } from "@lasoviet/backend/ziwei/free-structural-overview";
import { CANONICAL_BRANCH_SEQUENCE } from "./ziwei-chart-relations";
import { presentOverviewSection } from "./ziwei-overview-text";

const chart = {
  palaces: ZIWEI_PALACE_IDS.map((id, index) => ({ id, earthlyBranchId: CANONICAL_BRANCH_SEQUENCE[index]!, stars: [] })),
  soulPalaceId: "ziwei.palace.life", bodyPalaceId: "ziwei.palace.career", transformations: [],
} as unknown as NormalizedZiweiChartV1;

describe("overview text stopgap (until rule-v2 replaces the rule-based text)", () => {
  it("capitalises titles and paragraphs without changing their meaning", () => {
    const section = presentOverviewSection({ id: "career", title: "cung Quan Lộc", paragraphs: ["cung Quan Lộc có điểm cao nhất."] });
    expect(section.title).toBe("Cung Quan Lộc");
    expect(section.paragraphs).toEqual(["Cung Quan Lộc có điểm cao nhất."]);
    expect(section.basis).toEqual([]);
  });

  it("moves the facts sentence of a palace out of the reading, keeping the domain sentence", () => {
    const section = presentOverviewSection({
      id: "wealth", title: "cung Tài Bạch",
      paragraphs: [
        "Tài Bạch đặt câu hỏi về cách sử dụng và giữ nguồn lực. cung Tài Bạch an tại Thìn; dữ liệu ghi nhận không có chính tinh tọa thủ (vô chính diệu). Cung đối là cung Phúc Đức.",
        "Cung vô chính diệu cần đọc cùng nguồn chiếu thực: chưa có chính tinh.. Đây là ảnh hưởng chiếu.",
      ],
    });
    expect(section.paragraphs).toEqual([
      "Tài Bạch đặt câu hỏi về cách sử dụng và giữ nguồn lực.",
      "Cung vô chính diệu cần đọc cùng nguồn chiếu thực: chưa có chính tinh. Đây là ảnh hưởng chiếu.",
    ]);
    expect(section.basis).toEqual(["Cung Tài Bạch an tại Thìn; dữ liệu ghi nhận không có chính tinh tọa thủ (vô chính diệu). Cung đối là cung Phúc Đức."]);
  });

  it("moves a paragraph that is only facts (the Life Palace) and handles English", () => {
    const vi = presentOverviewSection({ id: "life", title: "Nền", paragraphs: ["cung Mệnh an tại Tý; dữ liệu ghi nhận x.", "Phần đọc."] });
    expect(vi.paragraphs).toEqual(["Phần đọc."]);
    expect(vi.basis).toEqual(["Cung Mệnh an tại Tý; dữ liệu ghi nhận x."]);
    const en = presentOverviewSection({ id: "career", title: "career Palace", paragraphs: ["Career is about work. career Palace is placed at Thân; its recorded principal-star configuration is none."] });
    expect(en.paragraphs).toEqual(["Career is about work."]);
    expect(en.basis).toEqual(["Career Palace is placed at Thân; its recorded principal-star configuration is none."]);
  });

  it("leaves no lowercase start and no facts sentence in any section the engine really produces", () => {
    for (const locale of ["vi", "en"] as const) {
      for (const section of compileFreeStructuralOverview(chart, locale).sections) {
        const shown = presentOverviewSection(section);
        for (const text of [shown.title, ...shown.paragraphs, ...shown.basis]) expect(text, `${locale}/${section.id}`).toMatch(/^\p{Lu}|^\p{N}/u);
        for (const text of [shown.title, ...shown.paragraphs]) expect(text, `${locale}/${section.id}`).not.toMatch(/dữ liệu ghi nhận|recorded principal-star/);
        expect(shown.paragraphs.join(" ")).not.toMatch(/(?<!\.)\.\.(?!\.)/);
        expect(shown.paragraphs.length, `${locale}/${section.id}`).toBeGreaterThan(0);
      }
    }
  });
});
