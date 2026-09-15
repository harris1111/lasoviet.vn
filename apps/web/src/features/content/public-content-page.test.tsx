import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { PublicContentV1, RouteDefinitionV1 } from "@lasoviet/contracts";

import { PublicContentPage } from "./public-content-page";
import { createPublicContentRepository } from "./public-content-repository";

function buildRoute(overrides: Partial<RouteDefinitionV1>): RouteDefinitionV1 {
  return {
    id: "trust.privacy",
    path: "/chinh-sach-bao-mat",
    intent: "trust.privacy",
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
  routeId: "trust.privacy",
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
