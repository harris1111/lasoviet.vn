CREATE OR REPLACE FUNCTION "report_section_quality_findings_valid"("candidate_findings" jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
STRICT
AS $$
	SELECT CASE
		WHEN jsonb_typeof("candidate_findings") <> 'array' THEN false
		WHEN jsonb_array_length("candidate_findings") NOT BETWEEN 1 AND 8 THEN false
		ELSE NOT EXISTS (
			SELECT 1
			FROM jsonb_array_elements("candidate_findings") AS "finding"("value")
			WHERE jsonb_typeof("finding"."value") <> 'object'
				OR NOT ("finding"."value" ?& ARRAY['itemKey', 'code', 'note'])
				OR EXISTS (
					SELECT 1
					FROM jsonb_object_keys("finding"."value") AS "field"("name")
					WHERE "field"."name" NOT IN ('itemKey', 'code', 'note')
				)
				OR jsonb_typeof("finding"."value"->'itemKey') <> 'string'
				OR jsonb_typeof("finding"."value"->'code') <> 'string'
				OR jsonb_typeof("finding"."value"->'note') <> 'string'
				OR btrim("finding"."value"->>'itemKey') = ''
				OR char_length("finding"."value"->>'itemKey') > 120
				OR btrim("finding"."value"->>'note') = ''
				OR char_length("finding"."value"->>'note') > 300
				OR "finding"."value"->>'code' NOT IN (
					'MINIMUM_SYLLABLES', 'DISCOURAGED_TERM', 'DEATH_TERM', 'CERTAINTY',
					'LOCALE_HAN', 'ENGLISH_BRIGHTNESS', 'PROPER_NAME_DENSITY', 'ADVERSE_DATE',
					'PREPARATION_FRAMING', 'PALACE_FACTS', 'PALACE_ANCHORS', 'EVIDENCE_ANCHORS'
				)
		)
	END
$$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "report_section_quality_candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"checkpoint_id" uuid NOT NULL,
	"rewrite_ordinal" integer NOT NULL,
	"generation_ordinal" integer NOT NULL,
	"state_version" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"active_job_id" text,
	"active_worker_id" text,
	"active_attempt_number" integer,
	"candidate_content" jsonb NOT NULL,
	"candidate_hash" text NOT NULL,
	"candidate_provider_id" text NOT NULL,
	"candidate_model_id" text NOT NULL,
	"findings" jsonb NOT NULL,
	"accepted_content" jsonb,
	"content_hash" text,
	"provider_id" text,
	"model_id" text,
	"failure_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "report_section_quality_candidates_checkpoint_fk" FOREIGN KEY ("checkpoint_id") REFERENCES "report_section_checkpoints"("id") ON DELETE RESTRICT,
	CONSTRAINT "report_section_quality_candidates_positive_rewrite_ordinal" CHECK ("rewrite_ordinal" > 0),
	CONSTRAINT "report_section_quality_candidates_positive_generation_ordinal" CHECK ("generation_ordinal" > 0),
	CONSTRAINT "report_section_quality_candidates_positive_state_version" CHECK ("state_version" > 0),
	CONSTRAINT "report_section_quality_candidates_status_valid" CHECK ("status" IN ('pending', 'generating', 'passed', 'terminal_failure')),
	CONSTRAINT "report_section_quality_candidates_active_ownership" CHECK (("status" = 'generating' AND "active_job_id" IS NOT NULL AND btrim("active_job_id") <> '' AND "active_worker_id" IS NOT NULL AND btrim("active_worker_id") <> '' AND "active_attempt_number" IS NOT NULL AND "active_attempt_number" > 0) OR ("status" <> 'generating' AND "active_job_id" IS NULL AND "active_worker_id" IS NULL AND "active_attempt_number" IS NULL)),
	CONSTRAINT "report_section_quality_candidates_candidate_lineage" CHECK ("candidate_content" IS NOT NULL AND "candidate_hash" ~ '^[a-f0-9]{64}$' AND btrim("candidate_provider_id") <> '' AND btrim("candidate_model_id") <> ''),
	CONSTRAINT "report_section_quality_candidates_findings_bounded" CHECK ("report_section_quality_findings_valid"("findings")),
	CONSTRAINT "report_section_quality_candidates_passed_lineage" CHECK (("status" = 'passed' AND "accepted_content" IS NOT NULL AND "content_hash" ~ '^[a-f0-9]{64}$' AND "provider_id" IS NOT NULL AND btrim("provider_id") <> '' AND "model_id" IS NOT NULL AND btrim("model_id") <> '' AND "failure_code" IS NULL) OR ("status" <> 'passed' AND "accepted_content" IS NULL AND "content_hash" IS NULL AND "provider_id" IS NULL AND "model_id" IS NULL)),
	CONSTRAINT "report_section_quality_candidates_failure_code_bounded" CHECK ("failure_code" IS NULL OR (btrim("failure_code") <> '' AND char_length("failure_code") <= 120))
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "report_section_quality_candidates_checkpoint_rewrite_unique" ON "report_section_quality_candidates" USING btree ("checkpoint_id","rewrite_ordinal");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "report_section_quality_candidates_checkpoint_generation_unique" ON "report_section_quality_candidates" USING btree ("checkpoint_id","generation_ordinal");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "report_section_quality_candidates_checkpoint_status_idx" ON "report_section_quality_candidates" USING btree ("checkpoint_id","status","rewrite_ordinal");
