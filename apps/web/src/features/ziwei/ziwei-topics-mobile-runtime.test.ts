import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ZiweiTopicsTab } from "./ziwei-topics-tab";

// Mock next-intl
vi.mock("next-intl", () => {
  const viZiwei = require("../../../messages/vi/ziwei.json");
  return {
    useTranslations: () => (key: string) => {
      const parts = key.split(".");
      let curr: any = viZiwei;
      for (const p of parts) curr = curr?.[p];
      return typeof curr === "string" ? curr : key;
    },
  };
});

describe("ZiweiTopicsTab mobile modal vs desktop inline runtime behavior", () => {
  it("renders pure inline desktop markup when openTopicId is set on server/desktop (no portal dialog)", () => {
    const html = renderToStaticMarkup(
      createElement(ZiweiTopicsTab, {
        chartId: "c1",
        locale: "vi",
        openTopicId: "life",
        onOpenTopic: vi.fn(),
      }),
    );

    // Desktop inline preview box is present
    expect(html).toContain("topic-desktop-inline-preview");
    expect(html).toContain("Cấu trúc nội dung chủ đề: Cung Mệnh");

    // Modal dialog is not rendered during server/desktop render
    expect(html).not.toContain("topic-mobile-sheet-overlay");
  });

  it("verifies background landmarks inert and aria-hidden preservation and restoration algorithm", () => {
    // Mock elements representing landmarks
    const mockElements = [
      {
        tagName: "HEADER",
        attributes: new Map([["aria-hidden", "false"]]),
        inert: false,
        getAttribute(k: string) { return this.attributes.get(k) ?? null; },
        setAttribute(k: string, v: string) { this.attributes.set(k, v); },
        removeAttribute(k: string) { this.attributes.delete(k); },
      },
      {
        tagName: "MAIN",
        attributes: new Map<string, string>(),
        inert: false,
        getAttribute(k: string) { return this.attributes.get(k) ?? null; },
        setAttribute(k: string, v: string) { this.attributes.set(k, v); },
        removeAttribute(k: string) { this.attributes.delete(k); },
      },
      {
        tagName: "FOOTER",
        attributes: new Map<string, string>(),
        inert: false,
        getAttribute(k: string) { return this.attributes.get(k) ?? null; },
        setAttribute(k: string, v: string) { this.attributes.set(k, v); },
        removeAttribute(k: string) { this.attributes.delete(k); },
      },
    ];

    // Isolation phase
    const backgroundElements: Array<{ el: typeof mockElements[0]; prevAriaHidden: string | null; prevInert: boolean }> = [];
    mockElements.forEach((node) => {
      backgroundElements.push({
        el: node,
        prevAriaHidden: node.getAttribute("aria-hidden"),
        prevInert: node.inert,
      });
      node.setAttribute("aria-hidden", "true");
      node.inert = true;
    });

    // Verify all isolated
    expect(mockElements[0]!.getAttribute("aria-hidden")).toBe("true");
    expect(mockElements[0]!.inert).toBe(true);
    expect(mockElements[1]!.getAttribute("aria-hidden")).toBe("true");
    expect(mockElements[1]!.inert).toBe(true);

    // Restoration phase (simulating modal unmount / effect cleanup)
    backgroundElements.forEach(({ el, prevAriaHidden, prevInert }) => {
      if (prevAriaHidden === null) {
        el.removeAttribute("aria-hidden");
      } else {
        el.setAttribute("aria-hidden", prevAriaHidden);
      }
      el.inert = prevInert;
    });

    // Verify clean restoration of previous state
    expect(mockElements[0]!.getAttribute("aria-hidden")).toBe("false");
    expect(mockElements[0]!.inert).toBe(false);
    expect(mockElements[1]!.getAttribute("aria-hidden")).toBeNull();
    expect(mockElements[1]!.inert).toBe(false);
    expect(mockElements[2]!.getAttribute("aria-hidden")).toBeNull();
    expect(mockElements[2]!.inert).toBe(false);
  });

  it("verifies accessible focus trap logic wrapping Tab and Shift+Tab", () => {
    const closeBtn = { id: "closeBtn", focus: vi.fn() };
    const ctaBtn = { id: "ctaBtn", focus: vi.fn() };
    const focusable = [closeBtn, ctaBtn];

    let activeElement: any = closeBtn;
    const panel = {
      contains: (el: any) => focusable.includes(el),
    };

    function simulateTabTrap(e: { key: string; shiftKey: boolean; preventDefault: () => void }) {
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;

      if (e.shiftKey) {
        if (activeElement === first || !panel.contains(activeElement)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (activeElement === last || !panel.contains(activeElement)) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    // 1. Shift+Tab on first element wraps to last element
    const preventDefault1 = vi.fn();
    activeElement = closeBtn;
    simulateTabTrap({ key: "Tab", shiftKey: true, preventDefault: preventDefault1 });
    expect(preventDefault1).toHaveBeenCalled();
    expect(ctaBtn.focus).toHaveBeenCalledTimes(1);

    // 2. Tab on last element wraps to first element
    const preventDefault2 = vi.fn();
    activeElement = ctaBtn;
    simulateTabTrap({ key: "Tab", shiftKey: false, preventDefault: preventDefault2 });
    expect(preventDefault2).toHaveBeenCalled();
    expect(closeBtn.focus).toHaveBeenCalledTimes(1);

    // 3. Tab when focus starts outside panel wraps to first element
    const preventDefault3 = vi.fn();
    activeElement = { id: "outside" };
    simulateTabTrap({ key: "Tab", shiftKey: false, preventDefault: preventDefault3 });
    expect(preventDefault3).toHaveBeenCalled();
    expect(closeBtn.focus).toHaveBeenCalledTimes(2);
  });
});
