CREATE TABLE "calculation_runs" (
  "id" text PRIMARY KEY NOT NULL,
  "profile_id" text NOT NULL REFERENCES "birth_profiles"("id") ON DELETE cascade,
  "profile_revision_id" text NOT NULL REFERENCES "birth_profile_revisions"("id") ON DELETE cascade,
  "idempotency_key" text NOT NULL,
  "engine_id" text NOT NULL,
  "engine_version" text NOT NULL,
  "adapter_id" text NOT NULL,
  "adapter_version" text NOT NULL,
  "schema_id" text NOT NULL,
  "rule_set_id" text NOT NULL,
  "input_hash" text NOT NULL,
  "config_hash" text NOT NULL,
  "raw_snapshot_hash" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "ziwei_charts" (
  "id" text PRIMARY KEY NOT NULL,
  "profile_id" text NOT NULL REFERENCES "birth_profiles"("id") ON DELETE cascade,
  "profile_revision_id" text NOT NULL REFERENCES "birth_profile_revisions"("id") ON DELETE cascade,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "ziwei_chart_versions" (
  "id" text PRIMARY KEY NOT NULL,
  "chart_id" text NOT NULL REFERENCES "ziwei_charts"("id") ON DELETE cascade,
  "calculation_run_id" text NOT NULL REFERENCES "calculation_runs"("id") ON DELETE cascade,
  "normalized_output" jsonb NOT NULL,
  "private_raw_snapshot" jsonb NOT NULL,
  "warnings" jsonb NOT NULL,
  "provenance" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX "calculation_runs_revision_idempotency_key_unique" ON "calculation_runs" USING btree ("profile_revision_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "calculation_runs_profile_revision_id_idx" ON "calculation_runs" USING btree ("profile_revision_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ziwei_charts_profile_revision_unique" ON "ziwei_charts" USING btree ("profile_revision_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ziwei_chart_versions_calculation_run_unique" ON "ziwei_chart_versions" USING btree ("calculation_run_id");--> statement-breakpoint
CREATE INDEX "ziwei_chart_versions_chart_id_idx" ON "ziwei_chart_versions" USING btree ("chart_id");
