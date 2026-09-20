CREATE TABLE IF NOT EXISTS "report_assets" (
  "id" uuid PRIMARY KEY NOT NULL,
  "report_id" uuid NOT NULL,
  "report_version_id" uuid NOT NULL,
  "render_version" text NOT NULL,
  "media_type" text DEFAULT 'application/pdf' NOT NULL,
  "object_key" text NOT NULL,
  "sha256" text,
  "byte_length" integer,
  "status" text DEFAULT 'render_pending' NOT NULL,
  "replica_status" text DEFAULT 'replica_disabled' NOT NULL,
  "attempt_count" integer DEFAULT 0 NOT NULL,
  "last_error_code" text,
  "lease_token" text,
  "lease_expires_at" timestamp with time zone,
  "state_version" integer DEFAULT 1 NOT NULL,
  "garage_etag" text,
  "garage_version_id" text,
  "stored_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "report_assets_report_version_id_report_versions_report_version_id_fk"
    FOREIGN KEY ("report_version_id") REFERENCES "report_versions"("report_version_id") ON DELETE RESTRICT,
  CONSTRAINT "report_assets_render_version_supported"
    CHECK ("render_version" IN ('identity-report-pdf.v1', 'identity-report-pdf.v2')),
  CONSTRAINT "report_assets_media_type_pdf" CHECK ("media_type" = 'application/pdf'),
  CONSTRAINT "report_assets_status_bounded"
    CHECK ("status" IN ('render_pending', 'rendering', 'rendered', 'storing', 'stored', 'store_retryable_failure', 'terminal_failure')),
  CONSTRAINT "report_assets_replica_status_bounded"
    CHECK ("replica_status" = 'replica_disabled'),
  CONSTRAINT "report_assets_error_code_bounded"
    CHECK ("last_error_code" IS NULL OR "last_error_code" IN ('PDF_RENDER_FAILED', 'PDF_TEMP_CLEANUP_FAILED', 'PDF_FONT_MISSING', 'PDF_RENDER_VERSION_UNSUPPORTED', 'GARAGE_UNAVAILABLE', 'ASSET_CHECKSUM_MISMATCH', 'ASSET_KEY_CONFLICT')),
  CONSTRAINT "report_assets_integrity_metadata"
    CHECK (("sha256" IS NULL AND "byte_length" IS NULL) OR ("sha256" ~ '^[a-f0-9]{64}$' AND "byte_length" > 0)),
  CONSTRAINT "report_assets_positive_attempts_and_state_version"
    CHECK ("attempt_count" >= 0 AND "state_version" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "report_assets_report_version_unique"
  ON "report_assets" USING btree ("report_version_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "report_assets_object_key_unique"
  ON "report_assets" USING btree ("object_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "report_assets_status_lease_idx"
  ON "report_assets" USING btree ("status", "lease_expires_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "support_cases" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "report_id" uuid NOT NULL,
  "report_version_id" uuid NOT NULL,
  "asset_id" uuid NOT NULL,
  "failure_stage" text NOT NULL,
  "error_code" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "support_cases_report_version_id_report_versions_report_version_id_fk"
    FOREIGN KEY ("report_version_id") REFERENCES "report_versions"("report_version_id") ON DELETE RESTRICT,
  CONSTRAINT "support_cases_asset_id_report_assets_id_fk"
    FOREIGN KEY ("asset_id") REFERENCES "report_assets"("id") ON DELETE RESTRICT,
  CONSTRAINT "support_cases_failure_stage_bounded" CHECK ("failure_stage" IN ('pdf', 'garage')),
  CONSTRAINT "support_cases_error_code_bounded"
    CHECK ("error_code" IN ('PDF_RENDER_FAILED', 'PDF_TEMP_CLEANUP_FAILED', 'PDF_FONT_MISSING', 'PDF_RENDER_VERSION_UNSUPPORTED', 'GARAGE_UNAVAILABLE', 'ASSET_CHECKSUM_MISMATCH', 'ASSET_KEY_CONFLICT'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "support_cases_report_version_stage_unique"
  ON "support_cases" USING btree ("report_version_id", "failure_stage");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "support_cases_asset_idx"
  ON "support_cases" USING btree ("asset_id");
--> statement-breakpoint
ALTER TYPE "notification_delivery_kind" ADD VALUE IF NOT EXISTS 'report_failed';
