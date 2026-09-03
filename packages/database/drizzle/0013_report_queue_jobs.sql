CREATE TABLE "report_queue_jobs" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "source_event_id" text NOT NULL,
  "trace_id" text NOT NULL,
  "idempotency_key" text NOT NULL,
  "payload" jsonb NOT NULL,
  "status" text DEFAULT 'waiting' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX "report_queue_jobs_source_event_unique" ON "report_queue_jobs" USING btree ("source_event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "report_queue_jobs_idempotency_unique" ON "report_queue_jobs" USING btree ("idempotency_key");
