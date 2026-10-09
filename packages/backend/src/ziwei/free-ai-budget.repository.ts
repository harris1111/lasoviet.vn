import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import {
  FreePalaceGiftFrozenCallV1Schema, FreeReadingFrozenCallV2Schema, type FreeReadingFrozenCallV2,
  FreePalaceGiftOutboxPayloadV1Schema,
  type FreePalaceGiftFrozenCallV1,
} from "@lasoviet/contracts";
import {
  aiCallAttempts,
  aiUsageOutcomes,
  enqueueOutbox,
  freeAiAdmissions,
  freeAiArtifacts,
  freeAiChartBudgets,
  freeAiDailyBudgets,
  freeAiRequests,
  type Database,
} from "@lasoviet/database";
import {
  freeAiQuotaAlias,
  lockFreeAiCoordination,
  readLockedFreeAiQuota,
  resolveLockedFreeAiSubject,
  sampleFreeAiClock,
  type FreeAiSubjectKind,
  type FreeAiTransaction,
} from "./free-ai-admission.service.js";
import { validFreeReadingCall, freeReadingLineageHash } from "./free-reading-lineage.js";
import { FREE_PALACE_GENERATION_REQUESTED_EVENT } from "./free-palace-outbox.js";
import type { FreePalaceCostContext } from "./free-palace-cost-context.js";
import { freePalaceArtifactKey, resolveFreePalaceSlot, type FreePalaceArtifactLineage } from "./free-palace-selection.js";

// 1 VND = 1,000,000 micro-VND. These are founder-approved ceilings (FD-109); nothing
// in this module, and no recovery path, may raise or make them configurable.
export const FREE_AI_CHART_CEILING_MICRO_VND = 3_000n * 1_000_000n;
export const FREE_AI_DAILY_CEILING_MICRO_VND = 50_000n * 1_000_000n;

export type FreePalaceRefusalReason =
  | "flag_disabled"
  | "identity_unverified"
  | "source_unavailable"
  | "legacy_unreconciled"
  | "quota_exhausted"
  | "chart_budget_exhausted"
  | "daily_budget_exhausted"
  | "dispatch_halted"
  | "invalid_reservation";

// Runs inside the coordination lock, so the source, its TTL and its owner are authoritative
// for the whole admission. Returns the guest TTL (null for accounts) or null when the
// actor may not read the chart.
export type FreeAiSourceAuthorizer = (tx: FreeAiTransaction, now: Date) => Promise<{ expiresAt: Date | null } | null>;

export type FreeAiClock = (tx: FreeAiTransaction) => Promise<Date>;

export type FreePalaceReservationInput = Readonly<{
  flagEnabled: boolean;
  actor: Readonly<{ kind: FreeAiSubjectKind; id: string; trusted: boolean }>;
  lineage: FreePalaceArtifactLineage;
  concern: string | null;
  cost: FreePalaceCostContext;
  traceId: string;
  authorizeSource: FreeAiSourceAuthorizer;
  requestId?: string;
  // Server-only v2 preparation. Shares the legacy chart slot/ledger and isolates its event.
  wholeReadingCall?: FreeReadingFrozenCallV2;
  // Test seam for midnight behaviour; always sampled AFTER the coordination lock is held.
  clock?: FreeAiClock;
}>;

export type FreeAiDailyBudgetRefusal = Readonly<{
  utcDay: string; exposureMicroVnd: string; requestedMicroVnd: string;
}>;

export type FreePalaceReservationResult =
  | Readonly<{ kind: "admitted"; requestId: string; admissionDay: string; reservedMicroVnd: bigint }>
  | Readonly<{ kind: "cache" | "fallback"; requestId: string; status: string }>
  | Readonly<{ kind: "refused"; reason: FreePalaceRefusalReason; budgetRefusal?: FreeAiDailyBudgetRefusal }>;

class Refusal extends Error {
  constructor(readonly reason: FreePalaceRefusalReason, readonly budgetRefusal?: FreeAiDailyBudgetRefusal) { super(reason); }
}

export const utcDay = (at: Date) => at.toISOString().slice(0, 10);
export const bigintSql = (value: bigint) => sql`${value.toString()}::bigint`;
export const totalExposure = (row: { reservedMicroVnd: bigint; resolvedMicroVnd: bigint; unknownMicroVnd: bigint }) =>
  row.reservedMicroVnd + row.resolvedMicroVnd + row.unknownMicroVnd;

// The day gate counts the day's own exposure plus every unresolved hold (reserved or unknown)
// still sitting on an earlier day: a dispatch that spans midnight is neither discarded at
// rollover nor counted twice, because a re-reserved hold is moved off its old day row.
export async function readDailyGateTotal(tx: FreeAiTransaction, day: string): Promise<bigint> {
  const [row] = await tx.select().from(freeAiDailyBudgets).where(eq(freeAiDailyBudgets.utcDay, day)).limit(1);
  const carried = await tx.execute<{ held: string }>(sql`SELECT coalesce(sum(reserved_micro_vnd + unknown_micro_vnd), 0)::text AS held FROM free_ai_daily_budgets WHERE utc_day < ${day}::date`);
  return (row ? totalExposure(row) : 0n) + BigInt(carried[0]!.held);
}

// An actual cost above its reserved bound halts all free dispatch until an owner acknowledges
// the incident (an audit row). Derived from the ledger itself, so it cannot be forgotten.
export async function isFreeAiDispatchHalted(tx: FreeAiTransaction): Promise<boolean> {
  const rows = await tx.execute(sql`SELECT 1 FROM free_ai_settlements s JOIN free_ai_requests r ON r.id = s.request_id
    WHERE s.outcome = 'resolved' AND s.actual_micro_vnd > r.reserved_micro_vnd
    AND NOT EXISTS (SELECT 1 FROM audit_logs a WHERE a.action = 'free_ai.overshoot.acknowledged' AND a.target_id = r.id::text) LIMIT 1`);
  return rows.length > 0;
}

// Imports each legacy `free_preview` attempt exactly once: the chart row is locked and
// `legacy_reconciled_at` is written in the same transaction as the imported amounts.
// An attempt with no outcome or an unknown outcome has no provable bound, so it blocks.
async function reconcileLegacy(tx: FreeAiTransaction, chartVersionId: string, now: Date): Promise<bigint> {
  const rows = await tx.select({
    startedAt: aiCallAttempts.startedAt, costStatus: aiUsageOutcomes.costStatus, cost: aiUsageOutcomes.costMicroVnd,
  }).from(aiCallAttempts)
    .leftJoin(aiUsageOutcomes, eq(aiUsageOutcomes.attemptId, aiCallAttempts.id))
    .where(and(eq(aiCallAttempts.purpose, "free_preview"), eq(aiCallAttempts.chartVersionId, chartVersionId)));
  const perDay = new Map<string, bigint>();
  let resolved = 0n;
  for (const row of rows) {
    if (row.costStatus !== "resolved" || row.cost === null || row.cost < 0n) throw new Refusal("legacy_unreconciled");
    resolved += row.cost;
    const day = utcDay(row.startedAt);
    perDay.set(day, (perDay.get(day) ?? 0n) + row.cost);
  }
  for (const [day, amount] of perDay) {
    await tx.insert(freeAiDailyBudgets).values({ utcDay: day, resolvedMicroVnd: amount })
      .onConflictDoUpdate({ target: freeAiDailyBudgets.utcDay, set: { resolvedMicroVnd: sql`${freeAiDailyBudgets.resolvedMicroVnd} + ${bigintSql(amount)}` } });
  }
  await tx.update(freeAiChartBudgets).set({
    resolvedMicroVnd: sql`${freeAiChartBudgets.resolvedMicroVnd} + ${bigintSql(resolved)}`, legacyReconciledAt: now,
  }).where(eq(freeAiChartBudgets.chartVersionId, chartVersionId));
  return resolved;
}

export function createFreeAiBudgetRepository(database: Database) {
  return {
    async reserve(input: FreePalaceReservationInput): Promise<FreePalaceReservationResult> {
      const { lineage, cost } = input;
      if (cost.reservedMicroVnd <= 0n || cost.provider !== lineage.provider || cost.model !== lineage.model) {
        return { kind: "refused", reason: "invalid_reservation" };
      }
      const whole = input.wholeReadingCall ? FreeReadingFrozenCallV2Schema.safeParse(input.wholeReadingCall) : null;
      if (whole && (!whole.success || !validFreeReadingCall(whole.data) || freeReadingLineageHash(whole.data) !== freePalaceArtifactKey(lineage) || whole.data.chartVersionId !== lineage.chartVersionId ||
          whole.data.source.locale !== lineage.locale || whole.data.source.focusPalaceId !== lineage.palaceId ||
          whole.data.tariff.id !== cost.pricingSnapshotId || whole.data.tariff.providerId !== cost.provider ||
          whole.data.tariff.modelId !== cost.model || whole.data.serializedPrompt !== cost.finalSerializedRequest ||
          cost.maxOutputTokens !== whole.data.maxOutputTokens || cost.maxInputTokens > 16_000 ||
          BigInt(whole.data.tariff.inputPricePerMillion) !== cost.inputPricePerMillion ||
          BigInt(whole.data.tariff.outputPricePerMillion) !== cost.outputPricePerMillion ||
          (input.requestId !== undefined && input.requestId !== whole.data.requestId))) {
        return {kind: "refused", reason: "invalid_reservation"};
      }
      const requestId = whole?.success ? whole.data.requestId : input.requestId ?? randomUUID();
      const artifactKey = freePalaceArtifactKey(lineage);
      try {
        return await database.transaction(async (tx): Promise<FreePalaceReservationResult> => {
          await lockFreeAiCoordination(tx);
          // Sampled after any lock wait: a transaction-start `now()` can be a day stale.
          const now = await (input.clock ?? sampleFreeAiClock)(tx);
          const source = await input.authorizeSource(tx, now);
          if (!source) throw new Refusal("source_unavailable");

          const [budget] = await tx.select().from(freeAiChartBudgets)
            .where(eq(freeAiChartBudgets.chartVersionId, lineage.chartVersionId)).limit(1);
          if (budget?.deletedAt) throw new Refusal("source_unavailable");

          // The slot is keyed by chart version only: a technical key change never re-grants it.
          const [existing] = await tx.select({ request: freeAiRequests, artifact: freeAiArtifacts })
            .from(freeAiRequests).leftJoin(freeAiArtifacts, eq(freeAiArtifacts.requestId, freeAiRequests.id))
            .where(eq(freeAiRequests.chartVersionId, lineage.chartVersionId)).limit(1);
          if (existing) {
            const artifact = existing.artifact;
            const supportedArtifact = existing.request.status === "ready" && artifact !== null && artifact.content !== null &&
              artifact.deletionGeneration === budget?.deletionGeneration &&
              (artifact.expiresAt === null || artifact.expiresAt > now) && existing.request.lineageHash === artifactKey;
            const slot = resolveFreePalaceSlot({ requestId: existing.request.id, supportedArtifact });
            if (slot.kind === "eligible") throw new Refusal("invalid_reservation");
            return { kind: slot.kind, requestId: slot.requestId, status: existing.request.status };
          }

          if (!input.flagEnabled) throw new Refusal("flag_disabled");
          if (!input.actor.trusted) throw new Refusal("identity_unverified");
          if (await isFreeAiDispatchHalted(tx)) throw new Refusal("dispatch_halted");

          await tx.insert(freeAiChartBudgets).values({ chartVersionId: lineage.chartVersionId }).onConflictDoNothing();
          const [chart] = await tx.select().from(freeAiChartBudgets)
            .where(eq(freeAiChartBudgets.chartVersionId, lineage.chartVersionId)).for("update");
          if (!chart || chart.deletedAt) throw new Refusal("source_unavailable");
          let chartTotal = totalExposure(chart);
          if (!chart.legacyReconciledAt) chartTotal += await reconcileLegacy(tx, lineage.chartVersionId, now);

          const admissionDay = utcDay(now);
          await tx.insert(freeAiDailyBudgets).values({ utcDay: admissionDay }).onConflictDoNothing();
          await tx.select().from(freeAiDailyBudgets).where(eq(freeAiDailyBudgets.utcDay, admissionDay)).for("update");
          const bound = cost.reservedMicroVnd;
          if (chartTotal + bound > FREE_AI_CHART_CEILING_MICRO_VND) throw new Refusal("chart_budget_exhausted");
          const dailyExposure = await readDailyGateTotal(tx, admissionDay);
          if (dailyExposure + bound > FREE_AI_DAILY_CEILING_MICRO_VND) throw new Refusal("daily_budget_exhausted", whole?.success ? {
            utcDay: admissionDay, exposureMicroVnd: dailyExposure.toString(), requestedMicroVnd: bound.toString(),
          } : undefined);

          const subject = await resolveLockedFreeAiSubject(tx, freeAiQuotaAlias(input.actor.kind, input.actor.id), input.actor.kind);
          if (!(await readLockedFreeAiQuota(tx, subject, now))) throw new Refusal("quota_exhausted");

          await tx.update(freeAiChartBudgets).set({ reservedMicroVnd: sql`${freeAiChartBudgets.reservedMicroVnd} + ${bigintSql(bound)}` })
            .where(eq(freeAiChartBudgets.chartVersionId, lineage.chartVersionId));
          await tx.update(freeAiDailyBudgets).set({ reservedMicroVnd: sql`${freeAiDailyBudgets.reservedMicroVnd} + ${bigintSql(bound)}` })
            .where(eq(freeAiDailyBudgets.utcDay, admissionDay));
          const [request] = await tx.insert(freeAiRequests).values({
            id: requestId, chartVersionId: lineage.chartVersionId, subjectId: subject.id, palaceId: lineage.palaceId,
            locale: lineage.locale, concern: input.concern, status: "reserved", deletionGeneration: chart.deletionGeneration,
            admissionDay, reservedMicroVnd: bound, pricingSnapshotId: cost.pricingSnapshotId, lineageHash: artifactKey,
          }).onConflictDoNothing().returning({ id: freeAiRequests.id });
          if (!request) throw new Refusal("invalid_reservation");
          await tx.insert(freeAiAdmissions).values({ requestId, subjectId: subject.id, admittedAt: now });
          const frozenCall: FreePalaceGiftFrozenCallV1 | FreeReadingFrozenCallV2 = whole?.success ? whole.data : FreePalaceGiftFrozenCallV1Schema.parse({
            version: 1, requestId, chartVersionId: lineage.chartVersionId, palaceId: lineage.palaceId, locale: lineage.locale,
            provider: cost.provider, model: cost.model, promptVersion: lineage.promptVersion, rulesVersion: lineage.rulesVersion,
            knowledgeVersion: lineage.knowledgeVersion, scorerVersion: lineage.scorerVersion, schemaVersion: lineage.schemaVersion,
            pricingSnapshotId: cost.pricingSnapshotId, serializedPrompt: cost.finalSerializedRequest,
            maxOutputTokens: cost.maxOutputTokens, reservedMicroVnd: bound.toString(), deletionGeneration: chart.deletionGeneration,
          });
          await tx.insert(freeAiArtifacts).values({
            requestId, deletionGeneration: chart.deletionGeneration, frozenCall, expiresAt: source.expiresAt,
          });
          await enqueueOutbox(tx, {
            schemaVersion: 1, type: whole?.success ? "free_reading.generation.requested.v2" : FREE_PALACE_GENERATION_REQUESTED_EVENT, eventId: `${whole?.success ? "free-reading" : "free-palace-gift"}:${requestId}`,
            occurredAt: now.toISOString(), traceId: input.traceId, actorId: null, aggregateType: "chart",
            aggregateId: lineage.chartVersionId, idempotencyKey: `${whole?.success ? "free-reading" : "free-palace-gift"}:${requestId}`,
            payload: FreePalaceGiftOutboxPayloadV1Schema.parse({ requestId }),
          });
          return { kind: "admitted", requestId, admissionDay, reservedMicroVnd: bound };
        });
      } catch (error) {
        if (error instanceof Refusal) return { kind: "refused", reason: error.reason, ...(error.budgetRefusal ? {budgetRefusal: error.budgetRefusal} : {}) };
        throw error;
      }
    },
  };
}
