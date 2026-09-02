ALTER TABLE "birth_profiles" ADD CONSTRAINT "birth_profiles_anonymous_expiry_matches_owner" CHECK (("user_id" IS NOT NULL AND "anonymous_actor_id" IS NULL AND "anonymous_expires_at" IS NULL) OR ("user_id" IS NULL AND "anonymous_actor_id" IS NOT NULL AND "anonymous_expires_at" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD COLUMN "request_payload" jsonb NOT NULL DEFAULT '{}'::jsonb;--> statement-breakpoint
DROP INDEX "consents_owner_document_purpose_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "consents_account_document_purpose_unique" ON "consents" USING btree ("user_id","document_key","document_version","purpose") WHERE "user_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "consents_anonymous_document_purpose_unique" ON "consents" USING btree ("anonymous_actor_id","document_key","document_version","purpose") WHERE "anonymous_actor_id" IS NOT NULL;
