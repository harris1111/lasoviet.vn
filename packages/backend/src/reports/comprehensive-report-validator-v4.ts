import {
  ZiweiComprehensiveReportContentV2Schema,
  type ZiweiComprehensiveReportContentV2,
} from "@lasoviet/contracts";
import type { ComprehensiveZiweiFactsV4 } from "./comprehensive-ziwei-facts-v4.js";

export type ComprehensiveReportV4ValidationResult =
  | { ok: true; errors?: undefined }
  | { ok: false; errors: string[] };

const PROHIBITED_PATTERNS = [
  {
    regex: /(?:^|[^\p{L}\p{N}])(?:AI|A\.I\.)(?:[^\p{L}\p{N}]|$)/u,
    description: "Prohibited AI disclosure reference",
  },
  {
    regex: /(?:\btrí tuệ nhân tạo\b|\bmô hình ngôn ngữ\b|\blarge language model\b|\bLLMs?\b|\btrợ lý ảo\b|\bChatGPT\b|\bOpenAI\b|\bAnthropic\b|\bGemini\b)/iu,
    description: "Prohibited AI disclosure reference",
  },
  {
    regex: /(?:tôi là|như một|dưới góc độ)\s+(?:AI|trí tuệ nhân tạo|mô hình)/iu,
    description: "Prohibited AI persona declaration",
  },
  {
    regex: /\b(?:miễn trừ trách nhiệm|tuyên bố miễn trừ|không thay thế tư vấn|tư vấn y tế|chuyên gia y tế|bác sĩ|chẩn đoán y khoa|tư vấn pháp lý|tư vấn tài chính chuyên nghiệp|lời khuyên pháp lý|lời khuyên y tế)\b/i,
    description: "Prohibited disclaimer phrase",
  },
  {
    regex: /\b(?:disclaimer|medical advice|legal advice|financial advice)\b/i,
    description: "Prohibited English disclaimer phrase",
  },
  {
    regex: /\b(?:phương pháp luận|dữ liệu và phương pháp|vector database|hệ thống retrieval|cơ sở dữ liệu|truy xuất thông tin|chỉ dựa trên dữ liệu được cung cấp|dữ liệu đầu vào|prompt)\b/i,
    description: "Prohibited methodology or process disclosure",
  },
  {
    regex: /\b(?:độ tin cậy|mức độ tin cậy|confidence(?::|\s+(?:high|moderate|low))|độ chắc chắn|xác suất chính xác)\b/i,
    description: "Prohibited confidence phrase",
  },
  {
    regex: /\b(?:giới hạn phương pháp|giới hạn nhận định|hạn chế của phương pháp|hạn chế dữ liệu|limitations?)\b/i,
    description: "Prohibited limitation phrase",
  },
  {
    regex: /(?:chắc chắn|chac chan).*(?:tai nạn|tai nan|tử vong|tu vong|phá sản|pha san|phản bội|phan boi)/i,
    description: "Prohibited fatalistic prediction",
  },
];

const TECHNICAL_IDENTIFIER_PATTERN =
  /\bziwei\.(?:palace|star|transformation|brightness|relation|branch|stem)\.[a-z0-9-]+\b/g;

const HAN_IDEOGRAPH_PATTERN = /(?:[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]|\p{Script=Han})/u;

const ENGLISH_BRIGHTNESS_PATTERN =
  /(?<![\p{L}\p{N}])(exalted|prosperous|favorable|neutral|unfavorable|weak)(?![\p{L}\p{N}])/giu;

const REPLACEMENT_CHARACTER_PATTERN = /\uFFFD/u;

const WIN1252_TRAIL = "[\\u0080-\\u00BF\\u2010-\\u203A\\u20AC\\u0152\\u0153\\u0160\\u0161\\u017D\\u017E\\u0178\\u0192\\u02C6\\u02DC\\u2122]";
const MOJIBAKE_PATTERN = new RegExp(
  `áº|á»${WIN1252_TRAIL}|Ã${WIN1252_TRAIL}|Ä[\\u0080-\\u009F\\u00A8\\u00A9\\u2018\\u2019\\u0192\\u201A]|Æ[\\u00A0\\u00A1\\u00AF\\u00B0]|Å[\\u00A8\\u00A9]|â[€\\u0080]${WIN1252_TRAIL}|â[€™“”–—…]|ï»¿`,
  "u",
);

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFC")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function wordSimilarity(textA: string, textB: string): number {
  const wordsA = new Set(textA.split(" ").filter((w) => w.length > 2));
  const wordsB = new Set(textB.split(" ").filter((w) => w.length > 2));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let intersection = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) intersection++;
  }
  const union = wordsA.size + wordsB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

export function validateComprehensiveZiweiReportV4(
  candidate: unknown,
  facts: ComprehensiveZiweiFactsV4,
): ComprehensiveReportV4ValidationResult {
  if (candidate && typeof candidate === "object" && "birthTimeSensitivity" in candidate) {
    return {
      ok: false,
      errors: ["V4 customer report must NOT contain birthTimeSensitivity"],
    };
  }

  const parsed = ZiweiComprehensiveReportContentV2Schema.safeParse(candidate);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((i) => `[${i.path.join(".")}]: ${i.message}`),
    };
  }

  const report: ZiweiComprehensiveReportContentV2 = parsed.data;
  const errors: string[] = [];

  // 1. Evidence keys must exist in frozen comprehensive facts V4
  const allowedKeys = new Set(facts.evidenceKeys);
  const allEvidenceKeys = [
    ...report.overview.evidenceKeys,
    ...report.coreAxis.evidenceKeys,
    ...report.keyConfigurations.flatMap((k) => k.evidenceKeys),
    ...report.palaceReadings.flatMap((p) => p.evidenceKeys),
    ...report.thematicSynthesis.flatMap((t) => t.evidenceKeys),
    ...report.strengthsAndTensions.evidenceKeys,
    ...report.currentDecadal.evidenceKeys,
    ...report.annualSnapshot.evidenceKeys,
    ...report.practicalDirection.flatMap((a) => a.evidenceKeys),
  ];

  for (const key of allEvidenceKeys) {
    if (!allowedKeys.has(key)) {
      errors.push(`Unknown or unsupported evidence key: ${key}`);
    }
  }

  // 2. Frozen timing validation
  if (report.currentDecadal.state !== facts.timing.decadal.state) {
    errors.push(
      `currentDecadal state mismatch: expected ${facts.timing.decadal.state}, got ${report.currentDecadal.state}`,
    );
  } else if (report.currentDecadal.state === "active" && facts.timing.decadal.state === "active") {
    if (report.currentDecadal.index !== facts.timing.decadal.index) {
      errors.push(
        `currentDecadal index mismatch: expected ${facts.timing.decadal.index}, got ${report.currentDecadal.index}`,
      );
    }
    if (
      report.currentDecadal.ageRange[0] !== facts.timing.decadal.ageRange[0] ||
      report.currentDecadal.ageRange[1] !== facts.timing.decadal.ageRange[1]
    ) {
      errors.push(
        `currentDecadal ageRange mismatch: expected [${facts.timing.decadal.ageRange}], got [${report.currentDecadal.ageRange}]`,
      );
    }
    if (
      report.currentDecadal.yearRange[0] !== facts.timing.decadal.yearRange[0] ||
      report.currentDecadal.yearRange[1] !== facts.timing.decadal.yearRange[1]
    ) {
      errors.push(
        `currentDecadal yearRange mismatch: expected [${facts.timing.decadal.yearRange}], got [${report.currentDecadal.yearRange}]`,
      );
    }
  } else if (
    report.currentDecadal.state === "not_started" &&
    facts.timing.decadal.state === "not_started"
  ) {
    if (report.currentDecadal.firstCycleStartAge !== facts.timing.decadal.firstCycleStartAge) {
      errors.push(
        `currentDecadal firstCycleStartAge mismatch: expected ${facts.timing.decadal.firstCycleStartAge}, got ${report.currentDecadal.firstCycleStartAge}`,
      );
    }
    if (report.currentDecadal.firstCycleStartYear !== facts.timing.decadal.firstCycleStartYear) {
      errors.push(
        `currentDecadal firstCycleStartYear mismatch: expected ${facts.timing.decadal.firstCycleStartYear}, got ${report.currentDecadal.firstCycleStartYear}`,
      );
    }
  }

  if (report.annualSnapshot.targetYear !== facts.timing.annual.targetYear) {
    errors.push(
      `annualSnapshot targetYear mismatch: expected ${facts.timing.annual.targetYear}, got ${report.annualSnapshot.targetYear}`,
    );
  }
  if (report.annualSnapshot.asOfDate !== facts.sourceSnapshot.asOfDate) {
    errors.push(
      `annualSnapshot asOfDate mismatch: expected ${facts.sourceSnapshot.asOfDate}, got ${report.annualSnapshot.asOfDate}`,
    );
  }

  // 3. Collect customer-visible model-owned text blocks
  const modelOwnedTitleBlocks: Array<{ section: string; text: string }> = [
    ...report.keyConfigurations.map((k, i) => ({ section: `keyConfigurations[${i}].title`, text: k.title })),
    { section: "currentDecadal.title", text: report.currentDecadal.title },
    { section: "annualSnapshot.title", text: report.annualSnapshot.title },
  ];

  const narrativeBlocks: Array<{ section: string; text: string }> = [
    { section: "overview", text: report.overview.narrative },
    { section: "coreAxis", text: report.coreAxis.narrative },
    ...report.keyConfigurations.map((k, i) => ({ section: `keyConfigurations[${i}]`, text: k.narrative })),
    ...report.palaceReadings.map((p) => ({ section: `palaceReadings[${p.palaceId}]`, text: p.narrative })),
    ...report.thematicSynthesis.map((t) => ({ section: `thematicSynthesis[${t.id}]`, text: t.narrative })),
    { section: "strengthsAndTensions", text: report.strengthsAndTensions.narrative },
    { section: "currentDecadal.narrative", text: report.currentDecadal.narrative },
    { section: "annualSnapshot.narrative", text: report.annualSnapshot.narrative },
    ...report.practicalDirection.flatMap((action, i) => [
      { section: `practicalDirection[${i}].recommendation`, text: action.recommendation },
      { section: `practicalDirection[${i}].rationale`, text: action.rationale },
      { section: `practicalDirection[${i}].avoid`, text: action.avoid },
    ]),
  ];

  const customerTextBlocks: Array<{ section: string; text: string }> = [...modelOwnedTitleBlocks, ...narrativeBlocks];

  // 4. Prohibited phrases & raw technical identifiers check across customer-visible text
  for (const block of customerTextBlocks) {
    for (const pattern of PROHIBITED_PATTERNS) {
      if (pattern.regex.test(block.text)) {
        errors.push(`${pattern.description} found in ${block.section}: "${block.text.slice(0, 80)}"`);
      }
    }
    const techMatches = block.text.match(TECHNICAL_IDENTIFIER_PATTERN);
    if (techMatches) {
      errors.push(`Raw technical identifier leaked in ${block.section}: ${techMatches.join(", ")}`);
    }

    if (HAN_IDEOGRAPH_PATTERN.test(block.text)) {
      errors.push(`Han ideograph detected in ${block.section}`);
    }

    const enBrightnessMatches = block.text.match(ENGLISH_BRIGHTNESS_PATTERN);
    if (enBrightnessMatches) {
      const uniqueMatches = [...new Set(enBrightnessMatches.map((m) => m.toLowerCase()))];
      errors.push(
        `English brightness descriptor detected in ${block.section}: ${uniqueMatches.join(", ")}`,
      );
    }

    if (REPLACEMENT_CHARACTER_PATTERN.test(block.text)) {
      errors.push(`Unicode replacement character detected in ${block.section}`);
    }

    if (MOJIBAKE_PATTERN.test(block.text) || MOJIBAKE_PATTERN.test(block.text.normalize("NFC"))) {
      errors.push(`Encoding corruption detected in ${block.section}`);
    }
  }

  // 5. Duplicate and near-duplicate paragraph check
  for (let i = 0; i < narrativeBlocks.length; i++) {
    for (let j = i + 1; j < narrativeBlocks.length; j++) {
      const normA = normalizeText(narrativeBlocks[i]!.text);
      const normB = normalizeText(narrativeBlocks[j]!.text);
      if (normA.length > 25 && normB.length > 25) {
        if (normA === normB) {
          errors.push(`Duplicate narrative paragraph between ${narrativeBlocks[i]!.section} and ${narrativeBlocks[j]!.section}`);
        } else if (normA.length > 40 && normB.length > 40 && wordSimilarity(normA, normB) >= 0.8) {
          errors.push(`Near-duplicate narrative paragraph between ${narrativeBlocks[i]!.section} and ${narrativeBlocks[j]!.section}`);
        }
      }
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true };
}
