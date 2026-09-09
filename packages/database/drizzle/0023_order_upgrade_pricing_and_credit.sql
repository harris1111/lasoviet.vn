ALTER TABLE "commerce_orders" ADD COLUMN IF NOT EXISTS "price_variant" text;
--> statement-breakpoint
ALTER TABLE "commerce_orders" ADD COLUMN IF NOT EXISTS "credit_applied" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "commerce_orders" ADD COLUMN IF NOT EXISTS "credited_from_order_id" uuid;
--> statement-breakpoint
ALTER TABLE "commerce_orders" ADD COLUMN IF NOT EXISTS "credit_expires_at" timestamp with time zone;
--> statement-breakpoint
UPDATE "commerce_orders"
SET "price_variant" = '19k'
WHERE "sku" = 'ZIWEI-NATAL-EXCERPT-P0' AND "price_variant" IS NULL;
--> statement-breakpoint
UPDATE "commerce_orders"
SET "credit_expires_at" = "paid_at" + interval '7 days'
WHERE "sku" = 'ZIWEI-NATAL-EXCERPT-P0' AND "paid_at" IS NOT NULL AND "credit_expires_at" IS NULL;
--> statement-breakpoint
UPDATE "commerce_orders"
SET "credit_applied" = 0
WHERE "credit_applied" IS NULL;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "commerce_orders" ADD CONSTRAINT "commerce_orders_credited_from_order_id_commerce_orders_id_fk" FOREIGN KEY ("credited_from_order_id") REFERENCES "public"."commerce_orders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "commerce_orders" ADD CONSTRAINT "commerce_orders_credit_applied_non_negative" CHECK ("credit_applied" >= 0);
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "commerce_orders" ADD CONSTRAINT "commerce_orders_credit_upgrade_consistency" CHECK (("credit_applied" = 0 AND "credited_from_order_id" IS NULL) OR ("credit_applied" > 0 AND "credited_from_order_id" IS NOT NULL AND "credit_expires_at" IS NOT NULL AND "sku" = 'ZIWEI-IDENTITY-P0' AND "credited_from_order_id" <> "id"));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
