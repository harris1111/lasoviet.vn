import { describe, expect, it } from "vitest";

import {
  WalletBalanceV1Schema,
  WalletCreditLotV1Schema,
  WalletGrantV1Schema,
  WalletHistoryItemV1Schema,
  WalletContentPriceV1Schema,
  WalletPurchaseIntentV1Schema,
  WalletSpendAllocationV1Schema,
  WalletTopUpCatalogV1,
} from "./wallet-commerce-v1.js";

describe("wallet commerce V1 contracts", () => {
  it("keeps the approved closed top-up catalog without a conversion-rate field", () => {
    expect(WalletTopUpCatalogV1).toEqual([
      { id: "LA-ENTRY-300", vndAmount: 29000, purchasedLa: 300, promotionalLa: 0 },
      { id: "LA-START-1100", vndAmount: 99000, purchasedLa: 1000, promotionalLa: 100 },
      { id: "LA-DISCOVER-3000", vndAmount: 249000, purchasedLa: 2500, promotionalLa: 500 },
      { id: "LA-LIBRARY-8000", vndAmount: 599000, purchasedLa: 6000, promotionalLa: 2000 },
    ]);
    expect(WalletTopUpCatalogV1.every((pack) => !("conversionRate" in pack))).toBe(true);
  });

  it("requires nonnegative reconciled buckets and an exact total", () => {
    const balance = {
      version: 1, stateVersion: 1, totalLa: 300, purchasedLa: 240, promotionalLa: 60,
      updatedAt: "2026-09-17T00:00:00.000Z",
    };
    expect(WalletBalanceV1Schema.safeParse(balance).success).toBe(true);
    expect(WalletBalanceV1Schema.safeParse({ ...balance, totalLa: 299 }).success).toBe(false);
    expect(WalletBalanceV1Schema.safeParse({ ...balance, extra: "sensitive" }).success).toBe(false);
  });

  it("requires a positive integer stateVersion and validates zero balance with stateVersion 1", () => {
    const zeroBalance = {
      version: 1,
      stateVersion: 1,
      totalLa: 0,
      purchasedLa: 0,
      promotionalLa: 0,
      updatedAt: "2026-09-17T00:00:00.000Z",
    };
    expect(WalletBalanceV1Schema.safeParse(zeroBalance).success).toBe(true);

    // Existing wallet with incremented stateVersion is valid
    expect(WalletBalanceV1Schema.safeParse({ ...zeroBalance, stateVersion: 5 }).success).toBe(true);

    // stateVersion must be a positive integer (> 0)
    expect(WalletBalanceV1Schema.safeParse({ ...zeroBalance, stateVersion: 0 }).success).toBe(false);
    expect(WalletBalanceV1Schema.safeParse({ ...zeroBalance, stateVersion: -1 }).success).toBe(false);
    expect(WalletBalanceV1Schema.safeParse({ ...zeroBalance, stateVersion: 1.5 }).success).toBe(false);

    // Missing stateVersion is rejected
    const { stateVersion: _, ...withoutStateVersion } = zeroBalance;
    expect(WalletBalanceV1Schema.safeParse(withoutStateVersion).success).toBe(false);
  });

  it("requires non-expiring lots and bucket-specific revenue allocations", () => {
    expect(WalletCreditLotV1Schema.safeParse({
      id: "lot", bucket: "promotional", grantedLa: 20, remainingLa: 20,
      grantedAt: "2026-09-17T00:00:00.000Z", expiresAt: null,
    }).success).toBe(true);
    expect(WalletCreditLotV1Schema.safeParse({
      id: "lot", bucket: "promotional", grantedLa: 20, remainingLa: 20,
      grantedAt: "2026-09-17T00:00:00.000Z", expiresAt: "2027-01-01T00:00:00.000Z",
    }).success).toBe(false);
    expect(WalletSpendAllocationV1Schema.safeParse({
      creditLotId: "lot", bucket: "promotional", amountLa: 20, purchasedLa: 0, recognizedVnd: 0,
    }).success).toBe(true);
    expect(WalletSpendAllocationV1Schema.safeParse({
      creditLotId: "lot", bucket: "promotional", amountLa: 20, purchasedLa: 20, recognizedVnd: 1,
    }).success).toBe(false);
  });

  it("permits controlled promotional grants but rejects unlinked purchased Lá", () => {
    const grant = {
      actorId: "actor",
      reasonCode: "promotional_grant",
      requestId: "request",
      traceId: "trace",
      idempotencyKey: "promotional-grant",
      kind: "grant" as const,
      purchasedLa: 0,
      promotionalLa: 100000,
      topUpPackId: null,
    };

    expect(WalletGrantV1Schema.safeParse(grant).success).toBe(true);
    expect(WalletGrantV1Schema.safeParse({ ...grant, purchasedLa: 1 }).success).toBe(false);
  });

  it("requires immutable locales and permits English only for identity", () => {
    const base = {
      id: "intent",
      chartVersionId: "chart-version",
      status: "pending" as const,
      stateVersion: 1,
      createdAt: "2026-09-17T00:00:00.000Z",
    };
    expect(WalletPurchaseIntentV1Schema.safeParse({
      ...base, sku: "ZIWEI-NATAL-EXCERPT-P0", locale: "vi", amountLa: 240,
    }).success).toBe(true);
    expect(WalletPurchaseIntentV1Schema.safeParse({
      ...base, sku: "ZIWEI-NATAL-EXCERPT-P0", locale: "en", amountLa: 240,
    }).success).toBe(false);
    expect(WalletPurchaseIntentV1Schema.safeParse({
      ...base, sku: "ZIWEI-IDENTITY-P0", locale: "vi", amountLa: 960,
    }).success).toBe(true);
    expect(WalletPurchaseIntentV1Schema.safeParse({
      ...base, sku: "ZIWEI-IDENTITY-P0", locale: "en", amountLa: 720,
    }).success).toBe(true);
    expect(WalletPurchaseIntentV1Schema.safeParse({
      ...base, sku: "ZIWEI-IDENTITY-P0", amountLa: 960,
    }).success).toBe(false);
  });

  it("accepts only the opaque public wallet-history identifier", () => {
    const item = {
      id: "wh_0123456789abcdef0123456789abcdef",
      category: "grant" as const,
      laDelta: 1,
      resultingPurchasedLa: 0,
      resultingPromotionalLa: 1,
      productTitle: null,
      occurredAt: "2026-09-17T00:00:00.000Z",
    };
    expect(WalletHistoryItemV1Schema.safeParse(item).success).toBe(true);
    expect(WalletHistoryItemV1Schema.safeParse({ ...item, id: "transaction-1" }).success).toBe(false);
    expect(WalletHistoryItemV1Schema.safeParse({ ...item, id: "wh_ABCDEF0123456789ABCDEF0123456789" }).success).toBe(false);
  });
  it("validates all new SKUs and rollover prices in WalletPurchaseIntentV1Schema", () => {
    const base = {
      id: "intent-123",
      chartVersionId: "chart-version-456",
      status: "pending" as const,
      stateVersion: 1,
      createdAt: "2026-10-01T00:00:00.000Z",
    };

    // Single palaces (120)
    expect(WalletPurchaseIntentV1Schema.safeParse({ ...base, sku: "ZIWEI-PALACE-P0", locale: "vi", amountLa: 120 }).success).toBe(false);
    expect(WalletPurchaseIntentV1Schema.safeParse({ ...base, sku: "ZIWEI-PALACE-LIFE-P0", locale: "vi", amountLa: 120 }).success).toBe(true);
    expect(WalletPurchaseIntentV1Schema.safeParse({ ...base, sku: "ZIWEI-PALACE-LIFE-P0", locale: "vi", amountLa: 120 }).success).toBe(true);
    expect(WalletPurchaseIntentV1Schema.safeParse({ ...base, sku: "ZIWEI-PALACE-LIFE-P0", locale: "vi", amountLa: 240 }).success).toBe(false);

    // Topics (480)
    expect(WalletPurchaseIntentV1Schema.safeParse({ ...base, sku: "ZIWEI-RELATIONSHIP-P0", locale: "vi", amountLa: 480 }).success).toBe(true);
    expect(WalletPurchaseIntentV1Schema.safeParse({ ...base, sku: "ZIWEI-CAREER-P0", locale: "en", amountLa: 480 }).success).toBe(true);

    // Forecasts & Combos
    expect(WalletPurchaseIntentV1Schema.safeParse({ ...base, sku: "ZIWEI-TODAY-P0", locale: "vi", amountLa: 60 }).success).toBe(true);
    expect(WalletPurchaseIntentV1Schema.safeParse({ ...base, sku: "ZIWEI-MONTHLY-P0", locale: "vi", amountLa: 300 }).success).toBe(true);
    expect(WalletPurchaseIntentV1Schema.safeParse({ ...base, sku: "ZIWEI-YEAR-2026-P0", locale: "vi", amountLa: 480 }).success).toBe(true);
    expect(WalletPurchaseIntentV1Schema.safeParse({ ...base, sku: "ZIWEI-COMBO-2026-P0", locale: "vi", amountLa: 1300 }).success).toBe(true);

    // Memberships
    expect(WalletPurchaseIntentV1Schema.safeParse({ ...base, sku: "MEMBERSHIP-MONTHLY-P0", locale: "vi", amountLa: 1500 }).success).toBe(true);
    expect(WalletPurchaseIntentV1Schema.safeParse({ ...base, sku: "MEMBERSHIP-YEARLY-P0", locale: "vi", amountLa: 8000 }).success).toBe(true);

    // Rollover amounts for ZIWEI-IDENTITY-P0 (any valid discount from 0 to 960)
    expect(WalletPurchaseIntentV1Schema.safeParse({ ...base, sku: "ZIWEI-IDENTITY-P0", locale: "vi", amountLa: 840 }).success).toBe(true);
    expect(WalletPurchaseIntentV1Schema.safeParse({ ...base, sku: "ZIWEI-IDENTITY-P0", locale: "vi", amountLa: 600 }).success).toBe(true);
    expect(WalletPurchaseIntentV1Schema.safeParse({ ...base, sku: "ZIWEI-IDENTITY-P0", locale: "vi", amountLa: 480 }).success).toBe(true);
    expect(WalletPurchaseIntentV1Schema.safeParse({ ...base, sku: "ZIWEI-IDENTITY-P0", locale: "vi", amountLa: 0 }).success).toBe(true);
    expect(WalletPurchaseIntentV1Schema.safeParse({ ...base, sku: "ZIWEI-IDENTITY-P0", locale: "vi", amountLa: 961 }).success).toBe(false);
    expect(WalletPurchaseIntentV1Schema.safeParse({ ...base, sku: "ZIWEI-IDENTITY-P0", locale: "vi", amountLa: -1 }).success).toBe(false);
  });

  it("validates WalletContentPriceV1Schema against catalog prices and rollover bounds", () => {
    expect(WalletContentPriceV1Schema.safeParse({ sku: "ZIWEI-NATAL-EXCERPT-P0", amountLa: 240 }).success).toBe(true);
    expect(WalletContentPriceV1Schema.safeParse({ sku: "ZIWEI-NATAL-EXCERPT-P0", amountLa: 120 }).success).toBe(false);

    expect(WalletContentPriceV1Schema.safeParse({ sku: "ZIWEI-PALACE-LIFE-P0", amountLa: 120 }).success).toBe(true);
    expect(WalletContentPriceV1Schema.safeParse({ sku: "ZIWEI-PALACE-LIFE-P0", amountLa: 240 }).success).toBe(false);

    expect(WalletContentPriceV1Schema.safeParse({ sku: "ZIWEI-IDENTITY-P0", amountLa: 960 }).success).toBe(true);
    expect(WalletContentPriceV1Schema.safeParse({ sku: "ZIWEI-IDENTITY-P0", amountLa: 840 }).success).toBe(true);
    expect(WalletContentPriceV1Schema.safeParse({ sku: "ZIWEI-IDENTITY-P0", amountLa: 720 }).success).toBe(true);
    expect(WalletContentPriceV1Schema.safeParse({ sku: "ZIWEI-IDENTITY-P0", amountLa: 0 }).success).toBe(true);
    expect(WalletContentPriceV1Schema.safeParse({ sku: "ZIWEI-IDENTITY-P0", amountLa: 1000 }).success).toBe(false);

    expect(WalletContentPriceV1Schema.safeParse({ sku: "ZIWEI-COMBO-2026-P0", amountLa: 1300 }).success).toBe(true);
    expect(WalletContentPriceV1Schema.safeParse({ sku: "MEMBERSHIP-YEARLY-P0", amountLa: 8000 }).success).toBe(true);
  });

});

it("accepts member prices without discounting membership fees or daily standalone purchases", () => {
  for (const [sku, amountLa] of [["ZIWEI-NATAL-EXCERPT-P0", 192], ["ZIWEI-PALACE-LIFE-P0", 96], ["ZIWEI-CAREER-P0", 384], ["ZIWEI-MONTHLY-P0", 240], ["ZIWEI-IDENTITY-P0", 768]] as const) {
    expect(WalletContentPriceV1Schema.safeParse({ sku, amountLa }).success).toBe(true);
  }
  expect(WalletContentPriceV1Schema.safeParse({ sku: "MEMBERSHIP-MONTHLY-P0", amountLa: 1200 }).success).toBe(false);
  expect(WalletContentPriceV1Schema.safeParse({ sku: "ZIWEI-TODAY-P0", amountLa: 48 }).success).toBe(false);
});
