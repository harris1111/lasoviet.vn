export type ZiweiPresentationLocale = "en" | "vi";

type LocalizedMap = Record<ZiweiPresentationLocale, Record<string, string>>;

const palaces: LocalizedMap = {
  en: {
    life: "Life Palace", siblings: "Siblings Palace", spouse: "Spouse Palace",
    children: "Children Palace", wealth: "Wealth Palace", health: "Health Palace",
    travel: "Travel Palace", friends: "Friends Palace", career: "Career Palace",
    property: "Property Palace", fortune: "Fortune Palace", parents: "Parents Palace",
  },
  vi: {
    life: "Cung Mệnh", siblings: "Cung Huynh Đệ", spouse: "Cung Phu Thê",
    children: "Cung Tử Tức", wealth: "Cung Tài Bạch", health: "Cung Tật Ách",
    travel: "Cung Thiên Di", friends: "Cung Nô Bộc", career: "Cung Quan Lộc",
    property: "Cung Điền Trạch", fortune: "Cung Phúc Đức", parents: "Cung Phụ Mẫu",
  },
};

const branches: LocalizedMap = {
  en: {
    rat: "Rat", ox: "Ox", tiger: "Tiger", rabbit: "Rabbit", dragon: "Dragon",
    snake: "Snake", horse: "Horse", goat: "Goat", monkey: "Monkey",
    rooster: "Rooster", dog: "Dog", pig: "Pig",
  },
  vi: {
    rat: "Tý", ox: "Sửu", tiger: "Dần", rabbit: "Mão", dragon: "Thìn",
    snake: "Tỵ", horse: "Ngọ", goat: "Mùi", monkey: "Thân",
    rooster: "Dậu", dog: "Tuất", pig: "Hợi",
  },
};

const stars: LocalizedMap = {
  en: {
    ziwei: "Zi Wei", tianji: "Tian Ji", taiyang: "Tai Yang", wuqu: "Wu Qu",
    tiantong: "Tian Tong", lianzhen: "Lian Zhen", tianfu: "Tian Fu",
    taiyin: "Tai Yin", tanlang: "Tan Lang", jumen: "Ju Men",
    tianxiang: "Tian Xiang", tianliang: "Tian Liang", qisha: "Qi Sha",
    pojun: "Po Jun", zuofu: "Zuo Fu", youbi: "You Bi", wenchang: "Wen Chang",
    wenqu: "Wen Qu", lucun: "Lu Cun", tianma: "Tian Ma",
    qingyang: "Qing Yang", tuoluo: "Tuo Luo", huoxing: "Huo Xing",
    lingxing: "Ling Xing", tiankui: "Tian Kui", tianyue: "Tian Yue",
    dikong: "Di Kong", dijie: "Di Jie",
  },
  vi: {
    ziwei: "Tử Vi", tianji: "Thiên Cơ", taiyang: "Thái Dương", wuqu: "Vũ Khúc",
    tiantong: "Thiên Đồng", lianzhen: "Liêm Trinh", tianfu: "Thiên Phủ",
    taiyin: "Thái Âm", tanlang: "Tham Lang", jumen: "Cự Môn",
    tianxiang: "Thiên Tướng", tianliang: "Thiên Lương", qisha: "Thất Sát",
    pojun: "Phá Quân", zuofu: "Tả Phù", youbi: "Hữu Bật", wenchang: "Văn Xương",
    wenqu: "Văn Khúc", lucun: "Lộc Tồn", tianma: "Thiên Mã",
    qingyang: "Kình Dương", tuoluo: "Đà La", huoxing: "Hỏa Tinh",
    lingxing: "Linh Tinh", tiankui: "Thiên Khôi", tianyue: "Thiên Việt",
    dikong: "Địa Không", dijie: "Địa Kiếp",
  },
};

const brightnesses: LocalizedMap = {
  en: {
    exalted: "Exalted",
    prosperous: "Prosperous",
    favorable: "Favorable",
    neutral: "Neutral",
    unfavorable: "Unfavorable",
    weak: "Weak",
  },
  vi: {
    exalted: "Miếu",
    prosperous: "Vượng",
    favorable: "Đắc",
    neutral: "Bình",
    unfavorable: "Hãm",
    weak: "Nhược",
  },
};

const transformations: LocalizedMap = {
  en: {
    prosperity: "Prosperity",
    power: "Power",
    fame: "Fame",
    obstacle: "Obstacle",
  },
  vi: {
    prosperity: "Hóa Lộc",
    power: "Hóa Quyền",
    fame: "Hóa Khoa",
    obstacle: "Hóa Kỵ",
  },
};

const genders: LocalizedMap = {
  en: { male: "Male", female: "Female" },
  vi: { male: "Nam", female: "Nữ" },
};

const calendarKinds: LocalizedMap = {
  en: { solar: "Solar calendar", lunar: "Lunar calendar" },
  vi: { solar: "Dương lịch", lunar: "Âm lịch" },
};

const timePrecisions: LocalizedMap = {
  en: {
    exact_minute: "Exact minute",
    branch_only: "Earthly branch",
    range: "Time range",
    unknown: "Unknown",
  },
  vi: {
    exact_minute: "Chính xác theo phút",
    branch_only: "Theo địa chi",
    range: "Khoảng giờ",
    unknown: "Chưa rõ",
  },
};

const evidenceLabels: LocalizedMap = {
  en: {
    "life-palace": "Life Palace evidence",
    "body-palace": "Body Palace evidence",
    transformations: "Transformation evidence",
  },
  vi: {
    "life-palace": "Căn cứ Cung Mệnh",
    "body-palace": "Căn cứ Cung Thân",
    transformations: "Căn cứ Tứ Hóa",
  },
};

const insightLabels: LocalizedMap = {
  en: {
    "life-palace": "Life Palace identity signal",
    "body-palace": "Body Palace identity signal",
    transformations: "Transformation pattern",
    "life-palace-strength": "Life Palace strength",
    "body-palace-transformations-tension": "Body Palace and transformations tension",
  },
  vi: {
    "life-palace": "Tín hiệu bản mệnh từ Cung Mệnh",
    "body-palace": "Tín hiệu bản mệnh từ Cung Thân",
    transformations: "Mẫu hình Tứ Hóa",
    "life-palace-strength": "Thế mạnh từ Cung Mệnh",
    "body-palace-transformations-tension": "Điểm căng giữa Cung Thân và Tứ Hóa",
  },
};

const offers: LocalizedMap = {
  en: { "ZIWEI-IDENTITY-P0": "Identity and potential" },
  vi: { "ZIWEI-IDENTITY-P0": "Bản mệnh và tiềm năng" },
};

const chrome = {
  en: {
    chartAria: "Zi Wei chart",
    viewMode: "Chart view",
    chartView: "Chart",
    listView: "List",
    listAria: "Twelve palaces",
    soulMarker: "Life",
    bodyMarker: "Body",
    noStars: "No principal stars",
    evidenceOpen: "View evidence",
    evidenceError: "Evidence cannot be opened right now.",
    evidenceDialog: "Interpretation evidence",
    evidenceClose: "Close evidence",
    evidenceEyebrow: "Interpretation evidence",
    chartFacts: "Chart facts",
  },
  vi: {
    chartAria: "Lá số Tử Vi",
    viewMode: "Chế độ xem lá số",
    chartView: "Sơ đồ",
    listView: "Danh sách",
    listAria: "Danh sách 12 cung",
    soulMarker: "Mệnh",
    bodyMarker: "Thân",
    noStars: "Không có sao chính",
    evidenceOpen: "Xem căn cứ",
    evidenceError: "Không thể mở căn cứ lúc này.",
    evidenceDialog: "Căn cứ luận giải",
    evidenceClose: "Đóng căn cứ",
    evidenceEyebrow: "Căn cứ luận giải",
    chartFacts: "Dữ liệu lá số",
  },
} as const;

function suffix(value: string): string {
  return value.split(".").at(-1) ?? "";
}

function mapped(
  values: LocalizedMap,
  locale: ZiweiPresentationLocale,
  value: string,
  fallback: Record<ZiweiPresentationLocale, string>,
): string {
  return values[locale][suffix(value)] ?? fallback[locale];
}

export function ziweiPresentation(locale: ZiweiPresentationLocale) {
  const palace = (value: string) => mapped(
    palaces, locale, value, { en: "Zi Wei palace", vi: "Cung Tử Vi" },
  );

  return {
    chrome: chrome[locale],
    palace,
    branch: (value: string) => mapped(
      branches, locale, value, { en: "Earthly branch", vi: "Địa chi" },
    ),
    star: (value: string) => mapped(
      stars, locale, value, { en: "Zi Wei star", vi: "Sao Tử Vi" },
    ),
    brightness: (value: string) => mapped(
      brightnesses, locale, value, { en: "Standard brightness", vi: "Độ sáng tiêu chuẩn" },
    ),
    transformation: (value: string) => mapped(
      transformations, locale, value, { en: "Transformation", vi: "Hóa khí" },
    ),
    gender: (value?: string) =>
      value ? mapped(
        genders, locale, value, { en: "Unspecified", vi: "Chưa xác định" },
      ) : (locale === "en" ? "Unspecified" : "Chưa xác định"),
    calendarKind: (value: string) => mapped(
      calendarKinds, locale, value, { en: "Calendar", vi: "Lịch" },
    ),
    timePrecision: (value: string) => mapped(
      timePrecisions, locale, value, { en: "Time precision", vi: "Độ chính xác giờ" },
    ),
    evidence: (value: string) => mapped(
      evidenceLabels, locale, value, { en: "Chart evidence", vi: "Căn cứ lá số" },
    ),
    insight: (value: string) => mapped(
      insightLabels, locale, value, { en: "Identity insight", vi: "Nhận định bản mệnh" },
    ),
    offer: (value: string) =>
      offers[locale][value] ??
      (locale === "en" ? "Identity reading" : "Luận giải bản mệnh"),
    fact(value: string) {
      if (value.startsWith("palaces.") && value.endsWith(".earthlyBranchId")) {
        const palaceId = value.slice(
          "palaces.".length,
          -".earthlyBranchId".length,
        );
        return locale === "en"
          ? `${palace(palaceId)} branch`
          : `Địa chi của ${palace(palaceId)}`;
      }
      const facts: LocalizedMap = {
        en: {
          soulPalaceId: "Life Palace",
          bodyPalaceId: "Body Palace",
          transformations: "Four transformations",
          "provenance.ruleSetId": "Calculation ruleset",
        },
        vi: {
          soulPalaceId: "Cung Mệnh",
          bodyPalaceId: "Cung Thân",
          transformations: "Tứ Hóa",
          "provenance.ruleSetId": "Bộ quy tắc tính toán",
        },
      };
      return facts[locale][value] ??
        (locale === "en" ? "Chart data field" : "Dữ liệu lá số");
    },
  };
}
