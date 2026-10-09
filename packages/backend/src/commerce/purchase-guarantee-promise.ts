import { GuaranteePromiseV1Schema, type GuaranteePromiseV1 } from "@lasoviet/contracts";
import type { walletAccounts, walletPurchaseIntents, walletTransactions } from "@lasoviet/database";
import { readPurchaseCommercialTerms } from "./purchase-commercial-terms.js";

type Intent = Parameters<typeof readPurchaseCommercialTerms>[0] & Pick<typeof walletPurchaseIntents.$inferSelect, "id">;
type Spend = Pick<typeof walletTransactions.$inferSelect, "walletId" | "purchaseIntentId" | "kind" | "createdAt">;

/** Only called after repository purchase/ledger/entitlement authorization. */
export function projectPurchaseGuaranteePromise(intent: Intent, spend: Spend, wallet: Pick<typeof walletAccounts.$inferSelect, "id" | "ownerId">): GuaranteePromiseV1 | null {
  const terms = readPurchaseCommercialTerms(intent);
  if (!terms || spend.kind !== "spend" || wallet.ownerId !== intent.ownerId || spend.walletId !== wallet.id || spend.purchaseIntentId !== intent.id ||
      !Number.isFinite(spend.createdAt.getTime()) || spend.createdAt.getTime() < intent.createdAt.getTime()) return null;
  const maximumRestoreLa = terms.guarantee === "full" ? terms.chargedLa : terms.guarantee === "half" ? terms.chargedLa / 2 : 0;
  return GuaranteePromiseV1Schema.parse({version: 1, commercialPolicyVersion: terms.version,
    chargedLa: terms.chargedLa, restoration: terms.guarantee, maximumRestoreLa,
    claimBefore: terms.guarantee === "none" ? null : new Date(spend.createdAt.getTime() + 86_400_000).toISOString(),
    oncePerAccount: true, requiresAllPaidComponentsReady: terms.guarantee === "half"});
}
