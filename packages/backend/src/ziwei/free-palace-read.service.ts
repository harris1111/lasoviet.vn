import { eq } from "drizzle-orm";
import {
  FreePalaceGiftViewV1Schema,
  type CurrentActor,
  type FreePalaceGiftViewV1,
  type Result,
} from "@lasoviet/contracts";
import { freeAiSettlements, type Database } from "@lasoviet/database";
import { freePalaceContentHash } from "./free-palace-artifact.repository.js";
import { createFreePalaceRequestRepository } from "./free-palace-request.repository.js";

export type FreePalaceReadError = "CHART_NOT_FOUND" | "ANONYMOUS_EXPIRED";
type NonReadyStatus = Exclude<FreePalaceGiftViewV1, { status: "ready" }>["status"];

// The only place stored request states become browser-visible statuses. No database state name
// leaks, and anything unrecognised degrades to the structural fallback ("unavailable").
// `budget_exhausted` is an admission REFUSAL (nothing is stored), so this reader never emits it.
export function mapFreePalaceStatus(dbStatus: string | null): NonReadyStatus {
  switch (dbStatus) {
    case "reserved": return "requested";
    case "dispatching": return "generating";
    case "terminal_failure": return "terminal_failure";
    case "cost_unknown": return "cost_unknown";
    default: return "unavailable"; // no slot, cancelled, ready-but-not-valid, or an unknown state
  }
}

export type FreePalaceReadServiceOptions = Readonly<{
  database: Database;
  now?: () => Date;
  // The artifact key the CURRENT code would use for this slot. A stored key that differs is a
  // consumed-but-unsupported artifact: structural fallback, never regeneration.
  currentLineageHash: (slot: { chartVersionId: string; palaceId: string; locale: "vi" | "en" }) => string | null;
}>;

// Read path only: ownership and TTL first, then cache/status. It never admits, dispatches,
// enqueues or writes quota, and repeated ready reads are free authorized cache hits.
export function createFreePalaceReadService(options: FreePalaceReadServiceOptions) {
  const now = options.now ?? (() => new Date());
  const requests = createFreePalaceRequestRepository(options.database);
  return {
    async read(actor: CurrentActor, chartId: string, locale: "vi" | "en"): Promise<Result<FreePalaceGiftViewV1, FreePalaceReadError>> {
      const at = now();
      const fail = (code: FreePalaceReadError): Result<never, FreePalaceReadError> =>
        ({ ok: false, error: { code, messageKey: `ziwei.${code.toLowerCase()}`, retryable: false } });
      if (actor.kind === "anonymous" && new Date(actor.expiresAt) <= at) return fail("ANONYMOUS_EXPIRED");
      const found = await requests.readAuthorizedSlot(actor, chartId, at);
      if (!found) return fail("CHART_NOT_FOUND");
      const view = (status: NonReadyStatus): Result<FreePalaceGiftViewV1, FreePalaceReadError> =>
        ({ ok: true, value: { version: 1, status } });
      const slot = found.slot;
      if (!slot) return view("unavailable");
      const { request, artifact } = slot;
      if (request.status !== "ready") return view(mapFreePalaceStatus(request.status));

      // ready needs a live persisted artifact AND a resolved cost capture, in the requested locale,
      // under a currently supported lineage, with an intact content hash.
      const [settlement] = await options.database.select({ outcome: freeAiSettlements.outcome }).from(freeAiSettlements)
        .where(eq(freeAiSettlements.requestId, request.id)).limit(1);
      if (!artifact || !artifact.content || !artifact.facts || !artifact.contentHash || settlement?.outcome !== "resolved" ||
        request.locale !== locale || request.chartVersionId !== found.source.chartVersionId ||
        options.currentLineageHash({ chartVersionId: request.chartVersionId, palaceId: request.palaceId, locale }) !== request.lineageHash ||
        freePalaceContentHash(artifact.content, artifact.facts) !== artifact.contentHash) {
        return view("unavailable");
      }
      const parsed = FreePalaceGiftViewV1Schema.safeParse({
        version: 1, status: "ready", requestId: request.id, chartVersionId: request.chartVersionId, palaceId: request.palaceId,
        locale: request.locale, sourceKind: "validated_artifact", contentHash: artifact.contentHash, reading: artifact.content, facts: artifact.facts,
      });
      return parsed.success ? { ok: true, value: parsed.data } : view("unavailable");
    },
  };
}
export type FreePalaceReadService = ReturnType<typeof createFreePalaceReadService>;
