import { describe, expect, it } from "vitest";

import { routeRegistry } from "@lasoviet/config";

import { loadPublicContentRepository } from "../../apps/web/src/features/content/public-content-repository";
import { resolvePublicRoute } from "../../apps/web/src/features/content/public-route-resolver";
import {
  PRODUCTION_ORIGIN,
  getSitemapIndexEntries,
} from "../../apps/web/src/seo/sitemap-registry";

const forecastRoute = routeRegistry.find(
  (route) => route.id === "calculator.horoscope-forecast",
);
const redirectRoute = routeRegistry.find((route) => route.id === "redirect.horoscope");

if (forecastRoute === undefined || redirectRoute === undefined) {
  throw new Error("Required horoscope route fixtures are missing");
}

describe("founder-approved horoscope route decision", () => {
  it("activates the forecast target without indexing the archived redirect", () => {
    const repository = loadPublicContentRepository(routeRegistry);
    const sitemapUrls = getSitemapIndexEntries().map((entry) => entry.url);

    expect(forecastRoute).toMatchObject({
      path: "/du-bao-cung-hoang-dao",
      status: "live_indexable",
      sitemap: true,
      private: false,
      localeOwners: ["vi", "en"],
    });
    expect(repository.get(forecastRoute.id, "vi")).toMatchObject({
      contentType: "ToolLanding",
      status: "published",
    });
    expect(repository.get(forecastRoute.id, "en")).toMatchObject({
      contentType: "ToolLanding",
      status: "published",
    });
    expect(
      resolvePublicRoute(forecastRoute.path, {
        routes: routeRegistry,
        contentRepository: repository,
      }),
    ).toMatchObject({
      kind: "render",
      locale: "vi",
      route: { id: forecastRoute.id },
      content: { contentType: "ToolLanding" },
    });
    expect(
      resolvePublicRoute(`/en${forecastRoute.path}`, {
        routes: routeRegistry,
        contentRepository: repository,
      }),
    ).toMatchObject({
      kind: "render",
      locale: "en",
      route: { id: forecastRoute.id },
      content: { contentType: "ToolLanding" },
    });
    expect(sitemapUrls).toContain(`${PRODUCTION_ORIGIN}${forecastRoute.path}`);
    expect(sitemapUrls).toContain(`${PRODUCTION_ORIGIN}/en${forecastRoute.path}`);
    expect(sitemapUrls).not.toContain(`${PRODUCTION_ORIGIN}${redirectRoute.path}`);
    expect(sitemapUrls).not.toContain(`${PRODUCTION_ORIGIN}/en${redirectRoute.path}`);
    expect(
      resolvePublicRoute(redirectRoute.path, {
        routes: routeRegistry,
        contentRepository: repository,
      }),
    ).toEqual({
      kind: "redirect",
      status: 301,
      target: "/du-bao-cung-hoang-dao",
    });
  });
});
