import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { FreePalaceGiftFrozenCallV1Schema, type FreePalaceGiftFrozenCallV1 } from "@lasoviet/contracts";
import { freeAiArtifacts, freeAiChartBudgets, freeAiDailyBudgets, freeAiRequests, type Database } from "@lasoviet/database";
import {
  FREE_AI_DAILY_CEILING_MICRO_VND, bigintSql, isFreeAiDispatchHalted, readDailyGateTotal, utcDay, type FreeAiClock, type FreeAiDailyBudgetRefusal,
} from "./free-ai-budget.repository.js";
import { lockFreeAiCoordination, sampleFreeAiClock, type FreeAiTransaction } from "./free-ai-admission.service.js";
import { validFreeReadingCall, freeReadingLineageHash } from "./free-reading-lineage.js";
import { buildFreeReadingPrompt } from "./free-reading-prompt.js";
import { settleFencedAttempt, type FreeAiAttemptSettlement, type FreeAiSettlementResult } from "./free-ai-settlement.service.js";

export type FreeAiCancelReason = "source_unavailable" | "deleted" | "pricing_changed" | "daily_budget_exhausted" | "frozen_call_invalid";

export type FreeAiFenceInput = Readonly<{
  requestId: string;
  flagEnabled: boolean;
  isSourceAvailable: (tx: FreeAiTransaction, now: Date, chartVersionId: string) => Promise<boolean>;
  // The currently approved active tariff snapshot for a provider/model, or null when none.
  activePricingSnapshotId: (tx: FreeAiTransaction, now: Date, provider: string, model: string) => Promise<string | null>;
  clock?: FreeAiClock;
}>;

export type FreeAiFenceResult =
  | Readonly<{ kind: "fenced"; attemptId: string; dispatchDay: string; reservedMicroVnd: bigint; call: FreePalaceGiftFrozenCallV1 }>
  | Readonly<{ kind: "already_fenced" | "not_dispatchable"; status: string }>
  | Readonly<{ kind: "cancelled"; reason: FreeAiCancelReason; budgetRefusal?: FreeAiDailyBudgetRefusal }>
  | Readonly<{ kind: "flag_disabled" | "dispatch_halted" | "not_found" }>;

type RequestRow = typeof freeAiRequests.$inferSelect;

// Releases a reservation that provably never crossed the fence (fenced_at is NULL). The slot
// and rolling-quota admission stay consumed: there is no re-admission or refund policy.
export async function cancelUnfencedRequest(tx: FreeAiTransaction, now: Date, request: RequestRow): Promise<void> {
  if (request.fencedAt !== null) throw new Error("FREE_AI_CANCEL_AFTER_FENCE");
  const bound = request.reservedMicroVnd;
  await tx.update(freeAiChartBudgets).set({ reservedMicroVnd: sql`${freeAiChartBudgets.reservedMicroVnd} - ${bigintSql(bound)}` })
    .where(eq(freeAiChartBudgets.chartVersionId, request.chartVersionId));
  await tx.update(freeAiDailyBudgets).set({ reservedMicroVnd: sql`${freeAiDailyBudgets.reservedMicroVnd} - ${bigintSql(bound)}` })
    .where(eq(freeAiDailyBudgets.utcDay, request.admissionDay));
  await tx.update(freeAiRequests).set({ status: "cancelled", settledAt: now }).where(eq(freeAiRequests.id, request.id));
}

// Closed private mode; the legacy worker continues to use the default parser/event.
export function createFreeAiDispatchService(database: Database, options: {mode?: "legacy_palace" | "whole_reading_v2"} = {}) {
  if (options.mode !== undefined && options.mode !== "legacy_palace" && options.mode !== "whole_reading_v2") throw new Error("FREE_AI_DISPATCH_MODE_INVALID");
  async function fenceLocked(tx: FreeAiTransaction, now: Date, input: FreeAiFenceInput): Promise<FreeAiFenceResult> {
    const [request] = await tx.select().from(freeAiRequests).where(eq(freeAiRequests.id, input.requestId)).for("update");
    if (!request) return { kind: "not_found" };
    // A fenced request is never re-claimed: lease expiry, restart, timeout and redelivery all land here.
    if (request.fencedAt !== null) return { kind: "already_fenced", status: request.status };
    if (request.status !== "reserved") return { kind: "not_dispatchable", status: request.status };
    // OFF and halted states prohibit fencing; the request stays reserved and holds its reservation.
    if (!input.flagEnabled) return { kind: "flag_disabled" };
    if (await isFreeAiDispatchHalted(tx)) return { kind: "dispatch_halted" };

    const cancel = async (reason: FreeAiCancelReason): Promise<FreeAiFenceResult> => {
      await cancelUnfencedRequest(tx, now, request);
      return { kind: "cancelled", reason };
    };
    const [chart] = await tx.select().from(freeAiChartBudgets).where(eq(freeAiChartBudgets.chartVersionId, request.chartVersionId)).for("update");
    const [artifact] = await tx.select().from(freeAiArtifacts).where(eq(freeAiArtifacts.requestId, request.id)).limit(1);
    if (!chart || chart.deletedAt || chart.deletionGeneration !== request.deletionGeneration || artifact?.deletionGeneration !== request.deletionGeneration) return cancel("deleted");
    if (artifact.expiresAt !== null && artifact.expiresAt <= now) return cancel("source_unavailable");
    let call: FreePalaceGiftFrozenCallV1;
    if (options.mode === "whole_reading_v2") {
      const whole = validFreeReadingCall(artifact.frozenCall);
      if (!whole || whole.requestId !== request.id || whole.chartVersionId !== request.chartVersionId ||
          whole.source.locale !== request.locale || whole.source.focusPalaceId !== request.palaceId ||
          whole.tariff.id !== request.pricingSnapshotId || freeReadingLineageHash(whole) !== request.lineageHash) return cancel("frozen_call_invalid");
      const versions = buildFreeReadingPrompt(whole.source).versions;
      // Transient private carrier keeps the existing financial fence unchanged. Never persist
      // or publish this carrier as a v1 artifact; the send callback unwraps the strict v2 call.
      call = FreePalaceGiftFrozenCallV1Schema.parse({version: 1, requestId: request.id,
        chartVersionId: request.chartVersionId, palaceId: whole.source.focusPalaceId, locale: whole.source.locale,
        provider: whole.tariff.providerId, model: whole.tariff.modelId, pricingSnapshotId: whole.tariff.id,
        promptVersion: versions.prompt, rulesVersion: versions.rules, knowledgeVersion: versions.cards,
        scorerVersion: versions.quality, schemaVersion: versions.schema, serializedPrompt: JSON.stringify(whole),
        maxOutputTokens: whole.maxOutputTokens, reservedMicroVnd: request.reservedMicroVnd.toString(),
        deletionGeneration: request.deletionGeneration});
    } else {
      const parsed = FreePalaceGiftFrozenCallV1Schema.safeParse(artifact?.frozenCall);
      if (!parsed.success) return cancel("frozen_call_invalid");
      call = parsed.data;
    }
    if (call.requestId !== request.id || call.pricingSnapshotId !== request.pricingSnapshotId || BigInt(call.reservedMicroVnd) !== request.reservedMicroVnd) return cancel("frozen_call_invalid");
    if (!(await input.isSourceAvailable(tx, now, request.chartVersionId))) return cancel("source_unavailable");
    // Never re-price after the fence: the reserved snapshot must still be the approved one.
    if ((await input.activePricingSnapshotId(tx, now, call.provider, call.model)) !== request.pricingSnapshotId) return cancel("pricing_changed");

    const bound = request.reservedMicroVnd;
    const dispatchDay = utcDay(now);
    if (dispatchDay !== request.admissionDay) {
      // The queue crossed midnight: move the hold to the day being dispatched, or cancel.
      await tx.update(freeAiDailyBudgets).set({ reservedMicroVnd: sql`${freeAiDailyBudgets.reservedMicroVnd} - ${bigintSql(bound)}` })
        .where(eq(freeAiDailyBudgets.utcDay, request.admissionDay));
      await tx.insert(freeAiDailyBudgets).values({ utcDay: dispatchDay }).onConflictDoNothing();
      await tx.select().from(freeAiDailyBudgets).where(eq(freeAiDailyBudgets.utcDay, dispatchDay)).for("update");
      const dailyExposure = await readDailyGateTotal(tx, dispatchDay);
      if (dailyExposure + bound > FREE_AI_DAILY_CEILING_MICRO_VND) {
        // Release the rest of the hold without double-releasing the day just decremented.
        await tx.update(freeAiChartBudgets).set({ reservedMicroVnd: sql`${freeAiChartBudgets.reservedMicroVnd} - ${bigintSql(bound)}` })
          .where(eq(freeAiChartBudgets.chartVersionId, request.chartVersionId));
        await tx.update(freeAiRequests).set({ status: "cancelled", settledAt: now }).where(eq(freeAiRequests.id, request.id));
        return { kind: "cancelled", reason: "daily_budget_exhausted", ...(options.mode === "whole_reading_v2" ? {budgetRefusal: {
          utcDay: dispatchDay, exposureMicroVnd: dailyExposure.toString(), requestedMicroVnd: bound.toString(),
        }} : {}) };
      }
      await tx.update(freeAiDailyBudgets).set({ reservedMicroVnd: sql`${freeAiDailyBudgets.reservedMicroVnd} + ${bigintSql(bound)}` })
        .where(eq(freeAiDailyBudgets.utcDay, dispatchDay));
    }
    const attemptId = randomUUID();
    const [fenced] = await tx.update(freeAiRequests).set({ status: "dispatching", fencedAt: now, attemptId, dispatchDay })
      .where(sql`${freeAiRequests.id} = ${request.id} AND ${freeAiRequests.status} = 'reserved' AND ${freeAiRequests.fencedAt} IS NULL`)
      .returning({ id: freeAiRequests.id });
    if (!fenced) return { kind: "already_fenced", status: request.status };
    return { kind: "fenced", attemptId, dispatchDay, reservedMicroVnd: bound, call };
  }

  const fence = (input: FreeAiFenceInput): Promise<FreeAiFenceResult> =>
    database.transaction(async (tx) => {
      await lockFreeAiCoordination(tx);
      // Sampled after the lock wait: the fence timestamp is the accounting boundary.
      const now = await (input.clock ?? sampleFreeAiClock)(tx);
      return fenceLocked(tx, now, input);
    });

  return {
    fence,
    // fence -> exactly one send -> settle. Any thrown error means delivery is ambiguous, so the
    // attempt settles as unknown (whole bound retained) and is never retried.
    async dispatch(input: FreeAiFenceInput & {
      send: (call: FreePalaceGiftFrozenCallV1, attemptId: string) => Promise<FreeAiAttemptSettlement>;
    }): Promise<FreeAiFenceResult & { settlement?: FreeAiSettlementResult }> {
      const fenced = await fence(input);
      if (fenced.kind !== "fenced") return fenced;
      let outcome: FreeAiAttemptSettlement;
      try {
        outcome = await input.send(fenced.call, fenced.attemptId);
      } catch {
        outcome = { kind: "unknown" };
      }
      const settlement = await database.transaction(async (tx) => {
        await lockFreeAiCoordination(tx);
        const now = await (input.clock ?? sampleFreeAiClock)(tx);
        return settleFencedAttempt(tx, now, input.requestId, fenced.attemptId, outcome);
      });
      return { ...fenced, settlement };
    },
  };
}
