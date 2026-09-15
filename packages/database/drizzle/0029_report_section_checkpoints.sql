CREATE TABLE IF NOT EXISTS "report_section_checkpoints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_version_id" uuid NOT NULL,
	"section_key" text NOT NULL,
	"section_order" integer NOT NULL,
	"state_version" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"prompt_version" text NOT NULL,
	"knowledge_version_id" text NOT NULL,
	"report_config_version" text NOT NULL,
	"quality_config_version" text NOT NULL,
	"generation_attempt_count" integer DEFAULT 0 NOT NULL,
	"rewrite_attempt_count" integer DEFAULT 0 NOT NULL,
	"active_job_id" text,
	"active_worker_id" text,
	"accepted_content" jsonb,
	"content_hash" text,
	"provider_id" text,
	"model_id" text,
	"failure_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "report_section_checkpoints_lineage_non_empty" CHECK (btrim("section_key") <> '' AND btrim("prompt_version") <> '' AND btrim("knowledge_version_id") <> '' AND btrim("report_config_version") <> '' AND btrim("quality_config_version") <> ''),
	CONSTRAINT "report_section_checkpoints_nonnegative_counts" CHECK ("section_order" >= 0 AND "generation_attempt_count" >= 0 AND "rewrite_attempt_count" >= 0),
	CONSTRAINT "report_section_checkpoints_positive_state_version" CHECK ("state_version" > 0),
	CONSTRAINT "report_section_checkpoints_status_valid" CHECK ("status" IN ('pending', 'generating', 'passed', 'terminal_failure')),
	CONSTRAINT "report_section_checkpoints_active_ownership" CHECK (("status" = 'generating' AND "active_job_id" IS NOT NULL AND btrim("active_job_id") <> '' AND "active_worker_id" IS NOT NULL AND btrim("active_worker_id") <> '') OR ("status" <> 'generating' AND "active_job_id" IS NULL AND "active_worker_id" IS NULL)),
	CONSTRAINT "report_section_checkpoints_passed_lineage" CHECK (("status" = 'passed' AND "accepted_content" IS NOT NULL AND "content_hash" ~ '^[a-f0-9]{64}$' AND "provider_id" IS NOT NULL AND btrim("provider_id") <> '' AND "model_id" IS NOT NULL AND btrim("model_id") <> '' AND "failure_code" IS NULL) OR ("status" <> 'passed' AND "accepted_content" IS NULL AND "content_hash" IS NULL AND "provider_id" IS NULL AND "model_id" IS NULL)),
	CONSTRAINT "report_section_checkpoints_failure_code_bounded" CHECK ("failure_code" IS NULL OR (btrim("failure_code") <> '' AND char_length("failure_code") <= 120))
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "report_section_checkpoints_version_section_unique" ON "report_section_checkpoints" USING btree ("report_version_id","section_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "report_section_checkpoints_passed_order_idx" ON "report_section_checkpoints" USING btree ("report_version_id","status","section_order","section_key");
