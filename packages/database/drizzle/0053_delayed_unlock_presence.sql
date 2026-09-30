ALTER TABLE wallet_topup_continuations
  ADD COLUMN IF NOT EXISTS last_customer_seen_at timestamptz,
  ADD COLUMN IF NOT EXISTS completion_seen_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_notice_check_at timestamptz;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS wallet_topup_continuations_notice_due_idx
  ON wallet_topup_continuations (last_notice_check_at NULLS FIRST, completed_at)
  WHERE status = 'completed' AND completion_seen_at IS NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS notification_verified_signins (
  user_id text PRIMARY KEY REFERENCES auth_users(id) ON DELETE CASCADE,
  signed_in_at timestamptz NOT NULL,
  last_checked_at timestamptz
);
--> statement-breakpoint
ALTER TABLE report_reservations ADD COLUMN IF NOT EXISTS last_reminder_check_at timestamptz;
