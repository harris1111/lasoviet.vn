import type {
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
      icon: "calendar-day",
      color: "var(--gold-500)",
      status: "Xem trước",
      statusKind: "preview",
      title: "Xem Ngày Tốt",
      body: "Chọn loại việc và khoảng thời gian, xem ngày phù hợp kèm lý do — không chấm điểm tổng hợp.",
      href: "/ngay-tot",
      cta: "Xem phương pháp",
      isFunctional: false,
    },
    {
      key: "zodiac",
      icon: "compass",
      color: "var(--gold-500)",
      status: "Xem trước",
      statusKind: "preview",
      title: "12 Con Giáp",
      body: "Tra cứu con giáp, ngũ hành và chu kỳ theo năm sinh, kèm mốc giao thừa âm lịch.",
      href: "/12-con-giap",
      cta: "Xem phương pháp",
      isFunctional: false,
    },
    {
      key: "feng-shui",
      icon: "map-pin",
      color: "#7C8A6E",
      status: "Đang chờ",
      statusKind: "waiting",
      title: "Phong Thủy hướng nhà",
      body: "Công cụ hướng nhà hợp tuổi đang chờ chốt phương pháp trước khi công bố — chưa mở.",
      href: "/phong-thuy/huong-nha",
      cta: "Xem trạng thái",
      isFunctional: false,
    },
    {
      key: "dream-symbols",
      icon: "book-open",
      color: "var(--gold-500)",
      status: "Xem trước",
      statusKind: "preview",
      title: "Giải Mã Giấc Mơ",
      body: "Tra cứu biểu tượng giấc mơ theo góc nhìn dân gian và biểu tượng — không phải dự đoán số.",
      href: "/giai-ma-giac-mo",
      cta: "Xem thư viện",
      isFunctional: false,
    },
    {
      key: "tarot",
      icon: "scroll",
      color: "#9B6358",
      status: "Xem trước",
      statusKind: "preview",
      title: "Tarot / Bói Bài",
      body: "Một lá hôm nay hoặc ba lá cho một câu hỏi — đang hoàn thiện trước khi ra mắt.",
      href: "/boi-bai",
      cta: "Xem phương pháp",
      isFunctional: false,
    },
    {
      key: "lunar-calendar",
      icon: "calendar-day",
      color: "#6E8C89",
      status: "Xem trước",
      statusKind: "preview",
      title: "Lịch Âm",
      body: "Xem ngày âm–dương song song, can chi và quy đổi lịch cho một ngày bất kỳ.",
      href: "/lich-am",
      cta: "Xem phương pháp",
      isFunctional: false,
    },
    {
      key: "palmistry",
      icon: "user-circle",
      color: "#8A8172",
      status: "Thử nghiệm",
      statusKind: "experimental",
      title: "Xem Chỉ Tay",
      body: "Pilot nhận diện đường chỉ tay qua ảnh, cần sự đồng ý riêng cho dữ liệu sinh trắc học — chưa mở.",
      href: "/xem-chi-tay",
      cta: "Xem trạng thái",
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
      q: 'Vì sao một số công cụ ghi "Đang chờ" hoặc "Thử nghiệm" thay vì "Xem trước"?',
      a: "Phong Thủy hướng nhà đang chờ chốt đúng một phương pháp trước khi công bố công khai. Xem Chỉ Tay là một pilot dùng ảnh sinh trắc học, cần hoàn thiện cơ chế đồng ý riêng trước khi mở, kể cả ở dạng miễn phí.",
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
      icon: "calendar-day",
      color: "var(--gold-500)",
      status: "Preview",
      statusKind: "preview",
      title: "Good Days Selection",
      body: "Choose an activity and date range to view eligible days with transparent rationale — no composite scores.",
      href: "/en/ngay-tot",
      cta: "View method",
      isFunctional: false,
    },
    {
      key: "zodiac",
      icon: "compass",
      color: "var(--gold-500)",
      status: "Preview",
      statusKind: "preview",
      title: "12 Zodiac Signs",
      body: "Look up zodiac signs, elements, and cycles by birth year with Lunar New Year transition points.",
      href: "/en/12-con-giap",
      cta: "View method",
      isFunctional: false,
    },
    {
      key: "feng-shui",
      icon: "map-pin",
      color: "#7C8A6E",
      status: "Pending",
      statusKind: "waiting",
      title: "House Direction Feng Shui",
      body: "The house direction alignment tool is awaiting a singular standardized method before release — not yet open.",
      href: "/en/phong-thuy/huong-nha",
      cta: "View status",
      isFunctional: false,
    },
    {
      key: "dream-symbols",
      icon: "book-open",
      color: "var(--gold-500)",
      status: "Preview",
      statusKind: "preview",
      title: "Dream Symbol Interpretation",
      body: "Explore dream symbols across folkloric and psychological perspectives — not numerology or lotteries.",
      href: "/en/giai-ma-giac-mo",
      cta: "View library",
      isFunctional: false,
    },
    {
      key: "tarot",
      icon: "scroll",
      color: "#9B6358",
      status: "Preview",
      statusKind: "preview",
      title: "Tarot Reading",
      body: "One card daily or three cards for a focused inquiry — undergoing refinement prior to launch.",
      href: "/en/boi-bai",
      cta: "View method",
      isFunctional: false,
    },
    {
      key: "lunar-calendar",
      icon: "calendar-day",
      color: "#6E8C89",
      status: "Preview",
      statusKind: "preview",
      title: "Lunar Calendar",
      body: "View synchronized solar-lunar dates, sexagenary stems/branches, and calendar conversion for any day.",
      href: "/en/lich-am",
      cta: "View method",
      isFunctional: false,
    },
    {
      key: "palmistry",
      icon: "user-circle",
      color: "#8A8172",
      status: "Experimental",
      statusKind: "experimental",
      title: "Palmistry",
      body: "Pilot palm line recognition from photo requiring dedicated biometric consent — not yet open.",
      href: "/en/xem-chi-tay",
      cta: "View status",
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
      q: 'Why are some tools marked "Pending" or "Experimental" rather than "Preview"?',
      a: "House Direction Feng Shui is awaiting a single finalized school before public release. Palmistry is a biometric pilot requiring distinct consent workflows before opening.",
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

    if (route.template === "gated-preview") {
      const isFengShui = toolKey === "feng-shui";
      const isVi = locale === "vi";
      const gated: GatedPreviewPageModel = {
        kind: "gated-preview",
        template: "gated-preview",
        toolKey,
        slug: route.path,
        locale,
        title: isFengShui
          ? isVi ? "Phong Thủy Hướng Nhà" : "House Direction Feng Shui"
          : isVi ? "Xem Chỉ Tay" : "Palmistry",
        eyebrow: isFengShui
          ? isVi ? "Đang chờ chốt phương pháp" : "Pending methodology finalization"
          : isVi ? "Pilot đang chuẩn bị" : "Pilot in preparation",
        notice: isFengShui
          ? isVi
            ? "Trước khi công bố công cụ này, Lá Số Việt cần chốt đúng một trường phái và một bộ dữ liệu đầu vào/đầu ra cụ thể — thay vì gộp nhiều trường phái khác nhau vào một kết quả. Trang này sẽ có nội dung đầy đủ ngay khi quyết định đó được chốt."
            : "Before releasing this tool, La So Viet requires finalizing a single distinct school and defined input/output datasets. Full content will become available once finalized."
          : isVi
            ? "Xem Chỉ Tay dùng ảnh chụp bàn tay — một dạng dữ liệu sinh trắc học. Vì vậy, công cụ này cần cơ chế xin sự đồng ý riêng, chính sách xoá ảnh rõ ràng và hoàn tất trước khi mở, kể cả ở dạng thử nghiệm miễn phí. Trang này sẽ có nội dung đầy đủ khi các điều kiện đó sẵn sàng."
            : "Palmistry uses hand photography — a form of biometric data requiring explicit consent and retention policies prior to opening.",
        subnotice: isFengShui
          ? isVi
            ? 'Lá Số Việt không bán vật phẩm phong thuỷ, bùa hộ mệnh hay bất kỳ sản phẩm "hoá giải vận hạn" nào.'
            : "La So Viet does not sell feng shui items, amulets, or misfortune remedies."
          : isVi
            ? "Sẽ không có phiên bản trả phí cho tới khi độ chính xác, quyền riêng tư và tỷ lệ khiếu nại được đánh giá qua giai đoạn thử nghiệm."
            : "No paid tier will be offered until accuracy, privacy, and dispute metrics are evaluated.",
        ctaText: isVi ? "Lập lá số Tử Vi miễn phí" : "Create Free Zi Wei Chart",
        ctaHref: isVi ? "/tu-vi" : "/en/tu-vi",
        isFunctional: false,
        isAvailable: false,
        gateReason: isFengShui ? "waiting_method" : "biometric_consent_prep",
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
