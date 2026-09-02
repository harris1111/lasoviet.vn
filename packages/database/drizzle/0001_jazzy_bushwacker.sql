ALTER TABLE "auth_accounts" ADD COLUMN "issuer" text NOT NULL;--> statement-breakpoint
ALTER TABLE "auth_accounts" ADD COLUMN "refresh_token_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "auth_users" ADD COLUMN "is_anonymous" boolean DEFAULT false NOT NULL;