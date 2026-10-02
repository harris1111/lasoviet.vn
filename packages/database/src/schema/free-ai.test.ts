import { describe, expect, it } from "vitest";
import { getTableConfig } from "drizzle-orm/pg-core";
import { freeAiChartBudgets, freeAiDailyBudgets, freeAiQuotaSubjects, freeAiQuotaAliases, freeAiRequests, freeAiAdmissions, freeAiSettlements, freeAiArtifacts } from "./free-ai.js";

describe("durable free AI schema", () => {
  it("stores money as bigint and enforces unique chart gift slots", () => {
    expect(freeAiChartBudgets.reservedMicroVnd.dataType).toBe("bigint");
    expect(freeAiDailyBudgets.resolvedMicroVnd.dataType).toBe("bigint");
    expect(getTableConfig(freeAiRequests).indexes.some((i) => i.config.unique && i.config.name === "free_ai_requests_chart_slot_unique")).toBe(true);
  });
  it("keeps quota identity independent of cascading auth rows", () => {
    expect(getTableConfig(freeAiQuotaSubjects).foreignKeys).toHaveLength(0);
    expect(getTableConfig(freeAiQuotaAliases).foreignKeys.every((fk) => fk.onDelete === "restrict")).toBe(true);
    expect(getTableConfig(freeAiAdmissions).indexes.some((i) => i.config.unique)).toBe(true);
    expect(getTableConfig(freeAiSettlements).indexes.some((i) => i.config.unique)).toBe(true);
  });
  it("separates private content from accounting and tracks deletion and dispatch", () => {
    expect(freeAiArtifacts.expiresAt).toBeDefined();
    expect(freeAiArtifacts.deletionGeneration).toBeDefined();
    expect(freeAiRequests.dispatchDay).toBeDefined();
    expect(freeAiRequests.attemptId).toBeDefined();
    expect(Object.keys(freeAiSettlements)).not.toContain("content");
    expect(Object.keys(freeAiRequests)).not.toContain("serializedPrompt");
  });
});
