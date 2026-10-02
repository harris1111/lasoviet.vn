import { describe, expect, it } from "vitest";
import { freezeFreePalaceCostContext } from "./free-palace-cost-context.js";
const pricing = { id: "price-a", pricingVersion: "v1", providerId: "fixture", modelId: "fixture-model", currency: "VND", status: "active", inputPricePerMillion: 3, outputPricePerMillion: 7, effectiveFrom: new Date("2026-10-01T00:00:00Z") };
const input = { provider: "fixture", model: "fixture-model", finalSerializedRequest: '{"prompt":"all evidence and schema"}', maxOutputTokens: 20, now: new Date("2026-10-02T00:00:00Z"), pricing, proof: { serializedRequestHash: "", maxInputTokens: 10, enforcedMaxOutputTokens: 20, semanticsVersion: "fixture-proven-v1" } };
describe("free palace proven cost bound", () => {
  it("requires proof for the exact final serialized request", () => {
    expect(freezeFreePalaceCostContext(input)).toEqual({ ok: false, reason: "unproven_bound" });
    expect(freezeFreePalaceCostContext({ ...input, proof: null })).toEqual({ ok: false, reason: "unproven_bound" });
  });
  it("freezes exact integer micro-VND with no cached-token discount", async () => {
    const { createHash } = await import("node:crypto");
    const proof = { ...input.proof, serializedRequestHash: createHash("sha256").update(input.finalSerializedRequest).digest("hex") };
    const result = freezeFreePalaceCostContext({ ...input, proof });
    expect(result.ok && result.value.reservedMicroVnd).toBe(170n);
    expect(result.ok && result.value.pricingSnapshotId).toBe("price-a");
    expect(freezeFreePalaceCostContext({ ...input, proof, finalSerializedRequest: "changed" })).toEqual({ ok: false, reason: "unproven_bound" });
    expect(freezeFreePalaceCostContext({ ...input, proof, maxOutputTokens: 21 })).toEqual({ ok: false, reason: "unproven_bound" });
  });
  it.each([{ status: "pending_approval" }, { currency: "USD" }, { inputPricePerMillion: -1 }, { effectiveFrom: new Date("2026-10-03") }, { providerId: "different" }, { id: undefined }])("rejects unapproved or mismatched tariffs %j", (change) => {
    expect(freezeFreePalaceCostContext({ ...input, pricing: { ...pricing, ...change } }).ok).toBe(false);
  });
});
