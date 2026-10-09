-- Closed reserved Business & Enterprise topic support; no historical rewrite or sale activation.
-- Newly introduced business intents require their actual FD119 frozen promise.
ALTER TABLE "wallet_purchase_intents" DROP CONSTRAINT IF EXISTS "wallet_purchase_intents_valid";
--> statement-breakpoint
ALTER TABLE "wallet_purchase_intents" ADD CONSTRAINT "wallet_purchase_intents_valid" CHECK ((
    ("sku" = 'ZIWEI-NATAL-EXCERPT-P0' AND "locale" = 'vi' AND "price_la" IN (240, 192))
    OR ("sku" = 'ZIWEI-IDENTITY-P0' AND "locale" IN ('vi', 'en') AND "price_la" >= 0 AND "price_la" <= 1200)
    OR ("sku" = 'ZIWEI-RELATIONSHIP-P0' AND "locale" IN ('vi', 'en') AND "price_la" IN (480, 384))
    OR ("sku" = 'ZIWEI-CAREER-P0' AND "locale" IN ('vi', 'en') AND "price_la" IN (480, 384))
    OR ("sku" = 'ZIWEI-BUSINESS-P0' AND "locale" = 'vi' AND "price_la" IN (480, 384)
      AND "period_key" = 'lifetime' AND "commercial_terms" IS NOT NULL
      AND "commercial_terms"->>'version' = '2' AND "commercial_terms"->>'policy' = 'fd119')
    OR ("sku" = 'ZIWEI-TODAY-P0' AND "locale" IN ('vi', 'en') AND "price_la" = 60)
    OR ("sku" = 'ZIWEI-MONTHLY-P0' AND "locale" IN ('vi', 'en') AND "price_la" IN (300, 240, 0))
    OR ("sku" = 'ZIWEI-YEAR-P0' AND "locale" IN ('vi', 'en') AND "price_la" IN (480, 384) AND "period_key" ~ '^(19[0-9]{2}|20[0-9]{2}|2100)$')
    OR ("sku" = 'ZIWEI-COMBO-P0' AND "locale" IN ('vi', 'en') AND "price_la" IN (1300, 1040) AND "period_key" ~ '^(19[0-9]{2}|20[0-9]{2}|2100)$')
    OR ("sku" = 'ZIWEI-YEAR-2026-P0' AND "locale" IN ('vi', 'en') AND "price_la" IN (480, 384))
    OR ("sku" = 'ZIWEI-COMBO-2026-P0' AND "locale" IN ('vi', 'en') AND "price_la" IN (1300, 1040))
    OR ("sku" IN ('MEMBERSHIP-MONTHLY-P0', 'MEMBERSHIP-MONTHLY-1500') AND "locale" IN ('vi', 'en') AND "price_la" = 1500)
    OR ("sku" IN ('MEMBERSHIP-YEARLY-P0', 'MEMBERSHIP-YEARLY-8000') AND "locale" IN ('vi', 'en') AND "price_la" = 8000)
    OR ("sku" LIKE 'ZIWEI-PALACE-%' AND "locale" IN ('vi', 'en') AND "price_la" IN (120, 96))
  ) AND "status" IN ('pending', 'completed', 'cancelled', 'expired') AND "state_version" > 0);

--> statement-breakpoint
ALTER TABLE wallet_purchase_intents DROP CONSTRAINT wallet_purchase_commercial_terms_bound;
--> statement-breakpoint
ALTER TABLE wallet_purchase_intents ADD CONSTRAINT wallet_purchase_commercial_terms_bound CHECK (
  commercial_terms IS NULL OR COALESCE((
    jsonb_typeof(commercial_terms) = 'object'
    AND jsonb_typeof(commercial_terms->'version') = 'number'
    AND ((commercial_terms->>'version' = '1' AND commercial_terms->>'policy' = 'pre-fd119')
      OR (commercial_terms->>'version' = '2' AND commercial_terms->>'policy' = 'fd119'))
    AND commercial_terms->>'ownerId' = owner_id
    AND commercial_terms->>'chartId' = chart_id
    AND commercial_terms->>'chartVersionId' = chart_version_id
    AND commercial_terms->>'sku' = sku
    AND commercial_terms->>'locale' = locale
    AND commercial_terms->>'periodKey' = period_key
    AND (commercial_terms->>'createdAt')::timestamptz = created_at
    AND jsonb_typeof(commercial_terms->'chargedLa') = 'number'
    AND jsonb_typeof(commercial_terms->'basePriceLa') = 'number'
    AND jsonb_typeof(commercial_terms->'creditLa') = 'number'
    AND jsonb_typeof(commercial_terms->'discountLa') = 'number'
    AND commercial_terms->>'discountBasis' IN ('none', 'membership', 'rollover', 'monthly_grant')
    AND (commercial_terms->>'chargedLa') ~ '^[0-9]+$'
    AND (commercial_terms->>'basePriceLa') ~ '^[1-9][0-9]*$'
    AND (commercial_terms->>'creditLa') ~ '^[0-9]+$'
    AND (commercial_terms->>'discountLa') ~ '^[0-9]+$'
    AND (commercial_terms->>'chargedLa')::numeric = price_la
    AND (commercial_terms->>'basePriceLa')::numeric = price_la
      + (commercial_terms->>'creditLa')::numeric + (commercial_terms->>'discountLa')::numeric
    AND commercial_terms->>'guarantee' = CASE WHEN price_la = 0 THEN 'none' WHEN price_la < 500 THEN 'full'
      WHEN commercial_terms->>'policy' = 'fd119' THEN 'half' ELSE 'none' END
    AND (commercial_terms->>'guarantee' <> 'half' OR price_la % 2 = 0)
    AND (commercial_terms->>'basePriceLa')::numeric = CASE
      WHEN sku = 'ZIWEI-IDENTITY-P0' THEN CASE WHEN commercial_terms->>'version' = '1' THEN 960 ELSE 1200 END
      WHEN sku = 'ZIWEI-BUSINESS-P0' THEN 480
      WHEN sku = 'ZIWEI-NATAL-EXCERPT-P0' THEN 240
      WHEN sku LIKE 'ZIWEI-PALACE-%' THEN 120
      WHEN sku IN ('ZIWEI-RELATIONSHIP-P0', 'ZIWEI-CAREER-P0', 'ZIWEI-YEAR-P0', 'ZIWEI-YEAR-2026-P0') THEN 480
      WHEN sku = 'ZIWEI-TODAY-P0' THEN 60 WHEN sku = 'ZIWEI-MONTHLY-P0' THEN 300
      WHEN sku IN ('ZIWEI-COMBO-P0', 'ZIWEI-COMBO-2026-P0') THEN 1300
      WHEN sku IN ('MEMBERSHIP-MONTHLY-P0', 'MEMBERSHIP-MONTHLY-1500') THEN 1500
      WHEN sku IN ('MEMBERSHIP-YEARLY-P0', 'MEMBERSHIP-YEARLY-8000') THEN 8000 ELSE -1 END
    AND ((commercial_terms->>'creditLa')::numeric = 0 AND NOT commercial_terms ? 'creditProof'
      OR sku = 'ZIWEI-IDENTITY-P0' AND (commercial_terms->>'creditLa')::numeric > 0
        AND commercial_terms->'creditProof'->>'version' = commercial_terms->>'version'
        AND (commercial_terms->'creditProof'->>'creditLa')::numeric = (commercial_terms->>'creditLa')::numeric
        AND (commercial_terms->>'creditLa')::numeric <= (commercial_terms->>'basePriceLa')::numeric
        AND commercial_terms->>'discountBasis' = 'rollover'
        AND (commercial_terms->>'discountLa')::numeric = 0
        AND (commercial_terms->>'creditExpiresAt')::timestamptz > created_at)
  ), false)
);
