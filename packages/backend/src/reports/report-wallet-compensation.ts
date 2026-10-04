import {createHash} from "node:crypto";
import {and, asc, eq, isNull, lte, or, sql} from "drizzle-orm";
import {ReportFulfillmentFailedV1Schema} from "@lasoviet/contracts";
import {
  auditLogs, authUsers, commerceEntitlements, commerceOrders, deletionRequests, lockFreeAiCoordination, outbox,
  reportEntitlementLinks, reportQueueJobs, reportReservations, reportVersions, reportWalletCompensations,
  walletAccounts, walletTransactions, type Database,
} from "@lasoviet/database";
import {createDatabaseWalletRepository} from "../wallet/wallet.repository.js";
import {readReportWalletRestorationProof, readReportWalletSpendProof, type Reservation} from "./report-wallet-proof.js";

type Lease = {id: string; attempt: number};
class InvalidCompensation extends Error {}

export async function readLinkedReportEntitlements(database: Database, reservation: Reservation) {
  const [origin] = await database.select().from(commerceEntitlements)
    .where(eq(commerceEntitlements.id, reservation.entitlementId)).limit(1);
  if (!origin || origin.sku !== reservation.sku) throw new InvalidCompensation();
  const links = await database.select({entitlement: commerceEntitlements}).from(reportEntitlementLinks)
    .innerJoin(commerceEntitlements, eq(commerceEntitlements.id, reportEntitlementLinks.entitlementId))
    .where(eq(reportEntitlementLinks.reservationId, reservation.id));
  const entitlements = [origin, ...links.map(row => row.entitlement)].sort((a, b) => a.id.localeCompare(b.id));
  if (entitlements.some(row => row.ownerId !== origin.ownerId || row.chartId !== origin.chartId)) throw new InvalidCompensation();
  return entitlements;
}

/** Call under the reservation lock; compensation cannot change its funding meanwhile. */
export async function hasActiveReportPurchase(database: Database, reservation: Reservation) {
  const entitlements = await readLinkedReportEntitlements(database, reservation);
  for (const entitlement of entitlements) {
    if (entitlement.revokedAt) continue;
    if (entitlement.orderId) {
      const [order] = await database.select().from(commerceOrders).where(and(eq(commerceOrders.id, entitlement.orderId),
        eq(commerceOrders.ownerId, entitlement.ownerId), eq(commerceOrders.chartId, entitlement.chartId),
        eq(commerceOrders.chartVersionId, reservation.chartVersionId), eq(commerceOrders.status, "paid"))).limit(1);
      if (order?.paidAt && order.sku === entitlement.sku && order.locale === reservation.locale) return true;
    } else {
      const proof = await readReportWalletSpendProof(database, reservation, entitlement);
      if (!proof) continue;
      const [restoration] = await database.select({id: walletTransactions.id}).from(walletTransactions)
        .where(eq(walletTransactions.reversalOfTransactionId, proof.spend.id)).limit(1);
      if (!restoration) return true;
    }
  }
  return false;
}

/** No provider calls: terminal wallet compensation uses stored financial authority. */
export function createReportWalletCompensationRunner(database: Database, options: {
  workerId: string; now?: () => Date; limit?: number;
  beforeRestore?: (ordinal: number) => Promise<void>;
  afterRestore?: () => Promise<void>;
}) {
  const now = options.now ?? (() => new Date());
  const authorityToken = {};
  const owned = (lease: Lease) => and(eq(outbox.id, lease.id), eq(outbox.status, "leased"),
    eq(outbox.leasedBy, options.workerId), eq(outbox.attemptCount, lease.attempt));
  let active: Promise<{compensated: number}> | undefined;

  async function claim(): Promise<Lease | null> {
    return database.transaction(async tx => {
      const current = now();
      const [event] = await tx.select().from(outbox).where(and(
        eq(outbox.eventType, "report.fulfillment.failed.v1"), or(
          and(eq(outbox.status, "pending"), lte(outbox.availableAt, current)),
          and(eq(outbox.status, "leased"), lte(outbox.leasedUntil, current)),
        ), sql`${outbox.payload}->>'failureStage' IN ('generation', 'validation')`)).orderBy(asc(outbox.availableAt), asc(outbox.id)).limit(1).for("update", {skipLocked: true});
      if (!event) return null;
      await tx.update(outbox).set({status: "leased", leasedBy: options.workerId,
        leasedUntil: new Date(current.getTime() + 60_000), attemptCount: event.attemptCount + 1, updatedAt: current})
        .where(eq(outbox.id, event.id));
      return {id: event.id, attempt: event.attemptCount + 1};
    });
  }

  async function deliver(lease: Lease): Promise<boolean> {
    const [candidate] = await database.select().from(outbox).where(owned(lease)).limit(1);
    if (!candidate) return false;
    const parsed = ReportFulfillmentFailedV1Schema.safeParse(candidate.payload);
    if (!parsed.success) throw new InvalidCompensation();
    if (![parsed.data.reportId, parsed.data.reportVersionId].every(id => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))) throw new InvalidCompensation();
    if (["pdf", "garage"].includes(parsed.data.failureStage)) {
      await database.update(outbox).set({status: "processed", processedAt: now(), leasedBy: null,
        leasedUntil: null, updatedAt: now()}).where(owned(lease));
      return false;
    }
    const [initial] = await database.select({reservation: reportReservations, ownerId: commerceEntitlements.ownerId})
      .from(reportReservations).innerJoin(commerceEntitlements, eq(commerceEntitlements.id, reportReservations.entitlementId))
      .where(eq(reportReservations.reportVersionId, parsed.data.reportVersionId)).limit(1);
    // A privileged current-version restart supersedes the old failed version.
    if (!initial) {
      await database.update(outbox).set({status: "processed", processedAt: now(), leasedBy: null,
        leasedUntil: null, updatedAt: now()}).where(owned(lease));
      return false;
    }
    return database.transaction(async tx => {
      await lockFreeAiCoordination(tx);
      const [deletion] = await tx.select().from(deletionRequests).where(eq(deletionRequests.userId, initial.ownerId)).limit(1).for("update");
      const [owner] = await tx.select({id: authUsers.id}).from(authUsers).where(eq(authUsers.id, initial.ownerId)).limit(1).for("update");
      const [wallet] = await tx.select().from(walletAccounts).where(eq(walletAccounts.ownerId, initial.ownerId)).limit(1).for("update");
      const [reservation] = await tx.select().from(reportReservations).where(eq(reportReservations.id, initial.reservation.id)).limit(1).for("update");
      const [event] = await tx.select().from(outbox).where(owned(lease)).limit(1).for("update");
      if (!event) return false;
      const acknowledge = async () => {
        await tx.update(outbox).set({status: "processed", processedAt: now(), leasedBy: null,
          leasedUntil: null, lastErrorCode: null, updatedAt: now()}).where(owned(lease));
      };
      if (!owner || deletion?.status === "purged" || !reservation || reservation.status !== "terminal_failure" ||
          reservation.reportVersionId !== parsed.data.reportVersionId) {await acknowledge(); return false;}
      const [version] = await tx.select({id: reportVersions.id}).from(reportVersions)
        .where(eq(reportVersions.reportVersionId, reservation.reportVersionId)).limit(1);
      if (version) {await acknowledge(); return false;}
      const token = createHash("sha256").update(`${reservation.reportVersionId}::${reservation.activeJobId}::${parsed.data.failureStage}`).digest("hex");
      if (event.schemaVersion !== 1 || event.actorId !== null || event.aggregateType !== "report" ||
          event.aggregateId !== reservation.reportVersionId || parsed.data.reportId !== reservation.reportId ||
          parsed.data.errorCode !== reservation.lastErrorCode || event.eventId !== `evt-failed-${token}` ||
          event.idempotencyKey !== `report-failed:${token}` || event.occurredAt.getTime() !== reservation.updatedAt.getTime()) throw new InvalidCompensation();
      const [job] = await tx.select().from(reportQueueJobs).where(and(eq(reportQueueJobs.id, reservation.activeJobId!),
        eq(reportQueueJobs.status, "terminal_failure"))).limit(1);
      if (!job || !["report.generate.v1", "report.generate.v2"].includes(job.name) ||
          job.payload.reportVersionId !== reservation.reportVersionId || job.lastErrorCode !== reservation.lastErrorCode) throw new InvalidCompensation();
      const entitlements = await readLinkedReportEntitlements(tx, reservation);
      let count = 0;
      for (const entitlement of entitlements) {
        if (entitlement.orderId !== null) continue; // Bank refunds remain outside this closed wallet command.
        const proof = await readReportWalletSpendProof(tx, reservation, entitlement);
        if (!proof || !wallet || proof.wallet.id !== wallet.id) throw new InvalidCompensation();
        const [existing] = await tx.select().from(reportWalletCompensations)
          .where(eq(reportWalletCompensations.spendTransactionId, proof.spend.id)).limit(1);
        if (existing) {
          if (existing.ownerId !== entitlement.ownerId || existing.reservationId !== reservation.id ||
              existing.amountLa !== proof.intent.priceLa || existing.terminalStateVersion !== reservation.stateVersion ||
              existing.failureEventId !== event.id || !entitlement.revokedAt) throw new InvalidCompensation();
          if (proof.intent.priceLa > 0) {
            const restored = await readReportWalletRestorationProof(tx, proof);
            if (!restored || restored.restoration.id !== existing.restorationTransactionId) throw new InvalidCompensation();
          } else if (existing.restorationTransactionId !== null) throw new InvalidCompensation();
          continue;
        }
        await options.beforeRestore?.(count);
        let restorationId: string | null = null;
        if (proof.intent.priceLa > 0) {
          const [prior] = await tx.select().from(walletTransactions)
            .where(eq(walletTransactions.reversalOfTransactionId, proof.spend.id)).limit(1);
          if (!prior) {
            const [currentWallet] = await tx.select().from(walletAccounts).where(eq(walletAccounts.id, wallet.id)).limit(1);
            const result = await createDatabaseWalletRepository(tx, {now, trustedTerminalRestorationToken: authorityToken}).restore({
              ownerId: entitlement.ownerId, trustedAuthorityToken: authorityToken, originalSpendId: proof.spend.id,
              expectedWalletVersion: currentWallet!.stateVersion, idempotencyKey: `report-failure-restoration:${proof.spend.id}`,
              requestId: event.eventId, traceId: event.traceId,
            });
            if (!result.ok) throw new Error("REPORT_COMPENSATION_RETRY");
          }
          const restored = await readReportWalletRestorationProof(tx, proof);
          if (!restored) throw new InvalidCompensation();
          restorationId = restored.restoration.id;
        }
        await tx.update(commerceEntitlements).set({revokedAt: now(), revocationReason: "report_terminal_failure"})
          .where(and(eq(commerceEntitlements.ownerId, entitlement.ownerId), eq(commerceEntitlements.ledgerSpendId, proof.spend.id), isNull(commerceEntitlements.revokedAt)));
        await tx.insert(reportWalletCompensations).values({ownerId: entitlement.ownerId, reservationId: reservation.id,
          terminalStateVersion: reservation.stateVersion, failureEventId: event.id, spendTransactionId: proof.spend.id,
          restorationTransactionId: restorationId, amountLa: proof.intent.priceLa, recordedAt: now()});
        await tx.insert(auditLogs).values({actorId: null, action: "report.wallet.compensated", targetType: "report",
          targetId: reservation.reportId, reasonCode: "report_terminal_failure", requestId: event.eventId,
          metadata: {amountLa: proof.intent.priceLa, outcome: "completed", terminalStateVersion: reservation.stateVersion}});
        count++;
      }
      await options.afterRestore?.();
      await acknowledge();
      return count > 0;
    });
  }

  return {runOnce(): Promise<{compensated: number}> {
    if (active) return active;
    active = (async () => {
      let compensated = 0;
      for (let index = 0; index < (options.limit ?? 20); index++) {
        const lease = await claim(); if (!lease) break;
        try {if (await deliver(lease)) compensated++;} catch (error) {
          const invalid = error instanceof InvalidCompensation;
          await database.update(outbox).set({status: invalid ? "failed" : "pending", leasedBy: null, leasedUntil: null,
            availableAt: new Date(now().getTime() + 60_000), lastErrorCode: invalid ? "REPORT_COMPENSATION_INVALID" : "REPORT_COMPENSATION_RETRY",
            updatedAt: now()}).where(owned(lease));
        }
      }
      return {compensated};
    })().finally(() => {active = undefined;});
    return active;
  }};
}
