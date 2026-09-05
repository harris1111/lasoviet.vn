import type { DisciplinePageContent } from "./discipline-page-model";

export const BAT_TU_CONTENT_VI: DisciplinePageContent = {
  key: "bat-tu",
  locale: "vi",
  marquee: [
    "TỨ TRỤ · THIÊN CAN ĐỊA CHI · NHẬT CHỦ · TÀNG CAN · NGŨ HÀNH SINH KHẮC · BÁT TỰ ĐANG HOÀN THIỆN ·",
    "TỨ TRỤ · THIÊN CAN ĐỊA CHI · NHẬT CHỦ · TÀNG CAN · NGŨ HÀNH SINH KHẮC · BÁT TỰ ĐANG HOÀN THIỆN ·",
  ],
  hero: {
    eyebrow: "Sắp ra mắt",
    title: "Bát Tự / Tứ Trụ",
    subtitle:
      "Bát Tự nhìn một người qua bốn trụ Năm – Tháng – Ngày – Giờ sinh, quy về Thiên Can và Địa Chi, để thấy cấu trúc ngũ hành và Nhật Chủ của người đó. Lá Số Việt đang hoàn thiện engine tính Tứ Trụ và bộ căn cứ luận giải trước khi phát hành.",
    note: "Bát Tự sẽ dùng chung hồ sơ sinh với Tử Vi — bạn không cần nhập lại ngày, giờ, nơi sinh khi cả hai đều sẵn sàng.",
    ctaPrimaryText: "Lập lá số Tử Vi miễn phí",
    ctaPrimaryHref: "/tu-vi",
    ctaSecondaryText: "Xem cấu trúc Tứ Trụ mẫu",
    ctaSecondaryHref: "#tu-tru-mau",
    previewDisclaimer:
      "Chưa có công cụ lập Bát Tự trực tiếp — trang này giới thiệu phương pháp và một hồ sơ minh hoạ, không phải kết quả tính từ dữ liệu thật.",
    previewBadge: "Bốn trụ, một Nhật Chủ",
  },
  freeValue: {
    eyebrow: "02 · Khi ra mắt",
    title: "Bạn sẽ nhận được gì trong bản Bát Tự miễn phí",
    items: [
      { num: "01", title: "Bảng Tứ Trụ đầy đủ", body: "Năm, Tháng, Ngày, Giờ sinh quy về 4 Can và 4 Chi." },
      { num: "02", title: "Xác định Nhật Chủ", body: "Thiên can ngày sinh — điểm quy chiếu cốt lõi của bản mệnh." },
      { num: "03", title: "Tàng can trong các địa chi", body: "Các can ẩn trong từng chi kèm vai trò sinh khắc." },
      { num: "04", title: "Thập Thần sơ bộ", body: "Xác định 10 thần theo quan hệ giữa Nhật Chủ và can chi khác." },
      { num: "05", title: "Tương quan ngũ hành", body: "Tỉ lệ Kim, Mộc, Thủy, Hỏa, Thổ lộ trong 4 trụ." },
      { num: "06", title: "Dùng chung hồ sơ sinh", body: "Liên kết liền mạch với lá số Tử Vi đã lập." },
    ],
  },
  sampleResult: {
    eyebrow: "03 · Cấu trúc mẫu",
    title: "Tứ Trụ trông như thế nào",
    note: "Hồ sơ dưới đây là ví dụ minh hoạ cấu trúc — không phải dữ liệu người dùng thật và chưa qua engine tính toán.",
    disclosure: "Hồ sơ minh họa phương pháp, không phải kết quả tính từ dữ liệu thật.",
    subnote: "Thập Thần (Ten Gods) và bảng quan hệ hình – xung – hợp – hại sẽ hiển thị cạnh bốn trụ khi tính năng luận giải ra mắt.",
  },
  glossary: {
    eyebrow: "04 · Thuật ngữ cốt lõi",
    title: "Đọc Tứ Trụ mà không bị ngợp thuật ngữ",
    items: [
      { term: "Thiên Can & Địa Chi", body: "10 can và 12 chi kết hợp tạo thành 60 hoa giáp ghi nhận thời gian." },
      { term: "Nhật Chủ (Day Master)", body: "Can của ngày sinh, đại diện cho bản ngã và điểm gốc để so sánh các yếu tố khác." },
      { term: "Tàng Can", body: "Những thiên can ẩn tàng bên trong mỗi địa chi, mang năng lượng tiềm ẩn." },
      { term: "Thập Thần", body: "Mười mối quan hệ biểu thị tính cách, gia đình, công danh so với Nhật Chủ." },
      { term: "Đại Vận", body: "Chu kỳ vận khí 10 năm chuyển biến theo quy luật âm dương thuận nghịch." },
    ],
  },
  method: {
    eyebrow: "05 · Minh bạch phương pháp",
    title: "Cơ sở tính toán sẽ được công bố khi ra mắt",
    note: "Bát Tự có nhiều quy ước khác nhau giữa các trường phái. Trước khi phát hành, Lá Số Việt sẽ công khai rõ quy ước đang dùng cho từng điểm dưới đây.",
    rows: [
      { label: "Giờ sinh & Tiết khí", value: "Quy đổi theo múi giờ địa phương và thời điểm giao tiết khí chính xác." },
      { label: "Quy ước tàng can", value: "Công bố bảng tàng can chuẩn hóa của trường phái áp dụng." },
      { label: "Trọng số ngũ hành", value: "Tính điểm dựa trên can lộ, chi tháng lệnh và vị trí tương quan." },
      { label: "Khởi đại vận", value: "Tính chính xác số năm, tháng khởi vận theo quy tắc tiết khí." },
    ],
    footnote: "Giống Tử Vi, AI tại Lá Số Việt chỉ tổ chức và diễn giải kết quả đã tính — không tự tạo ra Thiên Can, Địa Chi hay Thập Thần.",
  },
  limitations: {
    eyebrow: "06 · Giới hạn",
    title: "Nội dung tham khảo, không thay thế chuyên môn",
    items: [
      "Bát Tự phản ánh xu hướng khí vận bẩm sinh, không khẳng định định mệnh bất biến.",
      "Không thay thế lời khuyên y tế, pháp lý, tài chính hoặc quyết định cá nhân quan trọng.",
      "Độ chính xác phụ thuộc hoàn toàn vào độ chính xác của giờ sinh và lịch tiết khí.",
      "Không dùng để phán xét nhân cách người khác hoặc gán nhãn thiên kiến.",
      "Lá Số Việt không cung cấp dịch vụ phong thủy cải vận hay bán vật phẩm.",
    ],
  },
  knowledgeFaq: {
    eyebrow: "07 · Đọc thêm",
    title: "Trong lúc chờ Bát Tự",
    note: "Kiến thức riêng cho Bát Tự đang được biên soạn. Trong lúc chờ, bạn có thể tìm hiểu nền tảng chung về lập lá số tại thư viện kiến thức Tử Vi.",
    linkText: "Xem thư viện kiến thức Tử Vi",
    linkHref: "/kien-thuc/tu-vi",
    faqHeading: "Câu hỏi thường gặp",
    faqs: [
      { num: "01", q: "Bát Tự khác gì Tử Vi?", a: "Tử Vi chia vận mệnh qua 12 cung và các sao; Bát Tự tập trung vào 4 trụ Can Chi, ngũ hành sinh khắc và thế cân bằng của Nhật Chủ." },
      { num: "02", q: "Tôi có cần nhập lại thông tin sinh khi có Bát Tự không?", a: "Không, hồ sơ sinh được lưu trong phiên của bạn dùng chung cho mọi phương pháp." },
      { num: "03", q: "Lá Số Việt có tính phí lập Bát Tự không?", a: "Lập và xem cấu trúc 4 trụ cơ bản luôn miễn phí." },
    ],
    ctaHeading: "Bắt đầu với lá số Tử Vi miễn phí",
    ctaBody: "Hồ sơ sinh bạn tạo hôm nay sẽ dùng lại được cho Bát Tự khi tính năng này ra mắt — không cần nhập lại từ đầu.",
    ctaButtonText: "Lập lá số Tử Vi miễn phí",
    ctaButtonHref: "/tu-vi",
  },
};

export const BAT_TU_CONTENT_EN: DisciplinePageContent = {
  key: "bat-tu",
  locale: "en",
  marquee: [
    "FOUR PILLARS · HEAVENLY STEMS & EARTHLY BRANCHES · DAY MASTER · HIDDEN STEMS · FIVE ELEMENTS · COMING SOON ·",
    "FOUR PILLARS · HEAVENLY STEMS & EARTHLY BRANCHES · DAY MASTER · HIDDEN STEMS · FIVE ELEMENTS · COMING SOON ·",
  ],
  hero: {
    eyebrow: "Coming soon",
    title: "BaZi / Four Pillars of Destiny",
    subtitle:
      "BaZi analyzes a person through four pillars: Year, Month, Day, and Hour of birth, mapped to Heavenly Stems and Earthly Branches to reveal elemental balance and the Day Master. La So Viet is refining the calculation engine and interpretive evidence.",
    note: "BaZi shares the same birth profile with Zi Wei — no need to re-enter date, time, and location.",
    ctaPrimaryText: "Build free Zi Wei chart",
    ctaPrimaryHref: "/en/tu-vi",
    ctaSecondaryText: "View sample Four Pillars",
    ctaSecondaryHref: "#tu-tru-mau",
    previewDisclaimer:
      "Direct BaZi generation is not yet live — this page introduces the methodology with an illustrative chart, not calculated from personal data.",
    previewBadge: "Four Pillars, One Day Master",
  },
  freeValue: {
    eyebrow: "02 · At launch",
    title: "What you receive in the free BaZi preview",
    items: [
      { num: "01", title: "Complete Four Pillars table", body: "Year, Month, Day, Hour mapped into 4 Stems and 4 Branches." },
      { num: "02", title: "Day Master identification", body: "The birth day Heavenly Stem — your core reference point." },
      { num: "03", title: "Hidden Stems in Branches", body: "Underlying elemental forces within each Earthly Branch." },
      { num: "04", title: "Preliminary Ten Gods", body: "Roles determined by interactions with the Day Master." },
      { num: "05", title: "Five Elements distribution", body: "Proportions of Metal, Wood, Water, Fire, and Earth." },
      { num: "06", title: "Shared birth profile", body: "Seamlessly cross-referenced with your Zi Wei chart." },
    ],
  },
  sampleResult: {
    eyebrow: "03 · Sample structure",
    title: "What Four Pillars look like",
    note: "The profile below illustrates structural layout — not actual user data and not yet processed by the engine.",
    disclosure: "Illustrative sample profile demonstrating methodology, not real user data.",
    subnote: "Ten Gods and branch interaction relationships will appear beside pillars once live.",
  },
  glossary: {
    eyebrow: "04 · Core terms",
    title: "Understanding BaZi without jargon overload",
    items: [
      { term: "Stems & Branches", body: "10 Heavenly Stems and 12 Earthly Branches forming the 60-year cycle." },
      { term: "Day Master", body: "The Heavenly Stem of birth day, representing the essential self." },
      { term: "Hidden Stems", body: "Internal Heavenly Stems residing within Earthly Branches." },
      { term: "Ten Gods", body: "Ten archetypal relationships covering character, family, and vocation." },
      { term: "Major Luck Cycles", body: "10-year environmental shifts following cyclical natural laws." },
    ],
  },
  method: {
    eyebrow: "05 · Method transparency",
    title: "Calculation foundations disclosed at launch",
    note: "BaZi conventions vary across classical lineages. La So Viet publicly documents every rule choice.",
    rows: [
      { label: "Solar terms & time", value: "Local solar time and precise solar term transition timestamps." },
      { label: "Hidden stems table", value: "Published standardized hidden stems rule matrix." },
      { label: "Elemental weighting", value: "Scored by exposed stems, month order, and relative positions." },
      { label: "Luck cycle inception", value: "Precise count of years and months derived from solar boundaries." },
    ],
    footnote: "Like Zi Wei, AI at La So Viet organizes and explains calculated outputs — never inventing Stems or Branches.",
  },
  limitations: {
    eyebrow: "06 · Limitations",
    title: "Reference insights, not professional substitutes",
    items: [
      "BaZi outlines natural inclinations and energetic patterns, not deterministic fate.",
      "Not a replacement for medical, legal, financial, or personal professional advice.",
      "Accuracy depends entirely on precise birth time and solar calendar records.",
      "Should never be used to judge or stereotype others in social contexts.",
      "La So Viet never sells corrective amulets or superstitious remedy products.",
    ],
  },
  knowledgeFaq: {
    eyebrow: "07 · Further reading",
    title: "While waiting for BaZi",
    note: "Dedicated BaZi guides are being prepared. In the meantime, explore chart foundations in our knowledge base.",
    linkText: "Explore Zi Wei knowledge base",
    linkHref: "/en/kien-thuc/tu-vi",
    faqHeading: "Frequently asked questions",
    faqs: [
      { num: "01", q: "How does BaZi differ from Zi Wei?", a: "Zi Wei maps life across 12 houses and stars; BaZi focuses on 4 pillars of Stems and Branches, elemental balance, and the Day Master." },
      { num: "02", q: "Do I need to re-enter birth data for BaZi?", a: "No, your stored session birth profile is shared across all disciplines." },
      { num: "03", q: "Is BaZi chart calculation free?", a: "Building and viewing your primary Four Pillars structure is always free." },
    ],
    ctaHeading: "Start with a free Zi Wei chart",
    ctaBody: "The birth profile you create today will carry over to BaZi once launched — no re-entry required.",
    ctaButtonText: "Build free Zi Wei chart",
    ctaButtonHref: "/en/tu-vi",
  },
};
