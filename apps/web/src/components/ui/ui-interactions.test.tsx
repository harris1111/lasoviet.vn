import { readFile } from "node:fs/promises";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { BottomSheet } from "./bottom-sheet";
import { LayerTabBar } from "./layer-tab-bar";
import { NumberedAccordion } from "./numbered-accordion";
import { SegmentedTabs } from "./segmented-tabs";

const tabs = [
  { id: "first", label: "Đầu tiên", content: <p>Nội dung đầu tiên</p> },
  { id: "second", label: "Thứ hai", content: <p>Nội dung thứ hai</p> },
];

describe("interactive UI primitives", () => {
  it("renders selected tab and panel relationships for both tab variants", () => {
    const segmented = renderToStaticMarkup(
      <SegmentedTabs defaultTabId="first" tabs={tabs} />,
    );
    const layer = renderToStaticMarkup(
      <LayerTabBar defaultTabId="second" tabs={tabs} />,
    );

    expect(segmented).toContain('role="tablist"');
    expect(segmented).toContain('aria-selected="true"');
    expect(segmented).toContain('role="tabpanel"');
    expect(layer).toContain('aria-selected="true"');
    expect(layer).toContain('role="tabpanel"');
  });

  it("renders one approved initial accordion item with a semantic heading", () => {
    const html = renderToStaticMarkup(
      <NumberedAccordion
        defaultOpenId="one"
        items={[
          { id: "one", title: "Mục một", content: <p>Nội dung mở.</p> },
          { id: "two", title: "Mục hai", content: <p>Nội dung đóng.</p> },
        ]}
      />,
    );

    expect(html).toContain("<h3");
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('role="region"');
    expect(html).toContain("Nội dung mở.");
    expect(html).not.toContain("Nội dung đóng.");
  });

  it("renders a labelled bottom-sheet dialog and close control when opened", () => {
    const html = renderToStaticMarkup(
      <BottomSheet initiallyOpen title="Tùy chọn" triggerLabel="Mở bảng">
        <p>Nội dung công khai.</p>
      </BottomSheet>,
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-label="Đóng"');
    expect(html).toContain("Nội dung công khai.");
  });

  it("contains keyboard roving, focus restoration, escape, and reduced-motion handling", async () => {
    const [tabsSource, sheetSource, coreStyles] = await Promise.all([
      readFile("apps/web/src/components/ui/segmented-tabs.tsx", "utf8"),
      readFile("apps/web/src/components/ui/bottom-sheet.tsx", "utf8"),
      readFile("apps/web/src/styles/ui-core.css", "utf8"),
    ]);

    expect(tabsSource).toContain('event.key === "ArrowRight"');
    expect(tabsSource).toContain('event.key === "ArrowLeft"');
    expect(tabsSource).toContain("tabIndex={selected ? 0 : -1}");
    expect(sheetSource).toContain('event.key === "Escape"');
    expect(sheetSource).toContain("triggerRef.current?.focus()");
    expect(sheetSource).toContain("focusableSelector");
    expect(coreStyles).toContain("@media (prefers-reduced-motion: reduce)");
  });
});
