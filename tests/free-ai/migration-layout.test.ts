import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("free AI additive migration", () => {
  it("registers the next migration and only creates free AI objects", () => {
    const journal = JSON.parse(readFileSync("packages/database/drizzle/meta/_journal.json", "utf8"));
    expect(journal.entries.at(-1).tag).toBe("0055_free_ai");
    const sql = readFileSync("packages/database/drizzle/0055_free_ai.sql", "utf8");
    expect(sql).not.toMatch(/DROP |ALTER TABLE "(?!free_ai_)/);
    for (const name of ["chart_budgets", "daily_budgets", "quota_subjects", "quota_aliases", "requests", "admissions", "settlements", "artifacts"]) {
      expect(sql).toContain(`CREATE TABLE "free_ai_${name}"`);
    }
    expect(sql).toContain('"free_ai_requests_chart_slot_unique"');
    expect(sql).toContain('"free_ai_settlements_request_unique"');
  });
});
