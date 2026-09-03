export type ClaimedOutboxEvent = {
  id: string;
  eventType: string;
  payload: unknown;
};

export type OutboxDispatcherDependencies = {
  claim(): Promise<ClaimedOutboxEvent | null>;
  markProcessed(id: string): Promise<void>;
  release(id: string, code: string): Promise<void>;
  publish(type: "report.generate.v1", payload: {
    reportReservationId: string;
    reportVersionId: string;
  }): Promise<void>;
};

function reportJob(payload: unknown): {
  reportReservationId: string;
  reportVersionId: string;
} | null {
  if (typeof payload !== "object" || payload === null) return null;
  const value = payload as Record<string, unknown>;
  return typeof value.reportReservationId === "string" &&
    typeof value.reportVersionId === "string"
    ? {
        reportReservationId: value.reportReservationId,
        reportVersionId: value.reportVersionId,
      }
    : null;
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
        await dependencies.publish("report.generate.v1", payload);
        await dependencies.markProcessed(event.id);
        return { dispatched: true };
      } catch {
        await dependencies.release(event.id, "OUTBOX_PUBLISH_FAILED");
        return { dispatched: false };
      }
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
            and(eq(outbox.status, "pending"), lte(outbox.availableAt, current)),
            and(eq(outbox.status, "leased"), lte(outbox.leasedUntil, current)),
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
            and(eq(outbox.status, "pending"), lte(outbox.availableAt, current)),
            and(eq(outbox.status, "leased"), lte(outbox.leasedUntil, current)),
          ),
        )).returning();
        return claimed === undefined
          ? null
          : { id: claimed.id, eventType: claimed.eventType, payload: claimed.payload };
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
import { and, eq, lte, or, sql } from "drizzle-orm";
import { outbox, type Database } from "@lasoviet/database";
