import { createHash } from "node:crypto";
import { and, eq, inArray, isNotNull, isNull, lte, or, sql } from "drizzle-orm";
import {
  FreePalaceGiftContentV1Schema,
  FreePalaceGiftFactV1Schema,
  type FreePalaceGiftContentV1,
  type FreePalaceGiftFactV1,
} from "@lasoviet/contracts";
import {
  birthProfiles,
  freeAiArtifacts,
  freeAiChartBudgets,
  freeAiRequests,
  freeAiSettlements,
  ziweiChartVersions,
  ziweiCharts,
  type Database,
} from "@lasoviet/database";
import type { FreeAiClock } from "./free-ai-budget.repository.js";
import { lockFreeAiCoordination, sampleFreeAiClock, type FreeAiTransaction } from "./free-ai-admission.service.js";
import { cancelUnfencedRequest } from "./free-ai-dispatch.service.js";

export type FreePalacePublishRefusal = "not_found" | "deleted" | "expired" | "not_publishable";
export type FreePalacePublishResult =
  | Readonly<{ kind: "published"; contentHash: string }>
  | Readonly<{ kind: "refused"; reason: FreePalacePublishRefusal }>;

export type FreePalaceOwner = Readonly<{ userId: string } | { anonymousActorId: string }>;

const factsSchema = FreePalaceGiftFactV1Schema.array().min(1).max(64);

export function freePalaceContentHash(content: FreePalaceGiftContentV1, facts: ReadonlyArray<FreePalaceGiftFactV1>): string {
  return createHash("sha256").update(JSON.stringify({ content, facts })).digest("hex");
}

// Nulls every private payload and keeps only non-content accounting (ids, amounts, days, status).
// Runs under the coordination lock the publication path also takes, so a publish can never
// interleave with it. Unfenced requests are cancelled with their holds released; a fenced request
// keeps its hold or exposure until settlement, and an already-charged one can never become ready.
export async function purgeFreePalaceForChartVersions(tx: FreeAiTransaction, chartVersionIds: ReadonlyArray<string>, now: Date): Promise<number> {
  await lockFreeAiCoordination(tx);
  if (chartVersionIds.length === 0) return 0;
  const charts = await tx.select({ id: freeAiChartBudgets.chartVersionId }).from(freeAiChartBudgets)
    .where(inArray(freeAiChartBudgets.chartVersionId, [...chartVersionIds])).for("update");
  if (charts.length === 0) return 0;
  const ids = charts.map((chart) => chart.id);
  await tx.update(freeAiChartBudgets).set({ deletionGeneration: sql`${freeAiChartBudgets.deletionGeneration} + 1`, deletedAt: now })
    .where(inArray(freeAiChartBudgets.chartVersionId, ids));
  const requests = await tx.select().from(freeAiRequests).where(inArray(freeAiRequests.chartVersionId, ids)).for("update");
  for (const request of requests) {
    if (request.status === "reserved" && request.fencedAt === null) await cancelUnfencedRequest(tx, now, request);
    else if (request.status === "dispatching" && request.settledAt !== null) {
      await tx.update(freeAiRequests).set({ status: "terminal_failure" }).where(eq(freeAiRequests.id, request.id));
    }
  }
  const requestIds = requests.map((request) => request.id);
  if (requestIds.length > 0) {
    await tx.update(freeAiArtifacts).set({ frozenCall: null, content: null, facts: null, contentHash: null })
      .where(inArray(freeAiArtifacts.requestId, requestIds));
    await tx.update(freeAiRequests).set({ concern: null }).where(inArray(freeAiRequests.id, requestIds));
  }
  return ids.length;
}

export async function collectFreePalaceChartVersionIds(tx: FreeAiTransaction, owner: FreePalaceOwner): Promise<string[]> {
  const rows = await tx.select({ id: ziweiChartVersions.id }).from(ziweiChartVersions)
    .innerJoin(ziweiCharts, eq(ziweiCharts.id, ziweiChartVersions.chartId))
    .innerJoin(birthProfiles, eq(birthProfiles.id, ziweiCharts.profileId))
    .where("userId" in owner ? eq(birthProfiles.userId, owner.userId) : eq(birthProfiles.anonymousActorId, owner.anonymousActorId));
  return rows.map((row) => row.id);
}

export function createFreePalaceArtifactRepository(database: Database) {
  return {
    // Single transaction: coordination lock -> compare deletion generation and TTL -> write the
    // artifact and move to `ready`. If deletion committed after the worker's earlier checks, the
    // generation differs and publication fails: no resurrection.
    publish(input: { requestId: string; attemptId: string; content: unknown; facts: unknown; clock?: FreeAiClock }): Promise<FreePalacePublishResult> {
      return database.transaction(async (tx): Promise<FreePalacePublishResult> => {
        await lockFreeAiCoordination(tx);
        const now = await (input.clock ?? sampleFreeAiClock)(tx);
        const [request] = await tx.select().from(freeAiRequests).where(eq(freeAiRequests.id, input.requestId)).for("update");
        if (!request) return { kind: "refused", reason: "not_found" };
        const [chart] = await tx.select().from(freeAiChartBudgets).where(eq(freeAiChartBudgets.chartVersionId, request.chartVersionId)).for("update");
        const [artifact] = await tx.select().from(freeAiArtifacts).where(eq(freeAiArtifacts.requestId, request.id)).for("update");
        const deleted = !chart || chart.deletedAt !== null || chart.deletionGeneration !== request.deletionGeneration ||
          !artifact || artifact.deletionGeneration !== request.deletionGeneration;
        if (deleted) {
          // The cost is already settled, so the request ends terminally rather than lingering as `dispatching`.
          if (request.status === "dispatching" && request.settledAt !== null) {
            await tx.update(freeAiRequests).set({ status: "terminal_failure" }).where(eq(freeAiRequests.id, request.id));
          }
          return { kind: "refused", reason: "deleted" };
        }
        if (artifact.expiresAt !== null && artifact.expiresAt <= now) return { kind: "refused", reason: "expired" };
        const [settlement] = await tx.select({ outcome: freeAiSettlements.outcome, attemptId: freeAiSettlements.attemptId })
          .from(freeAiSettlements).where(eq(freeAiSettlements.requestId, request.id)).limit(1);
        // Unknown or unrecorded usage keeps the hold and blocks the ready claim.
        if (request.status !== "dispatching" || request.settledAt === null || settlement?.outcome !== "resolved" ||
          settlement.attemptId !== input.attemptId || request.attemptId !== input.attemptId) {
          return { kind: "refused", reason: "not_publishable" };
        }
        const content = FreePalaceGiftContentV1Schema.parse(input.content);
        const facts = factsSchema.parse(input.facts);
        if (content.palaceId !== request.palaceId) return { kind: "refused", reason: "not_publishable" };
        const contentHash = freePalaceContentHash(content, facts);
        await tx.update(freeAiArtifacts).set({ content, facts, contentHash }).where(eq(freeAiArtifacts.requestId, request.id));
        await tx.update(freeAiRequests).set({ status: "ready" }).where(eq(freeAiRequests.id, request.id));
        return { kind: "published", contentHash };
      });
    },
    // Sweeps private payloads whose guest TTL passed. Reads already ignore expired rows; this
    // makes retention real instead of relying on read-time filtering.
    purgeExpiredPayloads(input: { limit: number; clock?: FreeAiClock }): Promise<number> {
      return database.transaction(async (tx) => {
        await lockFreeAiCoordination(tx);
        const now = await (input.clock ?? sampleFreeAiClock)(tx);
        const expired = await tx.select({ requestId: freeAiArtifacts.requestId }).from(freeAiArtifacts)
          .where(and(isNotNull(freeAiArtifacts.expiresAt), lte(freeAiArtifacts.expiresAt, now),
            or(isNotNull(freeAiArtifacts.content), isNotNull(freeAiArtifacts.frozenCall), isNotNull(freeAiArtifacts.facts)))).limit(input.limit);
        if (expired.length === 0) return 0;
        const ids = expired.map((row) => row.requestId);
        await tx.update(freeAiArtifacts).set({ frozenCall: null, content: null, facts: null, contentHash: null }).where(inArray(freeAiArtifacts.requestId, ids));
        // An expired but still-reserved request can never be dispatched without its frozen call.
        const pending = await tx.select().from(freeAiRequests).where(and(inArray(freeAiRequests.id, ids), eq(freeAiRequests.status, "reserved"), isNull(freeAiRequests.fencedAt))).for("update");
        for (const request of pending) await cancelUnfencedRequest(tx, now, request);
        return ids.length;
      });
    },
  };
}
