import { describe, expect, it } from "vitest";

import {
  WalletBalanceV1Schema,
  WalletCreditLotV1Schema,
  WalletGrantV1Schema,
  WalletHistoryItemV1Schema,
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
      version: 1, totalLa: 300, purchasedLa: 240, promotionalLa: 60,
      updatedAt: "2026-09-17T00:00:00.000Z",
    };
    expect(WalletBalanceV1Schema.safeParse(balance).success).toBe(true);
    expect(WalletBalanceV1Schema.safeParse({ ...balance, totalLa: 299 }).success).toBe(false);
    expect(WalletBalanceV1Schema.safeParse({ ...balance, extra: "sensitive" }).success).toBe(false);
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
});
