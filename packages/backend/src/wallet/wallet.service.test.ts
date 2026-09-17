import { describe, expect, it, vi } from "vitest";
import { createWalletService } from "./wallet.service.js";

describe("createWalletService", () => {
  it("rejects invalid commands before repository delegation", async () => {
    const repository = { grant: vi.fn(), spend: vi.fn(), restore: vi.fn(), readBalance: vi.fn(), readHistory: vi.fn() };
    const service = createWalletService(repository as never);
    const result = await service.grant({ targetOwnerId: "user", topUpOrderId: null, grant: {} as never });
    expect(result).toMatchObject({ ok: false, error: { code: "WALLET_INVALID_COMMAND" } });
    expect(repository.grant).not.toHaveBeenCalled();
  });

  it("binds spend and restoration payload actors to the authenticated account before delegation", async () => {
    const repository = { grant: vi.fn(), spend: vi.fn(), restore: vi.fn(), readBalance: vi.fn(), readHistory: vi.fn() };
    const service = createWalletService(repository as never);
    const actor = { kind: "account" as const, userId: "account-a", sessionId: "session-a", requestId: "request-a" };

    expect(service.spend({
      actor,
      spend: {
        kind: "spend", actorId: "account-b", reasonCode: "wallet.report.unlock", requestId: "request",
        traceId: "trace", idempotencyKey: "key", purchaseIntentId: "intent", amountLa: 240, expectedWalletVersion: 1,
      },
    })).toMatchObject({ ok: false, error: { code: "WALLET_INVALID_COMMAND" } });
    expect(service.restore({
      actor,
      restoration: {
        kind: "restoration", actorId: "account-b", reasonCode: "wallet.report.failure", requestId: "request",
        traceId: "trace", idempotencyKey: "key", originalSpendId: "spend", expectedWalletVersion: 1,
      },
    })).toMatchObject({ ok: false, error: { code: "WALLET_INVALID_COMMAND" } });
    expect(repository.spend).not.toHaveBeenCalled();
    expect(repository.restore).not.toHaveBeenCalled();
  });
});
