import { createHash } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { FreeReadingContentV2Schema, type FreeReadingFactsV2, type NormalizedBirthProfileV1 } from "@lasoviet/contracts";
import { IztroAdapter } from "../../../engine-adapters/src/index.js";
import { createAiProductionGate, createOpenAiCompatibleAdapter } from "../ai/openai-compatible-adapter.js";
import { buildFreeReadingFacts } from "./free-reading-facts.js";
import { compileFreeReadingFallback } from "./free-reading-fallback.js";
import { freezeFreeReadingCall } from "./free-reading-writer.js";
import { prepareFreeReadingOpenAiCompatibleWire } from "./free-reading-wire.js";

const tariff = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", pricingVersion: "synthetic",
  providerId: "9router-an", modelId: "synthetic-model", inputPricePerMillion: 20000,
  outputPricePerMillion: 100000, cachedInputPricePerMillion: 2000 };
let sources: Record<"vi" | "en", FreeReadingFactsV2>;
beforeAll(async () => {
  const time = { precision: "exact_minute" as const, localTime: "08:30" };
  const profile: NormalizedBirthProfileV1 = { version: 1,
    originalInput: { version: 1, calendar: { kind: "solar", date: "1992-06-15" }, time,
      timezone: { offsetMinutes: 420 }, gender: "male", consentVersion: "synthetic" },
    normalizedCalendar: { kind: "solar", date: "1992-06-15" }, normalizedTime: time,
    timezoneProvenance: { source: "offset", offsetMinutes: 420 }, normalizationWarnings: [], limitations: [] };
  const output = await new IztroAdapter().calculate({ birthProfile: profile });
  if (!output.ok) throw new Error("SYNTHETIC_ENGINE_FAILED");
  sources = { vi: buildFreeReadingFacts({ chart: output.output, focusPalaceId: output.output.soulPalaceId, locale: "vi" }),
    en: buildFreeReadingFacts({ chart: output.output, focusPalaceId: output.output.soulPalaceId, locale: "en" }) };
});
const callFor = (locale: "vi" | "en" = "vi") => freezeFreeReadingCall({ requestId: "PRIVATE_REQUEST",
  chartVersionId: "PRIVATE_CHART", source: sources[locale], tariff });
const options = { baseUrl: "https://ai.synthetic.test/v1/", modelId: tariff.modelId };

describe("private whole-reading exact wire preparation", () => {
  it.each(["vi", "en"] as const)("captures the exact %s adapter request without claiming a token proof", async locale => {
    const call = callFor(locale), prepared = prepareFreeReadingOpenAiCompatibleWire(call, options);
    if (prepared.kind !== "prepared_unproven") throw new Error("Preparation refused");
    expect(prepared.tokenBoundProof).toBeNull();
    expect(prepared.wire.endpoint).toBe("https://ai.synthetic.test/v1/chat/completions");
    expect(prepared.wire.body).not.toBe(call.serializedPrompt);
    expect(prepared.wire.bodySha256).toBe(createHash("sha256").update(prepared.wire.body).digest("hex"));
    for (const secret of ["PRIVATE_CHART", "PRIVATE_REQUEST", "1992-06-15", "08:30", "synthetic-secret"]) {
      expect(JSON.stringify(prepared.wire)).not.toContain(secret);
    }
    const payload = JSON.parse(prepared.wire.body);
    expect(payload.model).toBe(tariff.modelId); expect(payload.max_tokens).toBe(10000);
    expect(payload.stream).toBe(false); expect(payload.messages[0].content).toContain("Authoritative output contract");
    expect(payload.response_format.json_schema).toMatchObject({ name: "free_reading_v2", strict: true });
    expect(payload.messages[0].content).toContain(JSON.stringify(payload.response_format.json_schema.schema));
    expect(JSON.parse(payload.messages[1].content).FACTS).toEqual(call.source);
    const bodies: string[] = [];
    const adapter = createOpenAiCompatibleAdapter({ ...options, apiKey: "synthetic-secret", allowedResolvedModelIds: [tariff.modelId],
      timeoutMs: 1000, retryCount: 0, productionGate: createAiProductionGate("pending"),
      fetchImpl: async (_url, init) => { bodies.push(String(init?.body)); return new Response(JSON.stringify({ model: tariff.modelId,
        choices: [{ message: { content: JSON.stringify(compileFreeReadingFallback(call.source)) } }] }), { status: 200 }); } });
    const result = await adapter.generateStructured({ ...prepared.request, use: "synthetic_capability_probe" });
    expect(result.ok).toBe(true); expect(bodies).toEqual([prepared.wire.body]);
    expect(FreeReadingContentV2Schema.safeParse(compileFreeReadingFallback(call.source)).success).toBe(true);
    expect(prepareFreeReadingOpenAiCompatibleWire(call, options)).toEqual(prepared);
  });
  it("rejects frozen source or prompt tampering", () => {
    const call = callFor();
    expect(prepareFreeReadingOpenAiCompatibleWire({ ...call, serializedPrompt: call.serializedPrompt + " " }, options))
      .toEqual({ kind: "refused", reason: "frozen_call_invalid" });
    expect(prepareFreeReadingOpenAiCompatibleWire({ ...call, sourceHash: "0".repeat(64) }, options))
      .toEqual({ kind: "refused", reason: "frozen_call_invalid" });
  });
  it("refuses provider or model drift before constructing a usable request", () => {
    expect(prepareFreeReadingOpenAiCompatibleWire(callFor(), { ...options, modelId: "other" }))
      .toEqual({ kind: "refused", reason: "provider_model_mismatch" });
    expect(prepareFreeReadingOpenAiCompatibleWire(callFor(), { ...options, baseUrl: "https://openrouter.ai/api/v1" }))
      .toEqual({ kind: "refused", reason: "provider_model_mismatch" });
  });
  it.each(["invalid", "file:///private", "https://user:password@ai.synthetic.test/v1", "https://ai.synthetic.test/v1?api_key=secret", "https://ai.synthetic.test/v1#secret"])("rejects invalid or credential-bearing endpoint %s", baseUrl => {
    expect(prepareFreeReadingOpenAiCompatibleWire(callFor(), { ...options, baseUrl }))
      .toEqual({ kind: "refused", reason: "endpoint_invalid" });
  });
  it("does not infer approval from matching wire bytes", async () => {
    const prepared = prepareFreeReadingOpenAiCompatibleWire(callFor(), options);
    if (prepared.kind !== "prepared_unproven") throw new Error("Preparation refused");
    let calls = 0;
    const adapter = createOpenAiCompatibleAdapter({ ...options, apiKey: "synthetic-secret", allowedResolvedModelIds: [tariff.modelId],
      timeoutMs: 1000, retryCount: 0, productionGate: createAiProductionGate("pending"), fetchImpl: async () => { calls++; throw new Error("Unexpected send"); } });
    expect(await adapter.generateStructured(prepared.request)).toMatchObject({ ok: false, error: { code: "AI_PROVIDER_NOT_APPROVED" } });
    expect(calls).toBe(0);
  });
});
