CREATE TABLE "recovery_click_receipts" (
 "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
 "owner_id" text NOT NULL REFERENCES "auth_users"("id") ON DELETE CASCADE,
 "delivery_id" uuid NOT NULL REFERENCES "notification_deliveries"("id") ON DELETE CASCADE,
 "order_id" uuid NOT NULL, "intent_id" uuid NOT NULL,
 "chart_id" text NOT NULL, "chart_version_id" text NOT NULL,
 "source" text DEFAULT 'reminder' NOT NULL, "classification" text NOT NULL,
 "clicked_at" timestamp with time zone NOT NULL, "attributed_at" timestamp with time zone,
 "paid_vnd" integer, "charged_la" integer,
 CONSTRAINT "recovery_click_classification_check" CHECK ("classification" IN ('captured_click','clicked') AND "source" = 'reminder'),
 CONSTRAINT "recovery_click_money_check" CHECK ("attributed_at" IS NULL AND "paid_vnd" IS NULL AND "charged_la" IS NULL)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "recovery_click_delivery_unique" ON "recovery_click_receipts"("delivery_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "recovery_click_order_unique" ON "recovery_click_receipts"("order_id");
