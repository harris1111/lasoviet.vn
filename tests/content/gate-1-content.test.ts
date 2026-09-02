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
