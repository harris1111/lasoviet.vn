import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type { FreePalaceGiftFactV1, FreePalaceGiftFrozenCallV1 } from "@lasoviet/contracts";
import { createInMemoryAiCostService } from "../ai/ai-cost.js";
import { createAiProductionGate, createOpenAiCompatibleAdapter } from "../ai/openai-compatible-adapter.js";
import {
  buildFreePalacePrompt, createFreePalaceAttemptRecorder, createFreePalaceWriter, parseFreePalacePrompt, serializeFreePalacePrompt,
} from "./free-palace-writer.js";

const facts: FreePalaceGiftFactV1[] = [
  { key: "fact:one", label: "Cung Mệnh", value: "Sao Tử Vi ở thế vượng" },
  { key: "fact:two", label: "Cung Mệnh", value: "Sao Thiên Phủ hội chiếu" },
];
const point = (text: string, key = "fact:one") => ({ text, evidenceKeys: [key] });
const prose = "Bạn là người có xu hướng giữ vai trò dẫn dắt trong những nhóm nhỏ, và điều đó thường bắt nguồn từ cách bạn cân nhắc kỹ trước khi quyết định. ".repeat(5);
const goodContent = (over: Record<string, unknown> = {}) => ({
  palaceId: "ziwei.palace.life", title: "Cái cốt lõi của bạn", conclusion: "Cung Mệnh của bạn nghiêng về sự chủ động có cân nhắc.",
  keyPoints: [point("Bạn thích tự mình sắp xếp trình tự công việc."), point("Bạn cần thời gian trước khi chốt một lựa chọn lớn."), point("Bạn dễ được người khác tin cậy.", "fact:two")],
  narrative: prose, do: [point("Dành một buổi mỗi tuần để rà soát ưu tiên.")], avoid: [point("Tránh ôm hết mọi việc về mình.")], evidenceKeys: ["fact:one", "fact:two"], ...over,
});
const providerBody = (content: unknown, usage: Record<string, unknown> | null = { prompt_tokens: 1000, completion_tokens: 500, total_tokens: 1500 }) =>
  ({ model: "gift-model", choices: [{ message: { content: typeof content === "string" ? content : JSON.stringify(content) } }], ...(usage ? { usage } : {}) });
const ok = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const tariff = { inputPricePerMillion: 15_000n, outputPricePerMillion: 60_000n };

async function harness(behaviour: (attempt: number) => Promise<Response>, options: { retryCount?: number; snapshotOverride?: string; tariffAvailable?: boolean; modelId?: string; ackFails?: boolean; wrongCompletion?: boolean } = {}) {
  const modelId = options.modelId ?? "gift-model";
  const cost = createInMemoryAiCostService();
  const pricing = await cost.savePricing({
    pricingVersion: "v1", providerId: "9router-an", modelId, currency: "VND", inputPricePerMillion: 15_000, outputPricePerMillion: 60_000,
    cachedInputPricePerMillion: 3_750, effectiveFrom: new Date("2026-09-01T00:00:00Z"), source: "approved", sourceCurrency: "VND", sourceReference: "founder",
    fxSource: "direct_vnd", fxRate: 1, fxTimestamp: new Date("2026-09-01T00:00:00Z"), referenceMetadata: {}, status: "active",
  });
  let physicalAttempts = 0;
  const writer = createFreePalaceWriter({
    costRecorder: options.ackFails ? {...cost.recorder, completeAttempt: async () => ({ok: false, error: {code: "AI_COST_RECORDING_FAILED", retryable: true, message: "synthetic persistence failure"}})} : cost.recorder,
    loadTariff: async () => (options.tariffAvailable === false ? null : tariff),
    createProvider: (recorder) => createOpenAiCompatibleAdapter({
      baseUrl: "https://ai.synthetic.test/v1", apiKey: "not-a-real-secret", modelId, allowedResolvedModelIds: [modelId],
      timeoutMs: 1000, retryCount: options.retryCount ?? 0, productionGate: createAiProductionGate("approved"), costRecorder: options.wrongCompletion ? {...recorder, completeAttempt: input => recorder.completeAttempt({...input, attemptId: "WRONG_ATTEMPT"})} : recorder,
      fetchImpl: async () => { physicalAttempts += 1; return behaviour(physicalAttempts); },
    }),
  });
  const prompt = buildFreePalacePrompt({ locale: "vi", palaceId: "ziwei.palace.life", palaceLabel: "cung Mệnh", facts, concern: null });
  const call: FreePalaceGiftFrozenCallV1 = {
    version: 1, requestId: "123e4567-e89b-42d3-a456-426614174000", chartVersionId: "chart-v1", palaceId: "ziwei.palace.life", locale: "vi",
    provider: "9router-an", model: modelId, promptVersion: "p", rulesVersion: "r", knowledgeVersion: "k", scorerVersion: "s", schemaVersion: "g",
    pricingSnapshotId: options.snapshotOverride ?? pricing.id!, serializedPrompt: serializeFreePalacePrompt(prompt), maxOutputTokens: 2000,
    reservedMicroVnd: "200000000", deletionGeneration: 0,
  };
  return { writer, call, attempts: () => physicalAttempts, cost };
}
const attemptId = "123e4567-e89b-42d3-a456-426614174001";

describe("free palace gift writer", () => {
  it("round-trips the frozen prompt and rejects tampered or unknown shapes", () => {
    const prompt = buildFreePalacePrompt({ locale: "en", palaceId: "ziwei.palace.career", palaceLabel: "Career palace", facts, concern: "career" });
    expect(parseFreePalacePrompt(serializeFreePalacePrompt(prompt))).toEqual(prompt);
    expect(prompt.system).toContain("ONE palace");
    expect(parseFreePalacePrompt("not json")).toBeNull();
    expect(parseFreePalacePrompt(JSON.stringify({ ...prompt, extra: true }))).toBeNull();
  });

  it("row 33/34: one physical attempt, a ready gift, and the true cost computed in integer micro-VND", async () => {
    const h = await harness(async () => ok(providerBody(goodContent())));
    const outcome = await h.writer.run(h.call, attemptId);
    expect(h.attempts()).toBe(1);
    expect(outcome.settlement).toEqual({ kind: "resolved", actualMicroVnd: 1000n * 15_000n + 500n * 60_000n, disposition: "publishable" });
    expect(outcome.publication?.facts).toEqual(facts);
    expect(outcome.publication?.content.palaceId).toBe("ziwei.palace.life");
  });

  it("row 33: a transport failure is exactly one attempt and settles as unknown", async () => {
    const h = await harness(async () => { throw new TypeError("socket hang up"); });
    const outcome = await h.writer.run(h.call, attemptId);
    expect(h.attempts()).toBe(1);
    expect(outcome).toMatchObject({ settlement: { kind: "unknown" }, diagnostic: "usage_unknown" });
  });

  it("row 33: a retryable HTTP 500 is not retried", async () => {
    const h = await harness(async () => ok({ error: "busy" }, 500));
    expect((await h.writer.run(h.call, attemptId)).settlement).toEqual({ kind: "unknown" });
    expect(h.attempts()).toBe(1);
  });

  it("row 33: even a misconfigured retrying adapter cannot send a second request", async () => {
    const h = await harness(async () => ok({ error: "busy" }, 500), { retryCount: 3 });
    await h.writer.run(h.call, attemptId);
    expect(h.attempts()).toBe(1);
  });

  it("invalid output is still billed and never rewritten", async () => {
    const h = await harness(async () => ok(providerBody("this is not json")));
    const outcome = await h.writer.run(h.call, attemptId);
    expect(h.attempts()).toBe(1);
    expect(outcome.settlement).toEqual({ kind: "resolved", actualMicroVnd: 45_000_000n, disposition: "failed" });
    expect(outcome.publication).toBeUndefined();
  });

  it("row 35: prohibited, invented or unsupported content is billed, falls back and is not retried", async () => {
    for (const bad of [
      goodContent({ narrative: `${prose} Bạn dễ mắc ung thư nếu không cẩn thận.` }),
      goodContent({ narrative: `${prose} Sao Thất Sát tạo nên tính cách mạnh.` }),
      goodContent({ narrative: `${prose} Năm 2031 là bước ngoặt.` }),
      goodContent({ palaceId: "ziwei.palace.wealth" }),
      goodContent({ evidenceKeys: ["fact:one", "fact:invented"] }),
    ]) {
      const h = await harness(async () => ok(providerBody(bad)));
      const outcome = await h.writer.run(h.call, attemptId);
      expect(h.attempts()).toBe(1);
      expect(outcome.settlement).toMatchObject({ kind: "resolved", disposition: "failed", actualMicroVnd: 45_000_000n });
      expect(outcome.publication).toBeUndefined();
    }
  });

  it("a response without usage cannot be priced, so the whole hold is retained as unknown", async () => {
    const h = await harness(async () => ok(providerBody(goodContent(), null)));
    expect((await h.writer.run(h.call, attemptId)).settlement).toEqual({ kind: "unknown" });
  });

  it.each([
    {prompt_tokens: 1000}, {completion_tokens: 500},
    {prompt_tokens: 1000, completion_tokens: 500, total_tokens: 1500, completion_tokens_details: {reasoning_tokens: 200}},
    {prompt_tokens: 1000, completion_tokens: 500, total_tokens: 1500, prompt_tokens_details: {cache_creation_tokens: 100}},
  ])("retains the entire free-gift reservation for incomplete or unpriced usage %#", async usage => {
    vi.useFakeTimers({toFake: ["Date"]}); vi.setSystemTime(new Date("2026-10-04T12:00:00Z"));
    try {
    const h = await harness(async () => ok(providerBody(goodContent(), usage)));
    const outcome = await h.writer.run(h.call, attemptId);
    expect(h.attempts()).toBe(1); expect(outcome).toMatchObject({settlement: {kind: "unknown"}, diagnostic: "usage_unknown"});
    expect(outcome.publication).toBeUndefined();
    const summary = await h.cost.getAiCogsSummary({});
    expect(summary).toMatchObject({unknownAttemptCount: 1, resolvedAttemptCount: 0, hasIncompleteAttempts: true});
    } finally {vi.useRealTimers();}
  });

  it("retains the gift hold for complete-looking quarantined Gemini usage", async () => {
    vi.useFakeTimers({toFake: ["Date"]}); vi.setSystemTime(new Date("2026-10-04T12:00:00Z"));
    try {
      const modelId = "ag/gemini-3.8-flash";
      const h = await harness(async () => ok({...providerBody(goodContent()), model: modelId}), {modelId});
      const outcome = await h.writer.run(h.call, attemptId);
      expect(h.attempts()).toBe(1); expect(outcome).toMatchObject({settlement: {kind: "unknown"}, diagnostic: "usage_unknown"});
      expect(outcome.publication).toBeUndefined();
      expect(await h.cost.getAiCogsSummary({})).toMatchObject({unknownAttemptCount: 1, resolvedAttemptCount: 0, hasIncompleteAttempts: true});
    } finally {vi.useRealTimers();}
  });
  it("row 37: a reserved snapshot that is no longer the active tariff sends nothing", async () => {
    const h = await harness(async () => ok(providerBody(goodContent())), { snapshotOverride: "00000000-0000-4000-8000-000000000000" });
    const outcome = await h.writer.run(h.call, attemptId);
    expect(h.attempts()).toBe(0);
    expect(outcome).toMatchObject({ settlement: { kind: "resolved", actualMicroVnd: 0n, disposition: "failed" }, diagnostic: "refused_before_send" });
  });

  it("sends nothing when the tariff cannot be loaded or the frozen prompt is invalid", async () => {
    const noTariff = await harness(async () => ok(providerBody(goodContent())), { tariffAvailable: false });
    expect((await noTariff.writer.run(noTariff.call, attemptId)).diagnostic).toBe("pricing_unavailable");
    expect(noTariff.attempts()).toBe(0);
    const broken = await harness(async () => ok(providerBody(goodContent())));
    expect((await broken.writer.run({ ...broken.call, serializedPrompt: "{}" }, attemptId)).diagnostic).toBe("frozen_prompt_invalid");
    expect(broken.attempts()).toBe(0);
  });

  it("the attempt recorder accepts only free_preview and only one physical attempt", async () => {
    const cost = createInMemoryAiCostService();
    const pricing = await cost.savePricing({ pricingVersion: "v1", providerId: "p", modelId: "m", currency: "VND", inputPricePerMillion: 1, outputPricePerMillion: 1, cachedInputPricePerMillion: 0, effectiveFrom: new Date("2026-01-01"), source: "s", sourceCurrency: "VND", sourceReference: "r", fxSource: "x", fxRate: 1, fxTimestamp: new Date("2026-01-01"), referenceMetadata: {}, status: "active" });
    const { recorder } = createFreePalaceAttemptRecorder(cost.recorder, pricing.id!);
    const base = { callId: "c", attemptNumber: 0, providerId: "p", requestedModelId: "m", maxOutputTokens: 10 };
    expect(await recorder.beginAttempt({ ...base, purpose: "synthetic_probe" })).toMatchObject({ ok: false });
    expect(await recorder.beginAttempt({ ...base, purpose: "free_preview" })).toMatchObject({ ok: true });
    expect(await recorder.beginAttempt({ ...base, attemptNumber: 1, purpose: "free_preview" })).toMatchObject({ ok: false });
  });

  it("claims a single eligible begin before asynchronous persistence", async () => {
    const cost = createInMemoryAiCostService();
    const pricing = await cost.savePricing({pricingVersion: "v1", providerId: "p", modelId: "m", currency: "VND", inputPricePerMillion: 1, outputPricePerMillion: 1, cachedInputPricePerMillion: 0, effectiveFrom: new Date("2026-01-01"), source: "s", sourceCurrency: "VND", sourceReference: "r", fxSource: "x", fxRate: 1, fxTimestamp: new Date("2026-01-01"), referenceMetadata: {}, status: "active"});
    const begin = vi.fn(async (...args: Parameters<typeof cost.recorder.beginAttempt>) => {await Promise.resolve(); return cost.recorder.beginAttempt(...args);});
    const {recorder, snapshot} = createFreePalaceAttemptRecorder({...cost.recorder, beginAttempt: begin}, pricing.id!);
    const input = {callId: "c", attemptNumber: 0, providerId: "p", requestedModelId: "m", maxOutputTokens: 10, purpose: "free_preview" as const};
    const outcomes = await Promise.all([recorder.beginAttempt(input), recorder.beginAttempt({...input, attemptNumber: 1})]);
    expect(outcomes.map(r => r.ok)).toEqual([true, false]);
    expect(begin).toHaveBeenCalledTimes(1); expect(snapshot().begun).toBe(1);
  });
  it.each(["ackFails", "wrongCompletion"] as const)("keeps the full hold when %s prevents an acknowledged outcome", async mode => {
    const h = await harness(async () => ok(providerBody(goodContent())), {[mode]: true});
    const outcome = await h.writer.run(h.call, attemptId);
    expect(h.attempts()).toBe(1);
    expect(outcome).toMatchObject({settlement: {kind: "unknown"}, diagnostic: "usage_unknown"});
    expect(outcome.publication).toBeUndefined();
    expect(await h.cost.getAiCogsSummary({})).toMatchObject({hasIncompleteAttempts: true});
  });
  it("settles acknowledged cached input at the persisted actual rate, preserving the conservative admission hold", async () => {
    const h = await harness(async () => ok(providerBody(goodContent(), {prompt_tokens: 1000, completion_tokens: 500, total_tokens: 1500, prompt_tokens_details: {cached_tokens: 100}})));
    const outcome = await h.writer.run(h.call, attemptId);
    expect(h.attempts()).toBe(1);
    expect(outcome.settlement).toEqual({kind: "resolved", actualMicroVnd: 43_875_000n, disposition: "publishable"});
    expect((await h.cost.getAiCogsSummary({})).totalCogsMicroVnd).toBe("43875000");
  });
  it("refuses a repeated completion without replacing the acknowledged receipt", async () => {
    const cost = createInMemoryAiCostService();
    const pricing = await cost.savePricing({pricingVersion: "v1", providerId: "p", modelId: "m", currency: "VND", inputPricePerMillion: 1, outputPricePerMillion: 1, cachedInputPricePerMillion: 0, effectiveFrom: new Date("2026-01-01"), source: "s", sourceCurrency: "VND", sourceReference: "r", fxSource: "x", fxRate: 1, fxTimestamp: new Date("2026-01-01"), referenceMetadata: {}, status: "active"});
    const {recorder, snapshot} = createFreePalaceAttemptRecorder(cost.recorder, pricing.id!);
    const started = await recorder.beginAttempt({callId: "c", attemptNumber: 0, providerId: "p", requestedModelId: "m", maxOutputTokens: 10, purpose: "free_preview"});
    if (!started.ok) throw new Error("Synthetic begin refused");
    const first = {attemptId: started.value.attemptId, responseModelId: "m", httpStatus: 200, inputTokens: 2, outputTokens: 3, cachedTokens: 0, totalTokens: 5};
    expect((await recorder.completeAttempt(first)).ok).toBe(true);
    expect((await recorder.completeAttempt({...first, outputTokens: 9, totalTokens: 11})).ok).toBe(false);
    expect(snapshot()).toMatchObject({completed: first, actualMicroVnd: 5n, refused: "unexpected or repeated outcome"});
  });

  it("row 36: the gift writer imports nothing from the paid report writer, critic or rewrite path", () => {
    const source = readFileSync(new URL("./free-palace-writer.ts", import.meta.url), "utf8");
    const imports = source.split("\n").filter((line) => /^\s*(import|\} from)\b/.test(line)).join("\n");
    expect(imports).not.toMatch(/comprehensive-report-(writer|critic|section-writer)|report-generation|rewrite/i);
    expect(source).not.toMatch(/purpose:\s*"synthetic_probe"/);
  });
});
