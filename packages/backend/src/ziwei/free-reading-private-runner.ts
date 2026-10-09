import type { Database } from "@lasoviet/database";
import { createFreeAiDispatchService, type FreeAiFenceInput } from "./free-ai-dispatch.service.js";
import { createFreePalaceOutboxStore } from "./free-palace-outbox.js";
import { createFreeReadingPrivateCache } from "./free-reading-private-cache.js";
import { validFreeReadingCall } from "./free-reading-lineage.js";
import { FREE_READING_GENERATION_REQUESTED_EVENT, recordFreeAiGrowthAlert } from "./free-reading-admission.js";
import type { createFreeReadingWriter } from "./free-reading-writer.js";

// Private preparation only; production does not construct this runner. Drafts are not approved
// or returned through a public endpoint. DB fencing survives processes, restarts and redelivery.
export function createFreeReadingPrivateRunner(deps: {database: Database; workerId: string;
  writer: ReturnType<typeof createFreeReadingWriter>; flagEnabled: () => boolean;
  isSourceAvailable: FreeAiFenceInput["isSourceAvailable"];
  activePricingSnapshotId: FreeAiFenceInput["activePricingSnapshotId"];
  now?: () => Date; limit?: number}) {
  const store = createFreePalaceOutboxStore(deps.database, deps.workerId, {now: deps.now, eventType: FREE_READING_GENERATION_REQUESTED_EVENT});
  const dispatch = createFreeAiDispatchService(deps.database, {mode: "whole_reading_v2"});
  const cache = createFreeReadingPrivateCache(deps.database);
  let active: Promise<{processed: number}> | null = null;
  return {runOnce() {
    if (active) return active;
    active = (async () => {
      let processed = 0;
      for (let i = 0; i < (deps.limit ?? 5) && deps.flagEnabled(); i++) {
        const event = await store.claim(); if (!event) break;
        processed++;
        if (!event.requestId) {await store.fail(event.id, "FREE_READING_EVENT_INVALID"); continue;}
        try {
          let candidate: Awaited<ReturnType<typeof deps.writer.run>>["candidate"];
          const result = await dispatch.dispatch({requestId: event.requestId, flagEnabled: deps.flagEnabled(),
            isSourceAvailable: deps.isSourceAvailable, activePricingSnapshotId: deps.activePricingSnapshotId,
            clock: deps.now ? async () => deps.now!() : undefined,
            send: async carrier => {
              const call = validFreeReadingCall(JSON.parse(carrier.serializedPrompt));
              if (!call) return {kind: "resolved", actualMicroVnd: 0n, disposition: "failed"};
              const outcome = await deps.writer.run(call); candidate = outcome.candidate; return outcome.settlement;
            }});
          if (result.kind === "flag_disabled" || result.kind === "dispatch_halted") {
            await store.defer(event.id, "FREE_READING_DISPATCH_PAUSED", 60_000); continue;
          }
          if (result.kind === "cancelled" && result.budgetRefusal) await recordFreeAiGrowthAlert(deps.database, result.budgetRefusal);
          if (result.kind === "fenced" && result.settlement?.kind === "settled" && candidate) {
            await cache.saveDraft({requestId: event.requestId, attemptId: result.attemptId, candidate,
              clock: deps.now ? async () => deps.now!() : undefined});
          }
          await store.markProcessed(event.id);
        } catch {await store.defer(event.id, "FREE_READING_PRIVATE_RUNNER_ERROR", 60_000);}
      }
      return {processed};
    })().finally(() => {active = null;});
    return active;
  }};
}
