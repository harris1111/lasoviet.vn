CREATE TABLE "report_notification_subscriptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "owner_id" text NOT NULL REFERENCES "auth_users"("id") ON DELETE CASCADE,
  "reservation_id" uuid NOT NULL REFERENCES "report_reservations"("id") ON DELETE CASCADE,
  "report_id" uuid NOT NULL,
  "report_version_id" uuid NOT NULL,
  "locale" text NOT NULL,
  "status" text DEFAULT 'subscribed' NOT NULL,
  "state_version" integer DEFAULT 1 NOT NULL,
  "capture_check_count" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "report_notice_status_check" CHECK ("status" IN ('subscribed','cancelled','captured','already_notified','suppressed')),
  CONSTRAINT "report_notice_locale_check" CHECK ("locale" IN ('vi','en')),
  CONSTRAINT "report_notice_state_version_check" CHECK ("state_version" > 0),
  CONSTRAINT "report_notice_capture_check_count_check" CHECK ("capture_check_count" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "report_notice_owner_version_unique" ON "report_notification_subscriptions"("owner_id", "report_version_id");
--> statement-breakpoint
CREATE INDEX "report_notice_status_idx" ON "report_notification_subscriptions"("status", "capture_check_count", "created_at");
