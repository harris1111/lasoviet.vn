CREATE OR REPLACE FUNCTION enforce_wallet_relations()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  transaction_wallet uuid;
  restoration_wallet uuid;
  transaction_kind text;
  lot_wallet uuid;
  lot_bucket text;
  spend_wallet uuid;
  spend_kind text;
  grant_order uuid;
  grant_purchased integer;
  order_amount integer;
  order_kind text;
  order_owner text;
  order_status text;
  intent_owner text;
  intent_chart text;
  intent_sku text;
  order_chart text;
  order_sku text;
  prior_purchased_la numeric;
  prior_recognized_vnd numeric;
  expected_recognized_vnd numeric;
BEGIN
  IF TG_TABLE_NAME = 'wallet_accounts' THEN
    IF TG_OP = 'UPDATE' AND NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
      RAISE EXCEPTION 'wallet owner is immutable';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM auth_users
      WHERE id = NEW.owner_id AND email_verified = true AND is_anonymous = false
    ) THEN
      RAISE EXCEPTION 'wallet owner must be verified and non-anonymous';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'wallet_transactions' THEN
    SELECT wallet_id, kind INTO transaction_wallet, transaction_kind
    FROM wallet_transactions WHERE id = NEW.reversal_of_transaction_id;
    IF NEW.kind = 'restoration' AND (
      transaction_kind IS DISTINCT FROM 'spend'
      OR transaction_wallet IS DISTINCT FROM NEW.wallet_id
    ) THEN
      RAISE EXCEPTION 'restoration must target a spend in the same wallet';
    END IF;
    IF NEW.kind = 'spend' THEN
      SELECT owner_id INTO intent_owner FROM wallet_purchase_intents WHERE id = NEW.purchase_intent_id;
      IF intent_owner IS NULL OR intent_owner <> (SELECT owner_id FROM wallet_accounts WHERE id = NEW.wallet_id) THEN
        RAISE EXCEPTION 'spend intent must belong to the wallet owner';
      END IF;
    END IF;
    IF NEW.top_up_order_id IS NOT NULL THEN
      SELECT kind, owner_id, status INTO order_kind, order_owner, order_status
      FROM commerce_orders WHERE id = NEW.top_up_order_id;
      IF NEW.kind <> 'grant'
         OR order_kind <> 'wallet_topup'
         OR order_status <> 'paid'
         OR order_owner <> (SELECT owner_id FROM wallet_accounts WHERE id = NEW.wallet_id) THEN
        RAISE EXCEPTION 'top-up grant must belong to its paid wallet-topup order owner';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'wallet_credit_lots' THEN
    SELECT wallet_id, kind, top_up_order_id INTO transaction_wallet, transaction_kind, grant_order
    FROM wallet_transactions WHERE id = NEW.grant_transaction_id;
    IF transaction_kind <> 'grant' OR transaction_wallet <> NEW.wallet_id THEN
      RAISE EXCEPTION 'credit lot must belong to a grant in the same wallet';
    END IF;
    IF NEW.bucket = 'purchased' AND grant_order IS NULL THEN
      RAISE EXCEPTION 'purchased credit lot requires a wallet-topup grant lineage';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'wallet_spend_allocations' THEN
    SELECT wallet_id, kind INTO spend_wallet, spend_kind FROM wallet_transactions WHERE id = NEW.spend_transaction_id;
    SELECT wallet_id, bucket, grant_transaction_id INTO lot_wallet, lot_bucket, transaction_wallet FROM wallet_credit_lots WHERE id = NEW.credit_lot_id;
    IF spend_kind <> 'spend' OR spend_wallet <> lot_wallet OR lot_bucket <> NEW.bucket THEN
      RAISE EXCEPTION 'spend allocation must use a same-wallet lot with a matching bucket';
    END IF;
    IF NEW.bucket = 'purchased' THEN
      SELECT top_up_order_id INTO grant_order FROM wallet_transactions WHERE id = transaction_wallet;
      SELECT amount, kind INTO order_amount, order_kind FROM commerce_orders WHERE id = grant_order;
      SELECT granted_la INTO grant_purchased FROM wallet_credit_lots WHERE id = NEW.credit_lot_id;
      SELECT
        COALESCE(SUM(purchased_la), 0),
        COALESCE(SUM(recognized_vnd), 0)
      INTO prior_purchased_la, prior_recognized_vnd
      FROM wallet_spend_allocations allocation
      WHERE allocation.credit_lot_id = NEW.credit_lot_id
        AND NOT EXISTS (
          SELECT 1
          FROM wallet_restoration_allocations restoration
          WHERE restoration.spend_allocation_id = allocation.id
        );
      IF grant_order IS NULL
         OR order_kind <> 'wallet_topup'
         OR prior_purchased_la + NEW.purchased_la > grant_purchased THEN
        RAISE EXCEPTION 'purchased allocation must not exceed its top-up credit lot';
      END IF;
      expected_recognized_vnd :=
        FLOOR(((prior_purchased_la + NEW.purchased_la) * order_amount::numeric) / grant_purchased::numeric)
        - prior_recognized_vnd;
      IF NEW.recognized_vnd <> expected_recognized_vnd
         OR prior_recognized_vnd + NEW.recognized_vnd > order_amount THEN
        RAISE EXCEPTION 'purchased allocation revenue must use the cumulative top-up recognition delta';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'wallet_restoration_allocations' THEN
    SELECT wallet_id, kind INTO restoration_wallet, transaction_kind FROM wallet_transactions WHERE id = NEW.restoration_transaction_id;
    SELECT wt.wallet_id, wt.kind INTO spend_wallet, spend_kind
    FROM wallet_spend_allocations allocation
    JOIN wallet_transactions wt ON wt.id = allocation.spend_transaction_id
    WHERE allocation.id = NEW.spend_allocation_id;
    IF transaction_kind <> 'restoration' OR spend_kind <> 'spend' OR restoration_wallet <> spend_wallet
       OR NOT EXISTS (SELECT 1 FROM wallet_transactions WHERE id = NEW.restoration_transaction_id AND reversal_of_transaction_id = (SELECT spend_transaction_id FROM wallet_spend_allocations WHERE id = NEW.spend_allocation_id)) THEN
      RAISE EXCEPTION 'restoration allocation must restore one allocation from its reversed same-wallet spend';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'wallet_command_receipts' THEN
    SELECT wallet_id, idempotency_key, fingerprint INTO transaction_wallet, intent_chart, intent_sku
    FROM wallet_transactions WHERE id = NEW.transaction_id;
    IF transaction_wallet <> NEW.wallet_id OR intent_chart <> NEW.idempotency_key OR intent_sku <> NEW.fingerprint THEN
      RAISE EXCEPTION 'receipt must match transaction wallet, idempotency key, and fingerprint';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'commerce_entitlements' THEN
    IF NEW.ledger_spend_id IS NOT NULL THEN
      SELECT wallet_id, kind, purchase_intent_id INTO transaction_wallet, transaction_kind, grant_order
      FROM wallet_transactions WHERE id = NEW.ledger_spend_id;
      SELECT owner_id, chart_id, sku INTO intent_owner, intent_chart, intent_sku
      FROM wallet_purchase_intents WHERE id = grant_order;
      IF transaction_kind <> 'spend' OR intent_owner <> NEW.owner_id OR intent_chart <> NEW.chart_id OR intent_sku <> NEW.sku
         OR NOT EXISTS (SELECT 1 FROM wallet_accounts WHERE id = transaction_wallet AND owner_id = NEW.owner_id) THEN
        RAISE EXCEPTION 'ledger entitlement must match its wallet spend intent and owner';
      END IF;
    ELSE
      SELECT kind, owner_id, chart_id, sku INTO order_kind, order_owner, order_chart, order_sku
      FROM commerce_orders WHERE id = NEW.order_id;
      IF order_kind <> 'content_purchase' OR order_owner <> NEW.owner_id
         OR order_chart <> NEW.chart_id OR order_sku <> NEW.sku THEN
        RAISE EXCEPTION 'order entitlement must match its content purchase order and owner';
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;
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
    IF NOT EXISTS (SELECT 1 FROM wallet_spend_allocations WHERE spend_transaction_id = subject_transaction_id) THEN
      RAISE EXCEPTION 'spend transaction requires spend allocations';
    END IF;
    SELECT intent.price_la INTO intent_price
    FROM wallet_transactions transaction
    JOIN wallet_purchase_intents intent ON intent.id = transaction.purchase_intent_id
    WHERE transaction.id = subject_transaction_id;
    IF intent_price IS NULL OR (
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
         OR total_recognized_vnd > lot_order_amount
      THEN
        RAISE EXCEPTION 'restored purchased lot must remain within top-up grant and order bounds';
      END IF;
    END LOOP;
  ELSE
    RAISE EXCEPTION 'wallet transaction kind is invalid';
  END IF;
  RETURN NULL;
END;
$$;
