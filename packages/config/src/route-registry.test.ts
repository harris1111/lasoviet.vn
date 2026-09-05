import { describe, expect, it } from "vitest";
import { routeStateSchema } from "@lasoviet/contracts";

import {
  loadRouteRegistry,
  routeRegistry,
  validatePublicContent,
  validateRouteRegistry,
} from "./route-registry.js";

const validRoute = {
  id: "test.route",
  path: "/test-route",
  intent: "test-intent",
  template: "test-template",
  localeBehavior: "vi_default_en_explicit",
  localeOwners: ["vi", "en"],
  owner: "test-owner",
  indexing: "noindex_nofollow",
  canonical: "self",
  robots: "noindex,nofollow",
  schemaTypes: [],
  redirect: { disposition: "none" },
  status: "live_noindex",
  sitemap: false,
  private: false,
  purchasable: false,
} as const;

describe("route registry", () => {
  it("exposes the approved route states and one first purchasable SKU", () => {
    expect(routeStateSchema.options).toEqual([
      "reserved",
      "preview_noindex",
      "live_noindex",
      "live_indexable",
      "archived",
    ]);
    expect(routeRegistry.filter((route) => route.purchasable).map((route) => route.sku)).toEqual([
      "ZIWEI-IDENTITY-P0",
    ]);
  });

  it("rejects duplicate paths, intent collisions, private sitemap routes, and invalid commercial states", () => {
    expect(() =>
      validateRouteRegistry([
        validRoute,
        { ...validRoute, id: "test.route.2", intent: "test-intent.2" },
      ]),
    ).toThrow(/ROUTE_REGISTRY_INVALID/);

    expect(() =>
      validateRouteRegistry([
        validRoute,
        {
          ...validRoute,
          id: "test.route.2",
          path: "/test-route-2",
        },
      ]),
    ).toThrow(/ROUTE_INTENT_COLLISION/);

    expect(() =>
      validateRouteRegistry([
        {
          ...validRoute,
          id: "private.route",
          path: "/private",
          private: true,
          sitemap: true,
        },
      ]),
    ).toThrow(/ROUTE_REGISTRY_INVALID/);

    expect(() =>
      validateRouteRegistry([
        {
          ...validRoute,
          id: "reserved.product",
          path: "/reserved-product",
          status: "reserved",
          purchasable: true,
          sku: "RESERVED-P0",
        },
      ]),
    ).toThrow(/ROUTE_STATE_INVALID/);
  });

  it("requires content and reviewer metadata for indexable routes", () => {
    expect(() =>
      validateRouteRegistry([
        {
          ...validRoute,
          id: "indexable.route",
          path: "/indexable",
          status: "live_indexable",
          sitemap: true,
        },
      ]),
    ).toThrow(/CONTENT_METADATA_INVALID/);
  });

  it("loads the versioned YAML route definitions through the typed loader", () => {
    expect(loadRouteRegistry()).toEqual(routeRegistry);
  });

  it("keeps the canonical topic route private, noindex, and out of sitemaps", () => {
    expect(routeRegistry.find((route) => route.id === "private.chart.topic")).toMatchObject({
      path: "/la-so/{opaque_id}/chon-luan-giai",
      private: true,
      indexing: "noindex_nofollow",
      sitemap: false,
    });
  });
  it("validates live_noindex preview route definitions and enforces validPublicContent rules", () => {
    const previewRoute = {
      ...validRoute,
      id: "calculator.bat-tu",
      path: "/bat-tu",
      status: "live_noindex",
      indexing: "noindex_follow",
      robots: "noindex,follow",
      sitemap: false,
      private: false,
      purchasable: false,
      content: "reviewed",
      reviewer: "content-team",
    } as const;

    expect(validateRouteRegistry([previewRoute])).toEqual([previewRoute]);
    const sampleContent = {
      routeId: "preview.bat-tu",
      locale: "vi",
      contentType: "ToolLanding",
      title: "Bát Tự / Tứ Trụ — Sắp ra mắt · Lá Số Việt",
      summary: "Xem trước Bát Tự",
      reviewer: "content-team",
      sourceReferences: ["docs/13-brand-experience-guideline.md"],
      riskTags: ["uncertainty_disclosure"],
      status: "published",
      lastReviewed: "2026-09-05",
    };

    expect(validatePublicContent([sampleContent], [{ ...previewRoute, id: "preview.bat-tu" }])).toEqual([sampleContent]);

    expect(() =>
      validatePublicContent(
        [sampleContent],
        [{ ...previewRoute, id: "preview.bat-tu", status: "reserved" }],
      ),
    ).toThrow(/CONTENT_METADATA_INVALID/);

    expect(() =>
      validatePublicContent(
        [sampleContent],
        [{ ...previewRoute, id: "preview.bat-tu", status: "preview_noindex" }],
      ),
    ).toThrow(/CONTENT_METADATA_INVALID/);

    expect(() =>
      validatePublicContent(
        [sampleContent],
        [{ ...previewRoute, id: "preview.bat-tu", status: "live_noindex", private: true }],
      ),
    ).toThrow(/CONTENT_METADATA_INVALID/);

    expect(() =>
      validatePublicContent(
        [sampleContent],
        [{ ...previewRoute, id: "preview.bat-tu", status: "archived" }],
      ),
    ).toThrow(/CONTENT_METADATA_INVALID/);

    // Should fail until updated in Task 1A
    expect(routeRegistry.find((route) => route.id === "calculator.bat-tu")).toMatchObject({
      path: "/bat-tu",
      status: "live_noindex",
      template: "discipline-flagship",
      indexing: "noindex_follow",
      robots: "noindex,follow",
      sitemap: false,
      private: false,
      purchasable: false,
    });
  });
});