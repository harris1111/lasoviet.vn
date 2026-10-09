import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { sortPalaceCards, ZiweiPalaceCards, type PalaceCard } from "./ziwei-palace-cards";

const cards: PalaceCard[] = [
  { id: "ziwei.palace.life", name: "Mệnh", score: 50, band: "can", stars: "Tham Lang", done: true },
  { id: "ziwei.palace.parents", name: "Phụ Mẫu", score: 80, band: "manh", stars: "Thiên Cơ", done: false },
  { id: "ziwei.palace.travel", name: "Thiên Di", score: 38, band: "canh", stars: "Liêm Trinh", done: false },
];
const labels = { sortLabel: "Sắp xếp", sortOrder: "Theo thứ tự cung", sortStrength: "Theo độ mạnh", preview: "Xem thử", done: "Đã đọc đầy đủ",
  band: (p: PalaceCard) => p.band, open: (p: PalaceCard) => `Xem thử ${p.name}` };

describe("12-palace cards", () => {
  it("sorts by strength without mutating the palace order", () => {
    expect(sortPalaceCards(cards, "strength").map((c) => c.score)).toEqual([80, 50, 38]);
    expect(sortPalaceCards(cards, "order").map((c) => c.score)).toEqual([50, 80, 38]);
    expect(cards.map((c) => c.score)).toEqual([50, 80, 38]);
  });
  it("renders every card as one button, marks the read palace and keeps no 'locked' stamp", () => {
    const html = renderToStaticMarkup(<ZiweiPalaceCards cards={cards} labels={labels} onOpen={() => undefined} onOpenDone={() => undefined} />);
    expect(html.match(/data-testid="fd109-palace-preview"/g)).toHaveLength(2);
    expect(html.match(/data-testid="fd109-palace-done"/g)).toHaveLength(1);
    expect(html).toContain("Đã đọc đầy đủ");
    expect(html).toContain("Xem thử ›");
    expect(html).not.toContain("Chưa mở");
    expect(html).toContain('aria-pressed="true"');
  });
});
