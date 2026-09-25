import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { renderToStaticMarkup } from "react-dom/server";
import type { PaidTopicSelectionViewV1 } from "@lasoviet/contracts";

let mockLocale = "vi";
vi.mock("next-intl", async () => {
  const viMessages = (await import("../../../messages/vi/reports.json")).default;
  const enMessages = (await import("../../../messages/en/reports.json")).default;
  return {
    useTranslations: (namespace?: string) => {
      return (key: string, values?: Record<string, unknown>) => {
        const messages = mockLocale === "en" ? enMessages : viMessages;
        let val: unknown = messages;
        for (const segment of key.split(".")) {
          val = (val as Record<string, unknown>)?.[segment];
        }
        if (typeof val === "string") {
          if (values) {
            return Object.entries(values).reduce(
              (acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)),
              val,
            );
          }
          return val;
        }
        return key;
      };
    },
  };
});

import { PaidTopicSelector, formatUpgradeDeadline } from "./paid-topic-selector";

const mockTopics: PaidTopicSelectionViewV1 = {
  version: 1,
  chartId: "chart-123",
  chartVersionId: "version-456",
  offers: [
    {
      sku: "ZIWEI-IDENTITY-P0",
      method: "ziwei",
      price: 79000,
      currency: "VND",
      sections: ["core-identity", "transformations"],
    },
  ],
};

describe("PaidTopicSelector", () => {
  it("renders only authoritative Zi Wei offer cards and specified trust/gate/help content without discipline teaser or coming-soon blocks", () => {
    const html = renderToStaticMarkup(
      <PaidTopicSelector locale="vi" topics={mockTopics} />,
    );

    // Disciplines layer and extra discipline teasers are NOT rendered
    expect(html).not.toContain("Bộ môn luận giải từ dữ liệu sinh");
    expect(html).not.toContain("disciplines-layer");
    expect(html).not.toContain("Bát Tự (Tứ Trụ)");
    expect(html).not.toContain("Bản đồ sao phương Tây");
    expect(html).not.toContain("Thần số học (Pitago)");
    expect(html).not.toContain("Kinh Dịch");

    // Disabled coming-soon topic blocks are NOT rendered
    expect(html).not.toContain("topic-card-disabled");
    expect(html).not.toContain("Tình duyên &amp; Hôn nhân");
    expect(html).not.toContain("Công danh &amp; Tài lộc");
    expect(html).not.toContain("Vận trình năm &amp; Lưu niên");
    expect(html).not.toContain("topic-annual-disabled");

    // Quick guide is NOT rendered
    expect(html).not.toContain("topic-quick-guide");
    expect(html).not.toContain("Hướng dẫn chọn nhanh");

    // Active offer card details & stable anchor (FD-065: Lá price, no VND on Luận giải tab)
    expect(html).toContain("960");
    expect(html).toContain("Lá");
    expect(html).toContain("/bao-cao-mau/tu-vi");
    expect(html).toContain("Đầy đủ nhất");
    expect(html).toContain('id="ziwei-comprehensive"');

    // Specified trust row, gate note, and contact help
    expect(html).toContain("Thanh toán một lần, không tự động gia hạn · Đọc lại không giới hạn sau khi mua.");
    expect(html).toContain("Cần tài khoản có email đã xác minh để thanh toán. Nếu bạn đăng nhập sau khi chọn, lựa chọn này vẫn được giữ nguyên — không phải chọn lại.");
    expect(html).toContain("Chuyển nhầm hoặc cần hỗ trợ?");
    expect(html).toContain("/lien-he");

    // Deliverables for Tier 2
    expect(html).toContain("Luận giải đầy đủ 12 cung.");
    expect(html).toContain("Những cấu trúc nổi bật trong lá số.");
    expect(html).toContain("Bốn nhóm tổng hợp để nối các mảnh ghép thành một hướng nhìn liền mạch.");
    expect(html).toContain("Bản luận giải dài dự kiến khoảng 2.200–3.200 từ.");

    // Active offer card exclusions
    const activeCardMatch = html.match(/<article[^>]*data-testid="topic-lifetime-active"[^>]*>([\s\S]*?)<\/article>/);
    expect(activeCardMatch).not.toBeNull();
    const activeCardHtml = activeCardMatch?.[1] ?? "";
    expect(activeCardHtml).not.toContain("vận trình thời gian");
    expect(activeCardHtml).not.toContain("trọn đời");
    expect(activeCardHtml).not.toContain("đại vận");
    expect(activeCardHtml).not.toContain("lưu niên");
    expect(activeCardHtml).not.toContain("dự báo");

    // No raw internal SKU leaked in active UI
    expect(html).not.toContain("ZIWEI-IDENTITY-P0");
    expect(html).not.toMatch(/ZIWEI-[A-Z]+/);

    // Exactly one active purchase submit button for this single-offer view
    const submitMatches = (html.match(/type="submit"/g) || []).length;
    expect(submitMatches).toBe(1);
  });

  it("renders English offer title and equivalent scope without promising V3 delivery", () => {
    mockLocale = "en";
    try {
      const html = renderToStaticMarkup(
        <PaidTopicSelector locale="en" topics={mockTopics} />,
      );
      expect(html).toContain("Comprehensive Zi Wei reading");
      expect(html).toContain("Full interpretation of all 12 palaces.");
      expect(html).toContain("Key configurations and patterns in the chart.");
      expect(html).toContain("Four thematic syntheses connecting chart facets into a cohesive view.");
      expect(html).toContain("Estimated report length of approximately 2,200–3,200 words.");
      expect(html).toContain("960");
      expect(html).toContain("Lá");
    } finally {
      mockLocale = "vi";
    }
  });

  it("personalizes heading when birthSummary has displayName", () => {
    const html = renderToStaticMarkup(
      <PaidTopicSelector
        birthSummary={{
          displayName: "Minh An",
          normalizedCalendar: { kind: "solar", date: "1994-04-12" },
          normalizedTime: { precision: "exact_minute", localTime: "09:05" },
          timezoneProvenance: { source: "offset", offsetMinutes: 420 },
        }}
        locale="vi"
        topics={mockTopics}
      />,
    );

    expect(html).toContain("Luận giải cho lá số của Minh An");
    expect(html).toContain("Lá số ngày 12/04/1994");
    expect(html).toContain("← Xem lại lá số");
  });

  it("keeps one active purchase CTA and the sample-report link in both locales", () => {
    const htmlVi = renderToStaticMarkup(
      <PaidTopicSelector locale="vi" topics={mockTopics} />,
    );
    expect(htmlVi).toContain("/bao-cao-mau/tu-vi");
    expect(htmlVi).toContain("Xem bản mẫu");
    expect((htmlVi.match(/type="submit"/g) || []).length).toBe(1);

    mockLocale = "en";
    let htmlEn: string;
    try {
      htmlEn = renderToStaticMarkup(
        <PaidTopicSelector locale="en" topics={mockTopics} />,
      );
    } finally {
      mockLocale = "vi";
    }
    expect(htmlEn).toContain("/en/bao-cao-mau/tu-vi");
    expect(htmlEn).toContain("View sample report");
    expect((htmlEn.match(/type="submit"/g) || []).length).toBe(1);
  });

  it("renders generic heading when birthSummary is omitted or has no displayName", () => {
    const html = renderToStaticMarkup(
      <PaidTopicSelector locale="vi" topics={mockTopics} />,
    );

    expect(html).toContain("Luận giải cho lá số của bạn");
    expect(html).not.toContain("của Minh An");
  });

  it("renders Read again button and zero purchase buttons when offer is owned and readable", () => {
    const html = renderToStaticMarkup(
      <PaidTopicSelector
        locale="vi"
        ownershipByOfferKey={{
          "ziwei-comprehensive": {
            kind: "readable",
            reportId: "rep-123",
            readUrl: "/bao-cao/rep-123",
          },
        }}
        topics={mockTopics}
      />,
    );

    expect(html).toContain("Đọc lại");
    expect(html).toContain('href="/bao-cao/rep-123"');
    expect(html).toContain("Xem bản mẫu");
    expect(html).not.toContain("Chọn Luận giải toàn diện");
    const submitMatches = (html.match(/type="submit"/g) || []).length;
    expect(submitMatches).toBe(0);
    expect(html).not.toMatch(/ZIWEI-[A-Z0-9]+/);
  });

  it("renders View progress and zero purchase buttons when offer is processing or terminal", () => {
    const html = renderToStaticMarkup(
      <PaidTopicSelector
        locale="vi"
        ownershipByOfferKey={{
          "ziwei-comprehensive": {
            kind: "processing_or_terminal",
            reportId: "rep-progress-456",
            progressUrl: "/bao-cao/rep-progress-456",
          },
        }}
        topics={mockTopics}
      />,
    );

    expect(html).toContain("Xem tiến trình");
    expect(html).toContain('href="/bao-cao/rep-progress-456"');
    expect(html).toContain("Xem bản mẫu");
    expect(html).not.toContain("Chọn Luận giải toàn diện");
    const submitMatches = (html.match(/type="submit"/g) || []).length;
    expect(submitMatches).toBe(0);
  });

  it("renders View report library and zero purchase buttons when offer is owned without report id", () => {
    const html = renderToStaticMarkup(
      <PaidTopicSelector
        locale="vi"
        ownershipByOfferKey={{
          "ziwei-comprehensive": {
            kind: "owned_unknown",
            libraryUrl: "/tai-khoan/bao-cao",
          },
        }}
        topics={mockTopics}
      />,
    );

    expect(html).toContain("Xem thư viện báo cáo");
    expect(html).toContain('href="/tai-khoan/bao-cao"');
    expect(html).toContain("Xem bản mẫu");
    expect(html).not.toContain("Chọn Luận giải toàn diện");
    const submitMatches = (html.match(/type="submit"/g) || []).length;
    expect(submitMatches).toBe(0);
  });

  it("renders bounded unavailable notice and zero purchase buttons when library projection failed", () => {
    const html = renderToStaticMarkup(
      <PaidTopicSelector
        locale="vi"
        ownershipByOfferKey={{
          "ziwei-comprehensive": {
            kind: "unavailable",
          },
        }}
        topics={mockTopics}
      />,
    );

    expect(html).toContain("Tạm thời không thể kiểm tra trạng thái");
    expect(html).toContain("Hệ thống chưa thể tải thông tin sở hữu");
    expect(html).toContain("Xem bản mẫu");
    expect(html).not.toContain("Chọn Luận giải toàn diện");
    const submitMatches = (html.match(/type="submit"/g) || []).length;
    expect(submitMatches).toBe(0);
  });

  it("renders both active offers in Vietnamese and only comprehensive in English (Correction check 3)", () => {
    const twoOffersTopics: PaidTopicSelectionViewV1 = {
      version: 1,
      chartId: "chart-123",
      chartVersionId: "version-456",
      offers: [
        {
          sku: "ZIWEI-NATAL-EXCERPT-P0",
          method: "ziwei",
          price: 19000,
          currency: "VND",
          sections: ["overview", "coreAxis", "strengthsAndTensions", "practicalDirection"],
        },
        {
          sku: "ZIWEI-IDENTITY-P0",
          method: "ziwei",
          price: 79000,
          currency: "VND",
          sections: ["overview", "coreAxis", "keyConfigurations", "palaceReadings", "thematicSynthesis", "strengthsAndTensions", "practicalDirection"],
        },
      ],
    };

    // Vietnamese: renders both offers in Lá (FD-065, FD-066)
    const htmlVi = renderToStaticMarkup(
      <PaidTopicSelector locale="vi" topics={twoOffersTopics} />,
    );
    expect(htmlVi).toContain("240");
    expect(htmlVi).toContain("960");
    expect(htmlVi).toContain("Bản mệnh");
    expect(htmlVi).toContain("Toàn diện");

    const excerptCardMatch = htmlVi.match(/<article[^>]*data-testid="topic-ziwei-natal-excerpt-active"[^>]*>([\s\S]*?)<\/article>/);
    expect(excerptCardMatch).not.toBeNull();
    const excerptCardHtml = excerptCardMatch?.[1] ?? "";
    expect(excerptCardHtml).toContain("Toàn cảnh bản mệnh.");
    expect(excerptCardHtml).toContain("Trục Mệnh – Thân và những điểm nhấn chính.");
    expect(excerptCardHtml).toContain("Điểm mạnh, điểm căng và hướng phát triển thực tế.");

    // English: renders ONLY comprehensive offer
    mockLocale = "en";
    try {
      const htmlEn = renderToStaticMarkup(
        <PaidTopicSelector locale="en" topics={twoOffersTopics} />,
      );
      expect(htmlEn).not.toContain('id="ziwei-natal-excerpt"');
      expect(htmlEn).not.toContain("data-testid=\"topic-ziwei-natal-excerpt-active\"");
      expect(htmlEn).toContain("Comprehensive Zi Wei reading");
      expect(htmlEn).toContain("data-testid=\"topic-lifetime-active\"");
    } finally {
      mockLocale = "vi";
    }
  });

  it("renders 720 Lá upgrade price, exact deadline and unlocked sections before expiry (WP-09 Test 10)", () => {
    const expiresAt = "2026-09-17T10:00:00.000Z";
    const orderHistory = [
      {
        id: "ord-t1",
        orderId: "ord-t1",
        invoiceNumber: "LSV-t1",
        chartId: "chart-123",
        profileId: "prof-1",
        profileDisplayName: "User",
        sku: "ZIWEI-NATAL-EXCERPT-P0" as const,
        productTitle: "Bản mệnh và tiềm năng",
        productName: "Bản mệnh và tiềm năng",
        amount: 19000,
        currency: "VND",
        status: "paid" as const,
        orderStatus: "paid" as const,
        locale: "vi" as const,
        createdAt: "2026-09-10T10:00:00Z",
        paidAt: "2026-09-10T10:00:00Z",
        creditExpiresAt: expiresAt,
        reportId: "rep-1",
        readUrl: "/bao-cao/rep-1",
      },
    ];

    const twoOffersTopics: PaidTopicSelectionViewV1 = {
      version: 1,
      chartId: "chart-123",
      chartVersionId: "version-456",
      offers: [
        {
          sku: "ZIWEI-NATAL-EXCERPT-P0",
          method: "ziwei",
          price: 19000,
          currency: "VND",
          sections: ["overview", "coreAxis", "strengthsAndTensions", "practicalDirection"],
        },
        {
          sku: "ZIWEI-IDENTITY-P0",
          method: "ziwei",
          price: 79000,
          currency: "VND",
          sections: ["overview", "coreAxis", "keyConfigurations", "palaceReadings", "thematicSynthesis", "strengthsAndTensions", "practicalDirection"],
        },
      ],
    };

    // Before expiry: shows 720 Lá upgrade price and unlocked sections (FD-066)
    const htmlBeforeExpiry = renderToStaticMarkup(
      <PaidTopicSelector
        locale="vi"
        topics={twoOffersTopics}
        orderHistory={orderHistory}
        now={new Date("2026-09-12T00:00:00Z")}
      />,
    );

    expect(htmlBeforeExpiry).toContain("720");
    expect(htmlBeforeExpiry).toContain("Ưu đãi nâng cấp áp dụng đến:");
    expect(htmlBeforeExpiry).toContain("Cấu trúc và cách cục trọng yếu");

    // Exactly at or after deadline: shows full 960 Lá, no upgrade notice
    const htmlAfterDeadline = renderToStaticMarkup(
      <PaidTopicSelector
        locale="vi"
        topics={twoOffersTopics}
        orderHistory={orderHistory}
        now={new Date("2026-09-17T10:00:00.000Z")}
      />,
    );

    expect(htmlAfterDeadline).toContain("960");
    expect(htmlAfterDeadline).not.toContain("Ưu đãi nâng cấp áp dụng đến:");
  });

  it("shows mandatory seven-day pre-payment disclosure on Tier-1 card (WP-09 Test 11)", () => {
    const twoOffersTopics: PaidTopicSelectionViewV1 = {
      version: 1,
      chartId: "chart-123",
      chartVersionId: "version-456",
      offers: [
        {
          sku: "ZIWEI-NATAL-EXCERPT-P0",
          method: "ziwei",
          price: 19000,
          currency: "VND",
          sections: ["overview", "coreAxis", "strengthsAndTensions", "practicalDirection"],
        },
        {
          sku: "ZIWEI-IDENTITY-P0",
          method: "ziwei",
          price: 79000,
          currency: "VND",
          sections: ["overview", "coreAxis", "keyConfigurations", "palaceReadings", "thematicSynthesis", "strengthsAndTensions", "practicalDirection"],
        },
      ],
    };

    const html = renderToStaticMarkup(
      <PaidTopicSelector locale="vi" topics={twoOffersTopics} />,
    );
    expect(html).toContain("trừ thẳng vào phí nâng cấp");
    expect(html).toContain("7 ngày kể từ thời điểm thanh toán");
  });

  it("suppresses Tier-1 card completely when Tier-2 is already owned (WP-09 Test 13)", () => {
    const twoOffersTopics: PaidTopicSelectionViewV1 = {
      version: 1,
      chartId: "chart-123",
      chartVersionId: "version-456",
      offers: [
        {
          sku: "ZIWEI-NATAL-EXCERPT-P0",
          method: "ziwei",
          price: 19000,
          currency: "VND",
          sections: ["overview", "coreAxis", "strengthsAndTensions", "practicalDirection"],
        },
        {
          sku: "ZIWEI-IDENTITY-P0",
          method: "ziwei",
          price: 79000,
          currency: "VND",
          sections: ["overview", "coreAxis", "keyConfigurations", "palaceReadings", "thematicSynthesis", "strengthsAndTensions", "practicalDirection"],
        },
      ],
    };

    const html = renderToStaticMarkup(
      <PaidTopicSelector
        locale="vi"
        topics={twoOffersTopics}
        ownershipByOfferKey={{
          "ziwei-comprehensive": {
            kind: "readable",
            reportId: "rep-existing-123",
            readUrl: "/bao-cao/rep-existing-123",
          },
        }}
      />,
    );

    // Tier 1 card is completely absent
    expect(html).not.toContain('id="ziwei-natal-excerpt"');
    expect(html).not.toContain('data-testid="topic-ziwei-natal-excerpt-active"');

    // Tier 2 card resolves to existing report
    expect(html).toContain("Đọc lại");
    expect(html).toContain('href="/bao-cao/rep-existing-123"');
  });

  it("formats upgrade deadline explicitly in Asia/Ho_Chi_Minh with exact time element (WP-09 Cleanup Item 1)", () => {
    const isoString = "2026-09-17T10:00:00.000Z";
    // 10:00 UTC = 17:00 in Asia/Ho_Chi_Minh (UTC+7)
    expect(formatUpgradeDeadline(isoString, "vi")).toBe("17:00 17/09/2026");
    expect(formatUpgradeDeadline(isoString, "en")).toBe("2026-09-17 17:00");

    const twoOffersTopics: PaidTopicSelectionViewV1 = {
      version: 1,
      chartId: "chart-123",
      chartVersionId: "version-456",
      offers: [
        {
          sku: "ZIWEI-NATAL-EXCERPT-P0",
          method: "ziwei",
          price: 19000,
          currency: "VND",
          sections: ["overview", "coreAxis", "strengthsAndTensions", "practicalDirection"],
        },
        {
          sku: "ZIWEI-IDENTITY-P0",
          method: "ziwei",
          price: 79000,
          currency: "VND",
          sections: ["overview", "coreAxis", "keyConfigurations", "palaceReadings", "thematicSynthesis", "strengthsAndTensions", "practicalDirection"],
        },
      ],
    };

    const orderHistory = [
      {
        id: "ord-t1",
        orderId: "ord-t1",
        invoiceNumber: "LSV-t1",
        chartId: "chart-123",
        profileId: "prof-1",
        profileDisplayName: "User",
        sku: "ZIWEI-NATAL-EXCERPT-P0" as const,
        productTitle: "Bản mệnh và tiềm năng",
        productName: "Bản mệnh và tiềm năng",
        amount: 19000,
        currency: "VND",
        status: "paid" as const,
        orderStatus: "paid" as const,
        locale: "vi" as const,
        createdAt: "2026-09-10T10:00:00Z",
        paidAt: "2026-09-10T10:00:00Z",
        creditExpiresAt: isoString,
        reportId: "rep-1",
        readUrl: "/bao-cao/rep-1",
      },
    ];

    const html = renderToStaticMarkup(
      <PaidTopicSelector
        locale="vi"
        topics={twoOffersTopics}
        orderHistory={orderHistory}
        now={new Date("2026-09-12T00:00:00Z")}
      />,
    );

    // Exact <time dateTime="..."> binding in Asia/Ho_Chi_Minh
    expect(html).toContain('<time dateTime="2026-09-17T10:00:00.000Z">17:00 17/09/2026</time>');
  });

  it("satisfies private copy contract: dynamic title, tier descriptions, deliverables, 7-day credit, and zero SKU leakage", () => {
    const twoOffersTopics: PaidTopicSelectionViewV1 = {
      version: 1,
      chartId: "chart-natal-contract-1",
      chartVersionId: "ver-1",
      offers: [
        {
          sku: "ZIWEI-NATAL-EXCERPT-P0",
          method: "ziwei",
          price: 19000,
          currency: "VND",
          sections: ["overview", "coreAxis", "strengthsAndTensions", "practicalDirection"],
        },
        {
          sku: "ZIWEI-IDENTITY-P0",
          method: "ziwei",
          price: 79000,
          currency: "VND",
          sections: ["overview", "coreAxis", "keyConfigurations", "palaceReadings", "thematicSynthesis", "strengthsAndTensions", "practicalDirection"],
        },
      ],
    };

    const birthSummary = {
      displayName: "Hoàng Nam",
      normalizedCalendar: { kind: "solar" as const, date: "1992-08-15" },
      normalizedTime: { precision: "exact_minute" as const, localTime: "06:30" },
      timezoneProvenance: { source: "offset" as const, offsetMinutes: 420 },
    };

    const html = renderToStaticMarkup(
      <PaidTopicSelector
        birthSummary={birthSummary}
        locale="vi"
        topics={twoOffersTopics}
      />,
    );

    // Dynamic title with display name and context date
    expect(html).toContain("Luận giải cho lá số của Hoàng Nam");
    expect(html).toContain("15/08/1992");

    // Tier 1: exact name, price in Lá, and 7-day credit disclosure
    expect(html).toContain("Bản mệnh");
    expect(html).toContain("240");
    expect(html).toContain("trừ thẳng vào phí nâng cấp");
    expect(html).toContain("7 ngày kể từ thời điểm thanh toán");

    // Tier 2: exact name, badge Đầy đủ nhất, deliverables
    expect(html).toContain("Toàn diện");
    expect(html).toContain("Đầy đủ nhất");
    expect(html).toContain("Luận giải đầy đủ 12 cung.");

    // Zero SKU leakage
    expect(html).not.toContain("ZIWEI-NATAL-EXCERPT-P0");
    expect(html).not.toContain("ZIWEI-IDENTITY-P0");
    expect(html).not.toMatch(/ZIWEI-[A-Z0-9_-]+/);
  });

  // UI-05 & FD-065/FD-066 dedicated tests
  it("renders segmented tabs: Luận giải, Hội viên, Nạp Lá (UI-05)", () => {
    const html = renderToStaticMarkup(
      <PaidTopicSelector locale="vi" topics={mockTopics} />,
    );
    expect(html).toContain('role="tablist"');
    expect(html).toContain("Luận giải");
    expect(html).toContain("Hội viên");
    expect(html).toContain("Nạp Lá");
  });

  it("renders Tab Luận giải with Lá prices and zero VND on reading cards (FD-065)", () => {
    const html = renderToStaticMarkup(
      <PaidTopicSelector locale="vi" topics={mockTopics} />,
    );
    const readingSectionMatch = html.match(/<section[^>]*id="luan-giai"[^>]*>([\s\S]*?)<\/section>/);
    expect(readingSectionMatch).not.toBeNull();
    const readingSectionHtml = readingSectionMatch?.[1] ?? "";
    expect(readingSectionHtml).toContain("960");
    expect(readingSectionHtml).toContain("Lá");
    expect(readingSectionHtml).not.toContain("₫");
    expect(readingSectionHtml).not.toContain("VND");
  });

  it("renders Tab Gói Lá with the 4 approved packs, correct VND prices, and truthful bonus lines with zero fake crossed-out prices (FD-064, FD-066)", () => {
    const html = renderToStaticMarkup(
      <PaidTopicSelector locale="vi" topics={mockTopics} initialTab="nap-la" />,
    );
    expect(html).toContain("Nhập Môn");
    expect(html).toContain("29.000đ");
    expect(html).toContain("300");

    expect(html).toContain("Khởi Đọc");
    expect(html).toContain("99.000đ");
    expect(html).toContain("1.100");
    expect(html).toContain("+100 Lá tặng");

    expect(html).toContain("Khám Phá");
    expect(html).toContain("249.000đ");
    expect(html).toContain("3.000");
    expect(html).toContain("+500 Lá tặng");

    expect(html).toContain("Tàng Thư");
    expect(html).toContain("599.000đ");
    expect(html).toContain("8.000");
    expect(html).toContain("+2.000 Lá tặng");
    expect(html).toContain("Nhiều Lá tặng nhất");

    // Zero fake crossed-out price elements (<s>, <del>, line-through)
    expect(html).not.toContain("<del");
    expect(html).not.toContain("<s>");
    expect(html).not.toContain("line-through");
    expect(html).not.toContain("strike");
  });

  it("renders Tab Hội viên with 1,500 Lá and 8,000 Lá marked coming soon (FD-093, Task #46)", () => {
    const html = renderToStaticMarkup(
      <PaidTopicSelector locale="vi" topics={mockTopics} initialTab="hoi-vien" />,
    );
    expect(html).toContain("Hội viên tháng");
    expect(html).toContain("1.500 Lá · 30 ngày");
    expect(html).toContain("Hội viên năm");
    expect(html).toContain("8.000 Lá · 365 ngày");
    expect(html).toContain("Sắp có");
  });

  it("renders the 4-item benefits panel with ≤20 words per row (Spec §4.4)", () => {
    const html = renderToStaticMarkup(
      <PaidTopicSelector locale="vi" topics={mockTopics} />,
    );
    expect(html).toContain("Giữ trọn đời");
    expect(html).toContain("Mở rồi là của bạn, xem lại bao nhiêu lần cũng được.");

    expect(html).toContain("Riêng tư");
    expect(html).toContain("Bản luận giải không hiện trên Google hay công cụ tìm kiếm.");

    expect(html).toContain("Không tự gia hạn");
    expect(html).toContain("Không trừ tiền hay trừ Lá khi bạn chưa bấm mua.");

    expect(html).toContain("Hỗ trợ khi gặp lỗi");
    expect(html).toContain("Nhắn Messenger hoặc email nếu thanh toán gặp lỗi.");
  });

  it("pre-selects smallest covering pack in sticky paybar when balance is insufficient (FD-066)", () => {
    // 0 balance + 960 Lá required -> needs 960 Lá -> smallest covering pack is Khởi Đọc (1100 Lá / 99.000đ)
    const html = renderToStaticMarkup(
      <PaidTopicSelector locale="vi" topics={mockTopics} userBalance={0} />,
    );
    expect(html).toContain("Thiếu 960 Lá");
    expect(html).toContain("Gói Khởi Đọc (1100 Lá · 99.000đ) là gói nhỏ nhất đủ mở.");
    expect(html).toContain("Nạp và mở: 99.000đ");
  });
});
