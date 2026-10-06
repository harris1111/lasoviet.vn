ALTER TABLE "commerce_payment_events" ADD COLUMN "provider_provenance" jsonb;
--> statement-breakpoint
ALTER TABLE "commerce_payment_events" ADD CONSTRAINT "commerce_payment_events_provenance_check" CHECK ("provider_provenance" IS NULL OR (jsonb_typeof("provider_provenance") = 'object'
 AND "provider_provenance" ?& ARRAY['version','provider','environment','authentication','channel','authenticatedAcceptedAt']
 AND "provider_provenance" - ARRAY['version','provider','environment','authentication','channel','authenticatedAcceptedAt'] = '{}'::jsonb
 AND "provider_provenance"->'version' = '1'::jsonb AND "provider_provenance"->>'provider' = 'sepay'
 AND "provider_provenance"->>'environment' IN ('sandbox','production')
 AND (("provider_provenance"->>'authentication' = 'hmac' AND "provider_provenance"->>'channel' = 'bank')
   OR ("provider_provenance"->>'authentication' = 'shared_secret' AND "provider_provenance"->>'channel' = 'ipn'))
 AND jsonb_typeof("provider_provenance"->'authenticatedAcceptedAt') = 'string'
 AND "provider_provenance"->>'authenticatedAcceptedAt' ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$') IS TRUE);
--> statement-breakpoint
ALTER TABLE "commerce_unmatched_payments" ADD COLUMN "provider_provenance" jsonb;
--> statement-breakpoint
ALTER TABLE "commerce_unmatched_payments" ADD CONSTRAINT "commerce_unmatched_payments_provenance_check" CHECK ("provider_provenance" IS NULL OR (jsonb_typeof("provider_provenance") = 'object'
 AND "provider_provenance" ?& ARRAY['version','provider','environment','authentication','channel','authenticatedAcceptedAt']
 AND "provider_provenance" - ARRAY['version','provider','environment','authentication','channel','authenticatedAcceptedAt'] = '{}'::jsonb
 AND "provider_provenance"->'version' = '1'::jsonb AND "provider_provenance"->>'provider' = 'sepay'
 AND "provider_provenance"->>'environment' IN ('sandbox','production')
 AND (("provider_provenance"->>'authentication' = 'hmac' AND "provider_provenance"->>'channel' = 'bank')
   OR ("provider_provenance"->>'authentication' = 'shared_secret' AND "provider_provenance"->>'channel' = 'ipn'))
 AND jsonb_typeof("provider_provenance"->'authenticatedAcceptedAt') = 'string'
 AND "provider_provenance"->>'authenticatedAcceptedAt' ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$') IS TRUE);
--> statement-breakpoint
CREATE FUNCTION preserve_payment_provenance() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.provider_provenance IS DISTINCT FROM OLD.provider_provenance THEN
   RAISE EXCEPTION 'PAYMENT_PROVENANCE_IMMUTABLE';
 END IF;
 RETURN NEW;
END; $$;
--> statement-breakpoint
CREATE TRIGGER "commerce_payment_events_provenance_immutable" BEFORE UPDATE ON "commerce_payment_events" FOR EACH ROW EXECUTE FUNCTION preserve_payment_provenance();
--> statement-breakpoint
CREATE TRIGGER "commerce_unmatched_payments_provenance_immutable" BEFORE UPDATE ON "commerce_unmatched_payments" FOR EACH ROW EXECUTE FUNCTION preserve_payment_provenance();
--> statement-breakpoint
ALTER TABLE "recovery_click_receipts"
 ADD COLUMN "financial_check_count" integer NOT NULL DEFAULT 0,
 ADD COLUMN "recognized_vnd" integer,
 ADD COLUMN "payment_event_id" uuid,
 ADD COLUMN "grant_transaction_id" uuid,
 ADD COLUMN "spend_transaction_id" uuid;
--> statement-breakpoint
ALTER TABLE "recovery_click_receipts" DROP CONSTRAINT "recovery_click_money_check";
--> statement-breakpoint
ALTER TABLE "recovery_click_receipts" ADD CONSTRAINT "recovery_click_money_check" CHECK (("attributed_at" IS NULL AND "paid_vnd" IS NULL AND "charged_la" IS NULL AND "recognized_vnd" IS NULL
 AND "payment_event_id" IS NULL AND "grant_transaction_id" IS NULL AND "spend_transaction_id" IS NULL)
 OR ("classification" = 'clicked' AND "attributed_at" IS NOT NULL AND "paid_vnd" IS NOT NULL AND "charged_la" IS NOT NULL
 AND "recognized_vnd" IS NOT NULL AND "payment_event_id" IS NOT NULL AND "grant_transaction_id" IS NOT NULL AND "spend_transaction_id" IS NOT NULL
 AND "paid_vnd" > 0 AND "charged_la" > 0 AND "recognized_vnd" >= 0 AND "recognized_vnd" <= "paid_vnd"));
--> statement-breakpoint
CREATE UNIQUE INDEX "recovery_click_payment_unique" ON "recovery_click_receipts"("payment_event_id") WHERE "payment_event_id" IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "recovery_click_spend_unique" ON "recovery_click_receipts"("spend_transaction_id") WHERE "spend_transaction_id" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "recovery_click_receipts" ADD CONSTRAINT "recovery_financial_check_count_valid" CHECK ("financial_check_count" >= 0);
--> statement-breakpoint
CREATE INDEX "recovery_financial_fair_scan_idx" ON "recovery_click_receipts"("financial_check_count","clicked_at","id") WHERE "attributed_at" IS NULL AND "classification" = 'clicked';
