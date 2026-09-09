import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  AccountLibraryV1Schema,
  CommerceSkuSchema,
  OrderHistoryV1Schema,
  PaymentSelfClaimRequestV1Schema,
  PaymentSelfClaimSuccessV1Schema,
  resolveProductTitle,
  COMPREHENSIVE_REPORT_SECTION_IDS,
  TIER_1_SCOPE_SECTIONS,
  TIER_2_SCOPE_SECTIONS,
  COMPREHENSIVE_REPORT_TIER_1_LOCKED_SECTIONS,
  EntitlementScopeSchema,
  TIER_1_ENTITLEMENT_SCOPE,
  TIER_2_ENTITLEMENT_SCOPE,
  resolveEntitlementScopeForSku,
} from "./commerce.js";

describe("commerce contracts", () => {
  it("resolves product titles according to locale", () => {
    expect(resolveProductTitle("ZIWEI-IDENTITY-P0", "vi")).toBe("Luận giải Tử Vi toàn diện");
    expect(resolveProductTitle("ZIWEI-IDENTITY-P0", "en")).toBe("Comprehensive Zi Wei reading");
    expect(resolveProductTitle("ZIWEI-NATAL-EXCERPT-P0", "vi")).toBe("Bản mệnh và tiềm năng");
    expect(resolveProductTitle("ZIWEI-NATAL-EXCERPT-P0", "en")).toBe("Core identity and potential");
  });

  it("validates CommerceSkuSchema permits active first-paid-flow SKUs and rejects reserved SKUs", () => {
    expect(CommerceSkuSchema.safeParse("ZIWEI-IDENTITY-P0").success).toBe(true);
    expect(CommerceSkuSchema.safeParse("ZIWEI-NATAL-EXCERPT-P0").success).toBe(true);

    // Reserved products must fail contract validation
    expect(CommerceSkuSchema.safeParse("ZIWEI-RELATIONSHIP-P0").success).toBe(false);
    expect(CommerceSkuSchema.safeParse("ZIWEI-CAREER-P0").success).toBe(false);
    expect(CommerceSkuSchema.safeParse("ZIWEI-YEAR-P0").success).toBe(false);
    expect(CommerceSkuSchema.safeParse("BAZI-COMPREHENSIVE-P0").success).toBe(false);
    expect(CommerceSkuSchema.safeParse("WESTERN-NATAL-P0").success).toBe(false);

    // Arbitrary SKU strings must fail
    expect(CommerceSkuSchema.safeParse("NOT-A-SKU").success).toBe(false);
    expect(CommerceSkuSchema.safeParse("").success).toBe(false);
  });

  it("proves shared scope vocabulary matches Tier-1 and Tier-2 specifications (Acceptance test 2)", () => {
    expect(TIER_1_SCOPE_SECTIONS).toEqual([
      "overview",
      "coreAxis",
      "strengthsAndTensions",
      "practicalDirection",
    ]);
    expect(TIER_2_SCOPE_SECTIONS).toEqual([
      "overview",
      "coreAxis",
      "strengthsAndTensions",
      "practicalDirection",
      "keyConfigurations",
      "palaceReadings",
      "thematicSynthesis",
    ]);
    expect(COMPREHENSIVE_REPORT_TIER_1_LOCKED_SECTIONS).toEqual([
      "keyConfigurations",
      "palaceReadings",
      "thematicSynthesis",
    ]);

    expect(resolveEntitlementScopeForSku("ZIWEI-NATAL-EXCERPT-P0")).toEqual(TIER_1_ENTITLEMENT_SCOPE);
    expect(resolveEntitlementScopeForSku("ZIWEI-IDENTITY-P0")).toEqual(TIER_2_ENTITLEMENT_SCOPE);

    // Scope schema validation
    expect(EntitlementScopeSchema.safeParse({ sections: [...TIER_1_SCOPE_SECTIONS] }).success).toBe(true);
    expect(EntitlementScopeSchema.safeParse({ sections: [...TIER_2_SCOPE_SECTIONS] }).success).toBe(true);
    expect(EntitlementScopeSchema.safeParse({ sections: [] }).success).toBe(false);
    expect(EntitlementScopeSchema.safeParse({ sections: ["invalid_section"] }).success).toBe(false);
    expect(EntitlementScopeSchema.safeParse({ sections: [...TIER_1_SCOPE_SECTIONS], extra: true }).success).toBe(false);
  });

  it("proves CommerceSkuSchema matches exactly the first-paid-flow SKUs in product-catalog.json without drift", () => {
    // Note: @lasoviet/contracts cannot import @lasoviet/config because config depends on contracts.
    // There is no duplicate runtime catalog; this focused test guarantees that the contract-level
    // CommerceSkuSchema enum remains strictly synchronized with the canonical JSON catalog.
    const directPath = resolve(process.cwd(), "config", "product-catalog.json");
    const catalogPath = existsSync(directPath)
      ? directPath
      : resolve(process.cwd(), "..", "..", "config", "product-catalog.json");
    const rawCatalog = JSON.parse(readFileSync(catalogPath, "utf8"));
    const firstPaidSkus = rawCatalog.products
      .filter((p: { availability: string }) => p.availability === "first_paid_flow")
      .map((p: { sku: string }) => p.sku);

    expect([...CommerceSkuSchema.options].sort()).toEqual(firstPaidSkus.sort());
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
          supportUrl: "/lien-he?order=LSV-order-paid",
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
          supportUrl: "/lien-he?order=LSV-order-expired",
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
          supportUrl: "/lien-he?order=LSV-order-paid",
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
          supportUrl: "/lien-he?order=LSV-order-expired",
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

  describe("PaymentSelfClaimRequestV1Schema", () => {
    it("accepts exact minute input and positive safe integer amount", () => {
      const valid = {
        amount: 79_000,
        transferredAtLocal: "2026-09-05T14:30",
      };
      const result = PaymentSelfClaimRequestV1Schema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejects inputs with seconds", () => {
      const withSeconds = {
        amount: 79_000,
        transferredAtLocal: "2026-09-05T14:30:00",
      };
      expect(PaymentSelfClaimRequestV1Schema.safeParse(withSeconds).success).toBe(false);
    });

    it("rejects inputs with UTC or timezone offsets", () => {
      expect(PaymentSelfClaimRequestV1Schema.safeParse({
        amount: 79_000,
        transferredAtLocal: "2026-09-05T14:30Z",
      }).success).toBe(false);

      expect(PaymentSelfClaimRequestV1Schema.safeParse({
        amount: 79_000,
        transferredAtLocal: "2026-09-05T14:30+07:00",
      }).success).toBe(false);
    });

    it("rejects decimal, zero, or negative amounts", () => {
      expect(PaymentSelfClaimRequestV1Schema.safeParse({
        amount: 79000.5,
        transferredAtLocal: "2026-09-05T14:30",
      }).success).toBe(false);

      expect(PaymentSelfClaimRequestV1Schema.safeParse({
        amount: 0,
        transferredAtLocal: "2026-09-05T14:30",
      }).success).toBe(false);

      expect(PaymentSelfClaimRequestV1Schema.safeParse({
        amount: -79000,
        transferredAtLocal: "2026-09-05T14:30",
      }).success).toBe(false);
    });

    it("rejects impossible dates such as February 30 or April 31", () => {
      expect(PaymentSelfClaimRequestV1Schema.safeParse({
        amount: 79_000,
        transferredAtLocal: "2026-02-30T10:00",
      }).success).toBe(false);

      expect(PaymentSelfClaimRequestV1Schema.safeParse({
        amount: 79_000,
        transferredAtLocal: "2026-04-31T10:00",
      }).success).toBe(false);

      // Non-leap year Feb 29
      expect(PaymentSelfClaimRequestV1Schema.safeParse({
        amount: 79_000,
        transferredAtLocal: "2025-02-29T10:00",
      }).success).toBe(false);

      // Valid leap year Feb 29
      expect(PaymentSelfClaimRequestV1Schema.safeParse({
        amount: 79_000,
        transferredAtLocal: "2024-02-29T10:00",
      }).success).toBe(true);
    });

    it("rejects unknown extra fields due to strict schema", () => {
      expect(PaymentSelfClaimRequestV1Schema.safeParse({
        amount: 79_000,
        transferredAtLocal: "2026-09-05T14:30",
        extraField: "not allowed",
      }).success).toBe(false);
    });
  });

  describe("PaymentSelfClaimSuccessV1Schema", () => {
    it("validates successful claim payload", () => {
      const valid = {
        status: "claimed",
        orderId: "order-123",
        reportId: "report-456",
      };
      expect(PaymentSelfClaimSuccessV1Schema.safeParse(valid).success).toBe(true);
    });

    it("rejects empty orderId, empty reportId, or invalid status", () => {
      expect(PaymentSelfClaimSuccessV1Schema.safeParse({
        status: "claimed",
        orderId: "",
        reportId: "report-456",
      }).success).toBe(false);

      expect(PaymentSelfClaimSuccessV1Schema.safeParse({
        status: "claimed",
        orderId: "order-123",
        reportId: "  ",
      }).success).toBe(false);

      expect(PaymentSelfClaimSuccessV1Schema.safeParse({
        status: "pending",
        orderId: "order-123",
        reportId: "report-456",
      }).success).toBe(false);
    });
  });
