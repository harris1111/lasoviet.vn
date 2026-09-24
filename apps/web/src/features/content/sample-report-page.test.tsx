import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SampleReportPage } from "./sample-report-page";
import type { PublicContentV1, RouteDefinitionV1 } from "@lasoviet/contracts";

let currentLocale: "vi" | "en" = "vi";

vi.mock("next-intl", () => {
  const viZiwei = require("../../../messages/vi/ziwei.json");
  const enZiwei = require("../../../messages/en/ziwei.json");
  return {
    useTranslations: (ns: string) => {
      const msgs = currentLocale === "en" ? enZiwei : viZiwei;
      return (key: string, values?: Record<string, any>) => {
        const parts = key.split(".");
        let curr: any = msgs;
        for (const p of parts) {
          curr = curr?.[p];
        }
        if (typeof curr === "string") {
          if (values) {
            let res = curr;
            for (const [k, v] of Object.entries(values)) {
              res = res.replace(`{${k}}`, String(v));
            }
            return res;
          }
          return curr;
        }
        return key;
      };
    },
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  usePathname: () => "/bao-cao-mau/tu-vi",
}));

const mockRouteVi: RouteDefinitionV1 = {
  id: "sample-report.tu-vi",
  path: "/bao-cao-mau/tu-vi",
  template: "sample-report",
  intent: "sample-report.tu-vi",
  discipline: "tu-vi",
  localeBehavior: "localized",
  localeOwners: ["vi", "en"],
  owner: "content-product",
  indexing: "index_follow",
  canonical: "self",
  robots: "index,follow",
  schemaTypes: ["Article", "BreadcrumbList"],
  redirect: { disposition: "none" },
  status: "live_indexable",
  sitemap: true,
  private: false,
  purchasable: false,
};

const mockContentVi: PublicContentV1 = {
  routeId: "sample-report.tu-vi",
  locale: "vi",
  contentType: "SampleReport",
  title: "Báo cáo mẫu Tử Vi",
  summary: "Xem trước một bản luận giải Tử Vi thật của Lá Số Việt: tổng quan, công việc, tiền bạc kèm căn cứ cho từng ý.",
  reviewer: "editorial-team",
  sourceReferences: ["docs/13-brand-experience-guideline.md"],
  riskTags: ["sample", "ziwei"],
  status: "published",
  lastReviewed: "2026-09-24",
};

const mockContentEn: PublicContentV1 = {
  routeId: "sample-report.tu-vi",
  locale: "en",
  contentType: "SampleReport",
  title: "Tu Vi sample report",
  summary: "Preview a real Zi Wei reading structure: overview, career, finances, with verifiable evidence.",
  reviewer: "editorial-team",
  sourceReferences: ["docs/13-brand-experience-guideline.md"],
  riskTags: ["sample", "ziwei"],
  status: "published",
  lastReviewed: "2026-09-24",
};

describe("SampleReportPage component", () => {
  it("renders sample report page in Vietnamese with UI-04 components and no price", () => {
    currentLocale = "vi";
    const markup = renderToStaticMarkup(
      createElement(SampleReportPage, {
        content: mockContentVi,
        locale: "vi",
        route: mockRouteVi,
      }),
    );

    // 1. Hero signals sample reading experience
    expect(markup).toContain("Bản luận giải mẫu");
    expect(markup).toContain("Báo cáo mẫu Tử Vi");
    expect(markup).toContain("BẢN\nMẪU");
    expect(markup).toContain("Lá Số Việt biên tập");

    // 2. Anonymized chart fixture data (no real person name, female, 15/06/1992, Hanoi)
    expect(markup).toContain("Bản mẫu");
    expect(markup).toContain("15/06/1992");
    expect(markup).toContain("08:30");
    expect(markup).toContain("Hà Nội");
    expect(markup).not.toContain("Nguyễn Tấn Đời");

    // 3. Absolute absence of VND, 79.000, ₫ per FD-065
    expect(markup).not.toContain("79.000");
    expect(markup).not.toContain("79,000");
    expect(markup).not.toContain("79000");
    expect(markup).not.toContain("₫");
    expect(markup).not.toContain("VND");

    // 4. UI-04 Result Tabs rendered
    expect(markup).toContain("Lá số");
    expect(markup).toContain("Tổng quan");
    expect(markup).toContain("12 cung");
    expect(markup).toContain("Chủ đề");
    expect(markup).toContain("Căn cứ");
    expect(markup).toContain("sample-tab-tag");

    // 5. Chart board has 12 palaces
    expect(markup).toContain("ziwei-chart-grid");

    // 6. Direct CTA to build own chart
    expect(markup).toContain('href="/tao-la-so/tu-vi"');
    expect(markup).toContain("Lập lá số của bạn");

    // 7. Mobile sticky bottom bar present
    expect(markup).toContain("sample-mobile-bottom-bar");
  });

  it("renders sample report page in English with localized content and no price", () => {
    currentLocale = "en";
    const markup = renderToStaticMarkup(
      createElement(SampleReportPage, {
        content: mockContentEn,
        locale: "en",
        route: mockRouteVi,
      }),
    );

    // 1. Hero signals sample reading experience
    expect(markup).toContain("Sample Report");
    expect(markup).toContain("Tu Vi sample report");
    expect(markup).toContain("SAMPLE");
    expect(markup).toContain("Edited by Lá Số Việt");

    // 2. Price is strictly absent
    expect(markup).not.toContain("79.000");
    expect(markup).not.toContain("79,000");
    expect(markup).not.toContain("79000");
    expect(markup).not.toContain("₫");
    expect(markup).not.toContain("VND");

    // 3. Direct chart CTA in hero with /en route
    expect(markup).toContain('href="/en/tao-la-so/tu-vi"');
    expect(markup).toContain("Create your chart");

    // 4. English result tabs rendered
    expect(markup).toContain("Chart");
    expect(markup).toContain("Overview");
    expect(markup).toContain("Palaces");
    expect(markup).toContain("Topics");
    expect(markup).toContain("Evidence");

    // 5. Mobile sticky bottom bar present
    expect(markup).toContain("sample-mobile-bottom-bar");
  });

  it("renders sample topics tab with 2 fully open sample topics and locked previews", () => {
    currentLocale = "vi";
    const markup = renderToStaticMarkup(
      createElement(SampleReportPage, {
        content: mockContentVi,
        locale: "vi",
        route: mockRouteVi,
        searchParams: { tab: "topics" },
      }),
    );

    // 1. Topics tab is active
    expect(markup).toContain("ziwei-topics-tab-content");

    // 2. Status tags show open vs locked
    expect(markup).toContain("is-open");
    expect(markup).toContain("is-locked");
    expect(markup).toContain("Mở");
    expect(markup).toContain("Đoạn đầu");

    // 3. The 12 palaces are represented as topic rows
    expect(markup).toContain("Cung Quan Lộc");
    expect(markup).toContain("Cung Tài Bạch");
    expect(markup).toContain("Cung Mệnh");
    expect(markup).toContain("Cung Phu Thê");
  });

  it("renders sample open topic with full reading, actions, and evidence", () => {
    currentLocale = "vi";
    const markup = renderToStaticMarkup(
      createElement(SampleReportPage, {
        content: mockContentVi,
        locale: "vi",
        route: mockRouteVi,
        searchParams: { tab: "topics", open: "career" },
      }),
    );

    // Full reading prose for career topic
    expect(markup).toContain("topic-sample-full-reading");
    expect(markup).toContain("Thất Sát vượng ở Quan Lộc");
    expect(markup).toContain("Việc nên làm");
    expect(markup).toContain("Vì sao có nhận định này?");
    expect(markup).toContain("Thất Sát (Vượng) tại Ngọ");
    expect(markup).toContain("Lá Số Việt biên tập");
  });

  it("does not render customer data, private reports, hidden evidence, internal source paths, or fake output", () => {
    currentLocale = "vi";
    const markup = renderToStaticMarkup(
      createElement(SampleReportPage, {
        content: mockContentVi,
        locale: "vi",
        route: mockRouteVi,
      }),
    );

    expect(markup).not.toMatch(/customer[-_]id/i);
    expect(markup).not.toMatch(/secret/i);
    expect(markup).not.toMatch(/bearer/i);
    expect(markup).not.toMatch(/\/home\/debian\//i);
    expect(markup).not.toMatch(/database/i);
    expect(markup).not.toMatch(/SELECT\s+/i);
    expect(markup).not.toContain("giới hạn tham khảo");
  });
});
