CREATE TABLE "knowledge_chunk_provenance_edges" (
	"id" text PRIMARY KEY NOT NULL,
	"output_knowledge_version" text NOT NULL,
	"output_passage_id" text NOT NULL,
	"source_knowledge_version" text NOT NULL,
	"source_passage_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knowledge_chunk_provenance_edges_version_pair_valid" CHECK ("knowledge_chunk_provenance_edges"."output_knowledge_version" = 'ziwei.comprehensive.knowledge.v4' AND "knowledge_chunk_provenance_edges"."source_knowledge_version" = 'ziwei.comprehensive.knowledge.v3')
);
--> statement-breakpoint
ALTER TABLE "knowledge_chunk_provenance_edges" ADD CONSTRAINT "knowledge_chunk_provenance_edges_output_chunk_fk" FOREIGN KEY ("output_knowledge_version","output_passage_id") REFERENCES "public"."knowledge_chunks"("knowledge_version","passage_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_chunk_provenance_edges" ADD CONSTRAINT "knowledge_chunk_provenance_edges_source_chunk_fk" FOREIGN KEY ("source_knowledge_version","source_passage_id") REFERENCES "public"."knowledge_chunks"("knowledge_version","passage_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "knowledge_chunk_provenance_edges_identity_unique" ON "knowledge_chunk_provenance_edges" USING btree ("output_knowledge_version","output_passage_id","source_knowledge_version","source_passage_id");--> statement-breakpoint
CREATE INDEX "knowledge_chunk_provenance_edges_output_idx" ON "knowledge_chunk_provenance_edges" USING btree ("output_knowledge_version","output_passage_id");--> statement-breakpoint
CREATE INDEX "knowledge_chunk_provenance_edges_source_idx" ON "knowledge_chunk_provenance_edges" USING btree ("source_knowledge_version","source_passage_id");