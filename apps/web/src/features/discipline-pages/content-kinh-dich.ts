import type { DisciplinePageContent } from "./discipline-page-model";

export const KINH_DICH_CONTENT_VI: DisciplinePageContent = {
  key: "kinh-dich",
  locale: "vi",
  marquee: [
    "QUẺ CHỦ · HÀO ĐỘNG · QUẺ BIẾN · THƯỢNG HẠ QUÁI · ÂM DƯƠNG · KINH DỊCH ĐANG HOÀN THIỆN ·",
    "QUẺ CHỦ · HÀO ĐỘNG · QUẺ BIẾN · THƯỢNG HẠ QUÁI · ÂM DƯƠNG · KINH DỊCH ĐANG HOÀN THIỆN ·",
  ],
  hero: {
    eyebrow: "Sắp ra mắt",
    title: "Kinh Dịch / Chu Dịch",
    subtitle:
      "Kinh Dịch không cần ngày giờ sinh. Bạn đặt một câu hỏi cụ thể, gieo quẻ theo một thời điểm, và nhận về quẻ chủ, hào động và quẻ biến — ba lớp dữ liệu để đọc một tình huống, không phải một lời phán về tương lai.",
    note: "Lá Số Việt đang hoàn thiện cách gieo quẻ ảo, chính sách cooldown và bộ căn cứ diễn giải trước khi phát hành.",
    ctaPrimaryText: "Xem cách gieo quẻ",
    ctaPrimaryHref: "#cach-gieo-que",
    ctaSecondaryText: "Xem lá số Tử Vi miễn phí",
    ctaSecondaryHref: "/tu-vi",
    previewDisclaimer:
      "Chưa có công cụ gieo quẻ trực tiếp — trang này giới thiệu phương pháp và một quẻ minh hoạ, không phải kết quả gieo thật.",
    previewBadge: "Xây quẻ từ dưới lên",
  },
  freeValue: {
    eyebrow: "02 · Khi ra mắt",
    title: "Một lượt gieo quẻ sẽ cho bạn những gì",
    items: [
      { num: "01", title: "Quẻ chủ (quẻ gốc)", body: "Bức tranh toàn cảnh hiện tại của sự việc hay câu hỏi." },
      { num: "02", title: "Hào động xác định", body: "Vị trí có biến chuyển và động lực kích hoạt thay đổi." },
      { num: "03", title: "Quẻ biến (quẻ chuyển)", body: "Xu hướng phát triển của tình huống sau khi hào biến động." },
      { num: "04", title: "Thoán từ & Hào từ", body: "Lời văn kinh điển chuẩn xác đi kèm bản dịch bạch thoại rõ ràng." },
      { num: "05", title: "Phân tích âm dương bát quái", body: "Tương tác giữa thượng quái và hạ quái trong thời điểm gieo." },
      { num: "06", title: "Lịch sử câu hỏi riêng tư", body: "Lưu lại quẻ gieo để chiêm nghiệm đối chiếu theo thời gian." },
    ],
  },
  sampleResult: {
    eyebrow: "03 · Ví dụ minh hoạ",
    title: "Một quẻ trông như thế nào",
    note: "Ví dụ dưới đây minh hoạ đúng cấu trúc quẻ Kinh Dịch cổ điển — không phải kết quả gieo từ một câu hỏi thật.",
    disclosure: "Ví dụ minh họa cấu trúc quẻ, không phải kết quả gieo từ câu hỏi thật.",
    subnote: "Hào động nằm ở vị trí thứ ba — nơi quẻ chủ chuyển thành quẻ biến.",
  },
  glossary: {
    eyebrow: "04 · Thuật ngữ cốt lõi",
    title: "Đọc một quẻ mà không bị ngợp thuật ngữ",
    items: [
      { term: "Hào Âm & Hào Dương", body: "Vạch đứt (âm) và vạch liền (dương) tạo dựng 64 quẻ." },
      { term: "Bát Quái", body: "Tám quái đơn gồm Càn, Khảm, Cấn, Chấn, Tốn, Ly, Khôn, Đoài." },
      { term: "Quẻ Chủ & Quẻ Biến", body: "Trạng thái bắt đầu và trạng thái chuyển hóa sau khi hào động đổi dấu." },
      { term: "Thoán Từ & Đại Tượng", body: "Lời bình tổng thể về ý nghĩa tên quẻ và đạo lý xử thế tương ứng." },
      { term: "Thời của quẻ", body: "Ý nghĩa của hoàn cảnh: lúc nên tiến, lúc nên thoái, lúc nên giữ yên." },
    ],
  },
  method: {
    eyebrow: "05 · Minh bạch phương pháp",
    title: "Cách gieo quẻ sẽ hoạt động",
    note: "Kinh Dịch dễ bị dùng sai theo hướng 'gieo lại đến khi ra quẻ mình thích'. Lá Số Việt thiết kế minh bạch: một câu hỏi một quẻ.",
    rows: [
      { label: "Phương pháp gieo", value: "Mô phỏng 3 đồng xu cổ (Đồng tiền Mai Hoa) theo thuật toán ngẫu nhiên minh bạch." },
      { label: "Quy tắc hào động", value: "3 mặt ngửa (Lão Dương - 9) hoặc 3 mặt sấp (Lão Âm - 6) sinh hào động." },
      { label: "Chính sách Cooldown", value: "Không cho phép gieo liên tiếp cùng một câu hỏi trong thời gian ngắn." },
      { label: "Căn cứ diễn giải", value: "Dựa trên Chu Dịch nguyên bản, Thoán Truyện và Tượng Truyện." },
    ],
    footnote: "Khi ra mắt, AI tại Lá Số Việt chỉ diễn giải quẻ đã gieo — không tự ý gieo lại hoặc chỉnh sửa kết quả.",
  },
  limitations: {
    eyebrow: "06 · Giới hạn",
    title: "Nội dung tham khảo, không thay thế chuyên môn",
    items: [
      "Kinh Dịch là tấm gương soi chiếu nội tâm và hoàn cảnh, không phải máy đoán tương lai.",
      "Không dùng cho các trò may rủi, cờ bạc, lô đề hoặc hành vi vi phạm pháp luật.",
      "Không gieo quẻ khi tâm lý kích động hoặc cố tình gieo nhiều lần để tìm câu trả lời mong muốn.",
      "Mọi hành động thực tế cần dựa trên lý trí, pháp luật và trách nhiệm cá nhân.",
      "Lá Số Việt không cam kết kết quả tương lai dựa trên quẻ dịch.",
    ],
  },
  knowledgeFaq: {
    eyebrow: "07 · Đọc thêm",
    title: "Trong lúc chờ Kinh Dịch",
    note: "Bạn có thể khám phá tri thức về triết học phương Đông và luận giải vận mệnh tại thư viện Lá Số Việt.",
    linkText: "Khám phá thư viện tri thức",
    linkHref: "/kien-thuc",
    faqHeading: "Câu hỏi thường gặp",
    faqs: [
      { num: "01", q: "Kinh Dịch có cần giờ sinh không?", a: "Không, Kinh Dịch dựa trên câu hỏi và thời điểm khởi tâm gieo quẻ." },
      { num: "02", q: "Có thể gieo quẻ nhiều lần trong ngày không?", a: "Mỗi câu hỏi cụ thể chỉ nên gieo một lần để giữ sự tập trung và chân thật." },
      { num: "03", q: "Gieo quẻ Kinh Dịch có miễn phí không?", a: "Lượt gieo cơ bản và hiển thị quẻ luôn miễn phí." },
    ],
    ctaHeading: "Soi chiếu cuộc sống qua lăng kính Tử Vi",
    ctaBody: "Trong khi chờ đợi Kinh Dịch, bạn có thể lập ngay lá số Tử Vi miễn phí để hiểu rõ bản thân.",
    ctaButtonText: "Lập lá số Tử Vi miễn phí",
    ctaButtonHref: "/tu-vi",
  },
};

export const KINH_DICH_CONTENT_EN: DisciplinePageContent = {
  key: "kinh-dich",
  locale: "en",
  marquee: [
    "PRIMARY HEXAGRAM · CHANGING LINE · TRANSFORMED HEXAGRAM · TRIGRAMS · YIN YANG · COMING SOON ·",
    "PRIMARY HEXAGRAM · CHANGING LINE · TRANSFORMED HEXAGRAM · TRIGRAMS · YIN YANG · COMING SOON ·",
  ],
  hero: {
    eyebrow: "Coming soon",
    title: "I Ching / Book of Changes",
    subtitle:
      "I Ching requires no birth date. You frame a specific question, cast at a given moment, and receive the primary hexagram, changing lines, and resulting hexagram — three analytical layers to interpret situations without fatalistic fortune telling.",
    note: "La So Viet is refining virtual casting, query cooldown safeguards, and classical interpretive anchors.",
    ctaPrimaryText: "See casting method",
    ctaPrimaryHref: "#cach-gieo-que",
    ctaSecondaryText: "Build free Zi Wei chart",
    ctaSecondaryHref: "/en/tu-vi",
    previewDisclaimer:
      "Direct divination is not yet live — this page introduces the methodology with an illustrative hexagram, not a live query result.",
    previewBadge: "Hexagram Built From Bottom Up",
  },
  freeValue: {
    eyebrow: "02 · At launch",
    title: "What each casting will provide",
    items: [
      { num: "01", title: "Primary hexagram", body: "Comprehensive overview of the current inquiry state." },
      { num: "02", title: "Identified changing line", body: "Specific inflection point triggering transformation." },
      { num: "03", title: "Transformed hexagram", body: "Emerging trajectory following energetic shift." },
      { num: "04", title: "Judgments & Line Texts", body: "Classical Chinese source texts with clear, lucid translation." },
      { num: "05", title: "Trigram polarity dynamics", body: "Upper and lower trigram interplay at the moment of inquiry." },
      { num: "06", title: "Private query history", body: "Stored castings for longitudinal reflection and review." },
    ],
  },
  sampleResult: {
    eyebrow: "03 · Sample casting",
    title: "What a hexagram looks like",
    note: "The example below illustrates classical I Ching architecture — not generated from a real query.",
    disclosure: "Illustrative hexagram sample demonstrating structure, not a real cast query.",
    subnote: "Line 3 is the moving line where the primary hexagram transforms.",
  },
  glossary: {
    eyebrow: "04 · Core terms",
    title: "Reading hexagrams without jargon overload",
    items: [
      { term: "Yin & Yang Lines", body: "Broken (yin) and solid (yang) lines forming 64 hexagrams." },
      { term: "Eight Trigrams", body: "Fundamental symbols: Qian, Kan, Gen, Zhen, Xun, Li, Kun, Dui." },
      { term: "Primary & Transformed", body: "Initial configuration and the resulting state after lines mutate." },
      { term: "The Judgment (Tuan)", body: "Overarching philosophical evaluation of the hexagram's season." },
      { term: "Timeliness (Shi)", body: "Appropriate conduct: when to advance, retreat, or stay firm." },
    ],
  },
  method: {
    eyebrow: "05 · Method transparency",
    title: "How casting operates",
    note: "I Ching is often abused by re-casting until a preferred outcome appears. La So Viet enforces discipline: one question, one hexagram.",
    rows: [
      { label: "Casting method", value: "Three-coin simulation (Plum Blossom coins) using transparent RNG." },
      { label: "Moving line rules", value: "Three tails (Old Yang - 9) or three heads (Old Yin - 6) mutate." },
      { label: "Cooldown policy", value: "Prevents repetitive casting for identical queries within short windows." },
      { label: "Interpretive canon", value: "Grounded in canonical Zhouyi, Great Treatise, and Tuan commentaries." },
    ],
    footnote: "At launch, AI at La So Viet only explains the cast hexagram — never modifying outcomes to please the reader.",
  },
  limitations: {
    eyebrow: "06 · Limitations",
    title: "Contemplative guidance, not absolute prediction",
    items: [
      "I Ching mirrors internal clarity and contextual dynamics, not future lottery draws.",
      "Never used for speculative gambling, games of chance, or illegal activities.",
      "Avoid casting when emotionally agitated or seeking repeated confirmation bias.",
      "All practical decisions remain the sole rational responsibility of the seeker.",
      "La So Viet provides no metaphysical outcome guarantees.",
    ],
  },
  knowledgeFaq: {
    eyebrow: "07 · Further reading",
    title: "While waiting for I Ching",
    note: "Explore Eastern philosophical models and life-pattern reading across our knowledge collection.",
    linkText: "Explore knowledge library",
    linkHref: "/en/kien-thuc",
    faqHeading: "Frequently asked questions",
    faqs: [
      { num: "01", q: "Does I Ching require birth time?", a: "No, I Ching is query-driven and relies solely on the moment of intentional casting." },
      { num: "02", q: "Can I cast multiple times a day?", a: "Each specific question should only be cast once to maintain genuine contemplation." },
      { num: "03", q: "Is I Ching casting free?", a: "Standard single casting and reading presentation is completely free." },
    ],
    ctaHeading: "Examine your path through Zi Wei",
    ctaBody: "While I Ching is in preparation, explore your foundational life pattern with a free Zi Wei chart.",
    ctaButtonText: "Build free Zi Wei chart",
    ctaButtonHref: "/en/tu-vi",
  },
};
