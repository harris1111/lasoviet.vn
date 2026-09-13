ALTER TABLE "report_reservations" ADD COLUMN IF NOT EXISTS "as_of_date" date;
--> statement-breakpoint
ALTER TABLE "report_reservations" ADD COLUMN IF NOT EXISTS "target_year" integer;
--> statement-breakpoint
ALTER TABLE "report_reservations" ADD COLUMN IF NOT EXISTS "timing_rule_version" text;
--> statement-breakpoint
ALTER TABLE "report_reservations" ADD COLUMN IF NOT EXISTS "sensitivity_rule_version" text;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "report_reservations" ADD CONSTRAINT "report_reservations_timing_lineage_presence" CHECK (("as_of_date" IS NULL AND "target_year" IS NULL AND "timing_rule_version" IS NULL AND "sensitivity_rule_version" IS NULL) OR ("as_of_date" IS NOT NULL AND "target_year" IS NOT NULL AND "timing_rule_version" IS NOT NULL AND "sensitivity_rule_version" IS NOT NULL));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "report_reservations" ADD CONSTRAINT "report_reservations_target_year_matches_as_of_date" CHECK ("as_of_date" IS NULL OR "target_year" = CAST(EXTRACT(YEAR FROM "as_of_date") AS integer));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "report_reservations" ADD CONSTRAINT "report_reservations_timing_rule_versions_non_empty" CHECK (("timing_rule_version" IS NULL AND "sensitivity_rule_version" IS NULL) OR (btrim("timing_rule_version") <> '' AND btrim("sensitivity_rule_version") <> ''));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
