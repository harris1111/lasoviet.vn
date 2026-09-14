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
});
