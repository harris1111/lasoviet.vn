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
    OR ("sku" LIKE 'ZIWEI-PALACE-%' AND "locale" IN ('vi', 'en') AND "price_la" = 120)
  )
  AND "status" IN ('pending', 'completed', 'cancelled', 'expired')
  AND "state_version" > 0
);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION enforce_wallet_ledger_reconciliation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  subject_transaction_id uuid;
  transaction_kind text;
  expected_amount integer;
  actual_amount integer;
  ledger_bucket text;
  grant_order uuid;
  order_sku text;
  order_kind text;
  order_status text;
  expected_purchased integer;
  expected_promotional integer;
  actual_purchased integer;
  actual_promotional integer;
  intent_price integer;
  reversed_spend_transaction_id uuid;
  purchased_lot_id uuid;
  lot_granted_la integer;
  lot_order_amount integer;
  total_purchased_la numeric;
  total_recognized_vnd numeric;
  expected_recognized_vnd numeric;
BEGIN
  IF TG_TABLE_NAME = 'wallet_transactions' THEN
    subject_transaction_id := NEW.id;
  ELSIF TG_TABLE_NAME = 'wallet_ledger_entries' THEN
    subject_transaction_id := NEW.transaction_id;
  ELSIF TG_TABLE_NAME = 'wallet_credit_lots' THEN
    subject_transaction_id := NEW.grant_transaction_id;
  ELSIF TG_TABLE_NAME = 'wallet_spend_allocations' THEN
    subject_transaction_id := NEW.spend_transaction_id;
  ELSE
    subject_transaction_id := NEW.restoration_transaction_id;
  END IF;

  SELECT kind INTO transaction_kind
  FROM wallet_transactions
  WHERE id = subject_transaction_id;
  IF transaction_kind IS NULL THEN
    RETURN NULL;
  END IF;

  IF transaction_kind = 'grant' THEN
    IF NOT EXISTS (SELECT 1 FROM wallet_credit_lots WHERE grant_transaction_id = subject_transaction_id) THEN
      RAISE EXCEPTION 'grant transaction requires credit lots';
    END IF;
    FOR ledger_bucket IN
      SELECT bucket FROM wallet_ledger_entries WHERE transaction_id = subject_transaction_id
      UNION
      SELECT bucket FROM wallet_credit_lots WHERE grant_transaction_id = subject_transaction_id
    LOOP
      SELECT COALESCE(SUM(granted_la), 0) INTO expected_amount
      FROM wallet_credit_lots
      WHERE grant_transaction_id = subject_transaction_id AND bucket = ledger_bucket;
      SELECT amount_la INTO actual_amount
      FROM wallet_ledger_entries
      WHERE transaction_id = subject_transaction_id AND bucket = ledger_bucket;
      IF expected_amount <= 0 OR actual_amount IS NULL OR actual_amount <> expected_amount THEN
        RAISE EXCEPTION 'grant ledger entry must equal granted credit lots';
      END IF;
    END LOOP;
    SELECT top_up_order_id INTO grant_order
    FROM wallet_transactions
    WHERE id = subject_transaction_id;
    IF grant_order IS NOT NULL THEN
      SELECT sku, kind, status INTO order_sku, order_kind, order_status
      FROM commerce_orders
      WHERE id = grant_order;
      IF order_kind <> 'wallet_topup' OR order_status <> 'paid' THEN
        RAISE EXCEPTION 'top-up grant must reference a paid wallet-topup order';
      END IF;
      SELECT
        COALESCE(SUM(granted_la) FILTER (WHERE bucket = 'purchased'), 0),
        COALESCE(SUM(granted_la) FILTER (WHERE bucket = 'promotional'), 0)
      INTO actual_purchased, actual_promotional
      FROM wallet_credit_lots
      WHERE grant_transaction_id = subject_transaction_id;
      CASE order_sku
        WHEN 'LA-ENTRY-300' THEN
          expected_purchased := 300;
          expected_promotional := 0;
        WHEN 'LA-START-1100' THEN
          expected_purchased := 1000;
          expected_promotional := 100;
        WHEN 'LA-DISCOVER-3000' THEN
          expected_purchased := 2500;
          expected_promotional := 500;
        WHEN 'LA-LIBRARY-8000' THEN
          expected_purchased := 6000;
          expected_promotional := 2000;
        ELSE
          RAISE EXCEPTION 'top-up grant must use an approved pack';
      END CASE;
      IF actual_purchased <> expected_purchased
         OR actual_promotional <> expected_promotional THEN
        RAISE EXCEPTION 'top-up grant lots must match the approved pack';
      END IF;
    END IF;
  ELSIF transaction_kind = 'spend' THEN
    SELECT intent.price_la INTO intent_price
    FROM wallet_transactions transaction
    JOIN wallet_purchase_intents intent ON intent.id = transaction.purchase_intent_id
    WHERE transaction.id = subject_transaction_id;
    IF intent_price IS NULL THEN
      RAISE EXCEPTION 'spend transaction requires purchase intent';
    END IF;
    IF intent_price > 0 THEN
      IF NOT EXISTS (SELECT 1 FROM wallet_spend_allocations WHERE spend_transaction_id = subject_transaction_id) THEN
        RAISE EXCEPTION 'spend transaction requires spend allocations';
      END IF;
      IF (
        SELECT COALESCE(SUM(amount_la), 0)
        FROM wallet_spend_allocations
        WHERE spend_transaction_id = subject_transaction_id
      ) <> intent_price THEN
        RAISE EXCEPTION 'spend allocations must equal the immutable purchase intent price';
      END IF;
      FOR ledger_bucket IN
        SELECT bucket FROM wallet_ledger_entries WHERE transaction_id = subject_transaction_id
        UNION
        SELECT bucket FROM wallet_spend_allocations WHERE spend_transaction_id = subject_transaction_id
      LOOP
        SELECT COALESCE(SUM(amount_la), 0) INTO expected_amount
        FROM wallet_spend_allocations
        WHERE spend_transaction_id = subject_transaction_id AND bucket = ledger_bucket;
        SELECT amount_la INTO actual_amount
        FROM wallet_ledger_entries
        WHERE transaction_id = subject_transaction_id AND bucket = ledger_bucket;
        IF expected_amount <= 0 OR actual_amount IS NULL OR actual_amount <> -expected_amount THEN
          RAISE EXCEPTION 'spend ledger entry must equal spend allocations';
        END IF;
      END LOOP;
      FOR purchased_lot_id IN
        SELECT DISTINCT credit_lot_id
        FROM wallet_spend_allocations
        WHERE spend_transaction_id = subject_transaction_id
          AND bucket = 'purchased'
      LOOP
        SELECT lot.granted_la, orders.amount
        INTO lot_granted_la, lot_order_amount
        FROM wallet_credit_lots lot
        JOIN wallet_transactions grant_transaction ON grant_transaction.id = lot.grant_transaction_id
        JOIN commerce_orders orders ON orders.id = grant_transaction.top_up_order_id
        WHERE lot.id = purchased_lot_id
          AND lot.bucket = 'purchased'
          AND grant_transaction.kind = 'grant'
          AND orders.kind = 'wallet_topup'
          AND orders.status = 'paid';
        SELECT
          COALESCE(SUM(purchased_la), 0),
          COALESCE(SUM(recognized_vnd), 0)
        INTO total_purchased_la, total_recognized_vnd
        FROM wallet_spend_allocations allocation
        WHERE allocation.credit_lot_id = purchased_lot_id
          AND NOT EXISTS (
            SELECT 1
            FROM wallet_restoration_allocations restoration
            WHERE restoration.spend_allocation_id = allocation.id
          );
        expected_recognized_vnd :=
          FLOOR((total_purchased_la * lot_order_amount::numeric) / lot_granted_la::numeric);
        IF lot_granted_la IS NULL
           OR lot_order_amount IS NULL
           OR total_purchased_la > lot_granted_la
           OR total_recognized_vnd > lot_order_amount
           OR total_recognized_vnd <> expected_recognized_vnd THEN
          RAISE EXCEPTION 'purchased lot revenue must reconcile to cumulative top-up consumption';
        END IF;
      END LOOP;
    ELSE
      -- Zero-price spend (e.g. 100% rollover credit) must have no spend allocations and no ledger entries
      IF EXISTS (SELECT 1 FROM wallet_spend_allocations WHERE spend_transaction_id = subject_transaction_id) THEN
        RAISE EXCEPTION 'zero-price spend must not have spend allocations';
      END IF;
      IF EXISTS (SELECT 1 FROM wallet_ledger_entries WHERE transaction_id = subject_transaction_id) THEN
        RAISE EXCEPTION 'zero-price spend must not have ledger entries';
      END IF;
    END IF;
  ELSIF transaction_kind = 'restoration' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM wallet_restoration_allocations
      WHERE restoration_transaction_id = subject_transaction_id
    ) THEN
      RAISE EXCEPTION 'restoration transaction requires restoration allocations';
    END IF;
    SELECT reversal_of_transaction_id INTO reversed_spend_transaction_id
    FROM wallet_transactions
    WHERE id = subject_transaction_id;
    IF EXISTS (
      SELECT allocation.id
      FROM wallet_spend_allocations allocation
      WHERE allocation.spend_transaction_id = reversed_spend_transaction_id
      EXCEPT
      SELECT restoration.spend_allocation_id
      FROM wallet_restoration_allocations restoration
      WHERE restoration.restoration_transaction_id = subject_transaction_id
    ) THEN
      RAISE EXCEPTION 'restoration must restore every allocation from its reversed spend';
    END IF;
    FOR ledger_bucket IN
      SELECT bucket FROM wallet_ledger_entries WHERE transaction_id = subject_transaction_id
      UNION
      SELECT allocation.bucket
      FROM wallet_restoration_allocations restoration
      JOIN wallet_spend_allocations allocation ON allocation.id = restoration.spend_allocation_id
      WHERE restoration.restoration_transaction_id = subject_transaction_id
    LOOP
      SELECT COALESCE(SUM(allocation.amount_la), 0) INTO expected_amount
      FROM wallet_restoration_allocations restoration
      JOIN wallet_spend_allocations allocation ON allocation.id = restoration.spend_allocation_id
      WHERE restoration.restoration_transaction_id = subject_transaction_id
        AND allocation.bucket = ledger_bucket;
      SELECT amount_la INTO actual_amount
      FROM wallet_ledger_entries
      WHERE transaction_id = subject_transaction_id AND bucket = ledger_bucket;
      IF expected_amount <= 0 OR actual_amount IS NULL OR actual_amount <> expected_amount THEN
        RAISE EXCEPTION 'restoration ledger entry must equal restored spend allocations';
      END IF;
    END LOOP;
    FOR purchased_lot_id IN
      SELECT DISTINCT allocation.credit_lot_id
      FROM wallet_restoration_allocations restoration
      JOIN wallet_spend_allocations allocation ON allocation.id = restoration.spend_allocation_id
      WHERE restoration.restoration_transaction_id = subject_transaction_id
        AND allocation.bucket = 'purchased'
    LOOP
      SELECT lot.granted_la, orders.amount
      INTO lot_granted_la, lot_order_amount
      FROM wallet_credit_lots lot
      JOIN wallet_transactions grant_transaction ON grant_transaction.id = lot.grant_transaction_id
      JOIN commerce_orders orders ON orders.id = grant_transaction.top_up_order_id
      WHERE lot.id = purchased_lot_id
        AND lot.bucket = 'purchased'
        AND grant_transaction.kind = 'grant'
        AND orders.kind = 'wallet_topup'
        AND orders.status = 'paid';
      SELECT
        COALESCE(SUM(allocation.purchased_la), 0),
        COALESCE(SUM(allocation.recognized_vnd), 0)
      INTO total_purchased_la, total_recognized_vnd
      FROM wallet_spend_allocations allocation
      WHERE allocation.credit_lot_id = purchased_lot_id
        AND NOT EXISTS (
          SELECT 1
          FROM wallet_restoration_allocations restoration
          WHERE restoration.spend_allocation_id = allocation.id
        );
      IF lot_granted_la IS NULL
         OR lot_order_amount IS NULL
         OR lot_granted_la <= 0
         OR lot_order_amount < 0
         OR total_purchased_la < 0
         OR total_purchased_la > lot_granted_la
         OR total_recognized_vnd < 0
         OR total_recognized_vnd > lot_order_amount THEN
        RAISE EXCEPTION 'restoration revenue balance invariant violated';
      END IF;
    END LOOP;
  ELSE
    RAISE EXCEPTION 'unsupported transaction kind for ledger reconciliation: %', transaction_kind;
  END IF;

  RETURN NULL;
END;
$$;
