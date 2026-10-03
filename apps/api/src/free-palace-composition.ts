import {
  createFreePalaceEngagementService,
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
  // The chart-ready hook only knows the reader's locale if the calculation call carried it; without
  // one it requests nothing (the first engagement on the result page will, in the page's locale).
  onChartReady?: (actor: Parameters<ReturnType<typeof createFreePalaceRequestService>["request"]>[0], chart: { chartId: string; locale?: "vi" | "en" }) => Promise<unknown>;
  // Explicit user action on the result page; present only when the flag and approved AI are on.
  engagement?: ReturnType<typeof createFreePalaceEngagementService>;
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
  const sources = createDatabaseZiweiQueryRepository(database);
  return {
    reader,
    engagement: createFreePalaceEngagementService({ database, sources, request, flagEnabled: () => true }),
    onChartReady: async (actor, chart) => (chart.locale ? request.request(actor, chart.chartId, chart.locale) : { kind: "skipped", reason: "locale_unknown" }),
    // Name only: no message, stack or payload can carry birth data into logs.
    onChartReadyError: (error) => console.error("FREE_PALACE_REQUEST_FAILED", error instanceof Error ? error.name : "unknown"),
  };
}
