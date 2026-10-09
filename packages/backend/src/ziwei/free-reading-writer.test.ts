import { beforeAll, describe, expect, it } from "vitest";
import { FreeReadingCandidateV2Schema, type AiModelPricing, type FreeReadingContentV2, type FreeReadingFactsV2,
  type NormalizedBirthProfileV1 } from "@lasoviet/contracts";
import { IztroAdapter } from "../../../engine-adapters/src/index.js";
import type { AiProvider } from "../ai/ai-provider.js";
import { createAiProductionGate, createOpenAiCompatibleAdapter } from "../ai/openai-compatible-adapter.js";
import { calculateTokenCostMicroVnd, type AiCostRecorder, type BeginAttemptInput, type CompleteAttemptInput } from "../ai/ai-cost.js";
import { buildFreeReadingFacts } from "./free-reading-facts.js";
import { compileFreeReadingFallback } from "./free-reading-fallback.js";
import { createFreeReadingWriter, freezeFreeReadingCall } from "./free-reading-writer.js";

const tariff = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", pricingVersion: "synthetic-v1",
  providerId: "synthetic", modelId: "fixture", inputPricePerMillion: 20_000,
  outputPricePerMillion: 100_000, cachedInputPricePerMillion: 2_000 };
const pricing: AiModelPricing = { ...tariff, currency: "VND", status: "active",
  effectiveFrom: new Date("2026-10-08T00:00:00Z"), fxTimestamp: new Date("2026-10-08T00:00:00Z"),
  source: "synthetic", sourceCurrency: "VND", sourceReference: "synthetic", fxSource: "identity", fxRate: 1,
  referenceMetadata: {} };
let sources: Record<"vi" | "en", FreeReadingFactsV2>;
beforeAll(async () => {
  const time = { precision: "exact_minute" as const, localTime: "08:30" };
  const profile: NormalizedBirthProfileV1 = { version: 1,
    originalInput: { version: 1, calendar: { kind: "solar", date: "1992-06-15" }, time,
      timezone: { offsetMinutes: 420 }, gender: "male", consentVersion: "synthetic" },
    normalizedCalendar: { kind: "solar", date: "1992-06-15" }, normalizedTime: time,
    timezoneProvenance: { source: "offset", offsetMinutes: 420 }, normalizationWarnings: [], limitations: [] };
  const output = await new IztroAdapter().calculateWithPrivateSnapshot({ birthProfile: profile });
  if (!output.result.ok) throw new Error("SYNTHETIC_ENGINE_FAILED");
  const chart = output.result.output;
  sources = { vi: buildFreeReadingFacts({ chart, focusPalaceId: chart.soulPalaceId, locale: "vi" }),
    en: buildFreeReadingFacts({ chart, focusPalaceId: chart.soulPalaceId, locale: "en" }) };
});

function harness(options: {
  locale?: "vi" | "en"; alter?: (content: FreeReadingContentV2) => void;
  usage?: Partial<CompleteAttemptInput>; ackFails?: boolean; badAckCost?: boolean;
  providerError?: boolean; throws?: boolean; noCapture?: boolean; duplicate?: boolean;
  wrongPricing?: boolean; wrongContext?: boolean; wrongResultModel?: boolean;
} = {}) {
  const source = sources[options.locale ?? "vi"], content = compileFreeReadingFallback(source);
  options.alter?.(content);
  const call = freezeFreeReadingCall({ requestId: "PRIVATE_REQUEST", chartVersionId: "PRIVATE_CHART", source, tariff });
  const begins: BeginAttemptInput[] = [], completes: CompleteAttemptInput[] = [], requests: unknown[] = [];
  let physical = 0;
  const costRecorder: AiCostRecorder = {
    async beginAttempt(input) {
      begins.push(input);
      // An asynchronous begin exposes the concurrent retry race if the wrapper claims too late.
      await Promise.resolve();
      return { ok: true, value: { attemptId: "ATTEMPT", pricing: options.wrongPricing ? { ...pricing, outputPricePerMillion: 101_000 } : pricing } };
    },
    async completeAttempt(input) {
      completes.push(input);
      await Promise.resolve();
      if (options.ackFails) return { ok: false, error: { code: "AI_COST_RECORDING_FAILED", retryable: true, message: "synthetic" } };
      const known = input.tokensUnknown !== true && input.inputTokens !== undefined && input.outputTokens !== undefined;
      return { ok: true, value: { outcomeId: "OUTCOME", costStatus: known ? "resolved" : "unknown",
        ...(known ? { costMicroVnd: options.badAckCost ? "1" : calculateTokenCostMicroVnd({
          inputTokens: input.inputTokens!, outputTokens: input.outputTokens!, cachedTokens: input.cachedTokens, ...tariff }).toString() } : {}) } };
    },
  };
  const writer = createFreeReadingWriter({ expected: { provider: "synthetic", model: "fixture" }, costRecorder,
    createProvider: recorder => ({ async generateStructured(request) {
      requests.push(request);
      const begin: BeginAttemptInput = { callId: "CALL", attemptNumber: 0,
        providerId: "synthetic", requestedModelId: "fixture", purpose: "free_preview",
        idempotencyKey: request.costContext?.idempotencyKey, costContext: request.costContext,
        maxOutputTokens: request.maxOutputTokens };
      if (options.wrongContext) begin.costContext = { ...begin.costContext, chartVersionId: "WRONG" };
      const started = options.duplicate ? (await Promise.all([recorder.beginAttempt(begin), recorder.beginAttempt(begin)]))[0]! : await recorder.beginAttempt(begin);
      if (!started.ok) return { ok: false, error: { code: "AI_COST_RECORDING_FAILED", retryable: false } };
      physical++;
      if (!options.noCapture) await recorder.completeAttempt({ attemptId: started.value.attemptId,
        responseModelId: "fixture", httpStatus: 200, inputTokens: 1_000, cachedTokens: 100,
        outputTokens: 500, totalTokens: 1_500, ...(options.providerError ? { errorCode: "AI_TIMEOUT" } : {}), ...options.usage });
      if (options.throws) throw new Error("PRIVATE_PROVIDER_ERROR");
      if (options.providerError) return { ok: false, error: { code: "AI_TIMEOUT", retryable: true } };
      return { ok: true, value: { value: content, providerId: "synthetic", modelId: options.wrongResultModel ? "other" : "fixture" } };
    } } as AiProvider) });
  return { writer, call, costRecorder, begins, completes, requests, physical: () => physical };
}

describe("private single-attempt whole-reading writer", () => {
  it.each(["vi", "en"] as const)("captures actual billed usage and produces an unaccepted draft in %s", async locale => {
    const h = harness({ locale });
    const out = await h.writer.run(h.call);
    expect(out.settlement).toEqual({ kind: "resolved", actualMicroVnd: 68_200_000n, disposition: "publishable" });
    expect(out.candidate).toMatchObject({ locale, status: "draft", manualAccepted: false, sections: { overview: "ai", focusPalace: "ai" } });
    expect(FreeReadingCandidateV2Schema.safeParse(out.candidate).success).toBe(true);
    expect(h.physical()).toBe(1);
    expect(h.begins).toHaveLength(1); expect(h.completes).toHaveLength(1);
    for (const secret of ["PRIVATE_REQUEST", "PRIVATE_CHART", tariff.id, "1992-06-15", "08:30"]) {
      expect(JSON.stringify(out.candidate)).not.toContain(secret);
    }
    const request = h.requests[0] as { system: string; user: string };
    expect(JSON.stringify({ system: request.system, user: request.user })).not.toContain("PRIVATE_CHART");
    expect(JSON.stringify({ system: request.system, user: request.user })).not.toContain("PRIVATE_REQUEST");
    expect(JSON.stringify({ system: request.system, user: request.user })).not.toContain("1992-06-15");
    expect(JSON.stringify({ system: request.system, user: request.user })).not.toContain("08:30");
  });
  it.each(["overview", "focus", "teaser"] as const)("replaces only the hard-failing %s section", async section => {
    const h = harness({ alter: c => {
      if (section === "overview") c.overview.portrait.text += " Bạn sẽ chết sớm.";
      if (section === "focus") c.focusPalace.conclusion.text += " Bạn sẽ chết sớm.";
      if (section === "teaser") c.teasers[0]!.line += " Bạn sẽ chết sớm.";
    } });
    const out = await h.writer.run(h.call);
    expect(out.candidate?.sections.overview).toBe(section === "overview" ? "rule_v2" : "ai");
    expect(out.candidate?.sections.focusPalace).toBe(section === "focus" ? "rule_v2" : "ai");
    expect(out.candidate?.sections.teasers[0]!.status).toBe(section === "teaser" ? "rule_v2" : "ai");
    expect(out.candidate?.sections.teasers.slice(1).every(t => t.status === "ai")).toBe(true);
    expect(JSON.stringify(out.candidate)).not.toContain("chết sớm");
    expect(h.physical()).toBe(1);
  });
  it("keeps advisory style findings and replaces all unknown references", async () => {
    const advisory = harness({ alter: c => { c.overview.portrait.text += " AI hỗ trợ cách diễn đạt."; } });
    expect((await advisory.writer.run(advisory.call)).candidate?.sections.overview).toBe("ai");
    const bad = harness({ alter: c => { c.overview.portrait.basis.keys.push("unknown:key"); } });
    const out = await bad.writer.run(bad.call);
    expect(out.candidate?.sections.overview).toBe("rule_v2");
    expect(out.candidate?.sections.focusPalace).toBe("rule_v2");
    expect(out.settlement).toMatchObject({ kind: "resolved", actualMicroVnd: 68_200_000n, disposition: "failed" });
  });
  it.each([
    { tokensUnknown: true }, { inputTokens: undefined }, { outputTokens: -1 }, { cachedTokens: 1_001 },
    { totalTokens: 1_501 }, { inputTokens: 1.1 }, { responseModelId: "other" },
  ])("quarantines missing or malformed usage %#", async usage => {
    const h = harness({ usage }); const out = await h.writer.run(h.call);
    expect(out.settlement).toEqual({ kind: "unknown" });
    expect(out.candidate?.sections.overview).toBe("rule_v2");
    expect(h.completes[0]).toMatchObject({ tokensUnknown: true });
    expect(h.physical()).toBe(1);
  });
  it.each([{ ackFails: true }, { badAckCost: true }, { noCapture: true }])("requires persisted matching usage acknowledgment %#", async options => {
    const h = harness(options); expect((await h.writer.run(h.call)).settlement).toEqual({ kind: "unknown" });
    expect(h.physical()).toBe(1);
  });
  it.each([{ providerError: true }, { throws: true }, { wrongResultModel: true }, { duplicate: true }])("bills failures without retries or accepting prose %#", async options => {
    const h = harness(options); const out = await h.writer.run(h.call);
    expect(out.settlement).toMatchObject({ kind: "resolved", actualMicroVnd: 68_200_000n, disposition: "failed" });
    expect(out.candidate?.sections.overview).toBe("rule_v2");
    expect(h.physical()).toBe(1); expect(h.begins).toHaveLength(1);
  });
  it("retains actual over-cap spend without clamping or accepting AI", async () => {
    const h = harness({ usage: { inputTokens: 100_000, cachedTokens: 0, outputTokens: 100_000, totalTokens: 200_000 } });
    const out = await h.writer.run(h.call);
    expect(out.settlement).toEqual({ kind: "resolved", actualMicroVnd: 12_000_000_000n, disposition: "failed" });
    expect(out.candidate?.sections.overview).toBe("rule_v2");
  });
  it("retains a billed output over the requested token bound while refusing its prose", async () => {
    const h = harness({ usage: { inputTokens: 100, cachedTokens: 0, outputTokens: 10_001, totalTokens: 10_101 } });
    const out = await h.writer.run(h.call);
    expect(out.settlement).toEqual({ kind: "resolved", actualMicroVnd: 1_002_100_000n, disposition: "failed" });
    expect(out.candidate?.sections.overview).toBe("rule_v2");
  });
  it.each([false, true])("runs the installed HTTP adapter once with retryCount 2 (malformed=%s)", async malformed => {
    const h = harness(); let fetchCalls = 0;
    const writer = createFreeReadingWriter({ expected: { provider: "synthetic", model: "fixture" },
      costRecorder: h.costRecorder, createProvider: recorder => createOpenAiCompatibleAdapter({
        baseUrl: "https://synthetic.invalid/v1", providerId: "synthetic", apiKey: "synthetic-key",
        modelId: "fixture", allowedResolvedModelIds: ["fixture"], retryCount: 2, timeoutMs: 1_000,
        productionGate: createAiProductionGate("approved"), costRecorder: recorder,
        fetchImpl: async (_url, init) => {
          fetchCalls++;
          const body = JSON.parse(String(init?.body)) as { max_tokens: number; messages: unknown };
          expect(body.max_tokens).toBe(10_000);
          expect(JSON.stringify(body.messages)).not.toContain("PRIVATE_CHART");
          return new Response(JSON.stringify({ model: "fixture", choices: [{ message: {
            content: malformed ? "{\"wrong\":true}" : JSON.stringify(compileFreeReadingFallback(h.call.source)),
          } }], usage: { prompt_tokens: 1_000, completion_tokens: 500, total_tokens: 1_500,
            prompt_tokens_details: { cached_tokens: 100 } } }), { status: 200, headers: { "content-type": "application/json" } });
        },
      }) });
    const out = await writer.run(h.call);
    expect(fetchCalls).toBe(1); expect(h.begins).toHaveLength(1); expect(h.completes).toHaveLength(1);
    expect(out.settlement).toEqual({ kind: "resolved", actualMicroVnd: 68_200_000n,
      disposition: malformed ? "failed" : "publishable" });
    expect(out.candidate?.sections.overview).toBe(malformed ? "rule_v2" : "ai");
  });
  it.each(["source", "prompt", "versions", "provider"] as const)("refuses frozen %s tampering before dispatch", async kind => {
    const h = harness();
    if (kind === "source") h.call.source.facts[0]!.value += " changed";
    if (kind === "prompt") h.call.serializedPrompt += " ";
    if (kind === "versions") h.call.serializedPrompt = h.call.serializedPrompt.replace("free-reading-prompt-v2-draft-3", "stale-version");
    if (kind === "provider") h.call.tariff.providerId = "other";
    const out = await h.writer.run(h.call);
    expect(out.settlement).toEqual({ kind: "resolved", actualMicroVnd: 0n, disposition: "failed" });
    expect(h.physical()).toBe(0); expect(h.requests).toHaveLength(0);
  });
  it.each([{ wrongPricing: true }, { wrongContext: true }])("refuses changed pricing/context without a physical send %#", async options => {
    const h = harness(options); const out = await h.writer.run(h.call);
    expect(out.settlement).toMatchObject({ kind: "resolved", actualMicroVnd: 0n, disposition: "failed" });
    expect(h.physical()).toBe(0);
    if (options.wrongPricing) expect(h.completes).toEqual([expect.objectContaining({ inputTokens: 0, outputTokens: 0 })]);
  });
  it("rejects unbound section projections and unauthorized fields", async () => {
    const h = harness(); const out = await h.writer.run(h.call);
    const view = structuredClone(out.candidate!);
    view.sections.teasers[0]!.targetKey = "topic:wrong";
    expect(FreeReadingCandidateV2Schema.safeParse(view).success).toBe(false);
    expect(FreeReadingCandidateV2Schema.safeParse({ ...out.candidate, chartId: "PRIVATE" }).success).toBe(false);
    expect(FreeReadingCandidateV2Schema.safeParse({ ...out.candidate, manualAccepted: true }).success).toBe(false);
  });
});
