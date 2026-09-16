import {
  normalizeZiweiKnowledgeV4Term,
  ziweiKnowledgeV4ValidationV1,
  type ZiweiKnowledgeV4ValidationConfig,
} from "@lasoviet/config";

import {
  computeChunkContentHash,
  KnowledgeEditorialRecordV1Schema,
  type KnowledgeEditorialRecordV1,
} from "./knowledge-ingestion.service.js";

export type ZiweiKnowledgeV4ValidationIssue = {
  code: string;
  passageId?: string;
};

export type ZiweiKnowledgeV4ValidationResult =
  | { ok: true; value: KnowledgeEditorialRecordV1 }
  | { ok: false; issues: ZiweiKnowledgeV4ValidationIssue[] };

function normalized(value: string): string {
  return normalizeZiweiKnowledgeV4Term(value).replace(/\s+/gu, " ");
}

function escaped(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function includesTerm(text: string, term: string): boolean {
  return new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped(normalized(term))}(?=$|[^\\p{L}\\p{N}])`, "iu")
    .test(text);
}

function includesAny(text: string, terms: readonly string[]): boolean {
  return terms.some((term) => includesTerm(text, term));
}

function countTerminalSentences(text: string): number {
  return text.split(/[.!?]+(?:\s|$)/u).filter((sentence) => sentence.trim().length > 0).length;
}

function countSyllables(text: string): number {
  return text.match(/[\p{L}\p{M}]+/gu)?.length ?? 0;
}

function metadataArraysAreCanonical(record: KnowledgeEditorialRecordV1): boolean {
  const metadata = record.metadata;
  if (metadata.languageOrigin !== "vi") return false;
  for (const values of [
    metadata.topics,
    metadata.palaces,
    metadata.stars,
    metadata.brightness,
    metadata.transformations,
    metadata.relations,
    metadata.patterns,
    record.sourcePassageIds,
  ]) {
    const normalizedValues = values.map(normalized);
    if (new Set(normalizedValues).size !== normalizedValues.length) return false;
    if (values.some((value, index) => index > 0 && value.normalize("NFC") < values[index - 1]!.normalize("NFC"))) {
      return false;
    }
  }
  return true;
}

function isNfcRecord(record: KnowledgeEditorialRecordV1): boolean {
  const metadata = record.metadata;
  const strings = [
    record.passageId,
    record.content,
    record.contentHash,
    record.dispositionRationaleCode,
    ...record.sourcePassageIds,
    ...record.reportSections,
    ...metadata.topics,
    ...metadata.palaces,
    ...metadata.stars,
    ...metadata.brightness,
    ...metadata.transformations,
    ...metadata.relations,
    ...metadata.patterns,
    metadata.sourceType,
    metadata.languageOrigin,
  ];
  return strings.every((value) => value === value.normalize("NFC"));
}

function hasAllowedChartAnchor(text: string, record: KnowledgeEditorialRecordV1, config: ZiweiKnowledgeV4ValidationConfig): boolean {
  if (config.palaces.some((palace) => includesTerm(text, `cung ${palace}`))) return true;
  if (config.stars.some((star) => includesTerm(text, star))) return true;
  const metadata = record.metadata;
  return Boolean(metadata && (metadata.topics.length || metadata.palaces.length || metadata.stars.length));
}

function hasBarePalace(text: string, palace: string): boolean {
  const allowed = new RegExp(`cung\\s+${escaped(normalized(palace))}`, "giu");
  return includesTerm(text.replace(allowed, " "), palace);
}

function validateWarning(text: string, config: ZiweiKnowledgeV4ValidationConfig, issues: ZiweiKnowledgeV4ValidationIssue[]): void {
  if (!includesAny(text, config.warningDomains)) return;
  const requirements: Array<[string, readonly string[]]> = [
    ["V4_WARNING_PERIOD_REQUIRED", config.warningPeriodPhrases],
    ["V4_WARNING_CHART_BASIS_REQUIRED", config.chartBasisPhrases],
    ["V4_WARNING_LIKELY_SITUATION_REQUIRED", config.likelySituationPhrases],
  ];
  for (const [code, terms] of requirements) {
    if (!includesAny(text, terms)) issues.push({ code });
  }
  const preparationCount = config.preparationIndicators
    .filter((indicator) => includesTerm(text, indicator)).length;
  if (preparationCount < 2) issues.push({ code: "V4_WARNING_PREPARATION_REQUIRED" });
}

export function validateZiweiKnowledgeV4Record(
  input: unknown,
  config: ZiweiKnowledgeV4ValidationConfig = ziweiKnowledgeV4ValidationV1,
): ZiweiKnowledgeV4ValidationResult {
  const parsed = KnowledgeEditorialRecordV1Schema.safeParse(input);
  if (!parsed.success) return { ok: false, issues: [{ code: "V4_RECORD_SCHEMA_INVALID" }] };

  const record = parsed.data;
  const text = normalized(record.content);
  const issues: ZiweiKnowledgeV4ValidationIssue[] = [];
  const add = (code: string) => issues.push({ code, passageId: record.passageId });

  if (/\p{Script=Han}/u.test(text)) add("V4_LOCALE_HAN_PROHIBITED");
  if (!isNfcRecord(record)) add("V4_NFC_REQUIRED");
  if (computeChunkContentHash(record.content) !== record.contentHash) {
    add("V4_CONTENT_HASH_INVALID");
  }
  if (includesAny(text, config.deathTerms)) add("V4_DEATH_PROHIBITED");
  if (includesAny(text, config.oralFillers)) add("V4_ORAL_FILLER_PROHIBITED");
  if (includesAny(text, config.certaintyPhrases)) add("V4_WARNING_CERTAINTY_PROHIBITED");
  if (config.adverseDatePatterns.some((pattern) => new RegExp(pattern, "iu").test(text))) {
    add("V4_WARNING_DATE_PROHIBITED");
  }
  if (includesAny(text, config.namedDiseaseTerms)) add("V4_WARNING_DISEASE_PROHIBITED");
  if (includesAny(text, config.reproductiveClaimTerms)) add("V4_WARNING_REPRODUCTIVE_CLAIM_PROHIBITED");
  if (includesAny(text, config.remedyOrRitualTerms)) add("V4_WARNING_REMEDY_PROHIBITED");
  if (includesAny(text, config.paywallPressureTerms)) add("V4_WARNING_PAYWALL_PRESSURE_PROHIBITED");
  const palaceTerms = new Set(config.palaces.map(normalized));
  if (includesAny(
    text,
    config.prohibitedEditorialTerms.filter((term) => !palaceTerms.has(normalized(term))),
  )) add("V4_EDITORIAL_TERM_PROHIBITED");
  if (config.palaces.some((palace) => hasBarePalace(text, palace))) add("V4_BARE_PALACE_PROHIBITED");
  if (!metadataArraysAreCanonical(record)) add("V4_METADATA_NOT_CANONICAL");

  const sentences = countTerminalSentences(text);
  if (sentences < config.usefulChunk.minimumTerminalSentences) add("V4_USEFUL_SENTENCES_REQUIRED");
  if (countSyllables(text) < config.usefulChunk.minimumSyllables) add("V4_USEFUL_SYLLABLES_REQUIRED");
  if (record.content.normalize("NFC").length > config.usefulChunk.maximumCharacters) add("V4_USEFUL_MAX_LENGTH_EXCEEDED");
  if (!hasAllowedChartAnchor(text, record, config)) add("V4_USEFUL_CHART_ANCHOR_REQUIRED");

  validateWarning(text, config, issues);
  return issues.length === 0 ? { ok: true, value: record } : { ok: false, issues };
}
