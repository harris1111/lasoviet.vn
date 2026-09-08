import { inArray, sql } from "drizzle-orm";
import {
  IDENTITY_REPORT_SECTION_IDS,
  type IdentityReportSectionId,
} from "@lasoviet/contracts";
import type { Database } from "@lasoviet/database";
import {
  type PermittedUseBasis,
  type KnowledgeChunkMetadataV1,
  normalizeChunkMetadata,
} from "./knowledge-ingestion.service.js";

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
  metadata?: KnowledgeChunkMetadataV1;
};

export type ZiweiKnowledgeQueryV3 = {
  locale: "vi";
  knowledgeVersion: "ziwei.comprehensive.knowledge.v3";
  topics?: string[];
  palaceIds?: string[];
  starIds?: string[];
  brightnessIds?: string[];
  transformationIds?: string[];
  relationIds?: string[];
  patternIds?: string[];
  text: string;
  maxPassages: number;
  maxTotalChars: number;
};

function computeZiweiMetadataScore(
  query: ZiweiKnowledgeQueryV3,
  metadata?: KnowledgeChunkMetadataV1,
): number {
  if (!metadata) return 0;
  let score = 0;
  if (query.patternIds && query.patternIds.some((id) => metadata.patterns?.includes(id))) {
    score += 100;
  }
  if (query.palaceIds && query.palaceIds.some((id) => metadata.palaces?.includes(id))) {
    score += 40;
  }
  if (query.starIds && query.starIds.some((id) => metadata.stars?.includes(id))) {
    score += 30;
  }
  if (
    query.transformationIds &&
    query.transformationIds.some((id) => metadata.transformations?.includes(id))
  ) {
    score += 20;
  }
  if (
    query.brightnessIds &&
    query.brightnessIds.some((id) => metadata.brightness?.includes(id))
  ) {
    score += 10;
  }
  if (query.relationIds && query.relationIds.some((id) => metadata.relations?.includes(id))) {
    score += 8;
  }
  if (query.topics && query.topics.some((id) => metadata.topics?.includes(id))) {
    score += 4;
  }
  return score;
}

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

function validateIntegerLimit(
  val: number | undefined,
  defaultValue: number,
  min: number,
  max: number,
  name: string,
): number {
  if (val === undefined) return defaultValue;
  if (
    typeof val !== "number" ||
    !Number.isFinite(val) ||
    !Number.isInteger(val) ||
    val < min ||
    val > max
  ) {
    throw new KnowledgeError(
      "KNOWLEDGE_CONTEXT_LIMIT",
      `${name} must be a finite integer between ${min} and ${max}`,
    );
  }
  return val;
}

function toTextArraySql(items: readonly string[]) {
  if (items.length === 0) {
    return sql`ARRAY[]::text[]`;
  }
  return sql`ARRAY[${sql.join(
    items.map((item) => sql`${item}`),
    sql`, `,
  )}]::text[]`;
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

      const maxPassages = validateIntegerLimit(
        query.maxPassages,
        8,
        1,
        8,
        "maxPassages",
      );
      const maxCharsPerPassage = validateIntegerLimit(
        query.maxCharsPerPassage,
        1_200,
        1,
        1_200,
        "maxCharsPerPassage",
      );
      const maxTotalChars = validateIntegerLimit(
        query.maxTotalChars,
        9_600,
        1,
        9_600,
        "maxTotalChars",
      );

      // Extract words for fallback OR search query
      const words = query.text
        .replace(/[^\p{L}\p{N}]+/gu, " ")
        .trim()
        .split(/\s+/)
        .filter((w) => w.length > 0);

      const orQueryTokens = words
        .map((w) => `'${w.replace(/'/g, "''")}'`)
        .join(" | ");

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
        metadata?: unknown;
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
                c.metadata,
                GREATEST(
                  ts_rank(to_tsvector('simple', c.content), plainto_tsquery('simple', ${query.text})),
                  ts_rank(to_tsvector('simple', c.content), to_tsquery('simple', ${orQueryTokens}))
                ) AS rank
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
              ORDER BY rank DESC, c.passage_id ASC
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
                c.metadata,
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

      const ftsCandidates: KnowledgePassageV1[] = [];
      const seenIds = new Set<string>();

      for (const row of rowsResult) {
        if (seenIds.has(row.passage_id)) continue;
        seenIds.add(row.passage_id);

        const sections = Array.isArray(row.report_sections)
          ? row.report_sections
          : typeof row.report_sections === "string"
            ? JSON.parse(row.report_sections)
            : [];

        const rawMeta = typeof row.metadata === "string" ? JSON.parse(row.metadata) : row.metadata;
        const normalizedMeta = rawMeta && typeof rawMeta === "object" && Object.keys(rawMeta).length > 0
          ? normalizeChunkMetadata(rawMeta as KnowledgeChunkMetadataV1, row.locale)
          : normalizeChunkMetadata(undefined, row.locale);

        ftsCandidates.push({
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
          metadata: normalizedMeta,
        });
      }

      // Optional vector augmentation: vector results NEVER replace FTS order.
      // Vector can only append non-FTS candidates after FTS candidates, subject to all filters.
      const vectorAugmentedCandidates: KnowledgePassageV1[] = [];

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

            // Find vector candidates not already found by FTS
            const vectorOnlyItems = vectorResults.filter(
              (item) => !seenIds.has(item.passageId),
            );

            if (vectorOnlyItems.length > 0) {
              const vectorOnlyIds = vectorOnlyItems.map((v) => v.passageId);
              const vectorScoreMap = new Map(
                vectorOnlyItems.map((v) => [v.passageId, v.score]),
              );

              const extraRows = await dependencies.database.execute<{
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
                metadata?: unknown;
              }>(
                sql`
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
                    c.metadata
                  FROM knowledge_chunks c
                  INNER JOIN knowledge_documents d ON d.id = c.document_id
                  WHERE d.approval_status = 'approved'
                    AND c.discipline = ${query.discipline}
                    AND c.locale = ${query.locale}
                    AND c.knowledge_version = ${query.knowledgeVersion}
                    AND c.report_sections @> ${querySectionJson}::jsonb
                    AND c.passage_id = ANY(${toTextArraySql(vectorOnlyIds)})
                `,
              );

              const extraCandidates: Array<{
                passage: KnowledgePassageV1;
                score: number;
              }> = [];

              for (const row of extraRows) {
                if (seenIds.has(row.passage_id)) continue;
                seenIds.add(row.passage_id);

                const sections = Array.isArray(row.report_sections)
                  ? row.report_sections
                  : typeof row.report_sections === "string"
                    ? JSON.parse(row.report_sections)
                    : [];
                const rawMeta = typeof row.metadata === "string" ? JSON.parse(row.metadata) : row.metadata;
                const normalizedMeta = rawMeta && typeof rawMeta === "object" && Object.keys(rawMeta).length > 0
                  ? normalizeChunkMetadata(rawMeta as KnowledgeChunkMetadataV1, row.locale)
                  : normalizeChunkMetadata(undefined, row.locale);

                extraCandidates.push({
                  passage: {
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
                    metadata: normalizedMeta,
                  },
                  score: vectorScoreMap.get(row.passage_id) ?? 0,
                });
              }

              // Sort extra vector candidates by score DESC, passageId ASC
              extraCandidates.sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                return a.passage.passageId.localeCompare(b.passage.passageId);
              });

              for (const item of extraCandidates) {
                vectorAugmentedCandidates.push(item.passage);
              }
            }
          } catch {
            // Silently fall back to full-text only
          }
        }
      }

      // Preserve strict FTS rank-descending, passageId-ascending order first,
      // followed by any vector-only additions
      const allOrderedCandidates = [
        ...ftsCandidates,
        ...vectorAugmentedCandidates,
      ];

      // Truncate according to context limits without splitting mid-passage
      const boundedPassages: KnowledgePassageV1[] = [];
      let totalChars = 0;

      for (const passage of allOrderedCandidates) {
        if (boundedPassages.length >= maxPassages) break;
        if (passage.content.length > maxCharsPerPassage) continue;
        if (totalChars + passage.content.length > maxTotalChars) break;

        boundedPassages.push(passage);
        totalChars += passage.content.length;
      }

      return boundedPassages;
    },

    async retrieveZiweiKnowledge(
      query: ZiweiKnowledgeQueryV3,
    ): Promise<KnowledgePassageV1[]> {
      if (query.locale !== "vi") {
        throw new KnowledgeError(
          "KNOWLEDGE_METADATA_INVALID",
          `Unsupported locale: ${query.locale}`,
        );
      }

      if (query.knowledgeVersion !== "ziwei.comprehensive.knowledge.v3") {
        throw new KnowledgeError(
          "KNOWLEDGE_METADATA_INVALID",
          `Unsupported knowledge version: ${query.knowledgeVersion}`,
        );
      }

      if (!query.text || query.text.trim().length === 0) {
        throw new KnowledgeError(
          "KNOWLEDGE_METADATA_INVALID",
          "Query text must not be empty",
        );
      }

      if (query.text.length > 512) {
        throw new KnowledgeError(
          "KNOWLEDGE_CONTEXT_LIMIT",
          "Query text must not exceed 512 characters",
        );
      }

      const maxPassages = validateIntegerLimit(
        query.maxPassages,
        2,
        1,
        50,
        "maxPassages",
      );

      const maxTotalChars = validateIntegerLimit(
        query.maxTotalChars,
        1800,
        1,
        32000,
        "maxTotalChars",
      );

      const words = query.text
        .replace(/[^\p{L}\p{N}]+/gu, " ")
        .trim()
        .split(/\s+/)
        .filter((w) => w.length > 0);

      const orQueryTokens = words
        .map((w) => `'${w.replace(/'/g, "''")}'`)
        .join(" | ");

      const hasPatterns = query.patternIds && query.patternIds.length > 0;
      const hasPalaces = query.palaceIds && query.palaceIds.length > 0;
      const hasStars = query.starIds && query.starIds.length > 0;
      const hasTransformations = query.transformationIds && query.transformationIds.length > 0;
      const hasBrightness = query.brightnessIds && query.brightnessIds.length > 0;
      const hasRelations = query.relationIds && query.relationIds.length > 0;
      const hasTopics = query.topics && query.topics.length > 0;

      const patternScoreSql = hasPatterns
        ? sql`CASE WHEN c.metadata->'patterns' ?| ${toTextArraySql(query.patternIds!)} THEN 100 ELSE 0 END`
        : sql`0`;
      const palaceScoreSql = hasPalaces
        ? sql`CASE WHEN c.metadata->'palaces' ?| ${toTextArraySql(query.palaceIds!)} THEN 40 ELSE 0 END`
        : sql`0`;
      const starScoreSql = hasStars
        ? sql`CASE WHEN c.metadata->'stars' ?| ${toTextArraySql(query.starIds!)} THEN 30 ELSE 0 END`
        : sql`0`;
      const transformationScoreSql = hasTransformations
        ? sql`CASE WHEN c.metadata->'transformations' ?| ${toTextArraySql(query.transformationIds!)} THEN 20 ELSE 0 END`
        : sql`0`;
      const brightnessScoreSql = hasBrightness
        ? sql`CASE WHEN c.metadata->'brightness' ?| ${toTextArraySql(query.brightnessIds!)} THEN 10 ELSE 0 END`
        : sql`0`;
      const relationScoreSql = hasRelations
        ? sql`CASE WHEN c.metadata->'relations' ?| ${toTextArraySql(query.relationIds!)} THEN 8 ELSE 0 END`
        : sql`0`;
      const topicScoreSql = hasTopics
        ? sql`CASE WHEN c.metadata->'topics' ?| ${toTextArraySql(query.topics!)} THEN 4 ELSE 0 END`
        : sql`0`;

      const textRankSql = orQueryTokens.length > 0
        ? sql`GREATEST(
            ts_rank(to_tsvector('simple', c.content), plainto_tsquery('simple', ${query.text})),
            ts_rank(to_tsvector('simple', c.content), to_tsquery('simple', ${orQueryTokens}))
          )`
        : sql`ts_rank(to_tsvector('simple', c.content), plainto_tsquery('simple', ${query.text}))`;

      const rowsResult = await dependencies.database.execute<{
        id: string;
        passage_id: string;
        document_id: string;
        discipline: "ziwei";
        locale: "vi";
        report_sections: string[] | string;
        knowledge_version: string;
        content: string;
        content_hash: string;
        source_attribution: string;
        permitted_use: PermittedUseBasis;
        metadata?: unknown;
        rank?: number;
      }>(
        sql`
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
            c.metadata,
            ${textRankSql} AS rank
          FROM knowledge_chunks c
          INNER JOIN knowledge_documents d ON d.id = c.document_id
          WHERE d.approval_status = 'approved'
            AND c.discipline = 'ziwei'
            AND c.locale = ${query.locale}
            AND c.knowledge_version = ${query.knowledgeVersion}
          ORDER BY
            (${patternScoreSql} + ${palaceScoreSql} + ${starScoreSql} + ${transformationScoreSql} + ${brightnessScoreSql} + ${relationScoreSql} + ${topicScoreSql}) DESC,
            COALESCE((c.metadata->>'priority')::numeric, 1) DESC,
            rank DESC,
            c.passage_id ASC
        `,
      );

      const candidates: Array<
        KnowledgePassageV1 & { metadataScore: number; textRank: number }
      > = [];

      for (const row of rowsResult) {
        const sections = Array.isArray(row.report_sections)
          ? row.report_sections
          : typeof row.report_sections === "string"
            ? JSON.parse(row.report_sections)
            : [];

        const rawMeta =
          typeof row.metadata === "string" ? JSON.parse(row.metadata) : row.metadata;
        const normalizedMeta =
          rawMeta && typeof rawMeta === "object" && Object.keys(rawMeta).length > 0
            ? normalizeChunkMetadata(rawMeta as KnowledgeChunkMetadataV1, row.locale)
            : normalizeChunkMetadata(undefined, row.locale);

        const metadataScore = computeZiweiMetadataScore(query, normalizedMeta);
        const textRank =
          typeof row.rank === "number" ? row.rank : Number(row.rank ?? 0);

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
          metadata: normalizedMeta,
          metadataScore,
          textRank,
        });
      }

      candidates.sort((a, b) => {
        const scoreDiff = b.metadataScore - a.metadataScore;
        if (scoreDiff !== 0) return scoreDiff;
        const priorityDiff =
          (b.metadata?.priority ?? 1) - (a.metadata?.priority ?? 1);
        if (priorityDiff !== 0) return priorityDiff;
        const rankDiff = b.textRank - a.textRank;
        if (Math.abs(rankDiff) > 1e-6) return rankDiff;
        return a.passageId.localeCompare(b.passageId);
      });

      const seenContentHashes = new Set<string>();
      const seenPassageIds = new Set<string>();
      const boundedPassages: KnowledgePassageV1[] = [];
      let totalChars = 0;

      for (const candidate of candidates) {
        if (boundedPassages.length >= maxPassages) break;
        if (seenContentHashes.has(candidate.contentHash)) continue;
        if (seenPassageIds.has(candidate.passageId)) continue;
        if (totalChars + candidate.content.length > maxTotalChars) continue;

        seenContentHashes.add(candidate.contentHash);
        seenPassageIds.add(candidate.passageId);
        boundedPassages.push(candidate);
        totalChars += candidate.content.length;
      }

      return boundedPassages;
    },

  };
}
