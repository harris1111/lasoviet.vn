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

describe("ZiweiTopicsTab desktop inline non-modal rendering", () => {
  it("renders pure inline desktop markup when openTopicId is set on server/desktop (no portal dialog)", () => {
    const html = renderToStaticMarkup(
      createElement(ZiweiTopicsTab, {
        chartId: "c1",
        locale: "vi",
        openTopicId: "life",
        onOpenTopic: vi.fn(),
      }),
    );

    // Desktop inline preview box is present within card container
    expect(html).toContain("topic-desktop-inline-preview");
    expect(html).toContain("Cấu trúc nội dung chủ đề: Cung Mệnh");

    // Mobile modal portal dialog is not rendered during server/desktop render
    expect(html).not.toContain("topic-mobile-sheet-overlay");
  });
});
