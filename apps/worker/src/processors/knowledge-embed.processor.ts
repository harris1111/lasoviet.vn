import type { Database } from "@lasoviet/database";

export type KnowledgeEmbedChunk = {
  id: string;
  passageId: string;
  documentId?: string;
  knowledgeVersion?: string;
  approvalStatus?: string;
  content: string;
};

export type KnowledgeEmbedDependency = {
  isReady(): Promise<boolean> | boolean;
  embedChunks(
    chunks: Array<{
      id: string;
      passageId: string;
      content: string;
      knowledgeVersion: string;
    }>,
  ): Promise<{ embeddedCount?: number } | void>;
};

export type KnowledgeEmbedProcessorDependencies = {
  enabled?: boolean;
  dependency?: KnowledgeEmbedDependency;
  database?: Database;
};

export type KnowledgeEmbedProcessParams = {
  documentId: string;
  knowledgeVersion: string;
  chunks?: KnowledgeEmbedChunk[];
};

export type KnowledgeEmbedProcessResult =
  | {
      ok: true;
      skipped: boolean;
      reason?: "DISABLED" | "UNINDEXED";
      processedCount: number;
    }
  | {
      ok: false;
      code: "KNOWLEDGE_METADATA_INVALID";
      error: { code: "KNOWLEDGE_METADATA_INVALID"; message: string };
    };

export function createKnowledgeEmbedProcessor(
  dependencies: KnowledgeEmbedProcessorDependencies,
) {
  const processedChunkIds = new Set<string>();

  return {
    async process(
      params: KnowledgeEmbedProcessParams,
    ): Promise<KnowledgeEmbedProcessResult> {
      // Skip if processor is disabled
      if (!dependencies.enabled) {
        return {
          ok: true,
          skipped: true,
          reason: "DISABLED",
          processedCount: 0,
        };
      }

      // Skip if dependency is not ready or index is unindexed
      if (!dependencies.dependency) {
        return {
          ok: true,
          skipped: true,
          reason: "UNINDEXED",
          processedCount: 0,
        };
      }

      const isReady = await dependencies.dependency.isReady();
      if (!isReady) {
        return {
          ok: true,
          skipped: true,
          reason: "UNINDEXED",
          processedCount: 0,
        };
      }

      // Input validation on request params
      if (
        !params.documentId ||
        params.documentId.trim().length === 0 ||
        !params.knowledgeVersion ||
        params.knowledgeVersion.trim().length === 0
      ) {
        return {
          ok: false,
          code: "KNOWLEDGE_METADATA_INVALID",
          error: {
            code: "KNOWLEDGE_METADATA_INVALID",
            message: "Missing documentId or knowledgeVersion",
          },
        };
      }

      const rawChunks = params.chunks ?? [];

      // Validate every chunk:
      // Must require approvalStatus === 'approved', and exact documentId and knowledgeVersion match
      for (const chunk of rawChunks) {
        if (chunk.approvalStatus !== "approved") {
          return {
            ok: false,
            code: "KNOWLEDGE_METADATA_INVALID",
            error: {
              code: "KNOWLEDGE_METADATA_INVALID",
              message: `Chunk ${chunk.passageId} must have approvalStatus 'approved'`,
            },
          };
        }

        if (chunk.documentId !== params.documentId) {
          return {
            ok: false,
            code: "KNOWLEDGE_METADATA_INVALID",
            error: {
              code: "KNOWLEDGE_METADATA_INVALID",
              message: `Chunk ${chunk.passageId} documentId (${chunk.documentId}) does not match request documentId (${params.documentId})`,
            },
          };
        }

        if (chunk.knowledgeVersion !== params.knowledgeVersion) {
          return {
            ok: false,
            code: "KNOWLEDGE_METADATA_INVALID",
            error: {
              code: "KNOWLEDGE_METADATA_INVALID",
              message: `Chunk ${chunk.passageId} knowledgeVersion (${chunk.knowledgeVersion}) does not match request knowledgeVersion (${params.knowledgeVersion})`,
            },
          };
        }
      }

      // Deduplicate against already processed chunks for idempotency
      const chunksToEmbed = rawChunks.filter(
        (chunk) => !processedChunkIds.has(chunk.id),
      );

      if (chunksToEmbed.length === 0) {
        return {
          ok: true,
          skipped: false,
          processedCount: 0,
        };
      }

      const embedInput = chunksToEmbed.map((chunk) => ({
        id: chunk.id,
        passageId: chunk.passageId,
        content: chunk.content,
        knowledgeVersion: chunk.knowledgeVersion!,
      }));

      const embedResult = await dependencies.dependency.embedChunks(embedInput);

      for (const chunk of chunksToEmbed) {
        processedChunkIds.add(chunk.id);
      }

      const count =
        embedResult && typeof embedResult.embeddedCount === "number"
          ? embedResult.embeddedCount
          : chunksToEmbed.length;

      return {
        ok: true,
        skipped: false,
        processedCount: count,
      };
    },
  };
}
