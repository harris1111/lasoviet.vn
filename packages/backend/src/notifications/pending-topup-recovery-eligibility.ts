import { readPurchaseCommercialTerms } from "../commerce/purchase-commercial-terms.js";
import { and, desc, eq, or } from "drizzle-orm";
import { findLaProduct, WalletTopUpCatalogV1 } from "@lasoviet/contracts";
import {
  authUsers, birthProfiles, commerceOrders, consents, deletionRequests,
  notificationPreferences,
  walletPurchaseIntents, walletTopUpContinuations, ziweiCharts,
  ziweiChartVersions, type Database,
} from "@lasoviet/database";
import { fingerprintEmail } from "./notification-preference.js";

export const PENDING_TOPUP_RECOVERY_DELAY_MS = 30 * 60 * 1000;
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

/** Caller holds the shared purge/consent fence; no stored capture proves current eligibility. */
export async function readPendingTopUpRecoveryEligibility(transaction: Transaction, options: {
  tokenSecret: string; orderTtlSeconds: number;
}, orderId: string, now: Date) {
  const cutoff = new Date(now.getTime() - PENDING_TOPUP_RECOVERY_DELAY_MS);
  const expiresBefore = new Date(now.getTime() - options.orderTtlSeconds * 1000);
          // Respect settlement's order -> continuation -> intent lock order. Busy
          // rows are skipped instead of waiting on a wallet/account authority lock.
          const [order] = await transaction.select().from(commerceOrders).where(eq(commerceOrders.id, orderId))
            .for("update", { skipLocked: true });
          if (!order || order.kind !== "wallet_topup" || order.status !== "pending" || order.paidAt ||
              order.createdAt > cutoff || order.createdAt <= expiresBefore ||
              (order.creditExpiresAt !== null && order.creditExpiresAt <= now)) return null;
          const [continuation] = await transaction.select().from(walletTopUpContinuations)
            .where(eq(walletTopUpContinuations.orderId, order.id)).for("update", { skipLocked: true });
          if (!continuation || continuation.status !== "pending" || continuation.ownerId !== order.ownerId) return null;
          const [intent] = await transaction.select().from(walletPurchaseIntents)
            .where(eq(walletPurchaseIntents.id, continuation.purchaseIntentId)).for("share", { skipLocked: true });
          if (!intent || intent.ownerId !== order.ownerId || intent.status !== "pending" ||
              intent.stateVersion !== continuation.intentStateVersion || intent.priceLa !== continuation.confirmedPriceLa ||
              intent.locale !== order.locale || intent.periodKey !== "lifetime") return null;
          const product = findLaProduct(intent.sku);
          const terms = readPurchaseCommercialTerms(intent);
          // Timed rollover/member quotes need their own deadline proof. This bounded
          // milestone conservatively excludes every discounted or held intent.
          if (!product || product.availability !== "active" || !terms || intent.priceLa !== terms.basePriceLa ||
              (intent.locale !== "vi" && intent.locale !== "en") || !product.locales.includes(intent.locale)) return null;
          const pack = WalletTopUpCatalogV1.find(item => item.id === order.sku);
          if (!pack || order.amount !== pack.vndAmount || order.currency !== "VND") return null;
          const [user] = await transaction.select().from(authUsers).where(eq(authUsers.id, order.ownerId))
            .for("share", { skipLocked: true });
          if (!user || !user.emailVerified || user.isAnonymous) return null;
          const [deletion] = await transaction.select({ status: deletionRequests.status }).from(deletionRequests)
            .where(eq(deletionRequests.userId, user.id));
          if (deletion && deletion.status !== "cancelled") return null;
          const [consent] = await transaction.select().from(consents)
            .where(and(eq(consents.userId, user.id), eq(consents.purpose, "offers")))
            .orderBy(desc(consents.grantedAt), desc(consents.id)).limit(1).for("share", { skipLocked: true });
          if (!consent || consent.revokedAt !== null || consent.grantedAt > now) return null;
          const recipientFingerprint = fingerprintEmail(user.email, options.tokenSecret);
          const preferences = await transaction.select().from(notificationPreferences)
            .where(or(eq(notificationPreferences.userId, user.id), eq(notificationPreferences.emailFingerprint, recipientFingerprint)));
          if (preferences.some(item => item.unsubscribedAll || !item.nurtureEmailsAllowed)) return null;
          const [chart] = await transaction.select({ profileId: ziweiCharts.profileId }).from(ziweiCharts)
            .where(eq(ziweiCharts.id, intent.chartId));
          if (!chart) return null;
          const [profile] = await transaction.select().from(birthProfiles).where(eq(birthProfiles.id, chart.profileId))
            .for("share", { skipLocked: true });
          if (!profile || profile.userId !== user.id || profile.deletedAt !== null) return null;
          const [version] = await transaction.select({ id: ziweiChartVersions.id }).from(ziweiChartVersions)
            .where(eq(ziweiChartVersions.chartId, intent.chartId)).orderBy(desc(ziweiChartVersions.createdAt), desc(ziweiChartVersions.id)).limit(1);
          if (version?.id !== intent.chartVersionId) return null;
  return { order, continuation, intent, product, pack, user, recipientFingerprint };
}
