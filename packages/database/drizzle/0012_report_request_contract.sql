ALTER TABLE "report_reservations" ADD COLUMN "evidence_version_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "report_reservations" ADD COLUMN "knowledge_version_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "report_reservations" ADD COLUMN "prompt_version" text NOT NULL;--> statement-breakpoint
ALTER TABLE "report_reservations" ADD COLUMN "report_config_version" text NOT NULL;--> statement-breakpoint
ALTER TABLE "report_reservations" ADD COLUMN "locale" text NOT NULL;--> statement-breakpoint
ALTER TABLE "report_reservations" ADD COLUMN "sku" text NOT NULL;
