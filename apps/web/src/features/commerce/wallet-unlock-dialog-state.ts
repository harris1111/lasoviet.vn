export type WalletUnlockLoadedState =
  | {
      step: "confirm";
      balance: number;
      priceLa: number;
      intentId: string;
      intentVersion: number;
      walletVersion: number;
    }
  | { step: "short_balance"; balance: number; priceLa: number };

/**
 * Decides whether a freshly loaded intent + balance is enough to confirm the
 * spend outright, or must show the short-balance sheet first (FD-105
 * package 1.2). Pure so it can be unit-tested without simulating the
 * dialog's fetch/effect lifecycle.
 */
export function resolveWalletUnlockLoadedState(
  intent: { id: string; amountLa: number; stateVersion: number },
  balance: { totalLa: number },
  placeholderWalletVersion: number,
): WalletUnlockLoadedState {
  if (balance.totalLa < intent.amountLa) {
    return { step: "short_balance", balance: balance.totalLa, priceLa: intent.amountLa };
  }
  return {
    step: "confirm",
    balance: balance.totalLa,
    priceLa: intent.amountLa,
    intentId: intent.id,
    intentVersion: intent.stateVersion,
    walletVersion: placeholderWalletVersion,
  };
}
