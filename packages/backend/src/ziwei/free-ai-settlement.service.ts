import { and, eq, isNull, lt, sql } from "drizzle-orm";
import { auditLogs, freeAiChartBudgets, freeAiDailyBudgets, freeAiRequests, freeAiSettlements, type Database } from "@lasoviet/database";
import { bigintSql, type FreeAiClock } from "./free-ai-budget.repository.js";
import { lockFreeAiCoordination, sampleFreeAiClock, type FreeAiTransaction } from "./free-ai-admission.service.js";

// What a fenced attempt cost. `failed` is a quality failure: the provider was still charged.
export type FreeAiAttemptSettlement =
  | Readonly<{ kind: "resolved"; actualMicroVnd: bigint; disposition: "publishable" | "failed" }>
  | Readonly<{ kind: "unknown" }>;

export type FreeAiSettlementResult =
  | Readonly<{ kind: "settled"; status: string; overshootMicroVnd: bigint }>
  | Readonly<{ kind: "duplicate"; outcome: "resolved" | "unknown" }>
  | Readonly<{ kind: "not_found" | "not_fenced" | "attempt_mismatch" }>;

export const FREE_AI_OVERSHOOT_ACTION = "free_ai.overshoot";
export const FREE_AI_OVERSHOOT_ACK_ACTION = "free_ai.overshoot.acknowledged";

// Settles on the PINNED dispatch day, whatever day it is now. Never caps an actual cost:
// an overshoot is recorded truthfully, halts free dispatch and leaves a redacted incident row.
export async function settleFencedAttempt(
  tx: FreeAiTransaction, now: Date, requestId: string, attemptId: string | null, settlement: FreeAiAttemptSettlement,
): Promise<FreeAiSettlementResult> {
  if (settlement.kind === "resolved" && settlement.actualMicroVnd < 0n) throw new Error("FREE_AI_SETTLEMENT_INVALID");
  const [request] = await tx.select().from(freeAiRequests).where(eq(freeAiRequests.id, requestId)).for("update");
  if (!request) return { kind: "not_found" };
  if (request.fencedAt === null || request.attemptId === null || request.dispatchDay === null) return { kind: "not_fenced" };
  if (attemptId !== null && attemptId !== request.attemptId) return { kind: "attempt_mismatch" };
  const [existing] = await tx.select({ outcome: freeAiSettlements.outcome }).from(freeAiSettlements)
    .where(eq(freeAiSettlements.requestId, requestId)).limit(1);
  if (existing) return { kind: "duplicate", outcome: existing.outcome as "resolved" | "unknown" };
  if (request.status !== "dispatching") return { kind: "not_fenced" };

  const bound = request.reservedMicroVnd;
  const resolved = settlement.kind === "resolved";
  const actual = resolved ? settlement.actualMicroVnd : null;
  const [inserted] = await tx.insert(freeAiSettlements).values({
    requestId, attemptId: request.attemptId, outcome: settlement.kind, actualMicroVnd: actual, settledAt: now,
  }).onConflictDoNothing().returning({ id: freeAiSettlements.id });
  if (!inserted) return { kind: "duplicate", outcome: settlement.kind };

  // Release the full hold; charge the true cost (resolved) or keep the whole bound as unknown exposure.
  const resolvedDelta = actual ?? 0n;
  const unknownDelta = resolved ? 0n : bound;
  await tx.update(freeAiChartBudgets).set({
    reservedMicroVnd: sql`${freeAiChartBudgets.reservedMicroVnd} - ${bigintSql(bound)}`,
    resolvedMicroVnd: sql`${freeAiChartBudgets.resolvedMicroVnd} + ${bigintSql(resolvedDelta)}`,
    unknownMicroVnd: sql`${freeAiChartBudgets.unknownMicroVnd} + ${bigintSql(unknownDelta)}`,
  }).where(eq(freeAiChartBudgets.chartVersionId, request.chartVersionId));
  await tx.update(freeAiDailyBudgets).set({
    reservedMicroVnd: sql`${freeAiDailyBudgets.reservedMicroVnd} - ${bigintSql(bound)}`,
    resolvedMicroVnd: sql`${freeAiDailyBudgets.resolvedMicroVnd} + ${bigintSql(resolvedDelta)}`,
    unknownMicroVnd: sql`${freeAiDailyBudgets.unknownMicroVnd} + ${bigintSql(unknownDelta)}`,
  }).where(eq(freeAiDailyBudgets.utcDay, request.dispatchDay));

  // `publishable` stays `dispatching`: only deletion-safe publication (B11) may mark it ready.
  const status = !resolved ? "cost_unknown" : settlement.disposition === "failed" ? "terminal_failure" : "dispatching";
  await tx.update(freeAiRequests).set({ status, settledAt: now }).where(eq(freeAiRequests.id, requestId));

  const overshoot = actual !== null && actual > bound ? actual - bound : 0n;
  if (overshoot > 0n) {
    await tx.insert(auditLogs).values({
      actorId: null, action: FREE_AI_OVERSHOOT_ACTION, targetType: "free_ai_request", targetId: requestId, reasonCode: "actual_cost_above_reserved_bound",
      metadata: { attemptId: request.attemptId, reservedMicroVnd: bound.toString(), actualMicroVnd: actual!.toString(), overshootMicroVnd: overshoot.toString(), dispatchDay: request.dispatchDay },
    });
  }
  return { kind: "settled", status, overshootMicroVnd: overshoot };
}

export function createFreeAiSettlementService(database: Database) {
  return {
    settle(input: { requestId: string; attemptId: string; settlement: FreeAiAttemptSettlement; clock?: FreeAiClock }) {
      return database.transaction(async (tx) => {
        await lockFreeAiCoordination(tx);
        const now = await (input.clock ?? sampleFreeAiClock)(tx);
        return settleFencedAttempt(tx, now, input.requestId, input.attemptId, input.settlement);
      });
    },
    // Self-recovery for a crash between fence and settlement: the call may or may not have
    // reached the provider, so the whole bound is retained as unknown exposure. Never a retry.
    settleAbandoned(input: { staleAfterMs: number; limit: number; clock?: FreeAiClock }) {
      return database.transaction(async (tx) => {
        await lockFreeAiCoordination(tx);
        const now = await (input.clock ?? sampleFreeAiClock)(tx);
        const stale = await tx.select({ id: freeAiRequests.id }).from(freeAiRequests).where(and(
          eq(freeAiRequests.status, "dispatching"), isNull(freeAiRequests.settledAt),
          lt(freeAiRequests.fencedAt, new Date(now.getTime() - input.staleAfterMs)),
        )).limit(input.limit);
        let settled = 0;
        for (const row of stale) {
          const result = await settleFencedAttempt(tx, now, row.id, null, { kind: "unknown" });
          if (result.kind === "settled") settled += 1;
        }
        return settled;
      });
    },
    // The only way to lift an overshoot halt: an explicit, attributed owner acknowledgement.
    acknowledgeOvershoot(input: { requestId: string; actorId: string }) {
      return database.transaction(async (tx) => {
        await lockFreeAiCoordination(tx);
        await tx.insert(auditLogs).values({
          actorId: input.actorId, action: FREE_AI_OVERSHOOT_ACK_ACTION, targetType: "free_ai_request", targetId: input.requestId,
        });
      });
    },
  };
}
