import { describe, expect, it } from "vitest";
import { FreePalaceGiftContentV1Schema, FreePalaceGiftViewV1Schema, FreePalaceGiftFrozenCallV1Schema } from "./free-palace-gift-v1.js";
const point = { text: "A supported practical point", evidenceKeys: ["star:wenqu"] };
const reading = { palaceId: "ziwei.palace.career", title: "Career", conclusion: "A conclusion", keyPoints: [point, point, point], narrative: "Full reading", do: [point], avoid: [point], evidenceKeys: ["star:wenqu"] };
describe("free palace gift v1", () => {
  it("accepts one palace, rejects extra private fields and extra palaces", () => {
    expect(FreePalaceGiftContentV1Schema.safeParse(reading).success).toBe(true);
    expect(FreePalaceGiftContentV1Schema.safeParse({ ...reading, prompt: "private" }).success).toBe(false);
    expect(FreePalaceGiftContentV1Schema.safeParse({ ...reading, palaceId: [reading.palaceId] }).success).toBe(false);
  });
  it("does not allow prose in status-only fallbacks", () => {
    expect(FreePalaceGiftViewV1Schema.safeParse({ version: 1, status: "unavailable" }).success).toBe(true);
    expect(FreePalaceGiftViewV1Schema.safeParse({ version: 1, status: "unavailable", reading }).success).toBe(false);
  });
  it("requires bounded evidence and 3–5 key points", () => {
    expect(FreePalaceGiftContentV1Schema.safeParse({ ...reading, keyPoints: [point] }).success).toBe(false);
    expect(FreePalaceGiftContentV1Schema.safeParse({ ...reading, evidenceKeys: [""] }).success).toBe(false);
  });
});

const frozenCall = {
  version: 1, requestId: "123e4567-e89b-42d3-a456-426614174000",
  chartVersionId: "chart-v1", palaceId: "ziwei.palace.career", locale: "vi",
  provider: "approved-provider", model: "approved-model",
  promptVersion: "p1", rulesVersion: "r1", knowledgeVersion: "k1",
  scorerVersion: "s1", schemaVersion: "gift-v1", pricingSnapshotId: "price-v1",
  serializedPrompt: "Frozen final prompt", maxOutputTokens: 2000,
  reservedMicroVnd: "3000000000", deletionGeneration: 0,
};
describe("internal frozen gift call", () => {
  it("accepts an immutable, bounded call with integer money", () => {
    expect(FreePalaceGiftFrozenCallV1Schema.safeParse(frozenCall).success).toBe(true);
  });
  it.each([{ reservedMicroVnd: "1.5" }, { reservedMicroVnd: "-1" }, { maxOutputTokens: 0 }, { deletionGeneration: -1 }, { pricingSnapshotId: "" }, { retryCount: 1 }])("rejects invalid call configuration %j", (invalid) => {
    expect(FreePalaceGiftFrozenCallV1Schema.safeParse({ ...frozenCall, ...invalid }).success).toBe(false);
  });
  it("never accepts internal call data as a browser fallback", () => {
    expect(FreePalaceGiftViewV1Schema.safeParse({ version: 1, status: "requested", ...frozenCall }).success).toBe(false);
  });
});
