import { describe, expect, it } from "vitest";
import type { Database } from "@lasoviet/database";
import {
  FREE_AI_CHART_CEILING_MICRO_VND,
  FREE_AI_DAILY_CEILING_MICRO_VND,
  createFreeAiBudgetRepository,
} from "./free-ai-budget.repository.js";

const untouchable = new Proxy({}, { get() { throw new Error("database must not be reached"); } }) as unknown as Database;
const base = {
  flagEnabled: true, actor: { kind: "guest", id: "g", trusted: true } as const, concern: null, traceId: "t",
  authorizeSource: async () => ({ expiresAt: null }),
  lineage: { chartVersionId: "c", palaceId: "ziwei.palace.life", locale: "vi", promptVersion: "p", rulesVersion: "r", knowledgeVersion: "k", scorerVersion: "s", schemaVersion: "g", provider: "a", model: "m" } as const,
};
const cost = (overrides: Record<string, unknown> = {}) => ({
  pricingSnapshotId: "p", pricingVersion: "v", provider: "a", model: "m", inputPricePerMillion: 1n, outputPricePerMillion: 1n,
  serializedRequestHash: "0".repeat(64), finalSerializedRequest: "x", maxInputTokens: 1, maxOutputTokens: 1,
  semanticsVersion: "s", reservedMicroVnd: 1n, ...overrides,
});

describe("free AI budget ceilings", () => {
  it("keeps the founder-approved exact ceilings in micro-VND", () => {
    expect(FREE_AI_CHART_CEILING_MICRO_VND).toBe(3_000_000_000n);
    expect(FREE_AI_DAILY_CEILING_MICRO_VND).toBe(50_000_000_000n);
  });
  it("refuses a zero or provider-mismatched bound before touching the database", async () => {
    const repo = createFreeAiBudgetRepository(untouchable);
    await expect(repo.reserve({ ...base, cost: cost({ reservedMicroVnd: 0n }) })).resolves.toEqual({ kind: "refused", reason: "invalid_reservation" });
    await expect(repo.reserve({ ...base, cost: cost({ model: "other" }) })).resolves.toEqual({ kind: "refused", reason: "invalid_reservation" });
  });
});
