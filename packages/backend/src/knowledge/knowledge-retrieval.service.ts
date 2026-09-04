import { sql } from "drizzle-orm";
import {
  IDENTITY_REPORT_SECTION_IDS,
  type IdentityReportSectionId,
} from "@lasoviet/contracts";
import type { Database } from "@lasoviet/database";
import type { PermittedUseBasis } from "./knowledge-ingestion.service.js";

export type KnowledgePassageV1 = {
  id: string;
  passageId: string;
  documentId: string;
  discipline: "ziwei";
  locale: "vi" | "en";
  reportSections: readonly IdentityReportSectionId[];
  knowledgeVersion: string;
  content: string;
  contentHash: string;
  sourceAttribution: string;
  permittedUse: PermittedUseBasis;
};

export type RetrieveKnowledgeQuery = {
  discipline: "ziwei";
  locale: "vi" | "en";
  reportSection: IdentityReportSectionId;
  knowledgeVersion: string;
  text: string;
  maxPassages?: number;
  maxCharsPerPassage?: number;
  maxTotalChars?: number;
  enableVector?: boolean;
  vectorQuery?: unknown;
};

export type VectorRetrievalDependency = {
  isIndexReady(): Promise<boolean> | boolean;
  query(params: {
    vectorQuery: unknown;
    discipline: string;
    locale: string;
    reportSection: string;
    knowledgeVersion: string;
    limit: number;
  }): Promise<Array<{ passageId: string; score: number }>>;
};

export type KnowledgeErrorCode =
  | "KNOWLEDGE_UNAPPROVED"
  | "KNOWLEDGE_METADATA_INVALID"
  | "KNOWLEDGE_CONTEXT_LIMIT";

export class KnowledgeError extends Error {
  readonly code: KnowledgeErrorCode;

  constructor(code: KnowledgeErrorCode, message: string) {
    super(message);
    this.name = "KnowledgeError";
    this.code = code;
  }
}

export function createKnowledgeRetrievalService(dependencies: {
  database: Database;
  vectorRetrieval?: VectorRetrievalDependency;
}) {
  return {
    async retrieveKnowledge(
      query: RetrieveKnowledgeQuery,
    ): Promise<KnowledgePassageV1[]> {
      // Validate metadata
      if (query.discipline !== "ziwei") {
        throw new KnowledgeError(
          "KNOWLEDGE_METADATA_INVALID",
          `Unsupported discipline: ${query.discipline}`,
        );
      }

      if (query.locale !== "vi" && query.locale !== "en") {
        throw new KnowledgeError(
          "KNOWLEDGE_METADATA_INVALID",
          `Unsupported locale: ${query.locale}`,
        );
      }

      if (
        !query.reportSection ||
        !IDENTITY_REPORT_SECTION_IDS.includes(query.reportSection)
      ) {
        throw new KnowledgeError(
          "KNOWLEDGE_METADATA_INVALID",
          `Unsupported report section: ${query.reportSection}`,
        );
      }

      if (!query.knowledgeVersion || query.knowledgeVersion.trim().length === 0) {
        throw new KnowledgeError(
          "KNOWLEDGE_METADATA_INVALID",
          "Knowledge version must be specified",
        );
      }

      if (!query.text || query.text.trim().length === 0) {
        throw new KnowledgeError(
          "KNOWLEDGE_METADATA_INVALID",
          "Query text must not be empty",
        );
      }

      // Hard limits validation
      if (query.text.length > 512) {
        throw new KnowledgeError(
          "KNOWLEDGE_CONTEXT_LIMIT",
          "Query text must not exceed 512 characters",
        );
      }

      const maxPassages = query.maxPassages ?? 8;
      if (maxPassages < 1 || maxPassages > 8) {
        throw new KnowledgeError(
          "KNOWLEDGE_CONTEXT_LIMIT",
          "Passage limit must be between 1 and 8",
        );
      }

      const maxCharsPerPassage = query.maxCharsPerPassage ?? 1_200;
      if (maxCharsPerPassage < 1 || maxCharsPerPassage > 1_200) {
        throw new KnowledgeError(
          "KNOWLEDGE_CONTEXT_LIMIT",
          "Max chars per passage must be between 1 and 1,200",
        );
      }

      const maxTotalChars = query.maxTotalChars ?? 9_600;
      if (maxTotalChars < 1 || maxTotalChars > 9_600) {
        throw new KnowledgeError(
          "KNOWLEDGE_CONTEXT_LIMIT",
          "Max total characters must be between 1 and 9,600",
        );
      }

      // Extract words for fallback OR search query
      const words = query.text
        .replace(/[^\p{L}\p{N}]+/gu, " ")
        .trim()
        .split(/\s+/)
        .filter((w) => w.length > 0);

      const orQueryTokens = words
        .map((w) => `'${w.replace(/'/g, "''")}'`)
        .join(" | ");

      // Optional vector retrieval check
      let vectorScores = new Map<string, number>();
      if (
        query.enableVector === true &&
        query.vectorQuery !== undefined &&
        dependencies.vectorRetrieval
      ) {
        const ready = await dependencies.vectorRetrieval.isIndexReady();
        if (ready) {
          try {
            const vectorResults = await dependencies.vectorRetrieval.query({
              vectorQuery: query.vectorQuery,
              discipline: query.discipline,
              locale: query.locale,
              reportSection: query.reportSection,
              knowledgeVersion: query.knowledgeVersion,
              limit: maxPassages,
            });
            for (const item of vectorResults) {
              vectorScores.set(item.passageId, item.score);
            }
          } catch {
            // Silently fall back to full-text search
          }
        }
      }

      // Full-text search with simple configuration in PostgreSQL
      const querySectionJson = JSON.stringify([query.reportSection]);

      const rowsResult = await dependencies.database.execute<{
        id: string;
        passage_id: string;
        document_id: string;
        discipline: "ziwei";
        locale: "vi" | "en";
        report_sections: string[] | string;
        knowledge_version: string;
        content: string;
        content_hash: string;
        source_attribution: string;
        permitted_use: PermittedUseBasis;
        rank: number;
      }>(
        orQueryTokens.length > 0
          ? sql`
              SELECT 
                c.id,
                c.passage_id,
                c.document_id,
                c.discipline,
                c.locale,
                c.report_sections,
                c.knowledge_version,
                c.content,
                c.content_hash,
                c.source_attribution,
                c.permitted_use,
                ts_rank(to_tsvector('simple', c.content), plainto_tsquery('simple', ${query.text})) AS rank
              FROM knowledge_chunks c
              INNER JOIN knowledge_documents d ON d.id = c.document_id
              WHERE d.approval_status = 'approved'
                AND c.discipline = ${query.discipline}
                AND c.locale = ${query.locale}
                AND c.knowledge_version = ${query.knowledgeVersion}
                AND c.report_sections @> ${querySectionJson}::jsonb
                AND (
                  to_tsvector('simple', c.content) @@ plainto_tsquery('simple', ${query.text})
                  OR to_tsvector('simple', c.content) @@ to_tsquery('simple', ${orQueryTokens})
                )
              ORDER BY 
                ts_rank(to_tsvector('simple', c.content), plainto_tsquery('simple', ${query.text})) DESC,
                ts_rank(to_tsvector('simple', c.content), to_tsquery('simple', ${orQueryTokens})) DESC,
                c.passage_id ASC
              LIMIT ${maxPassages * 2}
            `
          : sql`
              SELECT 
                c.id,
                c.passage_id,
                c.document_id,
                c.discipline,
                c.locale,
                c.report_sections,
                c.knowledge_version,
                c.content,
                c.content_hash,
                c.source_attribution,
                c.permitted_use,
                ts_rank(to_tsvector('simple', c.content), plainto_tsquery('simple', ${query.text})) AS rank
              FROM knowledge_chunks c
              INNER JOIN knowledge_documents d ON d.id = c.document_id
              WHERE d.approval_status = 'approved'
                AND c.discipline = ${query.discipline}
                AND c.locale = ${query.locale}
                AND c.knowledge_version = ${query.knowledgeVersion}
                AND c.report_sections @> ${querySectionJson}::jsonb
                AND to_tsvector('simple', c.content) @@ plainto_tsquery('simple', ${query.text})
              ORDER BY rank DESC, c.passage_id ASC
              LIMIT ${maxPassages * 2}
            `,
      );

      const candidates: KnowledgePassageV1[] = [];
      const seenIds = new Set<string>();

      // Convert rows to typed passages
      for (const row of rowsResult) {
        if (seenIds.has(row.passage_id)) continue;
        seenIds.add(row.passage_id);

        const sections = Array.isArray(row.report_sections)
          ? row.report_sections
          : typeof row.report_sections === "string"
            ? JSON.parse(row.report_sections)
            : [];

        candidates.push({
          id: row.id,
          passageId: row.passage_id,
          documentId: row.document_id,
          discipline: row.discipline,
          locale: row.locale,
          reportSections: sections,
          knowledgeVersion: row.knowledge_version,
          content: row.content,
          contentHash: row.content_hash,
          sourceAttribution: row.source_attribution,
          permittedUse: row.permitted_use,
        });
      }

      // If vector scores exist, optionally re-sort candidates
      if (vectorScores.size > 0) {
        candidates.sort((a, b) => {
          const scoreA = vectorScores.get(a.passageId) ?? 0;
          const scoreB = vectorScores.get(b.passageId) ?? 0;
          if (scoreB !== scoreA) return scoreB - scoreA;
          return a.passageId.localeCompare(b.passageId);
        });
      }

      // Context truncation without splitting mid-passage
      const boundedPassages: KnowledgePassageV1[] = [];
      let totalChars = 0;

      for (const passage of candidates) {
        if (boundedPassages.length >= maxPassages) break;
        if (passage.content.length > maxCharsPerPassage) continue;
        if (totalChars + passage.content.length > maxTotalChars) break;

        boundedPassages.push(passage);
        totalChars += passage.content.length;
      }

      return boundedPassages;
    },
  };
}
