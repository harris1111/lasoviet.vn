DROP INDEX IF EXISTS "commerce_entitlements_ledger_spend_unique";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "commerce_entitlements_ledger_spend_sku_unique" ON "commerce_entitlements" ("ledger_spend_id", "sku");
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
    IF intent_row.sku = 'ZIWEI-COMBO-2026-P0' THEN
      IF intent_row.locale <> 'vi' OR intent_row.period_key <> '2026' OR intent_row.price_la NOT IN (1300, 1040)
         OR NOT ((NEW.sku = 'ZIWEI-IDENTITY-P0' AND NEW.period_key = 'lifetime')
           OR (NEW.sku = 'ZIWEI-YEAR-2026-P0' AND NEW.period_key = '2026')) THEN
        RAISE EXCEPTION 'combo entitlement must match a closed 2026 component';
      END IF;
    ELSIF intent_row.sku IS DISTINCT FROM NEW.sku THEN
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
DROP TRIGGER IF EXISTS commerce_entitlements_ledger_relation_guard ON commerce_entitlements;
--> statement-breakpoint
CREATE TRIGGER commerce_entitlements_ledger_relation_guard BEFORE INSERT OR UPDATE ON commerce_entitlements FOR EACH ROW EXECUTE FUNCTION enforce_commerce_entitlement_purchase_authority();
