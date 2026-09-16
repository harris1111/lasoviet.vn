import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { z } from "zod";

const nonEmptyTerms = z.array(z.string().trim().min(1)).min(1);

const schema = z.object({
  version: z.literal("ziwei.knowledge.validation.v4.1"),
  v4KnowledgeVersion: z.literal("ziwei.comprehensive.knowledge.v4"),
  v3KnowledgeVersion: z.literal("ziwei.comprehensive.knowledge.v3"),
  prohibitedEditorialTerms: nonEmptyTerms,
  deathTerms: nonEmptyTerms,
  oralFillers: nonEmptyTerms,
  palaces: nonEmptyTerms,
  stars: nonEmptyTerms,
  transformations: nonEmptyTerms,
  brightness: nonEmptyTerms,
  patterns: nonEmptyTerms,
  timeTerms: z.array(z.enum(["đại vận", "lưu niên"])).length(2),
  warningDomains: nonEmptyTerms,
  warningPeriodPhrases: nonEmptyTerms,
  chartBasisPhrases: nonEmptyTerms,
  likelySituationPhrases: nonEmptyTerms,
  preparationIndicators: nonEmptyTerms,
  certaintyPhrases: nonEmptyTerms,
  adverseDatePatterns: nonEmptyTerms,
  namedDiseaseTerms: nonEmptyTerms,
  reproductiveClaimTerms: nonEmptyTerms,
  remedyOrRitualTerms: nonEmptyTerms,
  paywallPressureTerms: nonEmptyTerms,
  allowedDispositions: z.array(z.enum([
    "rewritten",
    "merged",
    "split",
    "omitted_oral_filler",
    "omitted_death_only",
  ])).length(5),
  usefulChunk: z.object({
    minimumTerminalSentences: z.number().int().min(2),
    targetMinimumSentences: z.number().int().min(2),
    targetMaximumSentences: z.number().int().min(2),
    minimumSyllables: z.number().int().min(1),
    maximumCharacters: z.number().int().min(1).max(1_200),
  }).strict().superRefine((value, context) => {
    if (
      value.minimumTerminalSentences > value.targetMinimumSentences ||
      value.targetMinimumSentences > value.targetMaximumSentences
    ) {
      context.addIssue({ code: "custom", message: "Invalid useful chunk thresholds" });
    }
  }),
}).strict();

export type ZiweiKnowledgeV4ValidationConfig = z.infer<typeof schema>;

export function normalizeZiweiKnowledgeV4Term(term: string): string {
  return term.normalize("NFC").toLocaleLowerCase("vi-VN").trim();
}

function assertUnique(name: string, terms: readonly string[]): void {
  const normalized = terms.map(normalizeZiweiKnowledgeV4Term);
  if (new Set(normalized).size !== normalized.length) {
    throw new Error(`ZIWEI_KNOWLEDGE_V4_VALIDATION_INVALID: duplicate ${name}`);
  }
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const nested of Object.values(value as Record<string, unknown>)) deepFreeze(nested);
    Object.freeze(value);
  }
  return value;
}

export function validateZiweiKnowledgeV4ValidationConfig(
  source: unknown,
): ZiweiKnowledgeV4ValidationConfig {
  const parsed = schema.safeParse(source);
  if (!parsed.success) throw new Error("ZIWEI_KNOWLEDGE_V4_VALIDATION_INVALID");
  const config = parsed.data;
  for (const [name, terms] of Object.entries(config)) {
    if (Array.isArray(terms)) assertUnique(name, terms);
  }
  for (const pattern of config.adverseDatePatterns) {
    try {
      new RegExp(pattern, "iu");
    } catch {
      throw new Error("ZIWEI_KNOWLEDGE_V4_VALIDATION_INVALID");
    }
  }
  return deepFreeze(config);
}

function configPath(): string {
  const local = resolve(process.cwd(), "config", "ziwei-knowledge-v4-validation.v1.json");
  return existsSync(local)
    ? local
    : resolve(process.cwd(), "..", "..", "config", "ziwei-knowledge-v4-validation.v1.json");
}

export const ziweiKnowledgeV4ValidationV1 = validateZiweiKnowledgeV4ValidationConfig(
  JSON.parse(readFileSync(configPath(), "utf8")),
);
