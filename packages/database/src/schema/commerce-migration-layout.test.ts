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
    expect(journal).toContain('"tag": "0012_report_worker_state"');
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

  it("keeps report worker state migration additive and aligned", async () => {
    const migration = await readFile(
      new URL("0012_report_worker_state.sql", migrationRoot),
      "utf8",
    );
    expect(migration).toContain('ALTER TABLE "report_reservations" ADD COLUMN "state_version"');
    expect(migration).toContain('ALTER TABLE "report_reservations" ADD COLUMN "attempt_count"');
    expect(migration).toContain('ALTER TABLE "report_queue_jobs" ADD COLUMN "attempt_count"');
    expect(migration).toContain('ALTER TABLE "report_queue_jobs" ADD COLUMN "available_at"');
    expect(migration).toContain('CREATE INDEX "report_queue_jobs_waiting_claim_idx"');
  });
  it("keeps immutable commerce order invoice trigger in migration 0017", async () => {
    const migration = await readFile(
      new URL("0017_immutable_commerce_order_invoice.sql", migrationRoot),
      "utf8",
    );
    expect(migration).toContain('CREATE OR REPLACE FUNCTION "prevent_commerce_order_invoice_mutation"' );
    expect(migration).toContain('CREATE TRIGGER "commerce_orders_invoice_immutable"' );
    expect(migration).toContain('BEFORE UPDATE ON "commerce_orders"' );
    expect(migration).toContain("commerce_orders.invoice_number is immutable");
    expect(migration).toContain('CREATE UNIQUE INDEX IF NOT EXISTS "commerce_orders_chart_sku_unique"' );
  });

  it("registers migration 0017 in drizzle meta journal", async () => {
    const journal = await readFile(new URL("meta/_journal.json", migrationRoot), "utf8");
    expect(journal).toContain('"tag": "0017_immutable_commerce_order_invoice"' );
    expect(journal).toContain('"idx": 17' );
  });

});
