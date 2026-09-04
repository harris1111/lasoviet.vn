import { describe, expect, it, vi } from "vitest";
import {
  createKnowledgeRetrievalService,
  KnowledgeError,
  type RetrieveKnowledgeQuery,
  type VectorRetrievalDependency,
} from "./knowledge-retrieval.service.js";
import {
  createKnowledgeIngestionService,
  type KnowledgeManifestV1,
} from "./knowledge-ingestion.service.js";

describe("knowledge retrieval service", () => {
  const validManifest: KnowledgeManifestV1 = {
    documentId: "ziwei-identity-foundation-vi",
    knowledgeVersion: "ziwei.identity.knowledge.v1",
    discipline: "ziwei",
    locale: "vi",
    sourcePath: "content/knowledge/vi/ziwei/identity-report-foundation.v1.json",
    sourceAttribution: "Ban Bien Tap Phuong Phap La So Viet",
    permittedUse: "first_party",
    contentHash: "46227fc66d3a95c808722cfa66ea40a4cc8ca4c95f8e6c71c4c95de0ba8a73b2",
    approval: {
      status: "approved",
      approver: "editorial-lead",
      approvedAt: "2026-09-01T00:00:00.000Z",
    },
    chunks: [
      {
        passageId: "vi-ziwei-foundation-001",
        reportSections: ["data_and_method", "personal_summary"],
        content: "Nguyen ly luan giai la so Tu Vi tap trung vao doi chieu cau truc.",
        contentHash: "29f3ba9e4fe8955263a23a3be18ad75ea3ff03be93cce11bb9e599e51c89fbf5",
      },
    ],
  };

  describe("manifest validation and ingestion invariants", () => {
    it("rejects unapproved manifest with KNOWLEDGE_UNAPPROVED", async () => {
      const draftManifest: KnowledgeManifestV1 = {
        ...validManifest,
        approval: {
          status: "draft",
          approver: "editor",
          approvedAt: "2026-09-01T00:00:00.000Z",
        },
      };

      const mockDb = {} as any;
      const ingestionService = createKnowledgeIngestionService({ database: mockDb });
      const result = await ingestionService.ingestKnowledge(draftManifest);

      expect(result.ok).toBe(false);
      expect((result as any).code).toBe("KNOWLEDGE_UNAPPROVED");
    });

    it("rejects rejected manifest with KNOWLEDGE_UNAPPROVED", async () => {
      const rejectedManifest: KnowledgeManifestV1 = {
        ...validManifest,
        approval: {
          status: "rejected",
          approver: "reviewer",
          approvedAt: "2026-09-01T00:00:00.000Z",
        },
      };

      const mockDb = {} as any;
      const ingestionService = createKnowledgeIngestionService({ database: mockDb });
      const result = await ingestionService.ingestKnowledge(rejectedManifest);

      expect(result.ok).toBe(false);
      expect((result as any).code).toBe("KNOWLEDGE_UNAPPROVED");
    });

    it("rejects manifest with hash mismatch with KNOWLEDGE_METADATA_INVALID", async () => {
      const tamperedManifest: KnowledgeManifestV1 = {
        ...validManifest,
        contentHash: "0000000000000000000000000000000000000000000000000000000000000000",
      };

      const mockDb = {} as any;
      const ingestionService = createKnowledgeIngestionService({ database: mockDb });
      const result = await ingestionService.ingestKnowledge(tamperedManifest);

      expect(result.ok).toBe(false);
      expect((result as any).code).toBe("KNOWLEDGE_METADATA_INVALID");
    });

    it("rejects traversing or absolute source path with KNOWLEDGE_METADATA_INVALID", async () => {
      const traversingManifest: KnowledgeManifestV1 = {
        ...validManifest,
        sourcePath: "../../../etc/passwd",
      };

      const mockDb = {} as any;
      const ingestionService = createKnowledgeIngestionService({ database: mockDb });
      const result = await ingestionService.ingestKnowledge(traversingManifest);

      expect(result.ok).toBe(false);
      expect((result as any).code).toBe("KNOWLEDGE_METADATA_INVALID");
    });

    it("rejects missing source file on disk with KNOWLEDGE_METADATA_INVALID", async () => {
      const missingFileManifest: KnowledgeManifestV1 = {
        ...validManifest,
        sourcePath: "content/knowledge/vi/ziwei/non-existent-source.json",
      };

      const mockDb = {} as any;
      const ingestionService = createKnowledgeIngestionService({ database: mockDb });
      const result = await ingestionService.ingestKnowledge(missingFileManifest);

      expect(result.ok).toBe(false);
      expect((result as any).code).toBe("KNOWLEDGE_METADATA_INVALID");
    });
  });

  describe("retrieval query boundary and limit invariants", () => {
    const validQuery: RetrieveKnowledgeQuery = {
      discipline: "ziwei",
      locale: "vi",
      reportSection: "data_and_method",
      knowledgeVersion: "ziwei.identity.knowledge.v1",
      text: "nguyen ly luan giai",
    };

    it("rejects query with text exceeding 512 characters with KNOWLEDGE_CONTEXT_LIMIT", async () => {
      const mockDb = {} as any;
      const retrievalService = createKnowledgeRetrievalService({ database: mockDb });
      const excessiveText = "a".repeat(513);

      await expect(
        retrievalService.retrieveKnowledge({ ...validQuery, text: excessiveText }),
      ).rejects.toThrowError(expect.objectContaining({ code: "KNOWLEDGE_CONTEXT_LIMIT" }));
    });

    it("rejects empty query text with KNOWLEDGE_METADATA_INVALID", async () => {
      const mockDb = {} as any;
      const retrievalService = createKnowledgeRetrievalService({ database: mockDb });

      await expect(
        retrievalService.retrieveKnowledge({ ...validQuery, text: "   " }),
      ).rejects.toThrowError(expect.objectContaining({ code: "KNOWLEDGE_METADATA_INVALID" }));
    });

    it("rejects requesting more than 8 passages with KNOWLEDGE_CONTEXT_LIMIT", async () => {
      const mockDb = {} as any;
      const retrievalService = createKnowledgeRetrievalService({ database: mockDb });

      await expect(
        retrievalService.retrieveKnowledge({ ...validQuery, maxPassages: 9 }),
      ).rejects.toThrowError(expect.objectContaining({ code: "KNOWLEDGE_CONTEXT_LIMIT" }));
    });

    it("rejects requesting more than 1,200 chars per passage with KNOWLEDGE_CONTEXT_LIMIT", async () => {
      const mockDb = {} as any;
      const retrievalService = createKnowledgeRetrievalService({ database: mockDb });

      await expect(
        retrievalService.retrieveKnowledge({ ...validQuery, maxCharsPerPassage: 1201 }),
      ).rejects.toThrowError(expect.objectContaining({ code: "KNOWLEDGE_CONTEXT_LIMIT" }));
    });

    it("rejects requesting more than 9,600 total characters with KNOWLEDGE_CONTEXT_LIMIT", async () => {
      const mockDb = {} as any;
      const retrievalService = createKnowledgeRetrievalService({ database: mockDb });

      await expect(
        retrievalService.retrieveKnowledge({ ...validQuery, maxTotalChars: 9601 }),
      ).rejects.toThrowError(expect.objectContaining({ code: "KNOWLEDGE_CONTEXT_LIMIT" }));
    });

    it("rejects unsupported discipline with KNOWLEDGE_METADATA_INVALID", async () => {
      const mockDb = {} as any;
      const retrievalService = createKnowledgeRetrievalService({ database: mockDb });

      await expect(
        retrievalService.retrieveKnowledge({ ...validQuery, discipline: "bazi" as any }),
      ).rejects.toThrowError(expect.objectContaining({ code: "KNOWLEDGE_METADATA_INVALID" }));
    });

    it("rejects unsupported report section with KNOWLEDGE_METADATA_INVALID", async () => {
      const mockDb = {} as any;
      const retrievalService = createKnowledgeRetrievalService({ database: mockDb });

      await expect(
        retrievalService.retrieveKnowledge({ ...validQuery, reportSection: "invalid_section" as any }),
      ).rejects.toThrowError(expect.objectContaining({ code: "KNOWLEDGE_METADATA_INVALID" }));
    });
  });

  describe("vector retrieval dependency handling", () => {
    const validQuery: RetrieveKnowledgeQuery = {
      discipline: "ziwei",
      locale: "vi",
      reportSection: "data_and_method",
      knowledgeVersion: "ziwei.identity.knowledge.v1",
      text: "nguyen ly luan giai",
    };

    it("does not call vector dependency when vector is disabled", async () => {
      const isIndexReady = vi.fn().mockResolvedValue(true);
      const queryVector = vi.fn().mockResolvedValue([]);
      const vectorDependency: VectorRetrievalDependency = {
        isIndexReady,
        query: queryVector,
      };

      const mockDb = {
        execute: vi.fn().mockResolvedValue([]),
      } as any;

      const retrievalService = createKnowledgeRetrievalService({
        database: mockDb,
        vectorRetrieval: vectorDependency,
      });

      const passages = await retrievalService.retrieveKnowledge({
        ...validQuery,
        enableVector: false,
      });

      expect(isIndexReady).not.toHaveBeenCalled();
      expect(queryVector).not.toHaveBeenCalled();
      expect(Array.isArray(passages)).toBe(true);
    });

    it("silently uses full-text only when vector dependency index is not ready", async () => {
      const isIndexReady = vi.fn().mockResolvedValue(false);
      const queryVector = vi.fn().mockResolvedValue([]);
      const vectorDependency: VectorRetrievalDependency = {
        isIndexReady,
        query: queryVector,
      };

      const mockDb = {
        execute: vi.fn().mockResolvedValue([]),
      } as any;

      const retrievalService = createKnowledgeRetrievalService({
        database: mockDb,
        vectorRetrieval: vectorDependency,
      });

      const passages = await retrievalService.retrieveKnowledge({
        ...validQuery,
        enableVector: true,
        vectorQuery: [0.1, 0.2, 0.3],
      });

      expect(isIndexReady).toHaveBeenCalled();
      expect(queryVector).not.toHaveBeenCalled();
      expect(Array.isArray(passages)).toBe(true);
    });
  });
});
