import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { PublicContentV1Schema, type RouteDefinitionV1 } from "@lasoviet/contracts";
import { z } from "zod";

import rawMetadata from "../../../config/public-content.json" with { type: "json" };
import { routeRegistry } from "./route-registry.js";

export type ContentLocale = "vi" | "en";

const faqItemSchema = z.object({
  question: z.string().trim().min(12),
  answer: z.string().trim().min(40),
}).strict();
const frontmatterSchema = z.object({
  version: z.literal(1),
  routeId: z.string().trim().min(1),
  locale: z.enum(["vi", "en"]),
  contentType: z.enum([
    "Discipline", "ToolLanding", "KnowledgeHub", "KnowledgeArticle",
    "GlossaryTerm", "MethodologyPage", "SourceReference", "FAQEntry",
    "CommercialPage", "SampleReport", "AuthorProfile", "SeoMetadata",
    "ReusableBlock",
  ]),
  title: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  intent: z.string().trim().min(8),
  authorId: z.string().trim().min(1),
  reviewerIds: z.array(z.string().trim().min(1)).min(1),
  sourceIds: z.array(z.string().trim().min(1)).min(1),
  riskTags: z.array(z.string().trim().min(1)),
  status: z.literal("published"),
  lastReviewed: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  relatedRouteIds: z.array(z.string().trim().min(1)).min(2).max(4).superRefine(
    (routeIds, context) => {
      if (new Set(routeIds).size !== routeIds.length) {
        context.addIssue({
          code: "custom",
          message: "relatedRouteIds must be unique",
        });
      }
    },
  ),
  limitations: z.string().trim().min(40),
  parentRouteId: z.literal("knowledge.tu-vi").optional(),
  figure: z.object({
    id: z.string().trim().min(4),
    alt: z.string().trim().min(12),
    caption: z.string().trim().min(40),
  }).strict().optional(),
  faqItems: z.array(faqItemSchema).min(2).optional(),
  sku: z.literal("ZIWEI-IDENTITY-P0").optional(),
  priceVnd: z.literal(79000).optional(),
  purchaseType: z.literal("one_time").optional(),
}).strict();
const reviewerRegistrySchema = z.object({
  reviewers: z.array(z.object({
    id: z.string().trim().min(1),
    kind: z.enum(["person", "internal_role"]),
    label: z.string().trim().min(4),
  }).strict()).min(1),
}).strict();
const sourceRegistrySchema = z.object({
  sources: z.array(z.object({
    id: z.string().trim().min(1),
    path: z.string().trim().min(1),
    description: z.string().trim().min(20),
  }).strict()).min(1),
}).strict();

export type GateOneDocument = {
  path: string;
  kind: "page" | "article";
  frontmatter: z.infer<typeof frontmatterSchema>;
  body: string;
};
export type GateOnePublicContent = {
  documents: GateOneDocument[];
  reviewers: Set<string>;
  sources: Map<string, string>;
  get(routeId: string, locale: ContentLocale): GateOneDocument;
};

const unsafeCopy = /todo|tbd|placeholder|lorem ipsum|guaranteed|certified expert|limited time|countdown|testimonial|99%\s*accurate|fear|urgent|khan cap|chuyen gia duoc chung nhan|cam ket ket qua/iu;
const routeLink = /\]\(route:([a-z0-9.-]+)\)/g;
const viContamination = /\b(the|this|build|sources|practical boundary|related reading|next steps)\b/iu;
const enContamination = /[àáảãạăâđêôơư]/iu;

function invalid(message: string): never {
  throw new Error(`PUBLIC_CONTENT_INVALID: ${message}`);
}

function parse<T>(schema: z.ZodType<T>, value: unknown, label: string): T {
  const result = schema.safeParse(value);
  return result.success ? result.data : invalid(label);
}

function readJson(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return invalid(`invalid JSON ${path}`);
  }
}

function documentFiles(directory: string): string[] {
  try {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? documentFiles(path) : entry.name.endsWith(".mdx") ? [path] : [];
    });
  } catch {
    return invalid(`unreadable content directory ${directory}`);
  }
}

function parseDocument(path: string): GateOneDocument {
  let source: string;
  try {
    source = readFileSync(path, "utf8");
  } catch {
    return invalid(`unreadable document ${path}`);
  }
  const match = /^---\r?\n(\{[\s\S]*?\})\r?\n---\r?\n([\s\S]+)$/u.exec(source);
  if (match?.[1] === undefined || match[2] === undefined) invalid(`invalid frontmatter ${path}`);
  return {
    path,
    kind: path.split(/[\\/]/u).includes("articles") ? "article" : "page",
    frontmatter: parse(frontmatterSchema, readJsonText(match[1], path), `invalid frontmatter ${path}`),
    body: match[2].trim(),
  };
}

function readJsonText(source: string, path: string): unknown {
  try {
    return JSON.parse(source);
  } catch {
    return invalid(`frontmatter is not JSON ${path}`);
  }
}

function key(routeId: string, locale: ContentLocale): string {
  return `${routeId}:${locale}`;
}

function links(body: string): string[] {
  return [...body.matchAll(routeLink)].map((match) => match[1] ?? "");
}

function sameMembers(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((item) => right.includes(item));
}

function similarity(left: string, right: string): number {
  const tokenize = (value: string) => new Set(value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").split(" ").filter((word) => word.length > 4));
  const a = tokenize(left);
  const b = tokenize(right);
  const common = [...a].filter((token) => b.has(token)).length;
  return common / Math.max(1, Math.min(a.size, b.size));
}

function isPublicRoute(route: RouteDefinitionV1 | undefined): route is RouteDefinitionV1 {
  return route !== undefined && route.status === "live_indexable" && !route.private;
}

function validateDocument(
  document: GateOneDocument,
  routeById: Map<string, RouteDefinitionV1>,
  metadataByKey: Map<string, z.infer<typeof PublicContentV1Schema>>,
  reviewers: Set<string>,
  sources: Map<string, string>,
): void {
  const { frontmatter, body } = document;
  const route = routeById.get(frontmatter.routeId);
  const metadata = metadataByKey.get(key(frontmatter.routeId, frontmatter.locale));
  if (!isPublicRoute(route) || metadata === undefined) invalid(`unowned route ${frontmatter.routeId}`);
  if (frontmatter.contentType !== metadata.contentType || frontmatter.title !== metadata.title || frontmatter.summary !== metadata.summary || frontmatter.status !== metadata.status || frontmatter.lastReviewed !== metadata.lastReviewed) invalid(`metadata mismatch ${frontmatter.routeId}`);
  if (!reviewers.has(frontmatter.authorId) || frontmatter.reviewerIds.some((id) => !reviewers.has(id))) invalid(`unknown reviewer ${frontmatter.routeId}`);
  if (frontmatter.sourceIds.some((id) => !sources.has(id))) invalid(`unknown source ${frontmatter.routeId}`);
  if (unsafeCopy.test(`${JSON.stringify(frontmatter)}\n${body}`)) invalid(`unsafe copy ${frontmatter.routeId}`);
  if (body.length < (document.kind === "article" ? 850 : 360)) invalid(`thin document ${frontmatter.routeId}`);
  if ((frontmatter.locale === "vi" && viContamination.test(body)) || (frontmatter.locale === "en" && enContamination.test(body))) invalid(`locale contamination ${frontmatter.routeId}`);
  const bodyLinks = [...new Set(links(body))];
  if (!sameMembers([...new Set(frontmatter.relatedRouteIds)], bodyLinks)) invalid(`link parity ${frontmatter.routeId}`);
  if (bodyLinks.some((id) => !isPublicRoute(routeById.get(id)))) invalid(`non-public link ${frontmatter.routeId}`);
  if (document.kind === "article" && (
    frontmatter.parentRouteId !== "knowledge.tu-vi" ||
    frontmatter.figure === undefined ||
    frontmatter.relatedRouteIds.length !== 4 ||
    !bodyLinks.includes("calculator.tu-vi") ||
    !bodyLinks.includes("knowledge.tu-vi")
  )) invalid(`article contract ${frontmatter.routeId}`);
  if (frontmatter.routeId === "support.faq" && (
    frontmatter.faqItems === undefined ||
    new Set(frontmatter.faqItems.map((item) => item.question)).size !== frontmatter.faqItems.length ||
    frontmatter.faqItems.some((item) => !body.includes(item.question) || !body.includes(item.answer))
  )) invalid("FAQ parity");
  if (frontmatter.routeId === "commercial.tu-vi.identity") {
    if (frontmatter.sku !== "ZIWEI-IDENTITY-P0" || frontmatter.priceVnd !== 79000 || frontmatter.purchaseType !== "one_time") invalid("identity offer");
  } else if (frontmatter.sku !== undefined || frontmatter.priceVnd !== undefined || frontmatter.purchaseType !== undefined) invalid(`unavailable offer ${frontmatter.routeId}`);
}

export function validateGateOnePublicContent(content: Omit<GateOnePublicContent, "get">): GateOnePublicContent {
  const routeById = new Map(routeRegistry.map((route) => [route.id, route]));
  const metadata = parse(z.array(PublicContentV1Schema), rawMetadata, "invalid metadata");
  const metadataByKey = new Map(metadata.map((record) => [key(record.routeId, record.locale), record]));
  const documents = content.documents.map((document) => ({
    ...document,
    frontmatter: parse(frontmatterSchema, document.frontmatter, `invalid frontmatter ${document.path}`),
  }));
  const keys = new Set<string>();
  const intents = new Set<string>();
  const figures = new Set<string>();
  for (const document of documents) {
    const documentKey = key(document.frontmatter.routeId, document.frontmatter.locale);
    if (keys.has(documentKey) || intents.has(document.frontmatter.intent)) invalid(`duplicate document ${documentKey}`);
    if (document.frontmatter.figure !== undefined && figures.has(document.frontmatter.figure.id)) invalid(`duplicate figure ${document.frontmatter.figure.id}`);
    keys.add(documentKey);
    intents.add(document.frontmatter.intent);
    if (document.frontmatter.figure !== undefined) figures.add(document.frontmatter.figure.id);
    validateDocument(document, routeById, metadataByKey, content.reviewers, content.sources);
  }
  for (let index = 0; index < documents.length; index += 1) {
    for (let other = index + 1; other < documents.length; other += 1) {
      if (similarity(documents[index]!.body, documents[other]!.body) > 0.94) invalid("repeated template body");
    }
  }
  for (const route of routeRegistry.filter(isPublicRoute)) {
    for (const locale of ["vi", "en"] as const) if (!keys.has(key(route.id, locale))) invalid(`missing ${route.id}:${locale}`);
  }
  if (documents.filter((document) => document.kind === "article").length !== 20) invalid("article count");
  return {
    ...content,
    documents,
    get(routeId, locale) {
      const document = documents.find((item) => item.frontmatter.routeId === routeId && item.frontmatter.locale === locale);
      return document ?? invalid(`missing ${routeId}:${locale}`);
    },
  };
}

export function loadGateOnePublicContent(root = fileURLToPath(new URL("../../../content/public/", import.meta.url))): GateOnePublicContent {
  const repoRoot = resolve(root, "../..");
  const reviewerRegistry = parse(reviewerRegistrySchema, readJson(join(root, "reviewers.yml")), "invalid reviewer registry");
  const sourceRegistry = parse(sourceRegistrySchema, readJson(join(root, "sources.yml")), "invalid source registry");
  if (new Set(reviewerRegistry.reviewers.map((reviewer) => reviewer.id)).size !== reviewerRegistry.reviewers.length) invalid("duplicate reviewer");
  if (new Set(sourceRegistry.sources.map((source) => source.id)).size !== sourceRegistry.sources.length) invalid("duplicate source");
  if (sourceRegistry.sources.some((source) => {
    const path = resolve(repoRoot, source.path);
    return relative(repoRoot, path).startsWith("..") || !existsSync(path);
  })) invalid("invalid source path");
  return validateGateOnePublicContent({
    documents: documentFiles(root).map(parseDocument),
    reviewers: new Set(reviewerRegistry.reviewers.map((reviewer) => reviewer.id)),
    sources: new Map(sourceRegistry.sources.map((source) => [source.id, source.path])),
  });
}
