import { and, eq, lte, or, sql } from "drizzle-orm";
import { outbox, reportQueueJobs, type Database } from "@lasoviet/database";

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
  publish(job: QueueJobV1): Promise<void>;
};

type ReportGenerationRequestedV1 = {
  reportId: string;
  reportVersionId: string;
  entitlementId: string;
  chartVersionId: string;
  evidenceVersionId: string;
  knowledgeVersionId: string;
  promptVersion: string;
  reportConfigVersion: string;
  locale: "vi" | "en";
  sku: string;
};

export type QueueJobV1 = {
  schemaVersion: 1;
  name: "report.generate.v1";
  sourceEventId: string;
  traceId: string;
  idempotencyKey: string;
  payload: ReportGenerationRequestedV1;
};

export type OutboxDispatchRunner = {
  runOnce(): Promise<{ dispatched: number }>;
};

function reportJob(payload: unknown): ReportGenerationRequestedV1 | null {
  if (typeof payload !== "object" || payload === null) return null;
  const value = payload as Record<string, unknown>;
  const keys = ["reportId", "reportVersionId", "entitlementId", "chartVersionId", "evidenceVersionId", "knowledgeVersionId", "promptVersion", "reportConfigVersion", "locale", "sku"];
  if (!keys.every((key) => typeof value[key] === "string") || (value.locale !== "vi" && value.locale !== "en")) return null;
  return value as unknown as ReportGenerationRequestedV1;
}

export function createOutboxDispatcher(dependencies: OutboxDispatcherDependencies) {
  return {
    async dispatchOne(): Promise<{ dispatched: boolean }> {
      const event = await dependencies.claim();
      if (event === null) return { dispatched: false };
      const payload = event.eventType === "report.generation.requested.v1"
        ? reportJob(event.payload)
        : null;
      if (payload === null) {
        await dependencies.release(event.id, "OUTBOX_EVENT_INVALID");
        return { dispatched: false };
      }
      try {
        await dependencies.publish({
          schemaVersion: 1,
          name: "report.generate.v1",
          sourceEventId: event.eventId,
          traceId: event.traceId,
          idempotencyKey: `report-generate:${payload.reportVersionId}`,
          payload,
        });
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
          .where(or(
            and(eq(outbox.eventType, "report.generation.requested.v1"), eq(outbox.status, "pending"), lte(outbox.availableAt, current)),
            and(eq(outbox.eventType, "report.generation.requested.v1"), eq(outbox.status, "leased"), lte(outbox.leasedUntil, current)),
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
          or(
            and(eq(outbox.eventType, "report.generation.requested.v1"), eq(outbox.status, "pending"), lte(outbox.availableAt, current)),
            and(eq(outbox.eventType, "report.generation.requested.v1"), eq(outbox.status, "leased"), lte(outbox.leasedUntil, current)),
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
    async publish(job: QueueJobV1): Promise<void> {
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
