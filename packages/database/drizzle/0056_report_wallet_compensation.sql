CREATE TABLE "report_wallet_compensations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"reservation_id" uuid NOT NULL,
	"terminal_state_version" integer NOT NULL,
	"failure_event_id" uuid NOT NULL,
	"spend_transaction_id" uuid NOT NULL,
	"restoration_transaction_id" uuid,
	"amount_la" integer NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	CONSTRAINT "report_wallet_compensations_financial_proof" CHECK ("report_wallet_compensations"."terminal_state_version" > 0 AND (("report_wallet_compensations"."amount_la" = 0 AND "report_wallet_compensations"."restoration_transaction_id" IS NULL) OR ("report_wallet_compensations"."amount_la" > 0 AND "report_wallet_compensations"."restoration_transaction_id" IS NOT NULL)))
);
--> statement-breakpoint
ALTER TABLE "report_wallet_compensations" ADD CONSTRAINT "report_wallet_compensations_owner_id_auth_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."auth_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_wallet_compensations" ADD CONSTRAINT "report_wallet_compensations_reservation_id_report_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."report_reservations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_wallet_compensations" ADD CONSTRAINT "report_wallet_compensations_spend_transaction_id_wallet_transactions_id_fk" FOREIGN KEY ("spend_transaction_id") REFERENCES "public"."wallet_transactions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_wallet_compensations" ADD CONSTRAINT "report_wallet_compensations_restoration_transaction_id_wallet_transactions_id_fk" FOREIGN KEY ("restoration_transaction_id") REFERENCES "public"."wallet_transactions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "report_wallet_compensations_spend_unique" ON "report_wallet_compensations" USING btree ("spend_transaction_id");--> statement-breakpoint
CREATE INDEX "report_wallet_compensations_owner_reservation_idx" ON "report_wallet_compensations" USING btree ("owner_id","reservation_id");
--> statement-breakpoint
CREATE TRIGGER report_wallet_compensations_immutable BEFORE UPDATE OR DELETE ON report_wallet_compensations FOR EACH ROW EXECUTE FUNCTION prevent_wallet_immutable_mutation();
