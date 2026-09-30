ALTER TABLE "wallet_purchase_intents" ADD COLUMN IF NOT EXISTS "period_key" text NOT NULL DEFAULT 'lifetime';
--> statement-breakpoint
ALTER TABLE "commerce_entitlements" ADD COLUMN IF NOT EXISTS "period_key" text NOT NULL DEFAULT 'lifetime';
--> statement-breakpoint
DROP INDEX IF EXISTS "commerce_entitlements_chart_sku_unique";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "commerce_entitlements_chart_sku_period_unique" ON "commerce_entitlements" ("chart_id", "sku", "period_key") WHERE "revoked_at" IS NULL;
