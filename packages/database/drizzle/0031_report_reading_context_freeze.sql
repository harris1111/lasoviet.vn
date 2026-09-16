ALTER TABLE "report_reservations"
  ADD COLUMN IF NOT EXISTS "reading_context_revision_id" text;
--> statement-breakpoint
ALTER TABLE "report_reservations"
  ADD CONSTRAINT "report_reservations_reading_context_revision_id_birth_profile_reading_context_revisions_id_fk"
  FOREIGN KEY ("reading_context_revision_id")
  REFERENCES "public"."birth_profile_reading_context_revisions"("id")
  ON DELETE SET NULL
  ON UPDATE NO ACTION;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "report_reservations_reading_context_revision_idx"
  ON "report_reservations" USING btree ("reading_context_revision_id");
