import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const migrationRoot = new URL("../../drizzle/", import.meta.url);

describe("report generation migration layout", () => {
  it("keeps report generation outputs in migration 0014", async () => {
    const migration = await readFile(
      new URL("0014_report_generation_outputs.sql", migrationRoot),
      "utf8",
    );

    expect(migration).toContain('CREATE TABLE "report_versions"');
    expect(migration).toContain('CREATE TABLE "report_generation_attempts"');
    expect(migration).toContain('"report_version_id" uuid NOT NULL');
    expect(migration).toContain('"entitlement_id" uuid NOT NULL');
    expect(migration).toContain('"chart_version_id" text NOT NULL');
    expect(migration).toContain('"evidence_version_id" text NOT NULL');
    expect(migration).toContain('"knowledge_version_id" text NOT NULL');
    expect(migration).toContain('"prompt_version" text NOT NULL');
    expect(migration).toContain('"report_config_version" text NOT NULL');
    expect(migration).toContain('"template_version" text NOT NULL');
    expect(migration).toContain('"locale" text NOT NULL');
    expect(migration).toContain('"sku" text NOT NULL');
    expect(migration).toContain('"provider_id" text NOT NULL');
    expect(migration).toContain('"model_id" text NOT NULL');
    expect(migration).toContain('"structured_content" jsonb NOT NULL');
    expect(migration).toContain('"html_content" text NOT NULL');
    expect(migration).toContain('"content_hash" text NOT NULL');
    expect(migration).toContain('"pdf_asset_id" uuid NOT NULL');
    expect(migration).toContain('"render_version" text NOT NULL');
    expect(migration).toContain('"supersedes_report_version_id" uuid');
    expect(migration).toContain('"created_at" timestamp with time zone');

    expect(migration).toContain('CREATE UNIQUE INDEX "report_versions_version_unique" ON "report_versions" USING btree ("report_version_id")');
    expect(migration).toContain('CREATE UNIQUE INDEX "report_versions_pdf_asset_unique" ON "report_versions" USING btree ("pdf_asset_id")');
    expect(migration).toContain('CREATE INDEX "report_versions_report_idx" ON "report_versions" USING btree ("report_id","created_at")');
    expect(migration).toContain('CREATE INDEX "report_versions_entitlement_idx" ON "report_versions" USING btree ("entitlement_id")');

    expect(migration).toContain('"attempt_number" integer NOT NULL');
    expect(migration).toContain('"job_id" text NOT NULL');
    expect(migration).toContain('"status" text NOT NULL');
    expect(migration).toContain('"error_code" text');
    expect(migration).toContain('"started_at" timestamp with time zone');
    expect(migration).toContain('"completed_at" timestamp with time zone');

    expect(migration).toContain('CREATE UNIQUE INDEX "report_generation_attempts_job_attempt_unique" ON "report_generation_attempts" USING btree ("job_id","attempt_number")');
    expect(migration).toContain('CREATE INDEX "report_generation_attempts_report_idx" ON "report_generation_attempts" USING btree ("report_version_id","started_at")');

    expect(migration).not.toContain("report_assets");
    expect(migration).not.toContain("pdf_storage");
    expect(migration).not.toContain("raw_response");
    expect(migration).not.toContain("raw_prompt");
  });

  it("registers migration 0014 in drizzle meta journal", async () => {
    const journal = await readFile(
      new URL("meta/_journal.json", migrationRoot),
      "utf8",
    );

    expect(journal).toContain('"tag": "0014_report_generation_outputs"');
    expect(journal).toContain('"idx": 14');
  });

  it("registers report generation tables in database package exports", async () => {
    const packageIndex = await readFile(
      new URL("../index.ts", import.meta.url),
      "utf8",
    );

    expect(packageIndex).toContain("reportVersions");
    expect(packageIndex).toContain("reportGenerationAttempts");
  });
});
