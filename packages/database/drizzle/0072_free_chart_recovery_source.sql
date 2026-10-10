ALTER TYPE "notification_delivery_kind" ADD VALUE 'recovery_free_chart';
--> statement-breakpoint
CREATE TABLE "free_chart_recovery_sources" (
  "chart_id" text PRIMARY KEY REFERENCES "ziwei_charts"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "auth_users"("id") ON DELETE CASCADE,
  "chart_version_id" text NOT NULL REFERENCES "ziwei_chart_versions"("id") ON DELETE CASCADE,
  "first_viewed_at" timestamptz NOT NULL,
  "source_sha256" text NOT NULL,
  "source" jsonb NOT NULL,
  "created_at" timestamptz NOT NULL,
  CONSTRAINT "free_chart_recovery_hash_check" CHECK ("source_sha256" ~ '^[a-f0-9]{64}$'),
  CONSTRAINT "free_chart_recovery_time_check" CHECK ("first_viewed_at" <= "created_at")
);
--> statement-breakpoint
CREATE INDEX "free_chart_recovery_due_idx" ON "free_chart_recovery_sources" ("first_viewed_at", "chart_id");
--> statement-breakpoint
CREATE FUNCTION "reject_free_chart_recovery_source_update"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'FREE_CHART_RECOVERY_SOURCE_IMMUTABLE';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "free_chart_recovery_source_immutable" BEFORE UPDATE ON "free_chart_recovery_sources"
FOR EACH ROW EXECUTE FUNCTION "reject_free_chart_recovery_source_update"();
