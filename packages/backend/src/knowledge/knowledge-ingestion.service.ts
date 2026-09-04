import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { isAbsolute, normalize, resolve, sep } from "node:path";
import { and, eq, inArray } from "drizzle-orm";
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

export const KNOWLEDGE_VERSION_PATTERN = /^[a-z0-9-]+\.[a-z0-9-]+\.[a-z0-9-]+\.v[0-9]+$/;

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

  return { ok: true, value: manifest };
}

function verifyDeepImmutableMatch(
  doc: typeof knowledgeDocuments.$inferSelect,
  existingChunks: Array<typeof knowledgeChunks.$inferSelect>,
  manifest: KnowledgeManifestV1,
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
  }

  return true;
}


export function isKnowledgeChunkUniqueViolation(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const pgError = err as { code?: unknown; constraint_name?: unknown; constraint?: unknown };
  if (pgError.code !== "23505") return false;
  const constraint = String(pgError.constraint_name ?? pgError.constraint ?? "");
  if (constraint.length > 0) {
    return constraint.includes("knowledge_chunks");
  }
  return true;
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
        const existingChunks = await database
          .select()
          .from(knowledgeChunks)
          .where(eq(knowledgeChunks.documentId, doc.id));

        const isMatch = verifyDeepImmutableMatch(doc, existingChunks, manifest);
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

            const isMatch = verifyDeepImmutableMatch(concurrentDoc, concurrentChunks, manifest);
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
          }));

          const insertedChunks = await tx
            .insert(knowledgeChunks)
            .values(chunkRows)
            .returning({ id: knowledgeChunks.id });

          if (insertedChunks.length !== manifest.chunks.length) {
            throw new Error("KNOWLEDGE_METADATA_INVALID: Incomplete chunk persistence");
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
