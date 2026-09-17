CREATE TABLE "generated_preview_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chart_version_id" text NOT NULL,
	"source_reference" uuid NOT NULL,
	"idempotency_key" text NOT NULL,
	"status" text DEFAULT 'requested' NOT NULL,
	"budget_reservation_id" text,
	"state_version" integer DEFAULT 1 NOT NULL,
	"lease_token" text,
	"lease_expires_at" timestamp with time zone,
	"failure_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "generated_preview_requests_valid" CHECK ("generated_preview_requests"."status" IN ('requested', 'generating', 'ready', 'budget_exhausted', 'terminal_failure') AND "generated_preview_requests"."state_version" > 0)
);
--> statement-breakpoint
CREATE TABLE "generated_preview_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"section_id" text NOT NULL,
	"ordinal" integer NOT NULL,
	"status" text DEFAULT 'requested' NOT NULL,
	"safe_excerpt" text,
	"teaser" text NOT NULL,
	"content_hash" text,
	"generation_attempts" integer DEFAULT 0 NOT NULL,
	"rewrite_attempts" integer DEFAULT 0 NOT NULL,
	"failure_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "generated_preview_sections_valid" CHECK ("generated_preview_sections"."ordinal" >= 0 AND "generated_preview_sections"."ordinal" < 3 AND "generated_preview_sections"."status" IN ('requested', 'generating', 'ready', 'budget_exhausted', 'terminal_failure') AND char_length("generated_preview_sections"."teaser") BETWEEN 1 AND 520 AND ("generated_preview_sections"."safe_excerpt" IS NULL OR char_length("generated_preview_sections"."safe_excerpt") BETWEEN 280 AND 520) AND "generated_preview_sections"."generation_attempts" >= 0 AND "generated_preview_sections"."rewrite_attempts" BETWEEN 0 AND 1)
);
--> statement-breakpoint
ALTER TABLE "generated_preview_sections" ADD CONSTRAINT "generated_preview_sections_request_id_generated_preview_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."generated_preview_requests"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "generated_preview_requests_chart_version_unique" ON "generated_preview_requests" USING btree ("chart_version_id");--> statement-breakpoint
CREATE INDEX "generated_preview_requests_claim_idx" ON "generated_preview_requests" USING btree ("status","lease_expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "generated_preview_sections_request_section_unique" ON "generated_preview_sections" USING btree ("request_id","section_id");--> statement-breakpoint
CREATE UNIQUE INDEX "generated_preview_sections_request_ordinal_unique" ON "generated_preview_sections" USING btree ("request_id","ordinal");
--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_generated_preview_source_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_TABLE_NAME = 'generated_preview_requests'
     AND (NEW.chart_version_id <> OLD.chart_version_id OR NEW.source_reference <> OLD.source_reference OR NEW.idempotency_key <> OLD.idempotency_key) THEN
    RAISE EXCEPTION 'generated preview request source is immutable';
  END IF;
  IF TG_TABLE_NAME = 'generated_preview_sections'
     AND (NEW.request_id <> OLD.request_id OR NEW.section_id <> OLD.section_id OR NEW.ordinal <> OLD.ordinal) THEN
    RAISE EXCEPTION 'generated preview section selection is immutable';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER generated_preview_requests_source_immutable BEFORE UPDATE ON generated_preview_requests FOR EACH ROW EXECUTE FUNCTION prevent_generated_preview_source_mutation();
--> statement-breakpoint
CREATE TRIGGER generated_preview_sections_source_immutable BEFORE UPDATE ON generated_preview_sections FOR EACH ROW EXECUTE FUNCTION prevent_generated_preview_source_mutation();
