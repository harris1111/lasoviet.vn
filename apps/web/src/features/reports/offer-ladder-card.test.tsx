import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next-intl", async () => {
  const messages = (await import("../../../messages/vi/reports.json")).default as Record<string, unknown>;
  return {
    useTranslations: () => (key: string, values?: Record<string, unknown>) => {
      let val: unknown = messages;
      for (const segment of key.split(".")) val = (val as Record<string, unknown>)?.[segment];
      if (typeof val !== "string") return key;
      return Object.entries(values ?? {}).reduce((acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)), val);
    },
  };
});

import { OfferCard } from "./offer-ladder-card";

type El = { type: unknown; props: Record<string, unknown> };
function find(node: unknown, pred: (el: El) => boolean): El | null {
  if (!node || typeof node !== "object") return null;
  if (Array.isArray(node)) { for (const child of node) { const hit = find(child, pred); if (hit) return hit; } return null; }
  const el = node as El;
  if (el.props && pred(el)) return el;
  return el.props ? find(el.props.children, pred) : null;
}
// Render the (hook-free apart from the mocked translator) card into its element tree.
const card = (over: Partial<Parameters<typeof OfferCard>[0]> = {}) => OfferCard({
  sku: "ZIWEI-CAREER-P0", name: "Sự nghiệp", price: 100, state: "available", canOpen: true,
  lifetime: false, onOpen: () => undefined, ...over,
}) as unknown;
const button = (tree: unknown) => find(tree, el => el.type === "button")!;

describe("OfferCard", () => {
  it("opens through its single primary button (click, and Enter/Space which a native button turns into click)", () => {
    const onOpen = vi.fn();
    const btn = button(card({ onOpen }));
    expect(btn.props.type).toBe("button");
    expect(String(btn.props.className)).toContain("stretched-target");
    expect(btn.props["aria-label"]).toBe("Mở Sự nghiệp — 100 Lá");
    (btn.props.onClick as () => void)();
    expect(onOpen).toHaveBeenCalledWith("ZIWEI-CAREER-P0");
  });

  it("shows the price and the visible 'Mở – N Lá' label with the arrow hidden from assistive tech", () => {
    const html = renderToStaticMarkup(card() as never);
    expect(html).toContain('<span aria-hidden="true">Mở – 100 Lá</span>');
    expect(html).toContain('<span class="offer-open-arrow" aria-hidden="true">→</span>');
    expect(html).toContain('data-state="openable"');
    expect(html.match(/<button/g)).toHaveLength(1);
  });

  it("keeps the dashed outline and states the gap when the balance is short, but still opens the sheet", () => {
    const onOpen = vi.fn();
    const tree = card({ shortfall: 180, onOpen });
    const html = renderToStaticMarkup(tree as never);
    expect(html).toContain('data-state="short"');
    expect(html).toContain("offer-card-short");
    expect(html).toContain("Cần 180 Lá nữa");
    expect(html).toContain('aria-describedby="offer-reason-ZIWEI-CAREER-P0"');
    (button(tree).props.onClick as () => void)();
    expect(onOpen).toHaveBeenCalled();
  });

  it("renders an owned card as a link to the reading instead of a purchase button", () => {
    const html = renderToStaticMarkup(card({ state: "owned", ownedLink: { href: "/bao-cao/r1", label: "Đọc lại" } }) as never);
    expect(html).toContain('data-state="owned"');
    expect(html).toContain('href="/bao-cao/r1"');
    expect(html).toContain("Đọc lại");
    expect(html).not.toContain("<button");
  });

  it("renders unsupported cards as a disabled button with a visible reason and never opens", () => {
    const onOpen = vi.fn();
    const tree = card({ onOpen, canOpen: false, state: "unavailable" });
    const btn = button(tree);
    expect(btn.props.disabled).toBe(true);
    expect(btn.props.onClick).toBeUndefined();
    expect(onOpen).not.toHaveBeenCalled();
    const html = renderToStaticMarkup(tree as never);
    expect(html).toContain('data-state="locked"');
    expect(html).toContain("Chưa hỗ trợ lựa chọn này");
    expect(html).not.toContain("Sắp mở");
  });

  it("marks its tier and the rail anchor, and decorates only the lifetime card", () => {
    const plain = renderToStaticMarkup(card({ tierLabel: "Cung", anchorId: "offer-tier-first-palace" }) as never);
    expect(plain).toContain('id="offer-tier-first-palace"');
    expect(plain).toContain('<span class="offer-card-tier" aria-hidden="true">Cung</span>');
    expect(plain).not.toContain("offer-ribbon");
    expect(plain).not.toContain("offer-orn");
    const lifetime = renderToStaticMarkup(card({ sku: "ZIWEI-IDENTITY-P0", lifetime: true }) as never);
    expect(lifetime.match(/class="offer-orn offer-orn-(tl|tr|bl|br)"/g)).toHaveLength(4);
    expect(lifetime).toContain('<span class="offer-ribbon">Đáng nhất</span>');
    expect(lifetime).toContain('class="offer-save"');
    expect(lifetime).toContain("offer-ladder-best");
  });
});
