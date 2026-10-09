import { createHash } from "node:crypto";
import { ZiweiDecadalReadingSourceV1Schema, ZiweiDecadalReadingContentV1Schema,
  type ZiweiDecadalReadingSourceV1, type ZiweiDecadalReadingContentV1,
  type AiCostRequestContext } from "@lasoviet/contracts";
import { resolveZiweiReportQualityConfig } from "@lasoviet/config";
import type { AiProvider } from "../ai/ai-provider.js";
import { countVietnameseSyllables, ENGLISH_BRIGHTNESS_PATTERN,
  HAN_IDEOGRAPH_PATTERN, wholeWord, hasDiscouragedTerm } from "./comprehensive-report-quality-v4.js";
import { REPORT_CONFIG_VERSION_V4_1_1_SECTIONED_SENSITIVITY,
  REPORT_QUALITY_VERSION_COMPREHENSIVE_V2_3_SENSITIVITY } from "./identity-report-config.js";
import { DECADAL_READING_TUPLE } from "./decadal-report-config.js";

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).filter(key => record[key] !== undefined).sort()
      .map(key => `${JSON.stringify(key)}:${canonical(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}
function boundSource(input: ZiweiDecadalReadingSourceV1) {
  const source = ZiweiDecadalReadingSourceV1Schema.parse(input);
  const {sourceHash, ...value} = source;
  if (createHash("sha256").update(canonical(value)).digest("hex") !== sourceHash) {
    throw new Error("DECADAL_SOURCE_HASH_MISMATCH");
  }
  return source;
}

/** Validate generated content against a trusted private factual source.
 * This is neither actor authorization nor manual/product acceptance. */
export function validateDecadalReading(content: ZiweiDecadalReadingContentV1, source: ZiweiDecadalReadingSourceV1) {
  const findings: string[] = [], advisory: string[] = [];
  const {cycle} = source;
  if (content.sourceHash !== source.sourceHash || content.ordinal !== cycle.ordinal ||
      content.startAge !== cycle.startAge || content.endAge !== cycle.endAge ||
      content.startYear !== cycle.startYear || content.endYear !== cycle.endYear) findings.push("DECADAL_LINEAGE_MISMATCH");
  if (content.years.length !== 10 || new Set(content.years.map(row => row.year)).size !== 10) findings.push("YEAR_COVERAGE_MISMATCH");
  const config = resolveZiweiReportQualityConfig(REPORT_CONFIG_VERSION_V4_1_1_SECTIONED_SENSITIVITY,
    REPORT_QUALITY_VERSION_COMPREHENSIVE_V2_3_SENSITIVITY);
  const check = (text: string, keys: string[], allowed: string[], minimum: number, years: number[], ages: number[]) => {
    text = text.normalize("NFC");
    if (countVietnameseSyllables(text) < minimum) findings.push("MINIMUM_DEPTH");
    if (!keys.length || new Set(keys).size !== keys.length || keys.some(key => !allowed.includes(key))) findings.push("EVIDENCE_MISMATCH");
    if (HAN_IDEOGRAPH_PATTERN.test(text) || ENGLISH_BRIGHTNESS_PATTERN.test(text)) findings.push("LOCALE_INVALID");
    if (/ziwei\.[a-z]|annual\.year\.|decadal\.(?:palace|ordinal)/iu.test(text) ||
        [source.sourceHash, source.lineage.chartId, source.lineage.chartVersionId,
          source.lineage.inputHash, source.lineage.configHash, source.lineage.rawSnapshotHash]
          .some(identifier => text.includes(identifier))) findings.push("PRIVATE_IDENTIFIER_IN_PROSE");
    if (config.deathTerms.some(term => wholeWord(text, term)) ||
        /(?:khắc\s+chết|tuổi\s+thọ|thọ\s+mệnh|sống\s+(?:đến|tới)\s+\d+\s+tuổi)/iu.test(text) ||
        /(?:bán|mua|thuê|trả\s+tiền|dịch\s+vụ)[^.!?\n]{0,60}(?:giải\s+hạn|ho[aá]\s+giải|bùa|cúng|vật\s+phẩm\s+phong\s+thuỷ|vật\s+phẩm\s+phong\s+thủy)/iu.test(text) ||
        /(?:lô\s+đề|số\s+đề|số\s+xổ\s+số|đánh\s+(?:số|đề))/iu.test(text)) findings.push("CONTENT_LINE_VIOLATION");
    if (/(?:mắc|bị|chẩn\s+đoán|nguy\s+cơ)[^.!?\n]{0,80}(?:ung\s+thư|tiểu\s+đường|đái\s+tháo\s+đường|cao\s+huyết\s+áp|trầm\s+cảm|đột\s+quỵ|nhồi\s+máu)/iu.test(text)) findings.push("NAMED_DISEASE_DIAGNOSIS");
    if (/\d+(?:[.,]\d+)?\s*%|\d+\s*(?:điểm|(?:trên|\/)\s*100)|(?:điểm\s+(?:số|(?:của\s+)?năm|vận|may\s+mắn)|(?:tỷ|tỉ)\s+lệ)[^.!?\n]{0,60}(?:là|đạt|bằng|:)\s*\d+/iu.test(text)) findings.push("UNCOMPUTED_SCORE");
    if (/(?:ngày|tháng)\s+(?:\d+|giêng|chạp|một|hai|ba|tư|bốn|năm|sáu|bảy|tám|chín|mười)(?![\p{L}\p{N}])|\b\d{1,2}[/-]\d{1,2}\b/iu.test(text)) findings.push("UNCOMPUTED_DAY_OR_MONTH");
    if ([...text.matchAll(/(?<![\p{L}\p{N}])([12]\d{3})(?![\p{L}\p{N}])/gu)]
      .some(match => !years.includes(Number(match[1])))) findings.push("UNCOMPUTED_YEAR");
    for (const match of text.matchAll(/(?<![\p{L}\p{N}])(?:(?:từ\s+)?(\d{1,3})(?:\s*(?:[-–—]|đến|tới)\s*(\d{1,3}))?\s+tuổi|tuổi\s+(?:(?:âm|mụ|âm\s+lịch)\s+)?(?:(?:hiện\s+tại\s+)?là\s+)?(?:từ\s+)?(\d{1,3})(?:\s*(?:[-–—]|đến|tới)\s*(\d{1,3}))?)(?![\p{L}\p{N}])/giu)) {
      if (match.slice(1).filter(Boolean).some(value => !ages.includes(Number(value)))) findings.push("UNCOMPUTED_AGE");
    }
    if (config.discouragedTerms.some(term => hasDiscouragedTerm(text, term))) advisory.push("EDITORIAL_TERM");
  };
  if (!content.overview.evidenceKeys.includes(`decadal.ordinal.${cycle.ordinal}`) ||
      !content.overview.evidenceKeys.includes(`decadal.palace.${cycle.palaceId}`)) findings.push("DECADAL_ANCHOR_MISSING");
  check(`${content.title} ${content.overview.narrative}`, content.overview.evidenceKeys, source.evidenceKeys, 180,
    cycle.annualPalaces.map(row => row.year), cycle.annualPalaces.map(row => row.age));
  for (const row of content.years) {
    const actual = cycle.annualPalaces.find(value => value.year === row.year);
    if (!actual || row.age !== actual.age || row.palaceId !== actual.palaceId) { findings.push("YEAR_FACT_MISMATCH"); continue; }
    const allowed = source.evidenceKeys.filter(key => key.startsWith(`annual.year.${row.year}.`));
    const anchor = `annual.year.${row.year}.palace.${actual.palaceId}`;
    if (!row.evidenceKeys.includes(anchor)) findings.push("YEAR_ANCHOR_MISSING");
    check([row.title, row.narrative, ...row.recommendations, ...row.cautions].join(" "), row.evidenceKeys, allowed, 150, [row.year], [row.age]);
  }
  return {ok: findings.length === 0, findings: [...new Set(findings)], advisory: [...new Set(advisory)]};
}

/** Server-only injected-provider writer; caller owns source admission and cost gates. */
export async function writeDecadalReading(input: {source: ZiweiDecadalReadingSourceV1; provider: AiProvider; costContext?: AiCostRequestContext}) {
  const source = boundSource(input.source);
  let prior: ZiweiDecadalReadingContentV1 | undefined, findings: string[] = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    const purpose = attempt ? "rewrite" : "report";
    const result = await input.provider.generateStructured({schema: ZiweiDecadalReadingContentV1Schema,
      schemaName: "ziwei_decadal_reading_v1", use: "production_report_generation", purpose, maxOutputTokens: 20000,
      costContext: input.costContext ? {...input.costContext, purpose,
        ...(input.costContext.idempotencyKey ? {idempotencyKey: `${input.costContext.idempotencyKey}:${purpose}`} : {})} : undefined,
      system: "Write a substantial Vietnamese ten-year astrology reading from the supplied computed source. Return the exact JSON schema. Copy the source hash, selected ordinal, lunar age/year span and all ten yearly facts exactly, one section each. Overview at least180 Vietnamese syllables; each yearly section at least150. Explain traditional terms immediately and use a personal expert voice. Evidence beside every section must use supplied keys; yearly sections use only that year's keys including its palace anchor. Distinguish the decade's themes from each year's actual palace and transformations. Traditional adverse interpretations are allowed, but do not invent events, years, ages, days, months, scores, percentages, death/lifespan claims, named-disease diagnoses, lottery numbers or ritual sales. No birth inputs, technical identifiers or internal AI details in prose. Do not turn the published natal-palace structural score into an invented year/life score. All year and age references use the supplied lunar calendar. Return recommendations and cautions. No compatibility claim or product acceptance.",
      user: JSON.stringify({tuple: DECADAL_READING_TUPLE, source, ...(prior ? {rewrite: {prior, findings}} : {})}),
    });
    if (!result.ok) return result;
    const usage = result.value.usage;
    if ((input.costContext && (!usage || usage.tokensUnknown !== false || usage.costStatus !== "resolved" ||
        typeof usage.costMicroVnd !== "string" || !/^\d+$/.test(usage.costMicroVnd))) ||
        usage?.costStatus === "unknown" || usage?.tokensUnknown === true) {
      return {ok: false as const, error: {code: "DECADAL_COST_UNKNOWN" as const, retryable: false}};
    }
    const parsed = ZiweiDecadalReadingContentV1Schema.safeParse(result.value.value);
    if (!parsed.success) return {ok: false as const, error: {code: "AI_OUTPUT_INVALID" as const, retryable: false}};
    const quality = validateDecadalReading(parsed.data, source);
    if (quality.ok) return {ok: true as const, value: {content: parsed.data, quality, providerId: result.value.providerId, modelId: result.value.modelId}};
    prior = parsed.data; findings = quality.findings;
  }
  return {ok: false as const, error: {code: "DECADAL_QUALITY_REJECTED" as const, retryable: false}, findings};
}
