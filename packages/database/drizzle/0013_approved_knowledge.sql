CREATE TABLE "knowledge_documents" (
	"id" text PRIMARY KEY NOT NULL,
	"document_id" text NOT NULL,
	"knowledge_version" text NOT NULL,
	"discipline" text NOT NULL,
	"locale" text NOT NULL,
	"source_path" text NOT NULL,
	"source_attribution" text NOT NULL,
	"permitted_use" text NOT NULL,
	"content_hash" text NOT NULL,
	"approval_status" text NOT NULL,
	"approved_by" text NOT NULL,
	"approved_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_chunks" (
	"id" text PRIMARY KEY NOT NULL,
	"passage_id" text NOT NULL,
	"document_id" text NOT NULL,
	"knowledge_version" text NOT NULL,
	"discipline" text NOT NULL,
	"locale" text NOT NULL,
	"report_sections" jsonb NOT NULL,
	"content" text NOT NULL,
	"content_hash" text NOT NULL,
	"source_attribution" text NOT NULL,
	"permitted_use" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_document_id_knowledge_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."knowledge_documents"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "knowledge_documents_version_unique" ON "knowledge_documents" USING btree ("document_id","knowledge_version");
--> statement-breakpoint
CREATE INDEX "knowledge_documents_lookup_idx" ON "knowledge_documents" USING btree ("discipline","locale","knowledge_version","approval_status");
--> statement-breakpoint
CREATE UNIQUE INDEX "knowledge_chunks_version_passage_unique" ON "knowledge_chunks" USING btree ("knowledge_version","passage_id");
--> statement-breakpoint
CREATE INDEX "knowledge_chunks_retrieval_idx" ON "knowledge_chunks" USING btree ("knowledge_version","discipline","locale");
--> statement-breakpoint
CREATE INDEX "knowledge_chunks_document_idx" ON "knowledge_chunks" USING btree ("document_id");
--> statement-breakpoint
CREATE INDEX "knowledge_chunks_fts_idx" ON "knowledge_chunks" USING gin (to_tsvector('simple', "content"));
--> statement-breakpoint
CREATE INDEX "knowledge_chunks_report_sections_idx" ON "knowledge_chunks" USING gin ("report_sections");
