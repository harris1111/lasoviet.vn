ALTER TABLE "report_reservations" ADD COLUMN "state_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "report_reservations" ADD COLUMN "attempt_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "report_reservations" ADD COLUMN "active_job_id" text;--> statement-breakpoint
ALTER TABLE "report_reservations" ADD COLUMN "last_error_code" text;--> statement-breakpoint
ALTER TABLE "report_reservations" ADD COLUMN "next_attempt_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "report_reservations" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "report_queue_jobs" ADD COLUMN "attempt_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "report_queue_jobs" ADD COLUMN "available_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "report_queue_jobs" ADD COLUMN "leased_by" text;--> statement-breakpoint
ALTER TABLE "report_queue_jobs" ADD COLUMN "leased_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "report_queue_jobs" ADD COLUMN "last_error_code" text;--> statement-breakpoint
ALTER TABLE "report_queue_jobs" ADD COLUMN "processed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "report_queue_jobs" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE INDEX "report_queue_jobs_waiting_claim_idx" ON "report_queue_jobs" USING btree ("status","available_at");--> statement-breakpoint
CREATE INDEX "report_queue_jobs_expired_lease_idx" ON "report_queue_jobs" USING btree ("status","leased_until");
