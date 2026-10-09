import { and, eq, lte, or, sql } from "drizzle-orm";
import { FreePalaceGiftOutboxPayloadV1Schema } from "@lasoviet/contracts";
import { outbox, type Database } from "@lasoviet/database";

// The paid outbox dispatcher claims only three report/PDF event types, so a gift event inserted
// into `outbox` is invisible to it by design. This store is the gift's own claim path; it reuses
// the same lease columns but never touches a paid event and grants no entitlement or wallet spend.
export const FREE_PALACE_GENERATION_REQUESTED_EVENT = "free_palace.generation.requested.v1";

export type ClaimedFreePalaceEvent = Readonly<{ id: string; eventId: string; traceId: string; requestId: string | null }>;

type FreeEventType = typeof FREE_PALACE_GENERATION_REQUESTED_EVENT | "free_reading.generation.requested.v2";
const claimable = (current: Date, eventType: FreeEventType) => and(
  eq(outbox.eventType, eventType),
  or(
    and(eq(outbox.status, "pending"), lte(outbox.availableAt, current)),
    and(eq(outbox.status, "leased"), lte(outbox.leasedUntil, current)),
  ),
);

export function createFreePalaceOutboxStore(database: Database, workerId: string, options: { now?: () => Date; leaseMs?: number; eventType?: FreeEventType } = {}) {
  const eventType = options.eventType ?? FREE_PALACE_GENERATION_REQUESTED_EVENT;
  if (eventType !== FREE_PALACE_GENERATION_REQUESTED_EVENT && eventType !== "free_reading.generation.requested.v2") throw new Error("FREE_AI_EVENT_TYPE_INVALID");
  const now = options.now ?? (() => new Date());
  const leaseMs = options.leaseMs ?? 300_000;
  const owned = (id: string) => and(eq(outbox.id, id), eq(outbox.status, "leased"), eq(outbox.leasedBy, workerId));
  return {
    async claim(): Promise<ClaimedFreePalaceEvent | null> {
      return database.transaction(async (tx) => {
        const current = now();
        const [candidate] = await tx.select({ id: outbox.id }).from(outbox).where(claimable(current, eventType)).limit(1).for("update", { skipLocked: true });
        if (!candidate) return null;
        const [claimed] = await tx.update(outbox).set({
          status: "leased", leasedBy: workerId, leasedUntil: new Date(current.getTime() + leaseMs),
          attemptCount: sql`${outbox.attemptCount} + 1`, updatedAt: current,
        }).where(and(eq(outbox.id, candidate.id), claimable(current, eventType))).returning();
        if (!claimed) return null;
        const payload = FreePalaceGiftOutboxPayloadV1Schema.safeParse(claimed.payload);
        return { id: claimed.id, eventId: claimed.eventId, traceId: claimed.traceId, requestId: payload.success ? payload.data.requestId : null };
      });
    },
    async markProcessed(id: string): Promise<void> {
      const current = now();
      await database.update(outbox).set({ status: "processed", processedAt: current, leasedBy: null, leasedUntil: null, updatedAt: current }).where(owned(id));
    },
    // A malformed event can never become valid, so it is parked as failed instead of looping.
    async fail(id: string, code: string): Promise<void> {
      const current = now();
      await database.update(outbox).set({ status: "failed", lastErrorCode: code, leasedBy: null, leasedUntil: null, updatedAt: current }).where(owned(id));
    },
    // Back to pending after a delay, so a switched-off flag or halted dispatch does not hot-loop.
    async defer(id: string, code: string, delayMs: number): Promise<void> {
      const current = now();
      await database.update(outbox).set({
        status: "pending", availableAt: new Date(current.getTime() + delayMs), leasedBy: null, leasedUntil: null, lastErrorCode: code, updatedAt: current,
      }).where(owned(id));
    },
  };
}
export type FreePalaceOutboxStore = ReturnType<typeof createFreePalaceOutboxStore>;
