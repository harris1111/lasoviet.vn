import { describe, expect, it, vi } from "vitest";
import {
  createKnowledgeEmbedProcessor,
  type KnowledgeEmbedDependency,
} from "./knowledge-embed.processor.js";

describe("knowledge embed processor", () => {
  const sampleChunks = [
    {
      id: "chunk-01",
      passageId: "p-01",
      documentId: "doc-01",
      knowledgeVersion: "ziwei.identity.knowledge.v1",
      approvalStatus: "approved" as const,
      content: "Sample content 1 for testing embedding processor.",
    },
    {
      id: "chunk-02",
      passageId: "p-02",
      documentId: "doc-01",
      knowledgeVersion: "ziwei.identity.knowledge.v1",
      approvalStatus: "approved" as const,
      content: "Sample content 2 for testing embedding processor.",
    },
  ];

  it("skips with no side effect when processor is disabled", async () => {
    const embedFn = vi.fn().mockResolvedValue({ embeddedCount: 0 });
    const dependency: KnowledgeEmbedDependency = {
      isReady: vi.fn().mockResolvedValue(true),
      embedChunks: embedFn,
    };

    const processor = createKnowledgeEmbedProcessor({
      enabled: false,
      dependency,
    });

    const result = await processor.process({
      documentId: "doc-01",
      knowledgeVersion: "ziwei.identity.knowledge.v1",
      chunks: sampleChunks,
    });

    expect(result).toEqual({ ok: true, skipped: true, reason: "DISABLED", processedCount: 0 });
    expect(dependency.isReady).not.toHaveBeenCalled();
    expect(embedFn).not.toHaveBeenCalled();
  });

  it("skips with no side effect when dependency index is unindexed or not ready", async () => {
    const embedFn = vi.fn().mockResolvedValue({ embeddedCount: 0 });
    const dependency: KnowledgeEmbedDependency = {
      isReady: vi.fn().mockResolvedValue(false),
      embedChunks: embedFn,
    };

    const processor = createKnowledgeEmbedProcessor({
      enabled: true,
      dependency,
    });

    const result = await processor.process({
      documentId: "doc-01",
      knowledgeVersion: "ziwei.identity.knowledge.v1",
      chunks: sampleChunks,
    });

    expect(result).toEqual({ ok: true, skipped: true, reason: "UNINDEXED", processedCount: 0 });
    expect(dependency.isReady).toHaveBeenCalled();
    expect(embedFn).not.toHaveBeenCalled();
  });

  it("validates input and rejects invalid metadata", async () => {
    const dependency: KnowledgeEmbedDependency = {
      isReady: vi.fn().mockResolvedValue(true),
      embedChunks: vi.fn().mockResolvedValue({ embeddedCount: 0 }),
    };

    const processor = createKnowledgeEmbedProcessor({
      enabled: true,
      dependency,
    });

    const result = await processor.process({
      documentId: "",
      knowledgeVersion: "ziwei.identity.knowledge.v1",
      chunks: sampleChunks,
    });

    expect(result.ok).toBe(false);
    expect((result as any).code).toBe("KNOWLEDGE_METADATA_INVALID");
  });

  it("embeds approved chunks idempotently", async () => {
    const embeddedIds = new Set<string>();
    const embedFn = vi.fn().mockImplementation(async (chunks: Array<{ id: string }>) => {
      let newlyEmbedded = 0;
      for (const chunk of chunks) {
        if (!embeddedIds.has(chunk.id)) {
          embeddedIds.add(chunk.id);
          newlyEmbedded++;
        }
      }
      return { embeddedCount: newlyEmbedded };
    });

    const dependency: KnowledgeEmbedDependency = {
      isReady: vi.fn().mockResolvedValue(true),
      embedChunks: embedFn,
    };

    const processor = createKnowledgeEmbedProcessor({
      enabled: true,
      dependency,
    });

    const result1 = await processor.process({
      documentId: "doc-01",
      knowledgeVersion: "ziwei.identity.knowledge.v1",
      chunks: sampleChunks,
    });

    expect(result1).toEqual({ ok: true, skipped: false, processedCount: 2 });
    expect(embedFn).toHaveBeenCalledWith([
      expect.objectContaining({ id: "chunk-01", passageId: "p-01" }),
      expect.objectContaining({ id: "chunk-02", passageId: "p-02" }),
    ]);

    // Re-processing is idempotent
    const result2 = await processor.process({
      documentId: "doc-01",
      knowledgeVersion: "ziwei.identity.knowledge.v1",
      chunks: sampleChunks,
    });

    expect(result2).toEqual({ ok: true, skipped: false, processedCount: 0 });
  });

  it("finding 5: rejects when chunk approvalStatus is not strictly approved", async () => {
    const dependency: KnowledgeEmbedDependency = {
      isReady: vi.fn().mockResolvedValue(true),
      embedChunks: vi.fn().mockResolvedValue({ embeddedCount: 0 }),
    };

    const processor = createKnowledgeEmbedProcessor({
      enabled: true,
      dependency,
    });

    const unapprovedChunk = {
      id: "chunk-unapproved",
      passageId: "p-03",
      documentId: "doc-01",
      knowledgeVersion: "ziwei.identity.knowledge.v1",
      approvalStatus: undefined as any, // missing approvalStatus
      content: "Missing approvalStatus",
    };

    const result = await processor.process({
      documentId: "doc-01",
      knowledgeVersion: "ziwei.identity.knowledge.v1",
      chunks: [unapprovedChunk],
    });

    expect(result.ok).toBe(false);
    expect((result as any).code).toBe("KNOWLEDGE_METADATA_INVALID");
  });

  it("finding 5: rejects when chunk documentId or knowledgeVersion does not match request params", async () => {
    const dependency: KnowledgeEmbedDependency = {
      isReady: vi.fn().mockResolvedValue(true),
      embedChunks: vi.fn().mockResolvedValue({ embeddedCount: 0 }),
    };

    const processor = createKnowledgeEmbedProcessor({
      enabled: true,
      dependency,
    });

    const mismatchedDocChunk = {
      id: "chunk-mismatch-doc",
      passageId: "p-04",
      documentId: "other-doc",
      knowledgeVersion: "ziwei.identity.knowledge.v1",
      approvalStatus: "approved" as const,
      content: "Mismatched documentId",
    };

    const resultDoc = await processor.process({
      documentId: "doc-01",
      knowledgeVersion: "ziwei.identity.knowledge.v1",
      chunks: [mismatchedDocChunk],
    });

    expect(resultDoc.ok).toBe(false);
    expect((resultDoc as any).code).toBe("KNOWLEDGE_METADATA_INVALID");

    const mismatchedVerChunk = {
      id: "chunk-mismatch-ver",
      passageId: "p-05",
      documentId: "doc-01",
      knowledgeVersion: "ziwei.identity.knowledge.v2",
      approvalStatus: "approved" as const,
      content: "Mismatched knowledgeVersion",
    };

    const resultVer = await processor.process({
      documentId: "doc-01",
      knowledgeVersion: "ziwei.identity.knowledge.v1",
      chunks: [mismatchedVerChunk],
    });

    expect(resultVer.ok).toBe(false);
    expect((resultVer as any).code).toBe("KNOWLEDGE_METADATA_INVALID");
  });

});
