import {
  type ZiweiTopicDeepDiveContentV1,
  type ZiweiTopicDeepDiveId,
  TOPIC_PALACE_SCOPES,
  ZIWEI_BRANCH_IDS,
} from "@lasoviet/contracts";
import { resolveZiweiReportQualityConfig } from "@lasoviet/config";

import {
  countVietnameseSyllables,
  displayFact,
  ENGLISH_BRIGHTNESS_PATTERN,
  findUncomputedMisfortunePeriods,
  HAN_IDEOGRAPH_PATTERN,
  hasDiscouragedTerm,
  hasTrueNoMajorStarState,
  referencedEvidenceFactIds,
  wholeWord,
} from "./comprehensive-report-quality-v4.js";
import { KNOWN_CANONICAL_IDENTIFIERS_VI } from "./ziwei-canonical-labels.js";
import { normalizeComprehensiveReportModelProse } from "./comprehensive-report-writer.js";
import { hasProhibitedReadingAdvice } from "./reading-content-line.js";
import type { ComprehensiveZiweiFactsV4 } from "./comprehensive-ziwei-facts-v4.js";
import {
  REPORT_CONFIG_VERSION_V4_1_1_SECTIONED_SENSITIVITY,
  REPORT_QUALITY_VERSION_COMPREHENSIVE_V2_3_SENSITIVITY,
} from "./identity-report-config.js";

export const TOPIC_DEEP_DIVE_QUALITY_FINDING_CODES = [
  "MINIMUM_SYLLABLES",
  "DISCOURAGED_TERM",
  "DEATH_TERM",
  "CONTENT_LINE_VIOLATION",
  "CERTAINTY",
  "LOCALE_HAN",
  "ENGLISH_BRIGHTNESS",
  "ADVERSE_DATE",
  "PALACE_FACTS",
  "PALACE_ANCHORS",
  "EVIDENCE_ANCHORS",
  "DECADAL_TIMING_MISMATCH",
  "THEMATIC_OVERLAP",
] as const;

export type TopicDeepDiveQualityFindingCode =
  (typeof TOPIC_DEEP_DIVE_QUALITY_FINDING_CODES)[number];

export type TopicDeepDiveQualityFinding = {
  sectionKey: string;
  code: TopicDeepDiveQualityFindingCode;
  note: string;
};

export type TopicDeepDiveQualityResult =
  | { ok: true; findings: []; advisory?: TopicDeepDiveQualityFinding[] }
  | { ok: false; findings: TopicDeepDiveQualityFinding[]; advisory?: TopicDeepDiveQualityFinding[] };

export type TopicDeepDiveQualityConfig = {
  minOverviewSyllables: number;
  minPalaceAnchorSyllables: number;
  minThematicDimensionSyllables: number;
  minDecadalTimingSyllables: number;
  minActionItemSyllables: number;
  minTotalSyllables: number;
  minimumPalaceStars: number;
  minimumEvidenceAnchors: number;
};

export const DEFAULT_TOPIC_DEEP_DIVE_QUALITY_CONFIG: TopicDeepDiveQualityConfig =
  Object.freeze({
    minOverviewSyllables: 180,
    minPalaceAnchorSyllables: 150,
    minThematicDimensionSyllables: 180,
    minDecadalTimingSyllables: 160,
    minActionItemSyllables: 70,
    minTotalSyllables: 1_200,
    minimumPalaceStars: 2,
    minimumEvidenceAnchors: 2,
  });

const branchLabels = ZIWEI_BRANCH_IDS.map(id => displayFact(id)).filter((label): label is string => label !== undefined);
const escapeProsePattern = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function checkExplicitPalaceCoordinates(
  text: string,
  facts: ComprehensiveZiweiFactsV4,
  addFinding: (code: TopicDeepDiveQualityFindingCode, note: string) => void,
) {
  const branches = branchLabels.map(escapeProsePattern).join("|");
  for (const palace of facts.natal.palaces) {
    const label = displayFact(palace.palaceId);
    if (!label) continue;
    const decadal = facts.timing.decadal.state === "active"
      ? facts.timing.decadal.palaces.find(role => role.palaceId === palace.palaceId)
      : undefined;
    const layers = [
      { name: "natal", scope: "gốc", expected: palace.earthlyBranchId, code: "PALACE_FACTS" },
      { name: "decadal", scope: String.raw`(?:của\s+)?đại\s+vận`, expected: decadal?.earthlyBranchId, code: "DECADAL_TIMING_MISMATCH" },
    ] as const;
    for (const layer of layers) {
      // Explicit gốc means natal even within a paragraph about decadal timing.
      // Unqualified palace mentions do not select a coordinate system here.
      const claim = new RegExp(String.raw`(?<![\p{L}\p{N}])(?:cung\s+)?${escapeProsePattern(label)}\s+${layer.scope}\s+(?:(?:an|tọa|đóng)\s+)?tại\s+(${branches})(?![\p{L}\p{N}])`, "giu");
      for (const match of text.matchAll(claim)) {
        const prefix = text.slice(0, match.index).toLocaleLowerCase("vi");
        const denial = /(?<![\p{L}\p{N}])không\s+phải(?:\s+là)?\s*$/u.exec(prefix);
        const outerPrefix = denial ? prefix.slice(0, denial.index).split(/[.!?;\n]/u).at(-1)! : "";
        const outerDenial = /(?<![\p{L}\p{N}])(?:không|chưa|chẳng|đừng|tránh|phủ nhận|bác bỏ|chối bỏ)(?![\p{L}\p{N}])/u.test(outerPrefix);
        // An immediate denial is not an affirmative coordinate claim. Nested
        // denials remain conservative; commas never reset their outer context.
        if (denial && !outerDenial) continue;
        const observed = ZIWEI_BRANCH_IDS.find(id => displayFact(id)?.toLowerCase() === match[1]!.toLowerCase());
        if (observed !== layer.expected) {
          addFinding(layer.code, `Explicit ${layer.name} coordinate for ${palace.palaceId} is ${observed}; source requires ${layer.expected ?? "an unavailable decadal role"}.`);
        }
      }
    }
  }
}

function checkExplicitResidentStarLists(
  text: string,
  facts: ComprehensiveZiweiFactsV4,
  addFinding: (code: TopicDeepDiveQualityFindingCode, note: string) => void,
) {
  const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const labels = [...new Set(Object.entries(KNOWN_CANONICAL_IDENTIFIERS_VI)
    .filter(([id]) => id.startsWith("ziwei.star."))
    .map(([, label]) => label.replace(/^sao\s+/u, "")))].sort((a, b) => b.length - a.length);
  const nextStar = new RegExp(`^\\s*(?:(?:các\\s+)?(?:sao|chính\\s+tinh|phụ\\s+tinh)\\s+)?(${labels.map(escape).join("|")})(?![\\p{L}\\p{N}])`, "iu");
  const modifier = /^\s*(?:(?:ở\s+trạng\s+thái\s+)?(?:miếu|vượng|đắc(?:\s+địa)?|hãm(?:\s+địa)?|bình(?:\s+hòa)?))(?![\p{L}\p{N}])/iu;
  const separator = /^\s*(?:,\s*(?:và\s+)?|(?:và|cùng|hội\s+cùng)\s+)/iu;
  const normalized = text.normalize("NFC");
  for (const palace of facts.natal.palaces) {
    const label = displayFact(palace.palaceId);
    if (!label) continue;
    const claim = new RegExp(`(?<![\\p{L}\\p{N}])(?:cung\\s+)?${escape(label)}(?![\\p{L}\\p{N}])([^.!?;:\\n]{0,100}?)\\s+(có|gồm|chứa|hội\\s+tụ(?=\\s+(?:chính\\s+tinh|phụ\\s+tinh|sao)))(?![\\p{L}\\p{N}])`, "giu");
    const residentLabels = new Set(palace.stars.map(star => displayFact(star.id)?.normalize("NFC").toLocaleLowerCase("vi")));
    for (const match of normalized.matchAll(claim)) {
      const prefix = match[1]!;
      const beforePalace = normalized.slice(0, match.index).split(/[.!?;:\n]|(?<![\p{L}\p{N}])(?:nhưng|còn)(?![\p{L}\p{N}])/iu).at(-1) ?? "";
      // Do not infer residence from aspect, layer, conditional or absence prose.
      const governingContext = `${beforePalace} ${prefix}`;
      if (["nếu", "giả sử", "đại vận", "lưu", "tam hợp", "đối cung", "chiếu", "từ", "thì"]
        .some(term => wholeWord(governingContext, term))) continue;
      const earlierPalaceClause = beforePalace.includes(",") && facts.natal.palaces
        .some(other => wholeWord(beforePalace, displayFact(other.palaceId) ?? other.palaceId));
      const denialContext = `${earlierPalaceClause ? beforePalace.split(",").at(-1) : beforePalace} ${prefix}`
        .replace(/không\s+(?:thể\s+|hề\s+)?phủ\s+nhận\s+(?:rằng\s+)?/giu, "")
        .replace(/(?:không\s+phải\s+(?:(?:là|rằng)\s+)?){2}/giu, "");
      if (["không", "chưa"].some(term => wholeWord(denialContext, term))) continue;
      if (facts.natal.palaces.some(other => other.palaceId !== palace.palaceId && wholeWord(prefix, displayFact(other.palaceId) ?? other.palaceId))) continue;
      let tail = normalized.slice(match.index! + match[0].length).split(/[.!?;:\n]/u)[0]!;
      const claimedLabels: string[] = [];
      while (true) {
        const star = nextStar.exec(tail);
        if (!star) break;
        claimedLabels.push(star[1]!);
        tail = tail.slice(star[0].length).replace(modifier, "");
        const join = separator.exec(tail);
        if (!join) break;
        tail = tail.slice(join[0].length);
      }
      // A condition following the list qualifies this claim, not a later sentence.
      if (/^\s*(?:nếu|giả\s+sử|khi\s+(?:giờ\s+sinh|lá\s+số)\s+khác)(?![\p{L}\p{N}])/iu.test(tail)) continue;
      // A following aspect qualifier changes the meaning of the list itself.
      if (/^\s*(?:ở|tại|thuộc|từ|chiếu|xung\s+chiếu|hội\s+chiếu|hội\s+tụ|trong\s+tam\s+hợp|tại\s+đối\s+cung)(?![\p{L}\p{N}])/iu.test(tail)) continue;
      for (const starLabel of claimedLabels) {
        if (!residentLabels.has(starLabel.toLocaleLowerCase("vi"))) {
          addFinding("PALACE_FACTS", `Explicit resident star ${starLabel} is absent from natal ${palace.palaceId}.`);
        }
      }
    }
  }
}

function checkProse(
  text: string,
  sectionKey: string,
  addFinding: (code: TopicDeepDiveQualityFindingCode, note: string) => void,
  facts: ComprehensiveZiweiFactsV4,
  discouragedTerms: readonly string[],
  deathTerms: readonly string[],
  certaintyPhrases: readonly string[],
) {
  const rawText = text.normalize("NFC");
  const normalized = normalizeComprehensiveReportModelProse(rawText);

  checkExplicitPalaceCoordinates(rawText, facts, addFinding);
  checkExplicitResidentStarLists(rawText, facts, addFinding);

  // Resident-major absence says nothing about the opposite palace. Check
  // explicit named-palace opposition claims against that separate source.
  for (const palace of facts.natal.palaces) {
    const label = displayFact(palace.palaceId), branch = displayFact(palace.earthlyBranchId);
    if (!label || !branch) continue;
    const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const claim = new RegExp(`(?<![\\p{L}\\p{N}])(?:cung\\s+)?${escape(label)}(?![\\p{L}\\p{N}])(?:\\s+(?:tọa|an|đóng)\\s+tại\\s+${escape(branch)})?\\s+không\\s+có\\s+(?:sao\\s+)?chính\\s+tinh\\s+(?:(?:trực|xung)\\s+chiếu|chiếu)(?![\\p{L}\\p{N}])`, "iu");
    if (!claim.test(rawText)) continue;
    const opposite = facts.natal.palaces.find(other => other.palaceId === palace.oppositePalaceId);
    if (!opposite || !hasTrueNoMajorStarState(opposite.stars)) {
      addFinding("PALACE_FACTS", `Opposing major-star absence for ${palace.palaceId} is not supported by ${palace.oppositePalaceId}. Resident-star absence is a separate fact.`);
    }
  }

  // Han/Nom check
  if (HAN_IDEOGRAPH_PATTERN.test(rawText)) {
    addFinding("LOCALE_HAN", "Contains a Han ideograph.");
  }

  // English brightness check
  if (ENGLISH_BRIGHTNESS_PATTERN.test(normalized)) {
    addFinding(
      "ENGLISH_BRIGHTNESS",
      "Contains an English brightness descriptor.",
    );
  }

  // FD077/FD089 hard content boundary.
  for (const term of deathTerms) {
    if (wholeWord(normalized, term)) {
      addFinding("DEATH_TERM", `Contains prohibited death/fatalistic term: ${term}.`);
      break;
    }
  }

  if (hasProhibitedReadingAdvice(normalized)) {
    addFinding("CONTENT_LINE_VIOLATION", "Contains prohibited ritual or lottery advice.");
  }

  // Discouraged terms (with contextual palace-name exception)
  for (const term of discouragedTerms) {
    if (hasDiscouragedTerm(normalized, term)) {
      addFinding("DISCOURAGED_TERM", `Contains discouraged term: ${term}.`);
      break;
    }
  }

  // Certainty phrases
  for (const phrase of certaintyPhrases) {
    if (wholeWord(normalized, phrase)) {
      addFinding("CERTAINTY", `Contains certainty phrase: ${phrase}.`);
      break;
    }
  }

  // Uncomputed misfortune periods (FD-089: no uncomputed dates/calendar months)
  const uncomputed = findUncomputedMisfortunePeriods(normalized, facts);
  if (uncomputed.length > 0) {
    addFinding(
      "ADVERSE_DATE",
      `Contains uncomputed misfortune period: ${uncomputed.join(", ")}.`,
    );
  }
}

export function validateZiweiTopicDeepDiveQualityV4(
  report: ZiweiTopicDeepDiveContentV1,
  facts: ComprehensiveZiweiFactsV4,
  customConfig?: Partial<TopicDeepDiveQualityConfig>,
  priorThematicNarrative?: string,
): TopicDeepDiveQualityResult {
  const config = {
    ...DEFAULT_TOPIC_DEEP_DIVE_QUALITY_CONFIG,
    ...customConfig,
  };
  const quality = resolveZiweiReportQualityConfig(
    REPORT_CONFIG_VERSION_V4_1_1_SECTIONED_SENSITIVITY,
    REPORT_QUALITY_VERSION_COMPREHENSIVE_V2_3_SENSITIVITY,
  );

  const findings: TopicDeepDiveQualityFinding[] = [];
  const advisory: TopicDeepDiveQualityFinding[] = [];
  const add = (sectionKey: string, code: TopicDeepDiveQualityFindingCode, note: string) => {
    (code === "DISCOURAGED_TERM" ? advisory : findings).push({ sectionKey, code, note });
  };

  const validEvidenceKeys = new Set(facts.evidenceKeys);
  for (const item of facts.evidence.items) {
    validEvidenceKeys.add(item.key);
  }

  const checkEvidenceKeysValid = (keys: readonly string[], sectionKey: string) => {
    for (const key of keys) {
      if (!validEvidenceKeys.has(key)) {
        add(
          sectionKey,
          "EVIDENCE_ANCHORS",
          `Evidence key '${key}' does not exist in chart facts.`,
        );
      }
    }
  };

  let totalSyllables = 0;

  // 1. Topic Scope Anchors
  const palaceScope = TOPIC_PALACE_SCOPES[report.topicId];
  if (palaceScope) {
    for (const primary of palaceScope.primaryPalaces) {
      const hasPrimary = report.palaceAnchors.some((p) => p.palaceId === primary);
      if (!hasPrimary) {
        add(
          "palaceAnchors",
          "PALACE_ANCHORS",
          `Topic ${report.topicId} must anchor in primary palace ${primary}.`,
        );
      }
    }
  }

  // 2. Overview
  const overviewText = `${report.overview.title} ${report.overview.narrative}`;
  const overviewSyllables = countVietnameseSyllables(overviewText);
  totalSyllables += overviewSyllables;
  if (overviewSyllables < config.minOverviewSyllables) {
    add(
      "overview",
      "MINIMUM_SYLLABLES",
      `Overview requires at least ${config.minOverviewSyllables} syllables, found ${overviewSyllables}.`,
    );
  }
  checkProse(
    overviewText,
    "overview",
    (code, note) => add("overview", code, note),
    facts,
    quality.discouragedTerms,
    quality.deathTerms,
    quality.certaintyPhrases,
  );
  checkEvidenceKeysValid(report.overview.evidenceKeys, "overview");
  const overviewAnchors = [
    ...referencedEvidenceFactIds(report.overview.evidenceKeys, facts),
  ].filter((id) => {
    const label = displayFact(id);
    return label !== undefined && wholeWord(overviewText, label);
  });
  if (overviewAnchors.length < config.minimumEvidenceAnchors) {
    add(
      "overview",
      "EVIDENCE_ANCHORS",
      `Overview requires at least ${config.minimumEvidenceAnchors} distinct named chart facts, found ${overviewAnchors.length}.`,
    );
  }

  // 3. Palace Anchors
  for (let i = 0; i < report.palaceAnchors.length; i++) {
    const anchor = report.palaceAnchors[i]!;
    const key = `palaceAnchors[${anchor.palaceId}]`;
    const anchorText = `${anchor.title} ${anchor.narrative}`;
    const syllables = countVietnameseSyllables(anchorText);
    totalSyllables += syllables;
    if (syllables < config.minPalaceAnchorSyllables) {
      add(
        key,
        "MINIMUM_SYLLABLES",
        `Palace anchor ${anchor.palaceId} requires at least ${config.minPalaceAnchorSyllables} syllables, found ${syllables}.`,
      );
    }
    checkProse(
      anchorText,
      key,
      (code, note) => add(key, code, note),
      facts,
      quality.discouragedTerms,
      quality.deathTerms,
      quality.certaintyPhrases,
    );
    checkEvidenceKeysValid(anchor.evidenceKeys, key);

    const palace = facts.natal.palaces.find((p) => p.palaceId === anchor.palaceId);
    if (!palace) {
      add(key, "PALACE_FACTS", `Palace ${anchor.palaceId} is not present in chart natal facts.`);
    } else {
      const namedStars = new Set(
        palace.stars
          .map((star) => star.id.toLowerCase())
          .filter((id) => {
            const label = displayFact(id);
            return label !== undefined && wholeWord(anchorText, label);
          }),
      ).size;
      const hasNoMajor = hasTrueNoMajorStarState(palace.stars);
      if (
        namedStars < config.minimumPalaceStars &&
        !(hasNoMajor && wholeWord(anchorText, "không có chính tinh"))
      ) {
        add(
          key,
          "PALACE_ANCHORS",
          `Palace anchor ${anchor.palaceId} requires at least ${config.minimumPalaceStars} actual palace stars or true no-major-star declaration.`,
        );
      }
    }
  }

  // 4. Thematic Dimensions
  for (let i = 0; i < report.thematicDimensions.length; i++) {
    const dim = report.thematicDimensions[i]!;
    const key = `thematicDimensions[${dim.key}]`;
    const dimText = `${dim.title} ${dim.narrative}`;
    const syllables = countVietnameseSyllables(dimText);
    totalSyllables += syllables;
    if (syllables < config.minThematicDimensionSyllables) {
      add(
        key,
        "MINIMUM_SYLLABLES",
        `Thematic dimension ${dim.key} requires at least ${config.minThematicDimensionSyllables} syllables, found ${syllables}.`,
      );
    }
    checkProse(
      dimText,
      key,
      (code, note) => add(key, code, note),
      facts,
      quality.discouragedTerms,
      quality.deathTerms,
      quality.certaintyPhrases,
    );
    checkEvidenceKeysValid(dim.evidenceKeys, key);
    const dimAnchors = [
      ...referencedEvidenceFactIds(dim.evidenceKeys, facts),
    ].filter((id) => {
      const label = displayFact(id);
      return label !== undefined && wholeWord(dimText, label);
    });
    if (dimAnchors.length < config.minimumEvidenceAnchors) {
      add(
        key,
        "EVIDENCE_ANCHORS",
        `Thematic dimension ${dim.key} requires at least ${config.minimumEvidenceAnchors} distinct named chart facts, found ${dimAnchors.length}.`,
      );
    }
  }

  // 5. Decadal Timing
  const decadalText = `${report.decadalTiming.title} ${report.decadalTiming.narrative}`;
  const decadalSyllables = countVietnameseSyllables(decadalText);
  totalSyllables += decadalSyllables;
  if (decadalSyllables < config.minDecadalTimingSyllables) {
    add(
      "decadalTiming",
      "MINIMUM_SYLLABLES",
      `Decadal timing requires at least ${config.minDecadalTimingSyllables} syllables, found ${decadalSyllables}.`,
    );
  }
  checkProse(
    decadalText,
    "decadalTiming",
    (code, note) => add("decadalTiming", code, note),
    facts,
    quality.discouragedTerms,
    quality.deathTerms,
    quality.certaintyPhrases,
  );
  checkEvidenceKeysValid(report.decadalTiming.evidenceKeys, "decadalTiming");

  // Decadal consistency with engine facts
  const engineDecadal = facts.timing.decadal;
  if (engineDecadal.state === "active") {
    if (report.decadalTiming.state !== "active") {
      add(
        "decadalTiming",
        "DECADAL_TIMING_MISMATCH",
        "Engine computed active decadal state, but report timing is not active.",
      );
    } else {
      if (
        report.decadalTiming.ageRange[0] !== engineDecadal.ageRange[0] ||
        report.decadalTiming.ageRange[1] !== engineDecadal.ageRange[1]
      ) {
        add(
          "decadalTiming",
          "DECADAL_TIMING_MISMATCH",
          `Report decadal ageRange [${report.decadalTiming.ageRange.join(",")}] does not match engine [${engineDecadal.ageRange.join(",")}].`,
        );
      }
      if (
        report.decadalTiming.yearRange[0] !== engineDecadal.yearRange[0] ||
        report.decadalTiming.yearRange[1] !== engineDecadal.yearRange[1]
      ) {
        add(
          "decadalTiming",
          "DECADAL_TIMING_MISMATCH",
          `Report decadal yearRange [${report.decadalTiming.yearRange.join(",")}] does not match engine [${engineDecadal.yearRange.join(",")}].`,
        );
      }
      if (report.decadalTiming.palaceId !== engineDecadal.palaceId) {
        add(
          "decadalTiming",
          "DECADAL_TIMING_MISMATCH",
          `Report decadal palaceId ${report.decadalTiming.palaceId} does not match engine ${engineDecadal.palaceId}.`,
        );
      }
    }
  } else {
    if (report.decadalTiming.state !== "not_started") {
      add(
        "decadalTiming",
        "DECADAL_TIMING_MISMATCH",
        "Engine computed not_started decadal state, but report timing is active.",
      );
    } else {
      if (
        report.decadalTiming.firstCycleStartAge !== engineDecadal.firstCycleStartAge ||
        report.decadalTiming.firstCycleStartYear !== engineDecadal.firstCycleStartYear
      ) {
        add(
          "decadalTiming",
          "DECADAL_TIMING_MISMATCH",
          `Report decadal start ${report.decadalTiming.firstCycleStartAge}/${report.decadalTiming.firstCycleStartYear} does not match engine ${engineDecadal.firstCycleStartAge}/${engineDecadal.firstCycleStartYear}.`,
        );
      }
    }
  }

  // 6. Action Items
  for (let i = 0; i < report.actions.length; i++) {
    const action = report.actions[i]!;
    const key = `actions[${i}]`;
    const actionText = `${action.recommendation} ${action.rationale} ${action.avoid}`;
    const syllables = countVietnameseSyllables(actionText);
    totalSyllables += syllables;
    if (syllables < config.minActionItemSyllables) {
      add(
        key,
        "MINIMUM_SYLLABLES",
        `Action item ${i} requires at least ${config.minActionItemSyllables} syllables, found ${syllables}.`,
      );
    }
    checkProse(
      actionText,
      key,
      (code, note) => add(key, code, note),
      facts,
      quality.discouragedTerms,
      quality.deathTerms,
      quality.certaintyPhrases,
    );
    checkEvidenceKeysValid(action.evidenceKeys, key);
  }

  // 7. Total Syllables Check
  if (totalSyllables < config.minTotalSyllables) {
    add(
      "root",
      "MINIMUM_SYLLABLES",
      `Topic deep dive requires at least ${config.minTotalSyllables} total syllables, found ${totalSyllables}.`,
    );
  }

  // 8. Non-overlap check with thematicSynthesis if provided
  if (priorThematicNarrative && priorThematicNarrative.trim().length > 0) {
    const priorNormalized = normalizeComprehensiveReportModelProse(
      priorThematicNarrative,
    ).toLowerCase();
    const deepDiveAllText = [
      overviewText,
      ...report.palaceAnchors.map((p) => p.narrative),
      ...report.thematicDimensions.map((d) => d.narrative),
    ]
      .join(" ")
      .toLowerCase();

    // Check 10-word phrase overlap
    const words = priorNormalized.split(/\s+/u);
    const windowSize = 10;
    let duplicatePhrases = 0;
    for (let i = 0; i <= words.length - windowSize; i += 5) {
      const phrase = words.slice(i, i + windowSize).join(" ");
      if (deepDiveAllText.includes(phrase)) {
        duplicatePhrases++;
      }
    }
    if (duplicatePhrases >= 3) {
      add(
        "thematicDimensions",
        "THEMATIC_OVERLAP",
        "Topic deep dive contains duplicate phrases copied directly from thematicSynthesis.",
      );
    }
  }

  return findings.length === 0 ? { ok: true, findings: [], advisory } : { ok: false, findings, advisory };
}
