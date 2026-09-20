import { createHash } from "node:crypto";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { isAbsolute, normalize, resolve, sep } from "node:path";
import { and, eq, inArray } from "drizzle-orm";
import {
  z,
} from "@lasoviet/contracts";
import { ziweiKnowledgeV4ValidationV1 } from "@lasoviet/config";
import {
  knowledgeChunks,
  knowledgeChunkProvenanceEdges,
  knowledgeDocuments,
  type Database,
} from "@lasoviet/database";
import {
  computeChunkContentHash,
  KnowledgeChunkManifestSchema,
  KnowledgeChunkMetadataV1Schema,
  KnowledgeEditorialRecordV1Schema,
  type KnowledgeChunkManifest,
  type KnowledgeChunkMetadataV1,
  type KnowledgeEditorialRecordV1,
} from "./knowledge-editorial-record.js";
import { validateZiweiKnowledgeV4Record } from "./ziwei-knowledge-v4-validator.js";

export {
  computeChunkContentHash,
  KNOWLEDGE_CHUNK_LANGUAGE_ORIGINS,
  KNOWLEDGE_CHUNK_PRIORITIES,
  KNOWLEDGE_CHUNK_SOURCE_TYPES,
  KnowledgeChunkManifestSchema,
  KnowledgeChunkMetadataV1Schema,
  KnowledgeEditorialRecordV1Schema,
} from "./knowledge-editorial-record.js";
export type {
  KnowledgeChunkManifest,
  KnowledgeChunkMetadataV1,
  KnowledgeEditorialRecordV1,
  KnowledgeChunkLanguageOrigin,
  KnowledgeChunkPriority,
  KnowledgeChunkSourceType,
} from "./knowledge-editorial-record.js";

export const PERMITTED_USE_BASES = ["first_party", "licensed", "public_domain", "reference_rewrite"] as const;

export function normalizeChunkMetadata(
  metadata: KnowledgeChunkMetadataV1 | undefined,
  locale: "vi" | "en",
): KnowledgeChunkMetadataV1 {
  if (metadata) {
    return {
      topics: Array.isArray(metadata.topics) ? [...metadata.topics] : [],
      palaces: Array.isArray(metadata.palaces) ? [...metadata.palaces] : [],
      stars: Array.isArray(metadata.stars) ? [...metadata.stars] : [],
      brightness: Array.isArray(metadata.brightness) ? [...metadata.brightness] : [],
      transformations: Array.isArray(metadata.transformations) ? [...metadata.transformations] : [],
      relations: Array.isArray(metadata.relations) ? [...metadata.relations] : [],
      patterns: Array.isArray(metadata.patterns) ? [...metadata.patterns] : [],
      sourceType: metadata.sourceType ?? "curated",
      languageOrigin: metadata.languageOrigin ?? locale,
      priority: metadata.priority ?? 1,
    };
  }
  return {
    topics: [],
    palaces: [],
    stars: [],
    brightness: [],
    transformations: [],
    relations: [],
    patterns: [],
    sourceType: "curated",
    languageOrigin: locale,
    priority: 1,
  };
}

export function areMetadatasEqual(a: KnowledgeChunkMetadataV1, b: KnowledgeChunkMetadataV1): boolean {
  if (a.sourceType !== b.sourceType || a.languageOrigin !== b.languageOrigin || a.priority !== b.priority) {
    return false;
  }
  const keys: Array<keyof Pick<KnowledgeChunkMetadataV1, "topics" | "palaces" | "stars" | "brightness" | "transformations" | "relations" | "patterns">> = [
    "topics", "palaces", "stars", "brightness", "transformations", "relations", "patterns"
  ];
  for (const k of keys) {
    if (a[k].length !== b[k].length) return false;
    for (let i = 0; i < a[k].length; i++) {
      if (a[k][i] !== b[k][i]) return false;
    }
  }
  return true;
}
export type PermittedUseBasis = (typeof PERMITTED_USE_BASES)[number];

export const APPROVAL_STATUSES = ["draft", "approved", "rejected"] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export const KNOWLEDGE_VERSION_PATTERN = /^[a-z0-9-]+\.[a-z0-9-]+\.[a-z0-9-]+\.v[0-9]+$/;

export const KnowledgeApprovalRecordSchema = z.object({
  status: z.enum(APPROVAL_STATUSES),
  approver: z.string().trim(),
  approvedAt: z.string().datetime(),
}).strict();

export const KnowledgeManifestV1Schema = z.object({
  documentId: z.string().trim().min(1).max(120),
  knowledgeVersion: z.string().trim().regex(KNOWLEDGE_VERSION_PATTERN).min(1).max(80),
  discipline: z.literal("ziwei"),
  locale: z.enum(["vi", "en"]),
  sourcePath: z.string().trim().min(1),
  sourceAttribution: z.string().trim().min(1).max(255),
  permittedUse: z.enum(PERMITTED_USE_BASES),
  contentHash: z.string().regex(/^[0-9a-f]{64}$/),
  approval: KnowledgeApprovalRecordSchema,
  chunks: z.array(KnowledgeChunkManifestSchema).min(1),
}).strict();

export type KnowledgeManifestV1 = z.infer<typeof KnowledgeManifestV1Schema>;

export const V3_DISPOSITION_CODES = [
  "rewritten",
  "merged",
  "split",
  "omitted_oral_filler",
  "omitted_death_only",
] as const;
export type V3DispositionCode = (typeof V3_DISPOSITION_CODES)[number];

const CANONICAL_V3_MANIFEST_PATH =
  "content/knowledge/vi/ziwei/comprehensive-report.v3.json";

export const KnowledgeProvenanceEdgeV1Schema = z.object({
  outputKnowledgeVersion: z.literal("ziwei.comprehensive.knowledge.v4"),
  outputPassageId: z.string().trim().min(1).max(120),
  sourceKnowledgeVersion: z.literal("ziwei.comprehensive.knowledge.v3"),
  sourcePassageId: z.string().trim().min(1).max(120),
}).strict();
export type KnowledgeProvenanceEdgeV1 = z.infer<typeof KnowledgeProvenanceEdgeV1Schema>;

export const V3DispositionLedgerEntryV1Schema = z.object({
  sourcePassageId: z.string().trim().min(1).max(120),
  disposition: z.enum(V3_DISPOSITION_CODES),
  outputPassageIds: z.array(z.string().trim().min(1).max(120)),
}).strict().superRefine((entry, context) => {
  const omitsSource = entry.disposition === "omitted_oral_filler" ||
    entry.disposition === "omitted_death_only";
  if (omitsSource !== (entry.outputPassageIds.length === 0)) {
    context.addIssue({
      code: "custom",
      message: "Omitted sources must have no output passage IDs; emitted sources require output passage IDs",
    });
  }
});
export type V3DispositionLedgerEntryV1 = z.infer<typeof V3DispositionLedgerEntryV1Schema>;

export const V3DispositionLedgerV1Schema = z.object({
  ledgerSchemaVersion: z.literal("ziwei.v3-disposition-ledger.v1"),
  sourceKnowledgeVersion: z.literal("ziwei.comprehensive.knowledge.v3"),
  outputKnowledgeVersion: z.literal("ziwei.comprehensive.knowledge.v4"),
  candidateHash: z.string().regex(/^[0-9a-f]{64}$/),
  entries: z.array(V3DispositionLedgerEntryV1Schema).min(1),
}).strict();
export type V3DispositionLedgerV1 = z.infer<typeof V3DispositionLedgerV1Schema>;

function compareCodePoints(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function normalizeNfc(value: string): string {
  return value.normalize("NFC");
}

function canonicalizeStringSet(values: readonly string[]): string[] {
  return values.map(normalizeNfc).sort(compareCodePoints);
}

export function canonicalizeV3DispositionLedgerPayload(
  ledger: V3DispositionLedgerV1,
) {
  return {
    ledgerSchemaVersion: ledger.ledgerSchemaVersion,
    sourceKnowledgeVersion: ledger.sourceKnowledgeVersion,
    outputKnowledgeVersion: ledger.outputKnowledgeVersion,
    entries: ledger.entries
      .map((entry) => ({
        sourcePassageId: normalizeNfc(entry.sourcePassageId),
        disposition: entry.disposition,
        outputPassageIds: canonicalizeStringSet(entry.outputPassageIds),
      }))
      .sort((left, right) => compareCodePoints(
        left.sourcePassageId,
        right.sourcePassageId,
      )),
  };
}

export function computeDispositionLedgerPayloadHash(
  ledger: V3DispositionLedgerV1,
): string {
  return computeChunkContentHash(JSON.stringify(
    canonicalizeV3DispositionLedgerPayload(ledger),
  ));
}

export const KnowledgeManifestV2Schema = KnowledgeManifestV1Schema.extend({
  manifestSchemaVersion: z.literal("knowledge-manifest.v2"),
  knowledgeVersion: z.literal("ziwei.comprehensive.knowledge.v4"),
  candidateHash: z.string().regex(/^[0-9a-f]{64}$/),
  assemblyVersion: z.string().trim().min(1).max(120),
  provenanceSchemaVersion: z.literal("knowledge-provenance.v1"),
  dispositionLedgerPath: z.string().trim().min(1),
  dispositionLedgerHash: z.string().regex(/^[0-9a-f]{64}$/),
  chunks: z.array(KnowledgeEditorialRecordV1Schema).min(1),
}).strict();
export type KnowledgeManifestV2 = z.infer<typeof KnowledgeManifestV2Schema>;

export function canonicalizeKnowledgeEditorialChunks(
  chunks: readonly KnowledgeEditorialRecordV1[],
): KnowledgeEditorialRecordV1[] {
  return chunks
    .map((chunk) => ({
      passageId: normalizeNfc(chunk.passageId),
      reportSections: canonicalizeStringSet(chunk.reportSections) as KnowledgeEditorialRecordV1["reportSections"],
      content: normalizeNfc(chunk.content),
      contentHash: normalizeNfc(chunk.contentHash),
      metadata: {
        topics: canonicalizeStringSet(chunk.metadata.topics),
        palaces: canonicalizeStringSet(chunk.metadata.palaces),
        stars: canonicalizeStringSet(chunk.metadata.stars),
        brightness: canonicalizeStringSet(chunk.metadata.brightness),
        transformations: canonicalizeStringSet(chunk.metadata.transformations),
        relations: canonicalizeStringSet(chunk.metadata.relations),
        patterns: canonicalizeStringSet(chunk.metadata.patterns),
        sourceType: chunk.metadata.sourceType,
        languageOrigin: chunk.metadata.languageOrigin,
        priority: chunk.metadata.priority,
      },
      sourcePassageIds: canonicalizeStringSet(chunk.sourcePassageIds),
      dispositionRationaleCode: chunk.dispositionRationaleCode,
    }))
    .sort((left, right) => compareCodePoints(left.passageId, right.passageId));
}

export function canonicalizeKnowledgeProvenanceEdges(
  edges: readonly KnowledgeProvenanceEdgeV1[],
): KnowledgeProvenanceEdgeV1[] {
  return edges
    .map((edge) => ({
      outputKnowledgeVersion: edge.outputKnowledgeVersion,
      outputPassageId: normalizeNfc(edge.outputPassageId),
      sourceKnowledgeVersion: edge.sourceKnowledgeVersion,
      sourcePassageId: normalizeNfc(edge.sourcePassageId),
    }))
    .sort((left, right) => compareCodePoints(
      JSON.stringify(left),
      JSON.stringify(right),
    ));
}

export function computeKnowledgeProvenanceEdgeId(
  edge: KnowledgeProvenanceEdgeV1,
): string {
  const [canonicalEdge] = canonicalizeKnowledgeProvenanceEdges([edge]);
  return `knowledge-provenance-edge:${computeChunkContentHash(
    JSON.stringify(canonicalEdge),
  )}`;
}

export function computeKnowledgeV4CandidateHash(input: {
  chunks: readonly KnowledgeEditorialRecordV1[];
  provenanceEdges: readonly KnowledgeProvenanceEdgeV1[];
  dispositionLedgerHash: string;
  assemblyVersion: string;
}): string {
  return computeChunkContentHash(JSON.stringify({
    chunks: canonicalizeKnowledgeEditorialChunks(input.chunks),
    provenanceEdges: canonicalizeKnowledgeProvenanceEdges(input.provenanceEdges),
    dispositionLedgerHash: normalizeNfc(input.dispositionLedgerHash),
    policyVersion: ziweiKnowledgeV4ValidationV1.version,
    assemblerVersion: normalizeNfc(input.assemblyVersion),
  }));
}

export function computeDocumentContentHash(chunks: Array<{ content: string }>): string {
  const concatenated = chunks.map((c) => c.content).join("\n\n");
  return createHash("sha256").update(concatenated, "utf8").digest("hex").toLowerCase();
}

type KnowledgeManifestV2ValidationResult =
  | {
      ok: true;
      value: KnowledgeManifestV2;
      ledger: V3DispositionLedgerV1;
      provenanceEdges: KnowledgeProvenanceEdgeV1[];
    }
  | { ok: false; code: "KNOWLEDGE_METADATA_INVALID"; message: string };

function resolveRepositoryFile(
  sourcePath: string,
  repositoryRoot: string,
): { ok: true; path: string } | { ok: false; message: string } {
  const normalizedSource = normalize(sourcePath);
  if (
    isAbsolute(sourcePath) ||
    normalizedSource.startsWith("..") ||
    sourcePath.includes("..")
  ) {
    return {
      ok: false,
      message: "Source path must be repository-relative and non-traversing",
    };
  }

  const resolvedSourcePath = resolve(repositoryRoot, normalizedSource);
  if (
    !resolvedSourcePath.startsWith(repositoryRoot + sep) &&
    resolvedSourcePath !== repositoryRoot
  ) {
    return {
      ok: false,
      message: "Source path escapes repository root boundary",
    };
  }
  if (!existsSync(resolvedSourcePath)) {
    return {
      ok: false,
      message: `Source file does not exist at ${sourcePath}`,
    };
  }

  try {
    const canonicalRepoRoot = realpathSync(repositoryRoot);
    const canonicalSourcePath = realpathSync(resolvedSourcePath);
    if (
      canonicalSourcePath !== canonicalRepoRoot &&
      !canonicalSourcePath.startsWith(canonicalRepoRoot + sep)
    ) {
      return {
        ok: false,
        message: "Source path escapes repository root boundary",
      };
    }
  } catch {
    return { ok: false, message: "Source path resolution failed" };
  }

  return { ok: true, path: resolvedSourcePath };
}

export function validateKnowledgeManifestV2(
  input: unknown,
  options?: { repositoryRoot?: string },
): KnowledgeManifestV2ValidationResult {
  const parsed = KnowledgeManifestV2Schema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "KNOWLEDGE_METADATA_INVALID",
      message: `Invalid V2 knowledge manifest schema: ${parsed.error.message}`,
    };
  }

  const manifest = parsed.data;
  const passageIds = new Set<string>();
  for (const chunk of manifest.chunks) {
    if (passageIds.has(chunk.passageId)) {
      return {
        ok: false,
        code: "KNOWLEDGE_METADATA_INVALID",
        message: `Duplicate passageId in manifest: ${chunk.passageId}`,
      };
    }
    passageIds.add(chunk.passageId);
    if (computeChunkContentHash(chunk.content) !== chunk.contentHash) {
      return {
        ok: false,
        code: "KNOWLEDGE_METADATA_INVALID",
        message: `Content hash mismatch for chunk ${chunk.passageId}`,
      };
    }
    const recordValidation = validateZiweiKnowledgeV4Record(chunk);
    if (!recordValidation.ok) {
      const issue = recordValidation.issues[0];
      return {
        ok: false,
        code: "KNOWLEDGE_METADATA_INVALID",
        message: `V4 chunk ${chunk.passageId} violates ${issue?.code ?? "V4_RECORD_INVALID"}`,
      };
    }
  }
  if (computeDocumentContentHash(manifest.chunks) !== manifest.contentHash) {
    return {
      ok: false,
      code: "KNOWLEDGE_METADATA_INVALID",
      message: "Document content hash mismatch",
    };
  }

  const repositoryRoot = options?.repositoryRoot
    ? resolve(options.repositoryRoot)
    : resolve(process.cwd());
  const sourcePath = resolveRepositoryFile(manifest.sourcePath, repositoryRoot);
  if (!sourcePath.ok) {
    return {
      ok: false,
      code: "KNOWLEDGE_METADATA_INVALID",
      message: `Invalid V2 source path: ${sourcePath.message}`,
    };
  }
  const ledgerPath = resolveRepositoryFile(
    manifest.dispositionLedgerPath,
    repositoryRoot,
  );
  if (!ledgerPath.ok) {
    return {
      ok: false,
      code: "KNOWLEDGE_METADATA_INVALID",
      message: `Invalid disposition ledger path: ${ledgerPath.message}`,
    };
  }
  const canonicalV3Path = resolveRepositoryFile(
    CANONICAL_V3_MANIFEST_PATH,
    repositoryRoot,
  );
  if (!canonicalV3Path.ok) {
    return {
      ok: false,
      code: "KNOWLEDGE_METADATA_INVALID",
      message: `Invalid canonical V3 manifest path: ${canonicalV3Path.message}`,
    };
  }

  let canonicalV3Manifest: KnowledgeManifestV1;
  try {
    const v3Validation = validateKnowledgeManifest(
      JSON.parse(readFileSync(canonicalV3Path.path, "utf8")),
      { repositoryRoot },
    );
    if (!v3Validation.ok) {
      return {
        ok: false,
        code: "KNOWLEDGE_METADATA_INVALID",
        message: "Canonical V3 manifest is invalid",
      };
    }
    canonicalV3Manifest = v3Validation.value;
  } catch {
    return {
      ok: false,
      code: "KNOWLEDGE_METADATA_INVALID",
      message: "Canonical V3 manifest could not be read",
    };
  }
  if (
    canonicalV3Manifest.knowledgeVersion !==
    "ziwei.comprehensive.knowledge.v3"
  ) {
    return {
      ok: false,
      code: "KNOWLEDGE_METADATA_INVALID",
      message: "Canonical V3 manifest has an unexpected knowledge version",
    };
  }
  const canonicalV3PassageIds = new Set(
    canonicalV3Manifest.chunks.map((chunk) => chunk.passageId),
  );

  let ledgerSource: string;
  let ledger: V3DispositionLedgerV1;
  try {
    ledgerSource = readFileSync(ledgerPath.path, "utf8");
    const parsedLedger = V3DispositionLedgerV1Schema.safeParse(
      JSON.parse(ledgerSource),
    );
    if (!parsedLedger.success) {
      return {
        ok: false,
        code: "KNOWLEDGE_METADATA_INVALID",
        message: `Invalid V3 disposition ledger schema: ${parsedLedger.error.message}`,
      };
    }
    ledger = parsedLedger.data;
  } catch {
    return {
      ok: false,
      code: "KNOWLEDGE_METADATA_INVALID",
      message: "Disposition ledger could not be read",
    };
  }

  if (computeDispositionLedgerPayloadHash(ledger) !== manifest.dispositionLedgerHash) {
    return {
      ok: false,
      code: "KNOWLEDGE_METADATA_INVALID",
      message: "Disposition ledger hash mismatch",
    };
  }
  if (ledger.candidateHash !== manifest.candidateHash) {
    return {
      ok: false,
      code: "KNOWLEDGE_METADATA_INVALID",
      message: "Disposition ledger candidate hash mismatch",
    };
  }

  const outputPassagesBySource = new Map<string, Set<string>>();
  const provenanceEdges: KnowledgeProvenanceEdgeV1[] = [];
  for (const chunk of manifest.chunks) {
    const sourcePassageIds = new Set<string>();
    for (const sourcePassageId of chunk.sourcePassageIds) {
      if (sourcePassageIds.has(sourcePassageId)) {
        return {
          ok: false,
          code: "KNOWLEDGE_METADATA_INVALID",
          message: `Duplicate source passage ID for chunk ${chunk.passageId}`,
        };
      }
      sourcePassageIds.add(sourcePassageId);
      outputPassagesBySource.set(
        sourcePassageId,
        new Set([
          ...(outputPassagesBySource.get(sourcePassageId) ?? []),
          chunk.passageId,
        ]),
      );
      const edge = KnowledgeProvenanceEdgeV1Schema.safeParse({
        outputKnowledgeVersion: manifest.knowledgeVersion,
        outputPassageId: chunk.passageId,
        sourceKnowledgeVersion: ledger.sourceKnowledgeVersion,
        sourcePassageId,
      });
      if (!edge.success) {
        return {
          ok: false,
          code: "KNOWLEDGE_METADATA_INVALID",
          message: `Invalid provenance edge for chunk ${chunk.passageId}`,
        };
      }
      provenanceEdges.push(edge.data);
    }
  }

  const ledgerSources = new Set<string>();
  for (const entry of ledger.entries) {
    if (ledgerSources.has(entry.sourcePassageId)) {
      return {
        ok: false,
        code: "KNOWLEDGE_METADATA_INVALID",
        message: `Duplicate source passage ID in disposition ledger: ${entry.sourcePassageId}`,
      };
    }
    ledgerSources.add(entry.sourcePassageId);
    if (new Set(entry.outputPassageIds).size !== entry.outputPassageIds.length) {
      return {
        ok: false,
        code: "KNOWLEDGE_METADATA_INVALID",
        message: `Duplicate output passage ID in disposition ledger: ${entry.sourcePassageId}`,
      };
    }
    const expectedOutputPassageIds = outputPassagesBySource.get(entry.sourcePassageId) ?? new Set();
    if (
      expectedOutputPassageIds.size !== entry.outputPassageIds.length ||
      entry.outputPassageIds.some((passageId) => !expectedOutputPassageIds.has(passageId))
    ) {
      return {
        ok: false,
        code: "KNOWLEDGE_METADATA_INVALID",
        message: `Disposition ledger does not reconcile source passage: ${entry.sourcePassageId}`,
      };
    }
  }
  for (const sourcePassageId of outputPassagesBySource.keys()) {
    if (!ledgerSources.has(sourcePassageId)) {
      return {
        ok: false,
        code: "KNOWLEDGE_METADATA_INVALID",
        message: `Missing disposition ledger entry for source passage: ${sourcePassageId}`,
      };
    }
  }
  if (ledgerSources.size !== canonicalV3PassageIds.size) {
    return {
      ok: false,
      code: "KNOWLEDGE_METADATA_INVALID",
      message: "Disposition ledger does not cover the canonical V3 passage set",
    };
  }
  for (const sourcePassageId of canonicalV3PassageIds) {
    if (!ledgerSources.has(sourcePassageId)) {
      return {
        ok: false,
        code: "KNOWLEDGE_METADATA_INVALID",
        message: "Disposition ledger does not cover the canonical V3 passage set",
      };
    }
  }

  const expectedCandidateHash = computeKnowledgeV4CandidateHash({
    chunks: manifest.chunks,
    provenanceEdges,
    dispositionLedgerHash: manifest.dispositionLedgerHash,
    assemblyVersion: manifest.assemblyVersion,
  });
  if (manifest.candidateHash !== expectedCandidateHash) {
    return {
      ok: false,
      code: "KNOWLEDGE_METADATA_INVALID",
      message: "Candidate hash mismatch",
    };
  }

  return { ok: true, value: manifest, ledger, provenanceEdges };
}

export type IngestKnowledgeSuccess = {
  documentId: string;
  chunkCount: number;
  reused: boolean;
};

export type IngestKnowledgeErrorCode =
  | "KNOWLEDGE_UNAPPROVED"
  | "KNOWLEDGE_METADATA_INVALID";

export type IngestKnowledgeResult =
  | ({ ok: true } & IngestKnowledgeSuccess)
  | {
      ok: false;
      code: IngestKnowledgeErrorCode;
      error: { code: IngestKnowledgeErrorCode; message: string };
    };

export function validateKnowledgeManifest(
  input: unknown,
  options?: { repositoryRoot?: string },
): { ok: true; value: KnowledgeManifestV1 } | { ok: false; code: IngestKnowledgeErrorCode; message: string } {
  const parsed = KnowledgeManifestV1Schema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "KNOWLEDGE_METADATA_INVALID",
      message: `Invalid knowledge manifest schema: ${parsed.error.message}`,
    };
  }

  const manifest = parsed.data;

  // Reject duplicate passageId in one manifest before persistence
  const seenPassageIds = new Set<string>();
  for (const chunk of manifest.chunks) {
    if (seenPassageIds.has(chunk.passageId)) {
      return {
        ok: false,
        code: "KNOWLEDGE_METADATA_INVALID",
        message: `Duplicate passageId in manifest: ${chunk.passageId}`,
      };
    }
    seenPassageIds.add(chunk.passageId);
  }

  // Verify approval status
  if (
    manifest.approval.status !== "approved" ||
    !manifest.approval.approver ||
    manifest.approval.approver.trim().length === 0
  ) {
    return {
      ok: false,
      code: "KNOWLEDGE_UNAPPROVED",
      message: "Knowledge manifest is not approved or lacks an approver",
    };
  }

  // Recompute chunk hashes
  for (const chunk of manifest.chunks) {
    const computedChunkHash = computeChunkContentHash(chunk.content);
    if (computedChunkHash !== chunk.contentHash.toLowerCase()) {
      return {
        ok: false,
        code: "KNOWLEDGE_METADATA_INVALID",
        message: `Content hash mismatch for chunk ${chunk.passageId}`,
      };
    }
  }

  // Recompute document hash
  const computedDocHash = computeDocumentContentHash(manifest.chunks);
  if (computedDocHash !== manifest.contentHash.toLowerCase()) {
    return {
      ok: false,
      code: "KNOWLEDGE_METADATA_INVALID",
      message: "Document content hash mismatch",
    };
  }

  // Source path validation
  const repoRoot = options?.repositoryRoot ? resolve(options.repositoryRoot) : resolve(process.cwd());
  const normalizedSource = normalize(manifest.sourcePath);

  if (
    isAbsolute(manifest.sourcePath) ||
    normalizedSource.startsWith("..") ||
    manifest.sourcePath.includes("..")
  ) {
    return {
      ok: false,
      code: "KNOWLEDGE_METADATA_INVALID",
      message: "Source path must be repository-relative and non-traversing",
    };
  }

  const resolvedSourcePath = resolve(repoRoot, normalizedSource);
  if (!resolvedSourcePath.startsWith(repoRoot + sep) && resolvedSourcePath !== repoRoot) {
    return {
      ok: false,
      code: "KNOWLEDGE_METADATA_INVALID",
      message: "Source path escapes repository root boundary",
    };
  }

  if (!existsSync(resolvedSourcePath)) {
    return {
      ok: false,
      code: "KNOWLEDGE_METADATA_INVALID",
      message: `Source file does not exist at ${manifest.sourcePath}`,
    };
  }

  let canonicalRepoRoot: string;
  let canonicalSourcePath: string;
  try {
    canonicalRepoRoot = realpathSync(repoRoot);
    canonicalSourcePath = realpathSync(resolvedSourcePath);
  } catch {
    return {
      ok: false,
      code: "KNOWLEDGE_METADATA_INVALID",
      message: "Source path resolution failed",
    };
  }

  if (
    canonicalSourcePath !== canonicalRepoRoot &&
    !canonicalSourcePath.startsWith(canonicalRepoRoot + sep)
  ) {
    return {
      ok: false,
      code: "KNOWLEDGE_METADATA_INVALID",
      message: "Source path escapes repository root boundary",
    };
  }

  return { ok: true, value: manifest };
}

function verifyDeepImmutableMatch(
  doc: typeof knowledgeDocuments.$inferSelect,
  existingChunks: Array<typeof knowledgeChunks.$inferSelect>,
  manifest: KnowledgeManifestV1 | KnowledgeManifestV2,
  existingEdges: Array<typeof knowledgeChunkProvenanceEdges.$inferSelect> = [],
  provenanceEdges: KnowledgeProvenanceEdgeV1[] = [],
): boolean {
  // Check document attributes
  if (
    doc.contentHash !== manifest.contentHash ||
    doc.discipline !== manifest.discipline ||
    doc.locale !== manifest.locale ||
    doc.permittedUse !== manifest.permittedUse ||
    doc.sourcePath !== manifest.sourcePath ||
    doc.sourceAttribution !== manifest.sourceAttribution ||
    doc.approvalStatus !== manifest.approval.status ||
    doc.approvedBy !== manifest.approval.approver ||
    doc.approvedAt.getTime() !== new Date(manifest.approval.approvedAt).getTime()
  ) {
    return false;
  }

  // Check chunk count
  if (existingChunks.length !== manifest.chunks.length) {
    return false;
  }

  const existingMap = new Map<string, typeof knowledgeChunks.$inferSelect>();
  for (const c of existingChunks) {
    existingMap.set(c.passageId, c);
  }

  // Compare every persisted chunk field against values derived from the manifest/document
  for (const chunk of manifest.chunks) {
    const existing = existingMap.get(chunk.passageId);
    if (!existing) return false;

    const expectedChunkId = `${doc.id}:${chunk.passageId}`;
    if (
      existing.id !== expectedChunkId ||
      existing.documentId !== doc.id ||
      existing.passageId !== chunk.passageId ||
      existing.knowledgeVersion !== manifest.knowledgeVersion ||
      existing.discipline !== manifest.discipline ||
      existing.locale !== manifest.locale ||
      existing.contentHash !== chunk.contentHash ||
      existing.content !== chunk.content ||
      existing.sourceAttribution !== manifest.sourceAttribution ||
      existing.permittedUse !== manifest.permittedUse
    ) {
      return false;
    }

    const existingSections = Array.isArray(existing.reportSections)
      ? existing.reportSections
      : [];
    if (existingSections.length !== chunk.reportSections.length) {
      return false;
    }
    for (let i = 0; i < chunk.reportSections.length; i++) {
      if (existingSections[i] !== chunk.reportSections[i]) {
        return false;
      }
    }

    const expectedMeta = normalizeChunkMetadata(chunk.metadata, manifest.locale);
    const existingRaw = existing.metadata ? (typeof existing.metadata === "string" ? JSON.parse(existing.metadata) : existing.metadata) : {};
    const existingMeta = Object.keys(existingRaw).length > 0 ? normalizeChunkMetadata(existingRaw as KnowledgeChunkMetadataV1, manifest.locale) : normalizeChunkMetadata(undefined, manifest.locale);
    if (!areMetadatasEqual(existingMeta, expectedMeta)) {
      return false;
    }
  }

  if (manifest.knowledgeVersion === "ziwei.comprehensive.knowledge.v4") {
    if (existingEdges.length !== provenanceEdges.length) {
      return false;
    }
    const persistedEdges = new Set(
      existingEdges.map(
        (edge) => `${edge.outputKnowledgeVersion}:${edge.outputPassageId}:${edge.sourceKnowledgeVersion}:${edge.sourcePassageId}`,
      ),
    );
    for (const edge of provenanceEdges) {
      const matchingEdge = existingEdges.find(
        (persisted) =>
          persisted.outputKnowledgeVersion === edge.outputKnowledgeVersion &&
          persisted.outputPassageId === edge.outputPassageId &&
          persisted.sourceKnowledgeVersion === edge.sourceKnowledgeVersion &&
          persisted.sourcePassageId === edge.sourcePassageId,
      );
      if (
        !matchingEdge ||
        matchingEdge.id !== computeKnowledgeProvenanceEdgeId(edge)
      ) {
        return false;
      }
      if (!persistedEdges.delete(
        `${edge.outputKnowledgeVersion}:${edge.outputPassageId}:${edge.sourceKnowledgeVersion}:${edge.sourcePassageId}`,
      )) {
        return false;
      }
    }
    if (persistedEdges.size !== 0) {
      return false;
    }
  } else if (existingEdges.length !== 0 || provenanceEdges.length !== 0) {
    return false;
  }

  return true;
}

type ValidatedKnowledgeManifest =
  | {
      manifest: KnowledgeManifestV1;
      provenanceEdges: [];
    }
  | {
      manifest: KnowledgeManifestV2;
      provenanceEdges: KnowledgeProvenanceEdgeV1[];
    };

function validateIngestibleKnowledgeManifest(
  input: unknown,
  options?: { repositoryRoot?: string },
): { ok: true; value: ValidatedKnowledgeManifest } | { ok: false; code: IngestKnowledgeErrorCode; message: string } {
  if (
    typeof input === "object" &&
    input !== null &&
    "manifestSchemaVersion" in input
  ) {
    const validation = validateKnowledgeManifestV2(input, options);
    if (!validation.ok) {
      return validation;
    }
    if (
      validation.value.approval.status !== "approved" ||
      !validation.value.approval.approver.trim()
    ) {
      return {
        ok: false,
        code: "KNOWLEDGE_UNAPPROVED",
        message: "Knowledge manifest is not approved or lacks an approver",
      };
    }
    if (validation.provenanceEdges.length === 0) {
      return {
        ok: false,
        code: "KNOWLEDGE_METADATA_INVALID",
        message: "Approved V4 knowledge manifest must emit at least one provenance edge",
      };
    }
    return {
      ok: true,
      value: {
        manifest: validation.value,
        provenanceEdges: validation.provenanceEdges,
      },
    };
  }

  const validation = validateKnowledgeManifest(input, options);
  if (!validation.ok) {
    return validation;
  }
  return { ok: true, value: { manifest: validation.value, provenanceEdges: [] } };
}


export function isKnowledgeChunkUniqueViolation(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const pgError = err as { code?: unknown; constraint_name?: unknown; constraint?: unknown };
  if (pgError.code !== "23505") return false;
  const constraint = String(pgError.constraint_name ?? pgError.constraint ?? "");
  return (
    constraint === "knowledge_chunks_version_passage_unique" ||
    constraint === "knowledge_chunks_pkey"
  );
}

export function createKnowledgeIngestionService(dependencies: {
  database: Database;
  repositoryRoot?: string;
}) {
  return {
    async ingestKnowledge(input: unknown): Promise<IngestKnowledgeResult> {
      const validation = validateIngestibleKnowledgeManifest(input, {
        repositoryRoot: dependencies.repositoryRoot,
      });

      if (!validation.ok) {
        return {
          ok: false,
          code: validation.code,
          error: { code: validation.code, message: validation.message },
        };
      }

      const { manifest, provenanceEdges } = validation.value;
      const database = dependencies.database;

      // Check for existing document by (documentId, knowledgeVersion)
      const existing = await database
        .select()
        .from(knowledgeDocuments)
        .where(
          and(
            eq(knowledgeDocuments.documentId, manifest.documentId),
            eq(knowledgeDocuments.knowledgeVersion, manifest.knowledgeVersion),
          ),
        )
        .limit(1);

      if (existing.length > 0 && existing[0]) {
        const doc = existing[0];
        const existingChunks = await database
          .select()
          .from(knowledgeChunks)
          .where(eq(knowledgeChunks.documentId, doc.id));
        const existingEdges = manifest.knowledgeVersion === "ziwei.comprehensive.knowledge.v4"
          ? await database
            .select()
            .from(knowledgeChunkProvenanceEdges)
            .where(
              and(
                eq(knowledgeChunkProvenanceEdges.outputKnowledgeVersion, manifest.knowledgeVersion),
                inArray(
                  knowledgeChunkProvenanceEdges.outputPassageId,
                  manifest.chunks.map((chunk) => chunk.passageId),
                ),
              ),
            )
          : [];

        const isMatch = verifyDeepImmutableMatch(
          doc,
          existingChunks,
          manifest,
          existingEdges,
          provenanceEdges,
        );
        if (isMatch) {
          return {
            ok: true,
            documentId: doc.id,
            chunkCount: manifest.chunks.length,
            reused: true,
          };
        }

        // Fails closed if different content or metadata for an existing immutable version
        return {
          ok: false,
          code: "KNOWLEDGE_METADATA_INVALID",
          error: {
            code: "KNOWLEDGE_METADATA_INVALID",
            message: "Cannot overwrite immutable knowledge document version with different content or metadata",
          },
        };
      }

      // Physical ID includes knowledgeVersion so different versions coexist
      const docRecordId = `${manifest.discipline}:${manifest.locale}:${manifest.knowledgeVersion}:${manifest.documentId}`;

      // Pre-check: any passage collision with existing chunks under same knowledgeVersion across other documents
      const chunkPassageIds = manifest.chunks.map((c) => c.passageId);
      const collidingChunks = await database
        .select({ id: knowledgeChunks.id, documentId: knowledgeChunks.documentId })
        .from(knowledgeChunks)
        .where(
          and(
            eq(knowledgeChunks.knowledgeVersion, manifest.knowledgeVersion),
            inArray(knowledgeChunks.passageId, chunkPassageIds),
          ),
        );

      if (
        collidingChunks.length > 0 &&
        collidingChunks.some((c) => c.documentId !== docRecordId)
      ) {
        return {
          ok: false,
          code: "KNOWLEDGE_METADATA_INVALID",
          error: {
            code: "KNOWLEDGE_METADATA_INVALID",
            message: "Passage collision across knowledge documents",
          },
        };
      }

      try {
        return await database.transaction(async (tx) => {
          if (manifest.knowledgeVersion === "ziwei.comprehensive.knowledge.v4") {
            const sourcePassageIds = [...new Set(
              provenanceEdges.map((edge) => edge.sourcePassageId),
            )];
            const sourceChunks = await tx
              .select({
                knowledgeVersion: knowledgeChunks.knowledgeVersion,
                passageId: knowledgeChunks.passageId,
              })
              .from(knowledgeChunks)
              .where(
                and(
                  eq(
                    knowledgeChunks.knowledgeVersion,
                    "ziwei.comprehensive.knowledge.v3",
                  ),
                  inArray(knowledgeChunks.passageId, sourcePassageIds),
                ),
              );
            if (sourceChunks.length !== sourcePassageIds.length) {
              return {
                ok: false,
                code: "KNOWLEDGE_METADATA_INVALID",
                error: {
                  code: "KNOWLEDGE_METADATA_INVALID",
                  message: "V4 provenance edge references a missing V3 source passage",
                },
              };
            }
          }

          // Idempotent conflict-safe insert for document
          const insertedDocs = await tx
            .insert(knowledgeDocuments)
            .values({
              id: docRecordId,
              documentId: manifest.documentId,
              knowledgeVersion: manifest.knowledgeVersion,
              discipline: manifest.discipline,
              locale: manifest.locale,
              sourcePath: manifest.sourcePath,
              sourceAttribution: manifest.sourceAttribution,
              permittedUse: manifest.permittedUse,
              contentHash: manifest.contentHash,
              approvalStatus: manifest.approval.status,
              approvedBy: manifest.approval.approver,
              approvedAt: new Date(manifest.approval.approvedAt),
            })
            .onConflictDoNothing({
              target: [knowledgeDocuments.documentId, knowledgeDocuments.knowledgeVersion],
            })
            .returning();

          // If insert did nothing, another concurrent caller inserted this document
          if (insertedDocs.length === 0 || !insertedDocs[0]) {
            const [concurrentDoc] = await tx
              .select()
              .from(knowledgeDocuments)
              .where(
                and(
                  eq(knowledgeDocuments.documentId, manifest.documentId),
                  eq(knowledgeDocuments.knowledgeVersion, manifest.knowledgeVersion),
                ),
              )
              .limit(1);

            if (!concurrentDoc) {
              throw new Error("Concurrent document insertion resolution failed");
            }

            const concurrentChunks = await tx
              .select()
              .from(knowledgeChunks)
              .where(eq(knowledgeChunks.documentId, concurrentDoc.id));
            const concurrentEdges = manifest.knowledgeVersion === "ziwei.comprehensive.knowledge.v4"
              ? await tx
                .select()
                .from(knowledgeChunkProvenanceEdges)
                .where(
                  and(
                    eq(knowledgeChunkProvenanceEdges.outputKnowledgeVersion, manifest.knowledgeVersion),
                    inArray(
                      knowledgeChunkProvenanceEdges.outputPassageId,
                      manifest.chunks.map((chunk) => chunk.passageId),
                    ),
                  ),
                )
              : [];

            const isMatch = verifyDeepImmutableMatch(
              concurrentDoc,
              concurrentChunks,
              manifest,
              concurrentEdges,
              provenanceEdges,
            );
            if (isMatch) {
              return {
                ok: true,
                documentId: concurrentDoc.id,
                chunkCount: manifest.chunks.length,
                reused: true,
              };
            }

            return {
              ok: false,
              code: "KNOWLEDGE_METADATA_INVALID",
              error: {
                code: "KNOWLEDGE_METADATA_INVALID",
                message: "Cannot overwrite immutable knowledge document version with different content or metadata",
              },
            };
          }

          const chunkRows = manifest.chunks.map((c: KnowledgeChunkManifest) => ({
            id: `${docRecordId}:${c.passageId}`,
            passageId: c.passageId,
            documentId: docRecordId,
            knowledgeVersion: manifest.knowledgeVersion,
            discipline: manifest.discipline,
            locale: manifest.locale,
            reportSections: c.reportSections,
            content: c.content,
            contentHash: c.contentHash,
            sourceAttribution: manifest.sourceAttribution,
            permittedUse: manifest.permittedUse,
            metadata: normalizeChunkMetadata(c.metadata, manifest.locale),
          }));

          const insertedChunks = await tx
            .insert(knowledgeChunks)
            .values(chunkRows)
            .returning({ id: knowledgeChunks.id });

          if (insertedChunks.length !== manifest.chunks.length) {
            throw new Error("KNOWLEDGE_METADATA_INVALID: Incomplete chunk persistence");
          }

          if (manifest.knowledgeVersion === "ziwei.comprehensive.knowledge.v4") {
            const edgeRows = provenanceEdges.map((edge) => ({
              id: computeKnowledgeProvenanceEdgeId(edge),
              outputKnowledgeVersion: edge.outputKnowledgeVersion,
              outputPassageId: edge.outputPassageId,
              sourceKnowledgeVersion: edge.sourceKnowledgeVersion,
              sourcePassageId: edge.sourcePassageId,
            }));
            const insertedEdges = await tx
              .insert(knowledgeChunkProvenanceEdges)
              .values(edgeRows)
              .returning({
                outputPassageId: knowledgeChunkProvenanceEdges.outputPassageId,
              });
            if (insertedEdges.length !== edgeRows.length) {
              throw new Error("KNOWLEDGE_METADATA_INVALID: Incomplete provenance edge persistence");
            }
          }

          return {
            ok: true,
            documentId: docRecordId,
            chunkCount: manifest.chunks.length,
            reused: false,
          };
        });
      } catch (err) {
        if (isKnowledgeChunkUniqueViolation(err)) {
          return {
            ok: false,
            code: "KNOWLEDGE_METADATA_INVALID",
            error: {
              code: "KNOWLEDGE_METADATA_INVALID",
              message: "Knowledge chunk passage collision detected",
            },
          };
        }
        throw err;
      }
    },
  };
}
