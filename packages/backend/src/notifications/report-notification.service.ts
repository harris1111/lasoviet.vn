import { and, eq, inArray, notExists, sql } from "drizzle-orm";
import {
  authUsers, deletionRequests, lockFreeAiCoordination, lockRecoveryCaptureCoordination,
  notificationDeliveries, outbox, reportNotificationSubscriptions, type Database,
} from "@lasoviet/database";
import {
  ReportNotificationCommandV1Schema, ReportNotificationViewV1Schema,
  type CurrentActor, type ReportNotificationCommandV1, type ReportNotificationViewV1,
} from "@lasoviet/contracts";
import { createDatabaseReportQueryRepository } from "../reports/report-query.repository.js";
import { createReportQueryService, ReportQueryDataError } from "../reports/report-query.service.js";

export const REPORT_NOTIFICATION_CAPTURE_EVENT = "notification.report-ready.subscription.captured.v1";
export type ReportNotificationMode = "disabled" | "capture";
export function resolveReportNotificationMode(value: string | undefined): ReportNotificationMode {
  return value === "capture" ? "capture" : "disabled";
}
export class ReportNotificationError extends Error {
  constructor(readonly code: "REPORT_NOTICE_DISABLED" | "REPORT_NOT_FOUND" | "REPORT_NOT_PENDING" | "REPORT_NOTICE_VERSION_CONFLICT") { super(code); }
}

/** Capture-only subscription state. There is no SMTP dependency or delivery path. */
export function createReportNotificationService(database: Database, options: {
  mode?: ReportNotificationMode; now?: () => Date;
} = {}) {
  const clock = options.now ?? (() => new Date());
  const enabled = () => { if (options.mode !== "capture") throw new ReportNotificationError("REPORT_NOTICE_DISABLED"); };
  type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
  async function authority(tx: Transaction, actor: CurrentActor, reportId: string) {
    if (actor.kind !== "account" || !/^[0-9a-f-]{36}$/i.test(reportId)) throw new ReportNotificationError("REPORT_NOT_FOUND");
    const [user] = await tx.select({id: authUsers.id}).from(authUsers).where(and(
      eq(authUsers.id, actor.userId), eq(authUsers.emailVerified, true), eq(authUsers.isAnonymous, false),
      notExists(tx.select({id: deletionRequests.id}).from(deletionRequests).where(and(
        eq(deletionRequests.userId, actor.userId), inArray(deletionRequests.status, ["requested", "purged"]),
      ))),
    )).limit(1);
    if (!user) throw new ReportNotificationError("REPORT_NOT_FOUND");
    const repository = createDatabaseReportQueryRepository(tx as unknown as Database, clock);
    const record = await repository.readAuthorizedReport(actor.userId, reportId);
    if (!record) throw new ReportNotificationError("REPORT_NOT_FOUND");
    const result = await createReportQueryService({repository, now: clock}).getReport(actor, reportId);
    if (!result.ok) throw new ReportNotificationError("REPORT_NOT_FOUND");
    return {record, view: result.value};
  }
  function projection(reportId: string, reportVersionId: string, locale: string,
    row?: typeof reportNotificationSubscriptions.$inferSelect): ReportNotificationViewV1 {
    return ReportNotificationViewV1Schema.parse({version: 1, reportId, reportVersionId, locale,
      state: row?.status ?? "not_registered", stateVersion: row?.stateVersion ?? 0});
  }
  async function current(tx: Transaction, ownerId: string, reportVersionId: string) {
    return (await tx.select().from(reportNotificationSubscriptions).where(and(
      eq(reportNotificationSubscriptions.ownerId, ownerId), eq(reportNotificationSubscriptions.reportVersionId, reportVersionId),
    )).limit(1))[0];
  }
  return {
    async read(actor: CurrentActor, reportId: string): Promise<ReportNotificationViewV1> {
      enabled();
      if (actor.kind !== "account") throw new ReportNotificationError("REPORT_NOT_FOUND");
      return database.transaction(async tx => {
        await lockRecoveryCaptureCoordination(tx);
        const {record} = await authority(tx, actor, reportId);
        const row = await current(tx, actor.userId, record.reservation.reportVersionId);
        return projection(reportId, record.reservation.reportVersionId, record.reservation.locale, row);
      });
    },
    async command(actor: CurrentActor, reportId: string, input: ReportNotificationCommandV1): Promise<ReportNotificationViewV1> {
      enabled();
      if (actor.kind !== "account") throw new ReportNotificationError("REPORT_NOT_FOUND");
      const command = ReportNotificationCommandV1Schema.parse(input);
      return database.transaction(async tx => {
        await lockRecoveryCaptureCoordination(tx);
        const {record, view} = await authority(tx, actor, reportId);
        const reservation = record.reservation;
        if (command.reportVersionId !== reservation.reportVersionId) throw new ReportNotificationError("REPORT_NOTICE_VERSION_CONFLICT");
        const row = await current(tx, actor.userId, reservation.reportVersionId);
        if (row && (row.reportId !== reportId || row.reservationId !== reservation.id || row.locale !== reservation.locale)) {
          throw new ReportNotificationError("REPORT_NOTICE_VERSION_CONFLICT");
        }
        if (command.action === "subscribe" && view.state !== "pending") throw new ReportNotificationError("REPORT_NOT_PENDING");
        // Terminal captures and automatic notices cannot be undone by canceling an additional request.
        if (row && ["captured", "already_notified", "suppressed"].includes(row.status)) return projection(reportId, reservation.reportVersionId, reservation.locale, row);
        const status = command.action === "subscribe" ? "subscribed" : "cancelled";
        if (row?.status === status || (!row && status === "cancelled")) return projection(reportId, reservation.reportVersionId, reservation.locale, row);
        const now = clock();
        const [saved] = row
          ? await tx.update(reportNotificationSubscriptions).set({status, stateVersion: row.stateVersion + 1, updatedAt: now})
            .where(eq(reportNotificationSubscriptions.id, row.id)).returning()
          : await tx.insert(reportNotificationSubscriptions).values({ownerId: actor.userId, reservationId: reservation.id,
            reportId, reportVersionId: reservation.reportVersionId, locale: reservation.locale, status, createdAt: now, updatedAt: now}).returning();
        return projection(reportId, reservation.reportVersionId, reservation.locale, saved);
      });
    },
    async captureReady(limit = 25): Promise<{captured: number; suppressed: number}> {
      if (options.mode !== "capture") return {captured: 0, suppressed: 0};
      const candidates = await database.select().from(reportNotificationSubscriptions)
        .where(eq(reportNotificationSubscriptions.status, "subscribed")).orderBy(reportNotificationSubscriptions.captureCheckCount, reportNotificationSubscriptions.createdAt, reportNotificationSubscriptions.id).limit(Math.max(1, Math.min(100, limit)));
      const totals = {captured: 0, suppressed: 0};
      for (const candidate of candidates) {
        const outcome = await database.transaction(async tx => {
          await lockFreeAiCoordination(tx);
          await lockRecoveryCaptureCoordination(tx);
          const row = await current(tx, candidate.ownerId, candidate.reportVersionId);
          if (!row || row.status !== "subscribed") return "unchanged";
          let status: "captured" | "already_notified" | "suppressed";
          try {
            const actor: CurrentActor = {kind: "account", userId: row.ownerId, sessionId: "report-notice-capture", requestId: `report-notice-${row.id}`};
            const {record, view} = await authority(tx, actor, row.reportId);
            if (record.reservation.id !== row.reservationId || record.reservation.reportVersionId !== row.reportVersionId || record.reservation.locale !== row.locale) status = "suppressed";
            else if (view.state === "pending") {
              // Rotate pending rows behind less-checked rows without changing their public state.
              await tx.update(reportNotificationSubscriptions).set({
                captureCheckCount: sql`${reportNotificationSubscriptions.captureCheckCount} + 1`,
              }).where(eq(reportNotificationSubscriptions.id, row.id));
              return "unchanged";
            }
            else if (view.state !== "ready") status = "suppressed";
            else {
              const automaticDedupKey = `report-ready-email:${row.reportVersionId}:${row.ownerId}`;
              const [automatic] = await tx.select({id: notificationDeliveries.id}).from(notificationDeliveries).where(and(
                eq(notificationDeliveries.idempotencyKey, automaticDedupKey), eq(notificationDeliveries.kind, "report_ready"),
              )).limit(1);
              status = automatic ? "already_notified" : "captured";
              if (!automatic) {
                const key = `report-notice-capture:${row.id}`;
                await tx.insert(outbox).values({schemaVersion: 1, eventType: REPORT_NOTIFICATION_CAPTURE_EVENT, eventId: key,
                  idempotencyKey: key, actorId: row.ownerId, aggregateType: "account", aggregateId: row.ownerId,
                  traceId: key, occurredAt: clock(), availableAt: clock(), status: "processed", processedAt: clock(),
                  payload: {version: 1, subscriptionId: row.id, reportId: row.reportId, reportVersionId: row.reportVersionId,
                    locale: row.locale, automaticDedupKey, actionUrl: `https://lasoviet.net${row.locale === "en" ? "/en" : ""}/bao-cao/${row.reportId}`,
                    captureOnly: true, sent: false}}).onConflictDoNothing();
              }
            }
          } catch (error) {
            if (!(error instanceof ReportNotificationError) && !(error instanceof ReportQueryDataError)) throw error;
            status = "suppressed";
          }
          await tx.update(reportNotificationSubscriptions).set({status, stateVersion: sql`${reportNotificationSubscriptions.stateVersion} + 1`, updatedAt: clock()})
            .where(and(eq(reportNotificationSubscriptions.id, row.id), eq(reportNotificationSubscriptions.status, "subscribed")));
          return status;
        });
        if (outcome === "captured") totals.captured += 1;
        if (outcome === "suppressed" || outcome === "already_notified") totals.suppressed += 1;
      }
      return totals;
    },
  };
}
