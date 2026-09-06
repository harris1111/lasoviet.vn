CREATE TYPE "public"."commerce_order_status" AS ENUM('pending', 'paid', 'expired', 'failed', 'refunded');--> statement-breakpoint
CREATE TABLE "commerce_orders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "invoice_number" text NOT NULL,
  "chart_id" text NOT NULL,
  "chart_version_id" text NOT NULL,
  "owner_id" text NOT NULL,
  "sku" text NOT NULL,
  "amount" integer NOT NULL,
  "currency" text NOT NULL,
  "locale" text NOT NULL,
  "status" "commerce_order_status" DEFAULT 'pending' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "paid_at" timestamp with time zone
);--> statement-breakpoint
CREATE TABLE "commerce_payment_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "order_id" uuid NOT NULL,
  "provider_event_id" text NOT NULL,
  "amount" integer NOT NULL,
  "currency" text NOT NULL,
  "status" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "commerce_entitlements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "order_id" uuid NOT NULL,
  "chart_id" text NOT NULL,
  "sku" text NOT NULL,
  "owner_id" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "report_reservations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "report_id" uuid NOT NULL,
  "report_version_id" uuid NOT NULL,
  "entitlement_id" uuid NOT NULL,
  "chart_version_id" text NOT NULL,
  "evidence_version_id" text NOT NULL,
  "knowledge_version_id" text NOT NULL,
  "prompt_version" text NOT NULL,
  "report_config_version" text NOT NULL,
  "locale" text NOT NULL,
  "sku" text NOT NULL,
  "status" text DEFAULT 'requested' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "report_queue_jobs" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "source_event_id" text NOT NULL,
  "trace_id" text NOT NULL,
  "idempotency_key" text NOT NULL,
  "payload" jsonb NOT NULL,
  "status" text DEFAULT 'waiting' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "commerce_payment_events" ADD CONSTRAINT "commerce_payment_events_order_id_commerce_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."commerce_orders"("id");--> statement-breakpoint
ALTER TABLE "commerce_entitlements" ADD CONSTRAINT "commerce_entitlements_order_id_commerce_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."commerce_orders"("id");--> statement-breakpoint
ALTER TABLE "report_reservations" ADD CONSTRAINT "report_reservations_entitlement_id_commerce_entitlements_id_fk" FOREIGN KEY ("entitlement_id") REFERENCES "public"."commerce_entitlements"("id");--> statement-breakpoint
CREATE UNIQUE INDEX "commerce_orders_invoice_unique" ON "commerce_orders" USING btree ("invoice_number");--> statement-breakpoint
CREATE UNIQUE INDEX "commerce_orders_chart_sku_unique" ON "commerce_orders" USING btree ("chart_id","sku");--> statement-breakpoint
CREATE INDEX "commerce_orders_owner_idx" ON "commerce_orders" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "commerce_payment_events_provider_unique" ON "commerce_payment_events" USING btree ("provider_event_id");--> statement-breakpoint
CREATE INDEX "commerce_payment_events_order_idx" ON "commerce_payment_events" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "commerce_entitlements_order_unique" ON "commerce_entitlements" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "commerce_entitlements_chart_sku_unique" ON "commerce_entitlements" USING btree ("chart_id","sku");--> statement-breakpoint
CREATE UNIQUE INDEX "report_reservations_entitlement_unique" ON "report_reservations" USING btree ("entitlement_id");--> statement-breakpoint
CREATE UNIQUE INDEX "report_queue_jobs_source_event_unique" ON "report_queue_jobs" USING btree ("source_event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "report_queue_jobs_idempotency_unique" ON "report_queue_jobs" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "outbox_report_pending_claim_idx" ON "outbox" USING btree ("event_type","status","available_at");--> statement-breakpoint
CREATE INDEX "outbox_report_expired_lease_idx" ON "outbox" USING btree ("event_type","status","leased_until");
