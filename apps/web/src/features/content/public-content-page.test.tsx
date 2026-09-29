import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { PublicContentV1, RouteDefinitionV1 } from "@lasoviet/contracts";
import { productCatalog } from "@lasoviet/config";

import { PublicContentPage } from "./public-content-page";
import { createPublicContentRepository } from "./public-content-repository";
import { buildStructuredData } from "../../seo/structured-data";

function buildRoute(overrides: Partial<RouteDefinitionV1>): RouteDefinitionV1 {
  return {
    id: "trust.terms",
    path: "/dieu-khoan",
    intent: "trust.terms",
    template: "policy-page",
    localeBehavior: "vi_default_en_explicit",
    localeOwners: ["vi", "en"],
    owner: "product",
    indexing: "index_follow",
    canonical: "self",
    robots: "index,follow",
    schemaTypes: ["WebPage", "BreadcrumbList"],
    redirect: { disposition: "none" },
    priority: "p0",
    status: "live_indexable",
    sitemap: true,
    private: false,
    purchasable: false,
    content: "reviewed",
    reviewer: "content-team",
    ...overrides,
  };
}

const privacyRoute = buildRoute({});
const calculatorRoute = buildRoute({
  id: "calculator.tu-vi",
  path: "/tu-vi",
  intent: "calculator.tu-vi",
  template: "calculator-landing",
});
const knowledgeRoute = buildRoute({
  id: "knowledge.tu-vi",
  path: "/kien-thuc/tu-vi",
  intent: "knowledge.tu-vi",
  template: "knowledge-hub",
});

const routes = [privacyRoute, calculatorRoute, knowledgeRoute];

const privacyContent: PublicContentV1 = {
  routeId: "trust.terms",
  locale: "vi",
  contentType: "SeoMetadata",
  title: "Chính sách bảo mật",
  summary: "Thông tin về dữ liệu được sử dụng.",
  reviewer: "privacy-reviewer",
  sourceReferences: ["docs/13-brand-experience-guideline.md"],
  riskTags: ["privacy_boundary"],
  status: "published",
  lastReviewed: "2026-09-01",
  body: "## Phạm vi hiện tại\n\nThông tin sinh có thể nhạy cảm.\n\n## Tiếp tục\n\n[Lập lá số Tử Vi](route:calculator.tu-vi), [khu kiến thức Tử Vi](route:knowledge.tu-vi).",
};

describe("PublicContentPage policy-page template", () => {
  it("does not expose the legacy VND offer as the Vietnamese wallet price", () => {
    const identityRoute = buildRoute({ id: "commercial.tu-vi.identity", template: "commercial-page", sku: "ZIWEI-IDENTITY-P0", schemaTypes: ["Product", "BreadcrumbList"] });
    const structured = buildStructuredData(identityRoute, { locale: "vi", title: "Tổng quan bản mệnh", summary: "Bài đọc có căn cứ" }, productCatalog);
    expect(structured[0]).toMatchObject({ "@type": "Product", sku: "ZIWEI-IDENTITY-P0" });
    expect(structured[0]).not.toHaveProperty("offers");
  });

  it("renders the revised Vietnamese calculator landing with an explanatory chart and working CTA", () => {
    const calculatorContent = { ...privacyContent, routeId: "calculator.tu-vi", title: "Một lá số bắt đầu từ đúng giờ sinh." };
    const html = renderToStaticMarkup(
      <PublicContentPage
        content={calculatorContent}
        locale="vi"
        repository={createPublicContentRepository([calculatorContent], routes)}
        route={calculatorRoute}
        routes={routes}
      />,
    );
    expect(html).toContain("Một lá số bắt đầu từ đúng giờ sinh.");
    expect(html).toContain("Sơ đồ minh họa 12 cung");
    expect(html).toContain('href="/tao-la-so/tu-vi"');
  });

  it("renders the full body content, not just the title and summary", () => {
    const html = renderToStaticMarkup(
      <PublicContentPage
        content={privacyContent}
        locale="vi"
        repository={createPublicContentRepository([privacyContent], routes)}
        route={privacyRoute}
        routes={routes}
      />,
    );

    expect(html).toContain("Chính sách bảo mật");
    expect(html).toContain("Phạm vi hiện tại");
    expect(html).toContain("Thông tin sinh có thể nhạy cảm.");
  });

  it("resolves route: links from the body to their live path", () => {
    const html = renderToStaticMarkup(
      <PublicContentPage
        content={privacyContent}
        locale="vi"
        repository={createPublicContentRepository([privacyContent], routes)}
        route={privacyRoute}
        routes={routes}
      />,
    );

    expect(html).toContain('href="/tu-vi"');
    expect(html).toContain('href="/kien-thuc/tu-vi"');
  });

  it("prefixes resolved links with /en for the English locale", () => {
    const enContent: PublicContentV1 = {
      ...privacyContent,
      locale: "en",
      title: "Privacy policy",
      summary: "How data is used.",
      body: "[Build a Tu Vi chart](route:calculator.tu-vi)",
    };

    const html = renderToStaticMarkup(
      <PublicContentPage
        content={enContent}
        locale="en"
        repository={createPublicContentRepository([enContent], routes)}
        route={privacyRoute}
        routes={routes}
      />,
    );

    expect(html).toContain('href="/en/tu-vi"');
  });

  it("still renders title and summary when body is absent, without crashing", () => {
    const noBodyContent: PublicContentV1 = {
      ...privacyContent,
      body: undefined,
    };

    const html = renderToStaticMarkup(
      <PublicContentPage
        content={noBodyContent}
        locale="vi"
        repository={createPublicContentRepository([noBodyContent], routes)}
        route={privacyRoute}
        routes={routes}
      />,
    );

    expect(html).toContain("Chính sách bảo mật");
  });
});

describe("PublicContentPage rich-content templates (about/methodology/sources)", () => {
  const richBody = [
    "## Heading one",
    "",
    "Plain paragraph with **bold text** and `inline code`.",
    "",
    "## A list",
    "",
    "- **First:** one thing.",
    "- **Second:** another thing.",
    "",
    "## Steps",
    "",
    "1. First step.",
    "2. Second step.",
    "",
    "## A table",
    "",
    "| Wrong | Right |",
    "|---|---|",
    "| Bad thing | Good thing |",
    "",
    "## Tiếp tục",
    "",
    "[Lập lá số Tử Vi](route:calculator.tu-vi).",
  ].join("\n");

  const baseContent: PublicContentV1 = {
    routeId: "brand.about",
    locale: "vi",
    contentType: "SeoMetadata",
    title: "Về Lá Số Việt",
    summary: "Tóm tắt.",
    reviewer: "brand-reviewer",
    sourceReferences: ["docs/13-brand-experience-guideline.md"],
    riskTags: ["brand_claims"],
    status: "published",
    lastReviewed: "2026-09-15",
    body: richBody,
  };

  it.each([
    ["about-page", "brand.about", "/ve-la-so-viet"],
    ["methodology-hub", "methodology.root", "/phuong-phap"],
    ["methodology-page", "methodology.tu-vi", "/phuong-phap/tu-vi"],
    ["source-registry", "trust.sources", "/nguon-tri-thuc"],
  ])("renders headings, bold, code, lists, and tables for template %s", (template, routeId, path) => {
    const route = buildRoute({ id: routeId, path, intent: routeId, template });
    const content: PublicContentV1 = { ...baseContent, routeId };
    const html = renderToStaticMarkup(
      <PublicContentPage
        content={content}
        locale="vi"
        repository={createPublicContentRepository([content], [route, calculatorRoute, knowledgeRoute])}
        route={route}
        routes={[route, calculatorRoute, knowledgeRoute]}
      />,
    );

    expect(html).toContain("Heading one");
    expect(html).toContain("<strong>bold text</strong>");
    expect(html).toContain("<code>inline code</code>");
    expect(html).toContain("<strong>First:</strong>");
    expect(html).toContain("<ol>");
    expect(html).toContain("First step.");
    expect(html).toContain("<table>");
    expect(html).toContain("Bad thing");
    expect(html).toContain('href="/tu-vi"');
  });
});
