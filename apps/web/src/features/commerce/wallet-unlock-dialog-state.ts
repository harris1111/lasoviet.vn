export type WalletUnlockLoadedState =
  | {
      step: "confirm";
      balance: number;
      priceLa: number;
      intentId: string;
      intentVersion: number;
      walletVersion: number;
    }
  | { step: "short_balance"; balance: number; priceLa: number; intentId: string; intentVersion: number; walletVersion: number };

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
    return { step: "short_balance", balance: balance.totalLa, priceLa: intent.amountLa, intentId: intent.id, intentVersion: intent.stateVersion, walletVersion: placeholderWalletVersion };
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

export type WalletUnlockErrorKind =
  | "chart_not_found"
  | "preparing"
  | "stale"
  | "unavailable"
  | "generic";

/**
 * Maps a server error code to the plain-language message the dialog shows.
 * `stale` means the intent changed under the customer (chart recalculated,
 * price moved): a retry with a fresh intent is the right recovery.
 */
export function classifyWalletUnlockError(code: string | undefined): WalletUnlockErrorKind {
  switch (code) {
    case "WALLET_CHART_NOT_FOUND":
      return "chart_not_found";
    case "WALLET_EVIDENCE_MISSING":
      return "preparing";
    case "WALLET_INTENT_VERSION_CONFLICT":
    case "WALLET_IDEMPOTENCY_KEY_REUSED":
      return "stale";
    case "PRIVATE_API_UNREACHABLE":
    case "PRIVATE_API_RESPONSE_INVALID":
    case "UPSTREAM_UNAVAILABLE":
      return "unavailable";
    default:
      return "generic";
  }
}
