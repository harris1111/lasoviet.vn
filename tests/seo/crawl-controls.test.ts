import { describe, expect, it } from "vitest";

import { routeRegistry } from "@lasoviet/config";
import robots from "../../apps/web/src/app/robots";
import { GET as sitemapIndex } from "../../apps/web/src/app/sitemap.xml/route";
import { GET as sitemapSection } from "../../apps/web/src/app/sitemaps/[section]/route";
import {
  PRODUCTION_ORIGIN,
  SITEMAP_INDEX_URL,
  getSitemapIndexEntries,
  getSitemapSectionEntries,
} from "../../apps/web/src/seo/sitemap-registry";

describe("crawl controls", () => {
  it("includes both localized URLs for every eligible route from the typed registry", () => {
    const eligibleRoutes = routeRegistry.filter(
      (route) => route.status === "live_indexable" && route.sitemap && !route.private,
    );
    const entries = getSitemapIndexEntries();

    expect(entries).toHaveLength(eligibleRoutes.length * 2);
    for (const route of eligibleRoutes) {
      expect(entries.map((entry) => entry.url)).toContain(
        `${PRODUCTION_ORIGIN}${route.path}`,
      );
      expect(entries.map((entry) => entry.url)).toContain(
        `${PRODUCTION_ORIGIN}/en${route.path}`,
      );
    }
  });

  it("omits non-indexable routes from every sitemap section", () => {
    const crawledUrls = getSitemapIndexEntries().map((entry) => entry.url);
    const excludedRoutes = routeRegistry.filter(
      (route) =>
        route.private ||
        route.status === "reserved" ||
        route.status === "preview_noindex" ||
        route.status === "live_noindex" ||
        route.status === "archived",
    );

    for (const route of excludedRoutes) {
      expect(crawledUrls).not.toContain(`${PRODUCTION_ORIGIN}${route.path}`);
      expect(crawledUrls).not.toContain(`${PRODUCTION_ORIGIN}/en${route.path}`);
    }
  });

  it("serves each indexed section and rejects unknown sections with the contract code", async () => {
    const indexResponse = sitemapIndex();
    const indexXml = await indexResponse.text();

    for (const section of getSitemapSectionEntries()) {
      expect(indexXml).toContain(section.url);

      const response = await sitemapSection(
        new Request(`${PRODUCTION_ORIGIN}/sitemaps/${section.section}.xml`),
        { params: Promise.resolve({ section: section.section }) },
      );
      expect(response.status).toBe(200);
      expect(await response.text()).toContain("<urlset");
    }

    const invalidResponse = await sitemapSection(
      new Request(`${PRODUCTION_ORIGIN}/sitemaps/not-a-section.xml`),
      { params: Promise.resolve({ section: "not-a-section" }) },
    );
    expect(invalidResponse.status).toBe(404);
    await expect(invalidResponse.json()).resolves.toMatchObject({
      code: "SITEMAP_SECTION_INVALID",
    });
  });

  it("advertises the canonical sitemap index from robots", () => {
    expect(robots()).toMatchObject({
      host: PRODUCTION_ORIGIN,
      sitemap: SITEMAP_INDEX_URL,
    });
  });
});
