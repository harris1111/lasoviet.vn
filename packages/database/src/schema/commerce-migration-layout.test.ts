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

  it("aligns report-only claim indexes with the dispatcher predicates", async () => {
    const [migration, schema, dispatcher] = await Promise.all([
      readFile(new URL("0011_commerce_payment_gateway.sql", migrationRoot), "utf8"),
      readFile(new URL("outbox.ts", import.meta.url), "utf8"),
      readFile(
        new URL(
          "../../../backend/src/outbox/outbox.dispatcher.ts",
          import.meta.url,
        ),
        "utf8",
      ),
    ]);

    expect(migration).toContain(
      'CREATE INDEX "outbox_report_pending_claim_idx" ON "outbox" USING btree ("event_type","status","available_at")',
    );
    expect(migration).toContain(
      'CREATE INDEX "outbox_report_expired_lease_idx" ON "outbox" USING btree ("event_type","status","leased_until")',
    );
    expect(schema).toMatch(
      /index\("outbox_report_pending_claim_idx"\)\.on\(\s*table\.eventType,\s*table\.status,\s*table\.availableAt,\s*\)/,
    );
    expect(schema).toMatch(
      /index\("outbox_report_expired_lease_idx"\)\.on\(\s*table\.eventType,\s*table\.status,\s*table\.leasedUntil,\s*\)/,
    );
    expect(dispatcher).toContain(
      'eq(outbox.eventType, "report.generation.requested.v1")',
    );
    expect(dispatcher).toContain("lte(outbox.availableAt, current)");
    expect(dispatcher).toContain("lte(outbox.leasedUntil, current)");
  });
});
