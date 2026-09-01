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

export function buildRobotsPolicy(route: RouteDefinitionV1): RobotsPolicy {
  if (route.private || route.status !== "live_indexable") {
    return { index: false, follow: false };
  }
  return {
    index: route.robots.includes("index") && !route.robots.includes("noindex"),
    follow: route.robots.includes("follow") && !route.robots.includes("nofollow"),
  };
}

export function buildPublicMetadata(
  route: RouteDefinitionV1,
  content: PublicContentV1 | undefined,
): PublicMetadata {
  const robots = buildRobotsPolicy(route);
  if (content === undefined || route.private || route.status !== "live_indexable") {
    return { robots };
  }

  return {
    title: content.title,
    description: content.summary,
    alternates: {
      canonical: localizedUrl(route.path, content.locale),
      languages: {
        vi: localizedUrl(route.path, "vi"),
        en: localizedUrl(route.path, "en"),
        "x-default": localizedUrl(route.path, "vi"),
      },
    },
    robots,
  };
}
