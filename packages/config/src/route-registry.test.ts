import { describe, expect, it } from "vitest";
import { routeStateSchema } from "@lasoviet/contracts";

import {
  loadRouteRegistry,
  routeRegistry,
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

  it("keeps account recovery routes noindex and out of sitemaps", () => {
    expect(
      routeRegistry
        .filter((route) => route.id.startsWith("auth."))
        .map((route) => ({
          id: route.id,
          path: route.path,
          status: route.status,
          robots: route.robots,
          sitemap: route.sitemap,
        })),
    ).toEqual([
      {
        id: "auth.sign-in",
        path: "/dang-nhap",
        status: "live_noindex",
        robots: "noindex,nofollow",
        sitemap: false,
      },
      {
        id: "auth.password-reset.request",
        path: "/quen-mat-khau",
        status: "live_noindex",
        robots: "noindex,nofollow",
        sitemap: false,
      },
      {
        id: "auth.password-reset.complete",
        path: "/dat-lai-mat-khau",
        status: "live_noindex",
        robots: "noindex,nofollow",
        sitemap: false,
      },
    ]);
  });
});
