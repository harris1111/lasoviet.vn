import { FreeReadingFactsV2Schema, validateFreeReadingReferences, type FreeReadingContentV2, type FreeReadingFactsV2 } from "@lasoviet/contracts";
import { HAN_IDEOGRAPH_PATTERN, wholeWord } from "../reports/comprehensive-report-quality-v4.js";
import { KNOWN_CANONICAL_IDENTIFIERS_VI } from "../reports/ziwei-canonical-labels.js";
import { FREE_PALACE_EN_LABELS, freePalaceLabel } from "./free-palace-labels.js";

export const FREE_READING_QUALITY_VERSION = "free-reading-lexical-quality-v2-draft-2";
export type FreeReadingFinding = Readonly<{ code: string; block: string; hard: boolean; detail: string }>;
type ProseBlock = { block: string; text: string; keys: string[]; teaser?: boolean; basis?: boolean };
const normalize = (text: string) => text.normalize("NFC").replace(/\s+/gu, " ").trim().toLowerCase();
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
const words = (text: string) => text.trim().split(/\s+/u).filter(Boolean).length;
const formula = /điểm cấu trúc|độ mạnh cấu trúc|phần riêng|phần chiếu|nền\s+\d+|\d+\s*\/\s*100|structural score|own component|related-palace contribution/iu;
const numericalScore = /\d[\d.,]*\s*(?:%|\/\s*100)|(?:điểm|score|rating|xác suất|probability|chance)[^.!?\n]{0,100}\d/iu;
const dates = /\b(?:19|20)\d{2}\b|(?<![\p{L}\p{N}])(?:ngày|tháng|tuổi|age|aged|year|month)\s+\d+|\d+\s*(?:tuổi|years? old)|\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/iu;
const contentLine = /(?<![\p{L}\p{N}])(?:chết|tử vong|qua đời|tuổi thọ|yểu mệnh|khắc chết|lifespan|life expectancy|death|will die|ung thư|tiểu đường|đột quỵ|cancer|diabetes|stroke|chẩn đoán|diagnos(?:is|ed)|cúng sao|giải hạn|hóa giải|hoá giải|bùa|làm lễ|vật phẩm phong thủy|ritual|feng shui objects|xổ số|số đề|lottery|jackpot|fake review|giá gốc giả)(?![\p{L}\p{N}])/iu;
const falseClaims = /chỉ còn\s+\d+|\d+\s+người (?:đã|đang) mua|\d+\s+(?:phút|giây) còn lại|tôi đã xem.{0,30}lá số|fake countdown|only\s+\d+\s+left|\d+\s+people bought/iu;
const selfReference = /(?<![\p{L}\p{N}])(?:chúng tôi|đội ngũ|thuật toán|mô hình|AI|our team|algorithm|model|we)(?![\p{L}\p{N}])/iu;
// Owner R3: style findings guide editing; truth/content/privacy/schema fences stay hard.
const STYLE_FINDINGS = new Set(["formula_leak", "locale_integrity", "self_reference", "basis_anchor", "missing_anchor", "duplicate_claim", "teaser_boundary"]);

function prose(content: FreeReadingContentV2): ProseBlock[] {
  const blocks: ProseBlock[] = [];
  function claim(block: string, c: FreeReadingContentV2["overview"]["portrait"]) {
    blocks.push({ block, text: c.text, keys: c.basis.keys });
    c.basis.chain.forEach((step, i) => blocks.push({ block: `${block}.basis.${i}`, text: step.say, keys: [step.k], basis: true }));
  }
  const o = content.overview, p = content.focusPalace;
  for (const k of ["portrait", "axis", "work", "money", "love"] as const) claim(`overview.${k}`, o[k]);
  for (const k of ["strengths", "snags", "actions"] as const) o[k].forEach((c, i) => claim(`overview.${k}.${i}`, c));
  claim("focus.conclusion", p.conclusion);
  for (const k of ["keyPoints", "paragraphs", "do", "avoid"] as const) p[k].forEach((c, i) => claim(`focus.${k}.${i}`, c));
  blocks.push({ block: "overview.bridge", text: o.bridge.text, keys: o.bridge.keys });
  blocks.push({ block: "focus.title", text: p.title, keys: p.conclusion.basis.keys });
  content.teasers.forEach((t, i) => blocks.push({ block: `teaser.${i}`, text: `${t.title}. ${t.line}`, keys: t.keys, teaser: true }));
  if (content.yearHook) {
    blocks.push({ block: "yearHook", text: [...content.yearHook.shown, content.yearHook.clip].join(" "), keys: content.yearHook.keys });
    content.yearHook.basis.chain.forEach((step, i) => blocks.push({ block: `yearHook.basis.${i}`, text: step.say, keys: [step.k], basis: true }));
  }
  return blocks;
}

/** Conservative lexical checks for review preparation, not proof of semantic grounding or a publish gate. */
export function checkFreeReadingQuality(input: { content: unknown; source: unknown }): { ok: boolean; findings: FreeReadingFinding[] } {
  const findings: FreeReadingFinding[] = [];
  const add = (code: string, block: string, detail: string, hard = !STYLE_FINDINGS.has(code)) => findings.push({ code, block, detail, hard });
  const checked = validateFreeReadingReferences(input.content, input.source);
  if (!checked.ok) return { ok: false, findings: [{ code: checked.code, block: "reading", detail: "Invalid private schema or unresolved references", hard: true }] };
  const source = FreeReadingFactsV2Schema.parse(input.source), content = checked.content;
  const facts = new Map(source.facts.map(f => [f.key, f]));
  const labels = Object.keys(source.locale === "vi" ? KNOWN_CANONICAL_IDENTIFIERS_VI : FREE_PALACE_EN_LABELS)
    .filter(id => /^ziwei\.(star|palace|transformation)\./u.test(id))
    .map(id => ({ id, name: freePalaceLabel(source.locale, id)!.replace(/^sao\s+/u, "") }));
  const stars = [...new Map(labels.filter(item => item.id.startsWith("ziwei.star.")).map(item => [normalize(item.name), item])).values()];
  const palaces = labels.filter(item => item.id.startsWith("ziwei.palace."));
  // Some auxiliary stars share a palace name (e.g. Phúc Đức). A bare palace label
  // cannot establish a star mention; require an explicit star marker in that case.
  const starMentioned = (text: string, star: { name: string }) => wholeWord(text, star.name) &&
    (!palaces.some(p => normalize(p.name) === normalize(star.name)) ||
      new RegExp(`(?:sao|star)\\s+${escape(star.name)}(?![\\p{L}\\p{N}])`, "iu").test(text));
  const global = source.facts.map(f => f.value).join(" ");
  const starFacts = source.facts.filter(f => f.key.includes(":star:"));
  const placements = new Map(starFacts.map(f => [normalize(f.label.replace(/^sao\s+/u, "")), f.value.split(" · ").slice(1)]));
  const brightnessLabels = ["exalted", "prosperous", "favorable", "neutral", "unfavorable", "weak"]
    .map(id => freePalaceLabel(source.locale, `ziwei.brightness.${id}`)!);
  const transformationLabels = labels.filter(item => item.id.startsWith("ziwei.transformation.")).map(item => item.name);
  const blocks = prose(content), seen = new Set<string>();
  for (const b of blocks) {
    const anchor = b.keys.map(k => facts.get(k)!.value).join(" ");
    if (formula.test(b.text)) add("formula_leak", b.block, "Structural formula in prose");
    if (dates.test(b.text)) add("uncomputed_date", b.block, "Timing is not available in this offline structural source");
    if (numericalScore.test(b.text) || (formula.test(b.text) && /\d/u.test(b.text))) add("uncomputed_number", b.block, "This offline source supplies no numeric score for the claim");
    if (contentLine.test(b.text) || falseClaims.test(b.text)) add("content_line", b.block, "FD089 content boundary");
    if (HAN_IDEOGRAPH_PATTERN.test(b.text) || /ziwei\.[a-z0-9_.]+|(?:palace|card|rel):[a-z_:]+|[#*_`]|[\p{Extended_Pictographic}]/u.test(b.text)) add("locale_integrity", b.block, "Raw identifiers, markup or untranslated Han text");
    if (selfReference.test(b.text)) add("self_reference", b.block, "Writer/provider self-reference");
    const mentioned = labels.filter(l => l.id.startsWith("ziwei.star.") ? starMentioned(b.text, l) : wholeWord(b.text, l.name));
    for (const l of mentioned) {
      if (!wholeWord(global, l.name)) add("invented_element", b.block, l.id);
      if (!wholeWord(anchor, l.name)) add("claim_scope", b.block, l.id);
    }
    if (b.basis) {
      const fact = facts.get(b.keys[0]!)!;
      if (!wholeWord(b.text, fact.label.replace(/^sao\s+/u, ""))) add("basis_anchor", b.block, "Basis step lacks its own fixed label");
    } else if (!b.teaser && !b.block.endsWith("title") && !b.block.endsWith("bridge")) {
      if (!mentioned.some(l => wholeWord(anchor, l.name))) add("missing_anchor", b.block, "Claim lacks a supported named element");
      const n = normalize(b.text);
      if (seen.has(n)) add("duplicate_claim", b.block, "Repeated claim");
      seen.add(n);
    }
    for (const s of stars.filter(s => starMentioned(b.text, s))) {
      const actual = placements.get(normalize(s.name));
      if (!actual) continue;
      const pattern = new RegExp(`${escape(s.name)}\\s+(?:đóng\\s+(?:ở|tại)|nằm\\s+ở|ở|tại|cư|trong|(?:is\\s+)?in|at)\\s+(?:cung\\s+)?(${palaces.map(p => escape(p.name)).sort((a, c) => c.length - a.length).join("|")})(?![\\p{L}\\p{N}])`, "giu");
      for (const match of b.text.matchAll(pattern)) if (normalize(match[1]!) !== normalize(actual[0]!)) add("placement_mismatch", b.block, s.id);
    }
    // Check literal brightness/Hoa labels in a single-star sentence. Figurative interpretations need human review.
    for (const sentence of b.text.split(/[.!?;]\s*/u)) {
      const named = stars.filter(s => starMentioned(sentence, s));
      if (named.length !== 1) continue;
      const actual = placements.get(normalize(named[0]!.name));
      if (!actual) continue;
      for (const state of brightnessLabels) if (wholeWord(sentence, state) && normalize(state) !== normalize(actual[1]!)) add("brightness_mismatch", b.block, named[0]!.id);
      for (const hoa of transformationLabels) if (wholeWord(sentence, hoa) && !actual.slice(2).some(v => normalize(v) === normalize(hoa))) add("hoa_mismatch", b.block, named[0]!.id);
    }
    if (b.teaser) {
      if (/\d|(?<![\p{L}])(?:nên|hãy|tránh|vì|do đó|nhờ|hạn|should|avoid|because|therefore)(?![\p{L}])/iu.test(b.text)) add("teaser_boundary", b.block, "Advice, timing or reasoning in free teaser");
      const teaserStars = stars.filter(s => starMentioned(b.text, s));
      if (teaserStars.length > 1) add("teaser_boundary", b.block, `More than one star in teaser: ${teaserStars.map(s => s.id).join(", ")}`);
      if (words(b.text) > 65) add("teaser_length", b.block, "Long teaser", false);
    }
  }
  const overviewText = blocks.filter(b => b.block.startsWith("overview.") && !b.basis).map(b => b.text).join(" ");
  const length = words(overviewText);
  if (length < 900 || length > 1300) add("overview_length", "overview", `${length} whitespace units; target 900–1300 still needs editorial review`, false);
  if (words(content.overview.portrait.text) > 32) add("portrait_length", "overview.portrait", "Opening exceeds the proposed short portrait target", false);
  const sentences = new Map<string, number>();
  for (const block of blocks.filter(b => !b.basis && !b.teaser)) {
    for (const sentence of block.text.split(/[.!?]\s*/u)) {
      const n = normalize(sentence);
      if (words(n) >= 12) sentences.set(n, (sentences.get(n) ?? 0) + 1);
    }
  }
  const repeated = [...sentences.values()].filter(count => count > 2);
  if (repeated.length) add("repeated_prose", "reading", `${repeated.length} substantial sentences recur more than twice; editorial revision required`, false);
  if (source.provisional && !/tạm tính|provisional/iu.test(content.overview.axis.text)) add("provisional_missing", "overview.axis", "Uncertain-time estimate disclosure missing");
  return { ok: !findings.some(f => f.hard), findings };
}

export function summarizeFreeReadingLength(content: FreeReadingContentV2): { overview: number; focus: number } {
  const blocks = prose(content).filter(b => !b.basis);
  return { overview: words(blocks.filter(b => b.block.startsWith("overview.")).map(b => b.text).join(" ")),
    focus: words(blocks.filter(b => b.block.startsWith("focus.")).map(b => b.text).join(" ")) };
}

export type { FreeReadingFactsV2 };
