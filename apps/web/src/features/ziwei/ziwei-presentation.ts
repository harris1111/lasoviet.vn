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

const stems: LocalizedMap = {
  en: {
    jia: "Jia", yi: "Yi", bing: "Bing", ding: "Ding", wu: "Wu",
    ji: "Ji", geng: "Geng", xin: "Xin", ren: "Ren", gui: "Gui",
  },
  vi: {
    jia: "Giáp", yi: "Ất", bing: "Bính", ding: "Đinh", wu: "Mậu",
    ji: "Kỷ", geng: "Canh", xin: "Tân", ren: "Nhâm", gui: "Quý",
  },
};

const cycleStates: LocalizedMap = {
  en: {
    born: "Birth", infancy: "Infancy", adolescence: "Adolescence", adulthood: "Adulthood",
    prime: "Peak", weak: "Decline", sick: "Sickness", dead: "Death",
    buried: "Tomb", dissipated: "Extinction", embryo: "Embryo", molding: "Nourishment",
    changsheng: "Birth", muyu: "Infancy", guandai: "Adolescence", linguan: "Adulthood",
    diwang: "Peak", shuai: "Decline", bing: "Sickness", si: "Death",
    mu: "Tomb", jue: "Extinction", tai: "Embryo", yang: "Nourishment",
  },
  vi: {
    born: "Trường Sinh", infancy: "Mục Dục", adolescence: "Quan Đới", adulthood: "Lâm Quan",
    prime: "Đế Vượng", weak: "Suy", sick: "Bệnh", dead: "Tử",
    buried: "Mộ", dissipated: "Tuyệt", embryo: "Thai", molding: "Dưỡng",
    changsheng: "Trường Sinh", muyu: "Mục Dục", guandai: "Quan Đới", linguan: "Lâm Quan",
    diwang: "Đế Vượng", shuai: "Suy", bing: "Bệnh", si: "Tử",
    mu: "Mộ", jue: "Tuyệt", tai: "Thai", yang: "Dưỡng",
  },
};

const stars: LocalizedMap = {
  en: {
    // 14 Principal major stars
    ziwei: "Zi Wei", tianji: "Tian Ji", taiyang: "Tai Yang", wuqu: "Wu Qu",
    tiantong: "Tian Tong", lianzhen: "Lian Zhen", tianfu: "Tian Fu",
    taiyin: "Tai Yin", tanlang: "Tan Lang", jumen: "Ju Men",
    tianxiang: "Tian Xiang", tianliang: "Tian Liang", qisha: "Qi Sha",
    pojun: "Po Jun",

    // 14 Minor stars
    zuofu: "Zuo Fu", youbi: "You Bi", wenchang: "Wen Chang",
    wenqu: "Wen Qu", lucun: "Lu Cun", tianma: "Tian Ma",
    qingyang: "Qing Yang", tuoluo: "Tuo Luo", huoxing: "Huo Xing",
    lingxing: "Ling Xing", tiankui: "Tian Kui", tianyue: "Tian Yue",
    dikong: "Di Kong", dijie: "Di Jie",

    // Adjective stars
    hongluan: "Hong Luan", tianxi: "Tian Xi", tianyao: "Tian Yao",
    xianchi: "Xian Chi", jieshen: "Jie Shen", santai: "San Tai",
    bazuo: "Ba Zuo", enguang: "En Guang", tiangui: "Tian Gui",
    longchi: "Long Chi", fengge: "Feng Ge", tiancai: "Tian Cai",
    tianshou: "Tian Shou", taifu: "Tai Fu", fenggao: "Feng Gao",
    tianwu: "Tian Wu", huagai: "Hua Gai", tianguan: "Tian Guan",
    "tianfu-adj": "Tian Fu (Adj)", tianchu: "Tian Chu",
    "tianyue-adj": "Tian Yue (Adj)", tiande: "Tian De", yuede: "Yue De",
    tiankong: "Tian Kong", xunkong: "Xun Kong", jielu: "Jie Lu",
    kongwang: "Kong Wang", longde: "Long De", jiekong: "Jie Kong",
    jiesha: "Jie Sha", dahao: "Da Hao", guchen: "Gu Chen",
    guasu: "Gua Su", feilian: "Fei Lian", posui: "Po Sui",
    tianxing: "Tian Xing", yinsha: "Yin Sha", tianku: "Tian Ku",
    tianxu: "Tian Xu", tianshi: "Tian Shi", tianshang: "Tian Shang",
    nianjie: "Nian Jie",

    // Boshi 12
    boshi: "Bo Shi", lishi: "Li Shi", qinglong: "Qing Long",
    xiaohao: "Xiao Hao", jiangjun: "Jiang Jun", zhoushu: "Zhou Shu",
    "feilian-dec": "Fei Lian", xishen: "Xi Shen", bingfu: "Bing Fu",
    "dahao-dec": "Da Hao", fubing: "Fu Bing", guanfu: "Guan Fu",

    // Jiangqian 12
    jiangxing: "Jiang Xing", panan: "Pan An", suiyi: "Sui Yi",
    xiishen: "Xi Shen (Jq)", "huagai-dec": "Hua Gai", "jiesha-dec": "Jie Sha",
    zhaisha: "Zhai Sha", tiansha: "Tian Sha", zhibei: "Zhi Bei",
    "xianchi-dec": "Xian Chi", yuesha: "Yue Sha", wangshen: "Wang Shen",

    // Suiqian 12
    suijian: "Sui Jian", huiqi: "Hui Qi", sangmen: "Sang Men",
    guansuo: "Guan Suo", gwanfu: "Guan Fu (Sq)", "xiaohao-sq": "Xiao Hao",
    "longde-dec": "Long De", baihu: "Bai Hu", "tiande-dec": "Tian De",
    diaoke: "Diao Ke", "bingfu-sq": "Bing Fu",
  },
  vi: {
    // 14 Chính tinh
    ziwei: "Tử Vi", tianji: "Thiên Cơ", taiyang: "Thái Dương", wuqu: "Vũ Khúc",
    tiantong: "Thiên Đồng", lianzhen: "Liêm Trinh", tianfu: "Thiên Phủ",
    taiyin: "Thái Âm", tanlang: "Tham Lang", jumen: "Cự Môn",
    tianxiang: "Thiên Tướng", tianliang: "Thiên Lương", qisha: "Thất Sát",
    pojun: "Phá Quân",

    // 14 Phụ tinh / Bàng tinh
    zuofu: "Tả Phù", youbi: "Hữu Bật", wenchang: "Văn Xương",
    wenqu: "Văn Khúc", lucun: "Lộc Tồn", tianma: "Thiên Mã",
    qingyang: "Kình Dương", tuoluo: "Đà La", huoxing: "Hỏa Tinh",
    lingxing: "Linh Tinh", tiankui: "Thiên Khôi", tianyue: "Thiên Việt",
    dikong: "Địa Không", dijie: "Địa Kiếp",

    // Phụ tinh và tạp diệu
    hongluan: "Hồng Loan", tianxi: "Thiên Hỷ", tianyao: "Thiên Diêu",
    xianchi: "Hàm Trì", jieshen: "Giải Thần", santai: "Tam Thai",
    bazuo: "Bát Tọa", enguang: "Ân Quang", tiangui: "Thiên Quý",
    longchi: "Long Trì", fengge: "Phụng Các", tiancai: "Thiên Tài",
    tianshou: "Thiên Thọ", taifu: "Đài Phụ", fenggao: "Phong Cáo",
    tianwu: "Thiên Vu", huagai: "Hoa Cái", tianguan: "Thiên Quan",
    "tianfu-adj": "Thiên Phúc", tianchu: "Thiên Trù",
    "tianyue-adj": "Thiên Nguyệt", tiande: "Thiên Đức", yuede: "Nguyệt Đức",
    tiankong: "Thiên Không", xunkong: "Tuần Không", jielu: "Triệt Lộ",
    kongwang: "Không Vong", longde: "Long Đức", jiekong: "Triệt Không",
    jiesha: "Kiếp Sát", dahao: "Đại Hao", guchen: "Cô Thần",
    guasu: "Quả Tú", feilian: "Phi Liêm", posui: "Phá Toái",
    tianxing: "Thiên Hình", yinsha: "Âm Sát", tianku: "Thiên Khốc",
    tianxu: "Thiên Hư", tianshi: "Thiên Sứ", tianshang: "Thiên Thương",
    nianjie: "Niên Giải",

    // Vòng Bác Sỹ 12
    boshi: "Bác Sỹ", lishi: "Lực Sỹ", qinglong: "Thanh Long",
    xiaohao: "Tiểu Hao", jiangjun: "Tướng Quân", zhoushu: "Tấu Thư",
    "feilian-dec": "Phi Liêm", xishen: "Hỷ Thần", bingfu: "Bệnh Phù",
    "dahao-dec": "Đại Hao", fubing: "Phục Binh", guanfu: "Quan Phủ",

    // Vòng Tướng Tinh 12
    jiangxing: "Tướng Tinh", panan: "Phan Án", suiyi: "Tuế Dịch",
    xiishen: "Tức Thần", "huagai-dec": "Hoa Cái", "jiesha-dec": "Kiếp Sát",
    zhaisha: "Tai Sát", tiansha: "Thiên Sát", zhibei: "Chỉ Bối",
    "xianchi-dec": "Hàm Trì", yuesha: "Nguyệt Sát", wangshen: "Vong Thần",

    // Vòng Tuế Kiến 12
    suijian: "Tuế Kiện", huiqi: "Hối Khí", sangmen: "Tang Môn",
    guansuo: "Quán Tác", gwanfu: "Quan Phù", "xiaohao-sq": "Tiểu Hao",
    "longde-dec": "Long Đức", baihu: "Bạch Hổ", "tiande-dec": "Thiên Đức",
    diaoke: "Điếu Khách", "bingfu-sq": "Bệnh Phù",
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
  en: { "ZIWEI-IDENTITY-P0": "Comprehensive Zi Wei reading" },
  vi: { "ZIWEI-IDENTITY-P0": "Luận giải Tử Vi toàn diện" },
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
  return values[locale][suffix(value)] ?? values[locale][value] ?? fallback[locale];
}

export type ZiweiPresentationOptions = {
  strict?: boolean;
};

export function ziweiPresentation(
  locale: ZiweiPresentationLocale,
  options?: ZiweiPresentationOptions,
) {
  const isStrict =
    options?.strict ??
    (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test");

  const palace = (value: string) => mapped(
    palaces, locale, value, { en: "Zi Wei palace", vi: "Cung Tử Vi" },
  );

  const star = (value: string) => {
    const s = suffix(value);
    const found = stars[locale][s] ?? stars[locale][value];
    if (found !== undefined) {
      return found;
    }
    if (isStrict) {
      throw new Error(`Unknown canonical Zi Wei star identifier: "${value}"`);
    }
    return locale === "en" ? "Unknown star" : "Sao chưa xác định";
  };

  const stem = (value: string) => {
    const s = suffix(value);
    const found = stems[locale][s] ?? stems[locale][value];
    if (found !== undefined) {
      return found;
    }
    if (isStrict) {
      throw new Error(`Unknown canonical Zi Wei stem identifier: "${value}"`);
    }
    return locale === "en" ? "Unknown stem" : "Thiên can chưa xác định";
  };

  const cycleState = (value: string) => {
    const s = suffix(value);
    const found = cycleStates[locale][s] ?? cycleStates[locale][value];
    if (found !== undefined) {
      return found;
    }
    if (isStrict) {
      throw new Error(`Unknown canonical Zi Wei cycle state identifier: "${value}"`);
    }
    return locale === "en" ? "Unknown cycle state" : "Vòng Trường Sinh chưa xác định";
  };

  return {
    chrome: chrome[locale],
    palace,
    branch: (value: string) => mapped(
      branches, locale, value, { en: "Earthly branch", vi: "Địa chi" },
    ),
    star,
    stem,
    cycleState,
    cycle: cycleState,
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
      (locale === "en" ? "Comprehensive Zi Wei reading" : "Luận giải Tử Vi toàn diện"),
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
