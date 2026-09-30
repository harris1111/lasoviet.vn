ALTER TABLE "commerce_entitlements" ADD COLUMN IF NOT EXISTS "expires_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "commerce_entitlements" ADD COLUMN IF NOT EXISTS "daily_bonus_expires_at" timestamp with time zone;
--> statement-breakpoint
UPDATE "commerce_entitlements"
SET "daily_bonus_expires_at" = "created_at" + interval '168 hours'
WHERE "sku" = 'ZIWEI-IDENTITY-P0';
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'commerce_entitlements_expiry_after_grant') THEN
    ALTER TABLE "commerce_entitlements" ADD CONSTRAINT "commerce_entitlements_expiry_after_grant"
    CHECK ("expires_at" IS NULL OR "expires_at" > "created_at");
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'commerce_entitlements_daily_bonus_valid') THEN
    ALTER TABLE "commerce_entitlements" ADD CONSTRAINT "commerce_entitlements_daily_bonus_valid"
    CHECK ("daily_bonus_expires_at" IS NULL OR
      ("sku" = 'ZIWEI-IDENTITY-P0' AND "daily_bonus_expires_at" = "created_at" + interval '168 hours'));
  END IF;
END $$;
--> statement-breakpoint
DROP INDEX IF EXISTS "commerce_entitlements_chart_sku_unique";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "commerce_entitlements_chart_sku_unique" ON "commerce_entitlements" ("chart_id", "sku") WHERE "sku" <> 'ZIWEI-TODAY-P0';
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "daily_reading_unlocks" (
  "id" uuid PRIMARY KEY REFERENCES "commerce_entitlements"("id") ON DELETE CASCADE,
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
CREATE UNIQUE INDEX IF NOT EXISTS "daily_reading_unlocks_spend_unique" ON "daily_reading_unlocks" ("ledger_spend_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "daily_reading_unlocks_owner_chart_date_idx" ON "daily_reading_unlocks" ("owner_id", "chart_id", "reading_date");
