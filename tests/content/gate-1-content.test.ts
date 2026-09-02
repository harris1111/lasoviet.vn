import { describe, expect, it } from "vitest";

import {
  loadGateOnePublicContent,
  routeRegistry,
  validateGateOnePublicContent,
} from "@lasoviet/config";

describe("Gate 1 public content", () => {
  it("loads one published VI and EN document for every indexable route", () => {
    const content = loadGateOnePublicContent();
    const indexableRoutes = routeRegistry.filter(
      (route) => route.status === "live_indexable",
    );

    expect(content.documents).toHaveLength(indexableRoutes.length * 2);
    expect(content.documents.filter((document) => document.kind === "article")).toHaveLength(20);
    expect(content.sources.get("phase-one-product-spec")).toBe(
      "docs/04-phase-1-product-spec.md",
    );

    for (const route of indexableRoutes) {
      expect(content.get(route.id, "vi").frontmatter).toMatchObject({
        routeId: route.id,
        locale: "vi",
        status: "published",
      });
      expect(content.get(route.id, "en").frontmatter).toMatchObject({
        routeId: route.id,
        locale: "en",
        status: "published",
      });
    }
  });

  it("keeps document links, declared related routes, locale, and FAQ facts publishable", () => {
    const content = loadGateOnePublicContent();
    const routeLinks = /\]\(route:([a-z0-9.-]+)\)/g;

    for (const document of content.documents) {
      const links = [...document.body.matchAll(routeLinks)].map((match) => match[1]);
      expect(links).toEqual(expect.arrayContaining(document.frontmatter.relatedRouteIds));
      expect(document.body).not.toMatch(
        document.frontmatter.locale === "vi"
          ? /\b(The|This|Build|Sources|Practical)\b/
          : /[àáảãạăâđêôơư]/iu,
      );
    }

    for (const locale of ["vi", "en"] as const) {
      const faq = content.get("support.faq", locale);
      for (const item of faq.frontmatter.faqItems ?? []) {
        expect(faq.body).toContain(item.question);
        expect(faq.body).toContain(item.answer);
      }
    }
  });

  it("rejects missing content contracts and unsafe publishability signals", () => {
    const content = loadGateOnePublicContent();
    const article = content.documents.find((document) => document.kind === "article");

    if (article === undefined) throw new Error("Expected an article fixture");

    expect(() =>
      validateGateOnePublicContent({
        ...content,
        documents: content.documents.filter(
          (document) => document.frontmatter.routeId !== "brand.home",
        ),
      }),
    ).toThrow(/PUBLIC_CONTENT_INVALID/);
    expect(() =>
      validateGateOnePublicContent({
        ...content,
        documents: content.documents.map((document) =>
          document === article
            ? {
              ...document,
              frontmatter: {
                ...document.frontmatter,
                relatedRouteIds: [
                  "calculator.tu-vi",
                  "knowledge.tu-vi",
                  "knowledge.tu-vi",
                  "knowledge.tu-vi.calculation",
                ],
              },
            }
            : document,
        ),
      }),
    ).toThrow(/PUBLIC_CONTENT_INVALID/);
    const sibling = content.documents.find(
      (document) =>
        document.kind === "article" &&
        document.frontmatter.routeId !== article.frontmatter.routeId,
    );
    if (sibling === undefined) throw new Error("Expected a sibling article fixture");
    expect(() =>
      validateGateOnePublicContent({
        ...content,
        documents: content.documents.map((document) =>
          document === sibling ? { ...document, body: `${article.body} ` } : document,
        ),
      }),
    ).toThrow(/PUBLIC_CONTENT_INVALID/);
    expect(() =>
      validateGateOnePublicContent({
        ...content,
        documents: content.documents.map((document) =>
          document === article
            ? {
              ...document,
              frontmatter: {
                ...document.frontmatter,
                relatedRouteIds: ["commercial.tu-vi.relationship"],
              },
              body: document.body.replace(
                "route:knowledge.tu-vi.calculation",
                "route:commercial.tu-vi.relationship",
              ),
            }
            : document,
        ),
      }),
    ).toThrow(/PUBLIC_CONTENT_INVALID/);
    expect(() =>
      validateGateOnePublicContent({
        ...content,
        reviewers: new Set(),
      }),
    ).toThrow(/PUBLIC_CONTENT_INVALID/);
    expect(() =>
      validateGateOnePublicContent({
        ...content,
        documents: content.documents.map((document) =>
          document === article
            ? { ...document, frontmatter: { ...document.frontmatter, sourceIds: [] } }
            : document,
        ),
      }),
    ).toThrow(/PUBLIC_CONTENT_INVALID/);
    expect(() =>
      validateGateOnePublicContent({
        ...content,
        documents: content.documents.map((document) =>
          document === article
            ? { ...document, frontmatter: { ...document.frontmatter, limitations: "" } }
            : document,
        ),
      }),
    ).toThrow(/PUBLIC_CONTENT_INVALID/);
    expect(() =>
      validateGateOnePublicContent({
        ...content,
        documents: content.documents.map((document) =>
          document === article
            ? { ...document, frontmatter: { ...document.frontmatter, figure: undefined } }
            : document,
        ),
      }),
    ).toThrow(/PUBLIC_CONTENT_INVALID/);
    expect(() =>
      validateGateOnePublicContent({
        ...content,
        documents: content.documents.map((document) =>
          document === article
            ? {
              ...document,
              body: `${document.body}\n\nGuaranteed results from a certified expert. Limited time only.`,
            }
            : document,
        ),
      }),
    ).toThrow(/PUBLIC_CONTENT_INVALID/);
  });
});
