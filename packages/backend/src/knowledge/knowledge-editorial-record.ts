import { createHash } from "node:crypto";

import {
  IDENTITY_REPORT_SECTION_IDS,
  z,
} from "@lasoviet/contracts";

export const KNOWLEDGE_CHUNK_SOURCE_TYPES = ["modern", "classical", "matrix", "curated"] as const;
export type KnowledgeChunkSourceType = (typeof KNOWLEDGE_CHUNK_SOURCE_TYPES)[number];

export const KNOWLEDGE_CHUNK_LANGUAGE_ORIGINS = ["vi", "zh", "en"] as const;
export type KnowledgeChunkLanguageOrigin = (typeof KNOWLEDGE_CHUNK_LANGUAGE_ORIGINS)[number];

export const KNOWLEDGE_CHUNK_PRIORITIES = [1, 2, 3] as const;
export type KnowledgeChunkPriority = (typeof KNOWLEDGE_CHUNK_PRIORITIES)[number];

export type KnowledgeChunkMetadataV1 = {
  topics: string[];
  palaces: string[];
  stars: string[];
  brightness: string[];
  transformations: string[];
  relations: string[];
  patterns: string[];
  sourceType: KnowledgeChunkSourceType;
  languageOrigin: KnowledgeChunkLanguageOrigin;
  priority: KnowledgeChunkPriority;
};

export const KnowledgeChunkMetadataV1Schema = z.object({
  topics: z.array(z.string().trim()),
  palaces: z.array(z.string().trim()),
  stars: z.array(z.string().trim()),
  brightness: z.array(z.string().trim()),
  transformations: z.array(z.string().trim()),
  relations: z.array(z.string().trim()),
  patterns: z.array(z.string().trim()),
  sourceType: z.enum(KNOWLEDGE_CHUNK_SOURCE_TYPES),
  languageOrigin: z.enum(KNOWLEDGE_CHUNK_LANGUAGE_ORIGINS),
  priority: z.union([z.literal(1), z.literal(2), z.literal(3)]),
}).strict();

export const KnowledgeChunkManifestSchema = z.object({
  passageId: z.string().trim().min(1).max(120),
  reportSections: z.array(z.enum(IDENTITY_REPORT_SECTION_IDS)).min(1),
  content: z.string().trim().min(1).max(1_200),
  contentHash: z.string().regex(/^[0-9a-f]{64}$/),
  metadata: KnowledgeChunkMetadataV1Schema.optional(),
}).strict();
export type KnowledgeChunkManifest = z.infer<typeof KnowledgeChunkManifestSchema>;

export const KnowledgeEditorialRecordV1Schema = KnowledgeChunkManifestSchema.extend({
  metadata: KnowledgeChunkMetadataV1Schema,
  sourcePassageIds: z.array(z.string().trim().min(1).max(120)).min(1),
  dispositionRationaleCode: z.enum(["rewritten", "merged", "split"]),
}).strict();
export type KnowledgeEditorialRecordV1 = z.infer<typeof KnowledgeEditorialRecordV1Schema>;

export function computeChunkContentHash(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex").toLowerCase();
}
