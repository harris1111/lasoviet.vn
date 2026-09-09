INSERT INTO "admin_capability_policies" ("id", "role", "capability", "active")
VALUES ('admin_policy_super_admin_commerce_manage', 'super_admin', 'admin.commerce.manage', true)
ON CONFLICT ("role", "capability") DO NOTHING;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "commerce_alert_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idempotency_key" text NOT NULL,
	"alert_kind" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"leased_until" timestamp with time zone,
	"lease_token" text,
	"last_error" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "commerce_alert_deliveries_idempotency_unique" ON "commerce_alert_deliveries" USING btree ("idempotency_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "commerce_alert_deliveries_claim_idx" ON "commerce_alert_deliveries" USING btree ("status", "leased_until", "created_at");
