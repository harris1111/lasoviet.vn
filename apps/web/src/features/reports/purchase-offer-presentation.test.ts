import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { AccountLibraryV1, PaidTopicSelectionViewV1 } from "@lasoviet/contracts";
import {
  buildSafeOfferPresentations,
  deriveEligibleUpgradeCredit,
  deriveOfferOwnership,
} from "./purchase-offer-presentation";

const mockOffers: PaidTopicSelectionViewV1["offers"] = [
  {
    sku: "ZIWEI-IDENTITY-P0",
    method: "ziwei",
    price: 79000,
    currency: "VND",
    sections: ["core-identity", "transformations"],
  },
];

const emptyLibrary: AccountLibraryV1 = {
  version: 1,
  groups: [],
  items: [],
  latestReadableReport: null,
  totalCount: 0,
};

describe("purchase-offer-presentation", () => {
  describe("buildSafeOfferPresentations", () => {
    it("converts active comprehensive offer into customer-safe presentation with stable anchor", () => {
      const presentations = buildSafeOfferPresentations({ offers: mockOffers });

      expect(presentations).toHaveLength(1);
      const offer = presentations[0]!;
      expect(offer.offerKey).toBe("ziwei-comprehensive");
      expect(offer.anchorId).toBe("ziwei-comprehensive");
      expect(offer.price).toBe(79000);
      expect(offer.currency).toBe("VND");
      expect(offer.title.vi).toBe("Luận giải Tử Vi toàn diện");
      expect(offer.title.en).toBe("Comprehensive Zi Wei reading");
      expect(offer.deliverables.vi).toHaveLength(5);
      expect(offer.deliverables.vi[1]).toContain("12 cung");
      expect(offer.deliverables.vi[4]).toContain("2.200–3.200 từ");
      expect(offer.deliverables.en[4]).not.toContain("2.200 từ");
      expect(offer.ownership).toEqual({ kind: "unowned" });

      // Invariant: no technical SKU leakage
      const serialized = JSON.stringify(offer);
      expect(serialized).not.toMatch(/ZIWEI-[A-Z0-9]+/);
    });

    it("deduplicates repeated offers by public offer key", () => {
      const repeatedOffers = [...mockOffers, ...mockOffers];
      const presentations = buildSafeOfferPresentations({ offers: repeatedOffers });

      expect(presentations).toHaveLength(1);
    });

    it("caps results at at most two offers", () => {
      const threeOffers: PaidTopicSelectionViewV1["offers"] = [
        mockOffers[0]!,
        mockOffers[0]!,
        mockOffers[0]!,
      ];
      const presentations = buildSafeOfferPresentations({ offers: threeOffers });

      expect(presentations.length).toBeLessThanOrEqual(2);
    });

    it("converts 19k natal excerpt into customer-safe presentation with no technical SKU strings (Correction check 2)", () => {
      const excerptOffer: PaidTopicSelectionViewV1["offers"][number] = {
        sku: "ZIWEI-NATAL-EXCERPT-P0",
        method: "ziwei",
        price: 19000 as const,
        currency: "VND",
        sections: ["overview", "coreAxis", "strengthsAndTensions", "practicalDirection"],
      };

      const presentations = buildSafeOfferPresentations({ offers: [excerptOffer], locale: "vi" });
      expect(presentations).toHaveLength(1);

      const offer = presentations[0]!;
      expect(offer.offerKey).toBe("ziwei-natal-excerpt");
      expect(offer.anchorId).toBe("ziwei-natal-excerpt");
      expect(offer.price).toBe(19000);
      expect(offer.currency).toBe("VND");
      expect(offer.title.vi).toBe("Bản mệnh và tiềm năng");
      expect(offer.title.en).toBe("Core Identity and Potential");
      expect(offer.deliverables.vi).toHaveLength(3);
      expect(offer.deliverables.vi[0]).toBe("Toàn cảnh bản mệnh.");
      expect(offer.deliverables.vi[1]).toBe("Trục Mệnh – Thân và những điểm nhấn chính.");
      expect(offer.deliverables.vi[2]).toBe("Điểm mạnh, điểm căng và hướng phát triển thực tế.");
      expect(offer.fit?.vi).toBe("Bạn muốn một điểm bắt đầu rõ ràng, đủ sâu để soi chiếu nhưng chưa cần đọc toàn bộ lá số.");
      expect(offer.ctaLabel.vi).toBe("Chọn Bản mệnh và tiềm năng — 19.000 ₫");

      // Invariant: no technical SKU leakage
      const serialized = JSON.stringify(offer);
      expect(serialized).not.toMatch(/ZIWEI-[A-Z0-9]+/);
    });

    it("renders both active offers in Vietnamese and only comprehensive in English (Correction check 3)", () => {
      const twoOffers: PaidTopicSelectionViewV1["offers"] = [
        {
          sku: "ZIWEI-NATAL-EXCERPT-P0",
          method: "ziwei",
          price: 19000,
          currency: "VND",
          sections: ["overview", "coreAxis", "strengthsAndTensions", "practicalDirection"],
        },
        mockOffers[0]!,
      ];

      // Vietnamese: both offers rendered
      const viPresentations = buildSafeOfferPresentations({ offers: twoOffers, locale: "vi" });
      expect(viPresentations).toHaveLength(2);
      expect(viPresentations[0]!.offerKey).toBe("ziwei-natal-excerpt");
      expect(viPresentations[1]!.offerKey).toBe("ziwei-comprehensive");

      // English: only 79k comprehensive rendered (19k excluded)
      const enPresentations = buildSafeOfferPresentations({ offers: twoOffers, locale: "en" });
      expect(enPresentations).toHaveLength(1);
      expect(enPresentations[0]!.offerKey).toBe("ziwei-comprehensive");
    });


    it("provides approved CTA labels, Tier 2 badge, and upgrade pricing CTA", () => {
      const excerptOffer = {
        sku: "ZIWEI-NATAL-EXCERPT-P0" as const,
        method: "ziwei" as const,
        price: 19000 as const,
        currency: "VND" as const,
        sections: ["overview"],
      };
      const comprehensiveOffer = {
        sku: "ZIWEI-IDENTITY-P0" as const,
        method: "ziwei" as const,
        price: 79000 as const,
        currency: "VND" as const,
        sections: ["overview" as const],
      };

      const presentations = buildSafeOfferPresentations({
        offers: [excerptOffer, comprehensiveOffer],
        locale: "vi",
      });

      expect(presentations[0]!.ctaLabel.vi).toBe("Chọn Bản mệnh và tiềm năng — 19.000 ₫");
      expect(presentations[1]!.ctaLabel.vi).toBe("Chọn Luận giải Tử Vi toàn diện — 79.000 ₫");
      expect(presentations[1]!.badge?.vi).toBe("Đầy đủ nhất");
      expect(presentations[1]!.fit?.vi).toBe("Bạn muốn có một bản tham chiếu đầy đủ để đọc lại theo từng câu hỏi và từng giai đoạn suy ngẫm.");
      expect(presentations[1]!.summary.vi).toBe("Đọc trọn cấu trúc lá số — từ nền tảng bản mệnh đến 12 cung và những mối liên hệ nổi bật.");
    });
    it("excludes reserved or unknown SKUs from safe presentation", () => {
      const mixedOffers: any = [
        {
          sku: "ZIWEI-RELATIONSHIP-P0",
          method: "ziwei",
          price: 79000,
          currency: "VND",
          sections: ["relationship"],
        },
        {
          sku: "UNKNOWN-SKU",
          method: "ziwei",
          price: 79000,
          currency: "VND",
          sections: ["unknown"],
        },
        mockOffers[0]!,
      ];
      const presentations = buildSafeOfferPresentations({ offers: mixedOffers });

      expect(presentations).toHaveLength(1);
      expect(presentations[0]!.offerKey).toBe("ziwei-comprehensive");
    });
  });

  describe("deriveOfferOwnership", () => {
    it("returns unowned when account library has no items", () => {
      const ownership = deriveOfferOwnership({
        chartId: "chart-1",
        offerKey: "ziwei-comprehensive",
        library: emptyLibrary,
        locale: "vi",
      });

      expect(ownership).toEqual({ kind: "unowned" });
    });

    it("returns unowned when items do not match chartId", () => {
      const library: AccountLibraryV1 = {
        ...emptyLibrary,
        items: [
          {
            id: "ent-1",
            entitlementId: "ent-1",
            orderId: "ord-1",
            chartId: "different-chart",
            profileId: "prof-1",
            profileDisplayName: "User",
            sku: "ZIWEI-IDENTITY-P0",
            productTitle: "Luận giải Tử Vi toàn diện",
            productName: "Luận giải Tử Vi toàn diện",
            orderStatus: "paid",
            entitlementStatus: "active",
            reportId: "rep-1",
            readUrl: "/bao-cao/rep-1",
            reportStatus: "ready",
            locale: "vi",
            createdAt: "2026-09-09T00:00:00.000Z",
            purchasedAt: "2026-09-09T00:00:00.000Z",
          },
        ],
      };

      const ownership = deriveOfferOwnership({
        chartId: "chart-1",
        offerKey: "ziwei-comprehensive",
        library,
        locale: "vi",
      });

      expect(ownership).toEqual({ kind: "unowned" });
    });

    it("returns unowned when matching item has revoked entitlement", () => {
      const library: AccountLibraryV1 = {
        ...emptyLibrary,
        items: [
          {
            id: "ent-1",
            entitlementId: "ent-1",
            orderId: "ord-1",
            chartId: "chart-1",
            profileId: "prof-1",
            profileDisplayName: "User",
            sku: "ZIWEI-IDENTITY-P0",
            productTitle: "Luận giải Tử Vi toàn diện",
            productName: "Luận giải Tử Vi toàn diện",
            orderStatus: "paid",
            entitlementStatus: "revoked",
            reportId: "rep-1",
            readUrl: "/bao-cao/rep-1",
            reportStatus: "ready",
            locale: "vi",
            createdAt: "2026-09-09T00:00:00.000Z",
            purchasedAt: "2026-09-09T00:00:00.000Z",
          },
        ],
      };

      const ownership = deriveOfferOwnership({
        chartId: "chart-1",
        offerKey: "ziwei-comprehensive",
        library,
        locale: "vi",
      });

      expect(ownership).toEqual({ kind: "unowned" });
    });

    it("returns readable when matching item has authoritative readUrl", () => {
      const library: AccountLibraryV1 = {
        ...emptyLibrary,
        items: [
          {
            id: "ent-1",
            entitlementId: "ent-1",
            orderId: "ord-1",
            chartId: "chart-1",
            profileId: "prof-1",
            profileDisplayName: "User",
            sku: "ZIWEI-IDENTITY-P0",
            productTitle: "Luận giải Tử Vi toàn diện",
            productName: "Luận giải Tử Vi toàn diện",
            orderStatus: "paid",
            entitlementStatus: "active",
            reportId: "rep-1",
            readUrl: "/bao-cao/rep-1",
            reportStatus: "ready",
            locale: "vi",
            createdAt: "2026-09-09T00:00:00.000Z",
            purchasedAt: "2026-09-09T00:00:00.000Z",
          },
        ],
      };

      const ownership = deriveOfferOwnership({
        chartId: "chart-1",
        offerKey: "ziwei-comprehensive",
        library,
        locale: "vi",
      });

      expect(ownership).toEqual({
        kind: "readable",
        reportId: "rep-1",
        readUrl: "/bao-cao/rep-1",
      });
    });

    it("returns processing_or_terminal when item has reportId but no readUrl", () => {
      const library: AccountLibraryV1 = {
        ...emptyLibrary,
        items: [
          {
            id: "ent-1",
            entitlementId: "ent-1",
            orderId: "ord-1",
            chartId: "chart-1",
            profileId: "prof-1",
            profileDisplayName: "User",
            sku: "ZIWEI-IDENTITY-P0",
            productTitle: "Luận giải Tử Vi toàn diện",
            productName: "Luận giải Tử Vi toàn diện",
            orderStatus: "paid",
            entitlementStatus: "active",
            reportId: "rep-generating",
            readUrl: null,
            reportStatus: "generating",
            locale: "vi",
            createdAt: "2026-09-09T00:00:00.000Z",
            purchasedAt: "2026-09-09T00:00:00.000Z",
          },
        ],
      };

      const ownershipVi = deriveOfferOwnership({
        chartId: "chart-1",
        offerKey: "ziwei-comprehensive",
        library,
        locale: "vi",
      });

      expect(ownershipVi).toEqual({
        kind: "processing_or_terminal",
        reportId: "rep-generating",
        progressUrl: "/bao-cao/rep-generating",
      });

      const ownershipEn = deriveOfferOwnership({
        chartId: "chart-1",
        offerKey: "ziwei-comprehensive",
        library,
        locale: "en",
      });

      expect(ownershipEn).toEqual({
        kind: "processing_or_terminal",
        reportId: "rep-generating",
        progressUrl: "/en/bao-cao/rep-generating",
      });
    });

    it("returns owned_unknown when item has neither readUrl nor reportId", () => {
      const library: AccountLibraryV1 = {
        ...emptyLibrary,
        items: [
          {
            id: "ent-1",
            entitlementId: "ent-1",
            orderId: "ord-1",
            chartId: "chart-1",
            profileId: "prof-1",
            profileDisplayName: "User",
            sku: "ZIWEI-IDENTITY-P0",
            productTitle: "Luận giải Tử Vi toàn diện",
            productName: "Luận giải Tử Vi toàn diện",
            orderStatus: "paid",
            entitlementStatus: "active",
            reportId: null,
            readUrl: null,
            reportStatus: null,
            locale: "vi",
            createdAt: "2026-09-09T00:00:00.000Z",
            purchasedAt: "2026-09-09T00:00:00.000Z",
          },
        ],
      };

      const ownership = deriveOfferOwnership({
        chartId: "chart-1",
        offerKey: "ziwei-comprehensive",
        library,
        locale: "vi",
      });

      expect(ownership).toEqual({
        kind: "owned_unknown",
        libraryUrl: "/tai-khoan/bao-cao",
      });
    });
    it("resolves existing Tier-1 report readUrl for Tier-2 entitlement without its own reservation (Requirement 3)", () => {
      const library: AccountLibraryV1 = {
        ...emptyLibrary,
        items: [
          {
            id: "ent-tier1",
            entitlementId: "ent-tier1",
            orderId: "ord-t1",
            chartId: "chart-upgrade-reuse",
            profileId: "prof-1",
            profileDisplayName: "User",
            sku: "ZIWEI-NATAL-EXCERPT-P0",
            productTitle: "Bản mệnh và tiềm năng",
            productName: "Bản mệnh và tiềm năng",
            orderStatus: "paid",
            entitlementStatus: "active",
            reportId: "rep-shared-1",
            readUrl: "/bao-cao/rep-shared-1",
            reportStatus: "ready",
            locale: "vi",
            createdAt: "2026-09-10T00:00:00.000Z",
            purchasedAt: "2026-09-10T00:00:00.000Z",
          },
          {
            id: "ent-tier2",
            entitlementId: "ent-tier2",
            orderId: "ord-t2",
            chartId: "chart-upgrade-reuse",
            profileId: "prof-1",
            profileDisplayName: "User",
            sku: "ZIWEI-IDENTITY-P0",
            productTitle: "Luận giải Tử Vi toàn diện",
            productName: "Luận giải Tử Vi toàn diện",
            orderStatus: "paid",
            entitlementStatus: "active",
            reportId: null,
            readUrl: null,
            reportStatus: null,
            locale: "vi",
            createdAt: "2026-09-11T00:00:00.000Z",
            purchasedAt: "2026-09-11T00:00:00.000Z",
          },
        ],
      };

      const ownership = deriveOfferOwnership({
        chartId: "chart-upgrade-reuse",
        offerKey: "ziwei-comprehensive",
        library,
        locale: "vi",
      });

      expect(ownership).toEqual({
        kind: "readable",
        reportId: "rep-shared-1",
        readUrl: "/bao-cao/rep-shared-1",
      });
    });

    it("returns unavailable for English selector when chart has an active Vietnamese Tier-1 entitlement (Cross-locale Test 4)", () => {
      const library: AccountLibraryV1 = {
        ...emptyLibrary,
        items: [
          {
            id: "ent-vi-tier1",
            entitlementId: "ent-vi-tier1",
            orderId: "ord-vi-1",
            chartId: "chart-cross-1",
            profileId: "prof-1",
            profileDisplayName: "User",
            sku: "ZIWEI-NATAL-EXCERPT-P0",
            productTitle: "Bản mệnh và tiềm năng",
            productName: "Bản mệnh và tiềm năng",
            orderStatus: "paid",
            entitlementStatus: "active",
            reportId: "rep-vi-1",
            readUrl: "/bao-cao/rep-vi-1",
            reportStatus: "ready",
            locale: "vi",
            createdAt: "2026-09-09T00:00:00.000Z",
            purchasedAt: "2026-09-09T00:00:00.000Z",
          },
        ],
      };

      const ownershipEn = deriveOfferOwnership({
        chartId: "chart-cross-1",
        offerKey: "ziwei-comprehensive",
        library,
        locale: "en",
      });
      expect(ownershipEn).toEqual({ kind: "unavailable" });

      const ownershipVi = deriveOfferOwnership({
        chartId: "chart-cross-1",
        offerKey: "ziwei-comprehensive",
        library,
        locale: "vi",
      });
      expect(ownershipVi).toEqual({ kind: "unowned" });
    });
  });

  describe("deriveEligibleUpgradeCredit", () => {
    const paidAt = "2026-09-10T10:00:00.000Z";
    const expiresAt = "2026-09-17T10:00:00.000Z";
    const tier1Order = {
      id: "ord-tier1-123",
      orderId: "ord-tier1-123",
      invoiceNumber: "LSV-tier1-123",
      chartId: "chart-upgrade-test",
      profileId: "profile-1",
      profileDisplayName: "Test",
      sku: "ZIWEI-NATAL-EXCERPT-P0" as const,
      productTitle: "Bản mệnh và tiềm năng",
      productName: "Bản mệnh và tiềm năng",
      amount: 19000,
      currency: "VND",
      status: "paid" as const,
      orderStatus: "paid" as const,
      locale: "vi" as const,
      createdAt: "2026-09-10T09:59:00.000Z",
      paidAt,
      creditExpiresAt: expiresAt,
      reportId: "rep-1",
      readUrl: "/bao-cao/rep-1",
    };

    it("returns 19,000 VND credit and 60,000 VND net price before expiration (WP-09 Test 10)", () => {
      const now = new Date("2026-09-15T00:00:00.000Z");
      const credit = deriveEligibleUpgradeCredit({
        chartId: "chart-upgrade-test",
        orders: [tier1Order],
        now,
      });

      expect(credit).toEqual({
        creditApplied: 19000,
        listPrice: 79000,
        netPrice: 60000,
        creditExpiresAt: expiresAt,
      });
    });

    it("returns null at or after exact expiration timestamp (WP-09 Test 10)", () => {
      // Exactly at deadline
      const creditAtDeadline = deriveEligibleUpgradeCredit({
        chartId: "chart-upgrade-test",
        orders: [tier1Order],
        now: new Date(expiresAt),
      });
      expect(creditAtDeadline).toBeNull();

      // After deadline
      const creditAfterDeadline = deriveEligibleUpgradeCredit({
        chartId: "chart-upgrade-test",
        orders: [tier1Order],
        now: new Date("2026-09-18T00:00:00.000Z"),
      });
      expect(creditAfterDeadline).toBeNull();
    });

    it("returns null when creditExpiresAt is missing or null, refusing to infer from paidAt (Requirement 4)", () => {
      const orderWithoutDeadline = {
        ...tier1Order,
        creditExpiresAt: null,
      };
      const credit = deriveEligibleUpgradeCredit({
        chartId: "chart-upgrade-test",
        orders: [orderWithoutDeadline],
        now: new Date("2026-09-12T00:00:00.000Z"),
      });
      expect(credit).toBeNull();
    });

    it("returns null when Tier 1 order is refunded (WP-09 Test 10)", () => {
      const refundedOrder = {
        ...tier1Order,
        status: "refunded" as const,
        orderStatus: "refunded" as const,
      };
      const credit = deriveEligibleUpgradeCredit({
        chartId: "chart-upgrade-test",
        orders: [refundedOrder],
        now: new Date("2026-09-15T00:00:00.000Z"),
      });
      expect(credit).toBeNull();
    });
  });

  describe("WP-09 Presentation and UI Invariants", () => {
    const twoOffers: PaidTopicSelectionViewV1["offers"] = [
      {
        sku: "ZIWEI-NATAL-EXCERPT-P0",
        method: "ziwei",
        price: 19000,
        currency: "VND",
        sections: ["overview", "coreAxis", "strengthsAndTensions", "practicalDirection"],
      },
      mockOffers[0]!,
    ];

    it("Tier-1 card contains the mandatory seven-day pre-payment disclosure (WP-09 Test 11)", () => {
      const presentations = buildSafeOfferPresentations({
        offers: twoOffers,
        locale: "vi",
      });
      const tier1 = presentations.find((p) => p.offerKey === "ziwei-natal-excerpt");
      expect(tier1?.upgradeDisclosure?.vi).toBe("Nếu sau đó bạn muốn đọc bản toàn diện, 19.000 ₫ này sẽ được trừ thẳng vào phí nâng cấp trong vòng 7 ngày kể từ thời điểm thanh toán.");
    });

    it("hides Tier 1 completely when Tier 2 is owned (WP-09 Test 12)", () => {
      const presentations = buildSafeOfferPresentations({
        offers: twoOffers,
        locale: "vi",
        ownershipByOfferKey: {
          "ziwei-comprehensive": {
            kind: "readable",
            reportId: "rep-1",
            readUrl: "/bao-cao/rep-1",
          },
        },
      });

      expect(presentations).toHaveLength(1);
      expect(presentations[0]!.offerKey).toBe("ziwei-comprehensive");
      expect(presentations.some((p) => p.offerKey === "ziwei-natal-excerpt")).toBe(false);
    });

    it("ensures no rendered/serialized output leaks ZIWEI-* or source order IDs (WP-09 Test 13)", () => {
      const presentations = buildSafeOfferPresentations({
        offers: twoOffers,
        locale: "vi",
        chartId: "chart-upgrade-test",
        orders: [
          {
            id: "ord-secret-source-id-12345",
            orderId: "ord-secret-source-id-12345",
            invoiceNumber: "LSV-secret-1",
            chartId: "chart-upgrade-test",
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
            creditExpiresAt: "2026-09-17T10:00:00Z",
            reportId: "rep-1",
            readUrl: "/bao-cao/rep-1",
          },
        ],
        now: new Date("2026-09-12T00:00:00Z"),
      });

      const serialized = JSON.stringify(presentations);
      expect(serialized).not.toMatch(/ZIWEI-[A-Z0-9]+/);
      expect(serialized).not.toContain("ord-secret-source-id-12345");
      expect(serialized).not.toContain("creditedFromOrderId");
    });
  });
});