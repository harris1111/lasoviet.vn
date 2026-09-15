import { describe, expect, it } from "vitest";

import {
  AccountBehaviorProfileV1Schema,
  AccountExportAnalyticsEventV1Schema,
  AccountExportProjectionV1Schema,
  AccountPrivacyProjectionV1Schema,
} from "./account-center.js";

describe("account-center analytics & privacy contracts", () => {
  it("validates valid account behavior profile with bounds", () => {
    const valid = AccountBehaviorProfileV1Schema.parse({
      version: 1,
      accountId: "acc_123",
      lockedSectionsViewed: ["section_career", "section_wealth"],
      topupPacksViewed: ["pack_100k"],
      laBalance: 50,
      lastReturnAt: "2026-09-14T08:00:00.000Z",
      reportReadDepthPercent: 75,
      interestTopics: ["career", "finance"],
      updatedAt: "2026-09-14T08:00:00.000Z",
    });
    expect(valid.accountId).toBe("acc_123");
    expect(valid.laBalance).toBe(50);
  });

  it("fails closed on out-of-bounds behavior profile fields", () => {
    // reportReadDepthPercent > 100
    expect(() =>
      AccountBehaviorProfileV1Schema.parse({
        version: 1,
        accountId: "acc_123",
        lockedSectionsViewed: [],
        topupPacksViewed: [],
        laBalance: 0,
        lastReturnAt: null,
        reportReadDepthPercent: 105,
        interestTopics: [],
        updatedAt: "2026-09-14T08:00:00.000Z",
      }),
    ).toThrow();

    // excess array length
    const excessArray = new Array(51).fill("section_x");
    expect(() =>
      AccountBehaviorProfileV1Schema.parse({
        version: 1,
        accountId: "acc_123",
        lockedSectionsViewed: excessArray,
        topupPacksViewed: [],
        laBalance: null,
        lastReturnAt: null,
        reportReadDepthPercent: null,
        interestTopics: [],
        updatedAt: "2026-09-14T08:00:00.000Z",
      }),
    ).toThrow();
  });

  it("validates account export analytics event", () => {
    const valid = AccountExportAnalyticsEventV1Schema.parse({
      id: "evt_123",
      name: "checkout_created",
      properties: {
        sku: "ZIWEI-IDENTITY-P0",
        amount: 79000,
        currency: "VND",
      },
      occurredAt: "2026-09-14T08:00:00.000Z",
    });
    expect(valid.name).toBe("checkout_created");
  });

  it("validates export projection with analytics events and behavior profile", () => {
    const valid = AccountExportProjectionV1Schema.parse({
      exportedAt: "2026-09-14T08:00:00.000Z",
      account: {
        id: "acc_123",
        name: "Test User",
        email: "test@example.com",
        emailVerified: true,
        createdAt: "2026-09-14T00:00:00.000Z",
      },
      profiles: [],
      charts: [],
      orders: [],
      reports: [],
      consents: [],
      analyticsEvents: [
        {
          id: "evt_1",
          name: "landing",
          properties: { landing_page: "/" },
          occurredAt: "2026-09-14T01:00:00.000Z",
        },
      ],
      behaviorProfile: {
        version: 1,
        accountId: "acc_123",
        lockedSectionsViewed: [],
        topupPacksViewed: [],
        laBalance: null,
        lastReturnAt: null,
        reportReadDepthPercent: null,
        interestTopics: [],
        updatedAt: "2026-09-14T08:00:00.000Z",
      },
      deletionRequest: null,
    });
    expect(valid.analyticsEvents).toHaveLength(1);
    expect(valid.behaviorProfile?.accountId).toBe("acc_123");
  });
});
