import { describe, expect, it } from "vitest";

import {
  walletAccounts,
  walletCreditLots,
  walletPurchaseIntents,
  walletRestorationAllocations,
  walletSpendAllocations,
  walletTransactions,
} from "./wallet-commerce.js";
import { walletRestorationAllocations as publicWalletRestorationAllocations } from "../index.js";

describe("wallet commerce schema", () => {
  it("defines authoritative wallet, lot, allocation, and receipt relations", () => {
    expect(walletAccounts.ownerId).toBeDefined();
    expect(walletTransactions.idempotencyKey).toBeDefined();
    expect(walletTransactions.topUpOrderId).toBeDefined();
    expect(walletCreditLots.grantedLa).toBeDefined();
    expect(walletCreditLots.bucket).toBeDefined();
    expect(walletSpendAllocations.bucket).toBeDefined();
    expect(walletSpendAllocations.recognizedVnd).toBeDefined();
    expect(walletPurchaseIntents.priceLa).toBeDefined();
    expect(walletPurchaseIntents.locale).toBeDefined();
  });

  it("exports restoration allocations through the package root", () => {
    expect(publicWalletRestorationAllocations).toBe(walletRestorationAllocations);
  });
});
