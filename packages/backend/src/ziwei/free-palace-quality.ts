import {
  FreePalaceGiftContentV1Schema,
  type FreePalaceGiftContentV1,
  type FreePalaceGiftFactV1,
  type ZiweiPalaceId,
} from "@lasoviet/contracts";
import { findMachineSubheading } from "../reports/comprehensive-report-beginner-gates.js";
import {
  ENGLISH_BRIGHTNESS_PATTERN,
  HAN_IDEOGRAPH_PATTERN,
  wholeWord,
} from "../reports/comprehensive-report-quality-v4.js";
import { KNOWN_CANONICAL_IDENTIFIERS_VI } from "../reports/comprehensive-report-validator-v4.js";
import { freePalaceLabel, freePalaceStarNames } from "./free-palace-labels.js";

// One-palace equivalent of the paid report's deterministic prose gates. It is a NEW function and
// changes no paid gate. Mapping to the paid gates it mirrors (comprehensive-report-quality-v4):
//   han_ideograph / english_brightness / machine_subheading  -> same exported helpers, reused as-is
//   canonical_id_leak                                        -> paid CANONICAL_ID_PATTERN rule, local regex
//   uncomputed_date                                          -> paid findUncomputedMisfortunePeriods needs
//                                                               whole-report timing facts a gift does not
//                                                               have, so the gift allows NO date or age that
//                                                               is not literally present in a supplied fact
//   prohibited_claim, invented_star, wrong_palace_focus      -> gift-specific (FD-109 prohibited content)
export const FREE_PALACE_QUALITY_VERSION = "free-palace-quality-v1";

export type FreePalaceQualityCode =
  | "han_ideograph" | "english_brightness" | "machine_subheading" | "canonical_id_leak"
  | "uncomputed_date" | "prohibited_claim" | "invented_star" | "wrong_palace_focus"
  | "narrative_too_short" | "duplicate_points" | "schema_invalid";
export type FreePalaceQualityFinding = Readonly<{ code: FreePalaceQualityCode; detail: string }>;
export type FreePalaceQualityResult = Readonly<{ ok: true }> | Readonly<{ ok: false; findings: ReadonlyArray<FreePalaceQualityFinding> }>;

export const FREE_PALACE_MIN_NARRATIVE_CHARS = 500;

// Health, death, ritual and lottery/gambling claims are never allowed in a free gift (FD-109).
// The palace named "Tật Ách" is a chart term, so only medical/mortality/ritual wording is matched.
const PROHIBITED: ReadonlyArray<readonly [string, RegExp]> = [
  ["health", /(?<![\p{L}\p{N}])(?:ung\s+thư|tiểu\s+đường|tim\s+mạch|đột\s+quỵ|tai\s+biến|phẫu\s+thuật|mổ\s+xẻ|bệnh\s+(?:nặng|hiểm|nan|tật)|mắc\s+bệnh|chẩn\s+đoán|điều\s+trị|cancer|diabetes|stroke|surgery|diagnos(?:is|e|ed)|terminal\s+illness|serious\s+illness)(?![\p{L}\p{N}])/iu],
  ["death", /(?<![\p{L}\p{N}])(?:qua\s+đời|tử\s+vong|chết|mất\s+sớm|yểu\s+mệnh|đoản\s+mệnh|sắp\s+mất|will\s+die|early\s+death|death\s+year|lifespan|life\s+expectancy)(?![\p{L}\p{N}])/iu],
  ["ritual", /(?<![\p{L}\p{N}])(?:cúng\s+(?:sao|giải|bái)|giải\s+hạn|hóa\s+giải|cầu\s+an|bùa|yểm|làm\s+lễ|lễ\s+giải|sao\s+giải\s+hạn|exorcis[em]|curse\s+removal|ritual\s+to|offering\s+to\s+(?:avert|remove))(?![\p{L}\p{N}])/iu],
  ["lottery", /(?<![\p{L}\p{N}])(?:xổ\s+số|số\s+đề|trúng\s+số|trúng\s+thưởng|đánh\s+đề|cá\s+độ|cờ\s+bạc|đánh\s+bạc|lottery|jackpot|gambl(?:e|ing)|betting\s+numbers)(?![\p{L}\p{N}])/iu],
];
const DISCIPLINE_NAME = /Tử Vi Đẩu Số|(?:trong|môn|lá số|xem|học|sách|người học) Tử Vi/giu;
const DISCIPLINE_NAME_EN = /Zi Wei Dou Shu|Zi Wei Dou Shu\b|Purple Star Astrology|the Zi Wei system|Zi Wei astrology|Zi Wei chart/giu;
const CANONICAL_ID = /ziwei\.[a-z0-9_.-]*[a-z0-9_]/iu;
const DATE_PATTERNS: ReadonlyArray<RegExp> = [
  /(?<![\p{L}\p{N}])(?:năm\s+)?(?:1[89]|20)\d{2}(?![\p{L}\p{N}])/giu,
  /(?<![\p{L}\p{N}])(?:ngày\s+\d{1,2}(?:\s+tháng\s+\d{1,2})?|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)(?![\p{L}\p{N}])/giu,
  /(?<![\p{L}\p{N}])tháng\s+(?:[1-9]|1[0-2])(?![\p{L}\p{N}])/giu,
  /(?<![\p{L}\p{N}])(?:tuổi\s+\d{1,2}|\d{1,2}\s*tuổi|\d{1,2}\s*[-–—]\s*\d{1,2}\s*tuổi|age\s+\d{1,2}|aged\s+\d{1,2}|\d{1,2}\s+years?\s+old)(?![\p{L}\p{N}])/giu,
  /(?<![\p{L}\p{N}])(?:in|during|by|around)\s+(?:the\s+)?(?:next\s+(?:one|two|three|\d+)\s+years?|20\d{2})(?![\p{L}\p{N}])/giu,
];
const normalize = (text: string) => text.normalize("NFC").replace(/\s+/gu, " ").trim().toLowerCase();
const PALACES = (locale: "vi" | "en") => Object.keys(KNOWN_CANONICAL_IDENTIFIERS_VI).filter((id) => id.startsWith("ziwei.palace."))
  .map((id) => [id as ZiweiPalaceId, freePalaceLabel(locale, id) ?? ""] as const).filter(([, label]) => label !== "");

function proseOf(content: FreePalaceGiftContentV1): string[] {
  return [content.title, content.conclusion, content.narrative,
    ...content.keyPoints.map((p) => p.text), ...content.do.map((p) => p.text), ...content.avoid.map((p) => p.text)];
}

export function validateFreePalaceGift(input: {
  content: unknown;
  facts: ReadonlyArray<FreePalaceGiftFactV1>;
  palaceId: ZiweiPalaceId;
  locale: "vi" | "en";
}): FreePalaceQualityResult {
  const parsed = FreePalaceGiftContentV1Schema.safeParse(input.content);
  if (!parsed.success) return { ok: false, findings: [{ code: "schema_invalid", detail: "content does not match the gift schema" }] };
  const content = parsed.data;
  const findings: FreePalaceQualityFinding[] = [];
  const add = (code: FreePalaceQualityCode, detail: string) => { findings.push({ code, detail }); };
  const factText = normalize(input.facts.map((fact) => `${fact.label} ${fact.value}`).join(" \n "));
  const blocks = proseOf(content);
  const all = blocks.join("\n");
  // "Tử Vi" is both a star and the name of the discipline; only the star needs a supporting fact.
  const starText = all.replace(DISCIPLINE_NAME, " ").replace(DISCIPLINE_NAME_EN, " ");

  if (content.palaceId !== input.palaceId) add("wrong_palace_focus", "content palace differs from the frozen selection");
  if (HAN_IDEOGRAPH_PATTERN.test(all)) add("han_ideograph", "Han ideographs in customer-visible prose");
  if (input.locale === "vi" && ENGLISH_BRIGHTNESS_PATTERN.test(all)) add("english_brightness", "untranslated brightness label");
  if (CANONICAL_ID.test(all)) add("canonical_id_leak", "raw canonical identifier in prose");
  if (findMachineSubheading(content.narrative)) add("machine_subheading", "narrative contains a machine sub-heading");
  if (content.narrative.trim().length < FREE_PALACE_MIN_NARRATIVE_CHARS) add("narrative_too_short", "narrative is not full prose");
  for (const [name, pattern] of PROHIBITED) if (pattern.test(all)) add("prohibited_claim", name);

  // Any date, year or age must be literally present in a supplied fact; the gift computes none itself.
  for (const pattern of DATE_PATTERNS) {
    for (const match of all.matchAll(pattern)) {
      const token = normalize(match[0]);
      if (!factText.includes(token)) { add("uncomputed_date", token); break; }
    }
  }
  // A named star must be among the supplied facts; invented stars are the most damaging error.
  for (const star of freePalaceStarNames(input.locale)) {
    if (wholeWord(starText, star) && !factText.includes(normalize(star))) add("invented_star", star);
  }
  // Title and conclusion are about the selected palace; naming a different palace there is a focus error.
  const headline = `${content.title} ${content.conclusion}`;
  const selectedLabel = freePalaceLabel(input.locale, input.palaceId) ?? "";
  for (const [id, label] of PALACES(input.locale)) {
    if (id !== input.palaceId && wholeWord(headline, label) && !wholeWord(headline, selectedLabel)) {
      add("wrong_palace_focus", label);
    }
  }
  const points = [...content.keyPoints, ...content.do, ...content.avoid].map((p) => normalize(p.text));
  if (new Set(points).size !== points.length) add("duplicate_points", "repeated point text");
  return findings.length === 0 ? { ok: true } : { ok: false, findings };
}
