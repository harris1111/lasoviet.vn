CREATE TYPE "public"."deletion_request_status" AS ENUM('requested', 'cancelled', 'purged');--> statement-breakpoint
CREATE TYPE "public"."outbox_status" AS ENUM('pending', 'leased', 'processed', 'failed');--> statement-breakpoint
CREATE TABLE "auth_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"account_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"access_token_expires_at" timestamp with time zone,
	"scope" text,
	"id_token" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_anonymous_actors" (
	"id" text PRIMARY KEY NOT NULL,
	"linked_user_id" text,
	"expires_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consents" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"anonymous_actor_id" text,
	"document_key" text NOT NULL,
	"document_version" text NOT NULL,
	"purpose" text NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "consents_one_owner" CHECK (num_nonnulls("consents"."user_id", "consents"."anonymous_actor_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "deletion_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"status" "deletion_request_status" DEFAULT 'requested' NOT NULL,
	"requested_at" timestamp with time zone NOT NULL,
	"recover_until" timestamp with time zone NOT NULL,
	"purge_after" timestamp with time zone NOT NULL,
	"cancelled_at" timestamp with time zone,
	"purged_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "birth_profile_revisions" (
	"id" text PRIMARY KEY NOT NULL,
	"profile_id" text NOT NULL,
	"revision_number" integer NOT NULL,
	"original_input" jsonb NOT NULL,
	"normalized_input" jsonb,
	"normalization_warnings" jsonb,
	"limitations" jsonb,
	"consent_version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "birth_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"anonymous_actor_id" text,
	"anonymous_expires_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "birth_profiles_one_owner" CHECK (num_nonnulls("birth_profiles"."user_id", "birth_profiles"."anonymous_actor_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"schema_version" integer NOT NULL,
	"event_type" text NOT NULL,
	"event_id" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"trace_id" text NOT NULL,
	"actor_id" text,
	"aggregate_type" text NOT NULL,
	"aggregate_id" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "outbox_status" DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"leased_until" timestamp with time zone,
	"leased_by" text,
	"last_error_code" text,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "outbox_schema_version_supported" CHECK ("outbox"."schema_version" = 1)
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" text,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"reason_code" text,
	"request_id" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auth_accounts" ADD CONSTRAINT "auth_accounts_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_anonymous_actors" ADD CONSTRAINT "auth_anonymous_actors_linked_user_id_auth_users_id_fk" FOREIGN KEY ("linked_user_id") REFERENCES "public"."auth_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consents" ADD CONSTRAINT "consents_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consents" ADD CONSTRAINT "consents_anonymous_actor_id_auth_anonymous_actors_id_fk" FOREIGN KEY ("anonymous_actor_id") REFERENCES "public"."auth_anonymous_actors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deletion_requests" ADD CONSTRAINT "deletion_requests_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "birth_profile_revisions" ADD CONSTRAINT "birth_profile_revisions_profile_id_birth_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."birth_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "birth_profiles" ADD CONSTRAINT "birth_profiles_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "birth_profiles" ADD CONSTRAINT "birth_profiles_anonymous_actor_id_auth_anonymous_actors_id_fk" FOREIGN KEY ("anonymous_actor_id") REFERENCES "public"."auth_anonymous_actors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "auth_accounts_provider_account_unique" ON "auth_accounts" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX "auth_accounts_user_id_idx" ON "auth_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_anonymous_actors_expiry_idx" ON "auth_anonymous_actors" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "auth_anonymous_actors_linked_user_idx" ON "auth_anonymous_actors" USING btree ("linked_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_sessions_token_unique" ON "auth_sessions" USING btree ("token");--> statement-breakpoint
CREATE INDEX "auth_sessions_user_id_idx" ON "auth_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_users_email_unique" ON "auth_users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_verifications_identifier_value_unique" ON "auth_verifications" USING btree ("identifier","value");--> statement-breakpoint
CREATE UNIQUE INDEX "consents_owner_document_purpose_unique" ON "consents" USING btree ("user_id","anonymous_actor_id","document_key","document_version","purpose");--> statement-breakpoint
CREATE INDEX "consents_document_idx" ON "consents" USING btree ("document_key","document_version");--> statement-breakpoint
CREATE UNIQUE INDEX "deletion_requests_active_user_unique" ON "deletion_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "deletion_requests_purge_after_idx" ON "deletion_requests" USING btree ("purge_after");--> statement-breakpoint
CREATE UNIQUE INDEX "birth_profile_revisions_profile_revision_unique" ON "birth_profile_revisions" USING btree ("profile_id","revision_number");--> statement-breakpoint
CREATE INDEX "birth_profile_revisions_profile_id_idx" ON "birth_profile_revisions" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "birth_profiles_user_id_idx" ON "birth_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "birth_profiles_anonymous_expiry_idx" ON "birth_profiles" USING btree ("anonymous_actor_id","anonymous_expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "outbox_event_id_unique" ON "outbox" USING btree ("event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "outbox_idempotency_key_unique" ON "outbox" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "outbox_claim_idx" ON "outbox" USING btree ("status","available_at");--> statement-breakpoint
CREATE INDEX "outbox_lease_idx" ON "outbox" USING btree ("leased_until");--> statement-breakpoint
CREATE INDEX "audit_logs_target_idx" ON "audit_logs" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_idx" ON "audit_logs" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");