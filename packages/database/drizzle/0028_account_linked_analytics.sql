CREATE TABLE IF NOT EXISTS "analytics_visitors" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"birth_profile_id" text,
	"consented_at" timestamp with time zone,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"linked_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "analytics_visitors_link_expiry_check" CHECK (("analytics_visitors"."user_id" IS NULL AND "analytics_visitors"."expires_at" IS NOT NULL AND "analytics_visitors"."linked_at" IS NULL) OR ("analytics_visitors"."user_id" IS NOT NULL AND "analytics_visitors"."expires_at" IS NULL AND "analytics_visitors"."linked_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "analytics_events" (
	"id" text PRIMARY KEY NOT NULL,
	"idempotency_key" text NOT NULL,
	"visitor_id" text NOT NULL,
	"user_id" text,
	"birth_profile_id" text,
	"name" text NOT NULL,
	"properties" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ip" "inet",
	"user_agent" text,
	"referrer" text,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"utm_content" text,
	"utm_term" text,
	"device_class" text,
	"locale" text,
	"pathname" text,
	"ip_expires_at" timestamp with time zone,
	"unlinked_expires_at" timestamp with time zone,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "analytics_events_link_expiry_check" CHECK (("analytics_events"."user_id" IS NULL AND "analytics_events"."unlinked_expires_at" IS NOT NULL) OR ("analytics_events"."user_id" IS NOT NULL AND "analytics_events"."unlinked_expires_at" IS NULL)),
	CONSTRAINT "analytics_events_ip_expiry_check" CHECK ("analytics_events"."ip" IS NULL OR "analytics_events"."ip_expires_at" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "account_behavior_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"locked_sections_viewed" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"topup_packs_viewed" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"la_balance" integer,
	"last_return_at" timestamp with time zone,
	"report_read_depth_percent" integer,
	"interest_topics" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"last_event_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "analytics_fraud_ip_records" (
	"id" text PRIMARY KEY NOT NULL,
	"ip" "inet" NOT NULL,
	"action" text NOT NULL,
	"visitor_id" text,
	"user_id" text,
	"request_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "analytics_visitors" ADD CONSTRAINT "analytics_visitors_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "analytics_visitors" ADD CONSTRAINT "analytics_visitors_birth_profile_id_birth_profiles_id_fk" FOREIGN KEY ("birth_profile_id") REFERENCES "public"."birth_profiles"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_visitor_id_analytics_visitors_id_fk" FOREIGN KEY ("visitor_id") REFERENCES "public"."analytics_visitors"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_birth_profile_id_birth_profiles_id_fk" FOREIGN KEY ("birth_profile_id") REFERENCES "public"."birth_profiles"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "account_behavior_profiles" ADD CONSTRAINT "account_behavior_profiles_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "analytics_fraud_ip_records" ADD CONSTRAINT "analytics_fraud_ip_records_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "analytics_visitors_user_id_idx" ON "analytics_visitors" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "analytics_visitors_expires_at_idx" ON "analytics_visitors" USING btree ("expires_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "analytics_visitors_birth_profile_id_idx" ON "analytics_visitors" USING btree ("birth_profile_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "analytics_events_idempotency_key_unique" ON "analytics_events" USING btree ("idempotency_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "analytics_events_visitor_id_idx" ON "analytics_events" USING btree ("visitor_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "analytics_events_user_id_idx" ON "analytics_events" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "analytics_events_name_idx" ON "analytics_events" USING btree ("name");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "analytics_events_unlinked_expires_at_idx" ON "analytics_events" USING btree ("unlinked_expires_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "analytics_events_ip_expires_at_idx" ON "analytics_events" USING btree ("ip_expires_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "analytics_events_occurred_at_idx" ON "analytics_events" USING btree ("occurred_at");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "account_behavior_profiles_user_id_unique" ON "account_behavior_profiles" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "account_behavior_profiles_updated_at_idx" ON "account_behavior_profiles" USING btree ("updated_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "analytics_fraud_ip_records_ip_idx" ON "analytics_fraud_ip_records" USING btree ("ip");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "analytics_fraud_ip_records_action_idx" ON "analytics_fraud_ip_records" USING btree ("action");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "analytics_fraud_ip_records_expires_at_idx" ON "analytics_fraud_ip_records" USING btree ("expires_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "analytics_fraud_ip_records_user_id_idx" ON "analytics_fraud_ip_records" USING btree ("user_id");
