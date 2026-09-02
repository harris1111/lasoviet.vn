import {
  PublicContentV1Schema,
  type PublicContentV1,
  type RouteDefinitionV1,
} from "@lasoviet/contracts";
import rawPublicContent from "../../../../../config/public-content.json" with { type: "json" };

export type PublicContentRepositoryErrorCode = "PUBLIC_CONTENT_NOT_FOUND";

export class PublicContentRepositoryError extends Error {
  readonly code: PublicContentRepositoryErrorCode;

  constructor(code: PublicContentRepositoryErrorCode) {
    super(code);
    this.name = "PublicContentRepositoryError";
    this.code = code;
  }
}

export type PublicContentRepository = {
  get(routeId: string, locale: PublicContentV1["locale"]): PublicContentV1;
};

function contentKey(routeId: string, locale: PublicContentV1["locale"]): string {
  return `${routeId}:${locale}`;
}

function invalidContent(): never {
  throw new PublicContentRepositoryError("PUBLIC_CONTENT_NOT_FOUND");
}

export function createPublicContentRepository(
  records: readonly unknown[],
  routes: readonly RouteDefinitionV1[],
): PublicContentRepository {
  const routesById = new Map(routes.map((route) => [route.id, route]));
  const recordsByKey = new Map<string, PublicContentV1>();

  for (const record of records) {
    const parsed = PublicContentV1Schema.safeParse(record);
    if (!parsed.success) invalidContent();

    const content = parsed.data;
    const route = routesById.get(content.routeId);
    const key = contentKey(content.routeId, content.locale);
    if (
      route === undefined ||
      route.status !== "live_indexable" ||
      !route.localeOwners.includes(content.locale) ||
      content.status !== "published" ||
      recordsByKey.has(key)
    ) {
      invalidContent();
    }
    recordsByKey.set(key, content);
  }

  return {
    get(routeId, locale) {
      const content = recordsByKey.get(contentKey(routeId, locale));
      if (content === undefined) invalidContent();
      return content;
    },
  };
}

function readPublicContentSource(): unknown[] {
  if (!Array.isArray(rawPublicContent)) invalidContent();
  return rawPublicContent;
}

export function loadPublicContentRepository(
  routes: readonly RouteDefinitionV1[],
): PublicContentRepository {
  return createPublicContentRepository(readPublicContentSource(), routes);
}
