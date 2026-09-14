CREATE TABLE "ai_model_pricing" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pricing_version" text NOT NULL,
	"provider_id" text NOT NULL,
	"model_id" text NOT NULL,
	"currency" text NOT NULL,
	"input_price_per_million" bigint NOT NULL,
	"output_price_per_million" bigint NOT NULL,
	"cached_input_price_per_million" bigint NOT NULL,
	"effective_from" timestamp with time zone NOT NULL,
	"source" text NOT NULL,
	"source_currency" text NOT NULL,
	"source_reference" text NOT NULL,
	"fx_source" text NOT NULL,
	"fx_rate" bigint NOT NULL,
	"fx_timestamp" timestamp with time zone NOT NULL,
	"reference_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_model_pricing_prices_non_negative" CHECK ("input_price_per_million" >= 0 AND "output_price_per_million" >= 0 AND "cached_input_price_per_million" >= 0),
	CONSTRAINT "ai_model_pricing_currency_vnd" CHECK ("currency" = 'VND'),
	CONSTRAINT "ai_model_pricing_status_valid" CHECK ("status" IN ('active', 'retired', 'pending_approval')),
	CONSTRAINT "ai_model_pricing_source_non_empty" CHECK (btrim("source") <> ''),
	CONSTRAINT "ai_model_pricing_source_currency_non_empty" CHECK (btrim("source_currency") <> ''),
	CONSTRAINT "ai_model_pricing_source_reference_non_empty" CHECK (btrim("source_reference") <> ''),
	CONSTRAINT "ai_model_pricing_fx_source_non_empty" CHECK (btrim("fx_source") <> ''),
	CONSTRAINT "ai_model_pricing_fx_rate_positive" CHECK ("fx_rate" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "ai_model_pricing_version_unique" ON "ai_model_pricing" USING btree ("pricing_version");
--> statement-breakpoint
CREATE UNIQUE INDEX "ai_model_pricing_provider_model_effective_unique" ON "ai_model_pricing" USING btree ("provider_id","model_id","effective_from");
--> statement-breakpoint
CREATE INDEX "ai_model_pricing_lookup_idx" ON "ai_model_pricing" USING btree ("provider_id","model_id","effective_from","status");
--> statement-breakpoint
CREATE TABLE "ai_call_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"call_id" text NOT NULL,
	"attempt_number" integer DEFAULT 0 NOT NULL,
	"idempotency_key" text,
	"purpose" text NOT NULL,
	"provider_id" text NOT NULL,
	"requested_model_id" text NOT NULL,
	"report_id" uuid,
	"report_version_id" uuid,
	"order_id" uuid,
	"entitlement_id" uuid,
	"chart_id" text,
	"chart_version_id" text,
	"sku" text,
	"max_output_tokens" integer NOT NULL,
	"pricing_version" text NOT NULL,
	"input_price_per_million" bigint NOT NULL,
	"output_price_per_million" bigint NOT NULL,
	"cached_input_price_per_million" bigint NOT NULL,
	"currency" text NOT NULL,
	"source_currency" text NOT NULL,
	"source_reference" text NOT NULL,
	"fx_source" text NOT NULL,
	"fx_rate" bigint NOT NULL,
	"fx_timestamp" timestamp with time zone NOT NULL,
	"pricing_source" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_call_attempts_purpose_valid" CHECK ("purpose" IN ('report', 'critic', 'rewrite', 'free_preview', 'synthetic_probe')),
	CONSTRAINT "ai_call_attempts_attempt_non_negative" CHECK ("attempt_number" >= 0),
	CONSTRAINT "ai_call_attempts_max_output_tokens_positive" CHECK ("max_output_tokens" > 0),
	CONSTRAINT "ai_call_attempts_currency_vnd" CHECK ("currency" = 'VND'),
	CONSTRAINT "ai_call_attempts_pricing_non_negative" CHECK ("input_price_per_million" >= 0 AND "output_price_per_million" >= 0 AND "cached_input_price_per_million" >= 0),
	CONSTRAINT "ai_call_attempts_fx_rate_positive" CHECK ("fx_rate" > 0),
	CONSTRAINT "ai_call_attempts_source_non_empty" CHECK (btrim("pricing_source") <> ''),
	CONSTRAINT "ai_call_attempts_source_currency_non_empty" CHECK (btrim("source_currency") <> ''),
	CONSTRAINT "ai_call_attempts_source_reference_non_empty" CHECK (btrim("source_reference") <> ''),
	CONSTRAINT "ai_call_attempts_fx_source_non_empty" CHECK (btrim("fx_source") <> '')
);
--> statement-breakpoint
CREATE UNIQUE INDEX "ai_call_attempts_call_attempt_unique" ON "ai_call_attempts" USING btree ("call_id","attempt_number");
--> statement-breakpoint
CREATE INDEX "ai_call_attempts_idempotency_idx" ON "ai_call_attempts" USING btree ("idempotency_key");
--> statement-breakpoint
CREATE INDEX "ai_call_attempts_report_idx" ON "ai_call_attempts" USING btree ("report_id");
--> statement-breakpoint
CREATE INDEX "ai_call_attempts_order_idx" ON "ai_call_attempts" USING btree ("order_id");
--> statement-breakpoint
CREATE INDEX "ai_call_attempts_chart_idx" ON "ai_call_attempts" USING btree ("chart_id");
--> statement-breakpoint
CREATE INDEX "ai_call_attempts_purpose_idx" ON "ai_call_attempts" USING btree ("purpose","started_at");
--> statement-breakpoint
CREATE TABLE "ai_usage_outcomes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attempt_id" uuid NOT NULL REFERENCES "ai_call_attempts"("id"),
	"response_model_id" text,
	"http_status" integer,
	"error_code" text,
	"input_tokens" integer,
	"output_tokens" integer,
	"cached_tokens" integer,
	"total_tokens" integer,
	"tokens_unknown" boolean DEFAULT false NOT NULL,
	"cost_micro_vnd" bigint,
	"cost_vnd" integer,
	"cost_status" text DEFAULT 'resolved' NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_usage_outcomes_cost_status_valid" CHECK ("cost_status" IN ('resolved', 'unknown')),
	CONSTRAINT "ai_usage_outcomes_tokens_and_cost_consistency" CHECK (
		("cost_status" = 'unknown' AND "cost_micro_vnd" IS NULL AND "cost_vnd" IS NULL AND "tokens_unknown" = true) OR
		("cost_status" = 'resolved' AND "tokens_unknown" = false AND "cost_micro_vnd" IS NOT NULL AND "cost_micro_vnd" >= 0 AND "cost_vnd" IS NOT NULL AND "cost_vnd" >= 0 AND "input_tokens" IS NOT NULL AND "input_tokens" >= 0 AND "output_tokens" IS NOT NULL AND "output_tokens" >= 0 AND "cached_tokens" IS NOT NULL AND "cached_tokens" >= 0 AND "cached_tokens" <= "input_tokens" AND "total_tokens" IS NOT NULL AND "total_tokens" >= "input_tokens" AND "total_tokens" >= "output_tokens")
	)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "ai_usage_outcomes_attempt_unique" ON "ai_usage_outcomes" USING btree ("attempt_id");
--> statement-breakpoint
CREATE INDEX "ai_usage_outcomes_completed_idx" ON "ai_usage_outcomes" USING btree ("completed_at");
--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_ai_cost_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Table % is append-only: updates and deletes are prohibited', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER prevent_mutation_ai_model_pricing BEFORE UPDATE OR DELETE ON "ai_model_pricing" FOR EACH ROW EXECUTE FUNCTION prevent_ai_cost_mutation();
--> statement-breakpoint
CREATE TRIGGER prevent_mutation_ai_call_attempts BEFORE UPDATE OR DELETE ON "ai_call_attempts" FOR EACH ROW EXECUTE FUNCTION prevent_ai_cost_mutation();
--> statement-breakpoint
CREATE TRIGGER prevent_mutation_ai_usage_outcomes BEFORE UPDATE OR DELETE ON "ai_usage_outcomes" FOR EACH ROW EXECUTE FUNCTION prevent_ai_cost_mutation();
