import type { ProductCatalog, ProductCatalogProduct } from "@lasoviet/config";
import type { PublicContentV1, RouteDefinitionV1 } from "@lasoviet/contracts";

import { PRODUCTION_ORIGIN } from "./public-metadata";

export class StructuredDataError extends Error {
  readonly code = "SCHEMA_CONTENT_MISMATCH";

  constructor(code: "SCHEMA_CONTENT_MISMATCH") {
    super(code);
    this.name = "StructuredDataError";
  }
}

type StructuredDataNode = Record<string, unknown>;

function mismatch(): never {
  throw new StructuredDataError("SCHEMA_CONTENT_MISMATCH");
}

function routeUrl(route: RouteDefinitionV1, locale: PublicContentV1["locale"]): string {
  if (locale === "vi") return `${PRODUCTION_ORIGIN}${route.path}`;
  return route.path === "/" ? `${PRODUCTION_ORIGIN}/en` : `${PRODUCTION_ORIGIN}/en${route.path}`;
}

function pageNode(
  type: string,
  route: RouteDefinitionV1,
  content: PublicContentV1,
): StructuredDataNode {
  return {
    "@context": "https://schema.org",
    "@type": type,
    name: content.title,
    description: content.summary,
    inLanguage: content.locale,
    url: routeUrl(route, content.locale),
  };
}

function productNode(
  route: RouteDefinitionV1,
  content: PublicContentV1,
  catalog: ProductCatalog | undefined,
): StructuredDataNode {
  if (route.id !== "commercial.tu-vi.identity" || route.sku === undefined || catalog === undefined) {
    return mismatch();
  }
  const product = catalog.findSelectableOffer(route.sku);
  if (product === undefined) return mismatch();
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: content.summary,
    sku: product.sku,
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: product.currency,
    },
  };
}

function breadcrumbNode(
  route: RouteDefinitionV1,
  content: PublicContentV1,
): StructuredDataNode {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{
      "@type": "ListItem",
      position: 1,
      name: content.title,
      item: routeUrl(route, content.locale),
    }],
  };
}

function nodeForSchemaType(
  type: string,
  route: RouteDefinitionV1,
  content: PublicContentV1,
  catalog: ProductCatalog | undefined,
): StructuredDataNode {
  switch (type) {
    case "Organization":
    case "WebSite":
    case "WebPage":
    case "ContactPage":
    case "AboutPage":
    case "CollectionPage":
    case "WebApplication":
      return pageNode(type, route, content);
    case "Article":
      return {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: content.title,
        description: content.summary,
        inLanguage: content.locale,
        mainEntityOfPage: routeUrl(route, content.locale),
      };
    case "BreadcrumbList":
      return breadcrumbNode(route, content);
    case "Product":
      return productNode(route, content, catalog);
    default:
      return mismatch();
  }
}

export function buildStructuredData(
  route: RouteDefinitionV1,
  content: PublicContentV1,
  catalog?: ProductCatalog,
): StructuredDataNode[] {
  if (route.status !== "live_indexable" || route.private) return mismatch();
  return route.schemaTypes.map((type) => nodeForSchemaType(type, route, content, catalog));
}
