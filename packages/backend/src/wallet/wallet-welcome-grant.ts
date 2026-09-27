import type { Database } from "@lasoviet/database";

import { createDatabaseWalletRepository } from "./wallet.repository.js";

export const WALLET_WELCOME_GRANT_REASON_CODE = "wallet.welcome.grant";
export const WALLET_WELCOME_GRANT_PROMOTIONAL_LA = 60;

export function walletWelcomeGrantIdempotencyKey(ownerId: string): string {
  return `wallet-welcome:${ownerId}`;
}

/**
 * Grants the 60-Lá welcome bonus to a verified account, exactly once
 * (FD-105 package 1.6). Safe to call on every request that touches the
 * wallet: the idempotency key is derived from the account id, so a repeat
 * call after the first grant is a no-op replay, and an ineligible account
 * (anonymous or unverified) fails closed with no partial state.
 */
export async function ensureWalletWelcomeGrant(
  database: Database,
  ownerId: string,
  context: { now: () => Date; requestId: string; traceId: string },
): Promise<void> {
  const token = {};
  const wallet = createDatabaseWalletRepository(database, {
    now: context.now,
    trustedGrantAuthority: { token, actorId: ownerId },
  });
  await wallet.grant({
    targetOwnerId: ownerId,
    topUpOrderId: null,
    trustedGrantToken: token,
    grant: {
      kind: "grant",
      actorId: ownerId,
      reasonCode: WALLET_WELCOME_GRANT_REASON_CODE,
      requestId: context.requestId,
      traceId: context.traceId,
      idempotencyKey: walletWelcomeGrantIdempotencyKey(ownerId),
      purchasedLa: 0,
      promotionalLa: WALLET_WELCOME_GRANT_PROMOTIONAL_LA,
      topUpPackId: null,
    },
  });
  // Failure (already granted, or account not yet eligible) is not surfaced:
  // the caller's own flow (reading balance, unlocking) must still complete.
}
