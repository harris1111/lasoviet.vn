import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { SINGLE_PALACE_SKUS } from "@lasoviet/contracts";
import { commerceEntitlements, enqueueOutbox, outbox, reportEntitlementLinks, reportReservations, reportVersions, type Database } from "@lasoviet/database";
import { createDatabaseReportQueryRepository } from "./report-query.repository.js";
import { deriveReportTimingLineage, type ReportVersionSelection } from "./identity-report-config.js";

export const NATAL_REPORT_SKUS = ["ZIWEI-IDENTITY-P0", "ZIWEI-NATAL-EXCERPT-P0", ...SINGLE_PALACE_SKUS];

/** Call inside the purchase transaction; the shared chart lock also serializes VND and wallet purchases. */
export async function reserveNatalReport(database: Database, input: {
  entitlement: typeof commerceEntitlements.$inferSelect;
  chartVersionId: string;
  evidenceVersionId: string;
  locale: "vi" | "en";
  versions: { family: ReportVersionSelection["family"]; knowledgeVersion: string; promptVersion: string; reportConfigVersion: string; timingRuleVersion?: string; sensitivityRuleVersion?: string };
  readingContextRevisionId: string | null;
  now: Date;
  traceId: string;
  aggregateType?: "order" | "report";
  aggregateId?: string;
}) {
  const { entitlement, now } = input;
  if (!NATAL_REPORT_SKUS.includes(entitlement.sku)) throw new Error("NATAL_REPORT_SKU_UNSUPPORTED");
  await database.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`commerce:chart:${entitlement.chartId}`}))`);
  const [existing] = await database.select({ reservation: reportReservations })
    .from(reportReservations)
    .innerJoin(commerceEntitlements, eq(commerceEntitlements.id, reportReservations.entitlementId))
    .where(and(
      eq(commerceEntitlements.ownerId, entitlement.ownerId),
      eq(commerceEntitlements.chartId, entitlement.chartId),
      eq(reportReservations.chartVersionId, input.chartVersionId),
      eq(reportReservations.locale, input.locale),
      eq(reportReservations.sku, commerceEntitlements.sku),
      inArray(reportReservations.sku, NATAL_REPORT_SKUS),
    ))
    .orderBy(sql`case when ${reportReservations.status} in ('html_ready', 'pdf_pending', 'complete') then 0 else 1 end`, asc(reportReservations.createdAt), asc(reportReservations.id)).limit(1);
  if (existing) {
    if (existing.reservation.status === "terminal_failure") throw new Error("NATAL_REPORT_RECOVERY_REQUIRED");
    const frozen = existing.reservation;
    const [readyVersion] = await database.select({ id: reportVersions.id }).from(reportVersions).where(and(
      eq(reportVersions.reportVersionId, frozen.reportVersionId), eq(reportVersions.reportId, frozen.reportId),
      eq(reportVersions.entitlementId, frozen.entitlementId), eq(reportVersions.chartVersionId, frozen.chartVersionId),
      eq(reportVersions.evidenceVersionId, frozen.evidenceVersionId), eq(reportVersions.knowledgeVersionId, frozen.knowledgeVersionId),
      eq(reportVersions.promptVersion, frozen.promptVersion), eq(reportVersions.reportConfigVersion, frozen.reportConfigVersion),
      eq(reportVersions.locale, frozen.locale), eq(reportVersions.sku, frozen.sku),
    )).limit(1);
    const hasReadyVersion = ["html_ready", "pdf_pending", "complete"].includes(frozen.status) && !!readyVersion;
    if (!hasReadyVersion) {
      // Pending generation requires an existing active purchase. Do not charge into an orphaned job.
      const authority = await createDatabaseReportQueryRepository(database, () => now)
        .readAuthorizedReport(entitlement.ownerId, frozen.reportId);
      if (!authority?.entitlements.some((item) => item.active)) {
        throw new Error("NATAL_REPORT_RECOVERY_REQUIRED");
      }
    }
    const [event] = await database.select().from(outbox)
      .where(eq(outbox.idempotencyKey, `report-request:${existing.reservation.reportVersionId}`)).limit(1);
    if (!event) throw new Error("NATAL_REPORT_SOURCE_EVENT_MISSING");
    await database.insert(reportEntitlementLinks).values({ entitlementId: entitlement.id, reservationId: existing.reservation.id, createdAt: now });
    return { reservation: existing.reservation, event };
  }
  return reserveDedicatedReport(database, input);
}

/** Topic and period purchases keep independent generation provenance. */
export async function reservePaidReport(database: Database, input: Parameters<typeof reserveNatalReport>[1]) {
  if (NATAL_REPORT_SKUS.includes(input.entitlement.sku)) return reserveNatalReport(database, input);
  if (!["ZIWEI-RELATIONSHIP-P0", "ZIWEI-CAREER-P0", "ZIWEI-MONTHLY-P0", "ZIWEI-YEAR-2026-P0"].includes(input.entitlement.sku)) throw new Error("REPORT_SKU_UNSUPPORTED");
  return reserveDedicatedReport(database, input);
}

async function reserveDedicatedReport(database: Database, input: Parameters<typeof reserveNatalReport>[1]) {
  const { entitlement, versions, now } = input;
  const timing = versions.family === "v4" || versions.family === "v4_1"
    ? deriveReportTimingLineage(now, { timingRuleVersion: versions.timingRuleVersion }) : null;
  const [reservation] = await database.insert(reportReservations).values({
    reportId: randomUUID(), reportVersionId: randomUUID(), entitlementId: entitlement.id,
    chartVersionId: input.chartVersionId, evidenceVersionId: input.evidenceVersionId,
    knowledgeVersionId: versions.knowledgeVersion, promptVersion: versions.promptVersion,
    reportConfigVersion: versions.reportConfigVersion, locale: input.locale, sku: entitlement.sku,
    asOfDate: timing?.asOfDate, targetYear: timing?.targetYear,
    timingRuleVersion: timing?.timingRuleVersion, sensitivityRuleVersion: timing?.sensitivityRuleVersion,
    readingContextRevisionId: input.readingContextRevisionId, createdAt: now, updatedAt: now,
  }).returning();
  if (!reservation) throw new Error("REPORT_RESERVATION_CREATE_FAILED");
  const event = await enqueueOutbox(database, {
    schemaVersion: 1, type: timing ? "report.generation.requested.v2" : "report.generation.requested.v1",
    eventId: randomUUID(), occurredAt: now.toISOString(), traceId: input.traceId, actorId: entitlement.ownerId,
    aggregateType: input.aggregateType ?? "report", aggregateId: input.aggregateId ?? reservation.reportId,
    idempotencyKey: `report-request:${reservation.reportVersionId}`,
    payload: {
      reportId: reservation.reportId, reportVersionId: reservation.reportVersionId, entitlementId: entitlement.id,
      chartVersionId: reservation.chartVersionId, evidenceVersionId: reservation.evidenceVersionId,
      knowledgeVersionId: reservation.knowledgeVersionId, promptVersion: reservation.promptVersion,
      reportConfigVersion: reservation.reportConfigVersion, locale: input.locale, sku: reservation.sku,
      ...(timing ? { ...timing, readingContextRevisionId: reservation.readingContextRevisionId } : {}),
    },
  });
  if (!event) throw new Error("REPORT_OUTBOX_CREATE_FAILED");
  return { reservation, event };
}
