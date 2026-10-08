-- Additive annual products; historical 2026 receipts remain unchanged.
ALTER TABLE "wallet_purchase_intents" DROP CONSTRAINT IF EXISTS "wallet_purchase_intents_valid";
--> statement-breakpoint
ALTER TABLE "wallet_purchase_intents" ADD CONSTRAINT "wallet_purchase_intents_valid" CHECK ((
    ("sku" = 'ZIWEI-NATAL-EXCERPT-P0' AND "locale" = 'vi' AND "price_la" IN (240, 192))
    OR ("sku" = 'ZIWEI-IDENTITY-P0' AND "locale" IN ('vi', 'en') AND "price_la" >= 0 AND "price_la" <= 960)
    OR ("sku" = 'ZIWEI-RELATIONSHIP-P0' AND "locale" IN ('vi', 'en') AND "price_la" IN (480, 384))
    OR ("sku" = 'ZIWEI-CAREER-P0' AND "locale" IN ('vi', 'en') AND "price_la" IN (480, 384))
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
CREATE OR REPLACE FUNCTION enforce_commerce_entitlement_purchase_authority()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE intent_row wallet_purchase_intents%ROWTYPE;
DECLARE spend_row wallet_transactions%ROWTYPE;
DECLARE order_row commerce_orders%ROWTYPE;
BEGIN
  IF NEW.ledger_spend_id IS NOT NULL THEN
    SELECT * INTO spend_row FROM wallet_transactions WHERE id = NEW.ledger_spend_id;
    SELECT * INTO intent_row FROM wallet_purchase_intents WHERE id = spend_row.purchase_intent_id;
    IF spend_row.kind IS DISTINCT FROM 'spend' OR intent_row.owner_id IS DISTINCT FROM NEW.owner_id
       OR intent_row.chart_id IS DISTINCT FROM NEW.chart_id
       OR NOT EXISTS (SELECT 1 FROM wallet_accounts WHERE id = spend_row.wallet_id AND owner_id = NEW.owner_id) THEN
      RAISE EXCEPTION 'ledger entitlement must match its wallet spend intent and owner';
    END IF;
    IF intent_row.sku IN ('ZIWEI-COMBO-P0', 'ZIWEI-COMBO-2026-P0') THEN
      IF intent_row.locale <> 'vi' OR intent_row.period_key !~ '^(19[0-9]{2}|20[0-9]{2}|2100)$'
         OR (intent_row.sku = 'ZIWEI-COMBO-2026-P0' AND intent_row.period_key <> '2026') OR intent_row.price_la NOT IN (1300, 1040)
         OR NOT ((NEW.sku = 'ZIWEI-IDENTITY-P0' AND NEW.period_key = 'lifetime')
           OR (NEW.sku = CASE WHEN intent_row.sku = 'ZIWEI-COMBO-2026-P0' THEN 'ZIWEI-YEAR-2026-P0' ELSE 'ZIWEI-YEAR-P0' END AND NEW.period_key = intent_row.period_key)) THEN
        RAISE EXCEPTION 'combo entitlement must match a closed matching-year component';
      END IF;
    ELSIF intent_row.sku IS DISTINCT FROM NEW.sku OR (intent_row.sku = 'ZIWEI-YEAR-P0' AND intent_row.period_key IS DISTINCT FROM NEW.period_key) THEN
      RAISE EXCEPTION 'ledger entitlement SKU must match its intent';
    END IF;
  ELSE
    SELECT * INTO order_row FROM commerce_orders WHERE id = NEW.order_id;
    IF order_row.kind IS DISTINCT FROM 'content_purchase' OR order_row.owner_id IS DISTINCT FROM NEW.owner_id
       OR order_row.chart_id IS DISTINCT FROM NEW.chart_id OR order_row.sku IS DISTINCT FROM NEW.sku THEN
      RAISE EXCEPTION 'order entitlement must match its content purchase order and owner';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

--> statement-breakpoint
ALTER TABLE "report_reservations" DROP CONSTRAINT "report_reservations_target_year_matches_as_of_date";
--> statement-breakpoint
ALTER TABLE "report_reservations" ADD CONSTRAINT "report_reservations_target_year_matches_as_of_date" CHECK (
  as_of_date IS NULL OR
  (timing_rule_version = 'ziwei.timing.lunar-year.v2' AND target_year BETWEEN CAST(EXTRACT(YEAR FROM as_of_date) AS integer) - 1 AND CAST(EXTRACT(YEAR FROM as_of_date) AS integer) + 1) OR
  (timing_rule_version <> 'ziwei.timing.lunar-year.v2' AND target_year = CAST(EXTRACT(YEAR FROM as_of_date) AS integer)));
--> statement-breakpoint
ALTER TABLE "report_source_snapshots" DROP CONSTRAINT "report_source_snapshots_target_year_matches_as_of_date";
--> statement-breakpoint
ALTER TABLE "report_source_snapshots" ADD CONSTRAINT "report_source_snapshots_target_year_matches_as_of_date" CHECK (
  (timing_rule_version = 'ziwei.timing.lunar-year.v2' AND target_year BETWEEN CAST(EXTRACT(YEAR FROM as_of_date) AS integer) - 1 AND CAST(EXTRACT(YEAR FROM as_of_date) AS integer) + 1) OR
  (timing_rule_version <> 'ziwei.timing.lunar-year.v2' AND target_year = CAST(EXTRACT(YEAR FROM as_of_date) AS integer)));
--> statement-breakpoint
CREATE OR REPLACE FUNCTION enforce_annual_reservation_period()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE entitlement_row commerce_entitlements%ROWTYPE;
BEGIN
  IF NEW.sku = 'ZIWEI-YEAR-P0' THEN
    SELECT * INTO entitlement_row FROM commerce_entitlements WHERE id = NEW.entitlement_id;
    IF entitlement_row.sku IS DISTINCT FROM NEW.sku OR entitlement_row.period_key IS DISTINCT FROM NEW.target_year::text THEN
      RAISE EXCEPTION 'annual reservation must match its frozen entitlement year';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS report_reservations_annual_period_guard ON report_reservations;
--> statement-breakpoint
CREATE TRIGGER report_reservations_annual_period_guard BEFORE INSERT OR UPDATE ON report_reservations FOR EACH ROW EXECUTE FUNCTION enforce_annual_reservation_period();
