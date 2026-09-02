import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

import type { RouteDefinitionV1 } from "@lasoviet/contracts";

import rawMetadata from "../../../config/public-content.json" with { type: "json" };

import { routeRegistry } from "./route-registry.js";

export type ContentLocale = "vi" | "en";
type Metadata = {
  routeId: string;
  locale: ContentLocale;
  contentType: string;
  title: string;
  summary: string;
  reviewer: string;
  sourceReferences: string[];
  riskTags: string[];
  status: string;
  lastReviewed: string;
};
type Frontmatter = Metadata & {
  version: 1;
  intent: string;
  authorId: string;
  reviewerIds: string[];
  sourceIds: string[];
  relatedRouteIds: string[];
  limitations: string;
  parentRouteId?: "knowledge.tu-vi";
  figure?: { id: string; alt: string; caption: string };
  faqItems?: { question: string; answer: string }[];
  sku?: "ZIWEI-IDENTITY-P0";
  priceVnd?: 79000;
  purchaseType?: "one_time";
};
export type GateOneDocument = {
  path: string;
  kind: "page" | "article";
  frontmatter: Frontmatter;
  body: string;
};
export type GateOnePublicContent = {
  documents: GateOneDocument[];
  reviewers: Set<string>;
  sources: Map<string, string>;
  get(routeId: string, locale: ContentLocale): GateOneDocument;
};

const prohibited = /todo|tbd|lorem ipsum|guaranteed|certified expert|limited time|countdown|testimonial|99%\s*accurate|fear|urgent|khan cap|chuyen gia duoc chung nhan/iu;
const routeReference = /\]\(route:([a-z0-9.-]+)\)/g;

function invalid(message: string): never {
  throw new Error(`PUBLIC_CONTENT_INVALID: ${message}`);
}

function readJson(file: string): unknown {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return invalid(`invalid JSON registry ${file}`);
  }
}

function filesIn(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesIn(path) : entry.name.endsWith(".mdx") ? [path] : [];
  });
}

function parseDocument(path: string): GateOneDocument {
  const source = readFileSync(path, "utf8");
  const match = /^---\r?\n(\{[\s\S]*?\})\r?\n---\r?\n([\s\S]+)$/u.exec(source);
  if (match === null || match[1] === undefined || match[2] === undefined) invalid(`invalid frontmatter ${path}`);
  let frontmatter: Frontmatter;
  try {
    frontmatter = JSON.parse(match[1]) as Frontmatter;
  } catch {
    return invalid(`frontmatter is not JSON ${path}`);
  }
  return {
    path,
    kind: path.split(/[\\/]/u).includes("articles") ? "article" : "page",
    frontmatter,
    body: match[2].trim(),
  };
}

function recordKey(routeId: string, locale: ContentLocale): string {
  return `${routeId}:${locale}`;
}

function validateDocument(
  document: GateOneDocument,
  routeById: Map<string, RouteDefinitionV1>,
  metadataByKey: Map<string, Metadata>,
  reviewers: Set<string>,
  sources: Map<string, string>,
): void {
  const { frontmatter, body } = document;
  const metadata = metadataByKey.get(recordKey(frontmatter.routeId, frontmatter.locale));
  const route = routeById.get(frontmatter.routeId);
  if (frontmatter.version !== 1 || route === undefined || metadata === undefined) invalid(`unknown route ${frontmatter.routeId}`);
  if (route.status !== "live_indexable" || !route.localeOwners.includes(frontmatter.locale)) invalid(`non-indexable route ${frontmatter.routeId}`);
  if (frontmatter.contentType !== metadata.contentType || frontmatter.title !== metadata.title || frontmatter.summary !== metadata.summary || frontmatter.status !== metadata.status || frontmatter.lastReviewed !== metadata.lastReviewed) invalid(`metadata mismatch ${frontmatter.routeId}`);
  if (!frontmatter.intent || !frontmatter.authorId || !frontmatter.limitations || frontmatter.reviewerIds.length === 0 || frontmatter.sourceIds.length === 0) invalid(`incomplete metadata ${frontmatter.routeId}`);
  if (!reviewers.has(frontmatter.authorId) || frontmatter.reviewerIds.some((id) => !reviewers.has(id))) invalid(`unknown reviewer ${frontmatter.routeId}`);
  if (frontmatter.sourceIds.some((id) => !sources.has(id))) invalid(`unknown source ${frontmatter.routeId}`);
  if (frontmatter.relatedRouteIds.some((id) => !routeById.has(id)) || prohibited.test(body) || body.length < (document.kind === "article" ? 450 : 180)) invalid(`unsafe or thin body ${frontmatter.routeId}`);
  const references = [...body.matchAll(routeReference)].map((match) => match[1] ?? "");
  if (references.some((id) => !routeById.has(id))) invalid(`broken link ${frontmatter.routeId}`);
  if (document.kind === "article") {
    if (frontmatter.parentRouteId !== "knowledge.tu-vi" || frontmatter.figure === undefined || frontmatter.relatedRouteIds.length < 2 || frontmatter.relatedRouteIds.length > 4 || !references.includes("calculator.tu-vi") || !references.includes("knowledge.tu-vi")) invalid(`article contract ${frontmatter.routeId}`);
  }
  if (frontmatter.routeId === "support.faq" && (!frontmatter.faqItems || new Set(frontmatter.faqItems.map((item) => item.question)).size !== frontmatter.faqItems.length || frontmatter.faqItems.some((item) => item.answer.length < 40))) invalid("FAQ contract");
  if (frontmatter.routeId === "commercial.tu-vi.identity") {
    if (frontmatter.sku !== "ZIWEI-IDENTITY-P0" || frontmatter.priceVnd !== 79000 || frontmatter.purchaseType !== "one_time") invalid("identity offer");
  } else if (frontmatter.sku !== undefined || frontmatter.priceVnd !== undefined || frontmatter.purchaseType !== undefined) invalid(`unavailable offer ${frontmatter.routeId}`);
}

export function validateGateOnePublicContent(content: Omit<GateOnePublicContent, "get">): GateOnePublicContent {
  const routeById = new Map(routeRegistry.map((route) => [route.id, route]));
  const metadataByKey = new Map((rawMetadata as Metadata[]).map((item) => [recordKey(item.routeId, item.locale), item]));
  const keys = new Set<string>();
  const bodies = new Set<string>();
  const intents = new Set<string>();
  const figures = new Set<string>();
  for (const document of content.documents) {
    const key = recordKey(document.frontmatter.routeId, document.frontmatter.locale);
    if (keys.has(key) || bodies.has(document.body) || intents.has(document.frontmatter.intent)) invalid(`duplicate document ${key}`);
    if (document.frontmatter.figure !== undefined && figures.has(document.frontmatter.figure.id)) invalid(`duplicate figure ${document.frontmatter.figure.id}`);
    keys.add(key);
    bodies.add(document.body);
    intents.add(document.frontmatter.intent);
    if (document.frontmatter.figure !== undefined) figures.add(document.frontmatter.figure.id);
    validateDocument(document, routeById, metadataByKey, content.reviewers, content.sources);
  }
  for (const route of routeRegistry.filter((item) => item.status === "live_indexable")) {
    for (const locale of ["vi", "en"] as const) if (!keys.has(recordKey(route.id, locale))) invalid(`missing ${route.id}:${locale}`);
  }
  if (content.documents.filter((document) => document.kind === "article").length !== 20) invalid("article count");
  return {
    ...content,
    get(routeId, locale) {
      const document = content.documents.find((item) => item.frontmatter.routeId === routeId && item.frontmatter.locale === locale);
      if (document === undefined) invalid(`missing ${routeId}:${locale}`);
      return document;
    },
  };
}

export function loadGateOnePublicContent(root = fileURLToPath(new URL("../../../content/public/", import.meta.url))): GateOnePublicContent {
  const sourceRoot = root;
  const reviewersRaw = readJson(join(sourceRoot, "reviewers.yml")) as {
    reviewers?: { id: string; kind: "person" | "internal_role"; label: string }[];
  };
  const sourcesRaw = readJson(join(sourceRoot, "sources.yml")) as { sources?: { id: string; path: string }[] };
  if (
    reviewersRaw.reviewers?.some((reviewer) =>
      !reviewer.id || !reviewer.label || (reviewer.id === "harris1111" && reviewer.kind !== "person"),
    ) ||
    sourcesRaw.sources?.some((source) => !source.id || !source.path || !existsSync(join(sourceRoot, "../..", source.path)))
  ) invalid("invalid registry record");
  const reviewers = new Set(reviewersRaw.reviewers?.map((reviewer) => reviewer.id));
  const sources = new Map(sourcesRaw.sources?.map((source) => [source.id, source.path]));
  if (reviewers.size === 0 || sources.size === 0) invalid("empty registry");
  return validateGateOnePublicContent({
    documents: filesIn(sourceRoot).map(parseDocument),
    reviewers,
    sources,
  });
}
