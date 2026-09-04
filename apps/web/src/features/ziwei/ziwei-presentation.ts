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

const actions: LocalizedMap = {
  en: {
    reflect: "Reflect", explore: "Explore",
    "discuss-with-support": "Discuss with support",
  },
  vi: {
    reflect: "Tự quan sát", explore: "Khám phá thêm",
    "discuss-with-support": "Trao đổi với hỗ trợ",
  },
};

const confidences: LocalizedMap = {
  en: { high: "High", moderate: "Moderate" },
  vi: { high: "Cao", moderate: "Trung bình" },
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

const limitationLabels: LocalizedMap = {
  en: {
    IZTRO_NO_NATIVE_LOCATION_INPUT: "Birth location is not passed directly to the chart engine.",
    IZTRO_NO_NATIVE_TIMEZONE_INPUT: "Timezone is normalized before chart calculation.",
    IZTRO_NO_TRUE_SOLAR_TIME_CORRECTION: "True solar time correction is not applied.",
    TIME_BRANCH_ONLY: "The birth time is known only to an earthly-branch interval.",
    TIME_RANGE_WITHIN_SINGLE_BRANCH: "The birth time is a range within one earthly branch.",
    TIME_RANGE_CROSSES_BRANCHES: "The birth-time range crosses earthly branches.",
    TIME_UNKNOWN: "The exact birth time is unknown.",
    LUNAR_CALENDAR_CONVERSION_DEFERRED: "Lunar calendar conversion is deferred.",
  },
  vi: {
    IZTRO_NO_NATIVE_LOCATION_INPUT: "Nơi sinh chưa được truyền trực tiếp vào engine lập lá số.",
    IZTRO_NO_NATIVE_TIMEZONE_INPUT: "Múi giờ được chuẩn hóa trước khi lập lá số.",
    IZTRO_NO_TRUE_SOLAR_TIME_CORRECTION: "Chưa áp dụng hiệu chỉnh giờ Mặt Trời thực.",
    TIME_BRANCH_ONLY: "Giờ sinh chỉ được biết theo khoảng địa chi.",
    TIME_RANGE_WITHIN_SINGLE_BRANCH: "Giờ sinh là một khoảng nằm trong cùng địa chi.",
    TIME_RANGE_CROSSES_BRANCHES: "Khoảng giờ sinh đi qua nhiều địa chi.",
    TIME_UNKNOWN: "Chưa biết giờ sinh chính xác.",
    LUNAR_CALENDAR_CONVERSION_DEFERRED: "Việc chuyển đổi âm lịch đang được hoãn.",
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
    interpretationBounds: "Interpretation bounds",
    observableActions: "Observable actions",
    factReferences: "Evidence fields",
    limitations: "Limitations",
    confidence: "Confidence",
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
    interpretationBounds: "Giới hạn diễn giải",
    observableActions: "Điều có thể quan sát",
    factReferences: "Trường dữ liệu căn cứ",
    limitations: "Giới hạn",
    confidence: "Độ tin cậy",
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
    action: (value: string) => mapped(
      actions, locale, value, { en: "Supported reflection", vi: "Gợi ý tự quan sát" },
    ),
    confidence: (value: string) => mapped(
      confidences, locale, value, { en: "Recorded", vi: "Đã ghi nhận" },
    ),
    evidence: (value: string) => mapped(
      evidenceLabels, locale, value, { en: "Chart evidence", vi: "Căn cứ lá số" },
    ),
    insight: (value: string) => mapped(
      insightLabels, locale, value, { en: "Identity insight", vi: "Nhận định bản mệnh" },
    ),
    limitation: (value: string) =>
      limitationLabels[locale][value] ??
      (locale === "en"
        ? "A technical limitation is recorded."
        : "Một giới hạn kỹ thuật đã được ghi nhận."),
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
        (locale === "en" ? "Chart data field" : "Trường dữ liệu lá số");
    },
  };
}
