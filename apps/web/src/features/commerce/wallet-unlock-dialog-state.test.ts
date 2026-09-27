import { describe, expect, it } from "vitest";

import { resolveWalletUnlockLoadedState } from "./wallet-unlock-dialog-state";

describe("resolveWalletUnlockLoadedState", () => {
  it("confirms when the balance covers the price exactly", () => {
    const result = resolveWalletUnlockLoadedState(
      { id: "intent-1", amountLa: 960, stateVersion: 3 },
      { totalLa: 960 },
      1,
    );
    expect(result).toEqual({
      step: "confirm",
      balance: 960,
      priceLa: 960,
      intentId: "intent-1",
      intentVersion: 3,
      walletVersion: 1,
    });
  });

  it("confirms when the balance exceeds the price", () => {
    const result = resolveWalletUnlockLoadedState(
      { id: "intent-1", amountLa: 240, stateVersion: 1 },
      { totalLa: 1000 },
      1,
    );
    expect(result.step).toBe("confirm");
  });

  it("shows the short-balance state when the balance is below the price", () => {
    const result = resolveWalletUnlockLoadedState(
      { id: "intent-1", amountLa: 960, stateVersion: 1 },
      { totalLa: 100 },
      1,
    );
    expect(result).toEqual({ step: "short_balance", balance: 100, priceLa: 960 });
  });

  it("shows the short-balance state at zero balance", () => {
    const result = resolveWalletUnlockLoadedState(
      { id: "intent-1", amountLa: 60, stateVersion: 1 },
      { totalLa: 0 },
      1,
    );
    expect(result.step).toBe("short_balance");
  });
});
