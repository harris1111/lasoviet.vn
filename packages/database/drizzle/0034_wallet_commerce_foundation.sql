CREATE TABLE "wallet_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"purchased_balance" integer DEFAULT 0 NOT NULL,
	"promotional_balance" integer DEFAULT 0 NOT NULL,
	"state_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wallet_accounts_nonnegative_balances" CHECK ("wallet_accounts"."purchased_balance" >= 0 AND "wallet_accounts"."promotional_balance" >= 0 AND "wallet_accounts"."state_version" > 0)
);
--> statement-breakpoint
CREATE TABLE "wallet_command_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_id" uuid NOT NULL,
	"idempotency_key" text NOT NULL,
	"fingerprint" text NOT NULL,
	"transaction_id" uuid NOT NULL,
	"result" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallet_credit_lots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_id" uuid NOT NULL,
	"grant_transaction_id" uuid NOT NULL,
	"bucket" text NOT NULL,
	"granted_la" integer NOT NULL,
	"remaining_la" integer NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	CONSTRAINT "wallet_credit_lots_valid" CHECK ("wallet_credit_lots"."bucket" IN ('purchased', 'promotional') AND "wallet_credit_lots"."granted_la" > 0 AND "wallet_credit_lots"."remaining_la" >= 0 AND "wallet_credit_lots"."remaining_la" <= "wallet_credit_lots"."granted_la" AND "wallet_credit_lots"."expires_at" IS NULL)
);
--> statement-breakpoint
CREATE TABLE "wallet_ledger_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" uuid NOT NULL,
	"bucket" text NOT NULL,
	"amount_la" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wallet_ledger_entries_bucket_valid" CHECK ("wallet_ledger_entries"."bucket" IN ('purchased', 'promotional')),
	CONSTRAINT "wallet_ledger_entries_nonzero" CHECK ("wallet_ledger_entries"."amount_la" <> 0)
);
--> statement-breakpoint
CREATE TABLE "wallet_purchase_intents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"chart_id" text NOT NULL,
	"chart_version_id" text NOT NULL,
	"sku" text NOT NULL,
	"price_la" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"state_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "wallet_purchase_intents_valid" CHECK ((("wallet_purchase_intents"."sku" = 'ZIWEI-NATAL-EXCERPT-P0' AND "wallet_purchase_intents"."price_la" = 240) OR ("wallet_purchase_intents"."sku" = 'ZIWEI-IDENTITY-P0' AND "wallet_purchase_intents"."price_la" IN (720, 960))) AND "wallet_purchase_intents"."status" IN ('pending', 'completed', 'cancelled', 'expired') AND "wallet_purchase_intents"."state_version" > 0)
);
--> statement-breakpoint
CREATE TABLE "wallet_restoration_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restoration_transaction_id" uuid NOT NULL,
	"spend_allocation_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallet_spend_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"spend_transaction_id" uuid NOT NULL,
	"credit_lot_id" uuid NOT NULL,
	"bucket" text NOT NULL,
	"amount_la" integer NOT NULL,
	"purchased_la" integer DEFAULT 0 NOT NULL,
	"recognized_vnd" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "wallet_spend_allocations_amounts_valid" CHECK ("wallet_spend_allocations"."amount_la" > 0 AND "wallet_spend_allocations"."purchased_la" >= 0 AND "wallet_spend_allocations"."recognized_vnd" >= 0 AND (("wallet_spend_allocations"."bucket" = 'promotional' AND "wallet_spend_allocations"."purchased_la" = 0 AND "wallet_spend_allocations"."recognized_vnd" = 0) OR ("wallet_spend_allocations"."bucket" = 'purchased' AND "wallet_spend_allocations"."purchased_la" = "wallet_spend_allocations"."amount_la"))),
	CONSTRAINT "wallet_spend_allocations_bucket_valid" CHECK ("wallet_spend_allocations"."bucket" IN ('purchased', 'promotional'))
);
--> statement-breakpoint
CREATE TABLE "wallet_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"fingerprint" text NOT NULL,
	"purchase_intent_id" uuid,
	"top_up_order_id" uuid,
	"reversal_of_transaction_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wallet_transactions_kind_valid" CHECK ("wallet_transactions"."kind" IN ('grant', 'spend', 'restoration')),
	CONSTRAINT "wallet_transactions_lineage" CHECK (("wallet_transactions"."kind" = 'grant' AND "wallet_transactions"."purchase_intent_id" IS NULL AND "wallet_transactions"."reversal_of_transaction_id" IS NULL) OR ("wallet_transactions"."kind" = 'spend' AND "wallet_transactions"."purchase_intent_id" IS NOT NULL AND "wallet_transactions"."top_up_order_id" IS NULL AND "wallet_transactions"."reversal_of_transaction_id" IS NULL) OR ("wallet_transactions"."kind" = 'restoration' AND "wallet_transactions"."purchase_intent_id" IS NULL AND "wallet_transactions"."top_up_order_id" IS NULL AND "wallet_transactions"."reversal_of_transaction_id" IS NOT NULL))
);
--> statement-breakpoint
DROP INDEX "commerce_orders_chart_sku_unique";--> statement-breakpoint
ALTER TABLE "commerce_entitlements" ALTER COLUMN "order_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "commerce_orders" ALTER COLUMN "chart_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "commerce_orders" ALTER COLUMN "chart_version_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "commerce_entitlements" ADD COLUMN "ledger_spend_id" uuid;--> statement-breakpoint
ALTER TABLE "commerce_orders" ADD COLUMN "kind" text DEFAULT 'content_purchase' NOT NULL;--> statement-breakpoint
ALTER TABLE "wallet_accounts" ADD CONSTRAINT "wallet_accounts_owner_id_auth_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."auth_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_command_receipts" ADD CONSTRAINT "wallet_command_receipts_wallet_id_wallet_accounts_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallet_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_command_receipts" ADD CONSTRAINT "wallet_command_receipts_transaction_id_wallet_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."wallet_transactions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_credit_lots" ADD CONSTRAINT "wallet_credit_lots_wallet_id_wallet_accounts_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallet_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_credit_lots" ADD CONSTRAINT "wallet_credit_lots_grant_transaction_id_wallet_transactions_id_fk" FOREIGN KEY ("grant_transaction_id") REFERENCES "public"."wallet_transactions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_ledger_entries" ADD CONSTRAINT "wallet_ledger_entries_transaction_id_wallet_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."wallet_transactions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_purchase_intents" ADD CONSTRAINT "wallet_purchase_intents_owner_id_auth_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."auth_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_restoration_allocations" ADD CONSTRAINT "wallet_restoration_allocations_restoration_transaction_id_wallet_transactions_id_fk" FOREIGN KEY ("restoration_transaction_id") REFERENCES "public"."wallet_transactions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_restoration_allocations" ADD CONSTRAINT "wallet_restoration_allocations_spend_allocation_id_wallet_spend_allocations_id_fk" FOREIGN KEY ("spend_allocation_id") REFERENCES "public"."wallet_spend_allocations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_spend_allocations" ADD CONSTRAINT "wallet_spend_allocations_spend_transaction_id_wallet_transactions_id_fk" FOREIGN KEY ("spend_transaction_id") REFERENCES "public"."wallet_transactions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_spend_allocations" ADD CONSTRAINT "wallet_spend_allocations_credit_lot_id_wallet_credit_lots_id_fk" FOREIGN KEY ("credit_lot_id") REFERENCES "public"."wallet_credit_lots"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_wallet_id_wallet_accounts_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallet_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_purchase_intent_id_wallet_purchase_intents_id_fk" FOREIGN KEY ("purchase_intent_id") REFERENCES "public"."wallet_purchase_intents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_top_up_order_id_commerce_orders_id_fk" FOREIGN KEY ("top_up_order_id") REFERENCES "public"."commerce_orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_reversal_of_transaction_id_wallet_transactions_id_fk" FOREIGN KEY ("reversal_of_transaction_id") REFERENCES "public"."wallet_transactions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_accounts_owner_unique" ON "wallet_accounts" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_command_receipts_wallet_key_unique" ON "wallet_command_receipts" USING btree ("wallet_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "wallet_credit_lots_fifo_idx" ON "wallet_credit_lots" USING btree ("wallet_id","bucket","granted_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_credit_lots_grant_bucket_unique" ON "wallet_credit_lots" USING btree ("grant_transaction_id","bucket");--> statement-breakpoint
CREATE INDEX "wallet_ledger_entries_transaction_idx" ON "wallet_ledger_entries" USING btree ("transaction_id");--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_ledger_entries_transaction_bucket_unique" ON "wallet_ledger_entries" USING btree ("transaction_id","bucket");--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_purchase_intents_owner_chart_sku_pending_unique" ON "wallet_purchase_intents" USING btree ("owner_id","chart_id","sku") WHERE "wallet_purchase_intents"."status" = 'pending';--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_restoration_allocations_restoration_allocation_unique" ON "wallet_restoration_allocations" USING btree ("restoration_transaction_id","spend_allocation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_restoration_allocations_spend_allocation_unique" ON "wallet_restoration_allocations" USING btree ("spend_allocation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_spend_allocations_spend_lot_unique" ON "wallet_spend_allocations" USING btree ("spend_transaction_id","credit_lot_id");--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_transactions_idempotency_unique" ON "wallet_transactions" USING btree ("wallet_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_transactions_top_up_order_unique" ON "wallet_transactions" USING btree ("top_up_order_id") WHERE "wallet_transactions"."top_up_order_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_transactions_reversal_unique" ON "wallet_transactions" USING btree ("reversal_of_transaction_id");--> statement-breakpoint
ALTER TABLE "commerce_entitlements" ADD CONSTRAINT "commerce_entitlements_ledger_spend_id_wallet_transactions_id_fk" FOREIGN KEY ("ledger_spend_id") REFERENCES "public"."wallet_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "commerce_entitlements_ledger_spend_unique" ON "commerce_entitlements" USING btree ("ledger_spend_id");--> statement-breakpoint
CREATE UNIQUE INDEX "commerce_orders_chart_sku_unique" ON "commerce_orders" USING btree ("chart_id","sku") WHERE "commerce_orders"."status" = 'pending' AND "commerce_orders"."kind" = 'content_purchase';--> statement-breakpoint
ALTER TABLE "commerce_entitlements" ADD CONSTRAINT "commerce_entitlements_authority_xor" CHECK (("commerce_entitlements"."order_id" IS NOT NULL AND "commerce_entitlements"."ledger_spend_id" IS NULL) OR ("commerce_entitlements"."order_id" IS NULL AND "commerce_entitlements"."ledger_spend_id" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "commerce_orders" ADD CONSTRAINT "commerce_orders_kind_valid" CHECK ("commerce_orders"."kind" IN ('content_purchase', 'wallet_topup'));--> statement-breakpoint
ALTER TABLE "commerce_orders" ADD CONSTRAINT "commerce_orders_kind_fields" CHECK (("commerce_orders"."kind" = 'content_purchase' AND "commerce_orders"."chart_id" IS NOT NULL AND "commerce_orders"."chart_version_id" IS NOT NULL) OR ("commerce_orders"."kind" = 'wallet_topup' AND "commerce_orders"."chart_id" IS NULL AND "commerce_orders"."chart_version_id" IS NULL AND (("commerce_orders"."sku" = 'LA-ENTRY-300' AND "commerce_orders"."amount" = 29000 AND "commerce_orders"."currency" = 'VND') OR ("commerce_orders"."sku" = 'LA-START-1100' AND "commerce_orders"."amount" = 99000 AND "commerce_orders"."currency" = 'VND') OR ("commerce_orders"."sku" = 'LA-DISCOVER-3000' AND "commerce_orders"."amount" = 249000 AND "commerce_orders"."currency" = 'VND') OR ("commerce_orders"."sku" = 'LA-LIBRARY-8000' AND "commerce_orders"."amount" = 599000 AND "commerce_orders"."currency" = 'VND'))));
--> statement-breakpoint
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
      FROM wallet_spend_allocations
      WHERE credit_lot_id = NEW.credit_lot_id;
      IF grant_order IS NULL
         OR order_kind <> 'wallet_topup'
         OR prior_purchased_la + NEW.purchased_la > grant_purchased THEN
        RAISE EXCEPTION 'purchased allocation must not exceed its top-up credit lot';
      END IF;
      expected_recognized_vnd :=
        FLOOR(((prior_purchased_la + NEW.purchased_la) * order_amount::numeric) / grant_purchased::numeric)
        - FLOOR((prior_purchased_la * order_amount::numeric) / grant_purchased::numeric);
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
CREATE TRIGGER wallet_accounts_owner_guard BEFORE INSERT OR UPDATE OF owner_id ON wallet_accounts FOR EACH ROW EXECUTE FUNCTION enforce_wallet_relations();
--> statement-breakpoint
CREATE TRIGGER wallet_transactions_relation_guard BEFORE INSERT OR UPDATE ON wallet_transactions FOR EACH ROW EXECUTE FUNCTION enforce_wallet_relations();
--> statement-breakpoint
CREATE TRIGGER wallet_credit_lots_relation_guard BEFORE INSERT OR UPDATE ON wallet_credit_lots FOR EACH ROW EXECUTE FUNCTION enforce_wallet_relations();
--> statement-breakpoint
CREATE TRIGGER wallet_spend_allocations_relation_guard BEFORE INSERT OR UPDATE ON wallet_spend_allocations FOR EACH ROW EXECUTE FUNCTION enforce_wallet_relations();
--> statement-breakpoint
CREATE TRIGGER wallet_restoration_allocations_relation_guard BEFORE INSERT OR UPDATE ON wallet_restoration_allocations FOR EACH ROW EXECUTE FUNCTION enforce_wallet_relations();
--> statement-breakpoint
CREATE TRIGGER wallet_command_receipts_relation_guard BEFORE INSERT OR UPDATE ON wallet_command_receipts FOR EACH ROW EXECUTE FUNCTION enforce_wallet_relations();
--> statement-breakpoint
CREATE TRIGGER commerce_entitlements_ledger_relation_guard BEFORE INSERT OR UPDATE ON commerce_entitlements FOR EACH ROW EXECUTE FUNCTION enforce_wallet_relations();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION enforce_wallet_owner_account_state()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF (NEW.email_verified = false OR NEW.is_anonymous = true)
     AND EXISTS (SELECT 1 FROM wallet_accounts WHERE owner_id = NEW.id) THEN
    RAISE EXCEPTION 'wallet owner must remain verified and non-anonymous';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER auth_users_wallet_owner_state_guard
BEFORE UPDATE OF email_verified, is_anonymous ON auth_users
FOR EACH ROW EXECUTE FUNCTION enforce_wallet_owner_account_state();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_wallet_credit_lot_source_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'wallet credit lots are append-only';
  END IF;
  IF NEW.wallet_id IS DISTINCT FROM OLD.wallet_id
     OR NEW.grant_transaction_id IS DISTINCT FROM OLD.grant_transaction_id
     OR NEW.bucket IS DISTINCT FROM OLD.bucket
     OR NEW.granted_la IS DISTINCT FROM OLD.granted_la
     OR NEW.granted_at IS DISTINCT FROM OLD.granted_at
     OR NEW.expires_at IS DISTINCT FROM OLD.expires_at THEN
    RAISE EXCEPTION 'wallet credit lot source is immutable';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER wallet_credit_lots_source_immutable
BEFORE UPDATE OR DELETE ON wallet_credit_lots
FOR EACH ROW EXECUTE FUNCTION prevent_wallet_credit_lot_source_mutation();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_wallet_immutable_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION '% rows are append-only', TG_TABLE_NAME;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER wallet_transactions_immutable BEFORE UPDATE OR DELETE ON wallet_transactions FOR EACH ROW EXECUTE FUNCTION prevent_wallet_immutable_mutation();
--> statement-breakpoint
CREATE TRIGGER wallet_ledger_entries_immutable BEFORE UPDATE OR DELETE ON wallet_ledger_entries FOR EACH ROW EXECUTE FUNCTION prevent_wallet_immutable_mutation();
--> statement-breakpoint
CREATE TRIGGER wallet_spend_allocations_immutable BEFORE UPDATE OR DELETE ON wallet_spend_allocations FOR EACH ROW EXECUTE FUNCTION prevent_wallet_immutable_mutation();
--> statement-breakpoint
CREATE TRIGGER wallet_restoration_allocations_immutable BEFORE UPDATE OR DELETE ON wallet_restoration_allocations FOR EACH ROW EXECUTE FUNCTION prevent_wallet_immutable_mutation();
--> statement-breakpoint
CREATE TRIGGER wallet_command_receipts_immutable BEFORE UPDATE OR DELETE ON wallet_command_receipts FOR EACH ROW EXECUTE FUNCTION prevent_wallet_immutable_mutation();
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
      FROM wallet_spend_allocations
      WHERE credit_lot_id = purchased_lot_id;
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
  ELSE
    RAISE EXCEPTION 'wallet transaction kind is invalid';
  END IF;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER wallet_transactions_ledger_reconciliation
AFTER INSERT ON wallet_transactions
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION enforce_wallet_ledger_reconciliation();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER wallet_ledger_entries_reconciliation
AFTER INSERT ON wallet_ledger_entries
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION enforce_wallet_ledger_reconciliation();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER wallet_credit_lots_ledger_reconciliation
AFTER INSERT ON wallet_credit_lots
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION enforce_wallet_ledger_reconciliation();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER wallet_spend_allocations_ledger_reconciliation
AFTER INSERT ON wallet_spend_allocations
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION enforce_wallet_ledger_reconciliation();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER wallet_restoration_allocations_ledger_reconciliation
AFTER INSERT ON wallet_restoration_allocations
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION enforce_wallet_ledger_reconciliation();
