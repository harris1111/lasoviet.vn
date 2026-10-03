import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createDatabaseAiCostService } from "../../packages/backend/src/ai/ai-cost.js";
import { createAiProductionGate, createOpenAiCompatibleAdapter } from "../../packages/backend/src/ai/openai-compatible-adapter.js";
import { createDatabaseOutboxStore } from "../../packages/backend/src/outbox/outbox.dispatcher.js";
import { createFreeAiBudgetRepository } from "../../packages/backend/src/ziwei/free-ai-budget.repository.js";
import { createFreeAiDispatchService } from "../../packages/backend/src/ziwei/free-ai-dispatch.service.js";
import { createFreeAiSettlementService } from "../../packages/backend/src/ziwei/free-ai-settlement.service.js";
import { createFreePalaceArtifactRepository } from "../../packages/backend/src/ziwei/free-palace-artifact.repository.js";
import { createFreePalaceOutboxStore } from "../../packages/backend/src/ziwei/free-palace-outbox.js";
import { createFreePalaceRunner, createFreePalaceSourceCheck, createFreePalaceTariffPort } from "../../packages/backend/src/ziwei/free-palace-runner.js";
import { buildFreePalacePrompt, createFreePalaceWriter, serializeFreePalacePrompt } from "../../packages/backend/src/ziwei/free-palace-writer.js";
import { MICRO, costContext, lineage, raceBehindLock, seedChartVersion, startFreeAiDatabase, type TestDatabase } from "./free-ai-test-harness.js";

type Harness = Awaited<ReturnType<typeof startFreeAiDatabase>>;
const VND = (n: number) => BigInt(n) * MICRO;
const TABLES = ["outbox", "free_ai_artifacts", "free_ai_settlements", "free_ai_admissions", "free_ai_requests", "free_ai_quota_aliases", "free_ai_quota_subjects", "free_ai_daily_budgets", "free_ai_chart_budgets", "audit_logs"];
const facts = [{ key: "fact:one", label: "Cung Mệnh", value: "Sao Tử Vi ở thế vượng" }, { key: "fact:two", label: "Cung Mệnh", value: "Sao Thiên Phủ hội chiếu" }];
const point = (text: string, key = "fact:one") => ({ text, evidenceKeys: [key] });
const prose = "Bạn là người có xu hướng giữ vai trò dẫn dắt trong những nhóm nhỏ, và điều đó thường bắt nguồn từ cách bạn cân nhắc kỹ trước khi quyết định. ".repeat(5);
const goodContent = (over: Record<string, unknown> = {}) => ({
  palaceId: "ziwei.palace.life", title: "Cái cốt lõi của bạn", conclusion: "Cung Mệnh của bạn nghiêng về sự chủ động có cân nhắc.",
  keyPoints: [point("Bạn thích tự mình sắp xếp trình tự công việc."), point("Bạn cần thời gian trước khi chốt một lựa chọn lớn."), point("Bạn dễ được người khác tin cậy.", "fact:two")],
  narrative: prose, do: [point("Dành một buổi mỗi tuần để rà soát ưu tiên.")], avoid: [point("Tránh ôm hết mọi việc về mình.")], evidenceKeys: ["fact:one", "fact:two"], ...over,
});
const reply = (content: unknown, usage: Record<string, number> | null = { prompt_tokens: 1000, completion_tokens: 500, total_tokens: 1500 }, status = 200) =>
  new Response(JSON.stringify({ model: "gift-model", choices: [{ message: { content: JSON.stringify(content) } }], ...(usage ? { usage } : {}) }), { status, headers: { "content-type": "application/json" } });

describe("free palace outbox, runner and end-to-end fake provider path (real Postgres)", () => {
  let h: Harness;
  let main: TestDatabase;
  let pricingId: string;
  let seq = 0;
  let attempts = 0;
  let behaviour: () => Promise<Response> = async () => reply(goodContent());
  beforeAll(async () => {
    h = await startFreeAiDatabase();
    main = h.connect();
    const [row] = await h.raw`INSERT INTO ai_model_pricing(pricing_version,provider_id,model_id,currency,input_price_per_million,output_price_per_million,cached_input_price_per_million,effective_from,source,source_currency,source_reference,fx_source,fx_rate,fx_timestamp,status)
      VALUES ('v1','9router-an','gift-model','VND',15000,60000,3750,'2026-01-01','approved','VND','founder','direct',1,'2026-01-01','active') RETURNING id`;
    pricingId = row!.id;
  }, 180000);
  afterAll(async () => { if (h) await h.stop(); });
  beforeEach(async () => {
    for (const table of TABLES) await h.raw.unsafe(`DELETE FROM ${table}`);
    attempts = 0;
    behaviour = async () => reply(goodContent());
  });

  function makeRunner(database: TestDatabase, over: { flagEnabled?: () => boolean; isSourceAvailable?: Parameters<typeof createFreePalaceRunner>[0]["isSourceAvailable"]; workerId?: string; now?: () => Date } = {}) {
    const tariff = createFreePalaceTariffPort(database);
    const writer = createFreePalaceWriter({
      costRecorder: createDatabaseAiCostService(database as never).recorder, loadTariff: tariff.loadTariff,
      createProvider: (recorder) => createOpenAiCompatibleAdapter({
        baseUrl: "https://ai.synthetic.test/v1", apiKey: "not-a-real-secret", modelId: "gift-model", allowedResolvedModelIds: ["gift-model"], timeoutMs: 2000,
        retryCount: 0, productionGate: createAiProductionGate("approved"), costRecorder: recorder,
        fetchImpl: async () => { attempts += 1; return behaviour(); },
      }),
    });
    return createFreePalaceRunner({
      store: createFreePalaceOutboxStore(database as never, over.workerId ?? "worker-a", { now: over.now }), dispatch: createFreeAiDispatchService(database as never), writer,
      artifacts: createFreePalaceArtifactRepository(database as never), flagEnabled: over.flagEnabled ?? (() => true),
      isSourceAvailable: over.isSourceAvailable ?? (async () => true), activePricingSnapshotId: tariff.activePricingSnapshotId,
    });
  }
  async function admit(chart = `o-${++seq}`, actorId = `actor-${seq}`) {
    const prompt = buildFreePalacePrompt({ locale: "vi", palaceId: "ziwei.palace.life", palaceLabel: "cung Mệnh", facts, concern: null });
    const result = await createFreeAiBudgetRepository(h.connect()).reserve({
      flagEnabled: true, actor: { kind: "account", id: actorId, trusted: true }, lineage: lineage(chart, { provider: "9router-an", model: "gift-model" }), concern: null,
      cost: costContext(VND(500), { provider: "9router-an", model: "gift-model", pricingSnapshotId: pricingId, finalSerializedRequest: serializeFreePalacePrompt(prompt), maxOutputTokens: 2000 }),
      traceId: "t", authorizeSource: async () => ({ expiresAt: null }),
    });
    if (result.kind !== "admitted") throw new Error(`setup admission failed: ${JSON.stringify(result)}`);
    return { requestId: result.requestId, chart };
  }
  const request = async (id: string) => (await h.raw`SELECT status FROM free_ai_requests WHERE id=${id}`)[0]!.status as string;
  const outboxRow = async () => (await h.raw`SELECT status, last_error_code, available_at FROM outbox`)[0]!;

  it("end to end: admission event → runner → fence → one attempt → settle → publish → ready", async () => {
    const { requestId } = await admit();
    expect(await makeRunner(main).runOnce()).toEqual({ processed: 1 });
    expect(attempts).toBe(1);
    expect(await request(requestId)).toBe("ready");
    const [artifact] = await h.raw`SELECT content->>'palaceId' AS palace, content_hash FROM free_ai_artifacts WHERE request_id=${requestId}`;
    expect(artifact).toMatchObject({ palace: "ziwei.palace.life" });
    const [settlement] = await h.raw`SELECT outcome, actual_micro_vnd::text AS actual FROM free_ai_settlements WHERE request_id=${requestId}`;
    expect(settlement).toEqual({ outcome: "resolved", actual: (1000n * 15000n + 500n * 60000n).toString() });
    const [chartBudget] = await h.raw`SELECT reserved_micro_vnd::text r, resolved_micro_vnd::text s FROM free_ai_chart_budgets`;
    expect(chartBudget).toEqual({ r: "0", s: "45000000" });
    expect((await outboxRow()).status).toBe("processed");
  });

  it("row 38: the gift event is claimed by its runner and ignored by the paid dispatcher", async () => {
    await admit();
    expect(await createDatabaseOutboxStore(main, "paid-worker").claim()).toBeNull();
    expect((await outboxRow()).status).toBe("pending");
    const claimed = await createFreePalaceOutboxStore(main, "gift-worker").claim();
    expect(claimed?.requestId).toBeTruthy();
    expect((await outboxRow()).status).toBe("leased");
  });

  it("row 39: duplicate delivery and two racing workers still send exactly one physical attempt", async () => {
    const { requestId } = await admit();
    const results = await raceBehindLock(h.rawClient(), [
      () => makeRunner(h.connect(), { workerId: "w1" }).runOnce(), () => makeRunner(h.connect(), { workerId: "w2" }).runOnce(),
    ]);
    expect(results.reduce((sum, r) => sum + r.processed, 0)).toBe(1); // only one worker could claim the event
    expect(attempts).toBe(1);
    await h.raw`UPDATE outbox SET status='pending', leased_by=NULL, leased_until=NULL, processed_at=NULL`; // redelivery
    expect(await makeRunner(main, { workerId: "w3" }).runOnce()).toEqual({ processed: 1 });
    await h.raw`UPDATE outbox SET status='leased', leased_by='w9', leased_until=now() - interval '1 second'`; // lease expired
    expect(await makeRunner(main, { workerId: "w4" }).runOnce()).toEqual({ processed: 1 });
    expect(attempts).toBe(1);
    expect(await request(requestId)).toBe("ready");
  });

  it("worker restart after a fence crash never sends; the abandoned fence settles as unknown exposure", async () => {
    const { requestId } = await admit();
    const tariff = createFreePalaceTariffPort(main);
    expect((await createFreeAiDispatchService(main).fence({ requestId, flagEnabled: true, isSourceAvailable: async () => true, activePricingSnapshotId: tariff.activePricingSnapshotId })).kind).toBe("fenced");
    expect(await makeRunner(main).runOnce()).toEqual({ processed: 1 });
    expect(attempts).toBe(0);
    expect(await request(requestId)).toBe("dispatching");
    await h.raw`UPDATE free_ai_requests SET fenced_at = now() - interval '2 hours' WHERE id=${requestId}`;
    expect(await createFreeAiSettlementService(main).settleAbandoned({ staleAfterMs: 3_600_000, limit: 5 })).toBe(1);
    expect(await request(requestId)).toBe("cost_unknown");
    expect(attempts).toBe(0);
  });

  it("a dead source cancels before any provider call and releases the hold", async () => {
    const { requestId } = await admit();
    await makeRunner(main, { isSourceAvailable: async () => false }).runOnce();
    expect(attempts).toBe(0);
    expect(await request(requestId)).toBe("cancelled");
    expect((await h.raw`SELECT reserved_micro_vnd::text r FROM free_ai_chart_budgets`)[0]!.r).toBe("0");
    expect((await outboxRow()).status).toBe("processed");
  });

  it("the real source check follows existence, soft deletion and the guest TTL", async () => {
    const check = createFreePalaceSourceCheck();
    await seedChartVersion(main, "src-account", { kind: "account", userId: "src-user" });
    await seedChartVersion(main, "src-live-guest", { kind: "guest", anonymousActorId: "src-guest-1", expiresAt: new Date(Date.now() + 3_600_000) });
    await seedChartVersion(main, "src-expired-guest", { kind: "guest", anonymousActorId: "src-guest-2", expiresAt: new Date(Date.now() - 1000) });
    await seedChartVersion(main, "src-deleted", { kind: "account", userId: "src-user" }, { profileDeletedAt: new Date() });
    const at = (id: string) => main.transaction((tx) => check(tx, new Date(), id));
    expect([await at("src-account"), await at("src-live-guest"), await at("src-expired-guest"), await at("src-deleted"), await at("src-missing")]).toEqual([true, true, false, false, false]);
  });

  it("unknown usage capture keeps the hold, publishes nothing and never retries", async () => {
    behaviour = async () => reply(goodContent(), null);
    const { requestId } = await admit();
    await makeRunner(main).runOnce();
    expect(attempts).toBe(1);
    expect(await request(requestId)).toBe("cost_unknown");
    expect((await h.raw`SELECT content FROM free_ai_artifacts WHERE request_id=${requestId}`)[0]!.content).toBeNull();
    expect((await h.raw`SELECT unknown_micro_vnd::text u FROM free_ai_chart_budgets`)[0]!.u).toBe(VND(500).toString());
  });

  it("a provider error and a transport failure are single attempts that settle as unknown", async () => {
    behaviour = async () => reply({ error: "busy" }, null, 500);
    const a = await admit();
    await makeRunner(main).runOnce();
    behaviour = async () => { throw new TypeError("socket hang up"); };
    const b = await admit();
    await makeRunner(main).runOnce();
    expect(attempts).toBe(2);
    expect([await request(a.requestId), await request(b.requestId)]).toEqual(["cost_unknown", "cost_unknown"]);
  });

  it("a quality failure is billed, falls back to terminal_failure and is not retried", async () => {
    behaviour = async () => reply(goodContent({ narrative: `${prose} Bạn dễ mắc ung thư nếu không cẩn thận.` }));
    const { requestId } = await admit();
    await makeRunner(main).runOnce();
    expect(attempts).toBe(1);
    expect(await request(requestId)).toBe("terminal_failure");
    expect((await h.raw`SELECT resolved_micro_vnd::text s FROM free_ai_chart_budgets`)[0]!.s).toBe("45000000");
    expect((await h.raw`SELECT content FROM free_ai_artifacts WHERE request_id=${requestId}`)[0]!.content).toBeNull();
  });

  it("flag off: nothing is claimed; a flag that flips off before the fence defers the event", async () => {
    await admit();
    expect(await makeRunner(main, { flagEnabled: () => false }).runOnce()).toEqual({ processed: 0 });
    expect((await outboxRow()).status).toBe("pending");
    let calls = 0;
    await makeRunner(main, { flagEnabled: () => ++calls === 1 }).runOnce();
    const row = await outboxRow();
    expect(row).toMatchObject({ status: "pending", last_error_code: "FREE_PALACE_FLAG_OFF" });
    expect(new Date(row.available_at).getTime()).toBeGreaterThan(Date.now());
    expect(attempts).toBe(0);
  });

  it("a malformed gift event is parked as failed, not looped", async () => {
    await h.raw`INSERT INTO outbox(schema_version,event_type,event_id,occurred_at,trace_id,aggregate_type,aggregate_id,idempotency_key,payload)
      VALUES (1,'free_palace.generation.requested.v1','bad-1',now(),'t','chart','c','bad-1','{"nope":true}'::jsonb)`;
    expect(await makeRunner(main).runOnce()).toEqual({ processed: 1 });
    expect(await outboxRow()).toMatchObject({ status: "failed", last_error_code: "FREE_PALACE_EVENT_INVALID" });
  });

  it("a charged result that was never published ends terminally via the stale-publication sweep", async () => {
    const { requestId } = await admit();
    const tariff = createFreePalaceTariffPort(main);
    const fence = await createFreeAiDispatchService(main).fence({ requestId, flagEnabled: true, isSourceAvailable: async () => true, activePricingSnapshotId: tariff.activePricingSnapshotId });
    if (fence.kind !== "fenced") throw new Error("fence failed");
    await createFreeAiSettlementService(main).settle({ requestId, attemptId: fence.attemptId, settlement: { kind: "resolved", actualMicroVnd: VND(100), disposition: "publishable" } });
    await h.raw`UPDATE free_ai_requests SET settled_at = now() - interval '2 hours' WHERE id=${requestId}`;
    expect(await createFreePalaceArtifactRepository(main).closeStalePublications({ staleAfterMs: 3_600_000, limit: 5 })).toBe(1);
    expect(await request(requestId)).toBe("terminal_failure");
  });
});
