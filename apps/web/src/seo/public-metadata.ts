import type { PublicContentV1, RouteDefinitionV1 } from "@lasoviet/contracts";

export const PRODUCTION_ORIGIN = "https://lasoviet.vn";

export type RobotsPolicy = { index: boolean; follow: boolean };

export type PublicMetadata = {
  title?: string;
  description?: string;
  alternates?: {
    canonical: string;
    languages: Record<"vi" | "en" | "x-default", string>;
  };
  robots: RobotsPolicy;
};

function localizedUrl(path: string, locale: PublicContentV1["locale"]): string {
  if (locale === "vi") return `${PRODUCTION_ORIGIN}${path}`;
  return path === "/" ? `${PRODUCTION_ORIGIN}/en` : `${PRODUCTION_ORIGIN}/en${path}`;
}

function canonicalPath(route: RouteDefinitionV1): string {
  if (route.canonical === "self") return route.path;
  if (!route.canonical.startsWith("/")) {
    throw new Error("PUBLIC_CANONICAL_INVALID");
  }
  return route.canonical;
}

export function buildRobotsPolicy(route: RouteDefinitionV1): RobotsPolicy {
  if (route.private) {
    return { index: false, follow: false };
  }
  switch (route.indexing) {
    case "index_follow":
      return { index: true, follow: true };
    case "noindex_follow":
      return { index: false, follow: true };
    case "noindex_nofollow":
    case "redirect":
      return { index: false, follow: false };
  }
}

export function buildPublicMetadata(
  route: RouteDefinitionV1,
  content: PublicContentV1 | undefined,
): PublicMetadata {
  const robots = buildRobotsPolicy(route);
  const isRenderable =
    route.status === "live_indexable" || route.status === "live_noindex";
  if (content === undefined || route.private || !isRenderable) {
    return { robots };
  }
  const path = canonicalPath(route);

  return {
    title: content.title,
    description: content.summary,
    alternates: {
      canonical: localizedUrl(path, content.locale),
      languages: {
        vi: localizedUrl(path, "vi"),
        en: localizedUrl(path, "en"),
        "x-default": localizedUrl(path, "vi"),
      },
    },
    robots,
  };
}
