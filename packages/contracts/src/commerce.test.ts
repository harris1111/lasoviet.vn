import { describe, expect, it } from "vitest";

import {
  AccountLibraryV1Schema,
  OrderHistoryV1Schema,
  resolveProductTitle,
} from "./commerce.js";

describe("commerce contracts", () => {
  it("resolves product titles according to locale", () => {
    expect(resolveProductTitle("ZIWEI-IDENTITY-P0", "vi")).toBe("Bản mệnh & tiềm năng");
    expect(resolveProductTitle("ZIWEI-IDENTITY-P0", "en")).toBe("Identity and potential");
  });

  it("validates owner-scoped AccountLibraryV1 projection", () => {
    const validLibrary = {
      version: 1,
      groups: [
        {
          profileId: "profile-1",
          profileDisplayName: "Nguyễn Văn A",
          chartId: "chart-1",
          items: [
            {
              id: "entitlement-1",
              entitlementId: "entitlement-1",
              orderId: "order-1",
              chartId: "chart-1",
              profileId: "profile-1",
              profileDisplayName: "Nguyễn Văn A",
              sku: "ZIWEI-IDENTITY-P0",
              productTitle: "Bản mệnh & tiềm năng",
              productName: "Bản mệnh & tiềm năng",
              orderStatus: "paid",
              entitlementStatus: "active",
              reportId: "11111111-1111-4111-8111-111111111111",
              readUrl: "/bao-cao/11111111-1111-4111-8111-111111111111",
              reportStatus: "ready",
              locale: "vi",
              createdAt: "2026-09-08T10:00:00.000Z",
              purchasedAt: "2026-09-08T10:05:00.000Z",
            },
          ],
          latestReportId: "11111111-1111-4111-8111-111111111111",
          latestReadUrl: "/bao-cao/11111111-1111-4111-8111-111111111111",
        },
      ],
      items: [
        {
          id: "entitlement-1",
          entitlementId: "entitlement-1",
          orderId: "order-1",
          chartId: "chart-1",
          profileId: "profile-1",
          profileDisplayName: "Nguyễn Văn A",
          sku: "ZIWEI-IDENTITY-P0",
          productTitle: "Bản mệnh & tiềm năng",
          productName: "Bản mệnh & tiềm năng",
          orderStatus: "paid",
          entitlementStatus: "active",
          reportId: "11111111-1111-4111-8111-111111111111",
          readUrl: "/bao-cao/11111111-1111-4111-8111-111111111111",
          reportStatus: "ready",
          locale: "vi",
          createdAt: "2026-09-08T10:00:00.000Z",
          purchasedAt: "2026-09-08T10:05:00.000Z",
        },
      ],
      latestReadableReport: {
        id: "entitlement-1",
        entitlementId: "entitlement-1",
        orderId: "order-1",
        chartId: "chart-1",
        profileId: "profile-1",
        profileDisplayName: "Nguyễn Văn A",
        sku: "ZIWEI-IDENTITY-P0",
        productTitle: "Bản mệnh & tiềm năng",
        productName: "Bản mệnh & tiềm năng",
        orderStatus: "paid",
        entitlementStatus: "active",
        reportId: "11111111-1111-4111-8111-111111111111",
        readUrl: "/bao-cao/11111111-1111-4111-8111-111111111111",
        reportStatus: "ready",
        locale: "vi",
        createdAt: "2026-09-08T10:00:00.000Z",
        purchasedAt: "2026-09-08T10:05:00.000Z",
      },
      totalCount: 1,
    };

    const parsed = AccountLibraryV1Schema.safeParse(validLibrary);
    expect(parsed.success).toBe(true);

    // Rejects invalid version
    expect(AccountLibraryV1Schema.safeParse({ ...validLibrary, version: 2 }).success).toBe(false);

    // Rejects unsupported sku
    expect(AccountLibraryV1Schema.safeParse({
      ...validLibrary,
      items: [{ ...validLibrary.items[0], sku: "UNSUPPORTED-SKU" }],
    }).success).toBe(false);

    // Rejects raw database internals / unpermitted extra fields due to strict()
    expect(AccountLibraryV1Schema.safeParse({
      ...validLibrary,
      rawSqlDump: true,
    }).success).toBe(false);
  });

  it("validates OrderHistoryV1 projection with expired and paid orders", () => {
    const validHistory = {
      version: 1,
      orders: [
        {
          id: "order-paid",
          orderId: "order-paid",
          invoiceNumber: "LSV-order-paid",
          chartId: "chart-1",
          profileId: "profile-1",
          profileDisplayName: "Nguyễn Văn A",
          sku: "ZIWEI-IDENTITY-P0",
          productTitle: "Bản mệnh & tiềm năng",
          productName: "Bản mệnh & tiềm năng",
          amount: 79000,
          currency: "VND",
          status: "paid",
          orderStatus: "paid",
          locale: "vi",
          createdAt: "2026-09-08T10:00:00.000Z",
          paidAt: "2026-09-08T10:05:00.000Z",
          reportId: "11111111-1111-4111-8111-111111111111",
          readUrl: "/bao-cao/11111111-1111-4111-8111-111111111111",
          supportUrl: "/lien-he?orderId=order-paid",
        },
        {
          id: "order-expired",
          orderId: "order-expired",
          invoiceNumber: "LSV-order-expired",
          chartId: "chart-1",
          profileId: null,
          profileDisplayName: null,
          sku: "ZIWEI-IDENTITY-P0",
          productTitle: "Bản mệnh & tiềm năng",
          productName: "Bản mệnh & tiềm năng",
          amount: 79000,
          currency: "VND",
          status: "expired",
          orderStatus: "expired",
          locale: "vi",
          createdAt: "2026-09-07T08:00:00.000Z",
          paidAt: null,
          reportId: null,
          readUrl: null,
          supportUrl: "/lien-he?orderId=order-expired",
        },
      ],
      items: [
        {
          id: "order-paid",
          orderId: "order-paid",
          invoiceNumber: "LSV-order-paid",
          chartId: "chart-1",
          profileId: "profile-1",
          profileDisplayName: "Nguyễn Văn A",
          sku: "ZIWEI-IDENTITY-P0",
          productTitle: "Bản mệnh & tiềm năng",
          productName: "Bản mệnh & tiềm năng",
          amount: 79000,
          currency: "VND",
          status: "paid",
          orderStatus: "paid",
          locale: "vi",
          createdAt: "2026-09-08T10:00:00.000Z",
          paidAt: "2026-09-08T10:05:00.000Z",
          reportId: "11111111-1111-4111-8111-111111111111",
          readUrl: "/bao-cao/11111111-1111-4111-8111-111111111111",
          supportUrl: "/lien-he?orderId=order-paid",
        },
        {
          id: "order-expired",
          orderId: "order-expired",
          invoiceNumber: "LSV-order-expired",
          chartId: "chart-1",
          profileId: null,
          profileDisplayName: null,
          sku: "ZIWEI-IDENTITY-P0",
          productTitle: "Bản mệnh & tiềm năng",
          productName: "Bản mệnh & tiềm năng",
          amount: 79000,
          currency: "VND",
          status: "expired",
          orderStatus: "expired",
          locale: "vi",
          createdAt: "2026-09-07T08:00:00.000Z",
          paidAt: null,
          reportId: null,
          readUrl: null,
          supportUrl: "/lien-he?orderId=order-expired",
        },
      ],
      totalCount: 2,
    };

    const parsed = OrderHistoryV1Schema.safeParse(validHistory);
    expect(parsed.success).toBe(true);

    // Rejects missing invoiceNumber
    expect(OrderHistoryV1Schema.safeParse({
      ...validHistory,
      orders: [{ ...validHistory.orders[0], invoiceNumber: "" }],
    }).success).toBe(false);

    // Rejects negative amount
    expect(OrderHistoryV1Schema.safeParse({
      ...validHistory,
      orders: [{ ...validHistory.orders[0], amount: -100 }],
    }).success).toBe(false);
  });
});
