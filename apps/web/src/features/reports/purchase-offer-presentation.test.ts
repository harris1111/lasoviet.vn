import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { AccountLibraryV1, PaidTopicSelectionViewV1 } from "@lasoviet/contracts";
import {
  buildSafeOfferPresentations,
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
      expect(offer.deliverables.vi[0]).toContain("12 cung vị");
      expect(offer.deliverables.vi[4]).toContain("2.200–3.200 chữ tiếng Việt");
      expect(offer.deliverables.en[4]).not.toContain("2.200");
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
        price: 19000,
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
      expect(offer.title.en).toBe("Core identity and potential");
      expect(offer.deliverables.vi).toHaveLength(5);
      expect(offer.deliverables.vi[0]).toContain("Tổng quan bản mệnh");

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
  });
});
