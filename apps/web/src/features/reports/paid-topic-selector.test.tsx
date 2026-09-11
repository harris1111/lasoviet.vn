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
  it("renders Layer 1 disciplines and Layer 2 Zi Wei topics in fixed order", () => {
    const html = renderToStaticMarkup(
      <PaidTopicSelector locale="vi" topics={mockTopics} />,
    );

    // Layer 1: Disciplines
    expect(html).toContain("Bộ môn luận giải từ dữ liệu sinh");
    expect(html).toContain("Tử Vi Đẩu Số");
    expect(html).toContain("Bát Tự (Tứ Trụ)");
    expect(html).toContain("Bản đồ sao phương Tây");
    expect(html).toContain("Thần số học (Pitago)");
    expect(html).not.toContain("Kinh Dịch");

    // Layer 2: Topics in fixed research-backed order
    expect(html).toContain("Chủ đề luận giải Tử Vi");
    expect(html).toContain("Luận giải Tử Vi toàn diện");
    expect(html).toContain("Tình duyên &amp; Hôn nhân");
    expect(html).toContain("Công danh &amp; Tài lộc");
    expect(html).toContain("Vận trình năm &amp; Lưu niên");

    // Active card details & stable anchor
    expect(html).toContain("79.000 ₫");
    expect(html).toContain("Thanh toán một lần");
    expect(html).toContain("Chọn Luận giải Tử Vi toàn diện — 79.000 ₫");
    expect(html).toContain("/bao-cao-mau/tu-vi");
    expect(html).toContain("Đầy đủ nhất");
    expect(html).toContain("Chọn luận giải phù hợp");
    expect(html).toContain("Thanh toán một lần, không tự động gia hạn.");
    expect(html).toContain('id="ziwei-comprehensive"');

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

    // Discipline overview does not promise time forecasting
    const disciplineMatch = html.match(/<div[^>]*data-testid="disciplines-layer"[^>]*>([\s\S]*?)<\/div>/);
    expect(disciplineMatch).not.toBeNull();
    const disciplineHtml = disciplineMatch?.[1] ?? "";
    expect(disciplineHtml).not.toContain("vận trình thời gian");

    // Disabled topics have no submit buttons
    const submitMatches = (html.match(/type="submit"/g) || []).length;
    expect(submitMatches).toBe(1);

    // Coming-soon annual topic is clearly disabled and retains its own description
    const annualMatch = html.match(/<article[^>]*data-testid="topic-annual-disabled"[^>]*>([\s\S]*?)<\/article>/);
    expect(annualMatch).not.toBeNull();
    const annualHtml = annualMatch?.[1] ?? "";
    expect(annualHtml).toContain("Vận trình năm &amp; Lưu niên");
    expect(annualHtml).not.toContain("type=\"submit\"");
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
      expect(html).toContain("Select Comprehensive Zi Wei Reading — 79,000 VND");
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
    expect(html).toContain("Lá số ngày 1994-04-12");
    expect(html).toContain("← Xem lại lá số");
  });

  it("keeps one active purchase CTA and the sample-report link in both locales", () => {
    const htmlVi = renderToStaticMarkup(
      <PaidTopicSelector locale="vi" topics={mockTopics} />,
    );
    expect(htmlVi).toContain("Chọn Luận giải Tử Vi toàn diện — 79.000 ₫");
    expect(htmlVi).toContain("/bao-cao-mau/tu-vi");
    expect(htmlVi).toContain("Xem bản mẫu");
    expect((htmlVi.match(/type="submit"/g) || []).length).toBe(1);

    const htmlEn = renderToStaticMarkup(
      <PaidTopicSelector locale="en" topics={mockTopics} />,
    );
    expect(htmlEn).toContain("/en/bao-cao-mau/tu-vi");
    expect(htmlEn).toContain("Select Comprehensive Zi Wei Reading — 79,000 VND");
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

    // Vietnamese: renders both offers
    const htmlVi = renderToStaticMarkup(
      <PaidTopicSelector locale="vi" topics={twoOffersTopics} />,
    );
    expect(htmlVi).toContain("19.000 ₫");
    expect(htmlVi).toContain("79.000 ₫");
    expect(htmlVi).toContain("Bản mệnh và tiềm năng");
    expect(htmlVi).toContain("Luận giải Tử Vi toàn diện");
    expect(htmlVi).toContain("Chọn Bản mệnh và tiềm năng — 19.000 ₫");
    expect(htmlVi).toContain("Chọn Luận giải Tử Vi toàn diện — 79.000 ₫");
    expect(htmlVi).toContain("Đầy đủ nhất");
    expect(htmlVi).toContain('id="ziwei-natal-excerpt"');
    expect(htmlVi).toContain('id="ziwei-comprehensive"');
    expect((htmlVi.match(/type="submit"/g) || []).length).toBe(2);

    // English: renders only 79k comprehensive offer
    mockLocale = "en";
    try {
      const htmlEn = renderToStaticMarkup(
        <PaidTopicSelector locale="en" topics={twoOffersTopics} />,
      );
      expect(htmlEn).toContain("79,000 VND");
      expect(htmlEn).not.toContain("19,000");
      expect(htmlEn).toContain("Comprehensive Zi Wei reading");
      expect(htmlEn).not.toContain("Select Core Identity and Potential — 19,000 VND");
      expect(htmlEn).toContain('id="ziwei-comprehensive"');
      expect(htmlEn).not.toContain('id="ziwei-natal-excerpt"');
      expect((htmlEn.match(/type="submit"/g) || []).length).toBe(1);
    } finally {
      mockLocale = "vi";
    }
  });
  it("renders unavailable notice and zero purchase forms in English selector when chart has active Vietnamese Tier-1 entitlement (Cross-locale Test 4)", () => {
    mockLocale = "en";
    try {
      const html = renderToStaticMarkup(
        <PaidTopicSelector
          locale="en"
          ownershipByOfferKey={{
            "ziwei-comprehensive": { kind: "unavailable" },
          }}
          topics={mockTopics}
        />,
      );

      expect((html.match(/type="submit"/g) || []).length).toBe(0);
      expect(html).not.toMatch(/ZIWEI-[A-Z0-9]+/);
    } finally {
      mockLocale = "vi";
    }
  });
  it("renders 79k list, 19k credit, 60k net price, exact deadline and unlocked sections before expiry (WP-09 Test 10)", () => {
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

    // Before expiry: shows 79.000 ₫ list, 19.000 ₫ credit, 60.000 ₫ net, and unlocked sections
    const htmlBeforeExpiry = renderToStaticMarkup(
      <PaidTopicSelector
        locale="vi"
        topics={twoOffersTopics}
        orderHistory={orderHistory}
        now={new Date("2026-09-12T00:00:00Z")}
      />,
    );

    expect(htmlBeforeExpiry).toContain("79.000 ₫");
    expect(htmlBeforeExpiry).toContain("Đã trừ: -19.000 ₫");
    expect(htmlBeforeExpiry).toContain("60.000 ₫");
    expect(htmlBeforeExpiry).toContain("Ưu đãi nâng cấp áp dụng đến:");
    expect(htmlBeforeExpiry).toContain("Cấu trúc và cách cục trọng yếu");

    // Exactly at or after deadline: shows full 79.000 ₫, no credit
    const htmlAfterDeadline = renderToStaticMarkup(
      <PaidTopicSelector
        locale="vi"
        topics={twoOffersTopics}
        orderHistory={orderHistory}
        now={new Date("2026-09-17T10:00:00.000Z")}
      />,
    );

    expect(htmlAfterDeadline).toContain("79.000 ₫");
    expect(htmlAfterDeadline).not.toContain("60.000 ₫");
    expect(htmlAfterDeadline).not.toContain("Đã trừ: -19.000 ₫");

    // Refunded Tier 1: shows full 79.000 ₫, no credit
    const refundedOrderHistory = [
      {
        ...orderHistory[0]!,
        status: "refunded" as const,
        orderStatus: "refunded" as const,
      },
    ];
    const htmlAfterRefund = renderToStaticMarkup(
      <PaidTopicSelector
        locale="vi"
        topics={twoOffersTopics}
        orderHistory={refundedOrderHistory}
        now={new Date("2026-09-12T00:00:00Z")}
      />,
    );
    expect(htmlAfterRefund).toContain("79.000 ₫");
    expect(htmlAfterRefund).not.toContain("60.000 ₫");
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
    expect(html).toContain("Nếu sau đó bạn muốn đọc bản toàn diện, 19.000 ₫ này sẽ được trừ thẳng vào phí nâng cấp trong vòng 7 ngày kể từ thời điểm thanh toán.");
  });

  it("hides Tier 1 completely when Tier 2 is owned and resolves existing report (WP-09 Test 12)", () => {
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
    expect(html).not.toContain("Chọn Bản mệnh và tiềm năng — 19.000 ₫");

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
        birthSummary={{
          displayName: "Hoàng Nam",
          normalizedCalendar: { kind: "solar", date: "1992-08-15" },
          normalizedTime: { precision: "exact_minute", localTime: "14:30" },
          timezoneProvenance: { source: "offset", offsetMinutes: 420 },
        }}
      />,
    );

    // Dynamic personalized title
    expect(html).toContain("Luận giải cho lá số của Hoàng Nam");

    // Tier 1: exact name, price, and mandatory 7-day credit disclosure
    expect(html).toContain("Bản mệnh và tiềm năng");
    expect(html).toContain("19.000 ₫");
    expect(html).toContain("trừ thẳng vào phí nâng cấp");
    expect(html).toContain("7 ngày kể từ thời điểm thanh toán");

    // Tier 2: exact name, price, deliverables
    expect(html).toContain("Luận giải Tử Vi toàn diện");
    expect(html).toContain("79.000 ₫");
    expect(html).toContain("Luận giải đầy đủ 12 cung.");

    // Zero SKU leakage
    expect(html).not.toContain("ZIWEI-NATAL-EXCERPT-P0");
    expect(html).not.toContain("ZIWEI-IDENTITY-P0");
    expect(html).not.toMatch(/ZIWEI-[A-Z0-9_-]+/);
  });

});
