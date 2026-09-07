ALTER TABLE "knowledge_chunks"
  ADD COLUMN "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX "knowledge_chunks_metadata_idx"
  ON "knowledge_chunks" USING gin ("metadata");

