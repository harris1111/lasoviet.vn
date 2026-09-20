import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

const migrationRoot = new URL("../../drizzle/", import.meta.url);

function normalizeNewlines(content: string): string {
  return content.replace(/\r\n/g, "\n");
}

describe("ai cost and usage migration layout", () => {
  it("defines ai_model_pricing, ai_call_attempts, and ai_usage_outcomes in migration 0026", async () => {
    const rawMigration = await readFile(
      new URL("0026_ai_usage_and_cost.sql", migrationRoot),
      "utf8",
    );
    const migration = normalizeNewlines(rawMigration);

    expect(migration).toContain('CREATE TABLE "ai_model_pricing"');
    expect(migration).toContain('"pricing_version" text NOT NULL');
    expect(migration).toContain('"input_price_per_million" bigint NOT NULL');
    expect(migration).toContain('"output_price_per_million" bigint NOT NULL');
    expect(migration).toContain('"cached_input_price_per_million" bigint NOT NULL');
    expect(migration).toContain('"source" text NOT NULL');
    expect(migration).toContain('"source_currency" text NOT NULL');
    expect(migration).toContain('"source_reference" text NOT NULL');
    expect(migration).toContain('"fx_source" text NOT NULL');
    expect(migration).toContain('"fx_rate" bigint NOT NULL');

    expect(migration).toContain('CREATE TABLE "ai_call_attempts"');
    expect(migration).toContain('"call_id" text NOT NULL');
    expect(migration).toContain('"attempt_number" integer DEFAULT 0 NOT NULL');
    expect(migration).toContain('"purpose" text NOT NULL');
    expect(migration).toContain('"requested_model_id" text NOT NULL');
    expect(migration).toContain('"source_currency" text NOT NULL');
    expect(migration).toContain('"source_reference" text NOT NULL');
    expect(migration).toContain('"max_output_tokens" integer NOT NULL');

    expect(migration).toContain('CREATE TABLE "ai_usage_outcomes"');
    expect(migration).toContain('"attempt_id" uuid NOT NULL');
    expect(migration).toContain('"response_model_id" text');
    expect(migration).toContain('"tokens_unknown" boolean DEFAULT false NOT NULL');
    expect(migration).toContain('"cost_micro_vnd" bigint');
    expect(migration).toContain('"cost_status" text DEFAULT \'resolved\' NOT NULL');

    expect(migration).toContain('"ai_model_pricing_prices_non_negative"');
    expect(migration).toContain('"ai_call_attempts_currency_vnd"');
    expect(migration).toContain('"ai_usage_outcomes_tokens_and_cost_consistency"');

    // Append-only triggers
    expect(migration).toContain('CREATE OR REPLACE FUNCTION prevent_ai_cost_mutation()');
    expect(migration).toContain('CREATE TRIGGER prevent_mutation_ai_model_pricing');
    expect(migration).toContain('CREATE TRIGGER prevent_mutation_ai_call_attempts');
    expect(migration).toContain('CREATE TRIGGER prevent_mutation_ai_usage_outcomes');

    // Strict isolation: cost records must NEVER store prompt, raw response content or generated text
    expect(migration).not.toContain("prompt");
    expect(migration).not.toContain("content");
    expect(migration).not.toContain("generated_text");
    expect(migration).not.toContain("response_text");
    expect(migration).not.toContain("response_body");
  });

  it("includes migration 0026 in journal metadata", async () => {
    const rawJournal = await readFile(new URL("meta/_journal.json", migrationRoot), "utf8");
    const journal = normalizeNewlines(rawJournal);
    expect(journal).toContain('"tag": "0026_ai_usage_and_cost"');
  });

  it("adds bounded invalid-output diagnostics in additive migration 0038", async () => {
    const rawMigration = await readFile(
      new URL("0038_ai_output_diagnostics.sql", migrationRoot),
      "utf8",
    );
    const migration = normalizeNewlines(rawMigration);
    const rawJournal = await readFile(new URL("meta/_journal.json", migrationRoot), "utf8");
    const journal = normalizeNewlines(rawJournal);
    const rawSnapshot = await readFile(
      new URL("meta/0038_snapshot.json", migrationRoot),
      "utf8",
    );
    const snapshot = normalizeNewlines(rawSnapshot);

    expect(migration).toContain(
      'ALTER TABLE "ai_usage_outcomes" ADD COLUMN "invalid_output_reason" text',
    );
    expect(migration).toContain('"ai_usage_outcomes_invalid_output_reason_valid"');
    expect(migration).toContain('"ai_usage_outcomes_invalid_output_reason_relation"');
    expect(migration).not.toContain("CREATE ");
    expect(migration).not.toContain("DROP ");
    expect(migration).not.toContain("prompt");
    expect(migration).not.toContain('"content" text');
    expect(migration).not.toContain("response_body");
    expect(snapshot).toContain('"public.ai_model_pricing"');
    expect(snapshot).toContain('"public.ai_call_attempts"');
    expect(snapshot).toContain('"public.ai_usage_outcomes"');
    expect(snapshot).toContain('"invalid_output_reason"');
    expect(snapshot).toContain('"ai_usage_outcomes_invalid_output_reason_valid"');
    expect(snapshot).toContain('"ai_usage_outcomes_invalid_output_reason_relation"');
    expect(journal).toContain('"tag": "0038_ai_output_diagnostics"');
  });

  it("adds the reviewed Claude pricing record in data-only migration 0039", async () => {
    const rawMigration = await readFile(
      new URL("0039_ai_model_pricing_claude_sonnet_4_6.sql", migrationRoot),
      "utf8",
    );
    const migration = normalizeNewlines(rawMigration);
    const rawJournal = await readFile(new URL("meta/_journal.json", migrationRoot), "utf8");
    const journal = normalizeNewlines(rawJournal);
    const rawSnapshot = await readFile(
      new URL("meta/0039_snapshot.json", migrationRoot),
      "utf8",
    );
    const snapshot = normalizeNewlines(rawSnapshot);

    expect(migration).toContain('INSERT INTO "ai_model_pricing"');
    expect(migration).toContain("'9router-ag-claude-sonnet-4-6-v1-20260917'");
    expect(migration).toContain("'9router-an'");
    expect(migration).toContain("'ag/claude-sonnet-4-6'");
    expect(migration).toContain('"resolved_model_id":"claude-sonnet-4-6"');
    expect(migration).toContain("78330");
    expect(migration).toContain("391650");
    expect(migration).toContain("7833");
    expect(migration).toContain("'2026-09-17T00:00:00Z'");
    expect(migration).toContain(
      "'https://github.com/decolua/9router/blob/17c4cc76877bd1755030a8414f8d0083f48dcccf/open-sse/providers/pricing.js'",
    );
    expect(migration).toContain("'Vietcombank USD sell'");
    expect(migration).toContain("26110");
    expect(migration).toContain("'2026-09-14T07:40:00Z'");
    expect(migration).toContain("'active'");
    expect(migration).not.toMatch(/\bgemini\b/i);
    expect(migration).not.toMatch(/\b(?:UPDATE|DELETE|UPSERT|ALTER|CREATE|DROP)\b/i);
    expect(journal).toContain('"tag": "0038_ai_output_diagnostics"');
    expect(journal).toContain('"tag": "0039_ai_model_pricing_claude_sonnet_4_6"');
    expect(snapshot).toContain('"prevId": "ecf16cfc-3152-427a-8689-ccc8de24127f"');
    expect(snapshot).toContain('"public.ai_model_pricing"');
    expect(snapshot).toContain('"invalid_output_reason"');
  });
});
