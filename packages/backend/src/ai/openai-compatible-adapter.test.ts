import { describe, expect, it } from "vitest";
import { z } from "@lasoviet/contracts";

import {
  createAiProductionGate,
  createOpenAiCompatibleAdapter,
} from "./openai-compatible-adapter.js";

const schema = z.object({ value: z.literal("sentinel") }).strict();
const request = { schema, schemaName: "synthetic_response", system: "system", user: "user", use: "synthetic_capability_probe" as const, maxOutputTokens: 80 };
const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const responseBody = (content: string) => ({ model: "synthetic-model", choices: [{ message: { content } }] });

describe("OpenAI-compatible adapter", () => {
  it("uses strict JSON schema output and validates a structured success", async () => {
    const calls: RequestInit[] = [];
    const provider = createOpenAiCompatibleAdapter({
      baseUrl: "https://ai.synthetic.test/v1/",
      apiKey: "not-a-real-secret",
      modelId: "synthetic-model",
      timeoutMs: 100,
      retryCount: 0,
      productionGate: createAiProductionGate("pending"),
      fetchImpl: async (_url, init) => {
        calls.push(init!);
        return jsonResponse(responseBody('{"value":"sentinel"}'));
      },
    });

    await expect(provider.generateStructured(request)).resolves.toMatchObject({
      ok: true,
      value: { value: { value: "sentinel" }, providerId: "9router-an", modelId: "synthetic-model" },
    });
    expect(JSON.parse(String(calls[0].body))).toMatchObject({
      stream: false,
      response_format: { type: "json_schema", json_schema: { name: "synthetic_response", strict: true } },
    });
  });

  it("blocks production requests while pending but permits synthetic probes", async () => {
    const provider = createOpenAiCompatibleAdapter({
      baseUrl: "https://ai.synthetic.test",
      apiKey: "not-a-real-secret",
      modelId: "synthetic-model",
      timeoutMs: 100,
      retryCount: 0,
      productionGate: createAiProductionGate("pending"),
      fetchImpl: async () => jsonResponse(responseBody('{"value":"sentinel"}')),
    });

    await expect(provider.generateStructured({ ...request, use: "production_report_generation" })).resolves.toMatchObject({
      ok: false, error: { code: "AI_PROVIDER_NOT_APPROVED" },
    });
    await expect(provider.generateStructured(request)).resolves.toMatchObject({ ok: true });
  });

  it("retries retryable HTTP failures but not non-retryable failures", async () => {
    let attempts = 0;
    const provider = createOpenAiCompatibleAdapter({
      baseUrl: "https://ai.synthetic.test",
      apiKey: "not-a-real-secret",
      modelId: "synthetic-model",
      timeoutMs: 100,
      retryCount: 1,
      productionGate: createAiProductionGate("approved"),
      fetchImpl: async () => {
        attempts += 1;
        return attempts === 1 ? jsonResponse({ error: { message: "busy" } }, 429) : jsonResponse(responseBody('{"value":"sentinel"}'));
      },
    });
    await expect(provider.generateStructured(request)).resolves.toMatchObject({ ok: true });
    expect(attempts).toBe(2);

    attempts = 0;
    const denied = createOpenAiCompatibleAdapter({
      baseUrl: "https://ai.synthetic.test",
      apiKey: "not-a-real-secret",
      modelId: "synthetic-model",
      timeoutMs: 100,
      retryCount: 2,
      productionGate: createAiProductionGate("approved"),
      fetchImpl: async () => {
        attempts += 1;
        return jsonResponse({ error: { message: "denied" } }, 401);
      },
    });
    await expect(denied.generateStructured(request)).resolves.toMatchObject({ ok: false, error: { retryable: false } });
    expect(attempts).toBe(1);
  });

  it("classifies timeouts and rejects fenced or malformed output", async () => {
    const timeout = createOpenAiCompatibleAdapter({
      baseUrl: "https://ai.synthetic.test",
      apiKey: "not-a-real-secret",
      modelId: "synthetic-model",
      timeoutMs: 1,
      retryCount: 0,
      productionGate: createAiProductionGate("approved"),
      fetchImpl: async (_url, init) => new Promise((_, reject) => init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")))),
    });
    await expect(timeout.generateStructured(request)).resolves.toMatchObject({ ok: false, error: { code: "AI_TIMEOUT" } });

    const malformed = createOpenAiCompatibleAdapter({
      baseUrl: "https://ai.synthetic.test",
      apiKey: "not-a-real-secret",
      modelId: "synthetic-model",
      timeoutMs: 100,
      retryCount: 0,
      productionGate: createAiProductionGate("approved"),
      fetchImpl: async () => jsonResponse(responseBody("```json\n{\"value\":\"sentinel\"}\n```")),
    });
    await expect(malformed.generateStructured(request)).resolves.toMatchObject({ ok: false, error: { code: "AI_OUTPUT_INVALID" } });
  });

  it("retries a timed-out attempt and returns timeout only after the retry budget is exhausted", async () => {
    let attempts = 0;
    const provider = createOpenAiCompatibleAdapter({
      baseUrl: "https://ai.synthetic.test",
      apiKey: "not-a-real-secret",
      modelId: "synthetic-model",
      timeoutMs: 1,
      retryCount: 1,
      productionGate: createAiProductionGate("approved"),
      fetchImpl: async (_url, init) => {
        attempts += 1;
        if (attempts === 2) return jsonResponse(responseBody('{"value":"sentinel"}'));
        return new Promise((_, reject) => init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError"))));
      },
    });
    await expect(provider.generateStructured(request)).resolves.toMatchObject({ ok: true });
    expect(attempts).toBe(2);

    attempts = 0;
    const exhausted = createOpenAiCompatibleAdapter({
      baseUrl: "https://ai.synthetic.test",
      apiKey: "not-a-real-secret",
      modelId: "synthetic-model",
      timeoutMs: 1,
      retryCount: 1,
      productionGate: createAiProductionGate("approved"),
      fetchImpl: async (_url, init) => {
        attempts += 1;
        return new Promise((_, reject) => init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError"))));
      },
    });
    await expect(exhausted.generateStructured(request)).resolves.toMatchObject({
      ok: false, error: { code: "AI_TIMEOUT", retryable: true },
    });
    expect(attempts).toBe(2);
  });
  it("retries invalid non-JSON output and succeeds when next attempt returns schema-valid JSON", async () => {
    let attempts = 0;
    const calls: RequestInit[] = [];
    const provider = createOpenAiCompatibleAdapter({
      baseUrl: "https://ai.synthetic.test",
      apiKey: "not-a-real-secret",
      modelId: "synthetic-model",
      timeoutMs: 100,
      retryCount: 1,
      productionGate: createAiProductionGate("approved"),
      fetchImpl: async (_url, init) => {
        attempts += 1;
        calls.push(init!);
        if (attempts === 1) {
          return jsonResponse(responseBody("# Markdown Title\n\nThis is not JSON."));
        }
        return jsonResponse(responseBody("{\"value\":\"sentinel\"}"));
      },
    });

    const result = await provider.generateStructured(request);
    expect(result).toMatchObject({
      ok: true,
      value: { value: { value: "sentinel" }, providerId: "9router-an", modelId: "synthetic-model" },
    });
    expect(attempts).toBe(2);

    const firstBody = JSON.parse(String(calls[0].body));
    expect(firstBody.messages[0].content).toMatch(/one JSON object only/i);
    expect(firstBody.messages[0].content).toMatch(/no Markdown/i);

    const secondBody = JSON.parse(String(calls[1].body));
    expect(secondBody.messages[0].content).toMatch(/correction/i);
  });

  it("extracts and validates the first complete JSON object when trailing prose is present", async () => {
    const trailingProseContent = "{\"value\":\"sentinel\"}\n\nHere is some trailing explanation that should be ignored.";
    const provider = createOpenAiCompatibleAdapter({
      baseUrl: "https://ai.synthetic.test",
      apiKey: "not-a-real-secret",
      modelId: "synthetic-model",
      timeoutMs: 100,
      retryCount: 0,
      productionGate: createAiProductionGate("approved"),
      fetchImpl: async () => jsonResponse(responseBody(trailingProseContent)),
    });

    const result = await provider.generateStructured(request);
    expect(result).toMatchObject({
      ok: true,
      value: { value: { value: "sentinel" } },
    });
  });

  it("rejects responses with leading prose", async () => {
    const leadingProse = createOpenAiCompatibleAdapter({
      baseUrl: "https://ai.synthetic.test",
      apiKey: "not-a-real-secret",
      modelId: "synthetic-model",
      timeoutMs: 100,
      retryCount: 0,
      productionGate: createAiProductionGate("approved"),
      fetchImpl: async () => jsonResponse(responseBody("Here is the json: {\"value\":\"sentinel\"}")),
    });
    await expect(leadingProse.generateStructured(request)).resolves.toMatchObject({
      ok: false,
      error: { code: "AI_OUTPUT_INVALID" },
    });
  });

  it("does not add correction note on retryable HTTP status retry", async () => {
    let attempts = 0;
    const calls: RequestInit[] = [];
    const provider = createOpenAiCompatibleAdapter({
      baseUrl: "https://ai.synthetic.test",
      apiKey: "not-a-real-secret",
      modelId: "synthetic-model",
      timeoutMs: 100,
      retryCount: 1,
      productionGate: createAiProductionGate("approved"),
      fetchImpl: async (_url, init) => {
        attempts += 1;
        calls.push(init!);
        return attempts === 1 ? jsonResponse({ error: { message: "busy" } }, 429) : jsonResponse(responseBody("{\"value\":\"sentinel\"}"));
      },
    });
    await expect(provider.generateStructured(request)).resolves.toMatchObject({ ok: true });
    expect(attempts).toBe(2);
    const retryBody = JSON.parse(String(calls[1].body));
    expect(retryBody.messages[0].content).not.toMatch(/correction/i);
    expect(retryBody.messages[0].content).toMatch(/one JSON object only/i);
  });
});
