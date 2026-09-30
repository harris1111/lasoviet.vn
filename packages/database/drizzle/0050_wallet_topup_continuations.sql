CREATE TABLE IF NOT EXISTS wallet_topup_continuations (
  order_id uuid PRIMARY KEY REFERENCES commerce_orders(id),
  owner_id text NOT NULL REFERENCES auth_users(id),
  purchase_intent_id uuid NOT NULL REFERENCES wallet_purchase_intents(id),
  intent_state_version integer NOT NULL,
  confirmed_price_la integer NOT NULL,
  return_tab text NOT NULL,
  return_open text,
  status text NOT NULL DEFAULT 'pending',
  report_id text,
  remaining_la integer,
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT wallet_topup_continuations_terms_valid CHECK (intent_state_version > 0 AND confirmed_price_la >= 0 AND return_tab IN ('chart', 'overview', 'palaces', 'topics', 'nam-nay', 'evidence')),
  CONSTRAINT wallet_topup_continuations_state_valid CHECK (status IN ('pending', 'completed', 'blocked'))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS wallet_topup_continuations_intent_idx ON wallet_topup_continuations(purchase_intent_id);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION protect_wallet_topup_continuation_terms() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF ROW(OLD.order_id, OLD.owner_id, OLD.purchase_intent_id, OLD.intent_state_version, OLD.confirmed_price_la, OLD.return_tab, OLD.return_open)
    IS DISTINCT FROM ROW(NEW.order_id, NEW.owner_id, NEW.purchase_intent_id, NEW.intent_state_version, NEW.confirmed_price_la, NEW.return_tab, NEW.return_open) THEN
    RAISE EXCEPTION 'Wallet top-up continuation terms are immutable';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS wallet_topup_continuation_terms_immutable ON wallet_topup_continuations;
--> statement-breakpoint
CREATE TRIGGER wallet_topup_continuation_terms_immutable BEFORE UPDATE ON wallet_topup_continuations FOR EACH ROW EXECUTE FUNCTION protect_wallet_topup_continuation_terms();
