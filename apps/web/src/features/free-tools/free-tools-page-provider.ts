import type {
  FlagshipPreviewPageModel,
  FreeToolKey,
  FreeToolsHubContent,
  FreeToolsPageContext,
  FreeToolsPageModel,
  FreeToolsPageProvider,
  GatedPreviewPageModel,
  UtilityPreviewPageModel,
} from "./free-tools-page-model";

const HUB_CONTENT_VI: FreeToolsHubContent = {
  locale: "vi",
  breadcrumbHome: "Trang chủ",
  breadcrumbCurrent: "Công cụ miễn phí",
  eyebrow: "7 công cụ",
  title: "Công cụ miễn phí",
  description:
    "Bảy tiện ích văn hoá Việt không cần lập hồ sơ sinh đầy đủ — mỗi công cụ giải quyết một câu hỏi hẹp, công khai phương pháp, và không dùng điểm số may rủi tổng hợp.",
  tools: [
    {
      key: "good-days",
      group: "Tra cứu thời gian",
      icon: "calendar-day",
      color: "var(--gold-500)",
      status: "Xem trước",
      statusKind: "preview",
      title: "Xem Ngày Tốt",
      body: "Chọn loại việc và khoảng thời gian, xem ngày phù hợp kèm lý do — không chấm điểm tổng hợp.",
      href: "/ngay-tot",
      cta: "Xem phương pháp",
      inputNeeded: "Loại việc + khoảng ngày",
      output: "Danh sách ngày kèm lý do",
      timeEstimate: "< 1 phút",
      isFunctional: false,
    },
    {
      key: "zodiac",
      group: "Tra cứu thời gian",
      icon: "compass",
      color: "var(--gold-500)",
      status: "Xem trước",
      statusKind: "preview",
      title: "12 Con Giáp",
      body: "Tra cứu con giáp, ngũ hành và chu kỳ theo năm sinh, kèm mốc giao thừa âm lịch.",
      href: "/12-con-giap",
      cta: "Xem phương pháp",
      inputNeeded: "Năm sinh dương lịch",
      output: "Con giáp, Can Chi, ngũ hành",
      timeEstimate: "< 1 phút",
      isFunctional: false,
    },
    {
      key: "lunar-calendar",
      group: "Tra cứu thời gian",
      icon: "calendar-day",
      color: "#6E8C89",
      status: "Xem trước",
      statusKind: "preview",
      title: "Lịch Âm",
      body: "Xem ngày âm–dương song song, can chi và quy đổi lịch cho một ngày bất kỳ.",
      href: "/lich-am",
      cta: "Xem phương pháp",
      inputNeeded: "Một ngày dương hoặc âm",
      output: "Ngày quy đổi, Can Chi, giờ hoàng đạo",
      timeEstimate: "< 1 phút",
      isFunctional: false,
    },
    {
      key: "dream-symbols",
      group: "Tự chiêm nghiệm",
      icon: "book-open",
      color: "var(--gold-500)",
      status: "Xem trước",
      statusKind: "preview",
      title: "Giải Mã Giấc Mơ",
      body: "Tra cứu biểu tượng giấc mơ theo góc nhìn dân gian và biểu tượng — không phải dự đoán số.",
      href: "/giai-ma-giac-mo",
      cta: "Xem thư viện",
      inputNeeded: "Từ khoá biểu tượng giấc mơ",
      output: "Hai góc đọc: dân gian + biểu tượng",
      timeEstimate: "2-3 phút",
      isFunctional: false,
    },
    {
      key: "palmistry",
      group: "Tự chiêm nghiệm",
      icon: "user-circle",
      color: "#8A8172",
      status: "Thử nghiệm",
      statusKind: "experimental",
      title: "Xem Chỉ Tay",
      body: "Pilot nhận diện đường chỉ tay qua ảnh, cần sự đồng ý riêng cho dữ liệu sinh trắc học — chưa mở.",
      href: "/xem-chi-tay",
      cta: "Xem trạng thái",
      inputNeeded: "Ảnh lòng bàn tay (chưa mở)",
      output: "Chưa xác định — đang chờ duyệt",
      timeEstimate: "Chưa mở",
      isFunctional: false,
    },
    {
      key: "tarot",
      group: "Đặt một câu hỏi",
      icon: "scroll",
      color: "#9B6358",
      status: "Xem trước",
      statusKind: "preview",
      title: "Tarot / Bói Bài",
      body: "Một lá hôm nay hoặc ba lá cho một câu hỏi — đang hoàn thiện trước khi ra mắt.",
      href: "/boi-bai",
      cta: "Xem phương pháp",
      inputNeeded: "Một câu hỏi cụ thể",
      output: "Trải bài 1 hoặc 3 lá kèm ý nghĩa",
      timeEstimate: "3-5 phút",
      isFunctional: false,
    },
    {
      key: "feng-shui",
      group: "Không gian sống",
      icon: "map-pin",
      color: "#7C8A6E",
      status: "Xem trước",
      statusKind: "preview",
      title: "Phong Thủy hướng nhà",
      body: "So khớp hướng nhà với cung mệnh theo Bát Trạch — utility đã chốt, công thức đang chờ chuyên gia rà soát.",
      href: "/phong-thuy/huong-nha",
      cta: "Xem phương pháp",
      inputNeeded: "Năm sinh, giới tính + hướng nhà đo được",
      output: "La bàn 8 hướng + bảng phân loại kèm mã quy tắc",
      timeEstimate: "< 1 phút",
      isFunctional: false,
    },
  ],
  principles: {
    heading: "Nguyên tắc chung cho cả 7 công cụ",
    items: [
      'Không dùng điểm số "may/rủi" gộp chung nhiều yếu tố khác nhau — mỗi kết quả nêu lý do/quy tắc cụ thể thay vì một con số duy nhất.',
      "Không bán vật phẩm phong thuỷ, bùa hộ mệnh hay sản phẩm hoá giải kèm theo kết quả.",
      "Công cụ nào cần dùng đến hồ sơ sinh sẽ dùng chung mô hình dữ liệu với Tử Vi — không có form nhập liệu riêng lẻ chồng chéo.",
    ],
  },
  faqHeading: "Câu hỏi thường gặp",
  faqs: [
    {
      num: "01",
      q: "Các công cụ này có cần tạo tài khoản không?",
      a: "Không. Cả 7 công cụ đều dùng được ngay mà không cần tài khoản. Một số công cụ có tuỳ chọn lưu vào hồ sơ nếu bạn đã đăng nhập.",
    },
    {
      num: "02",
      q: 'Vì sao Xem Chỉ Tay ghi "Thử nghiệm" thay vì "Xem trước"?',
      a: "Xem Chỉ Tay là một pilot dùng ảnh sinh trắc học, cần hoàn thiện cơ chế đồng ý riêng trước khi mở, kể cả ở dạng miễn phí.",
    },
    {
      num: "03",
      q: "Các công cụ có bán vật phẩm phong thuỷ hoặc vật phẩm hoá giải không?",
      a: 'Không. Lá Số Việt không bán vật phẩm phong thuỷ, bùa hộ mệnh hay bất kỳ sản phẩm "hoá giải vận hạn" nào ở bất kỳ công cụ nào.',
    },
    {
      num: "04",
      q: "Giải Mã Giấc Mơ có liên quan đến số đề hay lô đề không?",
      a: "Không, và sẽ không bao giờ có. Nội dung chỉ trình bày góc nhìn dân gian và biểu tượng, không gợi ý hay liên kết tới bất kỳ hình thức số đề nào.",
    },
  ],
  conversion: {
    heading: "Muốn một bức tranh đầy đủ hơn?",
    body: "Lập lá số Tử Vi miễn phí để xem cấu trúc 12 cung đầy đủ — không cần tài khoản.",
    buttonText: "Lập lá số Tử Vi miễn phí",
    buttonHref: "/tu-vi",
  },
};

const HUB_CONTENT_EN: FreeToolsHubContent = {
  locale: "en",
  breadcrumbHome: "Home",
  breadcrumbCurrent: "Free tools",
  eyebrow: "7 tools",
  title: "Free Tools",
  description:
    "Seven Vietnamese cultural utilities that require no full birth profile — each addresses a focused question, discloses its method, and avoids composite luck scores.",
  tools: [
    {
      key: "good-days",
      group: "Time Lookup",
      icon: "calendar-day",
      color: "var(--gold-500)",
      status: "Preview",
      statusKind: "preview",
      title: "Good Days Selection",
      body: "Choose an activity and date range to view eligible days with transparent rationale — no composite scores.",
      href: "/en/ngay-tot",
      cta: "View method",
      inputNeeded: "Activity type + date range",
      output: "Candidate dates with rationale",
      timeEstimate: "< 1 min",
      isFunctional: false,
    },
    {
      key: "zodiac",
      group: "Time Lookup",
      icon: "compass",
      color: "var(--gold-500)",
      status: "Preview",
      statusKind: "preview",
      title: "12 Zodiac Signs",
      body: "Look up zodiac signs, elements, and cycles by birth year with Lunar New Year transition points.",
      href: "/en/12-con-giap",
      cta: "View method",
      inputNeeded: "Solar birth year",
      output: "Zodiac animal, Can Chi, element",
      timeEstimate: "< 1 min",
      isFunctional: false,
    },
    {
      key: "lunar-calendar",
      group: "Time Lookup",
      icon: "calendar-day",
      color: "#6E8C89",
      status: "Preview",
      statusKind: "preview",
      title: "Lunar Calendar",
      body: "View synchronized solar-lunar dates, sexagenary stems/branches, and calendar conversion for any day.",
      href: "/en/lich-am",
      cta: "View method",
      inputNeeded: "A solar or lunar date",
      output: "Converted date, Can Chi, auspicious hours",
      timeEstimate: "< 1 min",
      isFunctional: false,
    },
    {
      key: "dream-symbols",
      group: "Self-Reflection",
      icon: "book-open",
      color: "var(--gold-500)",
      status: "Preview",
      statusKind: "preview",
      title: "Dream Symbol Interpretation",
      body: "Explore dream symbols across folkloric and psychological perspectives — not numerology or lotteries.",
      href: "/en/giai-ma-giac-mo",
      cta: "View library",
      inputNeeded: "Dream symbol keyword",
      output: "Dual readings: folk + symbolic",
      timeEstimate: "2-3 mins",
      isFunctional: false,
    },
    {
      key: "palmistry",
      group: "Self-Reflection",
      icon: "user-circle",
      color: "#8A8172",
      status: "Experimental",
      statusKind: "experimental",
      title: "Palmistry",
      body: "Pilot palm line recognition from photo requiring dedicated biometric consent — not yet open.",
      href: "/en/xem-chi-tay",
      cta: "View status",
      inputNeeded: "Palm photo (not yet open)",
      output: "Undetermined — pending approval",
      timeEstimate: "Not open",
      isFunctional: false,
    },
    {
      key: "tarot",
      group: "Ask a Question",
      icon: "scroll",
      color: "#9B6358",
      status: "Preview",
      statusKind: "preview",
      title: "Tarot Reading",
      body: "One card daily or three cards for a focused inquiry — undergoing refinement prior to launch.",
      href: "/en/boi-bai",
      cta: "View method",
      inputNeeded: "A specific question",
      output: "1 or 3-card spread with meanings",
      timeEstimate: "3-5 mins",
      isFunctional: false,
    },
    {
      key: "feng-shui",
      group: "Living Space",
      icon: "map-pin",
      color: "#7C8A6E",
      status: "Preview",
      statusKind: "preview",
      title: "House Direction Feng Shui",
      body: "Align house directions with personal trigrams under Eight Mansions — settled utility, formulas awaiting expert review.",
      href: "/en/phong-thuy/huong-nha",
      cta: "View method",
      inputNeeded: "Birth year, gender + measured house orientation",
      output: "8-direction compass + rule-coded classification table",
      timeEstimate: "< 1 min",
      isFunctional: false,
    },
  ],
  principles: {
    heading: "Shared Principles Across All 7 Tools",
    items: [
      'No aggregated "luck/fortune" scores blending disparate factors — every outcome lists specific rules instead of a single number.',
      "No feng shui trinkets, talismans, or remedial merchandise sold alongside results.",
      "Any tool requiring birth profiles shares data models with Zi Wei — no fragmented or overlapping input forms.",
    ],
  },
  faqHeading: "Frequently Asked Questions",
  faqs: [
    {
      num: "01",
      q: "Do these tools require creating an account?",
      a: "No. All 7 tools are accessible immediately without an account. Optional profile saving is available when signed in.",
    },
    {
      num: "02",
      q: 'Why is Palmistry marked "Experimental" rather than "Preview"?',
      a: "Palmistry is a biometric pilot requiring distinct consent workflows before opening, even in free mode.",
    },
    {
      num: "03",
      q: "Do the tools sell feng shui amulets or remedial products?",
      a: "No. La So Viet never sells feng shui items, amulets, or misfortune remedy products on any tool.",
    },
    {
      num: "04",
      q: "Does Dream Symbol Interpretation connect to lottery numbers?",
      a: "No, and it never will. Content strictly presents folkloric and symbolic perspectives without lottery associations.",
    },
  ],
  conversion: {
    heading: "Looking for the Complete Picture?",
    body: "Create a free Zi Wei chart to examine the complete twelve palace structure — no account required.",
    buttonText: "Create Free Zi Wei Chart",
    buttonHref: "/en/tu-vi",
  },
};

const PATH_TO_TOOL_KEY: Record<string, FreeToolKey> = {
  "/ngay-tot": "good-days",
  "/12-con-giap": "zodiac",
  "/phong-thuy/huong-nha": "feng-shui",
  "/giai-ma-giac-mo": "dream-symbols",
  "/boi-bai": "tarot",
  "/lich-am": "lunar-calendar",
  "/xem-chi-tay": "palmistry",
};

export class StaticFreeToolsPageProvider implements FreeToolsPageProvider {
  resolve(context: FreeToolsPageContext): FreeToolsPageModel | null {
    const { route, locale } = context;

    if (route.template === "free-tools-hub" || route.path === "/cong-cu-mien-phi") {
      return {
        kind: "hub",
        template: "free-tools-hub",
        slug: route.path,
        locale,
        content: locale === "vi" ? HUB_CONTENT_VI : HUB_CONTENT_EN,
      };
    }

    const toolKey = PATH_TO_TOOL_KEY[route.path];
    if (!toolKey) return null;

    if (toolKey === "feng-shui") {
      const isVi = locale === "vi";
      const flagship: FlagshipPreviewPageModel = {
        kind: "flagship-preview",
        template: "gated-preview",
        toolKey: "feng-shui",
        slug: route.path,
        locale,
        title: isVi ? "Phong Thủy Hướng Nhà" : "House Direction Feng Shui",
        eyebrow: isVi ? "Sắp ra mắt" : "Coming Soon",
        description: isVi
          ? "So khớp hướng nhà thực đo với cung mệnh gia chủ theo phương pháp Bát Trạch, xem rõ hướng nào thuộc nhóm tốt hay cần lưu ý — kèm đúng lý do, không phải một lời phán chung chung."
          : "Align actual measured house directions with the homeowner's personal trigram under the Eight Mansions method, clarifying which directions are favorable or require caution — with transparent rationale, not a sweeping proclamation.",
        isFunctional: false,
        isAvailable: false,
        preview: {
          sourceKind: "illustrative",
          isIllustrative: true,
          disclosure: isVi
            ? "Chưa có công cụ tính trực tiếp — trang này giới thiệu phương pháp và một hồ sơ minh hoạ, không phải kết quả tính từ dữ liệu thật."
            : "Live calculation is not yet active — this page introduces the methodology and an illustrative profile, not calculated results from live data.",
          data: { toolKey: "feng-shui" },
        },
        faqs: isVi ? HUB_CONTENT_VI.faqs : HUB_CONTENT_EN.faqs,
      };
      return flagship;
    }

    if (toolKey === "palmistry" && route.template === "gated-preview") {
      const isVi = locale === "vi";
      const gated: GatedPreviewPageModel = {
        kind: "gated-preview",
        template: "gated-preview",
        toolKey: "palmistry",
        slug: route.path,
        locale,
        title: isVi ? "Xem Chỉ Tay" : "Palmistry",
        eyebrow: isVi ? "Pilot đang chuẩn bị" : "Pilot in preparation",
        notice: isVi
          ? "Xem Chỉ Tay dùng ảnh chụp bàn tay — một dạng dữ liệu sinh trắc học. Vì vậy, công cụ này cần cơ chế xin sự đồng ý riêng, chính sách xoá ảnh rõ ràng và hoàn tất trước khi mở, kể cả ở dạng thử nghiệm miễn phí. Trang này sẽ có nội dung đầy đủ khi các điều kiện đó sẵn sàng."
          : "Palmistry uses hand photography — a form of biometric data requiring explicit consent and retention policies prior to opening.",
        subnotice: isVi
          ? "Sẽ không có phiên bản trả phí cho tới khi độ chính xác, quyền riêng tư và tỷ lệ khiếu nại được đánh giá qua giai đoạn thử nghiệm."
          : "No paid tier will be offered until accuracy, privacy, and dispute metrics are evaluated.",
        ctaText: isVi ? "Lập lá số Tử Vi miễn phí" : "Create Free Zi Wei Chart",
        ctaHref: isVi ? "/tu-vi" : "/en/tu-vi",
        isFunctional: false,
        isAvailable: false,
        gateReason: "biometric_consent_prep",
      };
      return gated;
    }

    if (route.template === "utility-preview") {
      const isVi = locale === "vi";
      const preview: UtilityPreviewPageModel = {
        kind: "utility-preview",
        template: "utility-preview",
        toolKey,
        slug: route.path,
        locale,
        title: isVi ? "Công cụ xem trước" : "Utility Preview",
        eyebrow: isVi ? "Sắp ra mắt" : "Coming Soon",
        description: isVi
          ? "Tiện ích văn hoá minh hoạ — dữ liệu công khai phương pháp và không chấm điểm may rủi."
          : "Illustrative cultural utility — open methodology without luck scores.",
        isFunctional: false,
        preview: {
          sourceKind: "illustrative",
          isIllustrative: true,
          disclosure: isVi
            ? "Dữ liệu mẫu mang tính chất minh hoạ giao diện và cấu trúc — không tính toán từ lịch thực tế."
            : "Sample illustrative data demonstrating layout and structure — not evaluated from live calendars.",
          data: { toolKey },
        },
        faqs: locale === "vi" ? HUB_CONTENT_VI.faqs : HUB_CONTENT_EN.faqs,
      };
      return preview;
    }

    return null;
  }
}

let freeToolsProviderInstance: FreeToolsPageProvider | null = null;

export function getFreeToolsPageProvider(): FreeToolsPageProvider {
  if (!freeToolsProviderInstance) {
    freeToolsProviderInstance = new StaticFreeToolsPageProvider();
  }
  return freeToolsProviderInstance;
}
