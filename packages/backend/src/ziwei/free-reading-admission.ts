import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { auditLogs, type Database } from "@lasoviet/database";
import { FreePalaceGiftOutboxPayloadV1Schema, type FreeReadingFrozenCallV2 } from "@lasoviet/contracts";
import { createFreeAiBudgetRepository, FREE_AI_DAILY_CEILING_MICRO_VND,
  type FreePalaceReservationInput, type FreeAiDailyBudgetRefusal } from "./free-ai-budget.repository.js";
import { freeReadingLineage, validFreeReadingCall } from "./free-reading-lineage.js";
import { lockFreeAiCoordination } from "./free-ai-admission.service.js";

export const FREE_READING_GENERATION_REQUESTED_EVENT = "free_reading.generation.requested.v2";
export const FREE_AI_GROWTH_ALERT_ACTION = "free_ai.growth.ceiling_reached";
export async function recordFreeAiGrowthAlert(database: Database, refusal: FreeAiDailyBudgetRefusal) {
  // Pin the authoritative locked decision, even when the audit append crosses midnight.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(refusal.utcDay) || !/^\d+$/.test(refusal.exposureMicroVnd) ||
      !/^[1-9]\d*$/.test(refusal.requestedMicroVnd) ||
      BigInt(refusal.exposureMicroVnd) + BigInt(refusal.requestedMicroVnd) <= FREE_AI_DAILY_CEILING_MICRO_VND) {
    throw new Error("FREE_AI_GROWTH_ALERT_INVALID_REFUSAL");
  }
  return database.transaction(async tx => {
    await lockFreeAiCoordination(tx);
    const day = refusal.utcDay, targetId = `free-ai-daily:${day}`;
    const [existing] = await tx.select({id: auditLogs.id}).from(auditLogs).where(and(
      eq(auditLogs.action, FREE_AI_GROWTH_ALERT_ACTION), eq(auditLogs.targetId, targetId))).limit(1);
    if (existing) return;
    await tx.insert(auditLogs).values({actorId: null, action: FREE_AI_GROWTH_ALERT_ACTION,
      targetType: "free_ai_daily_budget", targetId, reasonCode: "daily_ceiling_refusal_observed",
      metadata: {utcDay: day, ceilingMicroVnd: FREE_AI_DAILY_CEILING_MICRO_VND.toString(),
        exposureMicroVnd: refusal.exposureMicroVnd, requestedMicroVnd: refusal.requestedMicroVnd}});
  });
}

// Private reviewed-provider proof only. This adds no bound provider, flag or public entry point.
export function createFreeReadingAdmission(database: Database) {
  const budget = createFreeAiBudgetRepository(database);
  return {
    async reserve(input: Omit<FreePalaceReservationInput, "lineage" | "wholeReadingCall" | "requestId"> & {call: FreeReadingFrozenCallV2}) {
      const call = validFreeReadingCall(input.call), cost = input.cost;
      if (!call || !FreePalaceGiftOutboxPayloadV1Schema.safeParse({requestId: call.requestId}).success ||
          !Number.isSafeInteger(cost.maxOutputTokens) || cost.maxOutputTokens <= 0 ||
          !Number.isSafeInteger(cost.maxInputTokens) || cost.maxInputTokens < 0 || cost.maxInputTokens > 16_000 ||
          !cost.semanticsVersion || cost.serializedRequestHash !== createHash("sha256").update(cost.finalSerializedRequest).digest("hex") ||
          cost.reservedMicroVnd !== BigInt(cost.maxInputTokens) * cost.inputPricePerMillion + BigInt(cost.maxOutputTokens) * cost.outputPricePerMillion) {
        return {kind: "refused" as const, reason: "invalid_reservation" as const};
      }
      const result = await budget.reserve({...input, requestId: call.requestId, wholeReadingCall: call, lineage: freeReadingLineage(call)});
      if (result.kind === "refused" && result.budgetRefusal) await recordFreeAiGrowthAlert(database, result.budgetRefusal);
      return result;
    },
  };
}
