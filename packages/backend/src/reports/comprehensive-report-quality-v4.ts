import type { ZiweiPalaceId } from "@lasoviet/contracts";
import {
  resolveZiweiReportQualityConfig,
  resolveZiweiReportQualitySectionThreshold,
  type ZiweiReportQualityConfig,
  type ZiweiReportQualitySectionKind,
} from "@lasoviet/config";

import { normalizeComprehensiveReportModelProse } from "./comprehensive-report-writer.js";
import { KNOWN_CANONICAL_IDENTIFIERS_VI } from "./comprehensive-report-validator-v4.js";
import type { ComprehensiveZiweiFactsV4 } from "./comprehensive-ziwei-facts-v4.js";
import { REPORT_QUALITY_VERSION_COMPREHENSIVE_V2_3_SENSITIVITY } from "./identity-report-config.js";

export type ComprehensiveReportQualitySectionV4 = {
  key: string;
  kind: ZiweiReportQualitySectionKind;
  text: string;
  evidenceKeys: readonly string[];
  palaceId?: ZiweiPalaceId;
};

export const COMPREHENSIVE_REPORT_QUALITY_FINDING_CODES_V4 = [
  "MINIMUM_SYLLABLES",
  "DISCOURAGED_TERM",
  "DEATH_TERM",
  "CERTAINTY",
  "LOCALE_HAN",
  "ENGLISH_BRIGHTNESS",
  "PROPER_NAME_DENSITY",
  "ADVERSE_DATE",
  "PREPARATION_FRAMING",
  "PALACE_FACTS",
  "PALACE_ANCHORS",
  "EVIDENCE_ANCHORS",
] as const;

export type ComprehensiveReportQualityFindingCodeV4 =
  (typeof COMPREHENSIVE_REPORT_QUALITY_FINDING_CODES_V4)[number];
export type ComprehensiveReportQualityFindingV4 = {
  sectionKey: string;
  code: ComprehensiveReportQualityFindingCodeV4;
  note: string;
};
export type ComprehensiveReportQualityResultV4 =
  | { ok: true; findings: [] }
  | { ok: false; findings: ComprehensiveReportQualityFindingV4[] };

const TRADITIONAL_MISFORTUNE_PATTERN =
  /(?:(?<!(?:thời|kỳ|giới)\s+)(?<![\p{L}\p{N}])hạn(?!\s+(?:chế|mức))(?![\p{L}\p{N}])|(?<![\p{L}\p{N}])(?:tai\s+nạn|tai\s+nan|phá\s+sản|pha\s+san|kiện\s+tụng|kien\s+tung|đổ\s+vỡ|do\s+vo|hao\s+hụt\s+tiền|hao\s+hut\s+tien|hao\s+tài|hao\s+tai|tai\s+ách|tai\s+ach|tai\s+ương|tai\s+uong|vận\s+hạn|van\s+han|năm\s+hạn|nam\s+han|tháng\s+hạn|thang\s+han|gặp\s+hạn|gap\s+han|mắc\s+hạn|mac\s+han|trắc\s+trở|trac\s+tro)(?![\p{L}\p{N}]))/iu;

export function findUncomputedMisfortunePeriods(
  text: string,
  facts: ComprehensiveZiweiFactsV4,
  config?: {
    misfortuneTerms?: readonly string[];
    adverseDatePatterns?: readonly string[];
  },
): string[] {
  const uncomputed: string[] = [];
  const sentences = text.split(/[.!?;\n]+/u);

  for (const sentence of sentences) {
    const hasConfigMisfortune =
      config?.misfortuneTerms?.some((term) => wholeWord(sentence, term)) ?? false;
    const hasMisfortune = hasConfigMisfortune || TRADITIONAL_MISFORTUNE_PATTERN.test(sentence);
    if (!hasMisfortune) continue;

    // 1. Explicit adverse date patterns from config if configured
    let capturedDayDate = false;
    if (config?.adverseDatePatterns) {
      for (const pattern of config.adverseDatePatterns) {
        const match = sentence.match(new RegExp(pattern, "iu"));
        if (match) {
          uncomputed.push(match[0].trim());
          capturedDayDate = true;
          break;
        }
      }
    }

    // 2. Explicit day/date pattern (e.g. ngày 12 tháng 3, 12/3)
    if (!capturedDayDate) {
      const dayDateMatch = sentence.match(
        /(?<![\p{L}\p{N}])(?:ngày\s+\d{1,2}(?:\s+tháng\s+\d{1,2})?|\d{1,2}\/\d{1,2})(?![\p{L}\p{N}])/iu,
      );
      if (dayDateMatch) {
        uncomputed.push(dayDateMatch[0].trim());
        capturedDayDate = true;
      }
    }

    // 3. Explicit calendar month (e.g. tháng 3, tháng 12) - engine never computes calendar months for misfortune
    if (!capturedDayDate) {
      const monthMatch = sentence.match(
        /(?<![\p{L}\p{N}])tháng\s+([1-9]|1[0-2])(?![\p{L}\p{N}])/iu,
      );
      if (monthMatch) {
        uncomputed.push(monthMatch[0].trim());
      }
    }

    // 4. Year range (e.g. 2024-2033 or năm 2024 - 2033)
    const yearRangeRegex =
      /(?<![\p{L}\p{N}])(?:năm\s+)?([12]\d{3})\s*[-–—]\s*([12]\d{3})(?![\p{L}\p{N}])/giu;
    let yrMatch: RegExpExecArray | null;
    const coveredYearRanges: Array<[number, number]> = [];
    while ((yrMatch = yearRangeRegex.exec(sentence)) !== null) {
      const start = parseInt(yrMatch[1]!, 10);
      const end = parseInt(yrMatch[2]!, 10);
      coveredYearRanges.push([yrMatch.index, yrMatch.index + yrMatch[0].length]);
      const valid =
        facts.timing.decadal.state === "active" &&
        start >= facts.timing.decadal.yearRange[0] &&
        end <= facts.timing.decadal.yearRange[1];
      if (!valid) uncomputed.push(yrMatch[0].trim());
    }

    // 5. Specific year (e.g. năm 2026, 2038)
    const yearRegex = /(?<![\p{L}\p{N}])(?:năm\s+)?([12]\d{3})(?![\p{L}\p{N}])/giu;
    let yMatch: RegExpExecArray | null;
    while ((yMatch = yearRegex.exec(sentence)) !== null) {
      if (coveredYearRanges.some(([s, e]) => yMatch!.index >= s && yMatch!.index < e)) continue;
      const year = parseInt(yMatch[1]!, 10);
      const isTarget = year === facts.timing.annual.targetYear;
      const isDecadal =
        facts.timing.decadal.state === "active" &&
        year >= facts.timing.decadal.yearRange[0] &&
        year <= facts.timing.decadal.yearRange[1];
      const isNotStarted =
        facts.timing.decadal.state === "not_started" &&
        year === facts.timing.decadal.firstCycleStartYear;
      if (!isTarget && !isDecadal && !isNotStarted) {
        uncomputed.push(yMatch[0].trim());
      }
    }

    // 6. Age range (e.g. tuổi 33-42, 33-42 tuổi)
    const ageRangeRegex =
      /(?<![\p{L}\p{N}])(?:(?:độ\s+)?tuổi\s+)?(\d{1,2})\s*[-–—]\s*(\d{1,2})\s*(?:tuổi)?(?![\p{L}\p{N}])/giu;
    let arMatch: RegExpExecArray | null;
    const coveredAgeRanges: Array<[number, number]> = [];
    while ((arMatch = ageRangeRegex.exec(sentence)) !== null) {
      const start = parseInt(arMatch[1]!, 10);
      const end = parseInt(arMatch[2]!, 10);
      if (start >= 10 && end > start) {
        coveredAgeRanges.push([arMatch.index, arMatch.index + arMatch[0].length]);
        const valid =
          facts.timing.decadal.state === "active" &&
          start >= facts.timing.decadal.ageRange[0] &&
          end <= facts.timing.decadal.ageRange[1];
        if (!valid) uncomputed.push(arMatch[0].trim());
      }
    }

    // 7. Specific age (e.g. tuổi 35, 60 tuổi)
    const ageRegex = /(?<![\p{L}\p{N}])(?:tuổi\s+(\d{1,2})|(\d{1,2})\s*tuổi)(?![\p{L}\p{N}])/giu;
    let aMatch: RegExpExecArray | null;
    while ((aMatch = ageRegex.exec(sentence)) !== null) {
      if (coveredAgeRanges.some(([s, e]) => aMatch!.index >= s && aMatch!.index < e)) continue;
      const age = parseInt(aMatch[1] || aMatch[2]!, 10);
      const isDecadal =
        facts.timing.decadal.state === "active" &&
        age >= facts.timing.decadal.ageRange[0] &&
        age <= facts.timing.decadal.ageRange[1];
      const isNotStarted =
        facts.timing.decadal.state === "not_started" &&
        age === facts.timing.decadal.firstCycleStartAge;
      if (!isDecadal && !isNotStarted) {
        uncomputed.push(aMatch[0].trim());
      }
    }
  }

  return [...new Set(uncomputed)];
}

const MAX_SECTION_KEY_CHARS = 96;
const HAN_IDEOGRAPH_PATTERN = /(?:[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]|\p{Script=Han})/u;
const ENGLISH_BRIGHTNESS_PATTERN =
  /(?<![\p{L}\p{N}])(exalted|prosperous|favorable|neutral|unfavorable|weak)(?![\p{L}\p{N}])/iu;
const CANONICAL_ID_PATTERN = /ziwei\.[a-z0-9_.-]*[a-z0-9_]/giu;
const KNOWN_MAJOR_STAR_IDS = new Set([
  "ziwei.star.ziwei",
  "ziwei.star.purple-emperor",
  "ziwei.star.tianji",
  "ziwei.star.taiyang",
  "ziwei.star.wuqu",
  "ziwei.star.tiantong",
  "ziwei.star.lianzhen",
  "ziwei.star.tianfu",
  "ziwei.star.taiyin",
  "ziwei.star.tanlang",
  "ziwei.star.jumen",
  "ziwei.star.tianxiang",
  "ziwei.star.tianliang",
  "ziwei.star.qisha",
  "ziwei.star.pojun",
]);

function wholeWord(text: string, term: string): boolean {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "iu").test(text.normalize("NFC"));
}

export function countVietnameseSyllables(text: string): number {
  const normalized = normalizeComprehensiveReportModelProse(text);
  return normalized === "" ? 0 : normalized.split(/\s+/u).length;
}

function displayFact(key: string): string | undefined {
  const label = KNOWN_CANONICAL_IDENTIFIERS_VI[key.toLowerCase()];
  return label?.replace(/^sao\s+/u, "");
}

function canonicalIdsFrom(value: string): string[] {
  const normalized = value.toLowerCase();
  if (KNOWN_CANONICAL_IDENTIFIERS_VI[normalized]) {
    return [normalized];
  }
  return (normalized.match(CANONICAL_ID_PATTERN) ?? [])
    .filter((id) => KNOWN_CANONICAL_IDENTIFIERS_VI[id] !== undefined);
}

function referencedEvidenceFactIds(
  evidenceKeys: readonly string[],
  facts: ComprehensiveZiweiFactsV4,
): Set<string> {
  const itemByKey = new Map(facts.evidence.items.map((item) => [item.key, item]));
  const ids = new Set<string>();
  for (const evidenceKey of new Set(evidenceKeys)) {
    const item = itemByKey.get(evidenceKey);
    if (!item) continue;
    const sourceIds = item.sourceKeys.flatMap(canonicalIdsFrom);
    for (const id of sourceIds.length > 0 ? sourceIds : canonicalIdsFrom(item.key)) {
      ids.add(id);
    }
  }
  return ids;
}

function properNamesInFacts(
  facts: ComprehensiveZiweiFactsV4,
  config: ZiweiReportQualityConfig & {
    properNames: readonly string[];
    maxProperNamesPer100Syllables: number;
  },
): Set<string> {
  const names = new Set(config.properNames);
  const actualStarIds = new Set(
    facts.natal.palaces.flatMap((palace) => palace.stars.map((star) => star.id.toLowerCase())),
  );
  for (const item of facts.evidence.items) {
    for (const sourceKey of item.sourceKeys) {
      for (const id of canonicalIdsFrom(sourceKey)) {
        if (id.startsWith("ziwei.star.")) actualStarIds.add(id);
      }
    }
  }
  for (const starId of actualStarIds) {
    const label = displayFact(starId);
    if (label) names.add(label);
  }
  return names;
}

const PALACE_NAME_CONTEXT_PATTERNS = [
  /\bcung\s*$/iu,
  /\btam phương\b[^.!?;:\n]{0,64}\b(?:gồm|là|có)\s*$/iu,
  /\btam hợp\s*$/iu,
  /\bđối cung\s*$/iu,
  /\bxung chiếu(?:\s+(?:đến|tới|với))?\s*$/iu,
  /\b(?:chiếu về|liên cung)\s*$/iu,
];

function hasDiscouragedTerm(text: string, term: string): boolean {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "giu");
  const normalizedTerm = term.normalize("NFC").toLocaleLowerCase("vi-VN");
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (normalizedTerm === "phu thê" || normalizedTerm === "tử tức") {
      const contextStart = Math.max(0, match.index - 96);
      const context = text.slice(contextStart, match.index);
      if (PALACE_NAME_CONTEXT_PATTERNS.some((contextPattern) => contextPattern.test(context))) {
        continue;
      }
    }
    return true;
  }
  return false;
}

function hasTrueNoMajorStarState(
  stars: ComprehensiveZiweiFactsV4["natal"]["palaces"][number]["stars"],
): boolean {
  return stars.every((star) => {
    const id = star.id.toLowerCase();
    if (star.category === "major" || KNOWN_MAJOR_STAR_IDS.has(id)) return false;
    return star.category !== undefined || KNOWN_CANONICAL_IDENTIFIERS_VI[id] !== undefined;
  });
}

function finding(
  sectionKey: string,
  code: ComprehensiveReportQualityFindingCodeV4,
  note: string,
  config: ZiweiReportQualityConfig,
): ComprehensiveReportQualityFindingV4 {
  return {
    sectionKey: sectionKey.slice(0, MAX_SECTION_KEY_CHARS),
    code,
    note: note.slice(0, config.maxFindingNoteChars),
  };
}

export function validateComprehensiveReportSectionQualityV4(
  section: ComprehensiveReportQualitySectionV4,
  facts: ComprehensiveZiweiFactsV4,
  reportConfigVersion = "ziwei.comprehensive.report.v4.1-sectioned",
  qualityVersion = "ziwei.comprehensive.quality.v1",
): ComprehensiveReportQualityResultV4 {
  const config = resolveZiweiReportQualityConfig(reportConfigVersion, qualityVersion);
  const rawText = section.text.normalize("NFC");
  const text = normalizeComprehensiveReportModelProse(rawText);
  const findings: ComprehensiveReportQualityFindingV4[] = [];
  const add = (code: ComprehensiveReportQualityFindingCodeV4, note: string) => {
    if (findings.length < config.maxFindings) findings.push(finding(section.key, code, note, config));
  };
  const threshold = resolveZiweiReportQualitySectionThreshold(
    reportConfigVersion,
    qualityVersion,
    section.kind,
  );
  const syllables = countVietnameseSyllables(text);
  if (syllables < threshold.minimumSyllables) add("MINIMUM_SYLLABLES", `Requires ${threshold.minimumSyllables} syllables; found ${syllables}.`);
  for (const [code, terms] of [["DISCOURAGED_TERM", config.discouragedTerms], ["DEATH_TERM", config.deathTerms], ["CERTAINTY", config.certaintyPhrases]] as const) {
    const term = terms.find((value) =>
      code === "DISCOURAGED_TERM" ? hasDiscouragedTerm(text, value) : wholeWord(text, value),
    );
    if (term) add(code, `Contains prohibited term: ${term}.`);
  }
  if (HAN_IDEOGRAPH_PATTERN.test(rawText)) add("LOCALE_HAN", "Contains a Han ideograph.");
  if (ENGLISH_BRIGHTNESS_PATTERN.test(text)) add("ENGLISH_BRIGHTNESS", "Contains an English brightness descriptor.");
  if (qualityVersion !== REPORT_QUALITY_VERSION_COMPREHENSIVE_V2_3_SENSITIVITY) {
    if (!("properNames" in config) || !("maxProperNamesPer100Syllables" in config)) {
      throw new Error("ZIWEI_REPORT_QUALITY_VERSION_MISMATCH");
    }
    const density = [...properNamesInFacts(facts, config)].reduce((count, term) => count + (text.match(new RegExp(`(?<![\\p{L}\\p{N}])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{N}])`, "giu"))?.length ?? 0), 0) / Math.max(syllables, 1) * 100;
    if (density > config.maxProperNamesPer100Syllables) add("PROPER_NAME_DENSITY", `Proper-name density ${density.toFixed(2)} exceeds ${config.maxProperNamesPer100Syllables}.`);
  }
  const uncomputedPeriods = findUncomputedMisfortunePeriods(text, facts, config);
  if (uncomputedPeriods.length > 0) {
    add("ADVERSE_DATE", `Contains an uncomputed misfortune period: ${uncomputedPeriods.join(", ")}.`);
  }
  if (section.kind === "palace") {
    const palace = facts.natal.palaces.find((item) => item.palaceId === section.palaceId);
    if (!palace) add("PALACE_FACTS", "Palace is not present in chart facts.");
    else {
      const namedStars = new Set(
        palace.stars
          .map((star) => star.id.toLowerCase())
          .filter((id) => {
            const label = displayFact(id);
            return label !== undefined && wholeWord(text, label);
          }),
      ).size;
      const hasNoMajor = hasTrueNoMajorStarState(palace.stars);
      if (namedStars < config.minimumPalaceStars && !(hasNoMajor && wholeWord(text, "không có chính tinh"))) {
        add("PALACE_ANCHORS", `Requires ${config.minimumPalaceStars} actual palace stars or the true no-major-star state.`);
      }
    }
  } else {
    const anchors = [...referencedEvidenceFactIds(section.evidenceKeys, facts)].filter((id) => {
      const label = displayFact(id);
      return label !== undefined && wholeWord(text, label);
    });
    if (anchors.length < config.minimumEvidenceAnchors) {
      add("EVIDENCE_ANCHORS", `Requires ${config.minimumEvidenceAnchors} distinct named evidence-backed chart facts.`);
    }
  }
  return findings.length === 0 ? { ok: true, findings: [] } : { ok: false, findings };
}
