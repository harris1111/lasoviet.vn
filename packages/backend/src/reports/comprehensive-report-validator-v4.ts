import {
  ZiweiComprehensiveReportContentV2Schema,
  ZiweiComprehensiveReportContentV3Schema,
  type ZiweiComprehensiveReportContentV2,
  type ZiweiComprehensiveReportContentV3,
} from "@lasoviet/contracts";
import type { ComprehensiveZiweiFactsV4 } from "./comprehensive-ziwei-facts-v4.js";
import { findUncomputedMisfortunePeriods } from "./comprehensive-report-quality-v4.js";

export type ComprehensiveReportV4ValidationResult =
  | { ok: true; errors?: undefined }
  | { ok: false; errors: string[] };

export type ComprehensiveReportContentPolicy = "enforce" | "ignore";

export type ComprehensiveReportValidationOptions = {
  contentPolicy?: ComprehensiveReportContentPolicy;
};

const PROHIBITED_PATTERNS = [
  {
    regex: /(?:^|[^\p{L}\p{N}])(?:AI|A\.I\.)(?:[^\p{L}\p{N}]|$)/u,
    description: "Prohibited AI disclosure reference",
  },
  {
    regex: /(?<![\p{L}\p{N}])(?:trí tuệ nhân tạo|mô hình ngôn ngữ|large language model|LLMs?|trợ lý ảo|ChatGPT|OpenAI|Anthropic|Gemini)(?![\p{L}\p{N}])/iu,
    description: "Prohibited AI disclosure reference",
  },
  {
    regex: /(?:tôi là|như một|dưới góc độ)\s+(?:AI|trí tuệ nhân tạo|mô hình)/iu,
    description: "Prohibited AI persona declaration",
  },
  {
    regex: /(?<![\p{L}\p{N}])(?:miễn trừ trách nhiệm|tuyên bố miễn trừ)(?![\p{L}\p{N}])/iu,
    description: "Prohibited disclaimer phrase",
  },
  {
    regex: /(?<![\p{L}\p{N}])disclaimer(?![\p{L}\p{N}])/iu,
    description: "Prohibited English disclaimer phrase",
  },
  {
    regex: /(?<![\p{L}\p{N}])(?:phương pháp luận|dữ liệu và phương pháp|vector database|hệ thống retrieval|cơ sở dữ liệu|truy xuất thông tin|chỉ dựa trên dữ liệu được cung cấp|dữ liệu đầu vào|prompt)(?![\p{L}\p{N}])/iu,
    description: "Prohibited methodology or process disclosure",
  },
  {
    regex: /(?<![\p{L}\p{N}])(?:độ tin cậy|mức độ tin cậy|confidence(?::|\s+(?:high|moderate|low))|độ chắc chắn|xác suất chính xác)(?![\p{L}\p{N}])/iu,
    description: "Prohibited confidence phrase",
  },
  {
    regex: /(?<![\p{L}\p{N}])(?:giới hạn phương pháp|giới hạn nhận định|hạn chế của phương pháp|hạn chế dữ liệu|limitations?)(?![\p{L}\p{N}])/iu,
    description: "Prohibited limitation phrase",
  },
];

const DEATH_CONTENT_PATTERN =
  /(?<![\p{L}\p{N}])(?:chết|chet|tử\s+vong|tu\s+vong|mất\s+mạng|mat\s+mang|qua\s+đời|qua\s+doi|yểu\s+mệnh|yeu\s+menh|đoản\s+thọ|doan\s+tho|chết\s+non|chet\s+non|tuổi\s+thọ|tuoi\s+tho|sống\s+được\s+bao\s+lâu|song\s+duoc\s+bao\s+lau|bao\s+nhiêu\s+tuổi\s+thì\s+mất|bao\s+nhieu\s+tuoi\s+thi\s+mat|khắc\s+chết|khac\s+chet|sát\s+phu|sat\s+phu|sát\s+thê|sat\s+the)(?![\p{L}\p{N}])/iu;
export const KNOWN_CANONICAL_IDENTIFIERS_VI: Record<string, string> = {
  // Palaces
  "ziwei.palace.life": "cung Mệnh",
  "ziwei.palace.siblings": "cung Huynh Đệ",
  "ziwei.palace.spouse": "cung Phu Thê",
  "ziwei.palace.children": "cung Tử Tức",
  "ziwei.palace.wealth": "cung Tài Bạch",
  "ziwei.palace.health": "cung Tật Ách",
  "ziwei.palace.travel": "cung Thiên Di",
  "ziwei.palace.friends": "cung Nô Bộc",
  "ziwei.palace.career": "cung Quan Lộc",
  "ziwei.palace.property": "cung Điền Trạch",
  "ziwei.palace.fortune": "cung Phúc Đức",
  "ziwei.palace.parents": "cung Phụ Mẫu",

  // Major Stars
  "ziwei.star.ziwei": "sao Tử Vi",
  "ziwei.star.purple-emperor": "sao Tử Vi",
  "ziwei.star.tianji": "sao Thiên Cơ",
  "ziwei.star.taiyang": "sao Thái Dương",
  "ziwei.star.wuqu": "sao Vũ Khúc",
  "ziwei.star.tiantong": "sao Thiên Đồng",
  "ziwei.star.lianzhen": "sao Liêm Trinh",
  "ziwei.star.tianfu": "sao Thiên Phủ",
  "ziwei.star.taiyin": "sao Thái Âm",
  "ziwei.star.tanlang": "sao Tham Lang",
  "ziwei.star.jumen": "sao Cự Môn",
  "ziwei.star.tianxiang": "sao Thiên Tướng",
  "ziwei.star.tianliang": "sao Thiên Lương",
  "ziwei.star.qisha": "sao Thất Sát",
  "ziwei.star.pojun": "sao Phá Quân",

  // Minor Stars & Adjectives
  "ziwei.star.zuofu": "sao Tả Phù",
  "ziwei.star.youbi": "sao Hữu Bật",
  "ziwei.star.wenchang": "sao Văn Xương",
  "ziwei.star.wenqu": "sao Văn Khúc",
  "ziwei.star.lucun": "sao Lộc Tồn",
  "ziwei.star.tianma": "sao Thiên Mã",
  "ziwei.star.qingyang": "sao Kình Dương",
  "ziwei.star.tuoluo": "sao Đà La",
  "ziwei.star.huoxing": "sao Hỏa Tinh",
  "ziwei.star.lingxing": "sao Linh Tinh",
  "ziwei.star.tiankui": "sao Thiên Khôi",
  "ziwei.star.tianyue": "sao Thiên Việt",
  "ziwei.star.dikong": "sao Địa Không",
  "ziwei.star.dijie": "sao Địa Kiếp",
  "ziwei.star.hongluan": "sao Hồng Loan",
  "ziwei.star.tianxi": "sao Thiên Hỷ",
  "ziwei.star.tianyao": "sao Thiên Diêu",
  "ziwei.star.xianchi": "sao Hàm Trì",
  "ziwei.star.jieshen": "sao Giải Thần",
  "ziwei.star.santai": "sao Tam Thai",
  "ziwei.star.bazuo": "sao Bát Tọa",
  "ziwei.star.enguang": "sao Ân Quang",
  "ziwei.star.tiangui": "sao Thiên Quý",
  "ziwei.star.longchi": "sao Long Trì",
  "ziwei.star.fengge": "sao Phượng Các",
  "ziwei.star.tiancai": "sao Thiên Tài",
  "ziwei.star.tianshou": "sao Thiên Thọ",
  "ziwei.star.taifu": "sao Thai Phụ",
  "ziwei.star.fenggao": "sao Phong Cáo",
  "ziwei.star.tianwu": "sao Thiên Vu",
  "ziwei.star.huagai": "sao Hoa Cái",
  "ziwei.star.tianguan": "sao Thiên Quan",
  "ziwei.star.tianfu-adj": "sao Thiên Phúc",
  "ziwei.star.tianchu": "sao Thiên Trù",
  "ziwei.star.tianyue-adj": "sao Thiên Nguyệt",
  "ziwei.star.tiande": "sao Thiên Đức",
  "ziwei.star.yuede": "sao Nguyệt Đức",
  "ziwei.star.tiankong": "sao Thiên Không",
  "ziwei.star.xunkong": "sao Tuần Không",
  "ziwei.star.jielu": "sao Triệt Lộ",
  "ziwei.star.kongwang": "sao Không Vong",
  "ziwei.star.longde": "sao Long Đức",
  "ziwei.star.jiekong": "sao Tiệt Không",
  "ziwei.star.jiesha": "sao Kiếp Sát",
  "ziwei.star.dahao": "sao Đại Hao",
  "ziwei.star.guchen": "sao Cô Thần",
  "ziwei.star.guasu": "sao Quả Tú",
  "ziwei.star.feilian": "sao Phi Liêm",
  "ziwei.star.posui": "sao Phá Toái",
  "ziwei.star.tianxing": "sao Thiên Hình",
  "ziwei.star.yinsha": "sao Âm Sát",
  "ziwei.star.tianku": "sao Thiên Khốc",
  "ziwei.star.tianxu": "sao Thiên Hư",
  "ziwei.star.tianshi": "sao Thiên Sứ",
  "ziwei.star.tianshang": "sao Thiên Thương",
  "ziwei.star.nianjie": "sao Niên Giải",
  "ziwei.star.boshi": "sao Bác Sĩ",
  "ziwei.star.lishi": "sao Lực Sĩ",
  "ziwei.star.qinglong": "sao Thanh Long",
  "ziwei.star.xiaohao": "sao Tiểu Hao",
  "ziwei.star.jiangjun": "sao Tướng Quân",
  "ziwei.star.zhoushu": "sao Tấu Thư",
  "ziwei.star.feilian-dec": "sao Phi Liêm",
  "ziwei.star.xishen": "sao Hỷ Thần",
  "ziwei.star.bingfu": "sao Bệnh Phù",
  "ziwei.star.dahao-dec": "sao Đại Hao",
  "ziwei.star.fubing": "sao Phục Binh",
  "ziwei.star.guanfu": "sao Quan Phủ",
  "ziwei.star.jiangxing": "sao Tướng Tinh",
  "ziwei.star.panan": "sao Phan An",
  "ziwei.star.suiyi": "sao Tuế Dịch",
  "ziwei.star.xiishen": "sao Tức Thần",
  "ziwei.star.huagai-dec": "sao Hoa Cái",
  "ziwei.star.jiesha-dec": "sao Kiếp Sát",
  "ziwei.star.zhaisha": "sao Tai Sát",
  "ziwei.star.tiansha": "sao Thiên Sát",
  "ziwei.star.zhibei": "sao Chỉ Bối",
  "ziwei.star.xianchi-dec": "sao Hàm Trì",
  "ziwei.star.yuesha": "sao Nguyệt Sát",
  "ziwei.star.wangshen": "sao Vong Thần",
  "ziwei.star.suijian": "sao Thái Tuế",
  "ziwei.star.huiqi": "sao Hối Khí",
  "ziwei.star.sangmen": "sao Tang Môn",
  "ziwei.star.guansuo": "sao Quán Sách",
  "ziwei.star.gwanfu": "sao Quan Phù",
  "ziwei.star.xiaohao-sq": "sao Tiểu Hao",
  "ziwei.star.longde-dec": "sao Long Đức",
  "ziwei.star.baihu": "sao Bạch Hổ",
  "ziwei.star.tiande-dec": "sao Thiên Đức",
  "ziwei.star.diaoke": "sao Điếu Khách",
  "ziwei.star.bingfu-sq": "sao Bệnh Phù",

  // Transformations
  "ziwei.transformation.prosperity": "Hóa Lộc",
  "ziwei.transformation.power": "Hóa Quyền",
  "ziwei.transformation.fame": "Hóa Khoa",
  "ziwei.transformation.obstacle": "Hóa Kỵ",
  "ziwei.trans.hua_lu": "Hóa Lộc",
  "ziwei.trans.hua_quyen": "Hóa Quyền",
  "ziwei.trans.hua_khoa": "Hóa Khoa",
  "ziwei.trans.hua_ky": "Hóa Kỵ",
  "ziwei.brightness.bright": "Sáng",
  "ziwei.relation.opposite": "xung chiếu",

  // Brightness
  "ziwei.brightness.exalted": "Miếu",
  "ziwei.brightness.prosperous": "Vượng",
  "ziwei.brightness.favorable": "Đắc",
  "ziwei.brightness.neutral": "Bình",
  "ziwei.brightness.unfavorable": "Hãm",
  "ziwei.brightness.weak": "Nhược",

  // Relations
  "ziwei.relation.triad": "tam hợp",
  "ziwei.relation.opposition": "xung chiếu",
  "ziwei.relation.flanking": "giáp cung",

  // Branches
  "ziwei.branch.rat": "Tý",
  "ziwei.branch.ox": "Sửu",
  "ziwei.branch.tiger": "Dần",
  "ziwei.branch.rabbit": "Mão",
  "ziwei.branch.dragon": "Thìn",
  "ziwei.branch.snake": "Tỵ",
  "ziwei.branch.horse": "Ngọ",
  "ziwei.branch.goat": "Mùi",
  "ziwei.branch.monkey": "Thân",
  "ziwei.branch.rooster": "Dậu",
  "ziwei.branch.dog": "Tuất",
  "ziwei.branch.pig": "Hợi",

  // Stems
  "ziwei.stem.jia": "Giáp",
  "ziwei.stem.yi": "Ất",
  "ziwei.stem.bing": "Bính",
  "ziwei.stem.ding": "Đinh",
  "ziwei.stem.wu": "Mậu",
  "ziwei.stem.ji": "Kỷ",
  "ziwei.stem.geng": "Canh",
  "ziwei.stem.xin": "Tân",
  "ziwei.stem.ren": "Nhâm",
  "ziwei.stem.gui": "Quý",

  // Cycles
  "ziwei.cycle.born": "Trường Sinh",
  "ziwei.cycle.infancy": "Mộc Dục",
  "ziwei.cycle.adolescence": "Quan Đới",
  "ziwei.cycle.adulthood": "Lâm Quan",
  "ziwei.cycle.prime": "Đế Vượng",
  "ziwei.cycle.weak": "Suy",
  "ziwei.cycle.sick": "Bệnh",
  "ziwei.cycle.dead": "Tử",
  "ziwei.cycle.buried": "Mộ",
  "ziwei.cycle.dissipated": "Tuyệt",
  "ziwei.cycle.embryo": "Thai",
  "ziwei.cycle.molding": "Dưỡng",
};

export function convertCanonicalIdentifierToVietnamese(id: string): string {
  const normalized = id.toLowerCase();
  if (KNOWN_CANONICAL_IDENTIFIERS_VI[normalized]) {
    return KNOWN_CANONICAL_IDENTIFIERS_VI[normalized]!;
  }
  return "yếu tố Tử Vi";
}

const CANONICAL_IDENTIFIER_REGEX =
  /(?<![\p{L}\p{N}])ziwei\.[a-z0-9_.-]*[a-z0-9_](?![\p{L}\p{N}])/giu;

export function sanitizeCanonicalIdentifiersInText(text: string): string {
  if (typeof text !== "string" || !text.includes("ziwei.")) {
    return text;
  }
  return text.replace(CANONICAL_IDENTIFIER_REGEX, (matched) =>
    convertCanonicalIdentifierToVietnamese(matched),
  );
}

export function sanitizeReportCustomerVisibleIdentifiers(
  report: ZiweiComprehensiveReportContentV2,
): ZiweiComprehensiveReportContentV2 {
  report.overview.narrative = sanitizeCanonicalIdentifiersInText(report.overview.narrative);
  report.coreAxis.narrative = sanitizeCanonicalIdentifiersInText(report.coreAxis.narrative);
  for (const k of report.keyConfigurations) {
    k.title = sanitizeCanonicalIdentifiersInText(k.title);
    k.narrative = sanitizeCanonicalIdentifiersInText(k.narrative);
  }
  for (const p of report.palaceReadings) {
    p.narrative = sanitizeCanonicalIdentifiersInText(p.narrative);
  }
  for (const t of report.thematicSynthesis) {
    t.narrative = sanitizeCanonicalIdentifiersInText(t.narrative);
  }
  report.strengthsAndTensions.narrative = sanitizeCanonicalIdentifiersInText(
    report.strengthsAndTensions.narrative,
  );
  report.currentDecadal.title = sanitizeCanonicalIdentifiersInText(report.currentDecadal.title);
  report.currentDecadal.narrative = sanitizeCanonicalIdentifiersInText(
    report.currentDecadal.narrative,
  );
  report.annualSnapshot.title = sanitizeCanonicalIdentifiersInText(report.annualSnapshot.title);
  report.annualSnapshot.narrative = sanitizeCanonicalIdentifiersInText(
    report.annualSnapshot.narrative,
  );
  for (const action of report.practicalDirection) {
    action.recommendation = sanitizeCanonicalIdentifiersInText(action.recommendation);
    action.rationale = sanitizeCanonicalIdentifiersInText(action.rationale);
    action.avoid = sanitizeCanonicalIdentifiersInText(action.avoid);
  }
  return report;
}

function sanitizeUnknownCandidate(candidate: unknown): void {
  if (!candidate || typeof candidate !== "object") return;
  const obj = candidate as Record<string, any>;
  if (obj.overview && typeof obj.overview.narrative === "string") {
    obj.overview.narrative = sanitizeCanonicalIdentifiersInText(obj.overview.narrative);
  }
  if (obj.coreAxis && typeof obj.coreAxis.narrative === "string") {
    obj.coreAxis.narrative = sanitizeCanonicalIdentifiersInText(obj.coreAxis.narrative);
  }
  if (Array.isArray(obj.keyConfigurations)) {
    for (const k of obj.keyConfigurations) {
      if (k && typeof k === "object") {
        if (typeof k.title === "string") k.title = sanitizeCanonicalIdentifiersInText(k.title);
        if (typeof k.narrative === "string") k.narrative = sanitizeCanonicalIdentifiersInText(k.narrative);
      }
    }
  }
  if (Array.isArray(obj.palaceReadings)) {
    for (const p of obj.palaceReadings) {
      if (p && typeof p === "object" && typeof p.narrative === "string") {
        p.narrative = sanitizeCanonicalIdentifiersInText(p.narrative);
      }
    }
  }
  if (Array.isArray(obj.thematicSynthesis)) {
    for (const t of obj.thematicSynthesis) {
      if (t && typeof t === "object" && typeof t.narrative === "string") {
        t.narrative = sanitizeCanonicalIdentifiersInText(t.narrative);
      }
    }
  }
  if (obj.strengthsAndTensions && typeof obj.strengthsAndTensions.narrative === "string") {
    obj.strengthsAndTensions.narrative = sanitizeCanonicalIdentifiersInText(obj.strengthsAndTensions.narrative);
  }
  if (obj.currentDecadal && typeof obj.currentDecadal === "object") {
    if (typeof obj.currentDecadal.title === "string") obj.currentDecadal.title = sanitizeCanonicalIdentifiersInText(obj.currentDecadal.title);
    if (typeof obj.currentDecadal.narrative === "string") obj.currentDecadal.narrative = sanitizeCanonicalIdentifiersInText(obj.currentDecadal.narrative);
  }
  if (obj.annualSnapshot && typeof obj.annualSnapshot === "object") {
    if (typeof obj.annualSnapshot.title === "string") obj.annualSnapshot.title = sanitizeCanonicalIdentifiersInText(obj.annualSnapshot.title);
    if (typeof obj.annualSnapshot.narrative === "string") obj.annualSnapshot.narrative = sanitizeCanonicalIdentifiersInText(obj.annualSnapshot.narrative);
  }
  if (obj.birthTimeSensitivity && typeof obj.birthTimeSensitivity === "object") {
    if (typeof obj.birthTimeSensitivity.title === "string") {
      obj.birthTimeSensitivity.title = sanitizeCanonicalIdentifiersInText(obj.birthTimeSensitivity.title);
    }
    for (const key of ["stableFactors", "sensitiveFactors"] as const) {
      const factor = obj.birthTimeSensitivity[key];
      if (factor && typeof factor === "object") {
        if (typeof factor.title === "string") factor.title = sanitizeCanonicalIdentifiersInText(factor.title);
        if (typeof factor.narrative === "string") factor.narrative = sanitizeCanonicalIdentifiersInText(factor.narrative);
      }
    }
  }
  if (Array.isArray(obj.practicalDirection)) {
    for (const a of obj.practicalDirection) {
      if (a && typeof a === "object") {
        if (typeof a.recommendation === "string") a.recommendation = sanitizeCanonicalIdentifiersInText(a.recommendation);
        if (typeof a.rationale === "string") a.rationale = sanitizeCanonicalIdentifiersInText(a.rationale);
        if (typeof a.avoid === "string") a.avoid = sanitizeCanonicalIdentifiersInText(a.avoid);
      }
    }
  }
}

const TECHNICAL_IDENTIFIER_PATTERN =
  /(?<![\p{L}\p{N}])ziwei\.[a-z0-9_.-]*[a-z0-9_](?![\p{L}\p{N}])/giu;

const NO_MAJOR_STAR_PATTERN =
  /(?<![\p{L}\p{N}])(?:vô chính diệu|không có (?:sao )?chính tinh)(?![\p{L}\p{N}])/iu;

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

type CustomerTextBlock = { section: string; text: string };

function validateCustomerTextBlocks(
  blocks: readonly CustomerTextBlock[],
  errors: string[],
  contentPolicy: ComprehensiveReportContentPolicy,
  facts?: ComprehensiveZiweiFactsV4,
): void {
  for (const block of blocks) {
    if (contentPolicy === "enforce") {
      for (const pattern of PROHIBITED_PATTERNS) {
        if (pattern.regex.test(block.text)) {
          errors.push(`${pattern.description} found in ${block.section}: "${block.text.slice(0, 80)}"`);
        }
      }
      if (DEATH_CONTENT_PATTERN.test(block.text)) {
        errors.push(`Prohibited death or lifespan content found in ${block.section}: "${block.text.slice(0, 80)}"`);
      }
      if (facts) {
        const uncomputedPeriods = findUncomputedMisfortunePeriods(block.text, facts);
        if (uncomputedPeriods.length > 0) {
          errors.push(
            `Named misfortune period cites uncomputed period in ${block.section}: "${uncomputedPeriods.join(", ")}"`,
          );
        }
      }
      if (HAN_IDEOGRAPH_PATTERN.test(block.text)) {
        errors.push(`Han ideograph detected in ${block.section}`);
      }
      const enBrightnessMatches = block.text.match(ENGLISH_BRIGHTNESS_PATTERN);
      if (enBrightnessMatches) {
        const uniqueMatches = [...new Set(enBrightnessMatches.map((m) => m.toLowerCase()))];
        errors.push(`English brightness descriptor detected in ${block.section}: ${uniqueMatches.join(", ")}`);
      }
    }
    const techMatches = block.text.match(TECHNICAL_IDENTIFIER_PATTERN);
    if (techMatches) {
      errors.push(`Raw technical identifier leaked in ${block.section}: ${techMatches.join(", ")}`);
    }
    if (REPLACEMENT_CHARACTER_PATTERN.test(block.text)) {
      errors.push(`Unicode replacement character detected in ${block.section}`);
    }
    if (MOJIBAKE_PATTERN.test(block.text) || MOJIBAKE_PATTERN.test(block.text.normalize("NFC"))) {
      errors.push(`Encoding corruption detected in ${block.section}`);
    }
  }
}

export function validateComprehensiveZiweiReportV4(
  candidate: unknown,
  facts: ComprehensiveZiweiFactsV4,
  options: ComprehensiveReportValidationOptions = {},
): ComprehensiveReportV4ValidationResult {
  const contentPolicy = options.contentPolicy ?? "enforce";
  if (candidate && typeof candidate === "object" && "birthTimeSensitivity" in candidate) {
    return {
      ok: false,
      errors: ["V4 customer report must NOT contain birthTimeSensitivity"],
    };
  }

  sanitizeUnknownCandidate(candidate);

  const parsed = ZiweiComprehensiveReportContentV2Schema.safeParse(candidate);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((i) => `[${i.path.join(".")}]: ${i.message}`),
    };
  }

  const report: ZiweiComprehensiveReportContentV2 = parsed.data;
  sanitizeReportCustomerVisibleIdentifiers(report);
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
  const modelOwnedTitleBlocks: CustomerTextBlock[] = [
    ...report.keyConfigurations.map((k, i) => ({ section: `keyConfigurations[${i}].title`, text: k.title })),
    { section: "currentDecadal.title", text: report.currentDecadal.title },
    { section: "annualSnapshot.title", text: report.annualSnapshot.title },
  ];

  const narrativeBlocks: CustomerTextBlock[] = [
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

  const customerTextBlocks: CustomerTextBlock[] = [...modelOwnedTitleBlocks, ...narrativeBlocks];

  // 4. Prohibited phrases & raw technical identifiers check across customer-visible text
  validateCustomerTextBlocks(customerTextBlocks, errors, contentPolicy, facts);

  // 5. Duplicate and near-duplicate paragraph check
  if (contentPolicy === "enforce") {
    for (let i = 0; i < narrativeBlocks.length; i++) {
      for (let j = i + 1; j < narrativeBlocks.length; j++) {
        const blockA = narrativeBlocks[i]!;
        const blockB = narrativeBlocks[j]!;
        const normA = normalizeText(blockA.text);
        const normB = normalizeText(blockB.text);
        if (normA.length > 25 && normB.length > 25) {
          if (normA === normB) {
            errors.push(`Duplicate narrative paragraph between ${blockA.section} and ${blockB.section}`);
          } else if (normA.length > 40 && normB.length > 40) {
            const isPracticalA = blockA.section.startsWith("practicalDirection");
            const isPracticalB = blockB.section.startsWith("practicalDirection");
            if (isPracticalA || isPracticalB) {
              continue;
            }

            const isPalaceA = blockA.section.startsWith("palaceReadings[");
            const isPalaceB = blockB.section.startsWith("palaceReadings[");
            if (isPalaceA && isPalaceB && blockA.section !== blockB.section) {
              const hasNoMajorStarA = NO_MAJOR_STAR_PATTERN.test(blockA.text);
              const hasNoMajorStarB = NO_MAJOR_STAR_PATTERN.test(blockB.text);
              if (hasNoMajorStarA && hasNoMajorStarB) {
                continue;
              }
            }

            if (wordSimilarity(normA, normB) >= 0.8) {
              errors.push(`Near-duplicate narrative paragraph between ${blockA.section} and ${blockB.section}`);
            }
          }
        }
      }
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true };
}

export function validateComprehensiveZiweiReportV4_1(
  candidate: unknown,
  facts: ComprehensiveZiweiFactsV4,
  options: ComprehensiveReportValidationOptions = {},
): ComprehensiveReportV4ValidationResult {
  sanitizeUnknownCandidate(candidate);
  const parsed = ZiweiComprehensiveReportContentV3Schema.safeParse(candidate);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((issue) => `[${issue.path.join(".")}]: ${issue.message}`),
    };
  }

  const report: ZiweiComprehensiveReportContentV3 = parsed.data;
  const { birthTimeSensitivity, ...v4Report } = report;
  const baseResult = validateComprehensiveZiweiReportV4(v4Report, facts, options);
  if (!baseResult.ok) return baseResult;

  const allowedSensitivityKeys = new Set(
    facts.evidenceKeys.filter((key) =>
      key.startsWith("sensitivity.stable.") || key.startsWith("sensitivity.sensitive."),
    ),
  );
  const sensitivityKeys = [
    ...birthTimeSensitivity.stableFactors.evidenceKeys,
    ...birthTimeSensitivity.sensitiveFactors.evidenceKeys,
  ];
  const errors: string[] = [];
  if (birthTimeSensitivity.stableFactors.evidenceKeys.length === 0 ||
      birthTimeSensitivity.sensitiveFactors.evidenceKeys.length === 0) {
    errors.push("birthTimeSensitivity requires evidence for both factor narratives");
  }
  for (const key of sensitivityKeys) {
    if (!allowedSensitivityKeys.has(key)) {
      errors.push(`Unsupported sensitivity evidence key: ${key}`);
    }
  }
  const text: CustomerTextBlock[] = [
    { section: "birthTimeSensitivity.title", text: birthTimeSensitivity.title },
    { section: "birthTimeSensitivity.stableFactors.title", text: birthTimeSensitivity.stableFactors.title },
    { section: "birthTimeSensitivity.stableFactors.narrative", text: birthTimeSensitivity.stableFactors.narrative },
    { section: "birthTimeSensitivity.sensitiveFactors.title", text: birthTimeSensitivity.sensitiveFactors.title },
    { section: "birthTimeSensitivity.sensitiveFactors.narrative", text: birthTimeSensitivity.sensitiveFactors.narrative },
  ];
  validateCustomerTextBlocks(text, errors, options.contentPolicy ?? "enforce", facts);
  const rawText = text.map((block) => block.text).join(" ");
  if (
    /\b\d{1,2}:\d{2}\b/u.test(rawText) ||
    /\b\d{4}-\d{2}-\d{2}\b/u.test(rawText) ||
    /\b\d{1,2}\s*giờ(?:\s*\d{1,2})?(?:\s*phút)?\b/iu.test(rawText) ||
    /\b(?:ngày\s*)?\d{1,2}\s+tháng\s+\d{1,2}(?:\s+năm\s+\d{4})?\b/iu.test(rawText)
  ) {
    errors.push("birthTimeSensitivity must not expose raw birth date or time");
  }
  if (
    /\b(?:selected|previous|next)\s+frame\b|\b(?:selectedFrame|previousFrame|nextFrame|frameId|vendorTimeIndex|civilDateOffset|sourceSnapshot|providerId|modelId)\b|\bframe\s*(?:index|position)\b|\b(?:chỉ\s*số|vị\s*trí)\s+(?:khung|frame)\b/iu.test(rawText)
  ) {
    errors.push("birthTimeSensitivity must not expose raw frame or implementation metadata");
  }
  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}
