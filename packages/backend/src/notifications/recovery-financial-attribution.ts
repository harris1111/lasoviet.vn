import { and, desc, eq, inArray, isNull, notExists, or, sql } from "drizzle-orm";
import { SePayPaymentProvenanceV1Schema, WalletTopUpCatalogV1, WalletTransactionReceiptV1Schema } from "@lasoviet/contracts";
import { authUsers, birthProfiles, commerceOrders, commercePaymentEvents, consents, deletionRequests,
  lockFreeAiCoordination, lockRecoveryCaptureCoordination, notificationDeliveries, notificationPreferences,
  recoveryClickReceipts, walletAccounts, walletCommandReceipts, walletCreditLots, walletLedgerEntries,
  walletPurchaseIntents, walletSpendAllocations, walletTopUpContinuations, walletTransactions, ziweiCharts, type Database } from "@lasoviet/database";
import { fingerprintEmail } from "./notification-preference.js";
import { projectCommittedTopUpUnlock } from "../commerce/wallet-topup-unlock-event.js";

/** Historical conversion accounting, never a cash balance or incremental uplift claim. */
export function createRecoveryFinancialAttributionService(options: {
  database: Database; providerEnvironment?: "disabled" | "sandbox" | "production";
  tokenSecret: string; now?: () => Date;
}) {
  const clock = options.now ?? (() => new Date());
  return {
    async project(limit = 25) {
      if (options.providerEnvironment !== "production") return { attributed: 0 };
      if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new Error("RECOVERY_LIMIT_INVALID");
      return options.database.transaction(async tx => {
        await lockFreeAiCoordination(tx);
        await lockRecoveryCaptureCoordination(tx);
        const now = clock();
        // Filter committed sources before LIMIT so older pending/capture-only rows cannot starve conversions.
        const rows = await tx.select({ receipt: recoveryClickReceipts, payment: commercePaymentEvents })
          .from(recoveryClickReceipts)
          .innerJoin(commerceOrders, and(eq(commerceOrders.id, recoveryClickReceipts.orderId), eq(commerceOrders.status, "paid")))
          .innerJoin(commercePaymentEvents, and(eq(commercePaymentEvents.orderId, commerceOrders.id), eq(commercePaymentEvents.status, "ORDER_PAID"),
            sql`${commercePaymentEvents.providerProvenance}->>'environment' = 'production'`))
          .innerJoin(walletTopUpContinuations, and(eq(walletTopUpContinuations.orderId, commerceOrders.id), eq(walletTopUpContinuations.status, "completed")))
          .where(and(eq(recoveryClickReceipts.classification, "clicked"), isNull(recoveryClickReceipts.attributedAt)))
          .orderBy(recoveryClickReceipts.financialCheckCount, recoveryClickReceipts.clickedAt, recoveryClickReceipts.id).limit(limit);
        let attributed = 0;
        for (const { receipt, payment } of rows) {
          await tx.update(recoveryClickReceipts).set({financialCheckCount:sql`${recoveryClickReceipts.financialCheckCount} + 1`})
            .where(and(eq(recoveryClickReceipts.id,receipt.id),isNull(recoveryClickReceipts.attributedAt)));
          const provenance = SePayPaymentProvenanceV1Schema.safeParse(payment.providerProvenance);
          if (!provenance.success || provenance.data.environment !== "production") continue;
          const acceptedAt = new Date(provenance.data.authenticatedAcceptedAt);
          // Acceptance is webhook processing time, not the unparsed bank transfer time or late self-claim time.
          if (receipt.clickedAt >= acceptedAt || acceptedAt > payment.createdAt || payment.createdAt > now) continue;
          const [user] = await tx.select().from(authUsers).where(and(eq(authUsers.id, receipt.ownerId),
            eq(authUsers.emailVerified, true), eq(authUsers.isAnonymous, false),
            notExists(tx.select({ id: deletionRequests.id }).from(deletionRequests).where(and(
              eq(deletionRequests.userId, receipt.ownerId), inArray(deletionRequests.status, ["requested", "purged"])))))).limit(1);
          if (!user) continue;
          const [consent] = await tx.select().from(consents).where(and(eq(consents.userId, user.id), eq(consents.purpose, "offers")))
            .orderBy(desc(consents.grantedAt), desc(consents.id)).limit(1);
          const fingerprint = fingerprintEmail(user.email, options.tokenSecret);
          const preferences = await tx.select().from(notificationPreferences).where(or(eq(notificationPreferences.userId, user.id), eq(notificationPreferences.emailFingerprint, fingerprint)));
          if (!consent || consent.revokedAt || consent.grantedAt > receipt.clickedAt || preferences.some(p => p.unsubscribedAll || !p.nurtureEmailsAllowed)) continue;
          const [delivery] = await tx.select().from(notificationDeliveries).where(eq(notificationDeliveries.id, receipt.deliveryId)).limit(1);
          if (!delivery || delivery.kind !== "recovery_pending_topup" || delivery.status !== "sent" || !delivery.sentAt ||
            delivery.sentAt > receipt.clickedAt || delivery.createdAt > delivery.sentAt || delivery.recipientFingerprint !== fingerprint ||
            delivery.idempotencyKey !== `recovery-pending-topup:${receipt.orderId}`) continue;
          const [order] = await tx.select().from(commerceOrders).where(eq(commerceOrders.id, receipt.orderId)).for("share", { skipLocked: true });
          const [intent] = await tx.select().from(walletPurchaseIntents).where(eq(walletPurchaseIntents.id, receipt.intentId)).for("share", { skipLocked: true });
          const [continuation] = await tx.select().from(walletTopUpContinuations).where(eq(walletTopUpContinuations.orderId, receipt.orderId)).for("share", { skipLocked: true });
          const pack = WalletTopUpCatalogV1.find(p => p.id === order?.sku);
          if (!order || !intent || !continuation || !pack || order.kind !== "wallet_topup" || order.ownerId !== user.id || order.status !== "paid" ||
            !order.paidAt || order.paidAt.getTime() !== payment.createdAt.getTime() || order.amount !== pack.vndAmount || order.amount !== payment.amount ||
            order.currency !== "VND" || payment.currency !== "VND" || order.createdAt > receipt.clickedAt || order.locale !== intent.locale ||
            continuation.ownerId !== user.id || continuation.purchaseIntentId !== intent.id || intent.ownerId !== user.id ||
            intent.chartId !== receipt.chartId || intent.chartVersionId !== receipt.chartVersionId ||
            delivery.requestPayload.userId !== user.id || delivery.requestPayload.orderId !== order.id || delivery.requestPayload.intentId !== intent.id ||
            delivery.requestPayload.chartId !== intent.chartId || delivery.requestPayload.chartVersionId !== intent.chartVersionId ||
            delivery.requestPayload.locale !== intent.locale || delivery.requestPayload.amountLa !== intent.priceLa ||
            delivery.requestPayload.intentStateVersion !== continuation.intentStateVersion || delivery.requestPayload.topUpVnd !== order.amount) continue;
          const [profile] = await tx.select({ id: birthProfiles.id }).from(ziweiCharts).innerJoin(birthProfiles, eq(birthProfiles.id, ziweiCharts.profileId))
            .where(and(eq(ziweiCharts.id, intent.chartId), eq(birthProfiles.userId, user.id), isNull(birthProfiles.deletedAt))).limit(1);
          if (!profile) continue;
          const spend = await projectCommittedTopUpUnlock(tx as Database, user.id, order.id);
          if (!spend || spend.amount <= 0 || spend.occurredAt > now) continue;
          const [grant] = await tx.select({ transaction: walletTransactions, receipt: walletCommandReceipts })
            .from(walletTransactions).innerJoin(walletAccounts, eq(walletAccounts.id, walletTransactions.walletId))
            .innerJoin(walletCommandReceipts, and(eq(walletCommandReceipts.transactionId, walletTransactions.id), eq(walletCommandReceipts.walletId, walletAccounts.id)))
            .where(and(eq(walletTransactions.topUpOrderId, order.id), eq(walletAccounts.ownerId, user.id), eq(walletTransactions.kind, "grant"))).limit(1);
          const grantReceipt = WalletTransactionReceiptV1Schema.safeParse((grant?.receipt.result as { receipt?: unknown } | undefined)?.receipt);
          if (!grant || !grantReceipt.success || grantReceipt.data.transactionId !== grant.transaction.id || grantReceipt.data.status !== "completed" ||
            grant.receipt.fingerprint !== grant.transaction.fingerprint || grant.receipt.idempotencyKey !== grant.transaction.idempotencyKey ||
            grantReceipt.data.commandId !== grant.transaction.idempotencyKey || grant.transaction.createdAt < payment.createdAt || grant.transaction.createdAt > now) continue;
          const ledger = await tx.select().from(walletLedgerEntries).where(eq(walletLedgerEntries.transactionId, grant.transaction.id));
          if (ledger.length !== (pack.promotionalLa > 0 ? 2 : 1) ||
            ledger.find(e => e.bucket === "purchased")?.amountLa !== pack.purchasedLa ||
            (pack.promotionalLa > 0 && ledger.find(e => e.bucket === "promotional")?.amountLa !== pack.promotionalLa)) continue;
          // Only allocations funded by THIS order contribute to this reminder's recognized VND.
          const allocations = await tx.select({ recognizedVnd: walletSpendAllocations.recognizedVnd })
            .from(walletSpendAllocations).innerJoin(walletCreditLots, eq(walletCreditLots.id, walletSpendAllocations.creditLotId))
            .where(and(eq(walletSpendAllocations.spendTransactionId, spend.transactionId), eq(walletCreditLots.grantTransactionId, grant.transaction.id)));
          if (allocations.length === 0) continue;
          const recognizedVnd = allocations.reduce((sum, row) => sum + row.recognizedVnd, 0);
          if (!Number.isSafeInteger(recognizedVnd) || recognizedVnd < 0 || recognizedVnd > order.amount) continue;
          const updated = await tx.update(recoveryClickReceipts).set({ attributedAt: now, paidVnd: order.amount,
            chargedLa: spend.amount, recognizedVnd, paymentEventId: payment.id, grantTransactionId: grant.transaction.id, spendTransactionId: spend.transactionId })
            .where(and(eq(recoveryClickReceipts.id, receipt.id), isNull(recoveryClickReceipts.attributedAt))).returning({ id: recoveryClickReceipts.id });
          attributed += updated.length;
        }
        return { attributed };
      });
    },
  };
}
