import { describe, expect, it, vi } from "vitest";
import { z } from "@lasoviet/contracts";
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
