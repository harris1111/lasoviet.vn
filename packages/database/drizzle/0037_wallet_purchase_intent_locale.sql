ALTER TABLE "wallet_purchase_intents" ADD COLUMN "locale" text;--> statement-breakpoint
UPDATE "wallet_purchase_intents" SET "locale" = 'vi' WHERE "locale" IS NULL;--> statement-breakpoint
ALTER TABLE "wallet_purchase_intents" ALTER COLUMN "locale" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "wallet_purchase_intents" DROP CONSTRAINT "wallet_purchase_intents_valid";--> statement-breakpoint
ALTER TABLE "wallet_purchase_intents" ADD CONSTRAINT "wallet_purchase_intents_valid" CHECK ((("wallet_purchase_intents"."sku" = 'ZIWEI-NATAL-EXCERPT-P0' AND "wallet_purchase_intents"."locale" = 'vi' AND "wallet_purchase_intents"."price_la" = 240) OR ("wallet_purchase_intents"."sku" = 'ZIWEI-IDENTITY-P0' AND "wallet_purchase_intents"."locale" IN ('vi', 'en') AND "wallet_purchase_intents"."price_la" IN (720, 960))) AND "wallet_purchase_intents"."status" IN ('pending', 'completed', 'cancelled', 'expired') AND "wallet_purchase_intents"."state_version" > 0);
