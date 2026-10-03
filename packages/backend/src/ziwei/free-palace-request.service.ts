import {
  NormalizedZiweiChartV1Schema,
  type CurrentActor,
  type FreePalaceGiftFactV1,
  type NormalizedZiweiChartV1,
  type TopConcernV1,
} from "@lasoviet/contracts";
import type { Database } from "@lasoviet/database";
import { KNOWN_CANONICAL_IDENTIFIERS_VI } from "../reports/comprehensive-report-validator-v4.js";
import { createFreeAiBudgetRepository, type FreePalaceRefusalReason } from "./free-ai-budget.repository.js";
import { freezeFreePalaceCostContext, type FreePalaceTariff, type FreePalaceTokenBoundProof } from "./free-palace-cost-context.js";
import { createFreePalaceSourceCheck } from "./free-palace-runner.js";
import { freePalaceArtifactKey, selectFreePalace, type FreePalaceArtifactLineage } from "./free-palace-selection.js";
import {
  FREE_PALACE_PROMPT_VERSION, FREE_PALACE_RULES_VERSION, FREE_PALACE_SCHEMA_VERSION,
  buildFreePalacePrompt, serializeFreePalacePrompt,
} from "./free-palace-writer.js";
import type { ZiweiQueryRepository } from "./ziwei-query.repository.js";

export const FREE_PALACE_KNOWLEDGE_VERSION = "free-palace-structural-facts-v1";
export const FREE_PALACE_SCORER_VERSION = "structural-palace-score-v1";
// The gift is requested in the default locale; an English reader gets the structural fallback
// (the reader reports "unavailable" for a locale that has no request).
export const FREE_PALACE_GIFT_LOCALE = "vi" as const;
export const FREE_PALACE_MAX_OUTPUT_TOKENS = 2500;

export function freePalaceLineage(input: { chartVersionId: string; palaceId: FreePalaceArtifactLineage["palaceId"]; locale: "vi" | "en"; provider: string; model: string }): FreePalaceArtifactLineage {
  return {
    chartVersionId: input.chartVersionId, palaceId: input.palaceId, locale: input.locale, provider: input.provider, model: input.model,
    promptVersion: FREE_PALACE_PROMPT_VERSION, rulesVersion: FREE_PALACE_RULES_VERSION, knowledgeVersion: FREE_PALACE_KNOWLEDGE_VERSION,
    scorerVersion: FREE_PALACE_SCORER_VERSION, schemaVersion: FREE_PALACE_SCHEMA_VERSION,
  };
}
// The artifact key the CURRENT code would produce for a stored slot (used by the reader).
export const currentFreePalaceLineageHash = (provider: string, model: string) =>
  (slot: { chartVersionId: string; palaceId: string; locale: "vi" | "en" }) =>
    freePalaceArtifactKey(freePalaceLineage({ ...slot, palaceId: slot.palaceId as FreePalaceArtifactLineage["palaceId"], provider, model }));

const label = (id: string) => KNOWN_CANONICAL_IDENTIFIERS_VI[id];

// Authorized, structural facts for ONE palace only: the palace, its branch, its main stars with their
// brightness, and the transformations that land on those stars. Nothing outside the chart.
export function buildFreePalaceFacts(chart: NormalizedZiweiChartV1, palaceId: string): FreePalaceGiftFactV1[] {
  const palace = chart.palaces.find((item) => item.id === palaceId);
  if (!palace) return [];
  const suffix = palaceId.split(".").pop()!;
  const facts: FreePalaceGiftFactV1[] = [];
  const palaceName = label(palaceId);
  if (!palaceName) return [];
  const branch = label(palace.earthlyBranchId);
  facts.push({ key: `palace:${suffix}`, label: "Cung được chọn", value: branch ? `${palaceName}, tại địa chi ${branch}` : palaceName });
  for (const star of palace.stars.filter((item) => item.category === "major")) {
    const name = label(star.id);
    if (!name) continue;
    const brightness = label(star.brightness);
    const transformation = chart.transformations.find((item) => item.starId === star.id);
    const transform = transformation ? label(transformation.id) : undefined;
    facts.push({
      key: `palace:${suffix}:star:${star.id.split(".").pop()}`, label: "Chính tinh tại cung",
      value: [name, brightness ? `thế ${brightness}` : null, transform ? `mang ${transform}` : null].filter(Boolean).join(", "),
    });
  }
  return facts;
}

export type FreePalaceRequestOutcome =
  | Readonly<{ kind: "admitted" | "existing"; requestId: string }>
  | Readonly<{ kind: "skipped"; reason: string }>
  | Readonly<{ kind: "refused"; reason: FreePalaceRefusalReason }>;

export type FreePalaceRequestServiceOptions = Readonly<{
  database: Database;
  sources: Pick<ZiweiQueryRepository, "readAuthorizedChart">;
  flagEnabled: () => boolean;
  provider: string;
  model: string;
  now?: () => Date;
  loadActiveTariff: (provider: string, model: string, now: Date) => Promise<FreePalaceTariff | null>;
  // Only a reviewed provider adapter may supply this. No production adapter does today, so by
  // default every request ends as `unproven_bound` and nothing can dispatch.
  boundProofFor: (input: { serializedRequest: string; maxOutputTokens: number }) => FreePalaceTokenBoundProof | null;
  // A guest cannot dispatch during the pilot unless first-party controls vouch for the identity.
  isTrustedGuest?: (actor: Extract<CurrentActor, { kind: "anonymous" }>) => boolean;
  traceId?: (actor: CurrentActor) => string;
}>;

// Best-effort, asynchronous REQUEST of a gift. It only reserves through the shared B08 path
// (which writes the typed outbox event); it never calls a provider and never throws.
export function createFreePalaceRequestService(options: FreePalaceRequestServiceOptions) {
  const now = options.now ?? (() => new Date());
  const budget = createFreeAiBudgetRepository(options.database);
  const sourceCheck = createFreePalaceSourceCheck();
  return {
    async request(actor: CurrentActor, chartId: string): Promise<FreePalaceRequestOutcome> {
      try {
        if (!options.flagEnabled()) return { kind: "skipped", reason: "flag_disabled" };
        const trusted = actor.kind === "account" ? actor.emailVerified === true : (options.isTrustedGuest?.(actor) ?? false);
        if (!trusted) return { kind: "skipped", reason: "identity_unverified" };
        const at = now();
        const source = await options.sources.readAuthorizedChart(actor, chartId, at);
        if (!source) return { kind: "skipped", reason: "source_unavailable" };
        const chart = NormalizedZiweiChartV1Schema.safeParse(source.normalizedOutput);
        if (!chart.success) return { kind: "skipped", reason: "chart_invalid" };
        const palaceId = selectFreePalace(chart.data, source.topConcern as TopConcernV1 | undefined);
        const facts = buildFreePalaceFacts(chart.data, palaceId);
        if (facts.length === 0) return { kind: "skipped", reason: "no_facts" };
        const prompt = buildFreePalacePrompt({
          locale: FREE_PALACE_GIFT_LOCALE, palaceId, palaceLabel: label(palaceId) ?? palaceId, facts, concern: source.topConcern ?? null,
        });
        const serializedRequest = serializeFreePalacePrompt(prompt);
        const frozen = freezeFreePalaceCostContext({
          provider: options.provider, model: options.model, finalSerializedRequest: serializedRequest, maxOutputTokens: FREE_PALACE_MAX_OUTPUT_TOKENS, now: at,
          pricing: await options.loadActiveTariff(options.provider, options.model, at),
          proof: options.boundProofFor({ serializedRequest, maxOutputTokens: FREE_PALACE_MAX_OUTPUT_TOKENS }),
        });
        if (!frozen.ok) return { kind: "skipped", reason: frozen.reason };
        const result = await budget.reserve({
          flagEnabled: true,
          actor: actor.kind === "account" ? { kind: "account", id: actor.userId, trusted } : { kind: "guest", id: actor.anonymousActorId, trusted },
          lineage: freePalaceLineage({ chartVersionId: source.chartVersionId, palaceId, locale: FREE_PALACE_GIFT_LOCALE, provider: options.provider, model: options.model }),
          concern: source.topConcern ?? null, cost: frozen.value, traceId: options.traceId?.(actor) ?? actor.requestId,
          authorizeSource: async (tx, when) => (await sourceCheck(tx, when, source.chartVersionId))
            ? { expiresAt: actor.kind === "anonymous" ? new Date(actor.expiresAt) : null } : null,
        });
        if (result.kind === "admitted") return { kind: "admitted", requestId: result.requestId };
        if (result.kind === "refused") return result;
        return { kind: "existing", requestId: result.requestId };
      } catch {
        // Redacted by construction: no message, stack or payload leaves this service.
        return { kind: "skipped", reason: "error" };
      }
    },
  };
}
export type FreePalaceRequestService = ReturnType<typeof createFreePalaceRequestService>;
