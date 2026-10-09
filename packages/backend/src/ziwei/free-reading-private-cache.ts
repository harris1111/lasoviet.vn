import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { FreeReadingCandidateV2Schema, validateFreeReadingReferences,
  type CurrentActor, type FreeReadingCandidateV2 } from "@lasoviet/contracts";
import { freeAiRequests, freeAiArtifacts, freeAiChartBudgets, freeAiSettlements, type Database } from "@lasoviet/database";
import { lockFreeAiCoordination, sampleFreeAiClock } from "./free-ai-admission.service.js";
import type { FreeAiClock } from "./free-ai-budget.repository.js";
import { createFreePalaceRequestRepository } from "./free-palace-request.repository.js";
import { validFreeReadingCall, freeReadingLineageHash } from "./free-reading-lineage.js";
import { buildFreeReadingPrompt } from "./free-reading-prompt.js";
import { createFreePalaceSourceCheck } from "./free-palace-runner.js";
import { checkFreeReadingQuality } from "./free-reading-quality.js";

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map(k => `${JSON.stringify(k)}:${canonical(record[k])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
const contentHash = (candidate: FreeReadingCandidateV2) => createHash("sha256").update(canonical(candidate)).digest("hex");
const parseCandidate = (raw: unknown, call: NonNullable<ReturnType<typeof validFreeReadingCall>>) => {
  const parsed = FreeReadingCandidateV2Schema.safeParse(raw);
  if (!parsed.success || parsed.data.locale !== call.source.locale ||
      JSON.stringify(parsed.data.versions) !== JSON.stringify(buildFreeReadingPrompt(call.source).versions) ||
      !validateFreeReadingReferences(parsed.data.content, call.source).ok ||
      !checkFreeReadingQuality({content: parsed.data.content, source: call.source}).ok) return null;
  return parsed.data;
};

// Private unaccepted drafts only. No public route/tool and no native admission or approval.
export function createFreeReadingPrivateCache(database: Database) {
  const slots = createFreePalaceRequestRepository(database);
  const sourceAvailable = createFreePalaceSourceCheck();
  return {
    saveDraft(input: {requestId: string; attemptId: string; candidate: unknown; clock?: FreeAiClock}) {
      return database.transaction(async tx => {
        await lockFreeAiCoordination(tx);
        const at = await (input.clock ?? sampleFreeAiClock)(tx);
        const [request] = await tx.select().from(freeAiRequests).where(eq(freeAiRequests.id, input.requestId)).for("update");
        if (!request || request.attemptId !== input.attemptId || request.settledAt === null ||
            !["dispatching", "terminal_failure"].includes(request.status)) return {kind: "refused" as const};
        const [chart] = await tx.select().from(freeAiChartBudgets).where(eq(freeAiChartBudgets.chartVersionId, request.chartVersionId)).for("update");
        const [artifact] = await tx.select().from(freeAiArtifacts).where(eq(freeAiArtifacts.requestId, request.id)).for("update");
        const [settlement] = await tx.select().from(freeAiSettlements).where(eq(freeAiSettlements.requestId, request.id));
        const call = validFreeReadingCall(artifact?.frozenCall);
        if (!chart || chart.deletedAt || chart.deletionGeneration !== request.deletionGeneration ||
            !artifact || artifact.deletionGeneration !== request.deletionGeneration ||
            (artifact.expiresAt !== null && artifact.expiresAt <= at) ||
            !call || call.requestId !== request.id || call.chartVersionId !== request.chartVersionId ||
            call.source.locale !== request.locale || freeReadingLineageHash(call) !== request.lineageHash ||
            settlement?.outcome !== "resolved" || settlement.attemptId !== input.attemptId) return {kind: "refused" as const};
        if (!(await sourceAvailable(tx, at, request.chartVersionId))) return {kind: "refused" as const};
        const candidate = parseCandidate(input.candidate, call);
        if (!candidate) return {kind: "refused" as const};
        const hash = contentHash(candidate);
        await tx.update(freeAiArtifacts).set({content: candidate, contentHash: hash, facts: null}).where(eq(freeAiArtifacts.requestId, request.id));
        // `ready` refers only to persisted private draft data, never manual/public acceptance.
        if (request.status === "dispatching") await tx.update(freeAiRequests).set({status: "ready"}).where(eq(freeAiRequests.id, request.id));
        return {kind: "stored" as const};
      });
    },
    async readDraft(actor: CurrentActor, chartId: string, locale: "vi" | "en", options: {clock?: () => Date} = {}) {
      return database.transaction(async tx => {
        await lockFreeAiCoordination(tx);
        const at = options.clock ? options.clock() : await sampleFreeAiClock(tx);
        if (!Number.isFinite(at.getTime()) || (actor.kind === "anonymous" && new Date(actor.expiresAt) <= at)) return null;
        const slot = await slots.readAuthorizedSlot(actor, chartId, at, tx);
        if (!slot?.slot) return null;
        const {request, artifact} = slot.slot;
        if (!["ready", "terminal_failure"].includes(request.status) || request.locale !== locale ||
            !artifact?.content || !artifact.contentHash) return null;
        const call = validFreeReadingCall(artifact.frozenCall);
        if (!call || call.chartVersionId !== slot.source.chartVersionId || call.requestId !== request.id ||
            call.source.locale !== locale || freeReadingLineageHash(call) !== request.lineageHash) return null;
        const candidate = parseCandidate(artifact.content, call);
        if (!candidate || contentHash(candidate) !== artifact.contentHash) return null;
        const [settlement] = await tx.select().from(freeAiSettlements).where(eq(freeAiSettlements.requestId, request.id));
        return settlement?.outcome === "resolved" && settlement.attemptId === request.attemptId ? candidate : null;
      });
    },
  };
}
