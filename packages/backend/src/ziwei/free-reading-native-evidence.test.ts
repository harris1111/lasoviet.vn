import { describe, expect, it } from "vitest";
import { FreeReadingContentV2Schema } from "@lasoviet/contracts";
import { prepareOpenAiCompatibleStructuredRequest } from "../ai/openai-compatible-adapter.js";
import { inspectFreeReadingNativeEvidence, type FreeReadingNativeExpectedPins } from "./free-reading-native-evidence.js";

const hash = (character: string) => character.repeat(64);
const expected: FreeReadingNativeExpectedPins = {
  clientRequestSha256: hash("a"), nativeRequestSha256: hash("b"), visibleOutputSha256: hash("c"), imageSha256: hash("d"),
  moduleSha256: { serializer: hash("e"), executor: hash("f"), thinking: hash("a"), usage: hash("b"), transport: hash("c") },
};
const fixture = () => ({ wire: { clientRequestSha256: expected.clientRequestSha256, nativeRequestSha256: expected.nativeRequestSha256,
  imageSha256: expected.imageSha256, moduleSha256: { ...expected.moduleSha256 }, model: "gemini-3.8-flash-medium",
  endpoint: "https://daily-cloudcode-pa.googleapis.com/v1internal:generateContent", requestedOutputTokens: 10000,
  effectiveOutputTokens: 16384, thinkingLevel: "medium", includeThoughts: true, retryCapable: true },
  receipt: { requestSha256: expected.nativeRequestSha256, responseSha256: hash("e"), visibleOutputSha256: expected.visibleOutputSha256,
    modelVersion: "gemini-3.8-flash-medium", finishReason: "STOP", candidateCount: 1,
    usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 20, cachedContentTokenCount: 0, thoughtsTokenCount: 10, totalTokenCount: 130 } },
});
const inspect = (input: unknown) => inspectFreeReadingNativeEvidence(input, expected);

describe("disconnected whole-free native diagnostics", () => {
  it.each(["vi", "en"] as const)("binds the existing exact %s client serializer without promoting native counters to a proof", locale => {
    const wire = prepareOpenAiCompatibleStructuredRequest({ schema: FreeReadingContentV2Schema, schemaName: "free_reading_v2",
      system: locale === "vi" ? "Viết luận giải theo dữ kiện." : "Write a reading from the facts.", user: JSON.stringify({ locale }),
      use: "synthetic_capability_probe", maxOutputTokens: 10000 }, { baseUrl: "https://synthetic.test/v1", modelId: "gemini-3.8-flash-medium" });
    const input = fixture(); input.wire.clientRequestSha256 = wire.bodySha256;
    const pins = { ...expected, clientRequestSha256: wire.bodySha256 };
    const result = inspectFreeReadingNativeEvidence(input, pins);
    expect(JSON.parse(wire.body).max_tokens).toBe(10000);
    expect(result.reasons).not.toContain("wire_pins_mismatch");
    expect(result.reasons).toContain("native_output_limit_drift");
    expect(result.tokenBoundProof).toBeNull();
  });
  it("reports installed medium output floor and retry risk without granting authority", () => {
    const result = inspect(fixture());
    expect(result).toMatchObject({ kind: "prepared_unproven", boundStatus: "unproven_bound", executionReady: false,
      tokenBoundProof: null, singlePhysicalCallBoundProof: null, settlementAuthorized: false });
    expect(result.reasons).toContain("native_output_limit_drift");
    expect(result.reasons).toContain("retry_capable_or_unknown_transport");
    expect(result.usage).toMatchObject({ kind: "complete_unverified", inputTokens: 100, candidateTokens: 20, thinkingTokens: 10, billableOutputTokens: 30, totalTokens: 130 });
  });
  it("accepts both source-supported receipt model versions while preserving the exact medium wire model", () => {
    const input = fixture(); input.receipt.modelVersion = "gemini-3.8-flash";
    expect(inspect(input).usage.kind).toBe("complete_unverified");
    input.wire.model = "gemini-3.8-flash";
    expect(inspect(input).reasons).toContain("native_destination_or_model_mismatch");
    expect(inspect(input).executionReady).toBe(false);
  });
  it("matching output and nonretry counters cannot prove input/output or one-send enforcement", () => {
    const input = fixture(); input.wire.effectiveOutputTokens = 10000; input.wire.retryCapable = false;
    const result = inspect(input);
    expect(result.reasons).toEqual(["input_enforcement_unproven", "output_thinking_enforcement_unproven", "single_physical_send_unproven"]);
    expect(result.executionReady).toBe(false);
    expect(inspect(input)).toEqual(result);
    expect(inspect({ ...input, singlePhysicalCallBoundProof: { authorized: true, sends: 1 } }).reasons).toContain("caller_send_claim_untrusted");
  });
  it.each([null, [], "credential", { wire: fixture().wire, privateBirth: "private" }])("fails closed on malformed or extended envelope", input => {
    const result = inspect(input); expect(result.reasons).toContain("wire_envelope_invalid");
    expect(result.usage.kind).toBe("unknown_usage"); expect(JSON.stringify(result)).not.toContain("privateBirth");
  });
  it.each(["clientRequestSha256", "nativeRequestSha256", "imageSha256"] as const)("rejects changed %s", key => {
    const input = fixture(); input.wire[key] = hash("0"); expect(inspect(input).reasons).toContain("wire_pins_mismatch");
  });
  it("rejects incomplete or changed installed source pins", () => {
    const input = fixture(); input.wire.moduleSha256.transport = hash("0");
    expect(inspect(input).reasons).toContain("wire_pins_mismatch");
    expect(inspect({ ...input, wire: { ...input.wire, moduleSha256: {} } }).reasons).toContain("wire_pins_mismatch");
  });
  it.each(["model", "endpoint", "thinkingLevel", "includeThoughts"] as const)("rejects changed %s", key => {
    const input = fixture(); const wire = { ...input.wire, [key]: "wrong" };
    expect(inspect({ ...input, wire }).reasons.length).toBeGreaterThan(5);
  });
  it.each(["promptTokenCount", "candidatesTokenCount", "cachedContentTokenCount", "thoughtsTokenCount", "totalTokenCount"] as const)("preserves absence of %s instead of assuming zero", key => {
    const input = fixture(); const usage: Record<string, unknown> = { ...input.receipt.usageMetadata }; delete usage[key];
    const result = inspect({ ...input, receipt: { ...input.receipt, usageMetadata: usage } });
    expect(result.usage).toMatchObject({ kind: "unknown_usage", counterPresence: { [key]: false } });
  });
  it("accepts explicit zero and charges thinking exactly once", () => {
    const input = fixture(); input.receipt.usageMetadata.thoughtsTokenCount = 0; input.receipt.usageMetadata.totalTokenCount = 120;
    expect(inspect(input).usage).toMatchObject({ kind: "complete_unverified", thinkingTokens: 0, billableOutputTokens: 20 });
    input.receipt.usageMetadata.totalTokenCount = 130;
    expect(inspect(input).usage.kind).toBe("unknown_usage");
  });
  it.each([{ cachedContentTokenCount: 101 }, { totalTokenCount: 140 }, { thoughtsTokenCount: -1 }, { promptTokenCount: Number.MAX_SAFE_INTEGER }, { prompt_tokens: 100 }, { trafficType: "PROVISIONED_THROUGHPUT" }, { serviceTier: "PRIORITY" }, { toolUsePromptTokenCount: 1 }, { promptTokensDetails: [{ modality: "IMAGE", tokenCount: 100 }] }, { cacheTokensDetails: [{ modality: "TEXT", tokenCount: 1 }] }])("rejects contradictory or unsupported billing metadata %j", patch => {
    const input = fixture(); expect(inspect({ ...input, receipt: { ...input.receipt, usageMetadata: { ...input.receipt.usageMetadata, ...patch } } }).usage.kind).toBe("unknown_usage");
  });
  it("accepts closed text detail totals and standard tier", () => {
    const input = fixture();
    expect(inspect({ ...input, receipt: { ...input.receipt, usageMetadata: { ...input.receipt.usageMetadata,
      promptTokensDetails: [{ modality: "TEXT", tokenCount: 100 }], cacheTokensDetails: [], candidatesTokensDetails: [{ modality: "TEXT", tokenCount: 20 }], toolUsePromptTokensDetails: [], serviceTier: "STANDARD", trafficType: "ON_DEMAND" } } }).usage.kind).toBe("complete_unverified");
  });
  it.each([{ requestSha256: hash("0") }, { visibleOutputSha256: hash("0") }, { responseSha256: "invalid" }, { modelVersion: "other" }, { finishReason: "MAX_TOKENS" }, { candidateCount: 2 }, { thoughts: "private" }])("rejects unbound or unfinished receipt %j", patch => {
    const input = fixture(); const result = inspect({ ...input, receipt: { ...input.receipt, ...patch } });
    expect(result.usage.kind).toBe("unknown_usage"); expect(JSON.stringify(result)).not.toContain("private");
  });
  it("reports observed limit violations without confusing them with enforcement", () => {
    const input = fixture(); input.receipt.usageMetadata.promptTokenCount = 16001; input.receipt.usageMetadata.candidatesTokenCount = 10000;
    input.receipt.usageMetadata.totalTokenCount = 26011;
    expect(inspect(input).usage).toMatchObject({ kind: "complete_unverified", inputWithinRequestedLimit: false, outputWithinRequestedLimit: false });
    expect(inspect(input).executionReady).toBe(false);
  });
});
