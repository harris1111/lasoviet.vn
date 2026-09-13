CREATE TABLE "report_source_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"report_version_id" uuid NOT NULL,
	"chart_version_id" text NOT NULL,
	"as_of_date" date NOT NULL,
	"target_year" integer NOT NULL,
	"timing_rule_version" text NOT NULL,
	"sensitivity_rule_version" text NOT NULL,
	"snapshot_hash" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "report_source_snapshots_target_year_matches_as_of_date" CHECK ("target_year" = CAST(EXTRACT(YEAR FROM "as_of_date") AS integer)),
	CONSTRAINT "report_source_snapshots_timing_rule_versions_non_empty" CHECK (btrim("timing_rule_version") <> '' AND btrim("sensitivity_rule_version") <> ''),
	CONSTRAINT "report_source_snapshots_hash_format" CHECK ("snapshot_hash" ~ '^[a-f0-9]{64}$')
);
--> statement-breakpoint
CREATE UNIQUE INDEX "report_source_snapshots_version_unique" ON "report_source_snapshots" USING btree ("report_version_id");
--> statement-breakpoint
CREATE INDEX "report_source_snapshots_report_idx" ON "report_source_snapshots" USING btree ("report_id");
--> statement-breakpoint
CREATE INDEX "report_source_snapshots_chart_version_idx" ON "report_source_snapshots" USING btree ("chart_version_id");
