import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createFreeAiBudgetRepository } from "../../packages/backend/src/ziwei/free-ai-budget.repository.js";
import { buildFreePalacePrompt, serializeFreePalacePrompt } from "../../packages/backend/src/ziwei/free-palace-writer.js";
import { createFreePalaceGiftMaintenanceRunner, createFreePalaceGiftRunner } from "../../apps/worker/src/worker.module.js";
import { MICRO, costContext, lineage, seedChartVersion, startFreeAiDatabase } from "./free-ai-test-harness.js";

type Harness = Awaited<ReturnType<typeof startFreeAiDatabase>>;
const TABLES = ["outbox", "free_ai_artifacts", "free_ai_settlements", "free_ai_admissions", "free_ai_requests", "free_ai_quota_aliases", "free_ai_quota_subjects", "free_ai_daily_budgets", "free_ai_chart_budgets"];
const facts = [{ key: "fact:one", label: "Cung Mệnh", value: "Sao Tử Vi ở thế vượng" }, { key: "fact:two", label: "Cung Mệnh", value: "Sao Thiên Phủ hội chiếu" }];
const point = (text: string, key = "fact:one") => ({ text, evidenceKeys: [key] });
const prose = "Bạn là người có xu hướng giữ vai trò dẫn dắt trong những nhóm nhỏ, và điều đó thường bắt nguồn từ cách bạn cân nhắc kỹ trước khi quyết định. ".repeat(5);
const content = {
  palaceId: "ziwei.palace.life", title: "Cái cốt lõi của bạn", conclusion: "Cung Mệnh của bạn nghiêng về sự chủ động có cân nhắc.",
  keyPoints: [point("Bạn thích tự mình sắp xếp trình tự công việc."), point("Bạn cần thời gian trước khi chốt một lựa chọn lớn."), point("Bạn dễ được người khác tin cậy.", "fact:two")],
  narrative: prose, do: [point("Dành một buổi mỗi tuần để rà soát ưu tiên.")], avoid: [point("Tránh ôm hết mọi việc về mình.")], evidenceKeys: ["fact:one", "fact:two"],
};

describe("free palace gift in the real worker composition (real Postgres, fake provider)", () => {
  let h: Harness;
  let attempts = 0;
  let model = "gift-model-0";
  let counter = 0;
  const original = { ...process.env };
  beforeAll(async () => { h = await startFreeAiDatabase(); }, 180000);
  afterAll(async () => { if (h) await h.stop(); });
  beforeEach(async () => {
    for (const table of TABLES) await h.raw.unsafe(`DELETE FROM ${table}`);
    attempts = 0;
    model = `gift-model-${++counter}`; // pricing rows are append-only, so every test gets its own model id
    process.env = {
      NODE_ENV: "test", SEPAY_ENV: "disabled", DATABASE_URL: h.uri, FREE_PALACE_GENERATION_ENABLED: "true",
      AI_BASE_URL: "https://ai.synthetic.test/v1", AI_API_KEY: "not-a-real-secret", AI_MODEL: model, AI_ALLOWED_RESOLVED_MODELS: model,
      AI_TIMEOUT: "3000", AI_MAX_RETRIES: "3", AI_FEATURE_JSON_SCHEMA: "true", AI_FEATURE_TOOL_CALLING: "false", AI_PRODUCTION_ENABLED: "true",
    };
  });
  afterEach(() => { process.env = { ...original }; });

  const seedPricing = async (forModel = model, effectiveFrom = "2026-01-01") => (await h.raw`INSERT INTO ai_model_pricing(pricing_version,provider_id,model_id,currency,input_price_per_million,output_price_per_million,cached_input_price_per_million,effective_from,source,source_currency,source_reference,fx_source,fx_rate,fx_timestamp,status)
    VALUES (${'v-' + forModel},'9router-an',${forModel},'VND',15000,60000,3750,${effectiveFrom},'approved','VND','founder','direct',1,'2026-01-01','active') RETURNING id`)[0]!.id as string;
  async function admit(pricingId: string) {
    // the real worker composition uses the real source check, so the chart must really exist
    await seedChartVersion(h.connect(), `worker-chart-${counter}`, { kind: "account", userId: `worker-user-${counter}` });
    const prompt = buildFreePalacePrompt({ locale: "vi", palaceId: "ziwei.palace.life", palaceLabel: "cung Mệnh", facts, concern: null });
    const result = await createFreeAiBudgetRepository(h.connect()).reserve({
      flagEnabled: true, actor: { kind: "account", id: `worker-user-${counter}`, trusted: true }, lineage: lineage(`worker-chart-${counter}`, { provider: "9router-an", model }), concern: null,
      cost: costContext(500n * MICRO, { provider: "9router-an", model, pricingSnapshotId: pricingId, finalSerializedRequest: serializeFreePalacePrompt(prompt), maxOutputTokens: 2000 }),
      traceId: "t", authorizeSource: async () => ({ expiresAt: null }),
    });
    if (result.kind !== "admitted") throw new Error("setup failed");
    return result.requestId;
  }
  const fetchImpl = (async () => {
    attempts += 1;
    return new Response(JSON.stringify({ model, choices: [{ message: { content: JSON.stringify(content) } }], usage: { prompt_tokens: 1000, completion_tokens: 500, total_tokens: 1500 } }), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  const status = async (id: string) => (await h.raw`SELECT status FROM free_ai_requests WHERE id=${id}`)[0]!.status;

  it("with the flag on and config complete, an eligible job progresses through the real runner to ready, with retries pinned to zero", async () => {
    const requestId = await admit(await seedPricing());
    // the PAID retry setting is 3; the gift must still make exactly one attempt on a failure path
    const runner = createFreePalaceGiftRunner({ fetchImpl });
    expect(await runner.runOnce()).toEqual({ processed: 1 });
    expect(attempts).toBe(1);
    expect(await status(requestId)).toBe("ready");
  });

  it("a failing provider is one attempt even though the paid AI_MAX_RETRIES is 3", async () => {
    const requestId = await admit(await seedPricing());
    const failing = (async () => { attempts += 1; return new Response("{}", { status: 500 }); }) as typeof fetch;
    await createFreePalaceGiftRunner({ fetchImpl: failing }).runOnce();
    expect(attempts).toBe(1);
    expect(await status(requestId)).toBe("cost_unknown");
  });

  it("row 41: missing approved pricing at runtime claims nothing and burns no slot", async () => {
    const requestId = await admit(await seedPricing(model, "2099-01-01")); // approved tariff exists but is not effective yet
    expect(await createFreePalaceGiftRunner({ fetchImpl }).runOnce()).toEqual({ processed: 0 });
    expect(attempts).toBe(0);
    expect(await status(requestId)).toBe("reserved");
    expect((await h.raw`SELECT status FROM outbox`)[0]!.status).toBe("pending");
  });

  it("a frozen call for a different provider/model than this process is configured for is cancelled unsent", async () => {
    const requestId = await admit(await seedPricing());
    const other = `${model}-other`;
    process.env.AI_MODEL = other;
    process.env.AI_ALLOWED_RESOLVED_MODELS = other;
    await seedPricing(other);
    await createFreePalaceGiftRunner({ fetchImpl }).runOnce();
    expect(attempts).toBe(0);
    expect(await status(requestId)).toBe("cancelled");
  });

  it("flag off after use: the gift runner is a no-op and queued events stay pending", async () => {
    await admit(await seedPricing());
    delete process.env.FREE_PALACE_GENERATION_ENABLED;
    expect(await createFreePalaceGiftRunner({ fetchImpl }).runOnce()).toEqual({ processed: 0 });
    expect(attempts).toBe(0);
  });

  it("the maintenance runner settles abandoned fences, closes stale publications and purges expired payloads, only when the flag is on", async () => {
    const requestId = await admit(await seedPricing());
    await h.raw`UPDATE free_ai_requests SET status='dispatching', fenced_at=now() - interval '3 hours', attempt_id=gen_random_uuid(), dispatch_day=admission_day WHERE id=${requestId}`;
    delete process.env.FREE_PALACE_GENERATION_ENABLED;
    expect(await createFreePalaceGiftMaintenanceRunner().runOnce()).toEqual({ settled: 0, closed: 0, purged: 0 });
    process.env.FREE_PALACE_GENERATION_ENABLED = "true";
    expect(await createFreePalaceGiftMaintenanceRunner().runOnce()).toMatchObject({ settled: 1 });
    expect(await status(requestId)).toBe("cost_unknown");
  });
});
