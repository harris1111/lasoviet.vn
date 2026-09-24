import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { FreeToolCrossSellBanner } from "./free-tool-cross-sell-banner";

const mockTranslations: Record<string, Record<string, string>> = {
  goodDays: {
    eyebrow: "Đối chiếu lá số cá nhân",
    question: "Ngày tốt chung, nhưng có thuận với bản mệnh của bạn?",
    explanation:
      "Khung giờ và phương vị trên lá số cá nhân giúp bạn chủ động chọn thời điểm phù hợp nhất cho công việc.",
    cta: "Kiểm tra lá số của bạn",
  },
  zodiac: {
    eyebrow: "Chiều sâu bản mệnh",
    question: "Cùng một con giáp, vì sao mỗi người lại có vận trình khác biệt?",
    explanation:
      "Năm sinh chỉ mở ra Địa Chi; chính giờ, ngày và tháng sinh mới định hình mười hai cung số trọn vẹn.",
    cta: "Lập lá số cá nhân",
  },
  lunarCalendar: {
    eyebrow: "Nhịp vận cá nhân",
    question: "Tra ngày lịch âm xong, bạn đã nắm nhịp vận hành của riêng mình?",
    explanation:
      "Lá số Tử Vi kết hợp can chi ngày giờ để soi chiếu đại vận và tiểu hạn thực tế của bạn.",
    cta: "Khám phá lá số của bạn",
  },
  dreamSymbols: {
    eyebrow: "Tâm trí & Vận trình",
    question: "Biểu tượng giấc mơ phản ánh điều gì trong tâm trí và lá số?",
    explanation:
      "Giấc mộng thường báo hiệu tâm trạng hay biến chuyển; đối chiếu với cung Mệnh và Tật Ách để thấu tỏ hơn.",
    cta: "Soi chiếu trên lá số",
  },
  tarot: {
    eyebrow: "Tầm nhìn dài hạn",
    question: "Quẻ bài gợi mở câu hỏi, nhưng bức tranh dài hạn của bạn ra sao?",
    explanation:
      "Tarot phản ánh năng lượng hiện tại; lá số Tử Vi cho thấy quy luật vận hạn và các cột mốc quan trọng.",
    cta: "Xem lá số dài hạn",
  },
  fengShui: {
    eyebrow: "Không gian & Bản mệnh",
    question: "Hướng nhà hợp hướng, nhưng có thuận với bản mệnh gia chủ?",
    explanation:
      "Phong thuỷ nhà ở đạt hiệu quả tốt nhất khi kết hợp hài hoà với cung Điền Trạch trên lá số cá nhân.",
    cta: "Kiểm tra cung Điền Trạch",
  },
  palmistry: {
    eyebrow: "Tướng pháp & Mệnh lý",
    question: "Chỉ tay phản ánh nét tướng, còn gốc số của bạn nằm ở đâu?",
    explanation:
      "Tướng tay chuyển biến theo tâm và hành vi; lá số Tử Vi giữ vai trò toạ độ gốc giúp định hướng vững vàng.",
    cta: "Xem toạ độ lá số",
  },
};

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const parts = key.split(".");
    const toolKey = parts[0];
    const field = parts[1];
    if (toolKey && field && mockTranslations[toolKey]) {
      return mockTranslations[toolKey][field] ?? key;
    }
    return key;
  },
}));

describe("FreeToolCrossSellBanner", () => {
  it("renders good-days cross-sell banner with correct texts and target url in Vietnamese", () => {
    const html = renderToStaticMarkup(<FreeToolCrossSellBanner locale="vi" tool="good-days" />);

    expect(html).toContain("Đối chiếu lá số cá nhân");
    expect(html).toContain("Ngày tốt chung, nhưng có thuận với bản mệnh của bạn?");
    expect(html).toContain(
      "Khung giờ và phương vị trên lá số cá nhân giúp bạn chủ động chọn thời điểm phù hợp nhất cho công việc.",
    );
    expect(html).toContain('href="/tao-la-so/tu-vi?from=xem-ngay"');
    expect(html).toContain("Kiểm tra lá số của bạn");
    expect(html).toContain('data-from="xem-ngay"');
  });

  it("renders zodiac cross-sell banner with English locale prefix and correct from slug", () => {
    const html = renderToStaticMarkup(<FreeToolCrossSellBanner locale="en" tool="zodiac" />);

    expect(html).toContain("Chiều sâu bản mệnh");
    expect(html).toContain("Cùng một con giáp, vì sao mỗi người lại có vận trình khác biệt?");
    expect(html).toContain('href="/en/tao-la-so/tu-vi?from=12-con-giap"');
    expect(html).toContain('data-from="12-con-giap"');
  });

  it("renders tarot cross-sell banner with correct from slug", () => {
    const html = renderToStaticMarkup(<FreeToolCrossSellBanner locale="vi" tool="tarot" />);
    expect(html).toContain('href="/tao-la-so/tu-vi?from=tarot"');
    expect(html).toContain("Xem lá số dài hạn");
  });

  it("renders lunar-calendar cross-sell banner with correct from slug", () => {
    const html = renderToStaticMarkup(<FreeToolCrossSellBanner locale="vi" tool="lunar-calendar" />);
    expect(html).toContain('href="/tao-la-so/tu-vi?from=lich-am"');
    expect(html).toContain("Khám phá lá số của bạn");
  });

  it("renders dream-symbols cross-sell banner with correct from slug", () => {
    const html = renderToStaticMarkup(<FreeToolCrossSellBanner locale="vi" tool="dream-symbols" />);
    expect(html).toContain('href="/tao-la-so/tu-vi?from=giai-mong"');
    expect(html).toContain("Soi chiếu trên lá số");
  });

  it("renders feng-shui cross-sell banner with correct from slug", () => {
    const html = renderToStaticMarkup(<FreeToolCrossSellBanner locale="vi" tool="feng-shui" />);
    expect(html).toContain('href="/tao-la-so/tu-vi?from=phong-thuy"');
    expect(html).toContain("Kiểm tra cung Điền Trạch");
  });

  it("renders palmistry cross-sell banner with correct from slug", () => {
    const html = renderToStaticMarkup(<FreeToolCrossSellBanner locale="vi" tool="palmistry" />);
    expect(html).toContain('href="/tao-la-so/tu-vi?from=xem-chi-tay"');
    expect(html).toContain("Xem toạ độ lá số");
  });
});
