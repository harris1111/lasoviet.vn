ALTER TABLE "commerce_unmatched_payments" ADD COLUMN IF NOT EXISTS "stale_alerted_at" timestamp with time zone;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "commerce_reconciliation_state" (
	"id" text PRIMARY KEY NOT NULL,
	"circuit_status" text DEFAULT 'closed' NOT NULL,
	"opened_at" timestamp with time zone,
	"reason_code" text,
	"alert_idempotency_key" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commerce_reconciliation_state_singleton" CHECK ("id" = 'singleton'),
	CONSTRAINT "commerce_reconciliation_state_circuit_status" CHECK ("circuit_status" IN ('closed', 'open'))
);
--> statement-breakpoint
INSERT INTO "commerce_reconciliation_state" ("id", "circuit_status", "updated_at")
VALUES ('singleton', 'closed', now())
ON CONFLICT ("id") DO NOTHING;
