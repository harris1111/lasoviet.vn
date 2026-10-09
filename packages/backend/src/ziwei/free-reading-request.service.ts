import { randomUUID } from "node:crypto";
import { NormalizedZiweiChartV1Schema, type CurrentActor } from "@lasoviet/contracts";
import type { Database } from "@lasoviet/database";
import { buildFreeReadingFacts } from "./free-reading-facts.js";
import { createFreeReadingAdmission } from "./free-reading-admission.js";
import { freezeFreeReadingCall } from "./free-reading-writer.js";
import { FreeReadingTariffV2Schema } from "@lasoviet/contracts";
import { freezeFreePalaceCostContext, type FreePalaceTariff, type FreePalaceTokenBoundProof } from "./free-palace-cost-context.js";
import { selectFreePalace } from "./free-palace-selection.js";
import type { FreePalaceRequestOutcome } from "./free-palace-request.service.js";
import type { ZiweiQueryRepository } from "./ziwei-query.repository.js";

export type FreeReadingRequestOptions = Readonly<{
  database: Database; sources: Pick<ZiweiQueryRepository, "readAuthorizedChart">;
  flagEnabled: () => boolean; provider: string; model: string; now?: () => Date;
  loadActiveTariff: (provider: string, model: string, at: Date) => Promise<(FreePalaceTariff & {cachedInputPricePerMillion: number}) | null>;
  // Server-only actual adapter proof; no production supplier is currently approved.
  boundProofFor: (input: {serializedRequest: string; maxOutputTokens: number}) => FreePalaceTokenBoundProof | null;
  isTrustedGuest?: (actor: Extract<CurrentActor, {kind: "anonymous"}>) => boolean;
}>;

// Private preparation only. Derive source facts here rather than accepting caller facts.
// No provider call, public endpoint, runtime wiring, approval or token-bound invention.
export function createFreeReadingRequestService(options: FreeReadingRequestOptions) {
  const admission = createFreeReadingAdmission(options.database), now = options.now ?? (() => new Date());
  return {async request(actor: CurrentActor, chartId: string, locale: "vi" | "en"): Promise<FreePalaceRequestOutcome> {
    try {
      if (!options.flagEnabled()) return {kind: "skipped", reason: "flag_disabled"};
      const trusted = actor.kind === "account" ? actor.emailVerified === true : options.isTrustedGuest?.(actor) === true;
      if (!trusted) return {kind: "skipped", reason: "identity_unverified"};
      const at = now();
      if (!Number.isFinite(at.getTime()) || (actor.kind === "anonymous" &&
          (!Number.isFinite(Date.parse(actor.expiresAt)) || new Date(actor.expiresAt) <= at))) return {kind: "skipped", reason: "source_unavailable"};
      const record = await options.sources.readAuthorizedChart(actor, chartId, at);
      if (!record) return {kind: "skipped", reason: "source_unavailable"};
      const chart = NormalizedZiweiChartV1Schema.safeParse(record.normalizedOutput);
      if (!chart.success) return {kind: "skipped", reason: "chart_invalid"};
      const focusPalaceId = selectFreePalace(chart.data, record.topConcern ?? undefined);
      const source = buildFreeReadingFacts({chart: chart.data, focusPalaceId, locale});
      const pricing = await options.loadActiveTariff(options.provider, options.model, at);
      const tariff = FreeReadingTariffV2Schema.safeParse(pricing ? {
        id: pricing.id, pricingVersion: pricing.pricingVersion, providerId: pricing.providerId, modelId: pricing.modelId,
        inputPricePerMillion: pricing.inputPricePerMillion, outputPricePerMillion: pricing.outputPricePerMillion,
        cachedInputPricePerMillion: pricing.cachedInputPricePerMillion,
      } : null);
      // The existing input reservation uses the uncached rate as the conservative bound.
      if (!tariff.success || tariff.data.cachedInputPricePerMillion > tariff.data.inputPricePerMillion) return {kind: "skipped", reason: "unapproved_pricing"};
      const call = freezeFreeReadingCall({requestId: randomUUID(), chartVersionId: record.chartVersionId, source, tariff: tariff.data});
      const cost = freezeFreePalaceCostContext({provider: options.provider, model: options.model, now: at,
        finalSerializedRequest: call.serializedPrompt, maxOutputTokens: call.maxOutputTokens, pricing,
        proof: options.boundProofFor({serializedRequest: call.serializedPrompt, maxOutputTokens: call.maxOutputTokens})});
      if (!cost.ok) return {kind: "skipped", reason: cost.reason};
      const result = await admission.reserve({call, cost: cost.value, flagEnabled: options.flagEnabled(),
        actor: actor.kind === "account" ? {kind: "account", id: actor.userId, trusted} : {kind: "guest", id: actor.anonymousActorId, trusted},
        concern: record.topConcern ?? null, traceId: actor.requestId, clock: options.now ? async () => now() : undefined,
        authorizeSource: async (tx, when) => {
          if (!options.flagEnabled() || (actor.kind === "anonymous" && new Date(actor.expiresAt) <= when)) return null;
          const current = await options.sources.readAuthorizedChart(actor, chartId, when, tx);
          if (!current || current.chartVersionId !== record.chartVersionId) return null;
          const currentChart = NormalizedZiweiChartV1Schema.safeParse(current.normalizedOutput);
          if (!currentChart.success || JSON.stringify(currentChart.data.provenance) !== JSON.stringify(chart.data.provenance) ||
              JSON.stringify(buildFreeReadingFacts({chart: currentChart.data, focusPalaceId, locale})) !== JSON.stringify(source)) return null;
          return {expiresAt: actor.kind === "anonymous" ? new Date(actor.expiresAt) : null};
        }});
      if (result.kind === "admitted") return {kind: "admitted", requestId: result.requestId};
      if (result.kind === "refused") return {kind: "refused", reason: result.reason};
      return {kind: "existing", requestId: result.requestId};
    } catch {return {kind: "skipped", reason: "error"};}
  }};
}
