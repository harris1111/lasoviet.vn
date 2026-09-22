import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { HomepageTopicChips } from "./homepage-topic-chips";
import { HomepageComparison } from "./homepage-comparison";
import { HomepageEvidence } from "./homepage-evidence";
import { HomepageCapabilityMatrix } from "./homepage-capability-matrix";
import { HomepageKnowledge } from "./homepage-knowledge";
import { HomepageFaq } from "./homepage-faq";
import { HomepageFinalCta } from "./homepage-final-cta";

// Mock next-intl
vi.mock("next-intl", () => {
  const viMessages = require("../../../messages/vi/common.json");
  const enMessages = require("../../../messages/en/common.json");

  return {
    useTranslations: (namespace: string) => {
      return (key: string) => {
        const parts = key.split(".");
        let curr: any = namespace === "common" ? viMessages : {};
        for (const p of parts) {
          curr = curr?.[p];
        }
        return typeof curr === "string" ? curr : key;
      };
    },
  };
});

describe("homepage newly structured components", () => {
  it("renders HomepageTopicChips with 2 chip rows and 'Cũng có' links", () => {
    const html = renderToStaticMarkup(createElement(HomepageTopicChips, { locale: "vi" }));
    expect(html).toContain("topic-chips-viewport");
    expect(html).toContain("topic-chips-row-forward");
    expect(html).toContain("topic-chips-row-reverse");
    expect(html).toContain("also-have-row");
    expect(html).toContain("Cũng có");
    expect(html).toContain('href="/bat-tu"');
    expect(html).toContain('href="/chiem-tinh"');
    expect(html).toContain('href="/than-so-hoc"');
    expect(html).toContain('href="/kinh-dich"');
    expect(html).toContain('data-analytics-intent="scroll_to_form"');
  });

  it("renders HomepageComparison with LSV featured first and mobile details accordion", () => {
    const html = renderToStaticMarkup(createElement(HomepageComparison));
    expect(html).toContain("comparison-columns-desktop");
    expect(html).toContain("comparison-columns-mobile");
    expect(html).toContain('data-comp-target="lasoviet"');
    expect(html).toContain('data-comp-target="self-study"');
    expect(html).toContain('data-comp-target="ai-chat"');
    expect(html).toContain("comp-mobile-details");
    expect(html).toContain("comp-mobile-summary");
    // Checkmark vs Cross
    expect(html).toContain("comp-item-positive");
    expect(html).toContain("comp-item-negative");
  });

  it("renders HomepageEvidence scroll-snap carousel with real static representations", () => {
    const html = renderToStaticMarkup(createElement(HomepageEvidence, { locale: "vi" }));
    expect(html).toContain("evidence-carousel");
    expect(html).toContain("evidence-slide-card");
    expect(html).toContain("Cấu trúc 12 cung an sao");
    expect(html).toContain("Mối liên hệ xung chiếu &amp; tam hợp");
    expect(html).toContain("Căn cứ an định &amp; cổ thư đối chiếu");
    expect(html).toContain("Tiến trình luận giải theo chủ đề");
    expect(html).toContain("Xem lá số của bạn");
  });

  it("renders HomepageCapabilityMatrix without price amounts and with stacked mobile tiers", () => {
    const html = renderToStaticMarkup(createElement(HomepageCapabilityMatrix));
    expect(html).toContain("capability-table");
    expect(html).toContain("matrix-mobile-cards");
    expect(html).toContain("matrix-col-highlight");
    expect(html).toContain("Miễn phí");
    expect(html).toContain("Bản mệnh");
    expect(html).toContain("Toàn diện");
    // Ensure no price marks
    expect(html).not.toMatch(/\d[\d.,]*\s*(?:₫|đ\b|VND|Lá\b)/i);
  });

  it("renders HomepageKnowledge with 1 featured card (byline 'Lá Số Việt biên tập') + 4 compact list items", () => {
    const html = renderToStaticMarkup(createElement(HomepageKnowledge, { locale: "vi" }));
    expect(html).toContain("knowledge-featured-card");
    expect(html).toContain("knowledge-compact-list");
    expect(html).toContain("Lá Số Việt biên tập");
    expect(html).toContain('href="/kien-thuc/tu-vi/la-so-tu-vi-la-gi"');
    expect(html).toContain('href="/kien-thuc/tu-vi/cach-lap-la-so-tu-vi"');
    expect(html).toContain('href="/kien-thuc/tu-vi/cach-doc-la-so-tu-vi"');
    expect(html).toContain('href="/phuong-phap/can-cu-ai"');
    expect(html).toContain('href="/kien-thuc"');
  });

  it("renders HomepageFaq with 8 numbered details items and the first one open", () => {
    const html = renderToStaticMarkup(createElement(HomepageFaq));
    expect(html).toContain("faq-accordion-list");
    const detailsCount = (html.match(/<details/g) || []).length;
    expect(detailsCount).toBe(8);
    // First item open
    expect(html).toMatch(/<details[^>]*open=""[^>]*>/);
    expect(html).toContain("01");
    expect(html).toContain("08");
  });

  it("renders HomepageFinalCta with compact button connecting to hero form", () => {
    const html = renderToStaticMarkup(createElement(HomepageFinalCta, { locale: "vi" }));
    expect(html).toContain("cta-actions");
    expect(html).toContain("button-pill");
    expect(html).toContain('href="/bao-cao-mau/tu-vi"');
  });
});
