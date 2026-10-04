ALTER TYPE notification_delivery_kind ADD VALUE IF NOT EXISTS 'recovery_pending_topup';
--> statement-breakpoint
ALTER TYPE notification_delivery_status ADD VALUE IF NOT EXISTS 'captured';
