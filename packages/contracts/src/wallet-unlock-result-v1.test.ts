import { describe, expect, it } from "vitest";
import { WalletUnlockRequestV1Schema, WalletUnlockResultV1Schema, WalletUpgradePurchaseV1Schema } from "./wallet-unlock-result-v1.js";

const upgrade = {version: 1, eventKey: "upg_0123456789abcdef0123456789abcdef", occurredAt: "2026-10-04T00:00:00Z",
  targetSku: "ZIWEI-IDENTITY-P0", sourceSku: "ZIWEI-PALACE-LIFE-P0", sourceSkus: ["ZIWEI-PALACE-LIFE-P0", "ZIWEI-PALACE-WEALTH-P0"],
  chargedLa: 720, creditLa: 240, currency: "LA"};
const result = {intent: {id: "intent", sku: "ZIWEI-IDENTITY-P0", productTitle: "Lifetime", locale: "vi", amountLa: 720,
  status: "completed", stateVersion: 2, createdAt: "2026-10-04T00:00:00Z"},
  balance: {version: 1, stateVersion: 4, totalLa: 1040, purchasedLa: 0, promotionalLa: 1040, updatedAt: "2026-10-04T00:00:00Z"},
  reportId: "report", upgradePurchase: upgrade};

describe("committed wallet upgrade projections", () => {
  it("accepts exact credited and zero-price completions without exposing ledger or chart identities", () => {
    expect(WalletUnlockResultV1Schema.safeParse(result).success).toBe(true);
    expect(WalletUpgradePurchaseV1Schema.safeParse({...upgrade, chargedLa: 0, creditLa: 960}).success).toBe(true);
    expect(WalletUpgradePurchaseV1Schema.safeParse({...upgrade, spendId: "private"}).success).toBe(false);
    expect(WalletUpgradePurchaseV1Schema.safeParse({...upgrade, chartId: "private"}).success).toBe(false);
  });

  it.each([
    {creditLa: 192}, {sourceSkus: ["ZIWEI-IDENTITY-P0"]}, {sourceSku: "ZIWEI-NATAL-EXCERPT-P0"},
    {sourceSkus: ["ZIWEI-PALACE-LIFE-P0", "ZIWEI-PALACE-LIFE-P0"]}, {eventKey: "raw-ledger-id"},
  ])("rejects inconsistent credit or unbound source proof %j", patch => {
    expect(WalletUpgradePurchaseV1Schema.safeParse({...upgrade, ...patch}).success).toBe(false);
  });

  it("rejects an uncommitted, wrong-target or wrong-charge upstream result", () => {
    for (const intent of [{...result.intent, status: "pending"}, {...result.intent, amountLa: 768}, {...result.intent, sku: "ZIWEI-NATAL-EXCERPT-P0"}]) {
      expect(WalletUnlockResultV1Schema.safeParse({...result, intent}).success).toBe(false);
    }
    expect(WalletUnlockResultV1Schema.safeParse({...result, reportId: null}).success).toBe(false);
    expect(WalletUnlockResultV1Schema.safeParse({...result, balance: {...result.balance, totalLa: 1041}}).success).toBe(false);
  });

  it("allows legacy or explicit no-upgrade results and rejects browser pricing metadata", () => {
    const legacy: Record<string, unknown> = {...result};
    delete legacy.upgradePurchase;
    expect(WalletUnlockResultV1Schema.safeParse(legacy).success).toBe(true);
    expect(WalletUnlockResultV1Schema.safeParse({...result, upgradePurchase: null}).success).toBe(true);
    const request = {purchaseIntentId: "intent", expectedIntentVersion: 1, expectedWalletVersion: 1, idempotencyKey: "key"};
    expect(WalletUnlockRequestV1Schema.safeParse(request).success).toBe(true);
    expect(WalletUnlockRequestV1Schema.safeParse({...request, upgradePurchase: upgrade}).success).toBe(false);
  });
});
