CREATE TABLE IF NOT EXISTS "membership_subscriptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "owner_id" text NOT NULL REFERENCES "auth_users"("id") ON DELETE RESTRICT,
  "sku" text NOT NULL,
  "ledger_spend_id" uuid NOT NULL REFERENCES "wallet_transactions"("id") ON DELETE RESTRICT,
  "starts_at" timestamptz NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "created_at" timestamptz NOT NULL,
  CONSTRAINT "membership_subscriptions_terms_valid" CHECK (("sku" = 'MEMBERSHIP-MONTHLY-P0' AND "expires_at" = "starts_at" + interval '720 hours') OR ("sku" = 'MEMBERSHIP-YEARLY-P0' AND "expires_at" = "starts_at" + interval '8760 hours'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "membership_subscriptions_spend_unique" ON "membership_subscriptions" ("ledger_spend_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "membership_subscriptions_owner_expiry_idx" ON "membership_subscriptions" ("owner_id", "expires_at");
--> statement-breakpoint
ALTER TABLE "wallet_purchase_intents" DROP CONSTRAINT IF EXISTS "wallet_purchase_intents_valid";
--> statement-breakpoint
ALTER TABLE "wallet_purchase_intents" ADD CONSTRAINT "wallet_purchase_intents_valid" CHECK ((
    ("sku" = 'ZIWEI-NATAL-EXCERPT-P0' AND "locale" = 'vi' AND "price_la" IN (240, 192))
    OR ("sku" = 'ZIWEI-IDENTITY-P0' AND "locale" IN ('vi', 'en') AND "price_la" >= 0 AND "price_la" <= 960)
    OR ("sku" = 'ZIWEI-RELATIONSHIP-P0' AND "locale" IN ('vi', 'en') AND "price_la" IN (480, 384))
    OR ("sku" = 'ZIWEI-CAREER-P0' AND "locale" IN ('vi', 'en') AND "price_la" IN (480, 384))
    OR ("sku" = 'ZIWEI-TODAY-P0' AND "locale" IN ('vi', 'en') AND "price_la" = 60)
    OR ("sku" = 'ZIWEI-MONTHLY-P0' AND "locale" IN ('vi', 'en') AND "price_la" IN (300, 240, 0))
    OR ("sku" = 'ZIWEI-YEAR-2026-P0' AND "locale" IN ('vi', 'en') AND "price_la" IN (480, 384))
    OR ("sku" = 'ZIWEI-COMBO-2026-P0' AND "locale" IN ('vi', 'en') AND "price_la" IN (1300, 1040))
    OR ("sku" IN ('MEMBERSHIP-MONTHLY-P0', 'MEMBERSHIP-MONTHLY-1500') AND "locale" IN ('vi', 'en') AND "price_la" = 1500)
    OR ("sku" IN ('MEMBERSHIP-YEARLY-P0', 'MEMBERSHIP-YEARLY-8000') AND "locale" IN ('vi', 'en') AND "price_la" = 8000)
    OR ("sku" LIKE 'ZIWEI-PALACE-%' AND "locale" IN ('vi', 'en') AND "price_la" IN (120, 96))
  ) AND "status" IN ('pending', 'completed', 'cancelled', 'expired') AND "state_version" > 0);
--> statement-breakpoint
ALTER TYPE "public"."notification_delivery_kind" ADD VALUE IF NOT EXISTS 'membership_expiry';
