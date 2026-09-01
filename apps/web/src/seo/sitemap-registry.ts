import { routeRegistry } from "@lasoviet/config";
import type { RouteDefinitionV1 } from "@lasoviet/contracts";

export const PRODUCTION_ORIGIN = "https://lasoviet.vn";
export const SITEMAP_INDEX_URL = `${PRODUCTION_ORIGIN}/sitemap.xml`;

export const sitemapSections = ["pages", "tools", "knowledge-tu-vi"] as const;
export type SitemapSection = (typeof sitemapSections)[number];

export type SitemapUrlEntry = {
  url: string;
};

export type SitemapSectionEntry = SitemapUrlEntry & {
  section: SitemapSection;
};

function isCrawledRoute(route: RouteDefinitionV1): boolean {
  return route.status === "live_indexable" && route.sitemap && !route.private;
}

function sectionForRoute(route: RouteDefinitionV1): SitemapSection {
  if (route.template === "calculator-landing") {
    return "tools";
  }
  if (route.id.startsWith("knowledge.tu-vi")) {
    return "knowledge-tu-vi";
  }
  return "pages";
}

function localizedUrls(path: string): SitemapUrlEntry[] {
  return [
    { url: `${PRODUCTION_ORIGIN}${path}` },
    { url: `${PRODUCTION_ORIGIN}/en${path}` },
  ];
}

function crawledRoutes(): RouteDefinitionV1[] {
  return routeRegistry.filter(isCrawledRoute);
}

export function getSitemapIndexEntries(): SitemapUrlEntry[] {
  return crawledRoutes().flatMap((route) => localizedUrls(route.path));
}

export function getSitemapSectionEntries(): SitemapSectionEntry[] {
  return sitemapSections.map((section) => ({
    section,
    url: `${PRODUCTION_ORIGIN}/sitemaps/${section}.xml`,
  }));
}

export function getRobotsSitemapUrl(): string | undefined {
  return getSitemapIndexEntries().length > 0 ? SITEMAP_INDEX_URL : undefined;
}

export function getSitemapSectionUrls(
  section: SitemapSection,
): SitemapUrlEntry[] {
  return crawledRoutes()
    .filter((route) => sectionForRoute(route) === section)
    .flatMap((route) => localizedUrls(route.path));
}

export function isSitemapSection(value: string): value is SitemapSection {
  return sitemapSections.includes(value as SitemapSection);
}
