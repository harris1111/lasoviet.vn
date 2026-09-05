import type { PublicContentV1, RouteDefinitionV1 } from "@lasoviet/contracts";

import type { PublicContentRepository } from "./public-content-repository";

export type PublicRouteResolution =
  | {
      kind: "render";
      locale: PublicContentV1["locale"];
      route: RouteDefinitionV1;
      content: PublicContentV1;
    }
  | {
      kind: "not-found";
      state: "archived" | "preview_noindex" | "private" | "reserved" | "unknown";
      code?: "ROUTE_ARCHIVED" | "ROUTE_RESERVED";
    }
  | { kind: "redirect"; status: 301; target: string }
  | { kind: "gone"; status: 410; code: "ROUTE_ARCHIVED" };

type ResolverDependencies = {
  routes: readonly RouteDefinitionV1[];
  contentRepository: PublicContentRepository;
};

function normalizedPath(pathname: string): string {
  const path = pathname.split(/[?#]/, 1)[0] || "/";
  return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
}

function localizedPath(pathname: string): {
  locale: PublicContentV1["locale"];
  path: string;
} {
  const normalized = normalizedPath(pathname);
  if (normalized === "/en") return { locale: "en", path: "/" };
  if (normalized.startsWith("/en/")) return { locale: "en", path: normalized.slice(3) };
  return { locale: "vi", path: normalized };
}

function matchesRoute(path: string, routePath: string): boolean {
  const segments = path.split("/").filter(Boolean);
  const routeSegments = routePath.split("/").filter(Boolean);
  if (segments.length !== routeSegments.length) return false;
  return routeSegments.every((segment, index) => {
    const pattern = segment
      .split(/(\{[^/{}]+\})/)
      .map((part) =>
        /^\{[^/{}]+\}$/.test(part)
          ? "[^/]+"
          : part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      )
      .join("");
    return new RegExp(`^${pattern}$`).test(segments[index] ?? "");
  });
}

function routeForPath(
  path: string,
  routes: readonly RouteDefinitionV1[],
): RouteDefinitionV1 | undefined {
  return routes
    .filter((route) => matchesRoute(path, route.path))
    .sort(
      (left, right) =>
        (left.path.match(/\{/g)?.length ?? 0) - (right.path.match(/\{/g)?.length ?? 0),
    )[0];
}

export function resolvePublicRoute(
  pathname: string,
  dependencies: ResolverDependencies,
): PublicRouteResolution {
  const localized = localizedPath(pathname);
  const route = routeForPath(localized.path, dependencies.routes);
  if (route === undefined) return { kind: "not-found", state: "unknown" };
  if (route.private) return { kind: "not-found", state: "private" };
  if (route.status === "reserved") {
    return { kind: "not-found", state: "reserved", code: "ROUTE_RESERVED" };
  }
  if (route.status === "preview_noindex") {
    return { kind: "not-found", state: "preview_noindex" };
  }
  if (route.status === "archived") {
    if (route.redirect.disposition === "301" && route.redirect.target !== undefined) {
      return { kind: "redirect", status: 301, target: route.redirect.target };
    }
    if (route.redirect.disposition === "410") {
      return { kind: "gone", status: 410, code: "ROUTE_ARCHIVED" };
    }
    return { kind: "not-found", state: "archived", code: "ROUTE_ARCHIVED" };
  }
  if (route.status !== "live_indexable" && route.status !== "live_noindex") {
    return { kind: "not-found", state: "unknown" };
  }

  return {
    kind: "render",
    locale: localized.locale,
    route,
    content: dependencies.contentRepository.get(route.id, localized.locale),
  };
}
