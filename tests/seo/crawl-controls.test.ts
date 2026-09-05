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

function englishUrl(path: string): string {
  return path === "/"
    ? `${PRODUCTION_ORIGIN}/en`
    : `${PRODUCTION_ORIGIN}/en${path}`;
}

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
        englishUrl(route.path),
      );
    }
    expect(entries.map((entry) => entry.url)).not.toContain(
      `${PRODUCTION_ORIGIN}/en/`,
    );
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
      expect(crawledUrls).not.toContain(englishUrl(route.path));
    }
  });

  it("serves each indexed section and rejects unknown sections with the contract code", async () => {
    const indexResponse = sitemapIndex();
    const indexXml = await indexResponse.text();

    for (const section of getSitemapSectionEntries()) {
      expect(indexXml).toContain(section.url);

      const sectionParam = new URL(section.url).pathname.split("/").at(-1);
      expect(sectionParam).toBe(`${section.section}.xml`);

      const response = await sitemapSection(
        new Request(`${PRODUCTION_ORIGIN}/sitemaps/${section.section}.xml`),
        { params: Promise.resolve({ section: sectionParam }) },
      );
      expect(response.status).toBe(200);
      expect(await response.text()).toContain("<urlset");
    }

    const invalidResponse = await sitemapSection(
      new Request(`${PRODUCTION_ORIGIN}/sitemaps/not-a-section.xml`),
      { params: Promise.resolve({ section: "not-a-section.xml" }) },
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
  it("strictly excludes live_noindex discipline preview routes from all sitemaps", () => {
    const crawledUrls = getSitemapIndexEntries().map((entry) => entry.url);
    const previewPaths = [
      "/bat-tu",
      "/kinh-dich",
      "/chiem-tinh",
      "/than-so-hoc",
      "/cong-cu-mien-phi",
      "/ngay-tot",
      "/12-con-giap",
      "/giai-ma-giac-mo",
      "/boi-bai",
      "/lich-am",
      "/phong-thuy/huong-nha",
      "/xem-chi-tay",
    ];

    for (const path of previewPaths) {
      expect(crawledUrls).not.toContain(`${PRODUCTION_ORIGIN}${path}`);
      expect(crawledUrls).not.toContain(englishUrl(path));
    }

    const previewRoutes = routeRegistry.filter((r) => previewPaths.includes(r.path));
    expect(previewRoutes).toHaveLength(12);
    for (const r of previewRoutes) {
      expect(r.status).toBe("live_noindex");
      expect(r.sitemap).toBe(false);
      expect(r.indexing).toBe("noindex_follow");
      expect(r.robots).toBe("noindex,follow");
    }
  });
});