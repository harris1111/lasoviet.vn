import { describe, expect, it, vi } from "vitest";
import { z } from "@lasoviet/contracts";
import { createInMemoryAiCostService } from "./ai-cost.js";
import type { BeginAttemptInput, CompleteAttemptInput } from "./ai-cost.js";
import {
  createAiProductionGate,
  createOpenAiCompatibleAdapter,
  resolveOpenAiCompatibleProviderId,
} from "./openai-compatible-adapter.js";

const schema = z.object({ value: z.literal("sentinel") }).strict();
const request = { schema, schemaName: "synthetic_response", system: "system", user: "user", use: "synthetic_capability_probe" as const, maxOutputTokens: 80 };
const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const responseBody = (content: string) => ({ model: "synthetic-model", choices: [{ message: { content } }] });

const samplePricing = {
  pricingVersion: "v1",
  providerId: "9router-an",
  modelId: "qwen-2.5-72b-instruct",
  currency: "VND" as const,
  inputPricePerMillion: 15_000,
  outputPricePerMillion: 60_000,
  cachedInputPricePerMillion: 3_750,
  effectiveFrom: new Date("2026-09-01T00:00:00Z"),
  source: "approved",
  sourceCurrency: "VND",
  sourceReference: "founder_approval",
  fxSource: "direct_vnd",
  fxRate: 1,
  fxTimestamp: new Date("2026-09-01T00:00:00Z"),
  referenceMetadata: {},
  status: "active" as const,
};

describe("OpenAI-compatible adapter", () => {
  it("resolves OpenRouter from its base URL and preserves the legacy fallback", () => {
    expect(resolveOpenAiCompatibleProviderId("https://openrouter.ai/api/v1")).toBe("openrouter");
    expect(resolveOpenAiCompatibleProviderId("https://ai.synthetic.test/v1")).toBe("9router-an");
  });

  it("uses strict JSON schema output and validates a structured success", async () => {
    const calls: RequestInit[] = [];
    const provider = createOpenAiCompatibleAdapter({
      baseUrl: "https://ai.synthetic.test/v1/",
      apiKey: "not-a-real-secret",
      modelId: "synthetic-model",
      allowedResolvedModelIds: ["synthetic-model"],
      timeoutMs: 100,
      retryCount: 0,
      productionGate: createAiProductionGate("pending"),
      fetchImpl: async (_url, init) => {
        calls.push(init!);
        return jsonResponse(responseBody("{\"value\":\"sentinel\"}"));
      },
    });
    await expect(provider.generateStructured(request)).resolves.toMatchObject({
      ok: true,
      value: { value: { value: "sentinel" }, providerId: "9router-an", modelId: "synthetic-model" },
    });

    const body = JSON.parse(String(calls[0]?.body)) as {
      messages: Array<{ role: string; content: string }>;
    };
    expect(body.messages[0]?.content).toContain("Authoritative output contract");
    expect(body.messages[0]?.content).toContain('"value":{"type":"string","const":"sentinel"');
  });

  it("aborts when response body consumption stalls beyond the configured timeout", async () => {
    vi.useFakeTimers();
    try {
      let requestSignal: AbortSignal | undefined;
      const provider = createOpenAiCompatibleAdapter({
        baseUrl: "https://ai.synthetic.test/v1",
        apiKey: "not-a-real-secret",
        modelId: "synthetic-model",
        allowedResolvedModelIds: ["synthetic-model"],
        timeoutMs: 100,
        retryCount: 0,
        productionGate: createAiProductionGate("pending"),
        fetchImpl: async (_url, init) => {
          requestSignal = init?.signal;
          const body = new ReadableStream<Uint8Array>({
            start(controller) {
              requestSignal?.addEventListener(
                "abort",
                () => controller.error(new DOMException("The operation was aborted.", "AbortError")),
                { once: true },
              );
            },
          });
          return new Response(body, {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        },
      });

      const resultPromise = provider.generateStructured(request);
      await vi.advanceTimersByTimeAsync(99);
      expect(requestSignal?.aborted).toBe(false);

      await vi.advanceTimersByTimeAsync(1);
      await expect(resultPromise).resolves.toMatchObject({
        ok: false,
        error: { code: "AI_TIMEOUT", retryable: true },
      });
      expect(requestSignal?.aborted).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("disables OpenRouter reasoning so the output budget remains available for JSON", async () => {
    let body: Record<string, unknown> | undefined;
    const provider = createOpenAiCompatibleAdapter({
      baseUrl: "https://openrouter.ai/api/v1",
      apiKey: "not-a-real-secret",
      modelId: "~deepseek/deepseek-flash-latest",
      allowedResolvedModelIds: ["deepseek/deepseek-v4.1-flash"],
      timeoutMs: 100,
      retryCount: 0,
      productionGate: createAiProductionGate("pending"),
      fetchImpl: async (_url, init) => {
        body = JSON.parse(String(init?.body)) as Record<string, unknown>;
        return jsonResponse({
          model: "deepseek/deepseek-v4.1-flash",
          choices: [{ message: { content: "{\"value\":\"sentinel\"}" } }],
        });
      },
    });

    await expect(provider.generateStructured(request)).resolves.toMatchObject({
      ok: true,
    });
    expect(body?.reasoning).toEqual({ effort: "none" });
  });

  it("requires a cost recorder for production report generation and fails closed before fetch", async () => {
    const fetchSpy = vi.fn();
    const provider = createOpenAiCompatibleAdapter({
      baseUrl: "https://ai.synthetic.test",
      apiKey: "not-a-real-secret",
      modelId: "synthetic-model",
      allowedResolvedModelIds: ["synthetic-model"],
      timeoutMs: 100,
      retryCount: 0,
      productionGate: createAiProductionGate("approved"),
      fetchImpl: fetchSpy,
    });

    const res = await provider.generateStructured({
      ...request,
      use: "production_report_generation",
    });

    expect(res).toMatchObject({
      ok: false,
      error: { code: "AI_COST_RECORDING_FAILED", retryable: false },
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("captures token usage including cached tokens through beginAttempt and completeAttempt", async () => {
    const beginCalls: BeginAttemptInput[] = [];
    const completeCalls: CompleteAttemptInput[] = [];

    const mockRecorder = {
      beginAttempt: vi.fn().mockImplementation(async (input: BeginAttemptInput) => {
        beginCalls.push(input);
        return { ok: true, value: { attemptId: "att-1", pricing: samplePricing } };
      }),
      completeAttempt: vi.fn().mockImplementation(async (input: CompleteAttemptInput) => {
        completeCalls.push(input);
        return {
          ok: true,
          value: {
            outcomeId: "out-1",
            costMicroVnd: "45000000",
            costVnd: 45,
            costStatus: "resolved" as const,
          },
        };
      }),
    };

    const provider = createOpenAiCompatibleAdapter({
      baseUrl: "https://ai.synthetic.test",
      apiKey: "not-a-real-secret",
      modelId: "qwen-2.5-72b-instruct",
      allowedResolvedModelIds: ["qwen-2.5-72b-instruct-raw"],
      timeoutMs: 100,
      retryCount: 0,
      productionGate: createAiProductionGate("approved"),
      costRecorder: mockRecorder,
      fetchImpl: async () =>
        jsonResponse({
          model: "qwen-2.5-72b-instruct-raw",
          choices: [{ message: { content: "{\"value\":\"sentinel\"}" } }],
          usage: {
            prompt_tokens: 1200,
            completion_tokens: 450,
            total_tokens: 1650,
            prompt_tokens_details: {
              cached_tokens: 300,
            },
          },
        }),
    });

    const costContext = {
      reportId: "a0000000-0000-4000-8000-000000000001",
      idempotencyKey: "idem-key-1",
      sku: "ZIWEI-IDENTITY-P0",
      purpose: "report" as const,
    };

    const res = await provider.generateStructured({
      ...request,
      use: "production_report_generation",
      costContext,
    });

    expect(res).toMatchObject({
      ok: true,
      value: {
        modelId: "qwen-2.5-72b-instruct-raw",
        providerId: "9router-an",
        usage: {
          inputTokens: 1200,
          outputTokens: 450,
          cachedTokens: 300,
          totalTokens: 1650,
          costMicroVnd: "45000000",
          costVnd: 45,
          costStatus: "resolved",
        },
      },
    });

    expect(beginCalls).toHaveLength(1);
    expect(beginCalls[0].callId).toBeDefined();
    expect(beginCalls[0].idempotencyKey).toBe("idem-key-1");
    expect(beginCalls[0].requestedModelId).toBe("qwen-2.5-72b-instruct");
    expect(beginCalls[0].purpose).toBe("report");

    expect(completeCalls).toHaveLength(1);
    expect(completeCalls[0].attemptId).toBe("att-1");
    expect(completeCalls[0].responseModelId).toBe("qwen-2.5-72b-instruct-raw");
    expect(completeCalls[0].inputTokens).toBe(1200);
    expect(completeCalls[0].outputTokens).toBe(450);
    expect(completeCalls[0].cachedTokens).toBe(300);
    expect(completeCalls[0].errorCode).toBeUndefined();
  });

  it("fails closed before fetch when beginAttempt reports unapproved pricing", async () => {
    const fetchSpy = vi.fn();
    const mockRecorder = {
      beginAttempt: vi.fn().mockResolvedValue({
        ok: false,
        error: { code: "AI_PROVIDER_NOT_APPROVED", retryable: false, message: "Missing pricing" },
      }),
      completeAttempt: vi.fn(),
    };

    const provider = createOpenAiCompatibleAdapter({
      baseUrl: "https://ai.synthetic.test",
      apiKey: "not-a-real-secret",
      modelId: "unapproved-model",
      allowedResolvedModelIds: ["unapproved-model"],
      timeoutMs: 100,
      retryCount: 0,
      productionGate: createAiProductionGate("approved"),
      costRecorder: mockRecorder,
      fetchImpl: fetchSpy,
    });

    const res = await provider.generateStructured({
      ...request,
      use: "production_report_generation",
    });

    expect(res).toMatchObject({
      ok: false,
      error: { code: "AI_PROVIDER_NOT_APPROVED", retryable: false },
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(mockRecorder.completeAttempt).not.toHaveBeenCalled();
  });

  it("creates separate attempt and outcome rows for retries and marks AI_OUTPUT_INVALID on invalid output", async () => {
    const beginCalls: BeginAttemptInput[] = [];
    const completeCalls: CompleteAttemptInput[] = [];

    const mockRecorder = {
      beginAttempt: vi.fn().mockImplementation(async (input: BeginAttemptInput) => {
        beginCalls.push(input);
        return { ok: true, value: { attemptId: `att-${beginCalls.length}`, pricing: samplePricing } };
      }),
      completeAttempt: vi.fn().mockImplementation(async (input: CompleteAttemptInput) => {
        completeCalls.push(input);
        return { ok: true, value: { outcomeId: `out-${completeCalls.length}`, costStatus: "resolved" as const } };
      }),
    };

    let attempt = 0;
    const provider = createOpenAiCompatibleAdapter({
      baseUrl: "https://ai.synthetic.test",
      apiKey: "not-a-real-secret",
      modelId: "synthetic-model",
      allowedResolvedModelIds: ["synthetic-model"],
      timeoutMs: 100,
      retryCount: 1,
      productionGate: createAiProductionGate("approved"),
      costRecorder: mockRecorder,
      fetchImpl: async () => {
        attempt += 1;
        if (attempt === 1) {
          return jsonResponse(responseBody("{\"value\":\"wrong_sentinel\"}"));
        }
        return jsonResponse(responseBody("{\"value\":\"sentinel\"}"));
      },
    });

    const res = await provider.generateStructured({
      ...request,
      use: "production_report_generation",
    });

    expect(res).toMatchObject({ ok: true });
    expect(beginCalls).toHaveLength(2);
    expect(beginCalls[0].attemptNumber).toBe(0);
    expect(beginCalls[1].attemptNumber).toBe(1);

    expect(completeCalls).toHaveLength(2);
    expect(completeCalls[0].attemptId).toBe("att-1");
    expect(completeCalls[0].errorCode).toBe("AI_OUTPUT_INVALID");
    expect(completeCalls[0].invalidOutputReason).toBe("schema_validation_failed");
    expect(completeCalls[1].attemptId).toBe("att-2");
    expect(completeCalls[1].errorCode).toBeUndefined();
  });

  it("retries a null HTTP 200 payload after recording resolved_model_missing", async () => {
    const completeCalls: CompleteAttemptInput[] = [];
    const mockRecorder = {
      beginAttempt: vi.fn().mockImplementation(async (input: BeginAttemptInput) => ({
        ok: true,
        value: { attemptId: `att-${input.attemptNumber}`, pricing: samplePricing },
      })),
      completeAttempt: vi.fn().mockImplementation(async (input: CompleteAttemptInput) => {
        completeCalls.push(input);
        return { ok: true, value: { outcomeId: input.attemptId, costStatus: "unknown" as const } };
      }),
    };
    let attempt = 0;
    const provider = createOpenAiCompatibleAdapter({
      baseUrl: "https://ai.synthetic.test",
      apiKey: "not-a-real-secret",
      modelId: "synthetic-model",
      allowedResolvedModelIds: ["synthetic-model"],
      timeoutMs: 100,
      retryCount: 1,
      productionGate: createAiProductionGate("approved"),
      costRecorder: mockRecorder,
      fetchImpl: async () => {
        attempt += 1;
        return attempt === 1
          ? jsonResponse(null)
          : jsonResponse(responseBody("{\"value\":\"sentinel\"}"));
      },
    });

    await expect(
      provider.generateStructured({
        ...request,
        use: "production_report_generation",
      }),
    ).resolves.toMatchObject({ ok: true });
    expect(completeCalls).toHaveLength(2);
    expect(completeCalls[0]).toMatchObject({
      attemptId: "att-0",
      errorCode: "AI_OUTPUT_INVALID",
      invalidOutputReason: "resolved_model_missing",
    });
    expect(completeCalls[1]).toMatchObject({
      attemptId: "att-1",
      errorCode: undefined,
    });
  });

  it.each([
    [
      "response JSON parse failure",
      async () => new Response("not-json", { status: 200 }),
      "response_json_parse_failed",
    ],
    [
      "missing message content",
      async () => jsonResponse({ model: "synthetic-model", choices: [{}] }),
      "message_content_missing_or_non_string",
    ],
    [
      "leading prose",
      async () => jsonResponse(responseBody("Here is the result: {\"value\":\"sentinel\"}")),
      "content_not_json_object",
    ],
    [
      "malformed JSON object",
      async () => jsonResponse(responseBody("{\"value\":\"sentinel\"")),
      "json_object_malformed",
    ],
    [
      "schema validation failure",
      async () => jsonResponse(responseBody("{\"value\":\"wrong_sentinel\"}")),
      "schema_validation_failed",
    ],
    [
      "missing resolved model",
      async () => jsonResponse({ choices: [{ message: { content: "{\"value\":\"sentinel\"}" } }] }),
      "resolved_model_missing",
    ],
    [
      "disallowed resolved model",
      async () =>
        jsonResponse({
          model: "unapproved-resolved-model",
          choices: [{ message: { content: "{\"value\":\"sentinel\"}" } }],
        }),
      "resolved_model_disallowed",
    ],
  ] as const)(
    "records bounded diagnostic for %s without persisting model content",
    async (_name, fetchImpl, invalidOutputReason) => {
      const completeCalls: CompleteAttemptInput[] = [];
      const mockRecorder = {
        beginAttempt: vi.fn().mockResolvedValue({
          ok: true,
          value: { attemptId: "att-1", pricing: samplePricing },
        }),
        completeAttempt: vi.fn().mockImplementation(async (input: CompleteAttemptInput) => {
          completeCalls.push(input);
          return { ok: true, value: { outcomeId: "out-1", costStatus: "unknown" as const } };
        }),
      };
      const provider = createOpenAiCompatibleAdapter({
        baseUrl: "https://ai.synthetic.test",
        apiKey: "not-a-real-secret",
        modelId: "synthetic-model",
        allowedResolvedModelIds: ["synthetic-model"],
        timeoutMs: 100,
        retryCount: 0,
        productionGate: createAiProductionGate("approved"),
        costRecorder: mockRecorder,
        fetchImpl,
      });

      await expect(
        provider.generateStructured({
          ...request,
          use: "production_report_generation",
        }),
      ).resolves.toMatchObject({
        ok: false,
        error: { code: "AI_OUTPUT_INVALID", retryable: false },
      });
      expect(completeCalls).toHaveLength(1);
      expect(completeCalls[0]).toMatchObject({
        errorCode: "AI_OUTPUT_INVALID",
        invalidOutputReason,
      });
      expect(JSON.stringify(completeCalls)).not.toContain("wrong_sentinel");
      expect(JSON.stringify(completeCalls)).not.toContain("Here is the result");
    },
  );
});


describe("AI usage cost integrity", () => {
  const now = new Date("2026-10-04T12:00:00Z");
  async function recorded(usage: unknown, status = 200, models: {requested?: string; resolved?: string; providerId?: string} = {}) {
    const requestedModel = models.requested ?? "synthetic-model", resolvedModel = models.resolved ?? requestedModel;
    vi.useFakeTimers({toFake: ["Date"]}); vi.setSystemTime(now);
    try {
      const cost = createInMemoryAiCostService(); await cost.savePricing({...samplePricing, providerId: models.providerId ?? "9router-an", modelId: requestedModel});
      const fetchSpy = vi.fn(async () => jsonResponse({...responseBody('{"value":"sentinel"}'), model: resolvedModel, usage}, status));
      const adapter = createOpenAiCompatibleAdapter({baseUrl: "https://ai.synthetic.test/v1", apiKey: "synthetic",
        modelId: requestedModel, allowedResolvedModelIds: [requestedModel, resolvedModel], providerId: models.providerId, timeoutMs: 100, retryCount: 0,
        productionGate: createAiProductionGate("approved"), costRecorder: cost.recorder, fetchImpl: fetchSpy});
      const result = await adapter.generateStructured({...request, use: "production_report_generation", costContext: {chartId: "usage-integrity"}});
      return {result, summary: await cost.getAiCogsPerChart("usage-integrity"), calls: fetchSpy.mock.calls.length};
    } finally {vi.useRealTimers();}
  }
  const complete = {prompt_tokens: 1000, completion_tokens: 500, total_tokens: 1500};
  const unresolved: Array<[string, unknown]> = [
    ["missing input", {completion_tokens: 500}], ["missing output", {prompt_tokens: 1000}],
    ["null input", {...complete, prompt_tokens: null}], ["numeric string", {...complete, completion_tokens: "500"}],
    ["negative", {...complete, prompt_tokens: -1}], ["fraction", {...complete, completion_tokens: 0.5}],
    ["unsafe integer", {...complete, prompt_tokens: Number.MAX_SAFE_INTEGER + 1}],
    ["overflowing total", {prompt_tokens: Number.MAX_SAFE_INTEGER, completion_tokens: 1}],
    ["contradictory total", {...complete, total_tokens: 1600}], ["null total", {...complete, total_tokens: null}],
    ["negative cache", {...complete, cached_tokens: -1}], ["cache beyond input", {...complete, cached_tokens: 1001}],
    ["cache aliases disagree", {...complete, cached_tokens: 10, prompt_tokens_details: {cached_tokens: 11}}],
    ["malformed detail", {...complete, completion_tokens_details: []}],
    ["nested reasoning", {...complete, completion_tokens_details: {reasoning_tokens: 200}}],
    ["top-level reasoning", {...complete, reasoning_tokens: 200}],
    ["nested cache creation", {...complete, prompt_tokens_details: {cache_creation_tokens: 100}}],
    ["top-level cache creation", {...complete, cache_creation_input_tokens: 100}],
    ["unsupported cache read", {...complete, cache_read_input_tokens: 100}],
    ["audio", {...complete, prompt_tokens_details: {audio_tokens: 20}}],
    ["prediction", {...complete, completion_tokens_details: {rejected_prediction_tokens: 20}}],
    ["malformed extra counter", {...complete, completion_tokens_details: {reasoning_tokens: null}}],
  ];
  it.each(unresolved)("keeps %s unresolved instead of inventing a partial cost", async (_name, usage) => {
    const evidence = await recorded(usage);
    expect(evidence.calls).toBe(1); expect(evidence.result).toMatchObject({ok: true, value: {usage: {tokensUnknown: true, costStatus: "unknown"}}});
    expect(evidence.summary).toMatchObject({hasIncompleteAttempts: true, unknownAttemptCount: 1});
    expect(evidence.summary.records).toHaveLength(1);
    expect(evidence.summary.records[0]).toMatchObject({tokensUnknown: true, costStatus: "unknown"});
    expect(evidence.summary.records[0]!.costVnd).toBeUndefined(); expect(evidence.summary.records[0]!.costMicroVnd).toBeUndefined();
  });
  it.each(["top-level", "prompt_tokens_details", "completion_tokens_details", "input_tokens_details", "output_tokens_details"].flatMap(location =>
    ["reasoning_tokens", "cache_creation_input_tokens", "cache_creation_tokens", "cache_read_input_tokens", "audio_tokens", "accepted_prediction_tokens", "rejected_prediction_tokens"]
      .map(dimension => [location, dimension] as const)))
    ("keeps unpriced %s.%s out of resolved COGS", async (location, dimension) => {
      const extra = location === "top-level" ? {[dimension]: 100} : {[location]: {[dimension]: 100}};
      const evidence = await recorded({...complete, ...extra});
      expect(evidence.result).toMatchObject({ok: true, value: {usage: {tokensUnknown: true, costStatus: "unknown"}}});
      expect(evidence.summary).toMatchObject({hasIncompleteAttempts: true, unknownAttemptCount: 1});
      expect(evidence.summary.records).toHaveLength(1);
      expect(evidence.summary.records[0]).toMatchObject({tokensUnknown: true, costStatus: "unknown"});
      expect(evidence.summary.records[0]!.costMicroVnd).toBeUndefined();
    });
  it.each([
    {requested: "ag/gemini-3.8-flash"},
    {requested: "ag/gemini-3.8-flash", resolved: "gemini-3.8-flash"},
    {requested: "synthetic-alias", resolved: "ag/gemini-3.8-flash"},
    {requested: "gemini-3.8-flash"},
  ])("quarantines complete-looking 9router Gemini usage %#", async models => {
    const evidence = await recorded({...complete, completion_tokens_details: {reasoning_tokens: 0}, cached_tokens: 0}, 200, models);
    expect(evidence.result).toMatchObject({ok: true, value: {value: {value: "sentinel"}, usage: {tokensUnknown: true, costStatus: "unknown"}}});
    expect(evidence.calls).toBe(1); expect(evidence.summary).toMatchObject({hasIncompleteAttempts: true, unknownAttemptCount: 1});
    expect(evidence.summary.records[0]).toMatchObject({tokensUnknown: true, costStatus: "unknown"});
    expect(evidence.summary.records[0]!.costMicroVnd).toBeUndefined();
  });
  it("retains supported cost for an explicitly different provider", async () => {
    const evidence = await recorded(complete, 200, {requested: "ag/gemini-3.8-flash", providerId: "openrouter"});
    expect(evidence.result).toMatchObject({ok: true, value: {usage: {tokensUnknown: false, costStatus: "resolved"}}});
    expect(evidence.summary.records[0]).toMatchObject({costStatus: "resolved", costMicroVnd: "45000000"});
  });
  it("keeps Gemini probe cost unknown without a recorder while retaining structured output", async () => {
    const modelId = "ag/gemini-3.8-flash";
    const adapter = createOpenAiCompatibleAdapter({baseUrl: "https://ai.synthetic.test/v1", apiKey: "synthetic", modelId,
      allowedResolvedModelIds: [modelId], timeoutMs: 100, retryCount: 0, productionGate: createAiProductionGate("approved"),
      fetchImpl: async () => jsonResponse({...responseBody('{"value":"sentinel"}'), model: modelId, usage: complete})});
    expect(await adapter.generateStructured(request)).toMatchObject({ok: true, value: {value: {value: "sentinel"}, usage: {tokensUnknown: true, costStatus: "unknown"}}});
  });
  it("also records incomplete usage from an HTTP error as unknown", async () => {
    const evidence = await recorded({prompt_tokens: 1000}, 500);
    expect(evidence.calls).toBe(1); expect(evidence.result).toMatchObject({ok: false});
    expect(evidence.summary.records[0]).toMatchObject({tokensUnknown: true, costStatus: "unknown"});
  });
  it.each(["cached_tokens", "prompt_cache_hit_tokens", "prompt_tokens_details", "input_tokens_details"])("preserves exact supported cache cost via %s", async alias => {
    const cache = alias.endsWith("details") ? {[alias]: {cached_tokens: 300}} : {[alias]: 300};
    const evidence = await recorded({...complete, ...cache});
    expect(evidence.summary).toMatchObject({hasIncompleteAttempts: false, unknownAttemptCount: 0});
    expect(evidence.summary.records[0]).toMatchObject({inputTokens: 1000, outputTokens: 500, cachedTokens: 300,
      totalTokens: 1500, tokensUnknown: false, costStatus: "resolved", costMicroVnd: "41625000", costVnd: 42});
  });
  it("derives a missing total from two complete counters and accepts zero extra dimensions", async () => {
    const evidence = await recorded({prompt_tokens: 1000, completion_tokens: 500, completion_tokens_details: {reasoning_tokens: 0}, prompt_tokens_details: {cache_creation_tokens: 0}});
    expect(evidence.summary.records[0]).toMatchObject({totalTokens: 1500, costStatus: "resolved", costMicroVnd: "45000000", costVnd: 45});
  });
});
