CREATE TABLE IF NOT EXISTS "report_section_checkpoint_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"checkpoint_id" uuid NOT NULL,
	"rewrite_ordinal" integer NOT NULL,
	"state_version" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"active_job_id" text,
	"active_worker_id" text,
	"accepted_content" jsonb,
	"content_hash" text,
	"provider_id" text,
	"model_id" text,
	"failure_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "report_section_checkpoint_revisions_checkpoint_fk" FOREIGN KEY ("checkpoint_id") REFERENCES "report_section_checkpoints"("id") ON DELETE RESTRICT,
	CONSTRAINT "report_section_checkpoint_revisions_positive_ordinal" CHECK ("rewrite_ordinal" > 0),
	CONSTRAINT "report_section_checkpoint_revisions_positive_state_version" CHECK ("state_version" > 0),
	CONSTRAINT "report_section_checkpoint_revisions_status_valid" CHECK ("status" IN ('pending', 'generating', 'passed', 'terminal_failure')),
	CONSTRAINT "report_section_checkpoint_revisions_active_ownership" CHECK (("status" = 'generating' AND "active_job_id" IS NOT NULL AND btrim("active_job_id") <> '' AND "active_worker_id" IS NOT NULL AND btrim("active_worker_id") <> '') OR ("status" <> 'generating' AND "active_job_id" IS NULL AND "active_worker_id" IS NULL)),
	CONSTRAINT "report_section_checkpoint_revisions_passed_lineage" CHECK (("status" = 'passed' AND "accepted_content" IS NOT NULL AND "content_hash" ~ '^[a-f0-9]{64}$' AND "provider_id" IS NOT NULL AND btrim("provider_id") <> '' AND "model_id" IS NOT NULL AND btrim("model_id") <> '' AND "failure_code" IS NULL) OR ("status" <> 'passed' AND "accepted_content" IS NULL AND "content_hash" IS NULL AND "provider_id" IS NULL AND "model_id" IS NULL)),
	CONSTRAINT "report_section_checkpoint_revisions_failure_code_bounded" CHECK ("failure_code" IS NULL OR (btrim("failure_code") <> '' AND char_length("failure_code") <= 120))
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "report_section_checkpoint_revisions_checkpoint_ordinal_unique" ON "report_section_checkpoint_revisions" USING btree ("checkpoint_id","rewrite_ordinal");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "report_section_checkpoint_revisions_checkpoint_passed_idx" ON "report_section_checkpoint_revisions" USING btree ("checkpoint_id","status","rewrite_ordinal");
