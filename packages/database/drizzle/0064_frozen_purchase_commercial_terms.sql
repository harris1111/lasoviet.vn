-- Legacy rows retain null rather than fabricating historical quote evidence.
ALTER TABLE wallet_purchase_intents ADD COLUMN commercial_terms jsonb;
--> statement-breakpoint
ALTER TABLE wallet_purchase_intents ADD CONSTRAINT wallet_purchase_commercial_terms_bound CHECK (
  commercial_terms IS NULL OR COALESCE((
    jsonb_typeof(commercial_terms) = 'object'
    AND jsonb_typeof(commercial_terms->'version') = 'number'
    AND commercial_terms->>'version' = '1'
    AND commercial_terms->>'policy' = 'pre-fd119'
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
    AND commercial_terms->>'guarantee' = CASE WHEN price_la > 0 AND price_la < 500 THEN 'full' ELSE 'none' END
  ), false)
);
--> statement-breakpoint
CREATE FUNCTION protect_wallet_purchase_commercial_terms() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.commercial_terms IS DISTINCT FROM OLD.commercial_terms THEN
    RAISE EXCEPTION 'Purchase commercial snapshot is immutable';
  END IF;
  IF (
    NEW.owner_id IS DISTINCT FROM OLD.owner_id OR NEW.chart_id IS DISTINCT FROM OLD.chart_id
    OR NEW.chart_version_id IS DISTINCT FROM OLD.chart_version_id OR NEW.sku IS DISTINCT FROM OLD.sku
    OR NEW.locale IS DISTINCT FROM OLD.locale OR NEW.period_key IS DISTINCT FROM OLD.period_key
    OR NEW.price_la IS DISTINCT FROM OLD.price_la OR NEW.created_at IS DISTINCT FROM OLD.created_at
  ) THEN
    RAISE EXCEPTION 'Frozen purchase authority is immutable';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER wallet_purchase_commercial_terms_immutable BEFORE UPDATE ON wallet_purchase_intents
  FOR EACH ROW EXECUTE FUNCTION protect_wallet_purchase_commercial_terms();
