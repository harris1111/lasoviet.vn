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
  sku: "ZIWEI-CAREER-P0", name: "Sự nghiệp", price: 100, state: "available", locked: false,
  selected: false, lifetime: false, onSelect: () => undefined, ...over,
}) as unknown;
const button = (tree: unknown) => find(tree, el => el.type === "button")!;

describe("OfferCard", () => {
  it("selects through its single primary button (click, and Enter/Space which a native button turns into click)", () => {
    const onSelect = vi.fn();
    const btn = button(card({ onSelect }));
    expect(btn.props.type).toBe("button");
    expect(String(btn.props.className)).toContain("stretched-target");
    expect(btn.props["aria-pressed"]).toBe(false);
    (btn.props.onClick as () => void)();
    expect(onSelect).toHaveBeenCalledWith("ZIWEI-CAREER-P0");
  });

  it("shows a visible selected state: check mark, text, aria-pressed, data-selected", () => {
    const html = renderToStaticMarkup(card({ selected: true }) as never);
    expect(html).toContain('data-selected="true"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("✓");
    expect(html).toContain("Đã chọn");
  });

  it("renders locked cards as a disabled button with a visible reason and never fires onSelect", () => {
    const onSelect = vi.fn();
    const tree = card({ onSelect, locked: true, state: "coming_soon" });
    const btn = button(tree);
    expect(btn.props.disabled).toBe(true);
    expect(btn.props.onClick).toBeUndefined();
    expect(onSelect).not.toHaveBeenCalled();
    const html = renderToStaticMarkup(tree as never);
    expect(html).toContain('data-state="locked"');
    expect(html).toContain("Sắp mở");
    expect(html).toContain('aria-describedby="offer-reason-ZIWEI-CAREER-P0"');
  });

  it("treats unsupported cards as locked with the unsupported reason", () => {
    const html = renderToStaticMarkup(card({ state: "unavailable" }) as never);
    expect(html).toContain("disabled");
    expect(html).toContain("Chưa hỗ trợ lựa chọn này");
  });
});
