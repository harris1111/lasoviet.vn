import { describe, expect, it } from "vitest";

import { createWalletUnlockService } from "./wallet-unlock.service.js";

describe("wallet unlock service", () => {
  it("rejects anonymous actors before any purchase-intent persistence", async () => {
    const service = createWalletUnlockService({} as never, {} as never);
    await expect(service.createPurchaseIntent(
      { kind: "anonymous", anonymousActorId: "anonymous", sessionId: "session", requestId: "request" },
      { chartId: "chart", chartVersionId: "version", sku: "ZIWEI-NATAL-EXCERPT-P0", locale: "vi" },
    )).resolves.toEqual({ ok: false, code: "WALLET_ACCOUNT_REQUIRED" });
  });

  it("rejects a malformed anonymous unlock command before database or wallet access", async () => {
    const service = createWalletUnlockService({} as never, {} as never);
    await expect(service.unlock(
      { kind: "anonymous", anonymousActorId: "anonymous", sessionId: "session", requestId: "request" },
      { purchaseIntentId: "", expectedIntentVersion: 0, expectedWalletVersion: 0, idempotencyKey: "" },
    )).resolves.toEqual({ ok: false, code: "WALLET_INTENT_INVALID" });
  });

  it("rejects malformed authenticated commands before reading a wallet", async () => {
    const service = createWalletUnlockService({} as never, {} as never);
    await expect(service.unlock(
      { kind: "account", userId: "account", sessionId: "session", requestId: "request" },
      { purchaseIntentId: "", expectedIntentVersion: 1, expectedWalletVersion: 1, idempotencyKey: "key" },
    )).resolves.toEqual({ ok: false, code: "WALLET_INTENT_INVALID" });
  });
});
