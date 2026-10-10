import { randomUUID } from "node:crypto";
import { and, eq, gt, inArray, isNull, lte, notExists, sql } from "drizzle-orm";
import { commerceOrders, lockFreeAiCoordination, lockRecoveryCaptureCoordination, notificationDeliveries,
  recoveryOutboundControl, recoveryOutboundDailyAttempts, walletTopUpContinuations, type Database } from "@lasoviet/database";
import { PENDING_TOPUP_RECOVERY_DELAY_MS, readPendingTopUpRecoveryEligibility } from "./pending-topup-recovery-eligibility.js";
import { renderPendingTopUpRecoveryEmail } from "./pending-topup-recovery-email.js";
import type { EmailProvider } from "./email-provider.js";

import { recoveryChartHasCapacity } from "./recovery-capture-cap.js";

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
const SOURCE = "fresh-recovery-queue-v1", LEASE_MS = 45_000;
type CurrentSource = NonNullable<Awaited<ReturnType<typeof readPendingTopUpRecoveryEligibility>>>;
function matchesSource(row: typeof notificationDeliveries.$inferSelect, source: CurrentSource): boolean {
  const p = row.requestPayload;
  return row.idempotencyKey === `recovery-pending-topup:${source.order.id}` && p.orderId === source.order.id &&
    row.recipientFingerprint === source.recipientFingerprint && p.userId === source.user.id &&
    p.chartId === source.intent.chartId && p.chartVersionId === source.intent.chartVersionId &&
    p.intentId === source.intent.id && p.intentStateVersion === source.intent.stateVersion &&
    p.locale === source.intent.locale && p.amountLa === source.intent.priceLa && p.topUpVnd === source.order.amount;
}
export type RecoveryOutboundClaim = { deliveryId: string; attemptCount: number };

/** Fresh queue delivery requires explicit composition and audited, unstopped cohort controls. */
export function createPendingTopUpRecoveryRunner(options: {
  database: Database; mode?: "disabled" | "prepare"; tokenSecret: string;
  orderTtlSeconds: number; provider: EmailProvider; now?: () => Date;
}) {
  if (!Number.isSafeInteger(options.orderTtlSeconds) || options.orderTtlSeconds <= 0) throw new Error("RECOVERY_ORDER_TTL_INVALID");
  const { database } = options, clock = options.now ?? (() => new Date());
  async function fence(tx: Transaction) {
    await lockFreeAiCoordination(tx);
    await lockRecoveryCaptureCoordination(tx);
  }
  async function control(tx: Transaction) {
    const [row] = await tx.select().from(recoveryOutboundControl).where(eq(recoveryOutboundControl.id, "pending-topup")).for("share");
    if (!row || row.emergencyStopped || row.cohortIds.length < 1 || row.cohortIds.length > 5 ||
      new Set(row.cohortIds).size !== row.cohortIds.length || row.cohortIds.some(id => typeof id !== "string" || !id.trim())) return null;
    return row;
  }
  async function fail(tx: Transaction, id: string, code: string, now: Date, status: "failed_permanent" | "delivery_unknown" = "failed_permanent") {
    await tx.update(notificationDeliveries).set({ status, lastErrorCode: code, sendingLeaseExpiresAt: null, updatedAt: now })
      .where(eq(notificationDeliveries.id, id));
  }
  return {
    async enqueueFresh(limit = 25): Promise<number> {
      if (options.mode !== "prepare" || options.orderTtlSeconds * 1000 <= PENDING_TOPUP_RECOVERY_DELAY_MS) return 0;
      if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new Error("RECOVERY_LIMIT_INVALID");
      return database.transaction(async tx => {
        await fence(tx);
        const settings = await control(tx);
        if (!settings) return 0;
        const now = clock(), cutoff = new Date(now.getTime() - PENDING_TOPUP_RECOVERY_DELAY_MS);
        const rows = await tx.select({ id: commerceOrders.id }).from(commerceOrders)
          .innerJoin(walletTopUpContinuations, eq(walletTopUpContinuations.orderId, commerceOrders.id))
          .where(and(eq(commerceOrders.kind, "wallet_topup"), inArray(commerceOrders.ownerId, settings.cohortIds), eq(commerceOrders.status, "pending"), isNull(commerceOrders.paidAt),
            lte(commerceOrders.createdAt, cutoff), gt(commerceOrders.createdAt, new Date(now.getTime() - options.orderTtlSeconds * 1000)),
            eq(walletTopUpContinuations.status, "pending"), notExists(tx.select({ id: notificationDeliveries.id }).from(notificationDeliveries)
              .where(eq(notificationDeliveries.idempotencyKey, sql`'recovery-pending-topup:' || ${commerceOrders.id}`)))))
          .orderBy(commerceOrders.createdAt, commerceOrders.id).limit(limit);
        let queued = 0;
        for (const row of rows) {
          const source = await readPendingTopUpRecoveryEligibility(tx, options, row.id, now);
          if (!source || !settings.cohortIds.includes(source.user.id)) continue;
          const { intent, order, user, recipientFingerprint } = source;
          if (!await recoveryChartHasCapacity(tx, intent.chartId)) continue;
          const inserted = await tx.insert(notificationDeliveries).values({ id: randomUUID(), kind: "recovery_pending_topup",
            idempotencyKey: `recovery-pending-topup:${order.id}`, recipientFingerprint, status: "pending", attemptCount: 0,
            requestPayload: { version: 1, source: SOURCE, userId: user.id, chartId: intent.chartId, chartVersionId: intent.chartVersionId,
              orderId: order.id, intentId: intent.id, intentStateVersion: intent.stateVersion, locale: intent.locale,
              amountLa: intent.priceLa, topUpVnd: order.amount }, createdAt: now, updatedAt: now }).onConflictDoNothing().returning({ id: notificationDeliveries.id });
          queued += inserted.length;
        }
        return queued;
      });
    },
    async claimNext(): Promise<RecoveryOutboundClaim | null> {
      if (options.mode !== "prepare") return null;
      return database.transaction(async tx => {
        await fence(tx);
        const now = clock();
        await tx.update(notificationDeliveries).set({ status: "delivery_unknown", lastErrorCode: "RECOVERY_LEASE_EXPIRED", sendingLeaseExpiresAt: null, updatedAt: now })
          .where(and(eq(notificationDeliveries.kind, "recovery_pending_topup"), eq(notificationDeliveries.status, "sending"), lte(notificationDeliveries.sendingLeaseExpiresAt, now), sql`${notificationDeliveries.requestPayload}->>'source' = ${SOURCE}`));
        const settings = await control(tx);
        if (!settings) return null;
        const candidates = await tx.select().from(notificationDeliveries).where(and(eq(notificationDeliveries.kind, "recovery_pending_topup"),
          eq(notificationDeliveries.status, "pending"), eq(notificationDeliveries.attemptCount, 0), sql`${notificationDeliveries.requestPayload}->>'source' = ${SOURCE}`))
          .orderBy(notificationDeliveries.createdAt, notificationDeliveries.id).limit(100).for("update", { skipLocked: true });
        for (const row of candidates) {
          const ownerId = row.requestPayload.userId;
          if (typeof ownerId !== "string" || !settings.cohortIds.includes(ownerId)) { await fail(tx, row.id, "RECOVERY_COHORT_EXCLUDED", now); continue; }
          const source = typeof row.requestPayload.orderId === "string"
            ? await readPendingTopUpRecoveryEligibility(tx, options, row.requestPayload.orderId, now) : null;
          if (!source || !matchesSource(row, source)) { await fail(tx, row.id, "RECOVERY_CLAIM_SUPPRESSED", now); continue; }
          const [recent] = await tx.select({ id: notificationDeliveries.id }).from(notificationDeliveries).where(and(
            eq(notificationDeliveries.kind, "recovery_pending_topup"), sql`${notificationDeliveries.requestPayload}->>'userId' = ${ownerId}`,
            gt(notificationDeliveries.attemptCount, 0), sql`coalesce((${notificationDeliveries.requestPayload}->>'attemptReservedAt')::timestamptz, ${notificationDeliveries.sentAt}, ${notificationDeliveries.createdAt}) > ${new Date(now.getTime() - 86400000).toISOString()}::timestamptz`)).limit(1);
          if (recent) continue;
          const day = now.toISOString().slice(0, 10);
          const budget = await tx.insert(recoveryOutboundDailyAttempts).values({ utcDay: day, attempts: 1 })
            .onConflictDoUpdate({ target: recoveryOutboundDailyAttempts.utcDay, set: { attempts: sql`${recoveryOutboundDailyAttempts.attempts} + 1` },
              setWhere: sql`${recoveryOutboundDailyAttempts.attempts} < ${settings.dailyLimit}` }).returning();
          if (!budget.length) return null;
          await tx.update(notificationDeliveries).set({ status: "sending", attemptCount: 1, sendingLeaseExpiresAt: new Date(now.getTime() + LEASE_MS),
            requestPayload: { ...row.requestPayload, attemptReservedAt: now.toISOString() }, updatedAt: now }).where(eq(notificationDeliveries.id, row.id));
          return { deliveryId: row.id, attemptCount: 1 };
        }
        return null;
      });
    },
    async deliverClaimed(claim: RecoveryOutboundClaim): Promise<"disabled" | "ignored" | "suppressed" | "sent" | "delivery_unknown"> {
      if (options.mode !== "prepare") return "disabled";
      return database.transaction(async tx => {
        await fence(tx);
        const now = clock();
        const [row] = await tx.select().from(notificationDeliveries).where(and(eq(notificationDeliveries.id, claim.deliveryId),
          eq(notificationDeliveries.kind, "recovery_pending_topup"), eq(notificationDeliveries.status, "sending"), eq(notificationDeliveries.attemptCount, claim.attemptCount),
          sql`${notificationDeliveries.requestPayload}->>'source' = ${SOURCE}`)).for("update");
        if (!row) return "ignored";
        if (!row.sendingLeaseExpiresAt || row.sendingLeaseExpiresAt <= now) { await fail(tx, row.id, "RECOVERY_LEASE_EXPIRED", now, "delivery_unknown"); return "delivery_unknown"; }
        const settings = await control(tx), payload = row.requestPayload;
        const source = settings && typeof payload.orderId === "string" ? await readPendingTopUpRecoveryEligibility(tx, options, payload.orderId, now) : null;
        if (!source || !settings!.cohortIds.includes(source.user.id) || !matchesSource(row, source)) {
          await fail(tx, row.id, "RECOVERY_PRESEND_SUPPRESSED", now); return "suppressed";
        }
        const message = renderPendingTopUpRecoveryEmail({ userId: source.user.id, email: source.user.email,
          orderId: source.order.id, deliveryId: row.id, locale: source.intent.locale as "vi" | "en", productSku: source.intent.sku,
          amountLa: source.intent.priceLa, topUpSku: source.order.sku, topUpVnd: source.order.amount, tokenSecret: options.tokenSecret, now });
        let timeout: ReturnType<typeof setTimeout> | undefined;
        try {
          // The coordination and source locks cover the bounded final provider call.
          const outcome = await Promise.race([options.provider.send({ to: source.user.email, subject: message.subject, text: message.text, html: message.html }, row.idempotencyKey),
            new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error("RECOVERY_PROVIDER_TIMEOUT")), 10000); })]);
          if (!outcome.ok) { await fail(tx, row.id, outcome.code, clock(), "delivery_unknown"); return "delivery_unknown"; }
          await tx.update(notificationDeliveries).set({ status: "sent", providerMessageId: outcome.providerMessageId ?? null, sentAt: clock(), updatedAt: clock(),
            sendingLeaseExpiresAt: null }).where(eq(notificationDeliveries.id, row.id));
          return "sent";
        } catch {
          await fail(tx, row.id, "RECOVERY_PROVIDER_OUTCOME_UNKNOWN", clock(), "delivery_unknown"); return "delivery_unknown";
        } finally { if (timeout) clearTimeout(timeout); }
      });
    },
  };
}
