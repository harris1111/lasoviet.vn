import { createHash } from "node:crypto";
import { and, eq, gt, lte, or, sql } from "drizzle-orm";
import {
  enqueueOutbox,
  OutboxError,
  reportQueueJobs,
  reportReservations,
  reportVersions,
  type Database,
} from "@lasoviet/database";
import type {
  QueueJobV1,
  ReportFulfillmentFailedV1,
  ReportGenerationRequestedV1,
} from "@lasoviet/contracts";

import {
  transitionReportToGenerating,
  type ReportStateSnapshot,
} from "./report-state.js";

export type ReportJobQueueStore = {
  enqueue(job: QueueJobV1): Promise<void>;
  claimNext(now?: Date): Promise<typeof reportQueueJobs.$inferSelect | null>;
  recordRetryableFailure(
    id: string,
    code: string,
    nextAttemptAt: Date,
    now?: Date,
  ): Promise<{ ok: true } | { ok: false; code: "LEASE_LOST" }>;
  markProcessed(id: string, now?: Date): Promise<{ ok: true } | { ok: false; code: "LEASE_LOST" }>;
  recordTerminalFailure(
    id: string,
    code: string,
    now?: Date,
  ): Promise<{ ok: true } | { ok: false; code: "LEASE_LOST" }>;
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
      now: Date = new Date(),
    ): Promise<{ ok: true } | { ok: false; code: "LEASE_LOST" }> {
      const [updated] = await database
        .update(reportQueueJobs)
        .set({
          status: "retryable_failure",
          lastErrorCode: code,
          availableAt: nextAttemptAt,
          leasedBy: null,
          leasedUntil: null,
          updatedAt: now,
        })
        .where(
          and(
            eq(reportQueueJobs.id, id),
            eq(reportQueueJobs.status, "leased"),
            eq(reportQueueJobs.leasedBy, workerId),
            gt(reportQueueJobs.leasedUntil, now),
          ),
        )
        .returning();

      if (!updated) return { ok: false, code: "LEASE_LOST" };
      return { ok: true };
    },

    async markProcessed(
      id: string,
      now: Date = new Date(),
    ): Promise<{ ok: true } | { ok: false; code: "LEASE_LOST" }> {
      const [updated] = await database
        .update(reportQueueJobs)
        .set({
          status: "processed",
          processedAt: now,
          leasedBy: null,
          leasedUntil: null,
          updatedAt: now,
        })
        .where(
          and(
            eq(reportQueueJobs.id, id),
            eq(reportQueueJobs.status, "leased"),
            eq(reportQueueJobs.leasedBy, workerId),
            gt(reportQueueJobs.leasedUntil, now),
          ),
        )
        .returning();

      if (!updated) return { ok: false, code: "LEASE_LOST" };
      return { ok: true };
    },

    async recordTerminalFailure(
      id: string,
      code: string,
      now: Date = new Date(),
    ): Promise<{ ok: true } | { ok: false; code: "LEASE_LOST" }> {
      const [updated] = await database
        .update(reportQueueJobs)
        .set({
          status: "terminal_failure",
          lastErrorCode: code,
          leasedBy: null,
          leasedUntil: null,
          updatedAt: now,
        })
        .where(
          and(
            eq(reportQueueJobs.id, id),
            eq(reportQueueJobs.status, "leased"),
            eq(reportQueueJobs.leasedBy, workerId),
            gt(reportQueueJobs.leasedUntil, now),
          ),
        )
        .returning();

      if (!updated) return { ok: false, code: "LEASE_LOST" };
      return { ok: true };
    },
  };
}

export function createReportService(database: Database) {
  return {
    async startGenerating(params: {
      reportVersionId: string;
      jobId: string;
      workerId?: string;
    }): Promise<
      | { ok: true; report: typeof reportReservations.$inferSelect }
      | { ok: false; code: "REPORT_NOT_FOUND" | "WORKFLOW_STATE_CONFLICT" | "LEASE_LOST" }
    > {
      return database.transaction(async (tx) => {
        const current = new Date();
        if (params.workerId) {
          const [job] = await tx
            .select({ id: reportQueueJobs.id })
            .from(reportQueueJobs)
            .where(
              and(
                eq(reportQueueJobs.id, params.jobId),
                eq(reportQueueJobs.status, "leased"),
                eq(reportQueueJobs.leasedBy, params.workerId),
                gt(reportQueueJobs.leasedUntil, current),
              ),
            )
            .limit(1)
            .for("update");
          if (!job) return { ok: false, code: "LEASE_LOST" };
        }

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
              eq(reportReservations.status, existing.status),
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
      workerId: string;
      errorCode: string;
      failureStage?: "generation" | "validation" | "pdf" | "garage";
      expectedStateVersion?: number;
    }): Promise<
      | { ok: true }
      | { ok: false; code: "LEASE_LOST" | "REPORT_NOT_FOUND" | "WORKFLOW_STATE_CONFLICT" }
    > {
      return database.transaction(async (tx) => {
        const current = new Date();

        const [fencedJob] = await tx
          .update(reportQueueJobs)
          .set({
            status: "terminal_failure",
            lastErrorCode: params.errorCode,
            leasedBy: null,
            leasedUntil: null,
            updatedAt: current,
          })
          .where(
            and(
              eq(reportQueueJobs.id, params.jobId),
              eq(reportQueueJobs.status, "leased"),
              eq(reportQueueJobs.leasedBy, params.workerId),
              gt(reportQueueJobs.leasedUntil, current),
            ),
          )
          .returning();

        if (!fencedJob) {
          return { ok: false, code: "LEASE_LOST" };
        }

        const [reservation] = await tx
          .select()
          .from(reportReservations)
          .where(eq(reportReservations.reportVersionId, params.reportVersionId));

        if (!reservation) {
          return { ok: false, code: "REPORT_NOT_FOUND" };
        }

        const statusMatch = and(
          eq(reportReservations.status, "generating"),
          eq(reportReservations.activeJobId, params.jobId),
        );

        const versionMatch = params.expectedStateVersion !== undefined
          ? eq(reportReservations.stateVersion, params.expectedStateVersion)
          : eq(reportReservations.stateVersion, reservation.stateVersion);

        const [updatedReservation] = await tx
          .update(reportReservations)
          .set({
            status: "terminal_failure",
            lastErrorCode: params.errorCode,
            stateVersion: reservation.stateVersion + 1,
            updatedAt: current,
          })
          .where(
            and(
              eq(reportReservations.id, reservation.id),
              statusMatch,
              versionMatch,
            ),
          )
          .returning();

        if (!updatedReservation) {
          return { ok: false, code: "WORKFLOW_STATE_CONFLICT" };
        }

        const failedPayload: ReportFulfillmentFailedV1 = {
          reportId: reservation.reportId,
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

    async recoverEvidenceInvalidGeneration(params: {
      reportVersionId: string;
      expectedStateVersion: number;
      recoveryId: string;
      now?: Date;
    }): Promise<
      | { ok: true; stateVersion: number }
      | {
          ok: false;
          code:
            | "REPORT_NOT_FOUND"
            | "WORKFLOW_STATE_CONFLICT"
            | "REPORT_VERSION_CONFLICT"
            | "RECOVERY_ID_INVALID";
        }
    > {
      const trimmedRecoveryId = params.recoveryId?.trim();
      if (!trimmedRecoveryId) {
        return { ok: false, code: "RECOVERY_ID_INVALID" };
      }

      return database.transaction(async (tx) => {
        const [reservation] = await tx
          .select()
          .from(reportReservations)
          .where(eq(reportReservations.reportVersionId, params.reportVersionId))
          .for("update");

        if (!reservation) {
          return { ok: false, code: "REPORT_NOT_FOUND" };
        }

        const [existingVersion] = await tx
          .select({ id: reportVersions.id })
          .from(reportVersions)
          .where(eq(reportVersions.reportVersionId, params.reportVersionId))
          .limit(1);

        if (existingVersion) {
          return { ok: false, code: "REPORT_VERSION_CONFLICT" };
        }

        if (
          reservation.status !== "terminal_failure" ||
          reservation.lastErrorCode !== "REPORT_EVIDENCE_INVALID" ||
          reservation.stateVersion !== params.expectedStateVersion
        ) {
          return { ok: false, code: "WORKFLOW_STATE_CONFLICT" };
        }

        const current = params.now ?? new Date();
        const nextStateVersion = reservation.stateVersion + 1;

        const [updatedReservation] = await tx
          .update(reportReservations)
          .set({
            status: "requested",
            stateVersion: nextStateVersion,
            activeJobId: null,
            lastErrorCode: null,
            nextAttemptAt: null,
            updatedAt: current,
          })
          .where(
            and(
              eq(reportReservations.id, reservation.id),
              eq(reportReservations.reportVersionId, params.reportVersionId),
              eq(reportReservations.status, "terminal_failure"),
              eq(reportReservations.lastErrorCode, "REPORT_EVIDENCE_INVALID"),
              eq(reportReservations.stateVersion, params.expectedStateVersion),
            ),
          )
          .returning();

        if (!updatedReservation) {
          return { ok: false, code: "WORKFLOW_STATE_CONFLICT" };
        }

        const payload: ReportGenerationRequestedV1 = {
          reportId: reservation.reportId,
          reportVersionId: reservation.reportVersionId,
          entitlementId: reservation.entitlementId,
          chartVersionId: reservation.chartVersionId,
          evidenceVersionId: reservation.evidenceVersionId,
          knowledgeVersionId: reservation.knowledgeVersionId,
          promptVersion: reservation.promptVersion,
          reportConfigVersion: reservation.reportConfigVersion,
          locale: reservation.locale as "vi" | "en",
          sku: reservation.sku,
        };

        const safeToken =
          trimmedRecoveryId.length <= 64 && /^[a-zA-Z0-9_-]+$/.test(trimmedRecoveryId)
            ? trimmedRecoveryId
            : createHash("sha256").update(trimmedRecoveryId).digest("hex");

        const eventId = `evt-recovery-${safeToken}`;
        const traceId = `trace-recovery-${safeToken}`;
        const idempotencyKey = `report-recovery:${safeToken}`;

        try {
          await enqueueOutbox(tx, {
            schemaVersion: 1,
            type: "report.generation.requested.v1",
            eventId,
            occurredAt: current.toISOString(),
            traceId,
            actorId: null,
            aggregateType: "report",
            aggregateId: reservation.reportVersionId,
            idempotencyKey,
            payload,
          });
        } catch (error) {
          if (
            error instanceof OutboxError ||
            (error &&
              typeof error === "object" &&
              "code" in error &&
              (error as { code: string }).code === "OUTBOX_DUPLICATE_KEY")
          ) {
            return { ok: false, code: "WORKFLOW_STATE_CONFLICT" };
          }
          throw error;
        }

        return { ok: true, stateVersion: nextStateVersion };
      });
    },
  };
}
