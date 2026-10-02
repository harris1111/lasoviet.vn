CREATE TABLE "free_ai_admissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"admitted_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
CREATE TABLE "free_ai_artifacts" (
	"request_id" uuid PRIMARY KEY NOT NULL,
	"deletion_generation" integer NOT NULL,
	"frozen_call" jsonb,
	"content" jsonb,
	"facts" jsonb,
	"content_hash" text,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "free_ai_artifacts_generation_valid" CHECK ("free_ai_artifacts"."deletion_generation" >= 0)
);

--> statement-breakpoint
CREATE TABLE "free_ai_chart_budgets" (
	"chart_version_id" text PRIMARY KEY NOT NULL,
	"reserved_micro_vnd" bigint DEFAULT 0 NOT NULL,
	"resolved_micro_vnd" bigint DEFAULT 0 NOT NULL,
	"unknown_micro_vnd" bigint DEFAULT 0 NOT NULL,
	"deletion_generation" integer DEFAULT 0 NOT NULL,
	"deleted_at" timestamp with time zone,
	"legacy_reconciled_at" timestamp with time zone,
	CONSTRAINT "free_ai_chart_budget_nonnegative" CHECK ("free_ai_chart_budgets"."reserved_micro_vnd" >= 0 AND "free_ai_chart_budgets"."resolved_micro_vnd" >= 0 AND "free_ai_chart_budgets"."unknown_micro_vnd" >= 0 AND "free_ai_chart_budgets"."deletion_generation" >= 0)
);

--> statement-breakpoint
CREATE TABLE "free_ai_daily_budgets" (
	"utc_day" date PRIMARY KEY NOT NULL,
	"reserved_micro_vnd" bigint DEFAULT 0 NOT NULL,
	"resolved_micro_vnd" bigint DEFAULT 0 NOT NULL,
	"unknown_micro_vnd" bigint DEFAULT 0 NOT NULL,
	CONSTRAINT "free_ai_daily_budget_nonnegative" CHECK ("free_ai_daily_budgets"."reserved_micro_vnd" >= 0 AND "free_ai_daily_budgets"."resolved_micro_vnd" >= 0 AND "free_ai_daily_budgets"."unknown_micro_vnd" >= 0)
);

--> statement-breakpoint
CREATE TABLE "free_ai_quota_aliases" (
	"alias_key" text PRIMARY KEY NOT NULL,
	"subject_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
CREATE TABLE "free_ai_quota_subjects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"merged_into_subject_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "free_ai_quota_subject_kind" CHECK ("free_ai_quota_subjects"."kind" IN ('guest', 'account') AND ("free_ai_quota_subjects"."merged_into_subject_id" IS NULL OR "free_ai_quota_subjects"."merged_into_subject_id" <> "free_ai_quota_subjects"."id"))
);

--> statement-breakpoint
CREATE TABLE "free_ai_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chart_version_id" text NOT NULL,
	"subject_id" uuid NOT NULL,
	"palace_id" text NOT NULL,
	"locale" text NOT NULL,
	"concern" text,
	"status" text DEFAULT 'reserved' NOT NULL,
	"deletion_generation" integer NOT NULL,
	"admission_day" date NOT NULL,
	"dispatch_day" date,
	"reserved_micro_vnd" bigint DEFAULT 0 NOT NULL,
	"attempt_id" uuid,
	"pricing_snapshot_id" text NOT NULL,
	"lineage_hash" text NOT NULL,
	"fenced_at" timestamp with time zone,
	"settled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "free_ai_requests_valid" CHECK ("free_ai_requests"."locale" IN ('vi','en') AND "free_ai_requests"."status" IN ('reserved','dispatching','ready','cancelled','terminal_failure','cost_unknown') AND "free_ai_requests"."reserved_micro_vnd" >= 0 AND "free_ai_requests"."deletion_generation" >= 0 AND (("free_ai_requests"."fenced_at" IS NULL AND "free_ai_requests"."attempt_id" IS NULL AND "free_ai_requests"."dispatch_day" IS NULL) OR ("free_ai_requests"."fenced_at" IS NOT NULL AND "free_ai_requests"."attempt_id" IS NOT NULL AND "free_ai_requests"."dispatch_day" IS NOT NULL)))
);

--> statement-breakpoint
CREATE TABLE "free_ai_settlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"attempt_id" uuid NOT NULL,
	"actual_micro_vnd" bigint,
	"outcome" text NOT NULL,
	"settled_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "free_ai_settlements_valid" CHECK ("free_ai_settlements"."outcome" IN ('resolved','unknown') AND (("free_ai_settlements"."outcome" = 'resolved' AND "free_ai_settlements"."actual_micro_vnd" IS NOT NULL AND "free_ai_settlements"."actual_micro_vnd" >= 0) OR ("free_ai_settlements"."outcome" = 'unknown' AND "free_ai_settlements"."actual_micro_vnd" IS NULL)))
);

--> statement-breakpoint
ALTER TABLE "free_ai_admissions" ADD CONSTRAINT "free_ai_admissions_request_id_free_ai_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."free_ai_requests"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "free_ai_admissions" ADD CONSTRAINT "free_ai_admissions_subject_id_free_ai_quota_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."free_ai_quota_subjects"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "free_ai_artifacts" ADD CONSTRAINT "free_ai_artifacts_request_id_free_ai_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."free_ai_requests"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "free_ai_quota_aliases" ADD CONSTRAINT "free_ai_quota_aliases_subject_id_free_ai_quota_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."free_ai_quota_subjects"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "free_ai_requests" ADD CONSTRAINT "free_ai_requests_chart_version_id_free_ai_chart_budgets_chart_version_id_fk" FOREIGN KEY ("chart_version_id") REFERENCES "public"."free_ai_chart_budgets"("chart_version_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "free_ai_requests" ADD CONSTRAINT "free_ai_requests_subject_id_free_ai_quota_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."free_ai_quota_subjects"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "free_ai_settlements" ADD CONSTRAINT "free_ai_settlements_request_id_free_ai_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."free_ai_requests"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "free_ai_admissions_request_unique" ON "free_ai_admissions" USING btree ("request_id");
--> statement-breakpoint
CREATE INDEX "free_ai_admissions_rolling_idx" ON "free_ai_admissions" USING btree ("subject_id","admitted_at");
--> statement-breakpoint
CREATE INDEX "free_ai_artifacts_expiry_idx" ON "free_ai_artifacts" USING btree ("expires_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "free_ai_requests_chart_slot_unique" ON "free_ai_requests" USING btree ("chart_version_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "free_ai_requests_attempt_unique" ON "free_ai_requests" USING btree ("attempt_id");
--> statement-breakpoint
CREATE INDEX "free_ai_requests_status_idx" ON "free_ai_requests" USING btree ("status");
--> statement-breakpoint
CREATE UNIQUE INDEX "free_ai_settlements_request_unique" ON "free_ai_settlements" USING btree ("request_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "free_ai_settlements_attempt_unique" ON "free_ai_settlements" USING btree ("attempt_id");
