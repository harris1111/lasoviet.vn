export const PERMITTED_USE_BASES = [
  "first_party",
  "licensed",
  "public_domain",
  "reference_rewrite",
] as const;

export type KnowledgeChunkMetadataV1 = {
  topics: string[];
  palaces: string[];
  stars: string[];
  brightness: string[];
  transformations: string[];
  relations: string[];
  patterns: string[];
  sourceType: "modern" | "classical" | "matrix" | "curated";
  languageOrigin: "vi" | "zh" | "en";
  priority: 1 | 2 | 3;
};

import { sql } from "drizzle-orm";
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
    metadata: jsonb("metadata").$type<KnowledgeChunkMetadataV1>().notNull().default(sql`'{}'::jsonb`),
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
    index("knowledge_chunks_metadata_idx").using("gin", table.metadata),
  ],
);
