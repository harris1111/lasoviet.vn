import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { isAbsolute, normalize, resolve, sep } from "node:path";
import { and, eq } from "drizzle-orm";
import {
  IDENTITY_REPORT_SECTION_IDS,
  z,
} from "@lasoviet/contracts";
import {
  knowledgeChunks,
  knowledgeDocuments,
  type Database,
} from "@lasoviet/database";

export const PERMITTED_USE_BASES = ["first_party", "licensed", "public_domain"] as const;
export type PermittedUseBasis = (typeof PERMITTED_USE_BASES)[number];

export const APPROVAL_STATUSES = ["draft", "approved", "rejected"] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export const KnowledgeChunkManifestSchema = z.object({
  passageId: z.string().trim().min(1).max(120),
  reportSections: z.array(z.enum(IDENTITY_REPORT_SECTION_IDS)).min(1),
  content: z.string().trim().min(1).max(1_200),
  contentHash: z.string().regex(/^[0-9a-f]{64}$/),
}).strict();

export const KnowledgeApprovalRecordSchema = z.object({
  status: z.enum(APPROVAL_STATUSES),
  approver: z.string().trim(),
  approvedAt: z.string().datetime(),
}).strict();

export const KnowledgeManifestV1Schema = z.object({
  documentId: z.string().trim().min(1).max(120),
  knowledgeVersion: z.literal("ziwei.identity.knowledge.v1"),
  discipline: z.literal("ziwei"),
  locale: z.enum(["vi", "en"]),
  sourcePath: z.string().trim().min(1),
  sourceAttribution: z.string().trim().min(1).max(255),
  permittedUse: z.enum(PERMITTED_USE_BASES),
  contentHash: z.string().regex(/^[0-9a-f]{64}$/),
  approval: KnowledgeApprovalRecordSchema,
  chunks: z.array(KnowledgeChunkManifestSchema).min(1),
}).strict();

export type KnowledgeChunkManifest = z.infer<typeof KnowledgeChunkManifestSchema>;
export type KnowledgeManifestV1 = z.infer<typeof KnowledgeManifestV1Schema>;

export function computeChunkContentHash(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex").toLowerCase();
}

export function computeDocumentContentHash(chunks: Array<{ content: string }>): string {
  const concatenated = chunks.map((c) => c.content).join("\n\n");
  return createHash("sha256").update(concatenated, "utf8").digest("hex").toLowerCase();
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

  return { ok: true, value: manifest };
}

export function createKnowledgeIngestionService(dependencies: {
  database: Database;
  repositoryRoot?: string;
}) {
  return {
    async ingestKnowledge(input: unknown): Promise<IngestKnowledgeResult> {
      const validation = validateKnowledgeManifest(input, {
        repositoryRoot: dependencies.repositoryRoot,
      });

      if (!validation.ok) {
        return {
          ok: false,
          code: validation.code,
          error: { code: validation.code, message: validation.message },
        };
      }

      const manifest = validation.value;
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
        // Idempotency check: must match contentHash and immutable metadata
        if (
          doc.contentHash === manifest.contentHash &&
          doc.discipline === manifest.discipline &&
          doc.locale === manifest.locale &&
          doc.permittedUse === manifest.permittedUse &&
          doc.sourcePath === manifest.sourcePath &&
          doc.approvalStatus === manifest.approval.status
        ) {
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

      // Persist document and chunks atomically
      const docRecordId = `${manifest.discipline}:${manifest.locale}:${manifest.documentId}`;

      await database.transaction(async (tx) => {
        await tx.insert(knowledgeDocuments).values({
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
        });

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
        }));

        await tx.insert(knowledgeChunks).values(chunkRows);
      });

      return {
        ok: true,
        documentId: docRecordId,
        chunkCount: manifest.chunks.length,
        reused: false,
      };
    },
  };
}
