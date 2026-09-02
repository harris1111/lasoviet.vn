import { describe, expect, it } from "vitest";

import { loadGateOnePublicContent, productCatalog, routeRegistry } from "@lasoviet/config";

import { buildStructuredData, StructuredDataError } from "../../apps/web/src/seo/structured-data";

function route(id: string) {
  const value = routeRegistry.find((entry) => entry.id === id);
  if (value === undefined) throw new Error(`Missing route fixture ${id}`);
  return value;
}

function content(routeId: string, contentType = "KnowledgeArticle") {
  return {
    routeId,
    locale: "vi" as const,
    contentType: contentType as "KnowledgeArticle" | "CommercialPage",
    title: "Fact-based title",
    summary: "Fact-based summary.",
    reviewer: "content-reviewer",
    sourceReferences: ["source:one"],
    riskTags: [],
    status: "published" as const,
    lastReviewed: "2026-09-01",
  };
}

describe("structured data", () => {
  it("builds Article and BreadcrumbList only from route and content facts", () => {
    const articleRoute = route("knowledge.tu-vi.definition");
    const nodes = buildStructuredData(articleRoute, content(articleRoute.id));

    expect(nodes).toEqual([
      {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: "Fact-based title",
        description: "Fact-based summary.",
        inLanguage: "vi",
        mainEntityOfPage: "https://lasoviet.vn/kien-thuc/tu-vi/la-so-tu-vi-la-gi",
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Fact-based title",
            item: "https://lasoviet.vn/kien-thuc/tu-vi/la-so-tu-vi-la-gi",
          },
        ],
      },
    ]);
  });

  it("uses the server product catalog for the identity Product and Offer", () => {
    const identityRoute = route("commercial.tu-vi.identity");
    const nodes = buildStructuredData(
      identityRoute,
      content(identityRoute.id, "CommercialPage"),
      productCatalog,
    );

    expect(nodes[0]).toMatchObject({
      "@type": "Product",
      sku: "ZIWEI-IDENTITY-P0",
      offers: {
        "@type": "Offer",
        price: 79000,
        priceCurrency: "VND",
      },
    });
  });

  it("rejects unsupported and content-insufficient schema requests", () => {
    const articleRoute = route("knowledge.tu-vi.definition");

    expect(() =>
      buildStructuredData(
        { ...articleRoute, schemaTypes: ["Review"] },
        content(articleRoute.id),
      ),
    ).toThrow(new StructuredDataError("SCHEMA_CONTENT_MISMATCH"));
    expect(() =>
      buildStructuredData(
        { ...articleRoute, schemaTypes: ["FAQPage"] },
        content(articleRoute.id),
      ),
    ).toThrow(new StructuredDataError("SCHEMA_CONTENT_MISMATCH"));
    expect(() =>
      buildStructuredData(
        { ...articleRoute, schemaTypes: ["Person", "AggregateRating"] },
        content(articleRoute.id),
      ),
    ).toThrow(new StructuredDataError("SCHEMA_CONTENT_MISMATCH"));
  });

  it("builds FAQPage only from published FAQ items", () => {
    const faqRoute = route("support.faq");
    const faqContent = loadGateOnePublicContent().get(faqRoute.id, "en").frontmatter;

    const [faqNode] = buildStructuredData(faqRoute, faqContent);

    expect(faqNode).toMatchObject({
      "@type": "FAQPage",
    });
    expect((faqNode?.mainEntity as { name: string }[])[0]).toMatchObject({
      "@type": "Question",
      name: "Does a chart determine the future?",
    });
  });
});
