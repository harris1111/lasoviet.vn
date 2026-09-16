import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { z } from "zod";

const SECTION_KINDS = [
  "overview",
  "coreAxis",
  "keyConfigurations",
  "palace",
  "thematic",
  "strengthsAndTensions",
  "currentDecadal",
  "annualSnapshot",
  "practicalAction",
] as const;

const sectionSchema = z.object({
  minimumSyllables: z.number().int().positive(),
  targetMinimumSyllables: z.number().int().positive(),
  targetMaximumSyllables: z.number().int().positive(),
  maxOutputTokens: z.number().int().positive(),
}).strict().superRefine((value, ctx) => {
  if (value.minimumSyllables > value.targetMinimumSyllables ||
      value.targetMinimumSyllables > value.targetMaximumSyllables) {
    ctx.addIssue({ code: "custom", message: "Invalid section thresholds" });
  }
});

const qualitySchema = z.object({
  version: z.literal("ziwei.comprehensive.quality.v1"),
  reportConfigVersion: z.literal("ziwei.comprehensive.report.v4.1-sectioned"),
  sections: z.object({
    overview: sectionSchema, coreAxis: sectionSchema, keyConfigurations: sectionSchema,
    palace: sectionSchema, thematic: sectionSchema, strengthsAndTensions: sectionSchema,
    currentDecadal: sectionSchema, annualSnapshot: sectionSchema, practicalAction: sectionSchema,
  }).strict(),
  discouragedTerms: z.array(z.string().trim().min(1)).min(1),
  deathTerms: z.array(z.string().trim().min(1)).min(1),
  certaintyPhrases: z.array(z.string().trim().min(1)).min(1),
  misfortuneTerms: z.array(z.string().trim().min(1)).min(1),
  adverseDatePatterns: z.array(z.string().trim().min(1)).min(1),
  preparationIndicators: z.array(z.string().trim().min(1)).min(1),
  properNames: z.array(z.string().trim().min(1)).min(1),
  maxProperNamesPer100Syllables: z.number().positive().max(100),
  minimumPalaceStars: z.number().int().min(1),
  minimumEvidenceAnchors: z.number().int().min(1),
  generationAttemptCap: z.number().int().min(1),
  sectionRewriteCap: z.number().int().min(0),
  providerConcurrency: z.number().int().min(1),
  digestMaxEntries: z.number().int().min(1),
  digestMaxChars: z.number().int().min(1),
  retrievalMaxPassages: z.number().int().min(1),
  retrievalMaxChars: z.number().int().min(1),
  maxFindings: z.number().int().min(1),
  maxFindingNoteChars: z.number().int().min(1),
}).strict();

export type ZiweiReportQualityConfig = z.infer<typeof qualitySchema>;
export type ZiweiReportQualitySectionKind = (typeof SECTION_KINDS)[number];

export function normalizeZiweiQualityTerm(term: string): string {
  return term.normalize("NFC").toLocaleLowerCase("vi-VN").trim();
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      deepFreeze(nested);
    }
    Object.freeze(value);
  }
  return value;
}

function assertUnique(name: string, terms: readonly string[]): void {
  const normalized = terms.map(normalizeZiweiQualityTerm);
  if (new Set(normalized).size !== normalized.length) {
    throw new Error(`ZIWEI_REPORT_QUALITY_INVALID: duplicate ${name}`);
  }
}

export function validateZiweiReportQualityConfig(source: unknown): ZiweiReportQualityConfig {
  const parsed = qualitySchema.safeParse(source);
  if (!parsed.success) throw new Error("ZIWEI_REPORT_QUALITY_INVALID");
  const config = parsed.data;
  for (const [name, terms] of Object.entries({
    discouragedTerms: config.discouragedTerms,
    deathTerms: config.deathTerms,
    certaintyPhrases: config.certaintyPhrases,
    misfortuneTerms: config.misfortuneTerms,
    adverseDatePatterns: config.adverseDatePatterns,
    preparationIndicators: config.preparationIndicators,
    properNames: config.properNames,
  })) assertUnique(name, terms);
  for (const pattern of config.adverseDatePatterns) {
    try { new RegExp(pattern, "iu"); } catch { throw new Error("ZIWEI_REPORT_QUALITY_INVALID"); }
  }
  return deepFreeze(config);
}

export function resolveZiweiReportQualityConfig(
  reportConfigVersion: string,
  qualityVersion: string,
): ZiweiReportQualityConfig {
  if (
    reportConfigVersion !== ziweiComprehensiveReportQualityV1.reportConfigVersion ||
    qualityVersion !== ziweiComprehensiveReportQualityV1.version
  ) {
    throw new Error("ZIWEI_REPORT_QUALITY_VERSION_MISMATCH");
  }
  return ziweiComprehensiveReportQualityV1;
}

function configPath(): string {
  const local = resolve(process.cwd(), "config", "ziwei-comprehensive-report-quality.v1.json");
  return existsSync(local) ? local : resolve(process.cwd(), "..", "..", "config", "ziwei-comprehensive-report-quality.v1.json");
}

export const ziweiComprehensiveReportQualityV1 = validateZiweiReportQualityConfig(
  JSON.parse(readFileSync(configPath(), "utf8")),
);
