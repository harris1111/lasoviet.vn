import { createHash, randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createDatabase, runMigrations, authUsers, authAnonymousActors, birthProfiles, birthProfileRevisions, calculationRuns,
  ziweiCharts, ziweiChartVersions, freeAiRequests, freeAiArtifacts, freeAiChartBudgets, freeAiDailyBudgets,
  freeAiSettlements, freeAiAdmissions, auditLogs, outbox, type Database } from "@lasoviet/database";
import { type CurrentActor, type NormalizedBirthProfileV1 } from "@lasoviet/contracts";
import { IztroAdapter } from "../../../engine-adapters/src/index.js";
import { buildFreeReadingFacts } from "./free-reading-facts.js";
import { createFreeReadingWriter, freezeFreeReadingCall } from "./free-reading-writer.js";
import { freeReadingLineage } from "./free-reading-lineage.js";
import { createFreeReadingAdmission, recordFreeAiGrowthAlert, FREE_AI_GROWTH_ALERT_ACTION, FREE_READING_GENERATION_REQUESTED_EVENT } from "./free-reading-admission.js";
import { createFreeReadingPrivateRunner } from "./free-reading-private-runner.js";
import { createFreeReadingPrivateCache } from "./free-reading-private-cache.js";
import { createFreeAiBudgetRepository } from "./free-ai-budget.repository.js";
import { createFreeAiDispatchService } from "./free-ai-dispatch.service.js";
import { createFreeAiSettlementService } from "./free-ai-settlement.service.js";
import { createFreePalaceReadService } from "./free-palace-read.service.js";
import { createFreePalaceOutboxStore } from "./free-palace-outbox.js";
import { createFreePalaceSourceCheck } from "./free-palace-runner.js";
import { purgeFreePalaceForChartVersions, createFreePalaceArtifactRepository } from "./free-palace-artifact.repository.js";
import { createDatabaseZiweiQueryRepository } from "./ziwei-query.repository.js";
import { compileFreeReadingFallback } from "./free-reading-fallback.js";
import { calculateTokenCostMicroVnd } from "../ai/ai-cost.js";

const awaitHash = (value: string) => createHash("sha256").update(value).digest("hex");
const fixed = new Date("2026-10-09T04:00:00Z");
const tariff = {id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", pricingVersion: "synthetic", providerId: "synthetic", modelId: "fixture", inputPricePerMillion: 20000, outputPricePerMillion: 100000, cachedInputPricePerMillion: 2000};
const time = {precision: "exact_minute" as const, localTime: "08:30"};
const profile: NormalizedBirthProfileV1 = {version: 1, originalInput: {version: 1, calendar: {kind: "solar", date: "1992-06-15"}, time, timezone: {offsetMinutes: 420}, gender: "male", consentVersion: "synthetic"}, normalizedCalendar: {kind: "solar", date: "1992-06-15"}, normalizedTime: time, timezoneProvenance: {source: "offset", offsetMinutes: 420}, normalizationWarnings: [], limitations: []};
describe("private whole-reading admission/cache with actual PostgreSQL", () => {
  let container: Awaited<ReturnType<PostgreSqlContainer["start"]>>, database: Database;
  let chart: Extract<Awaited<ReturnType<IztroAdapter["calculate"]>>, {ok: true}>["output"];
  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine").start();
    await runMigrations(container.getConnectionUri()); database = createDatabase(container.getConnectionUri());
    const result = await new IztroAdapter().calculate({birthProfile: profile}); if (!result.ok) throw new Error("Synthetic engine failed"); chart = result.output;
  }, 120000);
  // Isolated test-owned database only; reset financial rows to exercise exact shared ceilings.
  beforeEach(async () => {await database.execute(sql`TRUNCATE free_ai_settlements, free_ai_admissions, free_ai_artifacts, free_ai_requests, free_ai_quota_aliases, free_ai_quota_subjects, free_ai_chart_budgets, free_ai_daily_budgets, outbox, audit_logs CASCADE`);});
  afterAll(async () => {await container?.stop();}, 30000);
  async function owner(kind: "account" | "guest" = "account", userId = randomUUID()) {
    const profileId = randomUUID(), revisionId = randomUUID(), runId = randomUUID(), chartId = randomUUID(), chartVersionId = randomUUID();
    const expiresAt = new Date(fixed.getTime() + 86400000);
    if (kind === "account") await database.insert(authUsers).values({id: userId, name: "Synthetic", email: `${userId}@example.test`, emailVerified: true}).onConflictDoNothing();
    if (kind === "guest") await database.insert(authAnonymousActors).values({id: userId, expiresAt, createdAt: fixed}).onConflictDoNothing();
    await database.insert(birthProfiles).values({id: profileId, ...(kind === "account" ? {userId} : {anonymousActorId: userId, anonymousExpiresAt: expiresAt})});
    await database.insert(birthProfileRevisions).values({id: revisionId, profileId, revisionNumber: 1, originalInput: {}, normalizedInput: {}, consentVersion: "synthetic"});
    await database.insert(calculationRuns).values({id: runId, profileId, profileRevisionId: revisionId, idempotencyKey: randomUUID(), engineId: "ziwei.iztro", engineVersion: "2.6.0", adapterId: "iztro", adapterVersion: "1", schemaId: "normalized-ziwei-chart-v1", ruleSetId: "ziwei.default", inputHash: "a".repeat(64), configHash: "b".repeat(64), rawSnapshotHash: "c".repeat(64)});
    await database.insert(ziweiCharts).values({id: chartId, profileId, profileRevisionId: revisionId});
    await database.insert(ziweiChartVersions).values({id: chartVersionId, chartId, calculationRunId: runId, normalizedOutput: chart, privateRawSnapshot: {}, warnings: [], provenance: {}});
    const actor: CurrentActor = kind === "account" ? {kind: "account", userId, sessionId: "synthetic", requestId: "synthetic", emailVerified: true} : {kind: "anonymous", anonymousActorId: userId, requestId: "synthetic", expiresAt: expiresAt.toISOString()};
    return {kind, userId, chartId, chartVersionId, profileId, expiresAt, actor};
  }
  function input(o: Awaited<ReturnType<typeof owner>>, locale: "vi" | "en" = "vi") {
    const source = buildFreeReadingFacts({chart, focusPalaceId: chart.soulPalaceId, locale});
    const call = freezeFreeReadingCall({requestId: randomUUID(), chartVersionId: o.chartVersionId, source, tariff});
    const cost = {pricingSnapshotId: tariff.id, pricingVersion: tariff.pricingVersion, provider: tariff.providerId, model: tariff.modelId,
      inputPricePerMillion: BigInt(tariff.inputPricePerMillion), outputPricePerMillion: BigInt(tariff.outputPricePerMillion),
      serializedRequestHash: (awaitHash(call.serializedPrompt)), finalSerializedRequest: call.serializedPrompt,
      maxInputTokens: 16000, maxOutputTokens: 10000, semanticsVersion: "synthetic-reviewed-proof-only", reservedMicroVnd: 1_320_000_000n};
    return {call, cost, flagEnabled: true, actor: {kind: o.kind, id: o.userId, trusted: true}, concern: null, traceId: "synthetic", clock: async () => fixed,
      authorizeSource: async (tx: import("./free-ai-admission.service.js").FreeAiTransaction, at: Date) => {
        const source = await createDatabaseZiweiQueryRepository(database).readAuthorizedChart(o.actor, o.chartId, at, tx);
        return source?.chartVersionId === o.chartVersionId ? {expiresAt: o.kind === "guest" ? o.expiresAt : null} : null;
      }};
  }
  function fence(requestId: string, now = fixed) {return {requestId, flagEnabled: true, isSourceAvailable: createFreePalaceSourceCheck(), activePricingSnapshotId: async () => tariff.id, clock: async () => now};}
  function writer(unknown = false) {
    let sends = 0;
    const result = createFreeReadingWriter({expected: {provider: tariff.providerId, model: tariff.modelId},
      costRecorder: {beginAttempt: async () => ({ok: true, value: {attemptId: randomUUID(), pricing: {...tariff, currency: "VND", status: "active", effectiveFrom: fixed, source: "synthetic", sourceCurrency: "VND", sourceReference: "synthetic", fxSource: "identity", fxRate: 1, fxTimestamp: fixed, referenceMetadata: {}}}}), completeAttempt: async usage => ({ok: true, value: {outcomeId: randomUUID(), costStatus: unknown ? "unknown" : "resolved", ...(unknown ? {} : {costMicroVnd: calculateTokenCostMicroVnd({...tariff, inputTokens: usage.inputTokens!, outputTokens: usage.outputTokens!, cachedTokens: usage.cachedTokens}).toString()})}})},
      createProvider: recorder => ({generateStructured: async request => {
        const begin = await recorder.beginAttempt({callId: randomUUID(), attemptNumber: 0, providerId: tariff.providerId, requestedModelId: tariff.modelId, purpose: "free_preview", maxOutputTokens: request.maxOutputTokens, idempotencyKey: request.costContext?.idempotencyKey, costContext: request.costContext});
        if (!begin.ok) return {ok: false, error: {code: "AI_COST_RECORDING_FAILED", retryable: false}};
        sends++; await recorder.completeAttempt({attemptId: begin.value.attemptId, responseModelId: tariff.modelId, httpStatus: 200, inputTokens: 1000, outputTokens: 500, cachedTokens: 100, totalTokens: 1500, ...(unknown ? {tokensUnknown: true} : {})});
        // Frozen supplied facts are exactly the prompt payload's authorized facts; fixtures do not contact a provider.
        const source = JSON.parse(request.user).FACTS;
        return {ok: true, value: {providerId: tariff.providerId, modelId: tariff.modelId, value: compileFreeReadingFallback(source)}};
      }})});
    return {writer: result, sends: () => sends};
  }
  it("admits one chart slot across concurrent v2/locales and isolates legacy outbox claims", async () => {
    const o = await owner(), admission = createFreeReadingAdmission(database);
    const results = await Promise.all([admission.reserve(input(o)), admission.reserve(input(o, "en"))]);
    expect(results.filter(r => r.kind === "admitted")).toHaveLength(1);
    expect(await database.select().from(freeAiRequests)).toHaveLength(1); expect(await database.select().from(freeAiAdmissions)).toHaveLength(1);
    expect(await createFreePalaceOutboxStore(database, "legacy", {now: () => fixed}).claim()).toBeNull();
    expect((await database.select().from(outbox))[0]?.eventType).toBe(FREE_READING_GENERATION_REQUESTED_EVENT);
  });
  it("does not regrant a legacy consumed slot or modified v2 lineage", async () => {
    const o = await owner(), prepared = input(o), budget = createFreeAiBudgetRepository(database);
    expect((await budget.reserve({...prepared, lineage: freeReadingLineage(prepared.call)})).kind).toBe("admitted");
    expect((await createFreeReadingAdmission(database).reserve(input(o))).kind).toBe("fallback");
    expect(await database.select().from(freeAiRequests)).toHaveLength(1);
  });
  it("runs concurrent workers once, stores an unaccepted private draft and prevents legacy/outsider/other-locale reads", async () => {
    const o = await owner(), i = input(o); expect((await createFreeReadingAdmission(database).reserve(i)).kind).toBe("admitted");
    await database.update(outbox).set({availableAt: fixed});
    const w = writer(), runner = (id: string) => createFreeReadingPrivateRunner({database, workerId: id, writer: w.writer, flagEnabled: () => true, isSourceAvailable: createFreePalaceSourceCheck(), activePricingSnapshotId: async () => tariff.id, now: () => fixed});
    await Promise.all([runner("a").runOnce(), runner("b").runOnce()]); expect(w.sends()).toBe(1);
    const cache = createFreeReadingPrivateCache(database), draft = await cache.readDraft(o.actor, o.chartId, "vi", {clock: () => fixed});
    expect(draft).toMatchObject({status: "draft", manualAccepted: false});
    expect(await cache.readDraft({...o.actor, kind: "account", userId: "other", sessionId: "other"} as CurrentActor, o.chartId, "vi", {clock: () => fixed})).toBeNull();
    expect(await cache.readDraft(o.actor, o.chartId, "en", {clock: () => fixed})).toBeNull();
    expect(await createFreePalaceReadService({database, now: () => fixed, currentLineageHash: () => "unsupported"}).read(o.actor, o.chartId, "vi")).toMatchObject({ok: true, value: {status: "unavailable"}});
    expect((await database.select().from(freeAiSettlements))[0]?.actualMicroVnd).toBe(68_200_000n);
    expect((await createFreeReadingAdmission(database).reserve(input(o))).kind).toBe("cache");
    await database.update(outbox).set({status: "pending", availableAt: fixed, leasedBy: null, leasedUntil: null});
    await runner("restart").runOnce(); expect(w.sends()).toBe(1);
  });
  it("keeps unknown usage across midnight and never retries after redelivery", async () => {
    const o = await owner(), i = input(o); await createFreeReadingAdmission(database).reserve(i);
    await database.update(outbox).set({availableAt: fixed});
    const w = writer(true), runner = createFreeReadingPrivateRunner({database, workerId: "unknown", writer: w.writer, flagEnabled: () => true, isSourceAvailable: createFreePalaceSourceCheck(), activePricingSnapshotId: async () => tariff.id, now: () => fixed});
    await runner.runOnce(); expect(w.sends()).toBe(1);
    expect((await database.select().from(freeAiRequests))[0]?.status).toBe("cost_unknown");
    expect((await database.select().from(freeAiDailyBudgets))[0]?.unknownMicroVnd).toBe(i.cost.reservedMicroVnd);
    expect(await createFreeReadingPrivateCache(database).readDraft(o.actor, o.chartId, "vi", {clock: () => fixed})).toBeNull();
    await database.update(outbox).set({status: "pending", availableAt: fixed, leasedBy: null, leasedUntil: null}); await runner.runOnce(); expect(w.sends()).toBe(1);
  });
  it("purges the complete v2 frozen source/draft and refuses late cache resurrection", async () => {
    const o = await owner(), i = input(o); await createFreeReadingAdmission(database).reserve(i);
    const f = await createFreeAiDispatchService(database, {mode: "whole_reading_v2"}).fence(fence(i.call.requestId)); if (f.kind !== "fenced") throw new Error("Fence refused");
    const draft = await writer().writer.run(i.call);
    await createFreeAiSettlementService(database).settle({requestId: i.call.requestId, attemptId: f.attemptId, settlement: draft.settlement, clock: async () => fixed});
    await database.transaction(tx => purgeFreePalaceForChartVersions(tx, [o.chartVersionId], fixed));
    expect(await createFreeReadingPrivateCache(database).saveDraft({requestId: i.call.requestId, attemptId: f.attemptId, candidate: draft.candidate, clock: async () => fixed})).toEqual({kind: "refused"});
    expect((await database.select().from(freeAiArtifacts))[0]).toMatchObject({frozenCall: null, content: null, facts: null, contentHash: null});
    expect((await createFreeReadingAdmission(database).reserve(input(o))).kind).toBe("refused");
  });
  it("expires guest private payloads within24h without resetting accounting or a new locale slot", async () => {
    const o = await owner("guest"), i = input(o); await createFreeReadingAdmission(database).reserve(i);
    const after = new Date(o.expiresAt.getTime());
    expect((await createFreeAiDispatchService(database, {mode: "whole_reading_v2"}).fence(fence(i.call.requestId, after))).kind).toBe("cancelled");
    expect(await createFreePalaceArtifactRepository(database).purgeExpiredPayloads({limit: 10, clock: async () => after})).toBe(1);
    expect((await database.select().from(freeAiArtifacts))[0]?.frozenCall).toBeNull();
    expect(await database.select().from(freeAiRequests)).toHaveLength(1);
    expect((await database.select().from(freeAiChartBudgets))[0]?.reservedMicroVnd).toBe(0n);
  });
  it("records one redacted daily growth signal on concurrent daily-ceiling refusals", async () => {
    await database.insert(freeAiDailyBudgets).values({utcDay: "2026-10-09", resolvedMicroVnd: 49_000_000_000n});
    const a = await owner(), b = await owner(), admission = createFreeReadingAdmission(database);
    const results = await Promise.all([admission.reserve(input(a)), admission.reserve(input(b))]);
    expect(results).toMatchObject([{kind: "refused", reason: "daily_budget_exhausted"}, {kind: "refused", reason: "daily_budget_exhausted"}]);
    const signals = await database.select().from(auditLogs).where(eq(auditLogs.action, FREE_AI_GROWTH_ALERT_ACTION)); expect(signals).toHaveLength(1);
    expect(signals[0]?.metadata).toEqual({utcDay: "2026-10-09", ceilingMicroVnd: "50000000000", exposureMicroVnd: "49000000000", requestedMicroVnd: "1320000000"});
    expect(JSON.stringify(signals)).not.toContain(a.userId); expect(await database.select().from(freeAiRequests)).toHaveLength(0);
  });

  it("pins refusal alerts across midnight and permits the next day's genuine alert", async () => {
    await database.insert(freeAiDailyBudgets).values({utcDay: "2026-10-09", resolvedMicroVnd: 49_000_000_000n});
    const o = await owner(), prepared = input(o), before = new Date("2026-10-09T23:59:59Z"), after = new Date("2026-10-10T00:00:00Z");
    let samples = 0;
    const result = await createFreeReadingAdmission(database).reserve({...prepared, clock: async () => ++samples === 1 ? before : after});
    expect(result).toMatchObject({kind: "refused", budgetRefusal: {utcDay: "2026-10-09", exposureMicroVnd: "49000000000"}});
    // The audit must not sample a later clock or read a different day's now-empty ledger.
    expect(samples).toBe(1);
    if (result.kind !== "refused" || !result.budgetRefusal) throw new Error("Expected budget refusal");
    await recordFreeAiGrowthAlert(database, result.budgetRefusal);
    await database.insert(freeAiDailyBudgets).values({utcDay: "2026-10-10", resolvedMicroVnd: 49_000_000_000n});
    expect(await createFreeReadingAdmission(database).reserve({...input(await owner()), clock: async () => after})).toMatchObject({kind: "refused", budgetRefusal: {utcDay: "2026-10-10"}});
    const signals = await database.select().from(auditLogs).where(eq(auditLogs.action, FREE_AI_GROWTH_ALERT_ACTION));
    expect(signals).toHaveLength(2);
    expect(signals.map(s => s.targetId).sort()).toEqual(["free-ai-daily:2026-10-09", "free-ai-daily:2026-10-10"]);
    expect(signals.every(s => (s.metadata as {exposureMicroVnd: string}).exposureMicroVnd === "49000000000")).toBe(true);
  });

  it("shares guest1/account3 rolling admissions across new charts and locales", async () => {
    const admission = createFreeReadingAdmission(database), guestId = randomUUID(), accountId = randomUUID();
    expect((await admission.reserve(input(await owner("guest", guestId)))).kind).toBe("admitted");
    expect(await admission.reserve(input(await owner("guest", guestId), "en"))).toEqual({kind: "refused", reason: "quota_exhausted"});
    for (let i = 0; i < 3; i++) expect((await admission.reserve(input(await owner("account", accountId), i % 2 ? "en" : "vi"))).kind).toBe("admitted");
    expect(await admission.reserve(input(await owner("account", accountId)))).toEqual({kind: "refused", reason: "quota_exhausted"});
    expect(await database.select().from(freeAiAdmissions)).toHaveLength(4);
  });
  it("keeps historical chart exposure inside the3000VND ceiling", async () => {
    const o = await owner();
    await database.insert(freeAiChartBudgets).values({chartVersionId: o.chartVersionId, resolvedMicroVnd: 2_000_000_000n, legacyReconciledAt: fixed});
    expect(await createFreeReadingAdmission(database).reserve(input(o))).toEqual({kind: "refused", reason: "chart_budget_exhausted"});
    expect((await database.select().from(freeAiChartBudgets))[0]?.resolvedMicroVnd).toBe(2_000_000_000n);
    expect(await database.select().from(freeAiRequests)).toHaveLength(0);
  });
  it("cancels an unfenced changed tariff without granting a replacement chart slot", async () => {
    const o = await owner(), i = input(o); await createFreeReadingAdmission(database).reserve(i);
    expect(await createFreeAiDispatchService(database, {mode: "whole_reading_v2"}).fence({...fence(i.call.requestId), activePricingSnapshotId: async () => randomUUID()})).toEqual({kind: "cancelled", reason: "pricing_changed"});
    expect((await database.select().from(freeAiChartBudgets))[0]?.reservedMicroVnd).toBe(0n);
    expect((await createFreeReadingAdmission(database).reserve(input(o))).kind).toBe("fallback");
    expect(await database.select().from(freeAiRequests)).toHaveLength(1);
  });
  it("rechecks next-day exposure before moving a queued hold and releases it exactly once", async () => {
    const o = await owner(), i = input(o); await createFreeReadingAdmission(database).reserve(i);
    await database.insert(freeAiDailyBudgets).values({utcDay: "2026-10-10", resolvedMicroVnd: 49_000_000_000n});
    const result = await createFreeAiDispatchService(database, {mode: "whole_reading_v2"}).fence(fence(i.call.requestId, new Date("2026-10-10T04:00:00Z")));
    expect(result).toEqual({kind: "cancelled", reason: "daily_budget_exhausted", budgetRefusal: {utcDay: "2026-10-10", exposureMicroVnd: "49000000000", requestedMicroVnd: "1320000000"}});
    expect((await database.select().from(freeAiChartBudgets))[0]?.reservedMicroVnd).toBe(0n);
    expect((await database.select().from(freeAiDailyBudgets)).every(row => row.reservedMicroVnd === 0n)).toBe(true);
    expect((await createFreeAiDispatchService(database, {mode: "whole_reading_v2"}).fence(fence(i.call.requestId))).kind).toBe("not_dispatchable");
  });
  it("records an actual overshoot without clamping it and halts subsequent whole-reading admission", async () => {
    const o = await owner(), i = input(o); await createFreeReadingAdmission(database).reserve(i);
    const f = await createFreeAiDispatchService(database, {mode: "whole_reading_v2"}).fence(fence(i.call.requestId)); if (f.kind !== "fenced") throw new Error("Fence refused");
    const actual = i.cost.reservedMicroVnd + 1n;
    expect(await createFreeAiSettlementService(database).settle({requestId: i.call.requestId, attemptId: f.attemptId, settlement: {kind: "resolved", actualMicroVnd: actual, disposition: "failed"}, clock: async () => fixed})).toMatchObject({kind: "settled", overshootMicroVnd: 1n});
    expect((await database.select().from(freeAiSettlements))[0]?.actualMicroVnd).toBe(actual);
    expect(await createFreeReadingAdmission(database).reserve(input(await owner()))).toEqual({kind: "refused", reason: "dispatch_halted"});
  });
  it("refuses unbound tariffs/source/lineage and never admits a new slot with the flag off", async () => {
    const o = await owner(), i = input(o), admission = createFreeReadingAdmission(database);
    expect((await admission.reserve({...i, flagEnabled: false}))).toEqual({kind: "refused", reason: "flag_disabled"});
    expect((await admission.reserve({...i, cost: {...i.cost, reservedMicroVnd: 1n}}))).toEqual({kind: "refused", reason: "invalid_reservation"});
    expect((await admission.reserve({...i, call: {...i.call, sourceHash: "0".repeat(64)}}))).toEqual({kind: "refused", reason: "invalid_reservation"});
    expect((await admission.reserve({...i, cost: {...i.cost, pricingSnapshotId: randomUUID()}}))).toEqual({kind: "refused", reason: "invalid_reservation"});
    expect(await database.select().from(freeAiRequests)).toHaveLength(0);
  });
});
