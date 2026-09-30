import { ZiweiPeriodReadingContentV1Schema, ZiweiPeriodReadingFactsV1Schema, type ZiweiPeriodReadingContentV1, type ZiweiPeriodReadingFactsV1, type AiCostRequestContext } from "@lasoviet/contracts";
import { resolveZiweiReportQualityConfig } from "@lasoviet/config";
import type { ZiweiReportKnowledgePack } from "./comprehensive-report-retrieval.js";
import type { AiProvider } from "../ai/ai-provider.js";
import { countVietnameseSyllables, ENGLISH_BRIGHTNESS_PATTERN, HAN_IDEOGRAPH_PATTERN, wholeWord } from "./comprehensive-report-quality-v4.js";
import { REPORT_CONFIG_VERSION_V4_1_1_SECTIONED_SENSITIVITY, REPORT_QUALITY_VERSION_COMPREHENSIVE_V2_3_SENSITIVITY } from "./identity-report-config.js";

export const PERIOD_READING_TUPLE = {
  promptVersion: "ziwei.period-reading.prompt.v1", reportConfigVersion: "ziwei.period-reading.report.v1",
  qualityVersion: "ziwei.period-reading.quality.v1", contentVersion: "ziwei.period-reading.v1",
} as const;
const monthWords: Record<string, number> = { một: 1, giêng: 1, hai: 2, ba: 3, tư: 4, bốn: 4, năm: 5, sáu: 6, bảy: 7, tám: 8, chín: 9, mười: 10, "mười một": 11, "mười hai": 12, chạp: 12 };
const monthPattern = /tháng\s+(mười hai|mười một|giêng|chạp|một|hai|ba|bốn|tư|năm|sáu|bảy|tám|chín|mười|\d{1,2})(?![\p{L}\p{N}])/giu;

export function validatePeriodReading(content: ZiweiPeriodReadingContentV1, facts: ZiweiPeriodReadingFactsV1) {
  const findings: string[] = [];
  const config = resolveZiweiReportQualityConfig(REPORT_CONFIG_VERSION_V4_1_1_SECTIONED_SENSITIVITY, REPORT_QUALITY_VERSION_COMPREHENSIVE_V2_3_SENSITIVITY);
  if (content.kind !== facts.kind || content.targetYear !== facts.targetYear || content.periodKey !== facts.periodKey || content.calendar !== "lunar") findings.push("PERIOD_LINEAGE_MISMATCH");
  if (content.periods.length !== facts.periods.length || new Set(content.periods.map(p => p.periodId)).size !== facts.periods.length) findings.push("PERIOD_COVERAGE_MISMATCH");
  const check = (text: string, keys: string[], allowed: string[], minimum: number, months: number[], canNameAdversity: boolean) => {
    if (countVietnameseSyllables(text) < minimum) findings.push("MINIMUM_DEPTH");
    if (!keys.length || keys.some(key => !allowed.includes(key))) findings.push("EVIDENCE_MISMATCH");
    if (HAN_IDEOGRAPH_PATTERN.test(text) || ENGLISH_BRIGHTNESS_PATTERN.test(text)) findings.push("LOCALE_INVALID");
    if ([...config.deathTerms, ...config.certaintyPhrases, "giải hạn", "hoá giải", "hóa giải", "bùa chú", "cúng bái", "lô đề", "số đề"].some(term => wholeWord(text, term))) findings.push("CONTENT_LINE_VIOLATION");
    if (/\b\d{1,2}[/-]\d{1,2}\b/u.test(text) || /ngày\s+\d{1,2}/iu.test(text)) findings.push("UNCOMPUTED_DAY");
    if ([...text.matchAll(/\b(?:19|20)\d{2}\b/g)].some(match => Number(match[0]) !== facts.targetYear)) findings.push("UNCOMPUTED_YEAR");
    for (const match of text.toLocaleLowerCase("vi").matchAll(monthPattern)) {
      const month = monthWords[match[1]!] ?? Number(match[1]);
      if (!months.includes(month)) findings.push("UNCOMPUTED_MONTH");
    }
    if (!canNameAdversity && /(?:hạn\s+nặng|hao\s+tài|tai\s+họa|tháng\s+hạn)/iu.test(text)) findings.push("UNCOMPUTED_ADVERSITY");
  };
  check(content.title + " " + content.overview.narrative, content.overview.evidenceKeys, facts.evidenceKeys, 180, facts.periods.map(p => p.month), facts.periods.some(p => p.obstacleStarIds.length > 0));
  for (const section of content.periods) {
    const period = facts.periods.find(p => p.id === section.periodId);
    if (!period) { findings.push("UNKNOWN_PERIOD"); continue; }
    check([section.title, section.narrative, ...section.recommendations, ...section.cautions].join(" "), section.evidenceKeys, period.evidenceKeys,
      facts.kind === "monthly" ? 700 : 150, [period.month], period.obstacleStarIds.length > 0);
  }
  return { ok: findings.length === 0, findings: [...new Set(findings)] };
}

export async function writePeriodReading(input: { facts: ZiweiPeriodReadingFactsV1; provider: AiProvider; knowledgePacks?: readonly ZiweiReportKnowledgePack[]; costContext?: AiCostRequestContext }) {
  const facts = ZiweiPeriodReadingFactsV1Schema.parse(input.facts);
  let prior: ZiweiPeriodReadingContentV1 | undefined;
  let findings: string[] = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await input.provider.generateStructured({ schema: ZiweiPeriodReadingContentV1Schema, schemaName: "ziwei_period_reading_v1",
      use: "production_report_generation", costContext: input.costContext, purpose: attempt ? "rewrite" : "report", maxOutputTokens: facts.kind === "annual" ? 20000 : 8000,
      system: "Write a substantial Vietnamese astrology reading from the supplied computed lunar periods. Return only the exact JSON schema. Explain star terms immediately for beginners. Copy period identifiers and evidence keys exactly, cover every supplied period once including leap-month halves. Annual: at least150 Vietnamese syllables of substantive prose and actions per period. Monthly: at least700 per period. Overview: at least180. Distinguish preparation from predictions. No invented scores, events, dates, months, ritual advice, death/lifespan claims, certainty promises, lottery numbers, Han ideographs, or English brightness labels. Only mention adverse monthly patterns when the relevant period includes obstacleStarIds; explain the matching stars as context, never inevitable events. Do not mention AI or internal inputs. All dates refer to the lunar calendar. Each period may name only its own month. No specific days. Annual overview may compare supplied months but may not attribute an adverse pattern to a month without obstacle evidence. Do not reproduce birth data or technical identifiers in prose.",
      user: JSON.stringify({ tuple: PERIOD_READING_TUPLE, facts, knowledgePacks: (input.knowledgePacks ?? []).map(pack => ({ id: pack.id, passages: pack.passages.slice(0, 2).map(passage => ({ passageId: passage.passageId, content: passage.content.slice(0, 1800) })) })), ...(prior ? { rewrite: { prior, findings } } : {}) }),
    });
    if (!result.ok) return result;
    const parsed = ZiweiPeriodReadingContentV1Schema.safeParse(result.value.value);
    if (!parsed.success) return { ok: false as const, error: { code: "AI_OUTPUT_INVALID" as const, retryable: false } };
    const quality = validatePeriodReading(parsed.data, facts);
    if (quality.ok) return { ok: true as const, value: { content: parsed.data, quality, providerId: result.value.providerId, modelId: result.value.modelId } };
    prior = parsed.data; findings = quality.findings;
  }
  return { ok: false as const, error: { code: "PERIOD_QUALITY_REJECTED" as const, retryable: false }, findings };
}
