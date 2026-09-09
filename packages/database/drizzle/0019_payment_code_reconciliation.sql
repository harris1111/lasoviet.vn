CREATE OR REPLACE FUNCTION "generate_payment_code"() RETURNS text AS $$
DECLARE
  alphabet text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  code text := 'LSV';
  char_idx integer;
  chk_sum integer := 0;
  i integer;
BEGIN
  FOR i IN 1..8 LOOP
    char_idx := floor(random() * 32)::integer;
    code := code || substr(alphabet, char_idx + 1, 1);
    chk_sum := chk_sum + (i * char_idx);
  END LOOP;
  code := code || substr(alphabet, (chk_sum % 32) + 1, 1);
  RETURN code;
END;
$$ LANGUAGE plpgsql VOLATILE;
--> statement-breakpoint
ALTER TABLE "commerce_orders" ADD COLUMN IF NOT EXISTS "payment_code" text;
--> statement-breakpoint
DO $$
DECLARE
  r RECORD;
  new_code text;
  collision boolean;
BEGIN
  FOR r IN SELECT id FROM commerce_orders WHERE payment_code IS NULL LOOP
    LOOP
      new_code := generate_payment_code();
      SELECT EXISTS(SELECT 1 FROM commerce_orders WHERE payment_code = new_code) INTO collision;
      IF NOT collision THEN
        UPDATE commerce_orders SET payment_code = new_code WHERE id = r.id;
        EXIT;
      END IF;
    END LOOP;
  END LOOP;
END;
$$;
--> statement-breakpoint
ALTER TABLE "commerce_orders" ALTER COLUMN "payment_code" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "commerce_orders" ALTER COLUMN "payment_code" SET DEFAULT generate_payment_code();
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "commerce_orders_payment_code_unique" ON "commerce_orders" USING btree ("payment_code");
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "commerce_orders" ADD CONSTRAINT "commerce_orders_payment_code_format" CHECK (payment_code ~ '^LSV[0-9ABCDEFGHJKMNPQRSTVWXYZ]{9}$');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "commerce_payment_events" ADD COLUMN IF NOT EXISTS "match_method" text;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "commerce_unmatched_payments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "provider_event_id" text NOT NULL,
  "raw_payload" jsonb NOT NULL,
  "amount" integer NOT NULL,
  "reason" text NOT NULL,
  "received_at" timestamp with time zone DEFAULT now() NOT NULL,
  "claimed_by_order_id" uuid,
  "claimed_at" timestamp with time zone,
  CONSTRAINT "commerce_unmatched_payments_amount_positive" CHECK ("amount" > 0)
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "commerce_unmatched_payments" ADD CONSTRAINT "commerce_unmatched_payments_claimed_by_order_id_commerce_orders_id_fk" FOREIGN KEY ("claimed_by_order_id") REFERENCES "public"."commerce_orders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "commerce_unmatched_payments_provider_event_unique" ON "commerce_unmatched_payments" USING btree ("provider_event_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "commerce_unmatched_payments_received_claimed_idx" ON "commerce_unmatched_payments" USING btree ("received_at", "claimed_at");
