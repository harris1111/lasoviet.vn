import { and, desc, eq, isNull, lte, or, gt } from "drizzle-orm";
import { aiModelPricing, birthProfiles, ziweiChartVersions, ziweiCharts, type Database } from "@lasoviet/database";
import type { FreeAiTransaction } from "./free-ai-admission.service.js";
import type { createFreeAiDispatchService } from "./free-ai-dispatch.service.js";
import type { createFreePalaceArtifactRepository } from "./free-palace-artifact.repository.js";
import type { FreePalaceOutboxStore } from "./free-palace-outbox.js";
import type { createFreePalaceWriter } from "./free-palace-writer.js";

export type FreePalaceRunnerDependencies = Readonly<{
  store: FreePalaceOutboxStore;
  dispatch: ReturnType<typeof createFreeAiDispatchService>;
  writer: ReturnType<typeof createFreePalaceWriter>;
  artifacts: ReturnType<typeof createFreePalaceArtifactRepository>;
  // Read on every cycle: switching the flag off stops claiming at once, and a runner that is
  // never constructed (flag off at startup) cannot claim at all.
  flagEnabled: () => boolean;
  isSourceAvailable: (tx: FreeAiTransaction, now: Date, chartVersionId: string) => Promise<boolean>;
  activePricingSnapshotId: (tx: FreeAiTransaction, now: Date, provider: string, model: string) => Promise<string | null>;
  limit?: number;
  flagOffDelayMs?: number;
  haltedDelayMs?: number;
  errorDelayMs?: number;
}>;
export type FreePalaceRunner = { runOnce(): Promise<{ processed: number }> };

// claim -> fence (DB, once) -> one provider call -> settle -> deletion-safe publish. The process-local
// active promise is scheduling only; the database fence is the only protection against a second call.
export function createFreePalaceRunner(deps: FreePalaceRunnerDependencies): FreePalaceRunner {
  const limit = deps.limit ?? 5;
  async function processOne(): Promise<boolean> {
    if (!deps.flagEnabled()) return false;
    const event = await deps.store.claim();
    if (!event) return false;
    if (!event.requestId) { await deps.store.fail(event.id, "FREE_PALACE_EVENT_INVALID"); return true; }
    try {
      let publication: Awaited<ReturnType<typeof deps.writer.run>>["publication"];
      const result = await deps.dispatch.dispatch({
        requestId: event.requestId, flagEnabled: deps.flagEnabled(),
        isSourceAvailable: deps.isSourceAvailable, activePricingSnapshotId: deps.activePricingSnapshotId,
        send: async (call, attemptId) => {
          const outcome = await deps.writer.run(call, attemptId);
          publication = outcome.publication;
          return outcome.settlement;
        },
      });
      if (result.kind === "flag_disabled") { await deps.store.defer(event.id, "FREE_PALACE_FLAG_OFF", deps.flagOffDelayMs ?? 60_000); return true; }
      if (result.kind === "dispatch_halted") { await deps.store.defer(event.id, "FREE_PALACE_DISPATCH_HALTED", deps.haltedDelayMs ?? 300_000); return true; }
      if (result.kind === "fenced" && result.settlement?.kind === "settled" && publication) {
        await deps.artifacts.publish({ requestId: event.requestId, attemptId: result.attemptId, content: publication.content, facts: publication.facts });
      }
      // already_fenced / not_dispatchable / cancelled / not_found: nothing to send, ever again.
      await deps.store.markProcessed(event.id);
    } catch {
      await deps.store.defer(event.id, "FREE_PALACE_RUNNER_ERROR", deps.errorDelayMs ?? 60_000);
    }
    return true;
  }
  let active: Promise<{ processed: number }> | undefined;
  return {
    runOnce() {
      if (active) return active;
      active = (async () => {
        let processed = 0;
        for (let count = 0; count < limit; count += 1) {
          if (!(await processOne())) break;
          processed += 1;
        }
        return { processed };
      })().finally(() => { active = undefined; });
      return active;
    },
  };
}

// Source still exists and (for a guest) has not passed its 24h TTL. Evaluated inside the fence transaction.
export function createFreePalaceSourceCheck(): FreePalaceRunnerDependencies["isSourceAvailable"] {
  return async (tx, now, chartVersionId) => {
    const rows = await tx.select({ id: ziweiChartVersions.id }).from(ziweiChartVersions)
      .innerJoin(ziweiCharts, eq(ziweiCharts.id, ziweiChartVersions.chartId))
      .innerJoin(birthProfiles, eq(birthProfiles.id, ziweiCharts.profileId))
      .where(and(eq(ziweiChartVersions.id, chartVersionId), isNull(birthProfiles.deletedAt),
        or(isNull(birthProfiles.anonymousExpiresAt), gt(birthProfiles.anonymousExpiresAt, now)))).limit(1);
    return rows.length > 0;
  };
}

// The approved active tariff, resolved with the same rule as the paid cost service, plus the
// frozen snapshot's own prices for settlement.
export function createFreePalaceTariffPort(database: Database) {
  return {
    activePricingSnapshotId: (async (tx, now, provider, model) => {
      const [row] = await tx.select({ id: aiModelPricing.id }).from(aiModelPricing).where(and(
        eq(aiModelPricing.providerId, provider), eq(aiModelPricing.modelId, model), eq(aiModelPricing.status, "active"),
        eq(aiModelPricing.currency, "VND"), lte(aiModelPricing.effectiveFrom, now),
      )).orderBy(desc(aiModelPricing.effectiveFrom)).limit(1);
      return row?.id ?? null;
    }) as FreePalaceRunnerDependencies["activePricingSnapshotId"],
    async loadTariff(pricingSnapshotId: string) {
      const [row] = await database.select().from(aiModelPricing).where(eq(aiModelPricing.id, pricingSnapshotId)).limit(1);
      return row && row.currency === "VND" ? { inputPricePerMillion: row.inputPricePerMillion, outputPricePerMillion: row.outputPricePerMillion } : null;
    },
  };
}
