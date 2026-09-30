ALTER TABLE "commerce_entitlements" ADD COLUMN "revoked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "commerce_entitlements" ADD COLUMN "revocation_reason" text;--> statement-breakpoint
CREATE TABLE "part_feedbacks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"chart_id" text NOT NULL,
	"report_id" text,
	"part_id" text NOT NULL,
	"rating" text NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guarantee_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_number" text NOT NULL,
	"account_id" text NOT NULL,
	"entitlement_id" uuid NOT NULL,
	"spend_transaction_id" uuid NOT NULL,
	"restoration_transaction_id" uuid NOT NULL,
	"feedback_id" uuid NOT NULL,
	"chart_id" text NOT NULL,
	"sku" text NOT NULL,
	"part_id" text NOT NULL,
	"amount_la" integer NOT NULL,
	"status" text DEFAULT 'approved' NOT NULL,
	"related_palace_id" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"fingerprint" text NOT NULL,
	"result_payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "part_feedbacks" ADD CONSTRAINT "part_feedbacks_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "part_feedbacks" ADD CONSTRAINT "part_feedbacks_chart_id_ziwei_charts_id_fk" FOREIGN KEY ("chart_id") REFERENCES "public"."ziwei_charts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guarantee_claims" ADD CONSTRAINT "guarantee_claims_account_id_auth_users_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."auth_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guarantee_claims" ADD CONSTRAINT "guarantee_claims_entitlement_id_commerce_entitlements_id_fk" FOREIGN KEY ("entitlement_id") REFERENCES "public"."commerce_entitlements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guarantee_claims" ADD CONSTRAINT "guarantee_claims_spend_transaction_id_wallet_transactions_id_fk" FOREIGN KEY ("spend_transaction_id") REFERENCES "public"."wallet_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guarantee_claims" ADD CONSTRAINT "guarantee_claims_restoration_transaction_id_wallet_transactions_id_fk" FOREIGN KEY ("restoration_transaction_id") REFERENCES "public"."wallet_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guarantee_claims" ADD CONSTRAINT "guarantee_claims_feedback_id_part_feedbacks_id_fk" FOREIGN KEY ("feedback_id") REFERENCES "public"."part_feedbacks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "part_feedbacks_chart_part_idx" ON "part_feedbacks" USING btree ("chart_id","part_id");--> statement-breakpoint
CREATE INDEX "part_feedbacks_user_idx" ON "part_feedbacks" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "guarantee_claims_idempotency_unique" ON "guarantee_claims" USING btree ("idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "guarantee_claims_account_unique" ON "guarantee_claims" USING btree ("account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "guarantee_claims_claim_number_unique" ON "guarantee_claims" USING btree ("claim_number");--> statement-breakpoint
CREATE UNIQUE INDEX "guarantee_claims_spend_unique" ON "guarantee_claims" USING btree ("spend_transaction_id");--> statement-breakpoint
CREATE UNIQUE INDEX "guarantee_claims_entitlement_unique" ON "guarantee_claims" USING btree ("entitlement_id");
