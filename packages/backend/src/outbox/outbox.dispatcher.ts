import { and, eq, lte, or, sql } from "drizzle-orm";
import {
  ReportGenerationRequestedV1Schema,
  ReportGenerationRequestedV2Schema,
  type QueueJob,
  type QueueJobV1,
  type ReportGenerationRequestedV1,
  type ReportGenerationRequestedV2,
} from "@lasoviet/contracts";
import { outbox, reportQueueJobs, type Database } from "@lasoviet/database";

export type { QueueJob, QueueJobV1, ReportGenerationRequestedV1, ReportGenerationRequestedV2 };

export type ClaimedOutboxEvent = {
  id: string;
  eventId: string;
  traceId: string;
  idempotencyKey: string;
  eventType: string;
  payload: unknown;
};

export type OutboxDispatcherDependencies = {
  claim(): Promise<ClaimedOutboxEvent | null>;
  markProcessed(id: string): Promise<void>;
  release(id: string, code: string): Promise<void>;
  publish(job: QueueJob): Promise<void>;
};

export type OutboxDispatchRunner = {
  runOnce(): Promise<{ dispatched: number }>;
};

export function createOutboxDispatcher(dependencies: OutboxDispatcherDependencies) {
  return {
    async dispatchOne(): Promise<{ dispatched: boolean }> {
      const event = await dependencies.claim();
      if (event === null) return { dispatched: false };

      let job: QueueJob | null = null;
      if (event.eventType === "report.generation.requested.v1") {
        const parseResult = ReportGenerationRequestedV1Schema.safeParse(event.payload);
        if (parseResult.success) {
          const payload = parseResult.data;
          const queueJobIdempotencyKey = event.idempotencyKey.startsWith("report-recovery:")
            ? `report-generate:${event.eventId}`
            : `report-generate:${payload.reportVersionId}`;
          job = {
            schemaVersion: 1,
            name: "report.generate.v1",
            sourceEventId: event.eventId,
            traceId: event.traceId,
            idempotencyKey: queueJobIdempotencyKey,
            payload,
          };
        }
      } else if (event.eventType === "report.generation.requested.v2") {
        const parseResult = ReportGenerationRequestedV2Schema.safeParse(event.payload);
        if (parseResult.success) {
          const payload = parseResult.data;
          const queueJobIdempotencyKey = event.idempotencyKey.startsWith("report-recovery:")
            ? `report-generate:${event.eventId}`
            : `report-generate:${payload.reportVersionId}`;
          job = {
            schemaVersion: 2,
            name: "report.generate.v2",
            sourceEventId: event.eventId,
            traceId: event.traceId,
            idempotencyKey: queueJobIdempotencyKey,
            payload,
          };
        }
      }

      if (job === null) {
        await dependencies.release(event.id, "OUTBOX_EVENT_INVALID");
        return { dispatched: false };
      }

      try {
        await dependencies.publish(job);
        await dependencies.markProcessed(event.id);
        return { dispatched: true };
      } catch {
        await dependencies.release(event.id, "OUTBOX_PUBLISH_FAILED");
        return { dispatched: false };
      }
    },
  };
}

export function createOutboxDispatchRunner(
  dispatcher: ReturnType<typeof createOutboxDispatcher>,
  limit = 20,
): OutboxDispatchRunner {
  let activeRun: Promise<{ dispatched: number }> | undefined;
  return {
    runOnce() {
      if (activeRun !== undefined) return activeRun;
      activeRun = (async () => {
        let dispatched = 0;
        for (let count = 0; count < limit; count += 1) {
          if (!(await dispatcher.dispatchOne()).dispatched) break;
          dispatched += 1;
        }
        return { dispatched };
      })().finally(() => {
        activeRun = undefined;
      });
      return activeRun;
    },
  };
}

export function createOutboxDispatchSchedule(options: {
  runOnce(): Promise<unknown>;
  reportError(error: unknown): void;
}) {
  let activeRun: Promise<void> | undefined;
  return {
    run(): Promise<void> {
      if (activeRun !== undefined) return activeRun;
      let run: Promise<unknown>;
      try {
        run = options.runOnce();
      } catch (error) {
        run = Promise.reject(error);
      }
      const scheduled = run
        .then(() => undefined)
        .catch((error: unknown) => {
          options.reportError(error);
          return undefined;
        })
        .finally(() => {
          activeRun = undefined;
        });
      activeRun = scheduled;
      return scheduled;
    },
  };
}

const reportGenerationEventTypeCondition = or(
  eq(outbox.eventType, "report.generation.requested.v1"),
  eq(outbox.eventType, "report.generation.requested.v2"),
);

export function createDatabaseOutboxStore(
  database: Database,
  workerId: string,
  now: () => Date = () => new Date(),
) {
  return {
    async claim(): Promise<ClaimedOutboxEvent | null> {
      return database.transaction(async (transaction) => {
        const current = now();
        const [candidate] = await transaction.select({ id: outbox.id })
          .from(outbox)
          .where(and(
            reportGenerationEventTypeCondition,
            or(
              and(eq(outbox.status, "pending"), lte(outbox.availableAt, current)),
              and(eq(outbox.status, "leased"), lte(outbox.leasedUntil, current)),
            ),
          ))
          .limit(1);
        if (candidate === undefined) return null;
        const [claimed] = await transaction.update(outbox).set({
          status: "leased",
          leasedBy: workerId,
          leasedUntil: new Date(current.getTime() + 60_000),
          attemptCount: sql`${outbox.attemptCount} + 1`,
          updatedAt: current,
        }).where(and(
          eq(outbox.id, candidate.id),
          reportGenerationEventTypeCondition,
          or(
            and(eq(outbox.status, "pending"), lte(outbox.availableAt, current)),
            and(eq(outbox.status, "leased"), lte(outbox.leasedUntil, current)),
          ),
        )).returning();
        return claimed === undefined
          ? null
          : { id: claimed.id, eventId: claimed.eventId, traceId: claimed.traceId, idempotencyKey: claimed.idempotencyKey, eventType: claimed.eventType, payload: claimed.payload };
      });
    },
    async markProcessed(id: string): Promise<void> {
      const current = now();
      await database.update(outbox).set({
        status: "processed", processedAt: current, leasedBy: null, leasedUntil: null, updatedAt: current,
      }).where(and(eq(outbox.id, id), eq(outbox.status, "leased"), eq(outbox.leasedBy, workerId)));
    },
    async release(id: string, code: string): Promise<void> {
      const current = now();
      await database.update(outbox).set({
        status: "pending", availableAt: current, leasedBy: null, leasedUntil: null, lastErrorCode: code, updatedAt: current,
      }).where(and(eq(outbox.id, id), eq(outbox.status, "leased"), eq(outbox.leasedBy, workerId)));
    },
  };
}

export function createDatabaseReportQueuePublisher(database: Database) {
  return {
    async publish(job: QueueJob): Promise<void> {
      await database.insert(reportQueueJobs).values({
        id: job.idempotencyKey,
        name: job.name,
        sourceEventId: job.sourceEventId,
        traceId: job.traceId,
        idempotencyKey: job.idempotencyKey,
        payload: job.payload,
      }).onConflictDoNothing();
    },
  };
}
