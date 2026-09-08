CREATE TABLE "report_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"report_version_id" uuid NOT NULL,
	"entitlement_id" uuid NOT NULL,
	"chart_version_id" text NOT NULL,
	"evidence_version_id" text NOT NULL,
	"knowledge_version_id" text NOT NULL,
	"prompt_version" text NOT NULL,
	"report_config_version" text NOT NULL,
	"template_version" text NOT NULL,
	"locale" text NOT NULL,
	"sku" text NOT NULL,
	"provider_id" text NOT NULL,
	"model_id" text NOT NULL,
	"structured_content" jsonb NOT NULL,
	"html_content" text NOT NULL,
	"content_hash" text NOT NULL,
	"pdf_asset_id" uuid NOT NULL,
	"render_version" text NOT NULL,
	"supersedes_report_version_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "report_versions_content_hash_format" CHECK ("content_hash" ~ '^[a-f0-9]{64}$')
);
--> statement-breakpoint
CREATE TABLE "report_generation_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_version_id" uuid NOT NULL,
	"job_id" text NOT NULL,
	"attempt_number" integer NOT NULL,
	"status" text NOT NULL,
	"provider_id" text,
	"model_id" text,
	"error_code" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "report_versions" ADD CONSTRAINT "report_versions_entitlement_id_commerce_entitlements_id_fk" FOREIGN KEY ("entitlement_id") REFERENCES "public"."commerce_entitlements"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "report_versions_version_unique" ON "report_versions" USING btree ("report_version_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "report_versions_pdf_asset_unique" ON "report_versions" USING btree ("pdf_asset_id");
--> statement-breakpoint
CREATE INDEX "report_versions_report_idx" ON "report_versions" USING btree ("report_id","created_at");
--> statement-breakpoint
CREATE INDEX "report_versions_entitlement_idx" ON "report_versions" USING btree ("entitlement_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "report_generation_attempts_job_attempt_unique" ON "report_generation_attempts" USING btree ("job_id","attempt_number");
--> statement-breakpoint
CREATE INDEX "report_generation_attempts_report_idx" ON "report_generation_attempts" USING btree ("report_version_id","started_at");
