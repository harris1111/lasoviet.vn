/**
 * Love Compatibility Engine (Bói Tình Yêu Theo Tuổi & Ngũ Hành)
 * 
 * Rules:
 * - Two layers: Con giáp (Tam hợp, Lục hợp, Lục xung, Lục hại, Bình thường)
 *   and Ngũ hành nạp âm của năm sinh (Tương sinh, Tương khắc, Bình hòa).
 * - FD-063: NO composite percentage score (never "85/100" or arbitrary luck rankings).
 * - Clear traditional rationale and bridge into personal Zi Wei Phu Thê palace.
 */

export type ElementType = "Kim" | "Mộc" | "Thủy" | "Hỏa" | "Thổ";

export type PersonZodiacInfo = {
  name: string;
  birthYear: number;
  canName: string;
  chiName: string;
  chiIndex: number;
  napAmName: string;
  element: ElementType;
};

export type ZodiacRelationKind =
  | "same"
  | "tam_hop"
  | "luc_hop"
  | "luc_xung"
  | "luc_hai"
  | "binh_hoa";

export type ElementRelationKind =
  | "same"
  | "sinh_forward" // A sinh B
  | "sinh_backward" // B sinh A
  | "khac_forward" // A khac B
  | "khac_backward"; // B khac A

export type LoveCompatibilityResult = {
  personA: PersonZodiacInfo;
  personB: PersonZodiacInfo;
  zodiacRelation: {
    kind: ZodiacRelationKind;
    title: string;
    tagClass: "tag-gold" | "tag-seal" | "tag-quiet";
    description: string;
  };
  elementRelation: {
    kind: ElementRelationKind;
    title: string;
    tagClass: "tag-gold" | "tag-seal" | "tag-quiet";
    description: string;
  };
  summary: string;
};

export const CAN_NAMES_VI = [
  "Giáp", "Ất", "Bính", "Đinh", "Mậu", "Kỷ", "Canh", "Tân", "Nhâm", "Quý",
];

export const CHI_NAMES_VI = [
  "Tý", "Sửu", "Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi", "Thân", "Dậu", "Tuất", "Hợi",
];

export const NAP_AM_TABLE: readonly [string, ElementType][] = [
  ["Hải Trung Kim", "Kim"],
  ["Lư Trung Hỏa", "Hỏa"],
  ["Đại Lâm Mộc", "Mộc"],
  ["Lộ Bàng Thổ", "Thổ"],
  ["Kiếm Phong Kim", "Kim"],
  ["Sơn Đầu Hỏa", "Hỏa"],
  ["Giản Hạ Thủy", "Thủy"],
  ["Thành Đầu Thổ", "Thổ"],
  ["Bạch Lạp Kim", "Kim"],
  ["Dương Liễu Mộc", "Mộc"],
  ["Tuyền Trung Thủy", "Thủy"],
  ["Ốc Thượng Thổ", "Thổ"],
  ["Tích Lịch Hỏa", "Hỏa"],
  ["Tùng Bách Mộc", "Mộc"],
  ["Trường Lưu Thủy", "Thủy"],
  ["Sa Trung Kim", "Kim"],
  ["Sơn Hạ Hỏa", "Hỏa"],
  ["Bình Địa Mộc", "Mộc"],
  ["Bích Thượng Thổ", "Thổ"],
  ["Kim Bạch Kim", "Kim"],
  ["Phú Đăng Hỏa", "Hỏa"],
  ["Thiên Hà Thủy", "Thủy"],
  ["Đại Trạch Thổ", "Thổ"],
  ["Thoa Xuyến Kim", "Kim"],
  ["Tang Đố Mộc", "Mộc"],
  ["Đại Khê Thủy", "Thủy"],
  ["Sa Trung Thổ", "Thổ"],
  ["Thiên Thượng Hỏa", "Hỏa"],
  ["Thạch Lựu Mộc", "Mộc"],
  ["Đại Hải Thủy", "Thủy"],
];

const SINH_MAP: Record<ElementType, ElementType> = {
  Mộc: "Hỏa",
  Hỏa: "Thổ",
  Thổ: "Kim",
  Kim: "Thủy",
  Thủy: "Mộc",
};

const KHAC_MAP: Record<ElementType, ElementType> = {
  Mộc: "Thổ",
  Thổ: "Thủy",
  Thủy: "Hỏa",
  Hỏa: "Kim",
  Kim: "Mộc",
};

// 4 nhóm Tam Hợp: Thân - Tý - Thìn (8, 0, 4), Dần - Ngọ - Tuất (2, 6, 10), Tỵ - Dậu - Sửu (5, 9, 1), Hợi - Mão - Mùi (11, 3, 7)
const TAM_HOP_GROUPS: readonly (readonly number[])[] = [
  [8, 0, 4],
  [2, 6, 10],
  [5, 9, 1],
  [11, 3, 7],
];

// 6 cặp Lục Hợp
const LUC_HOP_PAIRS: readonly [number, number][] = [
  [0, 1], // Tý - Sửu
  [2, 11], // Dần - Hợi
  [3, 10], // Mão - Tuất
  [4, 9], // Thìn - Dậu
  [5, 8], // Tỵ - Thân
  [6, 7], // Ngọ - Mùi
];

// 6 cặp Lục Xung
const LUC_XUNG_PAIRS: readonly [number, number][] = [
  [0, 6], // Tý - Ngọ
  [1, 7], // Sửu - Mùi
  [2, 8], // Dần - Thân
  [3, 9], // Mão - Dậu
  [4, 10], // Thìn - Tuất
  [5, 11], // Tỵ - Hợi
];

// 6 cặp Lục Hại
const LUC_HAI_PAIRS: readonly [number, number][] = [
  [0, 7], // Tý - Mùi
  [1, 6], // Sửu - Ngọ
  [2, 5], // Dần - Tỵ
  [3, 4], // Mão - Thìn
  [8, 11], // Thân - Hợi
  [9, 10], // Dậu - Tuất
];

function isPairIn(list: readonly [number, number][], a: number, b: number): boolean {
  return list.some(
    ([x, y]) => (x === a && y === b) || (x === b && y === a),
  );
}

export function getPersonZodiacInfo(name: string, birthYear: number): PersonZodiacInfo {
  // Can Chi sexagenary cycle offset (Year 4 AD is Giáp Tý)
  const offset = (((birthYear - 4) % 60) + 60) % 60;
  const canIndex = offset % 10;
  const chiIndex = offset % 12;

  const canName = CAN_NAMES_VI[canIndex] ?? "";
  const chiName = CHI_NAMES_VI[chiIndex] ?? "";
  const napAmEntry = NAP_AM_TABLE[Math.floor(offset / 2)] ?? ["Hải Trung Kim", "Kim"];

  return {
    name: name.trim() || "Người thứ nhất",
    birthYear,
    canName,
    chiName,
    chiIndex,
    napAmName: napAmEntry[0],
    element: napAmEntry[1],
  };
}

export function evaluateLoveCompatibility(
  nameA: string,
  yearA: number,
  nameB: string,
  yearB: number,
  locale: "vi" | "en" = "vi",
): LoveCompatibilityResult {
  const isVi = locale === "vi";
  const personA = getPersonZodiacInfo(nameA, yearA);
  const personB = getPersonZodiacInfo(nameB, yearB);

  const aChi = personA.chiIndex;
  const bChi = personB.chiIndex;

  // 1. Evaluate Zodiac (Địa Chi)
  let zKind: ZodiacRelationKind = "binh_hoa";
  let zTitle = isVi ? "Bình thường" : "Neutral";
  let zTag: "tag-gold" | "tag-seal" | "tag-quiet" = "tag-quiet";
  let zDesc = isVi
    ? "Hai con giáp không hợp không xung. Sự hòa hợp phần lớn phụ thuộc vào cách chia sẻ và thấu hiểu lẫn nhau."
    : "The two zodiac branches are neither harmonious nor clashing. Harmony relies primarily on communication and mutual empathy.";

  if (aChi === bChi) {
    zKind = "same";
    zTitle = isVi ? "Cùng con giáp" : "Same Zodiac Branch";
    zTag = "tag-gold";
    zDesc = isVi
      ? "Cùng một con giáp: dễ đồng cảm và hiểu nhau nhanh vì có nét tính cách tương đồng, song cũng cần tránh nóng giận cùng thời điểm."
      : "Sharing the same animal sign: quick mutual understanding, though both should practice patience during disagreements.";
  } else if (TAM_HOP_GROUPS.some((g) => g.includes(aChi) && g.includes(bChi))) {
    zKind = "tam_hop";
    zTitle = isVi ? "Tam hợp" : "Triad Harmony";
    zTag = "tag-gold";
    zDesc = isVi
      ? `Cặp tuổi nằm trong nhóm tam hợp (${personA.chiName} và ${personB.chiName}): nâng đỡ chí hướng, dễ cộng hưởng mục tiêu lớn trong cuộc sống.`
      : `Belonging to a harmonious triad (${personA.chiName} and ${personB.chiName}): mutual elevation of goals and values.`;
  } else if (isPairIn(LUC_HOP_PAIRS, aChi, bChi)) {
    zKind = "luc_hop";
    zTitle = isVi ? "Lục hợp" : "Six Harmonies";
    zTag = "tag-gold";
    zDesc = isVi
      ? `Cặp lục hợp (${personA.chiName} và ${personB.chiName}): có lực hút tự nhiên, dễ dung hòa và nhường nhịn nhau trong đời sống gia đình.`
      : `Six Harmonies pair (${personA.chiName} and ${personB.chiName}): natural affinity and instinctive mutual concession.`;
  } else if (isPairIn(LUC_XUNG_PAIRS, aChi, bChi)) {
    zKind = "luc_xung";
    zTitle = isVi ? "Lục xung" : "Direct Clash";
    zTag = "tag-seal";
    zDesc = isVi
      ? `Cặp xung đối (${personA.chiName} và ${personB.chiName}): góc nhìn và nhịp điệu sinh hoạt dễ ngược chiều. Cần thống nhất nguyên tắc tài chính và việc lớn trước khi tiến hành.`
      : `Opposing branches (${personA.chiName} and ${personB.chiName}): diverging rhythms and viewpoints. Explicit communication on finances and plans is essential.`;
  } else if (isPairIn(LUC_HAI_PAIRS, aChi, bChi)) {
    zKind = "luc_hai";
    zTitle = isVi ? "Lục hại" : "Harmful Tension";
    zTag = "tag-seal";
    zDesc = isVi
      ? `Cặp lục hại (${personA.chiName} và ${personB.chiName}): dễ phát sinh hiểu lầm vì tác động từ bên ngoài hoặc chuyện tiền nong. Cần minh bạch sớm để giữ sự bình yên.`
      : `Harmful tension pair (${personA.chiName} and ${personB.chiName}): susceptibility to misunderstandings from third parties or financial topics. Early transparency is key.`;
  }

  // 2. Evaluate Ngũ Hành Nạp Âm
  const elemA = personA.element;
  const elemB = personB.element;

  let eKind: ElementRelationKind = "same";
  let eTitle = isVi ? "Bình hòa" : "Elemental Balance";
  let eTag: "tag-gold" | "tag-seal" | "tag-quiet" = "tag-quiet";
  let eDesc = isVi
    ? `Cùng hành ${elemA}: tư duy tương đồng, cần một trong hai người chủ động hạ cái tôi khi có bất đồng.`
    : `Both hold element ${elemA}: similar mental baseline, requiring mutual flexibility.`;

  if (elemA !== elemB) {
    if (SINH_MAP[elemB] === elemA) {
      eKind = "sinh_backward";
      eTitle = isVi ? "Tương sinh" : "Generative Support";
      eTag = "tag-gold";
      eDesc = isVi
        ? `${personB.name} (${elemB}) sinh ${personA.name} (${elemA}): ${personB.name} thường là điểm tựa chăm lo, nâng đỡ và nhẫn nại hơn với ${personA.name}.`
        : `${personB.name} (${elemB}) generates ${personA.name} (${elemA}): ${personB.name} offers natural supportive energy to ${personA.name}.`;
    } else if (SINH_MAP[elemA] === elemB) {
      eKind = "sinh_forward";
      eTitle = isVi ? "Tương sinh" : "Generative Support";
      eTag = "tag-gold";
      eDesc = isVi
        ? `${personA.name} (${elemA}) sinh ${personB.name} (${elemB}): ${personA.name} thường là điểm tựa chăm lo, chu toàn và hỗ trợ cho ${personB.name}.`
        : `${personA.name} (${elemA}) generates ${personB.name} (${elemB}): ${personA.name} offers natural supportive energy to ${personB.name}.`;
    } else if (KHAC_MAP[elemA] === elemB) {
      eKind = "khac_forward";
      eTitle = isVi ? "Tương khắc" : "Restraining Tension";
      eTag = "tag-seal";
      eDesc = isVi
        ? `${personA.name} (${elemA}) khắc ${personB.name} (${elemB}): ${personA.name} dễ tạo áp lực lên ${personB.name}. Cần lắng nghe và dành không gian quyết định cho ${personB.name}.`
        : `${personA.name} (${elemA}) restrains ${personB.name} (${elemB}): ${personA.name} should consciously yield decision space to ${personB.name}.`;
    } else {
      eKind = "khac_backward";
      eTitle = isVi ? "Tương khắc" : "Restraining Tension";
      eTag = "tag-seal";
      eDesc = isVi
        ? `${personB.name} (${elemB}) khắc ${personA.name} (${elemA}): ${personB.name} dễ tạo áp lực lên ${personA.name}. Cần tôn trọng tiếng nói của ${personA.name} trong các việc chung.`
        : `${personB.name} (${elemB}) restrains ${personA.name} (${elemA}): ${personB.name} should consciously yield decision space to ${personA.name}.`;
    }
  }

  const summary = isVi
    ? `Hai bạn có sự phối hợp giữa ${zTitle.toLowerCase()} về địa chi (${personA.chiName} - ${personB.chiName}) và ${eTitle.toLowerCase()} về ngũ hành (${elemA} - ${elemB}).`
    : `Compatibility is shaped by ${zTitle.toLowerCase()} of animal branches (${personA.chiName} - ${personB.chiName}) and ${eTitle.toLowerCase()} of elements (${elemA} - ${elemB}).`;

  return {
    personA,
    personB,
    zodiacRelation: {
      kind: zKind,
      title: zTitle,
      tagClass: zTag,
      description: zDesc,
    },
    elementRelation: {
      kind: eKind,
      title: eTitle,
      tagClass: eTag,
      description: eDesc,
    },
    summary,
  };
}
