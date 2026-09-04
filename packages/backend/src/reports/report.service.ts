import { and, eq, lte, or, sql } from "drizzle-orm";
import {
  enqueueOutbox,
  reportQueueJobs,
  reportReservations,
  type Database,
} from "@lasoviet/database";
import type {
  QueueJobV1,
  ReportFulfillmentFailedV1,
} from "@lasoviet/contracts";

import {
  transitionReportToGenerating,
  type ReportStateSnapshot,
} from "./report-state.js";

export type ReportJobQueueStore = {
  enqueue(job: QueueJobV1): Promise<void>;
  claimNext(now?: Date): Promise<typeof reportQueueJobs.$inferSelect | null>;
  recordRetryableFailure(id: string, code: string, nextAttemptAt: Date): Promise<void>;
  markProcessed(id: string): Promise<void>;
};

export function createDatabaseReportQueueStore(
  database: Database,
  workerId: string,
): ReportJobQueueStore {
  return {
    async enqueue(job: QueueJobV1): Promise<void> {
      await database
        .insert(reportQueueJobs)
        .values({
          id: job.idempotencyKey,
          name: job.name,
          sourceEventId: job.sourceEventId,
          traceId: job.traceId,
          idempotencyKey: job.idempotencyKey,
          payload: job.payload,
          status: "waiting",
          attemptCount: 0,
          availableAt: new Date(),
        })
        .onConflictDoNothing();
    },

    async claimNext(now: Date = new Date()): Promise<typeof reportQueueJobs.$inferSelect | null> {
      return database.transaction(async (tx) => {
        const [candidate] = await tx
          .select({ id: reportQueueJobs.id })
          .from(reportQueueJobs)
          .where(
            or(
              and(
                eq(reportQueueJobs.status, "waiting"),
                lte(reportQueueJobs.availableAt, now),
              ),
              and(
                eq(reportQueueJobs.status, "retryable_failure"),
                lte(reportQueueJobs.availableAt, now),
              ),
              and(
                eq(reportQueueJobs.status, "leased"),
                lte(reportQueueJobs.leasedUntil, now),
              ),
            ),
          )
          .limit(1);

        if (!candidate) return null;

        const leaseExpiry = new Date(now.getTime() + 60_000);
        const [claimed] = await tx
          .update(reportQueueJobs)
          .set({
            status: "leased",
            leasedBy: workerId,
            leasedUntil: leaseExpiry,
            attemptCount: sql`${reportQueueJobs.attemptCount} + 1`,
            updatedAt: now,
          })
          .where(
            and(
              eq(reportQueueJobs.id, candidate.id),
              or(
                and(
                  eq(reportQueueJobs.status, "waiting"),
                  lte(reportQueueJobs.availableAt, now),
                ),
                and(
                  eq(reportQueueJobs.status, "retryable_failure"),
                  lte(reportQueueJobs.availableAt, now),
                ),
                and(
                  eq(reportQueueJobs.status, "leased"),
                  lte(reportQueueJobs.leasedUntil, now),
                ),
              ),
            ),
          )
          .returning();

        return claimed ?? null;
      });
    },

    async recordRetryableFailure(
      id: string,
      code: string,
      nextAttemptAt: Date,
    ): Promise<void> {
      const current = new Date();
      await database
        .update(reportQueueJobs)
        .set({
          status: "retryable_failure",
          lastErrorCode: code,
          availableAt: nextAttemptAt,
          leasedBy: null,
          leasedUntil: null,
          updatedAt: current,
        })
        .where(eq(reportQueueJobs.id, id));
    },

    async markProcessed(id: string): Promise<void> {
      const current = new Date();
      await database
        .update(reportQueueJobs)
        .set({
          status: "processed",
          processedAt: current,
          leasedBy: null,
          leasedUntil: null,
          updatedAt: current,
        })
        .where(eq(reportQueueJobs.id, id));
    },
  };
}

export function createReportService(database: Database) {
  return {
    async startGenerating(params: {
      reportVersionId: string;
      jobId: string;
    }): Promise<
      | { ok: true; report: typeof reportReservations.$inferSelect }
      | { ok: false; code: "REPORT_NOT_FOUND" | "WORKFLOW_STATE_CONFLICT" }
    > {
      return database.transaction(async (tx) => {
        const [existing] = await tx
          .select()
          .from(reportReservations)
          .where(eq(reportReservations.reportVersionId, params.reportVersionId));

        if (!existing) {
          return { ok: false, code: "REPORT_NOT_FOUND" };
        }

        const snapshot: ReportStateSnapshot = {
          id: existing.id,
          status: existing.status as any,
          stateVersion: existing.stateVersion,
          attemptCount: existing.attemptCount,
          activeJobId: existing.activeJobId,
          lastErrorCode: existing.lastErrorCode,
        };

        const transition = transitionReportToGenerating(snapshot, params.jobId);
        if (!transition.ok) {
          return { ok: false, code: transition.code };
        }

        const current = new Date();
        const [updated] = await tx
          .update(reportReservations)
          .set({
            status: transition.value.status,
            stateVersion: transition.value.stateVersion,
            attemptCount: transition.value.attemptCount,
            activeJobId: transition.value.activeJobId,
            lastErrorCode: transition.value.lastErrorCode,
            updatedAt: current,
          })
          .where(
            and(
              eq(reportReservations.id, existing.id),
              eq(reportReservations.stateVersion, existing.stateVersion),
            ),
          )
          .returning();

        if (!updated) {
          return { ok: false, code: "WORKFLOW_STATE_CONFLICT" };
        }

        return { ok: true, report: updated };
      });
    },

    async recordTerminalFailure(params: {
      reportVersionId: string;
      jobId: string;
      errorCode: string;
      failureStage?: "generation" | "validation" | "pdf" | "garage";
    }): Promise<{ ok: boolean }> {
      return database.transaction(async (tx) => {
        const current = new Date();
        const [reservation] = await tx
          .select()
          .from(reportReservations)
          .where(eq(reportReservations.reportVersionId, params.reportVersionId));

        if (reservation) {
          await tx
            .update(reportReservations)
            .set({
              status: "terminal_failure",
              lastErrorCode: params.errorCode,
              updatedAt: current,
            })
            .where(eq(reportReservations.id, reservation.id));
        }

        await tx
          .update(reportQueueJobs)
          .set({
            status: "terminal_failure",
            lastErrorCode: params.errorCode,
            leasedBy: null,
            leasedUntil: null,
            updatedAt: current,
          })
          .where(eq(reportQueueJobs.id, params.jobId));

        const failedPayload: ReportFulfillmentFailedV1 = {
          reportId: reservation ? reservation.reportId : params.reportVersionId,
          reportVersionId: params.reportVersionId,
          failureStage: params.failureStage ?? "generation",
          errorCode: params.errorCode,
        };

        const eventId = `evt-failed-${params.reportVersionId}`;
        await enqueueOutbox(tx, {
          schemaVersion: 1,
          type: "report.fulfillment.failed.v1",
          eventId,
          occurredAt: current.toISOString(),
          traceId: `trace-failed-${params.reportVersionId}`,
          actorId: null,
          aggregateType: "report",
          aggregateId: params.reportVersionId,
          idempotencyKey: `report-failed:${params.reportVersionId}:${params.failureStage ?? "generation"}`,
          payload: failedPayload,
        });

        return { ok: true };
      });
    },
  };
}
