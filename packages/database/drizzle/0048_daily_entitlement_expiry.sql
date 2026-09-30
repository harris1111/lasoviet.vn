ALTER TABLE "commerce_entitlements" ADD COLUMN "expires_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "commerce_entitlements" ADD COLUMN "daily_bonus_expires_at" timestamp with time zone;
--> statement-breakpoint
UPDATE "commerce_entitlements"
SET "daily_bonus_expires_at" = "created_at" + interval '168 hours'
WHERE "sku" = 'ZIWEI-IDENTITY-P0';
--> statement-breakpoint
ALTER TABLE "commerce_entitlements" ADD CONSTRAINT "commerce_entitlements_expiry_after_grant"
CHECK ("expires_at" IS NULL OR "expires_at" > "created_at");
--> statement-breakpoint
ALTER TABLE "commerce_entitlements" ADD CONSTRAINT "commerce_entitlements_daily_bonus_valid"
CHECK ("daily_bonus_expires_at" IS NULL OR
  ("sku" = 'ZIWEI-IDENTITY-P0' AND "daily_bonus_expires_at" = "created_at" + interval '168 hours'));
--> statement-breakpoint
CREATE TABLE "daily_reading_unlocks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "owner_id" text NOT NULL REFERENCES "auth_users"("id") ON DELETE CASCADE,
  "chart_id" text NOT NULL REFERENCES "ziwei_charts"("id") ON DELETE CASCADE,
  "chart_version_id" text NOT NULL REFERENCES "ziwei_chart_versions"("id") ON DELETE CASCADE,
  "reading_date" text NOT NULL,
  "ledger_spend_id" uuid NOT NULL REFERENCES "wallet_transactions"("id"),
  "content" jsonb NOT NULL,
  "created_at" timestamp with time zone NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  CONSTRAINT "daily_reading_unlocks_date_valid" CHECK ("reading_date" ~ '^\d{4}-\d{2}-\d{2}$' AND "expires_at" > "created_at")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "daily_reading_unlocks_spend_unique" ON "daily_reading_unlocks" ("ledger_spend_id");
--> statement-breakpoint
CREATE INDEX "daily_reading_unlocks_owner_chart_date_idx" ON "daily_reading_unlocks" ("owner_id", "chart_id", "reading_date");
