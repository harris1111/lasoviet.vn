import type {
  AccountLibraryItemV1,
  AccountLibraryV1,
  OrderHistoryItemV1,
  OrderHistoryV1,
} from "@lasoviet/contracts";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AccountDashboard } from "./account-dashboard";

function createMockReport(
  overrides: Partial<AccountLibraryItemV1> = {},
): AccountLibraryItemV1 {
  return {
    id: "rep-item-default",
    entitlementId: "ent-default",
    orderId: "ord-default",
    chartId: "chart-default",
    profileId: "prof-default",
    profileDisplayName: "Nguyễn Văn A",
    sku: "ZIWEI-IDENTITY-P0",
    productTitle: "Bản mệnh & tiềm năng",
    productName: "Bản mệnh & tiềm năng",
    orderStatus: "paid",
    entitlementStatus: "active",
    reportId: "rep-default",
    readUrl: "/bao-cao/rep-default",
    reportStatus: "ready",
    locale: "vi",
    createdAt: "2026-09-08T10:00:00.000Z",
    purchasedAt: "2026-09-08T10:05:00.000Z",
    ...overrides,
  };
}

function createMockOrder(
  overrides: Partial<OrderHistoryItemV1> = {},
): OrderHistoryItemV1 {
  return {
    id: "ord-item-default",
    orderId: "ord-default",
    invoiceNumber: "LSV-INV-001",
    chartId: "chart-default",
    profileId: "prof-default",
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
    reportId: "rep-default",
    readUrl: "/bao-cao/rep-default",
    supportUrl: "/lien-he?order=LSV-INV-001",
    ...overrides,
  };
}

describe("AccountDashboard", () => {
  it("prioritizes latestReadableReport and renders continue reading link in VI and EN", () => {
    const library: AccountLibraryV1 = {
      version: 1,
      totalCount: 2,
      latestReadableReport: createMockReport({
        id: "rep-latest",
        productTitle: "Báo cáo gần nhất của bạn",
        readUrl: "/bao-cao/latest-readable-report",
        profileDisplayName: "Trần Thị B",
      }),
      groups: [],
      items: [
        createMockReport({
          id: "rep-1",
          productTitle: "Báo cáo cũ 1",
          readUrl: "/bao-cao/old-1",
        }),
      ],
    };

    const orders: OrderHistoryV1 = {
      version: 1,
      totalCount: 1,
      orders: [createMockOrder()],
      items: [],
    };

    const htmlVi = renderToStaticMarkup(
      <AccountDashboard locale="vi" library={library} orders={orders} />,
    );
    expect(htmlVi).toContain("Báo cáo gần nhất");
    expect(htmlVi).toContain("Báo cáo gần nhất của bạn");
    expect(htmlVi).toContain("Trần Thị B");
    expect(htmlVi).toContain("href=\"/bao-cao/latest-readable-report\"");
    expect(htmlVi).toContain("Đọc tiếp");

    const htmlEn = renderToStaticMarkup(
      <AccountDashboard locale="en" library={library} orders={orders} />,
    );
    expect(htmlEn).toContain("Latest report");
    expect(htmlEn).toContain("Continue reading");
    expect(htmlEn).toContain("href=\"/bao-cao/latest-readable-report\"");
  });

  it("omits latest report section when latestReadableReport is null", () => {
    const library: AccountLibraryV1 = {
      version: 1,
      totalCount: 1,
      latestReadableReport: null,
      groups: [],
      items: [
        createMockReport({
          id: "rep-pending",
          productTitle: "Báo cáo đang xử lý",
          readUrl: null,
          reportStatus: "generating",
        }),
      ],
    };

    const html = renderToStaticMarkup(
      <AccountDashboard locale="vi" library={library} />,
    );
    expect(html).not.toContain("account-latest-section");
    expect(html).not.toContain("Đọc tiếp");
    expect(html).toContain("Báo cáo đang xử lý");
  });

  it("shows exact total counts for reports and orders", () => {
    const library: AccountLibraryV1 = {
      version: 1,
      totalCount: 42,
      latestReadableReport: null,
      groups: [],
      items: [createMockReport()],
    };

    const orders: OrderHistoryV1 = {
      version: 1,
      totalCount: 15,
      orders: [createMockOrder()],
      items: [],
    };

    const html = renderToStaticMarkup(
      <AccountDashboard locale="vi" library={library} orders={orders} />,
    );
    expect(html).toContain("42");
    expect(html).toContain("15");
    expect(html).toContain("Tổng số báo cáo");
    expect(html).toContain("Tổng số đơn hàng");
  });

  it("caps recent reports and orders at 3 rows each", () => {
    const library: AccountLibraryV1 = {
      version: 1,
      totalCount: 5,
      latestReadableReport: null,
      groups: [],
      items: [
        createMockReport({ id: "rep-1", productTitle: "Báo cáo 1" }),
        createMockReport({ id: "rep-2", productTitle: "Báo cáo 2" }),
        createMockReport({ id: "rep-3", productTitle: "Báo cáo 3" }),
        createMockReport({ id: "rep-4", productTitle: "Báo cáo 4" }),
        createMockReport({ id: "rep-5", productTitle: "Báo cáo 5" }),
      ],
    };

    const orders: OrderHistoryV1 = {
      version: 1,
      totalCount: 5,
      orders: [
        createMockOrder({ id: "ord-1", invoiceNumber: "INV-001" }),
        createMockOrder({ id: "ord-2", invoiceNumber: "INV-002" }),
        createMockOrder({ id: "ord-3", invoiceNumber: "INV-003" }),
        createMockOrder({ id: "ord-4", invoiceNumber: "INV-004" }),
        createMockOrder({ id: "ord-5", invoiceNumber: "INV-005" }),
      ],
      items: [],
    };

    const html = renderToStaticMarkup(
      <AccountDashboard locale="vi" library={library} orders={orders} />,
    );

    expect(html).toContain("Báo cáo 1");
    expect(html).toContain("Báo cáo 2");
    expect(html).toContain("Báo cáo 3");
    expect(html).not.toContain("Báo cáo 4");
    expect(html).not.toContain("Báo cáo 5");

    expect(html).toContain("INV-001");
    expect(html).toContain("INV-002");
    expect(html).toContain("INV-003");
    expect(html).not.toContain("INV-004");
    expect(html).not.toContain("INV-005");
  });

  it("renders empty state with canonical link to /tao-la-so/tu-vi in VI and EN", () => {
    const emptyLib: AccountLibraryV1 = {
      version: 1,
      totalCount: 0,
      latestReadableReport: null,
      groups: [],
      items: [],
    };

    const emptyOrders: OrderHistoryV1 = {
      version: 1,
      totalCount: 0,
      orders: [],
      items: [],
    };

    const htmlVi = renderToStaticMarkup(
      <AccountDashboard locale="vi" library={emptyLib} orders={emptyOrders} />,
    );
    expect(htmlVi).toContain("Chưa có báo cáo hoặc đơn hàng");
    expect(htmlVi).toContain("href=\"/tao-la-so/tu-vi\"");
    expect(htmlVi).toContain("Lập lá số Tử Vi");
    expect(htmlVi).not.toContain("/la-so");

    const htmlEn = renderToStaticMarkup(
      <AccountDashboard locale="en" library={emptyLib} orders={emptyOrders} />,
    );
    expect(htmlEn).toContain("No reports or orders yet");
    expect(htmlEn).toContain("href=\"/en/tao-la-so/tu-vi\"");
    expect(htmlEn).toContain("Create Zi Wei chart");
    expect(htmlEn).not.toContain("/en/la-so");
  });

  it("localizes statuses and Ho Chi Minh dates in VI and EN", () => {
    const library: AccountLibraryV1 = {
      version: 1,
      totalCount: 1,
      latestReadableReport: null,
      groups: [],
      items: [
        createMockReport({
          reportStatus: "ready",
          orderStatus: "paid",
          purchasedAt: "2026-09-08T10:05:00.000Z",
        }),
      ],
    };

    const orders: OrderHistoryV1 = {
      version: 1,
      totalCount: 1,
      orders: [
        createMockOrder({
          status: "expired",
          orderStatus: "expired",
          createdAt: "2026-09-08T10:00:00.000Z",
          paidAt: null,
        }),
      ],
      items: [],
    };

    const htmlVi = renderToStaticMarkup(
      <AccountDashboard locale="vi" library={library} orders={orders} />,
    );
    expect(htmlVi).toContain("Đã hoàn tất");
    expect(htmlVi).toContain("Hết hạn");
    expect(htmlVi).toContain("17:05 08/09/2026");
    expect(htmlVi).toContain("17:00 08/09/2026");
    expect(htmlVi).not.toContain("expired");
    expect(htmlVi).not.toContain("ready");

    const htmlEn = renderToStaticMarkup(
      <AccountDashboard locale="en" library={library} orders={orders} />,
    );
    expect(htmlEn).toContain("Completed");
    expect(htmlEn).toContain("Expired");
    expect(htmlEn).toContain("2026-09-08 17:05");
    expect(htmlEn).toContain("2026-09-08 17:00");
  });

  it("ensures no SKU or internal IDs are leaked into rendered HTML", () => {
    const library: AccountLibraryV1 = {
      version: 1,
      totalCount: 1,
      latestReadableReport: createMockReport({
        id: "rep-secret-item-id-1",
        entitlementId: "ent-secret-id-2",
        orderId: "ord-secret-id-3",
        chartId: "chart-secret-id-4",
        profileId: "prof-secret-id-5",
        reportId: "rep-secret-id-6",
        sku: "ZIWEI-IDENTITY-P0",
        readUrl: "/bao-cao/clean-read-url",
      }),
      groups: [],
      items: [
        createMockReport({
          id: "rep-secret-item-id-7",
          sku: "ZIWEI-IDENTITY-P0",
          readUrl: "/bao-cao/clean-read-url",
        }),
      ],
    };

    const orders: OrderHistoryV1 = {
      version: 1,
      totalCount: 1,
      orders: [
        createMockOrder({
          id: "ord-secret-item-id-8",
          orderId: "ord-secret-id-9",
          chartId: "chart-secret-id-10",
          profileId: "prof-secret-id-11",
          reportId: "rep-secret-id-12",
          sku: "ZIWEI-IDENTITY-P0",
          invoiceNumber: "LSV-CUSTOMER-INV-01",
        }),
      ],
      items: [],
    };

    const html = renderToStaticMarkup(
      <AccountDashboard locale="vi" library={library} orders={orders} />,
    );

    expect(html).toContain("LSV-CUSTOMER-INV-01");
    expect(html).toContain("href=\"/bao-cao/clean-read-url\"");
    expect(html).not.toContain("ZIWEI-IDENTITY-P0");
    expect(html).not.toContain("rep-secret-item-id-1");
    expect(html).not.toContain("ent-secret-id-2");
    expect(html).not.toContain("ord-secret-id-3");
    expect(html).not.toContain("chart-secret-id-4");
    expect(html).not.toContain("prof-secret-id-5");
    expect(html).not.toContain("rep-secret-id-6");
    expect(html).not.toContain("rep-secret-item-id-7");
    expect(html).not.toContain("ord-secret-item-id-8");
    expect(html).not.toContain("ord-secret-id-9");
    expect(html).not.toContain("chart-secret-id-10");
    expect(html).not.toContain("prof-secret-id-11");
    expect(html).not.toContain("rep-secret-id-12");
  });

  it("renders full unavailable state without empty copy or create-chart CTA", () => {
    const html = renderToStaticMarkup(
      <AccountDashboard
        locale="vi"
        error="Dịch vụ tài khoản tạm thời không khả dụng"
      />,
    );
    expect(html).toContain("role=\"alert\"");
    expect(html).toContain("Dịch vụ tài khoản tạm thời không khả dụng");
    expect(html).toContain("Chưa thể tải dữ liệu tài khoản");
    expect(html).not.toContain("Chưa có báo cáo hoặc đơn hàng");
    expect(html).not.toContain("/tao-la-so/tu-vi");
    expect(html).not.toContain("Lập lá số Tử Vi");
  });

  it("preserves successful orders while marking missing reports unavailable", () => {
    const orders: OrderHistoryV1 = {
      version: 1,
      totalCount: 1,
      orders: [createMockOrder({ invoiceNumber: "LSV-PARTIAL-001" })],
      items: [],
    };

    const html = renderToStaticMarkup(
      <AccountDashboard
        locale="vi"
        orders={orders}
        error="Không thể tải danh sách báo cáo. Vui lòng thử lại sau."
      />,
    );

    expect(html).toContain("LSV-PARTIAL-001");
    expect(html).toContain("Danh sách báo cáo tạm thời không khả dụng.");
    expect(html).not.toContain("Chưa có báo cáo hoặc đơn hàng");
    expect(html).not.toContain("/tao-la-so/tu-vi");
  });
  it("renders profile count, consent count, and recent activity from overview", () => {
    const overview = {
      account: {
        id: "usr-1",
        name: "User One",
        email: "user@example.com",
        createdAt: "2026-09-01T00:00:00.000Z",
      },
      counts: {
        profileCount: 7,
        reportCount: 2,
        orderCount: 2,
        consentActiveCount: 3,
        consentTotalCount: 3,
      },
      recentActivity: [
        {
          id: "act-1",
          type: "profile_created" as const,
          targetId: "prof-1",
          timestamp: "2026-09-08T10:00:00.000Z",
        },
        {
          id: "act-2",
          type: "report_purchased" as const,
          targetId: "rep-1",
          timestamp: "2026-09-08T10:05:00.000Z",
        },
      ],
    };

    const htmlVi = renderToStaticMarkup(
      <AccountDashboard locale="vi" overview={overview} />,
    );
    expect(htmlVi).toContain("Hồ sơ lá số");
    expect(htmlVi).toContain("7");
    expect(htmlVi).toContain("Mục đồng ý đang bật");
    expect(htmlVi).toContain("3");
    expect(htmlVi).toContain("Hoạt động gần đây");
    expect(htmlVi).toContain("Tạo hồ sơ lá số");
    expect(htmlVi).toContain("Mua báo cáo luận giải");

    const htmlEn = renderToStaticMarkup(
      <AccountDashboard locale="en" overview={overview} />,
    );
    expect(htmlEn).toContain("Birth profiles");
    expect(htmlEn).toContain("Active consents");
    expect(htmlEn).toContain("Recent activity");
    expect(htmlEn).toContain("Birth profile created");
    expect(htmlEn).toContain("Report purchased");
  });

  it("renders empty recent activity text when overview activity list is empty", () => {
    const overview = {
      account: {
        id: "usr-1",
        name: "User One",
        email: "user@example.com",
        createdAt: "2026-09-01T00:00:00.000Z",
      },
      counts: {
        profileCount: 0,
        reportCount: 0,
        orderCount: 0,
        consentActiveCount: 0,
        consentTotalCount: 0,
      },
      recentActivity: [],
    };

    const htmlVi = renderToStaticMarkup(
      <AccountDashboard locale="vi" overview={overview} />,
    );
    expect(htmlVi).toContain("Chưa có hoạt động nào gần đây.");

    const htmlEn = renderToStaticMarkup(
      <AccountDashboard locale="en" overview={overview} />,
    );
    expect(htmlEn).toContain("No recent activity.");
  });

  it("does not masquerade partial failure as an empty successful account", () => {
    const html = renderToStaticMarkup(
      <AccountDashboard
        locale="vi"
        library={null}
        orders={{ version: 1, totalCount: 0, orders: [], items: [] }}
        error="Không thể tải danh sách báo cáo. Vui lòng thử lại sau."
      />,
    );

    expect(html).toContain('role="alert"');
    expect(html).toContain("Không thể tải danh sách báo cáo. Vui lòng thử lại sau.");
    // Must NOT show empty state with create chart CTA
    expect(html).not.toContain("Chưa có báo cáo hoặc đơn hàng");
    expect(html).not.toContain("Lập lá số Tử Vi");
  });
});
