import type { OrderHistoryItemV1, OrderHistoryV1 } from "@lasoviet/contracts";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { OrderHistory } from "./order-history";

function createMockOrder(
  overrides: Partial<OrderHistoryItemV1> = {},
): OrderHistoryItemV1 {
  return {
    id: "ord-default-id",
    orderId: "ord-default-id",
    invoiceNumber: "LSV-20260908-001",
    chartId: "chart-default-id",
    profileId: "prof-default-id",
    profileDisplayName: "Nguyễn Văn A",
    sku: "ZIWEI-IDENTITY-P0",
    productTitle: "Bản mệnh & tiềm năng",
    productName: "Bản mệnh & tiềm năng",
    amount: 79_000,
    currency: "VND",
    status: "paid",
    orderStatus: "paid",
    locale: "vi",
    createdAt: "2026-09-08T10:00:00.000Z",
    paidAt: "2026-09-08T10:05:00.000Z",
    reportId: "rep-default-id",
    readUrl: "/bao-cao/rep-default-id",
    supportUrl: "/lien-he?order=LSV-20260908-001",
    ...overrides,
  };
}

describe("OrderHistory", () => {
  it("renders orders in exact projection order including paid, pending, expired, failed, and refunded", () => {
    const mockHistory: OrderHistoryV1 = {
      version: 1,
      totalCount: 5,
      orders: [
        createMockOrder({
          id: "ord-1",
          invoiceNumber: "INV-PAID-001",
          status: "paid",
          orderStatus: "paid",
          productTitle: "Báo cáo 1",
        }),
        createMockOrder({
          id: "ord-2",
          invoiceNumber: "INV-PENDING-002",
          status: "pending",
          orderStatus: "pending",
          productTitle: "Báo cáo 2",
          paidAt: null,
        }),
        createMockOrder({
          id: "ord-3",
          invoiceNumber: "INV-EXPIRED-003",
          status: "expired",
          orderStatus: "expired",
          productTitle: "Báo cáo 3",
          paidAt: null,
        }),
        createMockOrder({
          id: "ord-4",
          invoiceNumber: "INV-FAILED-004",
          status: "failed",
          orderStatus: "failed",
          productTitle: "Báo cáo 4",
          paidAt: null,
        }),
        createMockOrder({
          id: "ord-5",
          invoiceNumber: "INV-REFUNDED-005",
          status: "refunded",
          orderStatus: "refunded",
          productTitle: "Báo cáo 5",
        }),
      ],
      items: [],
    };

    const html = renderToStaticMarkup(
      <OrderHistory locale="vi" orders={mockHistory} />,
    );

    const posPaid = html.indexOf("INV-PAID-001");
    const posPending = html.indexOf("INV-PENDING-002");
    const posExpired = html.indexOf("INV-EXPIRED-003");
    const posFailed = html.indexOf("INV-FAILED-004");
    const posRefunded = html.indexOf("INV-REFUNDED-005");

    expect(posPaid).toBeGreaterThan(-1);
    expect(posPending).toBeGreaterThan(-1);
    expect(posExpired).toBeGreaterThan(-1);
    expect(posFailed).toBeGreaterThan(-1);
    expect(posRefunded).toBeGreaterThan(-1);

    expect(posPaid).toBeLessThan(posPending);
    expect(posPending).toBeLessThan(posExpired);
    expect(posExpired).toBeLessThan(posFailed);
    expect(posFailed).toBeLessThan(posRefunded);
  });

  it("renders localized non-raw status and Ho Chi Minh time for expired and terminal states in VI and EN", () => {
    const mockHistory: OrderHistoryV1 = {
      version: 1,
      totalCount: 5,
      orders: [
        createMockOrder({
          id: "ord-paid",
          invoiceNumber: "INV-1",
          status: "paid",
          orderStatus: "paid",
          paidAt: "2026-09-08T10:05:00.000Z",
          createdAt: "2026-09-08T10:00:00.000Z",
          readUrl: "/bao-cao/clean-1",
          supportUrl: undefined,
        }),
        createMockOrder({
          id: "ord-pending",
          invoiceNumber: "INV-2",
          status: "pending",
          orderStatus: "pending",
          paidAt: null,
          createdAt: "2026-09-08T10:00:00.000Z",
          readUrl: null,
          supportUrl: undefined,
        }),
        createMockOrder({
          id: "ord-expired",
          invoiceNumber: "INV-3",
          status: "expired",
          orderStatus: "expired",
          paidAt: null,
          createdAt: "2026-09-08T10:00:00.000Z",
          readUrl: null,
          supportUrl: undefined,
        }),
        createMockOrder({
          id: "ord-failed",
          invoiceNumber: "INV-4",
          status: "failed",
          orderStatus: "failed",
          paidAt: null,
          createdAt: "2026-09-08T10:00:00.000Z",
          readUrl: null,
          supportUrl: undefined,
        }),
        createMockOrder({
          id: "ord-refunded",
          invoiceNumber: "INV-5",
          status: "refunded",
          orderStatus: "refunded",
          paidAt: "2026-09-08T10:05:00.000Z",
          createdAt: "2026-09-08T10:00:00.000Z",
          readUrl: null,
          supportUrl: undefined,
        }),
      ],
      items: [],
    };

    const htmlVi = renderToStaticMarkup(
      <OrderHistory locale="vi" orders={mockHistory} />,
    );
    expect(htmlVi).toContain("Đã thanh toán");
    expect(htmlVi).toContain("Đang chờ thanh toán");
    expect(htmlVi).toContain("Hết hạn");
    expect(htmlVi).toContain("Thất bại");
    expect(htmlVi).toContain("Đã hoàn tiền");
    expect(htmlVi).toContain("17:05 08/09/2026");
    expect(htmlVi).toContain("17:00 08/09/2026");

    expect(htmlVi).not.toContain("paid");
    expect(htmlVi).not.toContain("pending");
    expect(htmlVi).not.toContain("expired");
    expect(htmlVi).not.toContain("refunded");

    const htmlEn = renderToStaticMarkup(
      <OrderHistory locale="en" orders={mockHistory} />,
    );
    expect(htmlEn).toContain("Paid");
    expect(htmlEn).toContain("Pending payment");
    expect(htmlEn).toContain("Expired");
    expect(htmlEn).toContain("Failed");
    expect(htmlEn).toContain("Refunded");
    expect(htmlEn).toContain("2026-09-08 17:05");
    expect(htmlEn).toContain("2026-09-08 17:00");
  });

  it("renders customer order code, profile fallback, and localized VND amount", () => {
    const historyWithFallback: OrderHistoryV1 = {
      version: 1,
      totalCount: 2,
      orders: [
        createMockOrder({
          invoiceNumber: "LSV-ORD-CODE-777",
          profileDisplayName: "Nguyễn Văn A",
          amount: 79_000,
          productTitle: "Bản mệnh & tiềm năng",
        }),
        createMockOrder({
          invoiceNumber: "LSV-ORD-CODE-888",
          profileDisplayName: "   ",
          amount: 1_200_000,
          productTitle: "Vận hạn chuyên sâu",
        }),
      ],
      items: [],
    };

    const htmlVi = renderToStaticMarkup(
      <OrderHistory locale="vi" orders={historyWithFallback} />,
    );
    expect(htmlVi).toContain("LSV-ORD-CODE-777");
    expect(htmlVi).toContain("LSV-ORD-CODE-888");
    expect(htmlVi).toContain("Nguyễn Văn A");
    expect(htmlVi).toContain("Hồ sơ cá nhân");
    expect(htmlVi).not.toContain("Personal profile");
    expect(htmlVi).toContain("79.000 ₫");
    expect(htmlVi).toContain("1.200.000 ₫");

    const htmlEn = renderToStaticMarkup(
      <OrderHistory locale="en" orders={historyWithFallback} />,
    );
    expect(htmlEn).toContain("LSV-ORD-CODE-777");
    expect(htmlEn).toContain("Personal profile");
    expect(htmlEn).not.toContain("Hồ sơ cá nhân");
  });

  it("renders readUrl and supportUrl only when present and never invents links", () => {
    const historyWithUrls: OrderHistoryV1 = {
      version: 1,
      totalCount: 3,
      orders: [
        createMockOrder({
          invoiceNumber: "INV-READ-ONLY",
          status: "paid",
          readUrl: "/bao-cao/report-ready-1",
          supportUrl: undefined,
        }),
        createMockOrder({
          invoiceNumber: "INV-SUPPORT-ONLY",
          id: "internal-order-id-2",
          orderId: "internal-order-id-2",
          status: "pending",
          readUrl: null,
          supportUrl: "/lien-he?order=INV-SUPPORT-ONLY",
        }),
        createMockOrder({
          invoiceNumber: "INV-NEITHER",
          status: "expired",
          readUrl: null,
          supportUrl: undefined,
        }),
      ],
      items: [],
    };

    const htmlVi = renderToStaticMarkup(
      <OrderHistory locale="vi" orders={historyWithUrls} />,
    );
    expect(htmlVi).toContain('href="/bao-cao/report-ready-1"');
    expect(htmlVi).toContain("Đọc báo cáo");
    expect(htmlVi).toContain('href="/lien-he?order=INV-SUPPORT-ONLY"');
    expect(htmlVi).toContain("Hỗ trợ");
    expect(htmlVi).not.toContain("internal-order-id-2");

    const readMatches = (htmlVi.match(/href="\/bao-cao\//g) || []).length;
    const supportMatches = (htmlVi.match(/href="\/lien-he/g) || []).length;
    expect(readMatches).toBe(1);
    expect(supportMatches).toBe(1);

    expect(htmlVi).not.toContain("/thanh-toan");
    expect(htmlVi).not.toContain("/checkout");

    const htmlEn = renderToStaticMarkup(
      <OrderHistory locale="en" orders={historyWithUrls} />,
    );
    expect(htmlEn).toContain('href="/bao-cao/report-ready-1"');
    expect(htmlEn).toContain("Read report");
    expect(htmlEn).toContain('href="/lien-he?order=INV-SUPPORT-ONLY"');
    expect(htmlEn).toContain("Support");
  });

  it("ensures no SKU or internal technical IDs are leaked into rendered output", () => {
    const historyWithSecrets: OrderHistoryV1 = {
      version: 1,
      totalCount: 1,
      orders: [
        createMockOrder({
          id: "ord-secret-uuid-111",
          orderId: "ord-secret-uuid-111",
          chartId: "chart-secret-uuid-222",
          profileId: "prof-secret-uuid-333",
          reportId: "rep-secret-uuid-444",
          sku: "ZIWEI-IDENTITY-P0",
          invoiceNumber: "LSV-CLEAN-INVOICE",
          readUrl: "/bao-cao/clean-report-url",
          supportUrl: "/lien-he",
        }),
      ],
      items: [],
    };

    const html = renderToStaticMarkup(
      <OrderHistory locale="vi" orders={historyWithSecrets} />,
    );

    expect(html).toContain("LSV-CLEAN-INVOICE");
    expect(html).toContain('href="/bao-cao/clean-report-url"');
    expect(html).not.toContain("ZIWEI-IDENTITY-P0");
    expect(html).not.toContain("ord-secret-uuid-111");
    expect(html).not.toContain("chart-secret-uuid-222");
    expect(html).not.toContain("prof-secret-uuid-333");
    expect(html).not.toContain("rep-secret-uuid-444");
  });

  it("renders locale-correct empty state linking to /tao-la-so/tu-vi in VI and EN", () => {
    const emptyHistory: OrderHistoryV1 = {
      version: 1,
      totalCount: 0,
      orders: [],
      items: [],
    };

    const htmlVi = renderToStaticMarkup(
      <OrderHistory locale="vi" orders={emptyHistory} />,
    );
    expect(htmlVi).toContain("Chưa có đơn hàng nào");
    expect(htmlVi).toContain("Bạn chưa có đơn hàng nào. Hãy lập lá số Tử Vi để bắt đầu khám phá.");
    expect(htmlVi).toContain('href="/tao-la-so/tu-vi"');
    expect(htmlVi).toContain("Lập lá số Tử Vi");
    expect(htmlVi).not.toContain("/en/tao-la-so/tu-vi");

    const htmlEn = renderToStaticMarkup(
      <OrderHistory locale="en" orders={null} />,
    );
    expect(htmlEn).toContain("No orders yet");
    expect(htmlEn).toContain("You have no orders yet. Create your Zi Wei chart to get started.");
    expect(htmlEn).toContain('href="/en/tao-la-so/tu-vi"');
    expect(htmlEn).toContain("Create Zi Wei chart");
    expect(htmlEn).not.toContain('href="/tao-la-so/tu-vi"');
  });

  it("renders unavailable state without empty copy or create-chart CTA", () => {
    const html = renderToStaticMarkup(
      <OrderHistory locale="vi" error="Dịch vụ đơn hàng tạm thời không khả dụng" />,
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain("Dịch vụ đơn hàng tạm thời không khả dụng");
    expect(html).toContain("Chưa thể tải lịch sử đơn hàng");
    expect(html).not.toContain("Chưa có đơn hàng nào");
    expect(html).not.toContain("/tao-la-so/tu-vi");
    expect(html).not.toContain("Lập lá số Tử Vi");
  });
});
