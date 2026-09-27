ALTER TYPE "public"."notification_delivery_kind" ADD VALUE IF NOT EXISTS 'nurture_verified_signin';
ALTER TYPE "public"."notification_delivery_kind" ADD VALUE IF NOT EXISTS 'han_month_reminder';
ALTER TYPE "public"."notification_delivery_kind" ADD VALUE IF NOT EXISTS 'delayed_unlock_completed';

CREATE TABLE IF NOT EXISTS "notification_preferences" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"email_fingerprint" text NOT NULL,
	"nurture_emails_allowed" boolean DEFAULT true NOT NULL,
	"han_reminders_allowed" boolean DEFAULT true NOT NULL,
	"unsubscribed_all" boolean DEFAULT false NOT NULL,
	"unsubscribed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
 ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "notification_preferences_user_id_unique" ON "notification_preferences" USING btree ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "notification_preferences_email_fingerprint_unique" ON "notification_preferences" USING btree ("email_fingerprint");
