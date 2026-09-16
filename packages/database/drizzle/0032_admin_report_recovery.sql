CREATE TABLE IF NOT EXISTS "admin_report_recovery_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" text NOT NULL,
	"operation" text NOT NULL,
	"target_report_version_id" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"request_fingerprint" text NOT NULL,
	"result" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_report_recovery_receipts_actor_id_auth_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "auth_users"("id") ON DELETE RESTRICT,
	CONSTRAINT "admin_report_recovery_receipts_operation_bounded" CHECK (char_length("operation") BETWEEN 1 AND 96 AND btrim("operation") <> ''),
	CONSTRAINT "admin_report_recovery_receipts_target_bounded" CHECK (char_length("target_report_version_id") BETWEEN 1 AND 128 AND btrim("target_report_version_id") <> ''),
	CONSTRAINT "admin_report_recovery_receipts_key_bounded" CHECK (char_length("idempotency_key") BETWEEN 1 AND 128 AND btrim("idempotency_key") <> ''),
	CONSTRAINT "admin_report_recovery_receipts_fingerprint_format" CHECK ("request_fingerprint" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "admin_report_recovery_receipts_result_object" CHECK (jsonb_typeof("result") = 'object')
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "admin_report_recovery_receipts_actor_key_unique" ON "admin_report_recovery_receipts" USING btree ("actor_id","idempotency_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "admin_report_recovery_receipts_target_idx" ON "admin_report_recovery_receipts" USING btree ("target_report_version_id");
