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
});
