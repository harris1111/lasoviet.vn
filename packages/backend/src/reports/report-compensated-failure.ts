import {and, eq} from "drizzle-orm";
import {ReportFailedWalletSpendViewV2Schema} from "@lasoviet/contracts";
import {deletionRequests, reportReservations, reportWalletCompensations, type Database} from "@lasoviet/database";
import {readLinkedReportEntitlements} from "./report-wallet-compensation.js";
import {readReportWalletRestorationProof, readReportWalletSpendProof} from "./report-wallet-proof.js";

/** Historical financial status grants no active entitlement or paid prose. */
export async function readCompensatedReportFailure(database: Database, ownerId: string, reportId: string) {
  const [purged] = await database.select({id: deletionRequests.id}).from(deletionRequests)
    .where(and(eq(deletionRequests.userId, ownerId), eq(deletionRequests.status, "purged"))).limit(1);
  if (purged) return null;
  const [reservation] = await database.select().from(reportReservations)
    .where(and(eq(reportReservations.reportId, reportId), eq(reportReservations.status, "terminal_failure"))).limit(1);
  if (!reservation) return null;
  const markers = await database.select().from(reportWalletCompensations)
    .where(and(eq(reportWalletCompensations.reservationId, reservation.id), eq(reportWalletCompensations.ownerId, ownerId)));
  if (!markers.length) return null;
  const entitlements = await readLinkedReportEntitlements(database, reservation);
  if (entitlements.some(item => item.ownerId !== ownerId)) return null;
  const walletEntitlements = entitlements.filter(item => item.ledgerSpendId !== null);
  if (markers.length !== walletEntitlements.length) return null;
  let amountLa = 0;
  let completedAt = markers[0]!.recordedAt;
  for (const entitlement of walletEntitlements) {
    const marker = markers.find(item => item.spendTransactionId === entitlement.ledgerSpendId);
    const proof = await readReportWalletSpendProof(database, reservation, entitlement);
    if (!marker || !proof || !entitlement.revokedAt || marker.terminalStateVersion !== reservation.stateVersion ||
        marker.amountLa !== proof.intent.priceLa) return null;
    if (proof.intent.priceLa > 0) {
      const restoration = await readReportWalletRestorationProof(database, proof);
      if (!restoration || restoration.restoration.id !== marker.restorationTransactionId) return null;
    } else if (marker.restorationTransactionId !== null) return null;
    amountLa += marker.amountLa;
    if (marker.recordedAt > completedAt) completedAt = marker.recordedAt;
  }
  return ReportFailedWalletSpendViewV2Schema.parse({version: 2, purchaseSource: "wallet_spend", state: "failed",
    locale: reservation.locale, reportId: reservation.reportId, reportVersionId: reservation.reportVersionId,
    errorCode: "REPORT_GENERATION_FAILED", supportReference: `RPT-${reportId.replace(/-/g, "").slice(0, 12).toUpperCase()}`,
    compensation: {status: amountLa > 0 ? "restored" : "access_revoked", amountLa, completedAt: completedAt.toISOString()},
  });
}
