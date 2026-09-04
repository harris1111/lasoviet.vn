import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  PublicContentV1Schema,
  RouteDefinitionV1Schema,
  type PublicContentV1,
  type RouteDefinitionV1,
} from "@lasoviet/contracts";
import { parse as parseYaml } from "yaml";

export type RouteRegistryErrorCode =
  | "ROUTE_REGISTRY_INVALID"
  | "ROUTE_INTENT_COLLISION"
  | "ROUTE_STATE_INVALID"
  | "CONTENT_METADATA_INVALID";

export class RouteRegistryError extends Error {
  readonly code: RouteRegistryErrorCode;

  constructor(code: RouteRegistryErrorCode, message: string) {
    super(`${code}: ${message}`);
    this.name = "RouteRegistryError";
    this.code = code;
  }
}

type RawRoute = {
  id?: unknown;
  path?: unknown;
  intent?: unknown;
  template?: unknown;
  discipline?: unknown;
  locale_behavior?: unknown;
  locale_owners?: unknown;
  owner?: unknown;
  indexing?: unknown;
  canonical?: unknown;
  robots?: unknown;
  schema_types?: unknown;
  redirect?: unknown;
  priority?: unknown;
  status?: unknown;
  sitemap?: unknown;
  private?: unknown;
  purchasable?: unknown;
  sku?: unknown;
  content?: unknown;
  reviewer?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function registryError(
  code: RouteRegistryErrorCode,
  message: string,
): RouteRegistryError {
  return new RouteRegistryError(code, message);
}

function normalizeRoute(raw: RawRoute, index: number): RouteDefinitionV1 {
  const normalized = {
    id: raw.id,
    path: raw.path,
    intent: raw.intent,
    template: raw.template,
    discipline: raw.discipline,
    localeBehavior: raw.locale_behavior,
    localeOwners: raw.locale_owners,
    owner: raw.owner,
    indexing: raw.indexing,
    canonical: raw.canonical,
    robots: raw.robots,
    schemaTypes: raw.schema_types,
    redirect: raw.redirect,
    priority: raw.priority,
    status: raw.status,
    sitemap: raw.sitemap,
    private: raw.private ?? false,
    purchasable: raw.purchasable ?? false,
    sku: raw.sku,
    content: raw.content,
    reviewer: raw.reviewer,
  };
  const parsed = RouteDefinitionV1Schema.safeParse(normalized);
  if (!parsed.success) {
    const hasStateIssue = parsed.error.issues.some((issue) =>
      issue.path.includes("status"),
    );
    throw registryError(
      hasStateIssue ? "ROUTE_STATE_INVALID" : "ROUTE_REGISTRY_INVALID",
      `Invalid route at index ${index}`,
    );
  }
  return parsed.data;
}

export function validateRouteRegistry(
  routes: readonly unknown[],
): RouteDefinitionV1[] {
  const parsedRoutes = routes.map((route, index) => {
    if (!isRecord(route)) {
      throw registryError("ROUTE_REGISTRY_INVALID", `Route ${index} is not an object`);
    }
    return RouteDefinitionV1Schema.safeParse(route);
  });

  const normalizedRoutes = parsedRoutes.map((parsed, index) => {
    if (!parsed.success) {
      const hasStateIssue = parsed.error.issues.some((issue) =>
        issue.path.includes("status"),
      );
      throw registryError(
        hasStateIssue ? "ROUTE_STATE_INVALID" : "ROUTE_REGISTRY_INVALID",
        `Invalid route at index ${index}`,
      );
    }
    return parsed.data;
  });

  const paths = new Set<string>();
  const intents = new Set<string>();
  for (const route of normalizedRoutes) {
    if (paths.has(route.path)) {
      throw registryError("ROUTE_REGISTRY_INVALID", `Duplicate path ${route.path}`);
    }
    paths.add(route.path);

    if (intents.has(route.intent)) {
      throw registryError(
        "ROUTE_INTENT_COLLISION",
        `Canonical intent collision ${route.intent}`,
      );
    }
    intents.add(route.intent);

    if (route.private && route.sitemap) {
      throw registryError(
        "ROUTE_REGISTRY_INVALID",
        `Private route appears in sitemap: ${route.path}`,
      );
    }
    if (route.status === "reserved" && route.purchasable) {
      throw registryError(
        "ROUTE_STATE_INVALID",
        `Reserved route is purchasable: ${route.path}`,
      );
    }
    if (route.status === "live_indexable") {
      if (
        route.content === undefined ||
        route.reviewer === undefined ||
        !route.localeOwners.includes("vi") ||
        !route.localeOwners.includes("en")
      ) {
        throw registryError(
          "CONTENT_METADATA_INVALID",
          `Indexable route lacks reviewed VI/EN content: ${route.path}`,
        );
      }
    }
  }
  return normalizedRoutes;
}

function readRegistrySource(): string {
  const workingDirectoryPath = resolve(process.cwd(), "config", "route-registry.yml");
  const sourcePath = existsSync(workingDirectoryPath)
    ? workingDirectoryPath
    : resolve(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
    "..",
    "config",
    "route-registry.yml",
  );
  return readFileSync(sourcePath, "utf8");
}

export function loadRouteRegistry(source = readRegistrySource()): RouteDefinitionV1[] {
  let document: unknown;
  try {
    document = parseYaml(source, { merge: true });
  } catch {
    throw registryError("ROUTE_REGISTRY_INVALID", "YAML could not be parsed");
  }

  if (!isRecord(document) || !Array.isArray(document.routes)) {
    throw registryError("ROUTE_REGISTRY_INVALID", "YAML must contain routes");
  }

  return validateRouteRegistry(
    document.routes.map((route, index) => normalizeRoute(route as RawRoute, index)),
  );
}

export const routeRegistry = loadRouteRegistry();

export function validatePublicContent(
  records: readonly unknown[],
  routes: readonly RouteDefinitionV1[] = routeRegistry,
): PublicContentV1[] {
  const routeById = new Map(routes.map((route) => [route.id, route]));
  const parsed = records.map((record, index) => {
    const result = PublicContentV1Schema.safeParse(record);
    if (!result.success) {
      throw registryError(
        "CONTENT_METADATA_INVALID",
        `Invalid public content at index ${index}`,
      );
    }
    const route = routeById.get(result.data.routeId);
    if (
      route === undefined ||
      !route.localeOwners.includes(result.data.locale) ||
      route.status !== "live_indexable"
    ) {
      throw registryError(
        "CONTENT_METADATA_INVALID",
        `Public content has no owned public route: ${result.data.routeId}`,
      );
    }
    if (result.data.status !== "published") {
      throw registryError(
        "CONTENT_METADATA_INVALID",
        `Public content is not published: ${result.data.routeId}`,
      );
    }
    return result.data;
  });
  return parsed;
}
