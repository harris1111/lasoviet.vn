ALTER TABLE "wallet_purchase_intents" DROP CONSTRAINT "wallet_purchase_intents_valid";--> statement-breakpoint
ALTER TABLE "wallet_purchase_intents" ADD CONSTRAINT "wallet_purchase_intents_valid" CHECK (
  (
    ("sku" = 'ZIWEI-NATAL-EXCERPT-P0' AND "locale" = 'vi' AND "price_la" = 240)
    OR ("sku" = 'ZIWEI-IDENTITY-P0' AND "locale" IN ('vi', 'en') AND "price_la" >= 0 AND "price_la" <= 960)
    OR ("sku" = 'ZIWEI-RELATIONSHIP-P0' AND "locale" IN ('vi', 'en') AND "price_la" = 480)
    OR ("sku" = 'ZIWEI-CAREER-P0' AND "locale" IN ('vi', 'en') AND "price_la" = 480)
    OR ("sku" = 'ZIWEI-TODAY-P0' AND "locale" IN ('vi', 'en') AND "price_la" = 60)
    OR ("sku" = 'ZIWEI-MONTHLY-P0' AND "locale" IN ('vi', 'en') AND "price_la" = 300)
    OR ("sku" = 'ZIWEI-YEAR-2026-P0' AND "locale" IN ('vi', 'en') AND "price_la" = 480)
    OR ("sku" = 'ZIWEI-COMBO-2026-P0' AND "locale" IN ('vi', 'en') AND "price_la" = 1300)
    OR ("sku" IN ('MEMBERSHIP-MONTHLY-P0', 'MEMBERSHIP-MONTHLY-1500') AND "locale" IN ('vi', 'en') AND "price_la" = 1500)
    OR ("sku" IN ('MEMBERSHIP-YEARLY-P0', 'MEMBERSHIP-YEARLY-8000') AND "locale" IN ('vi', 'en') AND "price_la" = 8000)
    OR (("sku" = 'ZIWEI-PALACE-P0' OR "sku" LIKE 'ZIWEI-PALACE-%') AND "locale" IN ('vi', 'en') AND "price_la" = 120)
  )
  AND "status" IN ('pending', 'completed', 'cancelled', 'expired')
  AND "state_version" > 0
);
