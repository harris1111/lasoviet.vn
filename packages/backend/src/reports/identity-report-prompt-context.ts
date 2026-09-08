import {
  type IdentityReportSectionId,
} from "@lasoviet/contracts";
import {
  identityReportSectionPurpose,
  boundedKnowledge,
  type ApprovedKnowledgePassage,
} from "./report-source.js";
import type { KnowledgePassageV1 } from "../knowledge/knowledge-retrieval.service.js";

export { boundedKnowledge };

const palaces: Record<"vi" | "en", Record<string, string>> = {
  vi: {
    life: "Cung Mệnh",
    siblings: "Cung Huynh Đệ",
    spouse: "Cung Phu Thê",
    children: "Cung Tử Tức",
    wealth: "Cung Tài Bạch",
    health: "Cung Tật Ách",
    travel: "Cung Thiên Di",
    friends: "Cung Nô Bộc",
    career: "Cung Quan Lộc",
    property: "Cung Điền Trạch",
    fortune: "Cung Phúc Đức",
    parents: "Cung Phụ Mẫu",
  },
  en: {
    life: "Life Palace",
    siblings: "Siblings Palace",
    spouse: "Spouse Palace",
    children: "Children Palace",
    wealth: "Wealth Palace",
    health: "Health Palace",
    travel: "Travel Palace",
    friends: "Friends Palace",
    career: "Career Palace",
    property: "Property Palace",
    fortune: "Fortune Palace",
    parents: "Parents Palace",
  },
};

const branches: Record<"vi" | "en", Record<string, string>> = {
  vi: {
    rat: "Tý", zi: "Tý",
    ox: "Sửu", chou: "Sửu",
    tiger: "Dần", yin: "Dần",
    rabbit: "Mão", mao: "Mão",
    dragon: "Thìn", chen: "Thìn",
    snake: "Tỵ", si: "Tỵ",
    horse: "Ngọ", wu: "Ngọ",
    goat: "Mùi", wei: "Mùi",
    monkey: "Thân", shen: "Thân",
    rooster: "Dậu", you: "Dậu",
    dog: "Tuất", xu: "Tuất",
    pig: "Hợi", hai: "Hợi",
  },
  en: {
    rat: "Rat", zi: "Rat",
    ox: "Ox", chou: "Ox",
    tiger: "Tiger", yin: "Tiger",
    rabbit: "Rabbit", mao: "Rabbit",
    dragon: "Dragon", chen: "Dragon",
    snake: "Snake", si: "Snake",
    horse: "Horse", wu: "Horse",
    goat: "Goat", wei: "Goat",
    monkey: "Monkey", shen: "Monkey",
    rooster: "Rooster", you: "Rooster",
    dog: "Dog", xu: "Dog",
    pig: "Pig", hai: "Pig",
  },
};

const stars: Record<"vi" | "en", Record<string, string>> = {
  vi: {
    ziwei: "Tử Vi",
    tianji: "Thiên Cơ",
    taiyang: "Thái Dương",
    wuqu: "Vũ Khúc",
    tiantong: "Thiên Đồng",
    lianzhen: "Liêm Trinh",
    tianfu: "Thiên Phủ",
    taiyin: "Thái Âm",
    tanlang: "Tham Lang",
    jumen: "Cự Môn",
    tianxiang: "Thiên Tướng",
    tianliang: "Thiên Lương",
    qisha: "Thất Sát",
    pojun: "Phá Quân",
    zuofu: "Tả Phù",
    youbi: "Hữu Bật",
    wenchang: "Văn Xương",
    wenqu: "Văn Khúc",
    lucun: "Lộc Tồn",
    tianma: "Thiên Mã",
    qingyang: "Kình Dương",
    tuoluo: "Đà La",
    huoxing: "Hỏa Tinh",
    lingxing: "Linh Tinh",
    tiankui: "Thiên Khôi",
    tianyue: "Thiên Việt",
    dikong: "Địa Không",
    dijie: "Địa Kiếp",
  },
  en: {
    ziwei: "Zi Wei",
    tianji: "Tian Ji",
    taiyang: "Tai Yang",
    wuqu: "Wu Qu",
    tiantong: "Tian Tong",
    lianzhen: "Lian Zhen",
    tianfu: "Tian Fu",
    taiyin: "Tai Yin",
    tanlang: "Tan Lang",
    jumen: "Ju Men",
    tianxiang: "Tian Xiang",
    tianliang: "Tian Liang",
    qisha: "Qi Sha",
    pojun: "Po Jun",
    zuofu: "Zuo Fu",
    youbi: "You Bi",
    wenchang: "Wen Chang",
    wenqu: "Wen Qu",
    lucun: "Lu Cun",
    tianma: "Tian Ma",
    qingyang: "Qing Yang",
    tuoluo: "Tuo Luo",
    huoxing: "Huo Xing",
    lingxing: "Ling Xing",
    tiankui: "Tian Kui",
    tianyue: "Tian Yue",
    dikong: "Di Kong",
    dijie: "Di Jie",
  },
};

const transformations: Record<"vi" | "en", Record<string, string>> = {
  vi: {
    prosperity: "Hóa Lộc",
    power: "Hóa Quyền",
    fame: "Hóa Khoa",
    obstacle: "Hóa Kỵ",
  },
  en: {
    prosperity: "Prosperity",
    power: "Power",
    fame: "Fame",
    obstacle: "Obstacle",
  },
};

function suffix(value: string): string {
  return value.split(".").at(-1) ?? value;
}

export type LocalizedPromptFacts = {
  soulPalace: string;
  bodyPalace?: string;
  lifeBranch?: string;
  transformations: string[];
  ruleSetId?: string;
};

export function buildLocalizedPromptFacts(
  facts: Record<string, unknown>,
  locale: "vi" | "en",
): LocalizedPromptFacts {
  const soulPalaceKey = typeof facts.soulPalaceId === "string" ? suffix(facts.soulPalaceId) : "";
  const soulPalace = palaces[locale][soulPalaceKey] ?? (locale === "vi" ? "Cung Mệnh" : "Life Palace");

  let bodyPalace: string | undefined;
  if (typeof facts.bodyPalaceId === "string") {
    const key = suffix(facts.bodyPalaceId);
    bodyPalace = palaces[locale][key] ?? facts.bodyPalaceId;
  }

  let lifeBranch: string | undefined;
  const lifeBranchEntry = Object.entries(facts).find(
    ([k]) => k.startsWith("palaces.") && k.endsWith(".earthlyBranchId"),
  );
  if (lifeBranchEntry !== undefined && typeof lifeBranchEntry[1] === "string") {
    const branchKey = suffix(lifeBranchEntry[1]);
    lifeBranch = branches[locale][branchKey] ?? lifeBranchEntry[1];
  }

  const localizedTransformations: string[] = [];
  if (Array.isArray(facts.transformations)) {
    for (const item of facts.transformations) {
      if (typeof item === "object" && item !== null && "starId" in item && "id" in item) {
        const starKey = suffix(String(item.starId));
        const transKey = suffix(String(item.id));
        const starName = stars[locale][starKey] ?? starKey;
        const transName = transformations[locale][transKey] ?? transKey;
        localizedTransformations.push(`${starName} ${transName}`);
      } else if (typeof item === "string") {
        const transKey = suffix(item);
        localizedTransformations.push(transformations[locale][transKey] ?? transKey);
      }
    }
  }

  let ruleSetId: string | undefined;
  if (typeof facts["provenance.ruleSetId"] === "string") {
    ruleSetId = facts["provenance.ruleSetId"];
  }

  return {
    soulPalace,
    bodyPalace,
    lifeBranch,
    transformations: localizedTransformations,
    ...(ruleSetId !== undefined ? { ruleSetId } : {}),
  };
}

export function buildSectionRetrievalQuery(
  sectionId: IdentityReportSectionId,
  locale: "vi" | "en",
  facts: Record<string, unknown>,
): string {
  const purpose = identityReportSectionPurpose(sectionId, locale);
  const localized = buildLocalizedPromptFacts(facts, locale);
  const parts: string[] = [purpose];

  if (localized.soulPalace) {
    parts.push(locale === "vi" ? `Cung Mệnh: ${localized.soulPalace}` : `Life Palace: ${localized.soulPalace}`);
  }
  if (localized.lifeBranch) {
    parts.push(locale === "vi" ? `Địa chi Mệnh: ${localized.lifeBranch}` : `Life branch: ${localized.lifeBranch}`);
  }
  if (localized.bodyPalace) {
    parts.push(locale === "vi" ? `Cung Thân: ${localized.bodyPalace}` : `Body Palace: ${localized.bodyPalace}`);
  }
  if (localized.transformations.length > 0) {
    parts.push(
      (locale === "vi" ? "Tứ Hóa: " : "Transformations: ") + localized.transformations.join(", "),
    );
  }

  const combined = parts.join(". ");
  return combined.length <= 500 ? combined : combined.slice(0, 500);
}
