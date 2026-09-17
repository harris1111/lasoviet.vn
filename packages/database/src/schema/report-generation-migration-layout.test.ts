import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const migrationRoot = new URL("../../drizzle/", import.meta.url);

type DrizzleSnapshot = {
  tables: Record<string, {
    columns: Record<string, unknown>;
    checkConstraints: Record<string, { value: string }>;
  }>;
};

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
    expect(migration).toContain('CONSTRAINT "report_versions_content_hash_format" CHECK ("content_hash" ~ \'^[a-f0-9]{64}$\')');

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

  it("keeps PDF asset and report failure delivery schema additive in migration 0033", async () => {
    const [migration, journal, packageIndex, runtime, snapshot] = await Promise.all([
      readFile(new URL("0033_report_assets_and_report_failure_delivery.sql", migrationRoot), "utf8"),
      readFile(new URL("meta/_journal.json", migrationRoot), "utf8"),
      readFile(new URL("../index.ts", import.meta.url), "utf8"),
      readFile(new URL("../runtime.ts", import.meta.url), "utf8"),
      readFile(new URL("meta/0033_snapshot.json", migrationRoot), "utf8"),
    ]);

    expect(migration).toContain('CREATE TABLE IF NOT EXISTS "report_assets"');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS "support_cases"');
    expect(migration).toContain("ADD VALUE IF NOT EXISTS 'report_failed'");
    expect(migration).toContain('"report_assets_report_version_unique"');
    expect(migration).toContain('"support_cases_report_version_stage_unique"');
    expect(migration).toContain('"report_assets_status_bounded"');
    expect(migration).toContain('"report_assets_replica_status_bounded"');
    expect(migration).toContain('"support_cases_failure_stage_bounded"');
    expect(migration).not.toContain("html_content");

    expect(journal).toContain('"idx": 33');
    expect(journal).toContain('"tag": "0033_report_assets_and_report_failure_delivery"');
    expect(packageIndex).toContain("reportAssets");
    expect(packageIndex).toContain("supportCases");
    expect(runtime).toContain("reportAssets");
    expect(runtime).toContain("supportCases");
    const reportAssets = (JSON.parse(snapshot) as DrizzleSnapshot).tables["public.report_assets"];
    expect(reportAssets?.columns).toHaveProperty("replica_status");
    expect(reportAssets?.checkConstraints.report_assets_status_bounded?.value).toBe(
      "\"report_assets\".\"status\" IN ('render_pending', 'rendering', 'rendered', 'storing', 'stored', 'store_retryable_failure', 'terminal_failure')",
    );
    expect(reportAssets?.checkConstraints.report_assets_status_bounded?.value).not.toContain(
      "replica_disabled",
    );
    expect(reportAssets?.checkConstraints.report_assets_replica_status_bounded?.value).toBe(
      "\"report_assets\".\"replica_status\" = 'replica_disabled'",
    );
  });

  it("registers the 0034 and 0035 snapshots as one canonical continuation", async () => {
    const [journal, walletSnapshot, previewSnapshot] = await Promise.all([
      readFile(new URL("meta/_journal.json", migrationRoot), "utf8"),
      readFile(new URL("meta/0034_snapshot.json", migrationRoot), "utf8"),
      readFile(new URL("meta/0035_snapshot.json", migrationRoot), "utf8"),
    ]);
    const wallet = JSON.parse(walletSnapshot) as { id: string; prevId: string };
    const preview = JSON.parse(previewSnapshot) as { prevId: string };
    expect(journal).toContain('"tag": "0034_wallet_commerce_foundation"');
    expect(journal).toContain('"tag": "0035_generated_preview_persistence"');
    expect(wallet.prevId).toBe("afe69938-d462-4a00-82d3-00837218fa1f");
    expect(preview.prevId).toBe(wallet.id);
  });

  it("keeps report timing lineage additive columns and checks in migration 0024", async () => {
    const migration = await readFile(
      new URL("0024_report_timing_lineage.sql", migrationRoot),
      "utf8",
    );

    expect(migration).toContain('ALTER TABLE "report_reservations" ADD COLUMN IF NOT EXISTS "as_of_date" date;');
    expect(migration).toContain('ALTER TABLE "report_reservations" ADD COLUMN IF NOT EXISTS "target_year" integer;');
    expect(migration).toContain('ALTER TABLE "report_reservations" ADD COLUMN IF NOT EXISTS "timing_rule_version" text;');
    expect(migration).toContain('ALTER TABLE "report_reservations" ADD COLUMN IF NOT EXISTS "sensitivity_rule_version" text;');

    expect(migration).toContain('"report_reservations_timing_lineage_presence"');
    expect(migration).toContain('"report_reservations_target_year_matches_as_of_date"');
    expect(migration).toContain('"report_reservations_timing_rule_versions_non_empty"');
    expect(migration).toContain('btrim("timing_rule_version")');
    expect(migration).toContain('btrim("sensitivity_rule_version")');
    expect(migration).toContain('EXTRACT(YEAR FROM "as_of_date")');

    expect(migration).not.toContain("report_versions");
  });

  it("registers migration 0024 in drizzle meta journal", async () => {
    const journal = await readFile(
      new URL("meta/_journal.json", migrationRoot),
      "utf8",
    );

    expect(journal).toContain('"tag": "0024_report_timing_lineage"');
    expect(journal).toContain('"idx": 24');
  });

  it("keeps reading-context reservation freezing in additive migration 0031 after 0030", async () => {
    const [migration, journal] = await Promise.all([
      readFile(new URL("0031_report_reading_context_freeze.sql", migrationRoot), "utf8"),
      readFile(new URL("meta/_journal.json", migrationRoot), "utf8"),
    ]);

    expect(migration).toContain('ADD COLUMN IF NOT EXISTS "reading_context_revision_id" text');
    expect(migration).toContain('REFERENCES "public"."birth_profile_reading_context_revisions"("id")');
    expect(migration).toContain("ON DELETE SET NULL");
    expect(migration).toContain('"report_reservations_reading_context_revision_idx"');
    expect(migration).toContain(
      '"report_reservations_reading_context_revision_id_birth_profile_reading_context_revisions_id_fk"',
    );

    const entries = JSON.parse(journal).entries as Array<{ idx: number; tag: string }>;
    const migration0030 = entries.findIndex((entry) => entry.idx === 30);
    const migration0031 = entries.findIndex((entry) => entry.idx === 31);
    expect(entries[migration0030]).toMatchObject({ tag: "0030_report_section_checkpoint_revisions" });
    expect(entries[migration0031]).toMatchObject({ tag: "0031_report_reading_context_freeze" });
    expect(migration0031).toBe(migration0030 + 1);
  });

  it("defines timing lineage columns and constraints on reportReservations schema", async () => {
    const { reportReservations, reportVersions } = await import("./reports.js");

    expect(reportReservations.asOfDate).toBeDefined();
    expect(reportReservations.targetYear).toBeDefined();
    expect(reportReservations.timingRuleVersion).toBeDefined();
    expect(reportReservations.sensitivityRuleVersion).toBeDefined();
    expect(reportReservations.readingContextRevisionId).toBeDefined();

    // Do not add these fields to reportVersions yet
    expect((reportVersions as any).asOfDate).toBeUndefined();
    expect((reportVersions as any).targetYear).toBeUndefined();
    expect((reportVersions as any).timingRuleVersion).toBeUndefined();
    expect((reportVersions as any).sensitivityRuleVersion).toBeUndefined();
  });

  it("keeps report source snapshots in migration 0025", async () => {
    const migration = await readFile(
      new URL("0025_report_source_snapshots.sql", migrationRoot),
      "utf8",
    );

    expect(migration).toContain('CREATE TABLE "report_source_snapshots"');
    expect(migration).toContain('"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL');
    expect(migration).toContain('"report_id" uuid NOT NULL');
    expect(migration).toContain('"report_version_id" uuid NOT NULL');
    expect(migration).toContain('"chart_version_id" text NOT NULL');
    expect(migration).toContain('"as_of_date" date NOT NULL');
    expect(migration).toContain('"target_year" integer NOT NULL');
    expect(migration).toContain('"timing_rule_version" text NOT NULL');
    expect(migration).toContain('"sensitivity_rule_version" text NOT NULL');
    expect(migration).toContain('"snapshot_hash" text NOT NULL');
    expect(migration).toContain('"snapshot" jsonb NOT NULL');
    expect(migration).toContain('"created_at" timestamp with time zone DEFAULT now() NOT NULL');

    expect(migration).toContain(
      'CREATE UNIQUE INDEX "report_source_snapshots_version_unique" ON "report_source_snapshots" USING btree ("report_version_id")',
    );
    expect(migration).toContain(
      'CREATE INDEX "report_source_snapshots_report_idx" ON "report_source_snapshots" USING btree ("report_id")',
    );
    expect(migration).toContain(
      'CREATE INDEX "report_source_snapshots_chart_version_idx" ON "report_source_snapshots" USING btree ("chart_version_id")',
    );

    expect(migration).toContain('"report_source_snapshots_target_year_matches_as_of_date"');
    expect(migration).toContain('"report_source_snapshots_timing_rule_versions_non_empty"');
    expect(migration).toContain('"report_source_snapshots_hash_format"');
    expect(migration).toContain('EXTRACT(YEAR FROM "as_of_date")');
    expect(migration).toContain('btrim("timing_rule_version")');
    expect(migration).toContain('btrim("sensitivity_rule_version")');
    expect(migration).toContain('\x27^[a-f0-9]{64}$\x27');
  });

  it("registers migration 0025 in drizzle meta journal", async () => {
    const journal = await readFile(
      new URL("meta/_journal.json", migrationRoot),
      "utf8",
    );

    expect(journal).toContain('"tag": "0025_report_source_snapshots"');
    expect(journal).toContain('"idx": 25');
  });

  it("registers reportSourceSnapshots in database package exports", async () => {
    const packageIndex = await readFile(
      new URL("../index.ts", import.meta.url),
      "utf8",
    );

    expect(packageIndex).toContain("reportSourceSnapshots");
  });

  it("defines reportSourceSnapshots schema with strict columns", async () => {
    const { reportSourceSnapshots } = await import("./reports.js");

    expect(reportSourceSnapshots.id).toBeDefined();
    expect(reportSourceSnapshots.reportId).toBeDefined();
    expect(reportSourceSnapshots.reportVersionId).toBeDefined();
    expect(reportSourceSnapshots.chartVersionId).toBeDefined();
    expect(reportSourceSnapshots.asOfDate).toBeDefined();
    expect(reportSourceSnapshots.targetYear).toBeDefined();
    expect(reportSourceSnapshots.timingRuleVersion).toBeDefined();
    expect(reportSourceSnapshots.sensitivityRuleVersion).toBeDefined();
    expect(reportSourceSnapshots.snapshotHash).toBeDefined();
    expect(reportSourceSnapshots.snapshot).toBeDefined();
    expect(reportSourceSnapshots.createdAt).toBeDefined();
  });

  it("keeps section checkpoints additive in migration 0029", async () => {
    const migration = await readFile(
      new URL("0029_report_section_checkpoints.sql", migrationRoot),
      "utf8",
    );

    expect(migration).toContain('CREATE TABLE IF NOT EXISTS "report_section_checkpoints"');
    expect(migration).toContain('"report_version_id" uuid NOT NULL');
    expect(migration).toContain('"section_key" text NOT NULL');
    expect(migration).toContain('"accepted_content" jsonb');
    expect(migration).toContain('"report_section_checkpoints_version_section_unique"');
    expect(migration).toContain('"report_section_checkpoints_passed_order_idx"');
    expect(migration).toContain('"report_section_checkpoints_status_valid"');
    expect(migration).toContain('"report_section_checkpoints_active_ownership"');
    expect(migration).toContain('"report_section_checkpoints_passed_lineage"');
    expect(migration).not.toContain('REFERENCES "report_versions"');
  });

  it("registers migration 0029 and exports section checkpoints", async () => {
    const journal = await readFile(
      new URL("meta/_journal.json", migrationRoot),
      "utf8",
    );
    const packageIndex = await readFile(
      new URL("../index.ts", import.meta.url),
      "utf8",
    );

    expect(journal).toContain('"idx": 29');
    expect(journal).toContain('"when": 1789977600000');
    expect(journal).toContain('"tag": "0029_report_section_checkpoints"');
    expect(packageIndex).toContain("reportSectionCheckpoints");
  });

  it("defines reportSectionCheckpoints schema with checkpoint lineage", async () => {
    const { reportSectionCheckpoints } = await import("./reports.js");

    expect(reportSectionCheckpoints.reportVersionId).toBeDefined();
    expect(reportSectionCheckpoints.sectionKey).toBeDefined();
    expect(reportSectionCheckpoints.sectionOrder).toBeDefined();
    expect(reportSectionCheckpoints.stateVersion).toBeDefined();
    expect(reportSectionCheckpoints.acceptedContent).toBeDefined();
    expect(reportSectionCheckpoints.contentHash).toBeDefined();
    expect(reportSectionCheckpoints.activeWorkerId).toBeDefined();
  });

  it("keeps checkpoint rewrite revisions append-only in migration 0030", async () => {
    const migration = await readFile(
      new URL("0030_report_section_checkpoint_revisions.sql", migrationRoot),
      "utf8",
    );

    expect(migration).toContain('CREATE TABLE IF NOT EXISTS "report_section_checkpoint_revisions"');
    expect(migration).toContain('REFERENCES "report_section_checkpoints"("id") ON DELETE RESTRICT');
    expect(migration).toContain('"rewrite_ordinal" integer NOT NULL');
    expect(migration).toContain('"report_section_checkpoint_revisions_checkpoint_ordinal_unique"');
    expect(migration).toContain('"report_section_checkpoint_revisions_positive_ordinal"');
    expect(migration).toContain('"report_section_checkpoint_revisions_active_ownership"');
    expect(migration).toContain('"report_section_checkpoint_revisions_passed_lineage"');
    expect(migration).not.toContain("DELETE FROM");
    expect(migration).not.toContain("UPDATE \"report_section_checkpoints\"");
    expect(migration).not.toContain("ON DELETE CASCADE");
  });

  it("registers migration 0030 after checkpoints and exports revision schema", async () => {
    const journal = JSON.parse(await readFile(
      new URL("meta/_journal.json", migrationRoot),
      "utf8",
    )) as { entries: { idx: number; when: number; tag: string }[] };
    const packageIndex = await readFile(new URL("../index.ts", import.meta.url), "utf8");
    const { reportSectionCheckpointRevisions } = await import("./reports.js");
    const previous = journal.entries.find((entry) => entry.idx === 29);
    const revision = journal.entries.find((entry) => entry.idx === 30);

    expect(previous?.tag).toBe("0029_report_section_checkpoints");
    expect(revision).toMatchObject({
      idx: 30,
      tag: "0030_report_section_checkpoint_revisions",
    });
    expect(revision!.when).toBeGreaterThan(previous!.when);
    expect(packageIndex).toContain("reportSectionCheckpointRevisions");
    expect(reportSectionCheckpointRevisions.checkpointId).toBeDefined();
    expect(reportSectionCheckpointRevisions.rewriteOrdinal).toBeDefined();
    expect(reportSectionCheckpointRevisions.acceptedContent).toBeDefined();
  });

  it("keeps admin report recovery receipts bounded and registers migration 0032", async () => {
    const migration = await readFile(
      new URL("0032_admin_report_recovery.sql", migrationRoot),
      "utf8",
    );
    const journal = JSON.parse(await readFile(
      new URL("meta/_journal.json", migrationRoot),
      "utf8",
    )) as { entries: { idx: number; when: number; tag: string }[] };
    const packageIndex = await readFile(new URL("../index.ts", import.meta.url), "utf8");
    const { adminReportRecoveryReceipts } = await import("./admin-access.js");
    const previous = journal.entries.find((entry) => entry.idx === 31);
    const recovery = journal.entries.find((entry) => entry.idx === 32);

    expect(migration).toContain('CREATE TABLE IF NOT EXISTS "admin_report_recovery_receipts"');
    expect(migration).toContain('"admin_report_recovery_receipts_actor_key_unique"');
    expect(migration).toContain('"admin_report_recovery_receipts_operation_bounded"');
    expect(migration).toContain('"admin_report_recovery_receipts_target_bounded"');
    expect(migration).toContain('"admin_report_recovery_receipts_key_bounded"');
    expect(migration).toContain('"admin_report_recovery_receipts_fingerprint_format"');
    expect(migration).toContain('"admin_report_recovery_receipts_result_object"');
    expect(migration).not.toContain("admin_capability_policies");
    expect(recovery).toMatchObject({
      idx: 32,
      tag: "0032_admin_report_recovery",
    });
    expect(recovery!.when).toBeGreaterThan(previous!.when);
    expect(packageIndex).toContain("adminReportRecoveryReceipts");
    expect(adminReportRecoveryReceipts.actorId).toBeDefined();
    expect(adminReportRecoveryReceipts.targetReportVersionId).toBeDefined();
    expect(adminReportRecoveryReceipts.requestFingerprint).toBeDefined();
    expect(adminReportRecoveryReceipts.result).toBeDefined();
  });
});
