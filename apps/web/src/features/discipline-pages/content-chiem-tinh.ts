import type { DisciplinePageContent } from "./discipline-page-model";

export const CHIEM_TINH_CONTENT_VI: DisciplinePageContent = {
  key: "chiem-tinh",
  locale: "vi",
  marquee: [
    "MẶT TRỜI · MẶT TRĂNG · CUNG MỌC · NHÀ · GÓC CHIẾU · BẢN ĐỒ SAO ĐANG HOÀN THIỆN ·",
    "MẶT TRỜI · MẶT TRĂNG · CUNG MỌC · NHÀ · GÓC CHIẾU · BẢN ĐỒ SAO ĐANG HOÀN THIỆN ·",
  ],
  hero: {
    eyebrow: "Sắp ra mắt",
    title: "Bản đồ sao / Chiêm tinh Tây phương",
    subtitle:
      "Bản đồ sao ghi lại vị trí Mặt Trời, Mặt Trăng và các hành tinh vào đúng thời điểm và nơi bạn sinh ra, sắp vào 12 cung hoàng đạo và 12 nhà. Vì nhà và Cung Mọc phụ thuộc trực tiếp vào toạ độ nơi sinh, đây là bộ môn duy nhất tại Lá Số Việt bắt buộc phải có nơi sinh chính xác.",
    note: "Bản đồ sao sẽ dùng chung hồ sơ sinh với Tử Vi — bạn chỉ cần bổ sung nơi sinh chính xác khi tính năng này ra mắt.",
    ctaPrimaryText: "Lập lá số Tử Vi miễn phí",
    ctaPrimaryHref: "/tu-vi",
    ctaSecondaryText: "Xem bản đồ sao mẫu",
    ctaSecondaryHref: "#ban-do-sao-mau",
    previewDisclaimer:
      "Chưa có công cụ lập bản đồ sao trực tiếp — trang này giới thiệu phương pháp và một hồ sơ minh hoạ, không phải kết quả tính từ dữ liệu thật.",
    previewBadge: "12 Cung & 12 Nhà",
  },
  freeValue: {
    eyebrow: "02 · Khi ra mắt",
    title: "Bạn sẽ nhận được gì trong bản đồ sao miễn phí",
    items: [
      { num: "01", title: "Bản đồ tròn Natal Chart", body: "Vòng hoàng đạo với vị trí chính xác của 10 thiên thể chính." },
      { num: "02", title: "Bộ ba cốt lõi Big 3", body: "Phân tích dấu hiệu Mặt Trời, Mặt Trăng và Cung Mọc (Ascendant)." },
      { num: "03", title: "Phân bổ 12 Nhà", body: "Vị trí các hành tinh trong 12 lĩnh vực đời sống cụ thể." },
      { num: "04", title: "Bảng góc chiếu chính", body: "Các góc trùng tụ, tam hợp, lục hợp, vuông góc và đối đỉnh." },
      { num: "05", title: "Tỉ lệ 4 nguyên tố & 3 tính chất", body: "Đo lường cân bằng Lửa, Đất, Khí, Nước và Tiên phong, Cố định, Biến đổi." },
      { num: "06", title: "Dữ liệu thiên văn Swiss Ephemeris", body: "Độ chính xác tọa độ vị trí hành tinh theo chuẩn thiên văn quốc tế." },
    ],
  },
  sampleResult: {
    eyebrow: "03 · Cấu trúc mẫu",
    title: "Bản đồ sao trông như thế nào",
    note: "Hồ sơ dưới đây là ví dụ minh hoạ cấu trúc — không phải dữ liệu người dùng thật và chưa qua engine tính toán thiên văn.",
    disclosure: "Bản đồ sao minh họa phương pháp, không phải kết quả tính từ dữ liệu thật.",
    subnote: "Bảng hành tinh, điểm mọc và góc chiếu sẽ hiển thị chi tiết khi ra mắt.",
  },
  glossary: {
    eyebrow: "04 · Thuật ngữ cốt lõi",
    title: "Đọc bản đồ sao mà không bị ngợp thuật ngữ",
    items: [
      { term: "Cung Mặt Trời (Sun Sign)", body: "Bản ngã, ý chí cốt lõi và hướng đi trung tâm của năng lượng sống." },
      { term: "Cung Mặt Trăng (Moon Sign)", body: "Thế giới cảm xúc, phản xạ tự nhiên và nhu cầu an toàn bên trong." },
      { term: "Cung Mọc (Ascendant)", body: "Lăng kính bạn nhìn đời và ấn tượng đầu tiên người khác thấy ở bạn." },
      { term: "Hệ thống Nhà (Houses)", body: "12 khu vực kinh nghiệm sống từ bản thân, tài chính đến sự nghiệp." },
      { term: "Góc chiếu (Aspects)", body: "Mối liên hệ hình học giữa các hành tinh tạo nên sự thuận lợi hoặc xung đột." },
    ],
  },
  method: {
    eyebrow: "05 · Minh bạch phương pháp",
    title: "Cơ sở tính toán sẽ được công bố khi ra mắt",
    note: "Chiêm tinh học phương Tây dựa trên tính toán thiên văn chính xác về vị trí hành tinh trên bầu trời.",
    rows: [
      { label: "Engine thiên văn", value: "Tính toán vị trí thiên thể dựa trên Swiss Ephemeris chuẩn xác." },
      { label: "Hệ thống Nhà", value: "Hỗ trợ hệ Placidus tiêu chuẩn và Whole Sign theo tùy chọn người dùng." },
      { label: "Hệ Hoàng đạo", value: "Sử dụng Tropical Zodiac chuẩn phương Tây phổ biến nhất." },
      { label: "Dung sai góc (Orb)", value: "Áp dụng bảng dung sai góc chặt chẽ để tránh suy diễn lan man." },
    ],
    footnote: "Lá Số Việt tính toán tọa độ chính xác trước khi tổng hợp luận giải — không dùng dữ liệu cung mặt trời đơn giản hóa.",
  },
  limitations: {
    eyebrow: "06 · Giới hạn",
    title: "Nội dung tham khảo, không thay thế chuyên môn",
    items: [
      "Chiêm tinh mô tả cấu trúc tâm lý và khuynh hướng hành vi, không dự báo sự kiện định mệnh chắc chắn.",
      "Cần giờ sinh và địa điểm sinh chính xác để xác định đúng Cung Mọc và hệ thống Nhà.",
      "Không thay thế tư vấn tâm lý, y khoa hay quyết định pháp lý cá nhân.",
      "Không nên dùng để gán nhãn tính cách phiến diện trong các mối quan hệ xã hội.",
      "Lá Số Việt cam kết bảo mật tuyệt đối tọa độ và dữ liệu sinh của bạn.",
    ],
  },
  knowledgeFaq: {
    eyebrow: "07 · Đọc thêm",
    title: "Trong lúc chờ Chiêm Tinh",
    note: "Tìm hiểu sự đối chiếu thú vị giữa hệ thống 12 cung Đông phương và 12 nhà Tây phương tại kho tri thức Lá Số Việt.",
    linkText: "Xem các hệ quy chiếu Đông Tây",
    linkHref: "/kien-thuc",
    faqHeading: "Câu hỏi thường gặp",
    faqs: [
      { num: "01", q: "Tại sao Chiêm Tinh cần nơi sinh chính xác?", a: "Vì vòng quay Trái Đất làm Cung Mọc thay đổi khoảng 1 độ mỗi 4 phút, tọa độ địa lý quyết định góc nhìn bầu trời lúc bạn chào đời." },
      { num: "02", q: "Bản đồ sao có giống tử vi 12 chòm sao trên báo không?", a: "Không, tử vi báo chí chỉ xem một vị trí Mặt Trời; bản đồ sao cá nhân tính toàn bộ hành tinh và góc chiếu thực tế." },
      { num: "03", q: "Lá Số Việt dùng hệ thống nhà nào?", a: "Mặc định sử dụng hệ Placidus phổ biến và hỗ trợ tùy chọn Whole Sign khi ra mắt." },
    ],
    ctaHeading: "Bắt đầu với lá số Tử Vi miễn phí",
    ctaBody: "Hồ sơ sinh bạn nhập hôm nay sẽ dùng lại ngay cho Bản đồ sao khi tính năng mở cửa.",
    ctaButtonText: "Lập lá số Tử Vi miễn phí",
    ctaButtonHref: "/tu-vi",
  },
};

export const CHIEM_TINH_CONTENT_EN: DisciplinePageContent = {
  key: "chiem-tinh",
  locale: "en",
  marquee: [
    "SUN · MOON · ASCENDANT · HOUSES · ASPECTS · NATAL CHART COMING SOON ·",
    "SUN · MOON · ASCENDANT · HOUSES · ASPECTS · NATAL CHART COMING SOON ·",
  ],
  hero: {
    eyebrow: "Coming soon",
    title: "Natal Chart / Western Astrology",
    subtitle:
      "A natal chart maps the exact positions of the Sun, Moon, and planets at the moment and location of birth across 12 signs and 12 houses. Because houses and the Ascendant depend on geographic coordinates, this discipline strictly requires birth location.",
    note: "Western Astrology shares the same birth profile with Zi Wei — simply confirm exact coordinates when live.",
    ctaPrimaryText: "Build free Zi Wei chart",
    ctaPrimaryHref: "/en/tu-vi",
    ctaSecondaryText: "View sample natal chart",
    ctaSecondaryHref: "#ban-do-sao-mau",
    previewDisclaimer:
      "Direct chart casting is not yet live — this page introduces the methodology with an illustrative chart, not real user data.",
    previewBadge: "12 Signs & 12 Houses",
  },
  freeValue: {
    eyebrow: "02 · At launch",
    title: "What you receive in the free natal chart",
    items: [
      { num: "01", title: "Circular Natal Chart wheel", body: "Zodiac wheel with accurate placement of 10 primary planetary bodies." },
      { num: "02", title: "The Big 3 breakdown", body: "Essential synthesis of Sun sign, Moon sign, and Ascendant." },
      { num: "03", title: "12 Houses mapping", body: "Planetary distribution across 12 specific domains of experience." },
      { num: "04", title: "Major aspects grid", body: "Conjunctions, trines, sextiles, squares, and oppositions." },
      { num: "05", title: "Elements & modalities balance", body: "Assessment of Fire, Earth, Air, Water, Cardinal, Fixed, Mutable." },
      { num: "06", title: "Swiss Ephemeris precision", body: "Astronomical planetary coordinates adhering to international standards." },
    ],
  },
  sampleResult: {
    eyebrow: "03 · Sample structure",
    title: "What a natal chart looks like",
    note: "The profile below illustrates structural layout — not actual user data and not computed by the ephemeris.",
    disclosure: "Illustrative chart sample demonstrating structure, not a real user chart.",
    subnote: "Planetary table, angles, and aspect lines will display in full detail once live.",
  },
  glossary: {
    eyebrow: "04 · Core terms",
    title: "Understanding natal charts without jargon overload",
    items: [
      { term: "Sun Sign", body: "Core conscious identity, vital will, and central evolutionary direction." },
      { term: "Moon Sign", body: "Emotional architecture, instinctive reactions, and internal sanctuary needs." },
      { term: "Ascendant (Rising)", body: "The personal lens meeting the world and initial impression conveyed." },
      { term: "House System", body: "12 life sectors spanning selfhood, resources, relationships, and legacy." },
      { term: "Major Aspects", body: "Geometric angle relationships creating natural synthesis or tension." },
    ],
  },
  method: {
    eyebrow: "05 · Method transparency",
    title: "Calculation foundations disclosed at launch",
    note: "Western Astrology relies on rigorous celestial mechanics calculating planetary positions against the horizon.",
    rows: [
      { label: "Ephemeris engine", value: "High-precision celestial calculations utilizing the Swiss Ephemeris library." },
      { label: "House system", value: "Defaulting to Placidus with optional Whole Sign house calculation." },
      { label: "Zodiac frame", value: "Tropical Zodiac standard universally utilized in contemporary Western practice." },
      { label: "Aspect orbs", value: "Tight, conservative angular tolerance allowances to eliminate spurious readings." },
    ],
    footnote: "La So Viet calculates astronomical coordinates directly — never relying on generic sun-sign horoscopes.",
  },
  limitations: {
    eyebrow: "06 · Limitations",
    title: "Reference insights, not professional substitutes",
    items: [
      "Astrology describes psychological potentials and timing currents, not fixed fatalism.",
      "Requires accurate birth time and location coordinates for meaningful house division.",
      "Not a replacement for psychiatric, clinical, financial, or legal professional services.",
      "Must not be used to impose reductive stereotypes in personal relationships.",
      "La So Viet safeguards all coordinates and birth inputs with strict privacy standards.",
    ],
  },
  knowledgeFaq: {
    eyebrow: "07 · Further reading",
    title: "While waiting for Astrology",
    note: "Discover cross-cultural parallels between Eastern 12 palaces and Western 12 houses in our library.",
    linkText: "Compare East-West frameworks",
    linkHref: "/en/kien-thuc",
    faqHeading: "Frequently asked questions",
    faqs: [
      { num: "01", q: "Why is exact birth location necessary for Astrology?", a: "Earth's rotation shifts the Ascendant degree every 4 minutes; exact coordinates anchor your precise horizon." },
      { num: "02", q: "Is this identical to daily newspaper horoscopes?", a: "No, pop horoscopes only examine the Sun; personal charts compute all planets and geometric aspects." },
      { num: "03", q: "Which house system does La So Viet utilize?", a: "Placidus is provided by default with Whole Sign options available at release." },
    ],
    ctaHeading: "Start with a free Zi Wei chart",
    ctaBody: "Your birth profile created today will immediately connect with your Natal Chart when released.",
    ctaButtonText: "Build free Zi Wei chart",
    ctaButtonHref: "/en/tu-vi",
  },
};
