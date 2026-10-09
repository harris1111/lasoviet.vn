import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { rankSupportPalaces, ZiweiSupportPalaces, type SupportPalace } from "./ziwei-support-palaces";

const make = (scores: number[]): SupportPalace[] => scores.map((score, index) => ({
  id: `ziwei.palace.p${index}`, name: `Cung ${index}`, score, stars: "Tham Lang",
  band: score >= 70 ? "manh" : score >= 55 ? "thuan" : score >= 45 ? "can" : score >= 30 ? "canh" : "kho",
}));
const labels = {
  strongTitle: "Mạnh", weakTitle: "Lưu tâm", weakNote: "Vẫn ở mức thuận", allTitle: "Xem cả 12 cung", midpoint: "Vạch giữa là mốc 50",
  viewOnChart: "Xem trên lá số", band: (band: string) => band, card: (palace: SupportPalace) => `${palace.name} ${palace.score}`,
};

describe("support palaces", () => {
  it("ranks three strongest and three weakest", () => {
    const { strong, weak } = rankSupportPalaces(make([58, 78, 70, 62, 57, 51, 38, 72, 56, 60, 66, 47]));
    expect(strong.map((p) => p.score)).toEqual([78, 72, 70]);
    expect(weak.map((p) => p.score)).toEqual([38, 47, 51]);
  });
  it("renders cards as buttons, all 12 bars and no weak note when the lowest is under 55", () => {
    const html = renderToStaticMarkup(<ZiweiSupportPalaces palaces={make([58, 78, 70, 62, 57, 51, 38, 72, 56, 60, 66, 47])} labels={labels as never} onFocus={() => undefined} />);
    expect(html.match(/data-testid="fd109-support-card"/g)).toHaveLength(6);
    expect(html.match(/class="fd109-bar"/g)).toHaveLength(12);
    expect(html).not.toContain("fd109-weak-note");
  });
  it("explains when even the weakest palace is still favourable", () => {
    const html = renderToStaticMarkup(<ZiweiSupportPalaces palaces={make([60, 78, 70, 62, 57, 61, 58, 72, 56, 60, 66, 59])} labels={labels as never} onFocus={() => undefined} />);
    expect(html).toContain("fd109-weak-note");
  });
});
