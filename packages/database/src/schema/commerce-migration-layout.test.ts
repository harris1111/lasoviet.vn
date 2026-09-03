import { access, readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

const migrationRoot = new URL("../../drizzle/", import.meta.url);

describe("commerce migration layout", () => {
  it("keeps the undeployed commerce baseline in one retention-safe migration", async () => {
    const migration = await readFile(
      new URL("0011_commerce_payment_gateway.sql", migrationRoot),
      "utf8",
    );

    expect(migration).toContain('"locale" text NOT NULL');
    expect(migration).toContain('"evidence_version_id" text NOT NULL');
    expect(migration).toContain('CREATE TABLE "report_queue_jobs"');
    expect(migration).not.toContain("ziwei_charts");
    expect(migration).not.toContain("ziwei_chart_versions");
    await expect(access(new URL("0012_report_request_contract.sql", migrationRoot)))
      .rejects.toBeDefined();
    await expect(access(new URL("0013_report_queue_jobs.sql", migrationRoot)))
      .rejects.toBeDefined();
    await expect(access(new URL("0014_commerce_retention_boundary.sql", migrationRoot)))
      .rejects.toBeDefined();
  });

  it("keeps migration metadata aligned with the undeployed baseline", async () => {
    const journal = await readFile(new URL("meta/_journal.json", migrationRoot), "utf8");

    expect(journal).toContain('"tag": "0011_commerce_payment_gateway"');
    expect(journal).not.toContain("0012_report_request_contract");
    expect(journal).not.toContain("0013_report_queue_jobs");
    expect(journal).not.toContain("0014_commerce_retention_boundary");
  });
});
