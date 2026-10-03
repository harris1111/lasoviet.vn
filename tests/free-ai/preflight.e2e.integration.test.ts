import { createHash } from "node:crypto";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { CurrentActor } from "../../packages/contracts/src/index.js";
import { loadEnvironment } from "../../packages/config/src/index.js";
import { composeFreePalaceForApi } from "../../apps/api/src/free-palace-composition.js";
import { createFreePalaceGiftMaintenanceRunner, createFreePalaceGiftRunner } from "../../apps/worker/src/worker.module.js";
import { createFreePalaceRequestService } from "../../packages/backend/src/ziwei/free-palace-request.service.js";
import { createFreePalaceTariffPort } from "../../packages/backend/src/ziwei/free-palace-runner.js";
import { createDatabaseZiweiQueryRepository } from "../../packages/backend/src/ziwei/ziwei-query.repository.js";
import { createZiweiCalculationService } from "../../packages/backend/src/ziwei/ziwei.service.js";
import { createZiweiQueryService } from "../../packages/backend/src/ziwei/ziwei-query.service.js";
import { createFreePalaceReadService } from "../../packages/backend/src/ziwei/free-palace-read.service.js";
import { currentFreePalaceLineageHash } from "../../packages/backend/src/ziwei/free-palace-request.service.js";
import { seedChartVersion, startFreeAiDatabase, type TestDatabase } from "./free-ai-test-harness.js";

type Harness = Awaited<ReturnType<typeof startFreeAiDatabase>>;
const TABLES = ["outbox", "free_ai_artifacts", "free_ai_settlements", "free_ai_admissions", "free_ai_requests", "free_ai_quota_aliases", "free_ai_quota_subjects", "free_ai_daily_budgets", "free_ai_chart_budgets"];
const branches = ["rat", "ox", "tiger", "rabbit", "dragon", "snake", "horse", "goat", "monkey", "rooster", "dog", "pig"];
const palaces = ["life", "siblings", "spouse", "children", "wealth", "health", "travel", "friends", "career", "property", "fortune", "parents"];
const chart = {
  version: 1, systemId: "ziwei", soulPalaceId: "ziwei.palace.life", bodyPalaceId: "ziwei.palace.career", horoscopeCapabilities: [{ id: "ziwei.horoscope.annual", supported: true }], warnings: [],
  provenance: { version: 1, engineId: "e", engineVersion: "1", adapterId: "a", adapterVersion: "1", schemaId: "s", ruleSetId: "r", inputHash: "a".repeat(64), configHash: "b".repeat(64), rawSnapshotHash: "c".repeat(64), calculatedAt: "2026-10-03T00:00:00+07:00", limitations: [] },
  transformations: [{ starId: "ziwei.star.ziwei", id: "ziwei.transformation.power" }],
  palaces: palaces.map((name, index) => ({ id: `ziwei.palace.${name}`, earthlyBranchId: `ziwei.branch.${branches[index]}`,
    stars: name === "life" ? [{ id: "ziwei.star.ziwei", brightness: "ziwei.brightness.exalted", category: "major" }, { id: "ziwei.star.tianfu", brightness: "ziwei.brightness.prosperous", category: "major" }] : [] })),
};
const point = (text: string, keys: string[]) => ({ text, evidenceKeys: keys });
const prose = "Bạn là người có xu hướng giữ vai trò dẫn dắt trong những nhóm nhỏ, và điều đó thường bắt nguồn từ cách bạn cân nhắc kỹ trước khi quyết định. ".repeat(5);
const content = {
  palaceId: "ziwei.palace.life", title: "Cái cốt lõi của bạn", conclusion: "Cung Mệnh của bạn nghiêng về sự chủ động có cân nhắc.",
  keyPoints: [point("Bạn thích tự mình sắp xếp trình tự công việc.", ["palace:life"]), point("Bạn cần thời gian trước khi chốt một lựa chọn lớn.", ["palace:life:star:ziwei"]), point("Bạn dễ được người khác tin cậy.", ["palace:life:star:tianfu"])],
  narrative: prose, do: [point("Dành một buổi mỗi tuần để rà soát ưu tiên.", ["palace:life"])], avoid: [point("Tránh ôm hết mọi việc về mình.", ["palace:life:star:ziwei"])],
  evidenceKeys: ["palace:life", "palace:life:star:ziwei", "palace:life:star:tianfu"],
};

describe("B20 preflight: chart completion → request → outbox → worker → fence → attempt → settle → publish → authorized read (real Postgres, fake provider)", () => {
  let h: Harness;
  let main: TestDatabase;
  let attempts = 0;
  let seq = 0;
  let model = "";
  const original = { ...process.env };
  beforeAll(async () => { h = await startFreeAiDatabase(); main = h.connect(); }, 180000);
  afterAll(async () => { if (h) await h.stop(); });
  beforeEach(async () => {
    for (const table of TABLES) await h.raw.unsafe(`DELETE FROM ${table}`);
    attempts = 0;
    model = `preflight-model-${++seq}`;
    process.env = {
      NODE_ENV: "test", SEPAY_ENV: "disabled", DATABASE_URL: h.uri, FREE_PALACE_GENERATION_ENABLED: "true",
      AI_BASE_URL: "https://ai.synthetic.test/v1", AI_API_KEY: "not-a-real-secret", AI_MODEL: model, AI_ALLOWED_RESOLVED_MODELS: model,
      AI_TIMEOUT: "3000", AI_MAX_RETRIES: "3", AI_FEATURE_JSON_SCHEMA: "true", AI_FEATURE_TOOL_CALLING: "false", AI_PRODUCTION_ENABLED: "true",
    };
  });
  afterEach(() => { process.env = { ...original }; });

  const seedPricing = async (forModel = model, effectiveFrom = "2026-01-01") => (await h.raw`INSERT INTO ai_model_pricing(pricing_version,provider_id,model_id,currency,input_price_per_million,output_price_per_million,cached_input_price_per_million,effective_from,source,source_currency,source_reference,fx_source,fx_rate,fx_timestamp,status)
    VALUES (${"v-" + forModel + effectiveFrom},'9router-an',${forModel},'VND',15000,60000,3750,${effectiveFrom},'approved','VND','founder','direct',1,'2026-01-01','active') RETURNING id`)[0]!.id as string;
  const fetchImpl = (async () => {
    attempts += 1;
    return new Response(JSON.stringify({ model, choices: [{ message: { content: JSON.stringify(content) } }], usage: { prompt_tokens: 1200, completion_tokens: 600, total_tokens: 1800 } }), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  const account = (userId: string): CurrentActor => ({ kind: "account", userId, sessionId: "s", requestId: "r", emailVerified: true });
  const proofFor = ({ serializedRequest, maxOutputTokens }: { serializedRequest: string; maxOutputTokens: number }) => ({
    serializedRequestHash: createHash("sha256").update(serializedRequest).digest("hex"), maxInputTokens: 6000, enforcedMaxOutputTokens: maxOutputTokens, semanticsVersion: "preflight-fake-adapter-v1",
  });

  // The API composition is real; ONLY the proof supplier is replaced, because production has none by design.
  function api() {
    const environment = loadEnvironment(process.env);
    if (!environment.ok) throw new Error("preflight environment invalid");
    const composition = composeFreePalaceForApi(environment.value, main as never);
    const request = createFreePalaceRequestService({
      database: main as never, sources: createDatabaseZiweiQueryRepository(main as never), flagEnabled: () => environment.value.freePalaceGenerationEnabled === true,
      provider: "9router-an", model, loadActiveTariff: createFreePalaceTariffPort(main as never).loadActiveTariff, boundProofFor: proofFor,
    });
    return { composition, request };
  }
  async function chartComplete(userId: string, hook: (actor: CurrentActor, v: { chartId: string }) => Promise<unknown>) {
    const chartVersionId = `preflight-chart-${seq}-${userId}`;
    const { chartId } = await seedChartVersion(main, chartVersionId, { kind: "account", userId }, { normalizedOutput: chart });
    const calc = createZiweiCalculationService({
      repository: {
        async readAuthorizedRevision() { return { profileId: "p", revisionId: "r", normalized: { version: 1, originalInput: { version: 1, calendar: { kind: "solar", date: "1990-01-01" }, time: { precision: "exact_minute", localTime: "12:00" }, timezone: { offsetMinutes: 420 }, gender: "male", consentVersion: "2026-09-01" }, normalizedCalendar: { kind: "solar", date: "1990-01-01" }, normalizedTime: { precision: "exact_minute", localTime: "12:00" }, timezoneProvenance: { source: "offset", offsetMinutes: 420 }, utcInstant: "1990-01-01T05:00:00.000Z", normalizationWarnings: [], limitations: [] } as never }; },
        async create() { return { chartId, chartVersionId, reused: false }; },
      },
      evidenceService: { async buildAndPersist() { return { ok: true as const }; } },
      engine: { async calculateWithPrivateSnapshot() { return { result: { ok: true as const, output: chart as never, provenance: chart.provenance as never, warnings: [] }, rawSnapshot: {} }; } },
      onChartReady: hook,
    });
    return { chartId, chartVersionId, calc };
  }
  const query = (reader: ReturnType<typeof createFreePalaceReadService>) => createZiweiQueryService({ repository: createDatabaseZiweiQueryRepository(main as never), freePalaceGift: reader });
  const read = (userId: string, chartId: string) => query(createFreePalaceReadService({ database: main as never, currentLineageHash: currentFreePalaceLineageHash("9router-an", model) })).readFreePalaceGift(account(userId), chartId, "vi");
  const status = async () => (await h.raw`SELECT status FROM free_ai_requests`)[0]?.status as string | undefined;

  it("row 55: the full path ends in an authorized cache read, with the redacted ledger recorded", async () => {
    await seedPricing();
    const userId = `e2e-user-${seq}`;
    const { request } = api();
    const { chartId, calc } = await chartComplete(userId, (actor, v) => request.request(actor, v.chartId, "vi"));
    expect(await calc.calculate(account(userId), "r")).toMatchObject({ ok: true });
    expect(await status()).toBe("reserved");
    expect(await read(userId, chartId)).toEqual({ ok: true, value: { version: 1, status: "requested" } });

    const worker = createFreePalaceGiftRunner({ fetchImpl });
    expect(await worker.runOnce()).toEqual({ processed: 1 });
    expect(attempts).toBe(1);
    expect(await status()).toBe("ready");
    const result = await read(userId, chartId);
    expect(result).toMatchObject({ ok: true, value: { status: "ready", palaceId: "ziwei.palace.life", locale: "vi" } });
    for (let i = 0; i < 3; i += 1) expect((await read(userId, chartId)).ok).toBe(true); // free repeated cache hits
    expect(attempts).toBe(1);

    const ledger = {
      request: (await h.raw`SELECT id, status, admission_day::text, dispatch_day::text, reserved_micro_vnd::text FROM free_ai_requests`)[0],
      settlement: (await h.raw`SELECT attempt_id, outcome, actual_micro_vnd::text FROM free_ai_settlements`)[0],
      chart: (await h.raw`SELECT reserved_micro_vnd::text reserved, resolved_micro_vnd::text resolved, unknown_micro_vnd::text unknown FROM free_ai_chart_budgets`)[0],
      day: (await h.raw`SELECT reserved_micro_vnd::text reserved, resolved_micro_vnd::text resolved, unknown_micro_vnd::text unknown FROM free_ai_daily_budgets`)[0],
      outbox: (await h.raw`SELECT status, event_type FROM outbox`)[0],
    };
    expect(ledger.chart).toEqual({ reserved: "0", resolved: String(1200n * 15000n + 600n * 60000n), unknown: "0" });
    expect(ledger.day).toEqual(ledger.chart);
    // Redacted evidence: ids, states and amounts only. No prompt, prose, birth data or secret.
    const evidence = JSON.stringify(ledger);
    for (const forbidden of ["Tử Vi", "Cái cốt lõi", "not-a-real-secret", "1990-01-01"]) expect(evidence).not.toContain(forbidden);
    console.log("B20_REDACTED_LEDGER", evidence);
  });

  it("row 56: kill switch — flag off stops new generation and queued work, while the authorized cache stays readable", async () => {
    await seedPricing();
    const userId = `e2e-user-${seq}`;
    const { request } = api();
    const first = await chartComplete(userId, (actor, v) => request.request(actor, v.chartId, "vi"));
    await first.calc.calculate(account(userId), "r");
    await createFreePalaceGiftRunner({ fetchImpl }).runOnce();
    expect(await status()).toBe("ready");

    // a second user is queued, then the switch is flipped
    const queuedUser = `e2e-queued-${seq}`;
    const second = await chartComplete(queuedUser, (actor, v) => request.request(actor, v.chartId, "vi"));
    await second.calc.calculate(account(queuedUser), "r");
    delete process.env.FREE_PALACE_GENERATION_ENABLED;
    const off = api();
    expect(off.composition.onChartReady).toBeUndefined();
    expect(await createFreePalaceGiftRunner({ fetchImpl }).runOnce()).toEqual({ processed: 0 });
    expect(await createFreePalaceGiftMaintenanceRunner().runOnce()).toEqual({ settled: 0, closed: 0, purged: 0 });
    const third = await chartComplete(`e2e-new-${seq}`, async () => undefined);
    await third.calc.calculate(account(`e2e-new-${seq}`), "r");
    expect(Number((await h.raw`SELECT count(*)::int n FROM free_ai_requests`)[0]!.n)).toBe(2); // nothing new admitted
    expect(attempts).toBe(1);
    expect((await read(userId, first.chartId)).value).toMatchObject({ status: "ready" }); // cache still readable
    expect((await read(queuedUser, second.chartId)).value).toEqual({ version: 1, status: "requested" });

    process.env.FREE_PALACE_GENERATION_ENABLED = "true"; // switch back on: the queued request resumes, still one attempt each
    expect(await createFreePalaceGiftRunner({ fetchImpl }).runOnce()).toEqual({ processed: 1 });
    expect(attempts).toBe(2);
  });

  it("row 57: rollback — with the runner withdrawn the system is cache-only; nothing generates, nothing regresses", async () => {
    await seedPricing();
    const userId = `e2e-user-${seq}`;
    const { request } = api();
    const done = await chartComplete(userId, (actor, v) => request.request(actor, v.chartId, "vi"));
    await done.calc.calculate(account(userId), "r");
    await createFreePalaceGiftRunner({ fetchImpl }).runOnce();
    const pendingUser = `e2e-pending-${seq}`;
    const pending = await chartComplete(pendingUser, (actor, v) => request.request(actor, v.chartId, "vi"));
    await pending.calc.calculate(account(pendingUser), "r");
    // no runner is constructed from here on: the worker never runs gift work
    expect((await read(userId, done.chartId)).value).toMatchObject({ status: "ready" });
    expect((await read(pendingUser, pending.chartId)).value).toEqual({ version: 1, status: "requested" });
    expect(attempts).toBe(1);
    expect((await h.raw`SELECT status FROM outbox WHERE status='pending'`)).toHaveLength(1);
  });

  it("tariff change mid-flight: a newer approved tariff cancels the queued request unsent and releases its hold", async () => {
    await seedPricing();
    const userId = `e2e-user-${seq}`;
    const { request } = api();
    const queued = await chartComplete(userId, (actor, v) => request.request(actor, v.chartId, "vi"));
    await queued.calc.calculate(account(userId), "r");
    await seedPricing(model, "2026-06-01"); // a newer, also-approved tariff for the same provider/model
    await createFreePalaceGiftRunner({ fetchImpl }).runOnce();
    expect(attempts).toBe(0);
    expect(await status()).toBe("cancelled");
    expect((await h.raw`SELECT reserved_micro_vnd::text r FROM free_ai_chart_budgets`)[0]!.r).toBe("0");
  });

  it("cross-producer cap contention: a legacy free_preview spend on the same chart version is counted, not ignored", async () => {
    await seedPricing();
    const userId = `e2e-user-${seq}`;
    const chartVersionId = `preflight-chart-${seq}-${userId}`;
    await h.raw`INSERT INTO ai_call_attempts(call_id,purpose,provider_id,requested_model_id,chart_version_id,max_output_tokens,pricing_version,input_price_per_million,output_price_per_million,cached_input_price_per_million,currency,source_currency,source_reference,fx_source,fx_rate,fx_timestamp,pricing_source)
      VALUES (${"legacy-" + seq},'free_preview','legacy','legacy-model',${chartVersionId},100,'v0',1,1,1,'VND','VND','ref','fx',1,now(),'src')`; // attempt with no recorded outcome
    const { request } = api();
    const done = await chartComplete(userId, (actor, v) => request.request(actor, v.chartId, "vi"));
    await done.calc.calculate(account(userId), "r");
    expect(await status()).toBeUndefined(); // unknown legacy exposure blocks admission
    expect(attempts).toBe(0);
  });
});
