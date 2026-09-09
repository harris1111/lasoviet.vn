import type { AccountLibraryItemV1, AccountLibraryV1 } from "@lasoviet/contracts";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AccountLibrary } from "./account-library";

function createMockItem(overrides: Partial<AccountLibraryItemV1> = {}): AccountLibraryItemV1 {
  return {
    id: "ent-default-id",
    entitlementId: "ent-default-id",
    orderId: "ord-default-id",
    chartId: "chart-default-id",
    profileId: "prof-default-id",
    profileDisplayName: "Nguyễn Văn A",
    sku: "ZIWEI-IDENTITY-P0",
    productTitle: "Bản mệnh & tiềm năng",
    productName: "Bản mệnh & tiềm năng",
    orderStatus: "paid",
    entitlementStatus: "active",
    reportId: "rep-default-id",
    readUrl: "/bao-cao/rep-default-id",
    reportStatus: "ready",
    locale: "vi",
    createdAt: "2026-09-08T10:00:00.000Z",
    purchasedAt: "2026-09-08T10:05:00.000Z",
    ...overrides,
  };
}

describe("AccountLibrary", () => {
  it("renders reports grouped in server projection order", () => {
    const mockLibrary: AccountLibraryV1 = {
      version: 1,
      totalCount: 3,
      latestReadableReport: null,
      groups: [
        {
          profileId: "prof-1",
          profileDisplayName: "Hồ sơ của An",
          chartId: "chart-1",
          latestReportId: "rep-1",
          latestReadUrl: "/bao-cao/rep-1",
          items: [
            createMockItem({
              id: "ent-1",
              productTitle: "Bản mệnh An 1",
              profileDisplayName: "Hồ sơ của An",
            }),
            createMockItem({
              id: "ent-2",
              productTitle: "Vận hạn An 2",
              profileDisplayName: "Hồ sơ của An",
            }),
          ],
        },
        {
          profileId: "prof-2",
          profileDisplayName: "Hồ sơ của Bình",
          chartId: "chart-2",
          latestReportId: "rep-3",
          latestReadUrl: "/bao-cao/rep-3",
          items: [
            createMockItem({
              id: "ent-3",
              productTitle: "Tình duyên Bình 1",
              profileDisplayName: "Hồ sơ của Bình",
            }),
          ],
        },
      ],
      items: [],
    };

    const html = renderToStaticMarkup(
      <AccountLibrary locale="vi" library={mockLibrary} />,
    );

    const posGroup1 = html.indexOf("Hồ sơ của An");
    const posGroup2 = html.indexOf("Hồ sơ của Bình");
    expect(posGroup1).toBeGreaterThan(-1);
    expect(posGroup2).toBeGreaterThan(-1);
    expect(posGroup1).toBeLessThan(posGroup2);

    const posItem1 = html.indexOf("Bản mệnh An 1");
    const posItem2 = html.indexOf("Vận hạn An 2");
    const posItem3 = html.indexOf("Tình duyên Bình 1");
    expect(posItem1).toBeGreaterThan(-1);
    expect(posItem2).toBeGreaterThan(-1);
    expect(posItem3).toBeGreaterThan(-1);
    expect(posItem1).toBeLessThan(posItem2);
    expect(posItem2).toBeLessThan(posItem3);
  });

  it("applies profile fallback when profileDisplayName is missing or whitespace in VI and EN", () => {
    const fallbackLibrary: AccountLibraryV1 = {
      version: 1,
      totalCount: 1,
      latestReadableReport: null,
      groups: [
        {
          profileId: null,
          profileDisplayName: "   ",
          chartId: "chart-fallback",
          latestReportId: null,
          latestReadUrl: null,
          items: [
            createMockItem({
              id: "ent-fb",
              profileDisplayName: null,
            }),
          ],
        },
      ],
      items: [],
    };

    const htmlVi = renderToStaticMarkup(
      <AccountLibrary locale="vi" library={fallbackLibrary} />,
    );
    expect(htmlVi).toContain("Hồ sơ cá nhân");
    expect(htmlVi).not.toContain("Personal profile");

    const htmlEn = renderToStaticMarkup(
      <AccountLibrary locale="en" library={fallbackLibrary} />,
    );
    expect(htmlEn).toContain("Personal profile");
    expect(htmlEn).not.toContain("Hồ sơ cá nhân");
  });

  it("renders readUrl link only when present and never invents links", () => {
    const library: AccountLibraryV1 = {
      version: 1,
      totalCount: 2,
      latestReadableReport: null,
      groups: [
        {
          profileId: "prof-1",
          profileDisplayName: "Nguyễn Văn A",
          chartId: "chart-1",
          latestReportId: "rep-ready-1",
          latestReadUrl: "/bao-cao/report-ready-1",
          items: [
            createMockItem({
              id: "ent-ready",
              productTitle: "Báo cáo sẵn sàng",
              readUrl: "/bao-cao/report-ready-1",
              reportStatus: "ready",
            }),
            createMockItem({
              id: "ent-pending",
              productTitle: "Báo cáo đang xử lý",
              readUrl: null,
              reportId: "rep-secret-uuid-999",
              reportStatus: "generating",
              orderStatus: "paid",
            }),
          ],
        },
      ],
      items: [],
    };

    const htmlVi = renderToStaticMarkup(
      <AccountLibrary locale="vi" library={library} />,
    );
    expect(htmlVi).toContain('href="/bao-cao/report-ready-1"');
    expect(htmlVi).toContain("Đọc báo cáo");

    expect(htmlVi).not.toContain("rep-secret-uuid-999");
    expect(htmlVi).not.toContain("/bao-cao/rep-secret-uuid-999");

    const readLinkMatches = (htmlVi.match(/href="\/bao-cao\//g) || []).length;
    expect(readLinkMatches).toBe(1);

    const htmlEn = renderToStaticMarkup(
      <AccountLibrary locale="en" library={library} />,
    );
    expect(htmlEn).toContain('href="/bao-cao/report-ready-1"');
    expect(htmlEn).toContain("Read report");
  });

  it("ensures no SKU or internal IDs are leaked in rendered HTML", () => {
    const library: AccountLibraryV1 = {
      version: 1,
      totalCount: 1,
      latestReadableReport: null,
      groups: [
        {
          profileId: "prof-secret-id-999",
          profileDisplayName: "Lê Văn C",
          chartId: "chart-secret-id-888",
          latestReportId: "rep-secret-id-777",
          latestReadUrl: "/bao-cao/clean-slug-url",
          items: [
            createMockItem({
              id: "ent-secret-id-111",
              entitlementId: "ent-secret-id-111",
              orderId: "ord-secret-id-222",
              chartId: "chart-secret-id-888",
              profileId: "prof-secret-id-999",
              profileDisplayName: "Lê Văn C",
              sku: "ZIWEI-IDENTITY-P0",
              reportId: "rep-secret-id-777",
              readUrl: "/bao-cao/clean-slug-url",
            }),
          ],
        },
      ],
      items: [],
    };

    const html = renderToStaticMarkup(
      <AccountLibrary locale="vi" library={library} />,
    );

    expect(html).not.toContain("ZIWEI-IDENTITY-P0");
    expect(html).not.toContain("ent-secret-id-111");
    expect(html).not.toContain("ord-secret-id-222");
    expect(html).not.toContain("chart-secret-id-888");
    expect(html).not.toContain("prof-secret-id-999");
    expect(html).not.toContain("rep-secret-id-777");
  });

  it("renders localized non-raw statuses and Ho Chi Minh purchase time in VI and EN", () => {
    const library: AccountLibraryV1 = {
      version: 1,
      totalCount: 2,
      latestReadableReport: null,
      groups: [
        {
          profileId: "prof-1",
          profileDisplayName: "Nguyễn Văn A",
          chartId: "chart-1",
          latestReportId: null,
          latestReadUrl: null,
          items: [
            createMockItem({
              id: "ent-ready",
              productTitle: "Báo cáo hoàn tất",
              reportStatus: "ready",
              orderStatus: "paid",
              purchasedAt: "2026-09-08T10:05:00.000Z",
            }),
            createMockItem({
              id: "ent-failed",
              productTitle: "Báo cáo lỗi",
              reportStatus: "failed",
              orderStatus: "failed",
              purchasedAt: "2026-09-08T10:05:00.000Z",
              readUrl: null,
            }),
          ],
        },
      ],
      items: [],
    };

    const htmlVi = renderToStaticMarkup(
      <AccountLibrary locale="vi" library={library} />,
    );
    expect(htmlVi).toContain("Đã hoàn tất");
    expect(htmlVi).toContain("Thất bại");
    expect(htmlVi).toContain("17:05 08/09/2026");
    expect(htmlVi).not.toContain("ready");
    expect(htmlVi).not.toContain("failed");

    const htmlEn = renderToStaticMarkup(
      <AccountLibrary locale="en" library={library} />,
    );
    expect(htmlEn).toContain("Completed");
    expect(htmlEn).toContain("Failed");
    expect(htmlEn).toContain("2026-09-08 17:05");
  });

  it("renders empty state with locale-correct link to /tao-la-so/tu-vi in VI and EN", () => {
    const emptyLib: AccountLibraryV1 = {
      version: 1,
      totalCount: 0,
      latestReadableReport: null,
      groups: [],
      items: [],
    };

    const htmlVi = renderToStaticMarkup(
      <AccountLibrary locale="vi" library={emptyLib} />,
    );
    expect(htmlVi).toContain("Chưa có báo cáo nào");
    expect(htmlVi).toContain("Bạn chưa có báo cáo luận giải nào. Hãy lập lá số Tử Vi để bắt đầu khám phá.");
    expect(htmlVi).toContain('href="/tao-la-so/tu-vi"');
    expect(htmlVi).toContain("Lập lá số Tử Vi");
    expect(htmlVi).not.toContain("/en/tao-la-so/tu-vi");

    const htmlEn = renderToStaticMarkup(
      <AccountLibrary locale="en" library={null} />,
    );
    expect(htmlEn).toContain("No reports yet");
    expect(htmlEn).toContain("You have no reports yet. Create your Zi Wei chart to get started.");
    expect(htmlEn).toContain('href="/en/tao-la-so/tu-vi"');
    expect(htmlEn).toContain("Create Zi Wei chart");
    expect(htmlEn).not.toContain('href="/tao-la-so/tu-vi"');
  });

  it("renders error banner when error prop is provided", () => {
    const html = renderToStaticMarkup(
      <AccountLibrary locale="vi" error="Dịch vụ báo cáo tạm thời không khả dụng" />,
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain("Dịch vụ báo cáo tạm thời không khả dụng");
  });
});
