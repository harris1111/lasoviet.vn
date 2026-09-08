import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const KNOWLEDGE_VERSION = "ziwei.comprehensive.knowledge.v3";
const MAX_CHUNK_LENGTH = 1_200;
const BUILDER_PATH = "scripts/build-ziwei-knowledge-v3.mjs";
const REGISTRY_PATH = "content/knowledge/ziwei/comprehensive-report-sources.v3.json";
const MANIFEST_PATH = "content/knowledge/vi/ziwei/comprehensive-report.v3.json";
const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const SECTION_IDS = [
  "personal_summary",
  "data_and_method",
  "primary_evidence",
  "strengths_and_resources",
  "tensions_and_blind_spots",
  "identity_analysis",
  "cycles_and_timing",
  "within_control",
  "reflection_questions",
  "action_summary",
  "limitations_and_disclaimer",
];

const PALACES = [
  {
    key: "life",
    id: "ziwei.palace.life",
    aliases: ["命宮", "命宫", "cung mệnh", "mệnh cung", "life palace", "soulpalace"],
  },
  {
    key: "siblings",
    id: "ziwei.palace.siblings",
    aliases: ["兄弟", "huynh đệ", "siblings palace", "siblingspalace"],
  },
  {
    key: "spouse",
    id: "ziwei.palace.spouse",
    aliases: ["夫妻", "phu thê", "spouse palace", "spousepalace", "relationship palace"],
  },
  {
    key: "children",
    id: "ziwei.palace.children",
    aliases: ["子女", "tử nữ", "children palace", "childrenpalace"],
  },
  {
    key: "wealth",
    id: "ziwei.palace.wealth",
    aliases: ["財帛", "财帛", "tài bạch", "wealth palace", "wealthpalace"],
  },
  {
    key: "health",
    id: "ziwei.palace.health",
    aliases: ["疾厄", "tật ách", "health palace", "healthpalace", "illness palace"],
  },
  {
    key: "travel",
    id: "ziwei.palace.travel",
    aliases: ["遷移", "迁移", "thiên di", "travel palace", "surfacepalace"],
  },
  {
    key: "friends",
    id: "ziwei.palace.friends",
    aliases: ["僕役", "仆役", "交友", "nô bộc", "friends palace", "friendspalace"],
  },
  {
    key: "career",
    id: "ziwei.palace.career",
    aliases: ["官祿", "官禄", "quan lộc", "career palace", "careerpalace"],
  },
  {
    key: "property",
    id: "ziwei.palace.property",
    aliases: ["田宅", "điền trạch", "property palace", "propertypalace", "home palace"],
  },
  {
    key: "wellbeing",
    id: "ziwei.palace.fortune",
    aliases: ["福德", "phúc đức", "fortune palace", "spiritpalace", "wellbeing palace"],
  },
  {
    key: "parents",
    id: "ziwei.palace.parents",
    aliases: ["父母", "phụ mẫu", "parents palace", "parentspalace"],
  },
];

const STARS = [
  ["ziwei", ["紫微", "tử vi", "ziwei"]],
  ["tianji", ["天機", "天机", "thiên cơ", "tianji"]],
  ["taiyang", ["太陽", "太阳", "thái dương", "taiyang"]],
  ["wuqu", ["武曲", "vũ khúc", "wuqu"]],
  ["tiantong", ["天同", "thiên đồng", "tiantong"]],
  ["lianzhen", ["廉貞", "廉贞", "liêm trinh", "lianzhen"]],
  ["tianfu", ["天府", "thiên phủ", "tianfu"]],
  ["taiyin", ["太陰", "太阴", "thái âm", "taiyin"]],
  ["tanlang", ["貪狼", "贪狼", "tham lang", "tanlang"]],
  ["jumen", ["巨門", "巨门", "cự môn", "jumen"]],
  ["tianxiang", ["天相", "thiên tướng", "tianxiang"]],
  ["tianliang", ["天梁", "thiên lương", "tianliang"]],
  ["qisha", ["七殺", "七杀", "thất sát", "qisha"]],
  ["pojun", ["破軍", "破军", "phá quân", "pojun"]],
  ["zuofu", ["左輔", "左辅", "tả phụ", "zuofu"]],
  ["youbi", ["右弼", "hữu bật", "youbi"]],
  ["wenchang", ["文昌", "văn xương", "wenchang"]],
  ["wenqu", ["文曲", "văn khúc", "wenqu"]],
  ["lucun", ["祿存", "禄存", "lộc tồn", "lucun"]],
  ["tianma", ["天馬", "天马", "thiên mã", "tianma"]],
  ["qingyang", ["擎羊", "kình dương", "qingyang"]],
  ["tuoluo", ["陀羅", "陀罗", "đà la", "tuoluo"]],
  ["huoxing", ["火星", "hỏa tinh", "huoxing"]],
  ["lingxing", ["鈴星", "铃星", "linh tinh", "lingxing"]],
  ["tiankui", ["天魁", "thiên khôi", "tiankui"]],
  ["tianyue", ["天鉞", "天钺", "thiên việt", "tianyue"]],
  ["dikong", ["地空", "địa không", "dikong"]],
  ["dijie", ["地劫", "địa kiếp", "dijie"]],
];

const BRIGHTNESS = [
  ["ziwei.brightness.exalted", ["廟", "庙", "miếu", "miao"]],
  ["ziwei.brightness.prosperous", ["旺", "vượng", "wang"]],
  ["ziwei.brightness.favorable", ["得", "利", "đắc", "lợi", "favorable"]],
  ["ziwei.brightness.neutral", ["平", "bình", "neutral"]],
  ["ziwei.brightness.unfavorable", ["bất", "unfavorable"]],
  ["ziwei.brightness.weak", ["陷", "hãm", "hạn", "weak"]],
];

const TRANSFORMATIONS = [
  ["ziwei.transformation.prosperity", ["化祿", "化禄", "hóa lộc", "sihualu"]],
  ["ziwei.transformation.power", ["化權", "化权", "hóa quyền", "sihuaquan"]],
  ["ziwei.transformation.fame", ["化科", "hóa khoa", "sihuake"]],
  ["ziwei.transformation.obstacle", ["化忌", "hóa kỵ", "hóa kị", "sihuaji"]],
];

const RELATIONS = [
  ["triad", ["三方四正", "三方", "tam phương tứ chính", "triad"]],
  ["opposition", ["對宮", "对宫", "đối cung", "opposition"]],
  ["borrowing", ["借星", "mượn sao", "borrowed star", "borrowing"]],
  ["flanking", ["夾宮", "夹宫", "giáp cung", "flanking"]],
  ["conjunction", ["同宮", "同宫", "đồng cung", "conjunction"]],
];

const PATTERNS = [
  ["ziwei.pattern.sha-po-lang", ["殺破狼", "杀破狼", "sát phá lang"]],
  ["ziwei.pattern.zi-fu-tong-gong", ["紫府同宮", "紫府同宫", "tử phủ đồng cung"]],
  ["ziwei.pattern.ji-yue-tong-liang", ["機月同梁", "机月同梁", "cơ nguyệt đồng lương"]],
  ["ziwei.pattern.ri-yue-bing-ming", ["日月並明", "日月并明", "nhật nguyệt tịnh minh"]],
  ["ziwei.pattern.lu-ma-jiao-chi", ["祿馬交馳", "禄马交驰", "lộc mã giao trì"]],
  ["ziwei.pattern.fu-xiang-chao-yuan", ["府相朝垣", "phủ tướng triều viên"]],
  ["ziwei.pattern.jun-chen-qing-hui", ["君臣慶會", "君臣庆会", "quân thần khánh hội"]],
  ["ziwei.pattern.shi-zhong-yin-yu", ["石中隱玉", "石中隐玉", "thạch trung ẩn ngọc"]],
];

const SOURCE_DEFINITIONS = [
  {
    id: "nihai-tianji-corpus",
    flag: "--nihai-root",
    defaultRoot: "G:/Dev/Temp/lasoviet-ziwei-sources/nihai-tianji-corpus",
    commit: "c90006168195c0650328b7199669eb6a2d0cac93",
    selectedPathRules: [
      "data/entries.jsonl where book is one of 01-stars, 02-palaces, 03-patterns, 04-sihua, 05-illness",
    ],
    selectPaths: () => ["data/entries.jsonl"],
  },
  {
    id: "ziwei-doushu",
    flag: "--renhuai-root",
    defaultRoot: "G:/Dev/Temp/lasoviet-ziwei-sources/ziwei-doushu",
    commit: "88194a404242bfe5c6d5cc512e4117e3e245cdd5",
    selectedPathRules: [
      "lib/ziwei/patterns.ts",
      "lib/ziwei/heming-knowledge.ts",
      "lib/seo/knowledge.ts",
      "lib/classics/data/*.ts",
    ],
    selectPaths: (root) => [
      "lib/ziwei/patterns.ts",
      "lib/ziwei/heming-knowledge.ts",
      "lib/seo/knowledge.ts",
      ...listTopLevelFiles(join(root, "lib/classics/data"), ".ts").map(
        (name) => `lib/classics/data/${name}`,
      ),
    ],
  },
  {
    id: "ziwei-astrology-skills",
    flag: "--skills-root",
    defaultRoot: "G:/Dev/Temp/lasoviet-ziwei-sources/ziwei-astrology-skills",
    commit: "1cde63f65c84040cc5bdcb09fa4724be741fa007",
    selectedPathRules: [
      "skills/ziwei-astrology/references/{star-palace-matrix,palace-interpretation,star-rules,sihua-rules,patterns,classics-excerpts,heming-knowledge,report-template}.md",
    ],
    selectPaths: () =>
      [
        "star-palace-matrix.md",
        "palace-interpretation.md",
        "star-rules.md",
        "sihua-rules.md",
        "patterns.md",
        "classics-excerpts.md",
        "heming-knowledge.md",
        "report-template.md",
      ].map((name) => `skills/ziwei-astrology/references/${name}`),
  },
  {
    id: "tu-vi-dau-so-research",
    flag: "--research-root",
    defaultRoot: "G:/Dev/Temp/lasoviet-ziwei-sources/tu-vi-dau-so-research",
    commit: "91f8a06f1bca2fb271791785937265ea78d7f858",
    selectedPathRules: [
      "references/STAR_KNOWLEDGE_BASE.md",
      "references/REASONING_ENGINE.md",
      "references/PALACE_CROSS_REFERENCE.md",
      "references/PROJECT_CORE.md",
    ],
    selectPaths: () => [
      "references/STAR_KNOWLEDGE_BASE.md",
      "references/REASONING_ENGINE.md",
      "references/PALACE_CROSS_REFERENCE.md",
      "references/PROJECT_CORE.md",
    ],
  },
  {
    id: "iztro",
    flag: "--iztro-root",
    defaultRoot: "G:/Dev/Repos-Windows/tuvi-a-lam/iztro",
    commit: "1ba89cca577c6d5d46754d6f49b6b51467c577d1",
    selectedPathRules: [
      "src/i18n/locales/{vi-VN,zh-TW}/{star,palace,brightness,mutagen}.ts",
    ],
    selectPaths: () =>
      ["vi-VN", "zh-TW"].flatMap((locale) =>
        ["star.ts", "palace.ts", "brightness.ts", "mutagen.ts"].map(
          (name) => `src/i18n/locales/${locale}/${name}`,
        ),
      ),
  },
  {
    id: "ziwei-chat",
    flag: "--ziwei-chat-root",
    defaultRoot: "G:/Dev/Repos-Windows/tuvi-a-lam/ziwei-chat",
    commit: "ceef938a4ab8d50f864f690fa7d768b4294fcf77",
    selectedPathRules: ["top-level content/knowledge/*.md", "top-level content/skills/*.md"],
    selectPaths: (root) => [
      ...listTopLevelFiles(join(root, "content/knowledge"), ".md").map(
        (name) => `content/knowledge/${name}`,
      ),
      ...listTopLevelFiles(join(root, "content/skills"), ".md").map(
        (name) => `content/skills/${name}`,
      ),
    ],
  },
];

function listTopLevelFiles(directory, extension) {
  if (!existsSync(directory)) {
    throw new Error(`Selected source directory does not exist: ${directory}`);
  }
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(extension))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, "en"));
}

function parseArguments(argv) {
  const roots = new Map();
  let check = false;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--check") {
      check = true;
      continue;
    }
    const source = SOURCE_DEFINITIONS.find((candidate) => candidate.flag === argument);
    if (!source) {
      throw new Error(`Unknown argument: ${argument}`);
    }
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${argument}`);
    }
    roots.set(argument, resolve(value));
    index += 1;
  }
  return { check, roots };
}

function normalizePath(value) {
  return value.replaceAll("\\", "/");
}

function normalizeContent(value) {
  return value
    .normalize("NFC")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, " ")
    .trim();
}

function hash(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}


function stripInlineSourceAnnotations(value) {
  return value
    .replace(/\s*\[来源[：:][^\]]*\]/gu, "")
    .replace(/\s*\(?(?:亮度|四化|数据)?来源[：:][^)]*\)?/gu, "")
    .replace(/\s*\(来自速查表\)/gu, "")
    .replace(/\s*\[(?:Source|来源)[：:][^\]]*\]/gi, "")
    .replace(/\s*ziwei-doushu\s*仓库的\s*algorithm\.ts\s*中有[^\n。]+(?:。|\.|$)?/gu, "")
    .replace(/\s*参照\s+[a-zA-Z0-9_/-]+\.md\s*(?:的\s*["“][^"”]+["”]|的\s*[A-Z_]+|[a-zA-Z0-9_\u4e00-\u9fa5]+)?/gu, "");
}

function cleanInlineMarkup(value) {
  return normalizeContent(
    stripInlineSourceAnnotations(value)
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/[*_~]+/g, "")
      .replace(/^\s*(?:[-+*]|\d+[.)])\s+/g, "")
      .replace(/^\s*>\s?/g, ""),
  );
}

function isEditorialOrTOCHeading(heading) {
  return /^(?:目录|Table of Contents|来源标注规范.*|与示例的锚定关系|自检清单.*|文件存放路径|问答记录模板|\\?question\s*模式.*|完成后提示语.*|合盘报告模板.*|友情合盘报告模板.*|输出规范|输出文件规范|专项解读模板.*|报告尾部声明.*|11\.3\s*参考文献)$/i.test(
    heading.trim(),
  );
}

function isNonInterpretiveDebris(unit) {
  const normalized = normalizeContent(unit);
  if (!normalized) return true;

  if (/^(?:目录|Table of Contents)[：:]/i.test(normalized)) return true;
  if (/^\d+\.\s*\[[^\]]+\]\(#[^)]+\)/.test(normalized)) return true;

  if (
    /^(?:[^:]+[：:]\s*)?来源[：:]\s*(?:https?:\/\/|sources?\/|[a-z0-9_-]+\/(?:lib|src|data|references|content|skills)\/|\.[a-z0-9_/-]+)[^\s]*(?:\s*中的\s*[A-Z0-9_]+)?$/i.test(
      normalized,
    )
  ) {
    return true;
  }
  if (/^(?:\[来源[：:][^\]]+\]|\(来源[：:][^)]+\))$/.test(normalized)) return true;
  if (/^(?:[^:]+[：:]\s*)?完整(?:版详见|文件索引见)\s+[a-zA-Z0-9_/-]+\.md/i.test(normalized)) {
    return true;
  }

  if (
    /^(?:紫微斗数古籍传承（无确切作者）|相传陈抟祖师传|罗洪先\s*编|紫微斗数全集|紫微斗数全书|骨髓赋|必须\s*\/\s*加分\s*\/\s*破格)$/.test(
      normalized,
    )
  ) {
    return true;
  }
  if (/^【?(?:一句话定调|核心论断|命盘依据|经典出处|了解\s*.*星)】?$/.test(normalized)) return true;
  if (
    /^(?:一句话核心|吉象条件\/表现|凶象\/注意事项|配偶外形性格|婚期建议|倪海夏原话|───.*───)$/.test(
      normalized,
    )
  ) {
    return true;
  }

  if (/本文件摘录与格局判断/i.test(normalized)) return true;
  if (/本表供快速查找/i.test(normalized)) return true;
  if (/本模板以示例命盘为标准/i.test(normalized)) return true;
  if (/示例文件\s*examples\//i.test(normalized)) return true;
  if (/质量判定标准：生成的报告行数应/i.test(normalized)) return true;
  if (/以下格局不在.*源码中/i.test(normalized)) return true;
  if (/飞星分析是紫微斗数中判断宫位间能量流动的核心技术，已实现为独立模块/i.test(normalized)) {
    return true;
  }
  if (/iztro\s*仓库支持自化检测/i.test(normalized)) return true;
  if (/详细断语[：:]\s*基本断语[：:]一句话概括/i.test(normalized)) return true;
  if (/供合盘\s*AI\s*分析使用/i.test(normalized)) return true;
  if (/紫微斗数最浓缩的核心口诀，全文约\s*1500\s*字/i.test(normalized)) return true;
  if (/紫微斗数最权威的古籍之一/i.test(normalized)) return true;
  if (/紫微斗数最系统的古籍/i.test(normalized)) return true;

  return false;
}

function splitLongUnit(value) {
  const normalized = normalizeContent(value);
  if (!normalized) return [];
  if (normalized.length <= MAX_CHUNK_LENGTH) return [normalized];

  const statements =
    normalized.match(/[^.!?。！？；;]+(?:[.!?。！？；;]+|$)/gu) ?? [normalized];
  const chunks = [];
  let current = "";

  const pushHardSplit = (statement) => {
    let remaining = statement.trim();
    while (remaining.length > MAX_CHUNK_LENGTH) {
      let cut = remaining.lastIndexOf(" ", MAX_CHUNK_LENGTH);
      if (cut < Math.floor(MAX_CHUNK_LENGTH * 0.6)) cut = MAX_CHUNK_LENGTH;
      chunks.push(remaining.slice(0, cut).trim());
      remaining = remaining.slice(cut).trim();
    }
    return remaining;
  };

  for (const rawStatement of statements) {
    let statement = normalizeContent(rawStatement);
    if (!statement) continue;
    if (statement.length > MAX_CHUNK_LENGTH) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      statement = pushHardSplit(statement);
    }
    if (!statement) continue;
    const combined = current ? `${current} ${statement}` : statement;
    if (combined.length <= MAX_CHUNK_LENGTH) {
      current = combined;
    } else {
      chunks.push(current);
      current = statement;
    }
  }
  if (current) chunks.push(current);
  return chunks.filter(Boolean);
}

function extractMarkdown(text) {
  const lines = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").split("\n");
  const units = [];
  let inFrontmatter = lines[0]?.trim() === "---";
  let inFence = false;
  let heading = "";
  let skipSection = false;
  let paragraph = [];

  const flush = () => {
    const raw = paragraph.join(" ");
    paragraph = [];
    if (skipSection) return;
    const body = cleanInlineMarkup(raw);
    if (!body) return;
    const unit = heading && !body.startsWith(heading) ? `${heading}: ${body}` : body;
    if (!isNonInterpretiveDebris(unit)) units.push(unit);
  };

  for (let index = 0; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();
    if (inFrontmatter) {
      if (index > 0 && trimmed === "---") inFrontmatter = false;
      continue;
    }
    if (/^```|^~~~/.test(trimmed)) {
      flush();
      inFence = !inFence;
      continue;
    }
    if (inFence || /^<!--/.test(trimmed)) continue;

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flush();
      const level = headingMatch[1].length;
      const cleanHeading = cleanInlineMarkup(headingMatch[2]);
      heading = cleanHeading;
      if (level <= 2) {
        skipSection = isEditorialOrTOCHeading(cleanHeading);
      } else if (isEditorialOrTOCHeading(cleanHeading)) {
        skipSection = true;
      }
      continue;
    }
    if (!trimmed || /^[-*_]{3,}$/.test(trimmed)) {
      flush();
      continue;
    }
    if (/^\|?(?:\s*:?-+:?\s*\|)+\s*$/.test(trimmed)) continue;
    if (trimmed.includes("|")) {
      flush();
      if (skipSection) continue;
      const cells = trimmed
        .replace(/^\||\|$/g, "")
        .split("|")
        .map(cleanInlineMarkup)
        .filter(Boolean);
      if (cells.length > 1) {
        const row = cells.join("; ");
        const unit = heading ? `${heading}: ${row}` : row;
        if (!isNonInterpretiveDebris(unit)) units.push(unit);
      }
      continue;
    }
    paragraph.push(trimmed);
  }
  flush();
  return units;
}

function extractClassics(text) {
  const units = [];
  const paragraphPattern = /text:\s*(["'`])((?:\\[\s\S]|(?!\1)[\s\S])*?)\1/g;
  for (const match of text.matchAll(paragraphPattern)) {
    const value = cleanInlineMarkup(
      match[2]
        .replace(/\$\{[\s\S]*?\}/g, " ")
        .replace(/\\u([0-9a-fA-F]{4})/g, (_, c) =>
          String.fromCharCode(Number.parseInt(c, 16)),
        )
        .replace(/\\[nrt]/g, " ")
        .replace(/\\(["'`\\])/g, "$1"),
    );
    if (value && !isNonInterpretiveDebris(value)) {
      units.push(value);
    }
  }
  return units;
}

function extractTypeScript(text, relativePath = "") {
  if (relativePath.includes("lib/classics/data/")) {
    return extractClassics(text);
  }
  const units = [];
  const comments = text.match(/\/\*[\s\S]*?\*\/|\/\/[^\r\n]*/g) ?? [];
  for (const comment of comments) {
    const cleaned = comment
      .replace(/^\/\*+|\*+\/$/g, "")
      .replace(/^\/\/\s?/gm, "")
      .replace(/^\s*\*\s?/gm, "")
      .replace(/^\s*@\w+.*$/gm, "");
    for (const unit of extractMarkdown(cleaned)) {
      if (!isNonInterpretiveDebris(unit)) {
        units.push(unit);
      }
    }
  }

  const stringPattern = /(["'`])((?:\\[\s\S]|(?!\1)[\s\S])*?)\1/g;
  for (const match of text.matchAll(stringPattern)) {
    const raw = match[2]
      .replace(/\$\{[\s\S]*?\}/g, " ")
      .replace(/\\u([0-9a-fA-F]{4})/g, (_, c) =>
        String.fromCharCode(Number.parseInt(c, 16)),
      )
      .replace(/\\[nrt]/g, " ")
      .replace(/\\(["'`\\])/g, "$1");

    if (raw.includes("\n#") || raw.includes("\n##")) {
      for (const unit of extractMarkdown(raw)) {
        if (!isNonInterpretiveDebris(unit)) {
          units.push(unit);
        }
      }
      continue;
    }

    const value = cleanInlineMarkup(raw);
    const hasHan = /\p{Script=Han}/u.test(value);
    if (value.length < (hasHan ? 4 : 18)) continue;
    if (/^(?:@|\.{0,2}\/)/.test(value) || (!value.includes(" ") && /[\/\\]/.test(value))) {
      continue;
    }
    if (/^(?:string|number|boolean|excellent|good|neutral|caution)$/i.test(value)) {
      continue;
    }
    if (isNonInterpretiveDebris(value)) {
      continue;
    }
    units.push(value);
  }
  return units;
}

function extractTerminologyMap(text) {
  const units = [];
  const entryPattern = /([A-Za-z][A-Za-z0-9_]*)\s*:\s*(["'])(.*?)\2/g;
  for (const match of text.matchAll(entryPattern)) {
    const key = cleanInlineMarkup(match[1]);
    const value = cleanInlineMarkup(match[3]);
    if (key && value) units.push(`${key}: ${value}`);
  }
  return units;
}

function extractNihai(text) {
  const allowedBooks = new Set([
    "01-stars",
    "02-palaces",
    "03-patterns",
    "04-sihua",
    "05-illness",
  ]);
  const units = [];
  for (const line of text.replace(/\r\n?/g, "\n").split("\n")) {
    if (!line.trim()) continue;
    const row = JSON.parse(line);
    if (!allowedBooks.has(row.book)) continue;
    const quote = cleanInlineMarkup(String(row.quote ?? ""));
    if (!quote) continue;
    const heading = [row.h2, row.h3].map((v) => cleanInlineMarkup(String(v ?? ""))).filter(Boolean);
    const note = cleanInlineMarkup(String(row.note ?? ""));
    const unit = `${heading.join(" / ")}: ${quote}${note ? ` ${note}` : ""}`;
    if (!isNonInterpretiveDebris(unit)) units.push(unit);
  }
  return units;
}

function includesAlias(haystack, alias) {
  return haystack.toLocaleLowerCase("en").includes(alias.toLocaleLowerCase("en"));
}

function findCanonicalIds(context, entries, prefix = "") {
  const ids = [];
  for (const [id, aliases] of entries) {
    if (aliases.some((alias) => includesAlias(context, alias))) {
      ids.push(prefix ? `${prefix}${id}` : id);
    }
  }
  return ids;
}

function detectLanguage(content, fallback) {
  if (/[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/iu.test(content)) {
    return "vi";
  }
  const hanCount = (content.match(/\p{Script=Han}/gu) ?? []).length;
  const latinCount = (content.match(/[A-Za-z]/g) ?? []).length;
  if (hanCount > 0 && hanCount >= latinCount / 4) return "zh";
  if (/\b(?:cung|sao|mệnh|tài|phúc|hóa|luận|lá số|menh|tai|phuc|hoa|luan|la so)\b/iu.test(content)) {
    return "vi";
  }
  if (
    latinCount > 0 &&
    /\b(?:the|and|is|in|to|of|that|it|for|as|with|this|when|user|asks|whether|read|not|from|are|or|by|on|be|at|have|which|should|do|an|can|your|we|you|avoid|good|first|only|more|than)\b/i.test(
      content,
    )
  ) {
    return "en";
  }
  return fallback;
}

function sourceTypeFor(sourceId, path) {
  if (sourceId === "nihai-tianji-corpus") return "classical";
  if (sourceId === "iztro") return "matrix";
  if (sourceId === "tu-vi-dau-so-research") return "modern";
  if (sourceId === "ziwei-chat") return "curated";
  if (/classics|patterns|heming/i.test(path)) return "classical";
  if (/matrix/i.test(path)) return "matrix";
  return "curated";
}

function fallbackLanguageFor(sourceId, path) {
  if (/vi-VN/.test(path)) return "vi";
  if (/zh-TW/.test(path)) return "zh";
  if (sourceId === "tu-vi-dau-so-research") return "vi";
  return "zh";
}

function metadataFor(sourceId, path, content) {
  const context = `${path} ${content}`;
  const palaceMatches = PALACES.filter((palace) =>
    palace.aliases.some((alias) => includesAlias(context, alias)),
  );
  const palaces = palaceMatches.map((palace) => palace.id);
  const stars = findCanonicalIds(context, STARS, "ziwei.star.");
  const brightness = findCanonicalIds(context, BRIGHTNESS);
  const transformations = findCanonicalIds(context, TRANSFORMATIONS);
  const relations = findCanonicalIds(context, RELATIONS);
  const patterns = findCanonicalIds(context, PATTERNS);
  const topics = new Set();

  for (const palace of palaceMatches) {
    if (["spouse", "children", "siblings", "friends", "parents"].includes(palace.key)) {
      topics.add("relationships");
    } else if (palace.key === "wellbeing") {
      topics.add("wellbeing");
    } else {
      topics.add(palace.key);
    }
  }
  if (stars.length > 0) topics.add("stars");
  if (transformations.length > 0) topics.add("transformations");
  if (patterns.length > 0 || /pattern|格局|cách cục/iu.test(context)) topics.add("patterns");
  if (/timing|流年|大限|運限|运限|vận hạn|thời điểm/iu.test(context)) topics.add("timing");
  if (/method|reasoning|template|phương pháp|推理|解讀原則|解读原则/iu.test(context)) {
    topics.add("methodology");
  }
  if (topics.size === 0) topics.add("interpretation");

  const sourceType = sourceTypeFor(sourceId, path);
  let priority = sourceType === "classical" ? 3 : 2;
  if (/report-template|PROJECT_CORE/i.test(path)) priority = 1;

  return {
    topics: [...topics].sort(),
    palaces,
    stars,
    brightness,
    transformations,
    relations,
    patterns,
    sourceType,
    languageOrigin: detectLanguage(content, fallbackLanguageFor(sourceId, path)),
    priority,
  };
}

function reportSectionsFor(metadata) {
  const sections = new Set();
  if (metadata.topics.includes("methodology")) sections.add("data_and_method");
  if (
    metadata.stars.length > 0 ||
    metadata.transformations.length > 0 ||
    metadata.patterns.length > 0
  ) {
    sections.add("primary_evidence");
  }
  if (metadata.topics.some((topic) => ["life", "wellbeing", "interpretation"].includes(topic))) {
    sections.add("identity_analysis");
  }
  if (metadata.topics.some((topic) => ["career", "wealth"].includes(topic))) {
    sections.add("strengths_and_resources");
    sections.add("action_summary");
  }
  if (metadata.topics.some((topic) => ["relationships", "health"].includes(topic))) {
    sections.add("tensions_and_blind_spots");
    sections.add("reflection_questions");
  }
  if (metadata.topics.includes("timing")) sections.add("cycles_and_timing");
  if (sections.size === 0) sections.add("data_and_method");
  return SECTION_IDS.filter((section) => sections.has(section));
}

function extractUnits(sourceId, path, text) {
  if (sourceId === "nihai-tianji-corpus") return extractNihai(text);
  if (sourceId === "iztro") return extractTerminologyMap(text);
  if (path.endsWith(".md")) return extractMarkdown(text);
  if (path.endsWith(".ts")) return extractTypeScript(text, path);
  throw new Error(`Unsupported selected source format: ${path}`);
}

function verifySource(source, root) {
  if (!existsSync(root) || !statSync(root).isDirectory()) {
    throw new Error(`Source root does not exist: ${root}`);
  }
  const actualCommit = execFileSync("git", ["-C", root, "rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  if (actualCommit !== source.commit) {
    throw new Error(
      `${source.id} HEAD mismatch: expected ${source.commit}, received ${actualCommit}`,
    );
  }
}

function buildCorpus(arguments_) {
  const chunks = [];
  const seenHashes = new Set();
  const sourceRecords = [];

  for (let sourceIndex = 0; sourceIndex < SOURCE_DEFINITIONS.length; sourceIndex += 1) {
    const source = SOURCE_DEFINITIONS[sourceIndex];
    const root = arguments_.roots.get(source.flag) ?? resolve(source.defaultRoot);
    verifySource(source, root);
    const selectedPaths = source
      .selectPaths(root)
      .map(normalizePath)
      .sort((a, b) => a.localeCompare(b, "en"));
    let extractedUnits = 0;
    let candidateChunks = 0;
    let emittedChunks = 0;
    let duplicatesRemoved = 0;

    for (const path of selectedPaths) {
      const absolutePath = resolve(root, path);
      const relativePath = normalizePath(relative(root, absolutePath));
      if (
        relativePath.startsWith("../") ||
        relativePath === ".." ||
        !existsSync(absolutePath) ||
        !statSync(absolutePath).isFile()
      ) {
        throw new Error(`Invalid selected source path for ${source.id}: ${path}`);
      }
      const units = extractUnits(source.id, relativePath, readFileSync(absolutePath, "utf8"));
      extractedUnits += units.length;
      let pathOrdinal = 0;

      for (const unit of units) {
        for (const content of splitLongUnit(unit)) {
          pathOrdinal += 1;
          candidateChunks += 1;
          const contentHash = hash(content);
          if (seenHashes.has(contentHash)) {
            duplicatesRemoved += 1;
            continue;
          }
          seenHashes.add(contentHash);
          const metadata = metadataFor(source.id, relativePath, content);
          const pathHash = hash(relativePath).slice(0, 8);
          chunks.push({
            passageId: `ziwei-v3-${String(sourceIndex + 1).padStart(2, "0")}-${pathHash}-${String(pathOrdinal).padStart(5, "0")}-${contentHash.slice(0, 12)}`,
            reportSections: reportSectionsFor(metadata),
            content,
            contentHash,
            metadata,
          });
          emittedChunks += 1;
        }
      }
    }

    sourceRecords.push({
      sourceIndex: sourceIndex + 1,
      sourceId: source.id,
      pinnedCommit: source.commit,
      selectedPathRules: source.selectedPathRules,
      selectedPaths,
      generationCounts: {
        selectedFiles: selectedPaths.length,
        extractedUnits,
        candidateChunks,
        emittedChunks,
        duplicatesRemoved,
      },
    });
  }

  if (chunks.length === 0) throw new Error("Corpus generation produced no chunks");
  for (const chunk of chunks) {
    if (!chunk.content || chunk.content.length > MAX_CHUNK_LENGTH) {
      throw new Error(`Invalid chunk length for ${chunk.passageId}: ${chunk.content.length}`);
    }
    if (hash(chunk.content) !== chunk.contentHash) {
      throw new Error(`Chunk hash verification failed for ${chunk.passageId}`);
    }
  }

  const palaceCoverage = PALACES.map((palace) => ({
    palace: palace.key,
    canonicalId: palace.id,
    chunkCount: chunks.filter((chunk) => chunk.metadata.palaces.includes(palace.id)).length,
  }));
  const missingPalaces = palaceCoverage.filter((entry) => entry.chunkCount === 0);
  if (missingPalaces.length > 0) {
    throw new Error(
      `Missing dedicated palace metadata: ${missingPalaces.map((entry) => entry.palace).join(", ")}`,
    );
  }

  const registry = {
    schemaVersion: 1,
    knowledgeVersion: KNOWLEDGE_VERSION,
    generatedBy: BUILDER_PATH,
    sources: sourceRecords,
    totals: {
      selectedFiles: sourceRecords.reduce(
        (total, source) => total + source.generationCounts.selectedFiles,
        0,
      ),
      extractedUnits: sourceRecords.reduce(
        (total, source) => total + source.generationCounts.extractedUnits,
        0,
      ),
      candidateChunks: sourceRecords.reduce(
        (total, source) => total + source.generationCounts.candidateChunks,
        0,
      ),
      emittedChunks: chunks.length,
      duplicatesRemoved: sourceRecords.reduce(
        (total, source) => total + source.generationCounts.duplicatesRemoved,
        0,
      ),
    },
    palaceCoverage,
  };

  const manifest = {
    documentId: "ziwei-comprehensive-report-vi",
    knowledgeVersion: KNOWLEDGE_VERSION,
    discipline: "ziwei",
    locale: "vi",
    sourcePath: MANIFEST_PATH,
    sourceAttribution: "Lá Số Việt Zi Wei Corpus Editorial Board",
    permittedUse: "reference_rewrite",
    contentHash: hash(chunks.map((chunk) => chunk.content).join("\n\n")),
    approval: {
      status: "approved",
      approver: "phase04-content-review",
      approvedAt: "2026-09-07T00:00:00.000Z",
    },
    chunks,
  };

  return {
    registry,
    manifest,
    registryText: `${JSON.stringify(registry, null, 2)}\n`,
    manifestText: `${JSON.stringify(manifest, null, 2)}\n`,
  };
}

function compareGeneratedFile(path, expected) {
  const absolutePath = resolve(REPOSITORY_ROOT, path);
  if (!existsSync(absolutePath)) {
    throw new Error(`Generated file is missing: ${path}`);
  }
  if (readFileSync(absolutePath, "utf8") !== expected) {
    throw new Error(`Generated file is stale: ${path}`);
  }
}

function writeGeneratedFile(path, content) {
  const absolutePath = resolve(REPOSITORY_ROOT, path);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, content, "utf8");
}

function main() {
  const arguments_ = parseArguments(process.argv.slice(2));
  const generated = buildCorpus(arguments_);
  if (arguments_.check) {
    compareGeneratedFile(REGISTRY_PATH, generated.registryText);
    compareGeneratedFile(MANIFEST_PATH, generated.manifestText);
    console.log(
      `Zi Wei V3 corpus check passed: ${generated.manifest.chunks.length} chunks across ${generated.registry.totals.selectedFiles} files.`,
    );
    return;
  }

  writeGeneratedFile(REGISTRY_PATH, generated.registryText);
  writeGeneratedFile(MANIFEST_PATH, generated.manifestText);
  console.log(
    `Zi Wei V3 corpus generated: ${generated.manifest.chunks.length} chunks across ${generated.registry.totals.selectedFiles} files.`,
  );
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
