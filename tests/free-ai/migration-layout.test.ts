import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("free AI additive migration", () => {
  it("registers migration 0055 after 0054 and only creates free AI objects", () => {
    const journal = JSON.parse(readFileSync("packages/database/drizzle/meta/_journal.json", "utf8"));
    const migration = journal.entries.find((entry: {tag: string}) => entry.tag === "0055_free_ai");
    expect(migration).toMatchObject({idx: 55});
    expect(journal.entries[54].idx).toBe(54);
    expect(journal.entries[55]).toBe(migration);
    expect(migration.when).toBeGreaterThan(journal.entries[54].when);
    const sql = readFileSync("packages/database/drizzle/0055_free_ai.sql", "utf8");
    expect(sql).not.toMatch(/DROP |ALTER TABLE "(?!free_ai_)/);
    for (const name of ["chart_budgets", "daily_budgets", "quota_subjects", "quota_aliases", "requests", "admissions", "settlements", "artifacts"]) {
      expect(sql).toContain(`CREATE TABLE "free_ai_${name}"`);
    }
    expect(sql).toContain('"free_ai_requests_chart_slot_unique"');
    expect(sql).toContain('"free_ai_settlements_request_unique"');
  });
});
