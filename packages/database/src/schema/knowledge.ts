import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const knowledgeDocuments = pgTable(
  "knowledge_documents",
  {
    id: text("id").primaryKey(),
    documentId: text("document_id").notNull(),
    knowledgeVersion: text("knowledge_version").notNull(),
    discipline: text("discipline").notNull(),
    locale: text("locale").notNull(),
    sourcePath: text("source_path").notNull(),
    sourceAttribution: text("source_attribution").notNull(),
    permittedUse: text("permitted_use").notNull(),
    contentHash: text("content_hash").notNull(),
    approvalStatus: text("approval_status").notNull(),
    approvedBy: text("approved_by").notNull(),
    approvedAt: timestamp("approved_at", { withTimezone: true, mode: "date" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("knowledge_documents_version_unique").on(table.documentId, table.knowledgeVersion),
    index("knowledge_documents_lookup_idx").on(
      table.discipline,
      table.locale,
      table.knowledgeVersion,
      table.approvalStatus,
    ),
  ],
);

export const knowledgeChunks = pgTable(
  "knowledge_chunks",
  {
    id: text("id").primaryKey(),
    passageId: text("passage_id").notNull(),
    documentId: text("document_id")
      .notNull()
      .references(() => knowledgeDocuments.id, { onDelete: "cascade" }),
    knowledgeVersion: text("knowledge_version").notNull(),
    discipline: text("discipline").notNull(),
    locale: text("locale").notNull(),
    reportSections: jsonb("report_sections").$type<string[]>().notNull(),
    content: text("content").notNull(),
    contentHash: text("content_hash").notNull(),
    sourceAttribution: text("source_attribution").notNull(),
    permittedUse: text("permitted_use").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("knowledge_chunks_version_passage_unique").on(
      table.knowledgeVersion,
      table.passageId,
    ),
    index("knowledge_chunks_retrieval_idx").on(
      table.knowledgeVersion,
      table.discipline,
      table.locale,
    ),
    index("knowledge_chunks_document_idx").on(table.documentId),
  ],
);
