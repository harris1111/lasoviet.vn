import {
  createFreePalaceReadService,
  createFreePalaceRequestService,
  createFreePalaceTariffPort,
  createDatabaseZiweiQueryRepository,
  currentFreePalaceLineageHash,
  resolveOpenAiCompatibleProviderId,
} from "@lasoviet/backend";
import type { AppEnvironment } from "@lasoviet/config";
import type { Database } from "@lasoviet/database";

// No reviewed provider guarantee for "exact serialized input + enforced max output" exists, so no
// proof is ever supplied here. Every gift request therefore ends as `unproven_bound` and nothing
// can dispatch until a reviewed adapter is wired in deliberately (see the producer inventory).
export const NO_REVIEWED_TOKEN_BOUND_PROOF = () => null;

export type FreePalaceApiComposition = {
  // Present only when the flag is on AND approved production AI is configured.
  onChartReady?: (actor: Parameters<ReturnType<typeof createFreePalaceRequestService>["request"]>[0], chart: { chartId: string }) => Promise<unknown>;
  onChartReadyError?: (error: unknown) => void;
  // Always present when a database exists: reading an authorized cache must keep working with the flag off.
  reader?: ReturnType<typeof createFreePalaceReadService>;
};

export function composeFreePalaceForApi(environment: AppEnvironment, database: Database | undefined): FreePalaceApiComposition {
  if (database === undefined) return {};
  const ai = environment.ai.enabled ? environment.ai : undefined;
  const provider = ai ? resolveOpenAiCompatibleProviderId(ai.baseUrl) : undefined;
  const reader = createFreePalaceReadService({
    database,
    // Without a configured provider/model the current key is unknown, so nothing reads as ready.
    currentLineageHash: (slot) => (ai && provider ? currentFreePalaceLineageHash(provider, ai.model)(slot) : null),
  });
  const approved = environment.freePalaceGenerationEnabled === true && ai !== undefined && ai.productionEnabled && ai.featureJsonSchema;
  if (!approved || !ai || !provider) return { reader };
  const request = createFreePalaceRequestService({
    database,
    sources: createDatabaseZiweiQueryRepository(database),
    flagEnabled: () => true,
    provider,
    model: ai.model,
    loadActiveTariff: createFreePalaceTariffPort(database).loadActiveTariff,
    boundProofFor: NO_REVIEWED_TOKEN_BOUND_PROOF,
  });
  return {
    reader,
    onChartReady: (actor, chart) => request.request(actor, chart.chartId),
    // Name only: no message, stack or payload can carry birth data into logs.
    onChartReadyError: (error) => console.error("FREE_PALACE_REQUEST_FAILED", error instanceof Error ? error.name : "unknown"),
  };
}
