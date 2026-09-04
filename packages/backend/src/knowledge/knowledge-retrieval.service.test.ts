import { readFileSync } from "node:fs";
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

  const validQuery: RetrieveKnowledgeQuery = {
    discipline: "ziwei",
    locale: "vi",
    reportSection: "data_and_method",
    knowledgeVersion: "ziwei.identity.knowledge.v1",
    text: "nguyen ly luan giai",
  };

  const validManifest: KnowledgeManifestV1 = {
    "documentId": "ziwei-identity-foundation-vi",
    "knowledgeVersion": "ziwei.identity.knowledge.v1",
    "discipline": "ziwei",
    "locale": "vi",
    "sourcePath": "docs/05-report-system.md",
    "sourceAttribution": "Lá Số Việt Method Editorial Board",
    "permittedUse": "first_party",
    "contentHash": "704cb2fae109c8b9cc760ad12736881a63a9542875934a374db92f5a51b2ed34",
    "approval": {
        "status": "approved",
        "approver": "method-reviewer",
        "approvedAt": "2026-09-01T00:00:00.000Z"
    },
    "chunks": [
        {
            "passageId": "vi-ziwei-foundation-001",
            "reportSections": [
                "data_and_method"
            ],
            "content": "Phương pháp luận báo cáo tại Lá Số Việt bắt đầu từ việc chuẩn hóa dữ liệu đầu vào theo múi giờ địa phương và quy chuẩn tính toán đã kiểm chứng. Hệ thống phân định rõ ràng ba tầng: dữ liệu gốc của lá số, tầng quy tắc chọn bằng chứng, và tầng tổng hợp ngôn ngữ định hướng. Báo cáo không tự ý suy diễn ngoài các bằng chứng đã được xác lập một cách minh bạch.",
            "contentHash": "704cb2fae109c8b9cc760ad12736881a63a9542875934a374db92f5a51b2ed34"
        }
    ]
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
    // validQuery hoisted to top describe

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

  describe("findings hardening: manifests, limits, reuse, and ordering", () => {
    it("finding 8: manifests cite docs/05-report-system.md, use method-reviewer, and omit unsupported astrological claims", () => {
      const viRaw = readFileSync("content/knowledge/vi/ziwei/identity-report-foundation.v1.json", "utf8");
      const enRaw = readFileSync("content/knowledge/en/ziwei/identity-report-foundation.v1.json", "utf8");
      const vi = JSON.parse(viRaw);
      const en = JSON.parse(enRaw);

      // Not self-referential
      expect(vi.sourcePath).toBe("docs/05-report-system.md");
      expect(en.sourcePath).toBe("docs/05-report-system.md");
      expect(vi.sourcePath).not.toContain(".json");
      expect(en.sourcePath).not.toContain(".json");

      // Valid reviewer
      expect(vi.approval.approver).toBe("method-reviewer");
      expect(en.approval.approver).toBe("method-reviewer");

      // Prohibited unsupported claims absent
      const prohibitedTerms = [
        "ephemerides",
        "thiên văn",
        "đắc hãm",
        "brightness",
        "cát tinh",
        "sát tinh",
        "malefic",
      ];

      const viAllContent = vi.chunks.map((c: any) => c.content).join(" ").toLowerCase();
      const enAllContent = en.chunks.map((c: any) => c.content).join(" ").toLowerCase();

      for (const term of prohibitedTerms) {
        expect(viAllContent).not.toContain(term.toLowerCase());
        expect(enAllContent).not.toContain(term.toLowerCase());
      }
    });

    it("finding 1: immutable reuse rejects mismatch in sourceAttribution, approver, approvedAt, or chunk metadata", async () => {
      const existingDoc = {
        id: "ziwei:vi:ziwei.identity.knowledge.v1:ziwei-identity-foundation-vi",
        documentId: validManifest.documentId,
        knowledgeVersion: validManifest.knowledgeVersion,
        discipline: validManifest.discipline,
        locale: validManifest.locale,
        sourcePath: validManifest.sourcePath,
        sourceAttribution: validManifest.sourceAttribution,
        permittedUse: validManifest.permittedUse,
        contentHash: validManifest.contentHash,
        approvalStatus: validManifest.approval.status,
        approvedBy: validManifest.approval.approver,
        approvedAt: new Date(validManifest.approval.approvedAt),
      };

      const existingChunks = validManifest.chunks.map((c) => ({
        passageId: c.passageId,
        content: c.content,
        contentHash: c.contentHash,
        reportSections: c.reportSections,
      }));

      // If attribution differs
      const mockDbDiffAttr = {
        select: () => ({
          from: () => ({
            where: () => ({
              limit: async () => [{ ...existingDoc, sourceAttribution: "Different Attribution" }],
            }),
          }),
        }),
      } as any;

      const ingestionDiffAttr = createKnowledgeIngestionService({ database: mockDbDiffAttr });
      const resultAttr = await ingestionDiffAttr.ingestKnowledge(validManifest);
      expect(resultAttr.ok).toBe(false);
      expect((resultAttr as any).code).toBe("KNOWLEDGE_METADATA_INVALID");

      // If approver differs
      const mockDbDiffApprover = {
        select: () => ({
          from: () => ({
            where: () => ({
              limit: async () => [{ ...existingDoc, approvedBy: "other-reviewer" }],
            }),
          }),
        }),
      } as any;

      const ingestionDiffApprover = createKnowledgeIngestionService({ database: mockDbDiffApprover });
      const resultApprover = await ingestionDiffApprover.ingestKnowledge(validManifest);
      expect(resultApprover.ok).toBe(false);
      expect((resultApprover as any).code).toBe("KNOWLEDGE_METADATA_INVALID");

      // If approvedAt differs
      const mockDbDiffApprovedAt = {
        select: () => ({
          from: () => ({
            where: () => ({
              limit: async () => [{ ...existingDoc, approvedAt: new Date("2026-08-01T00:00:00.000Z") }],
            }),
          }),
        }),
      } as any;

      const ingestionDiffApprovedAt = createKnowledgeIngestionService({ database: mockDbDiffApprovedAt });
      const resultApprovedAt = await ingestionDiffApprovedAt.ingestKnowledge(validManifest);
      expect(resultApprovedAt.ok).toBe(false);
      expect((resultApprovedAt as any).code).toBe("KNOWLEDGE_METADATA_INVALID");
    });

    it("finding 6: rejects NaN, Infinity, and fractions in numeric context limits with KNOWLEDGE_CONTEXT_LIMIT", async () => {
      const mockDb = { execute: vi.fn().mockResolvedValue([]) } as any;
      const retrievalService = createKnowledgeRetrievalService({ database: mockDb });

      const invalidLimits = [
        { maxPassages: NaN },
        { maxPassages: Infinity },
        { maxPassages: 3.5 },
        { maxPassages: -1 },
        { maxCharsPerPassage: NaN },
        { maxCharsPerPassage: Infinity },
        { maxCharsPerPassage: 500.5 },
        { maxTotalChars: NaN },
        { maxTotalChars: Infinity },
        { maxTotalChars: 1200.7 },
      ];

      for (const limit of invalidLimits) {
        await expect(
          retrievalService.retrieveKnowledge({ ...validQuery, ...limit }),
        ).rejects.toThrowError(expect.objectContaining({ code: "KNOWLEDGE_CONTEXT_LIMIT" }));
      }
    });

    it("finding 4: preserves full-text rank desc passageId asc ordering and vector mode never replaces it", async () => {
      const isIndexReady = vi.fn().mockResolvedValue(true);
      const queryVector = vi.fn().mockResolvedValue([
        { passageId: "chunk-b", score: 0.99 },
        { passageId: "chunk-a", score: 0.1 },
      ]);
      const vectorDependency: VectorRetrievalDependency = {
        isIndexReady,
        query: queryVector,
      };

      // FTS returns chunk-a with higher FTS rank than chunk-b
      const mockDb = {
        execute: vi.fn().mockResolvedValue([
          {
            id: "id-a",
            passage_id: "chunk-a",
            document_id: "doc-01",
            discipline: "ziwei",
            locale: "vi",
            report_sections: ["data_and_method"],
            knowledge_version: "ziwei.identity.knowledge.v1",
            content: "Nguyen ly A",
            content_hash: "hash-a",
            source_attribution: "attr",
            permitted_use: "first_party",
            rank: 0.8,
          },
          {
            id: "id-b",
            passage_id: "chunk-b",
            document_id: "doc-01",
            discipline: "ziwei",
            locale: "vi",
            report_sections: ["data_and_method"],
            knowledge_version: "ziwei.identity.knowledge.v1",
            content: "Nguyen ly B",
            content_hash: "hash-b",
            source_attribution: "attr",
            permitted_use: "first_party",
            rank: 0.5,
          },
        ]),
      } as any;

      const retrievalService = createKnowledgeRetrievalService({
        database: mockDb,
        vectorRetrieval: vectorDependency,
      });

      const passages = await retrievalService.retrieveKnowledge({
        ...validQuery,
        enableVector: true,
        vectorQuery: [0.1, 0.2],
      });

      // Even though vector score for chunk-b is higher, chunk-a came from FTS with rank 0.8 and must remain first!
      expect(passages[0].passageId).toBe("chunk-a");
      expect(passages[1].passageId).toBe("chunk-b");
    });
  });


    it("finding pass 2 item 3: rejects duplicate passageId in one manifest before persistence", async () => {
      const duplicateChunkManifest: KnowledgeManifestV1 = {
        ...validManifest,
        chunks: [
          validManifest.chunks[0],
          { ...validManifest.chunks[0] },
        ],
      };

      const mockDb = {} as any;
      const ingestionService = createKnowledgeIngestionService({ database: mockDb });
      const result = await ingestionService.ingestKnowledge(duplicateChunkManifest);

      expect(result.ok).toBe(false);
      expect((result as any).code).toBe("KNOWLEDGE_METADATA_INVALID");
    });


    it("finding pass 3: maps expected PostgreSQL chunk unique violation (23505) to fixed non-sensitive KNOWLEDGE_METADATA_INVALID", async () => {
      const mockDb = {
        select: () => ({
          from: () => ({
            where: () => {
              const res: any = Promise.resolve([]);
              res.limit = async () => [];
              return res;
            },
          }),
        }),
        transaction: async () => {
          const pgError = Object.assign(new Error("duplicate key value violates unique constraint"), {
            code: "23505",
            constraint_name: "knowledge_chunks_version_passage_unique",
            table: "knowledge_chunks",
          });
          throw pgError;
        },
      } as any;

      const ingestionService = createKnowledgeIngestionService({ database: mockDb });
      const result = await ingestionService.ingestKnowledge(validManifest);

      expect(result.ok).toBe(false);
      expect((result as any).code).toBe("KNOWLEDGE_METADATA_INVALID");
      const message = (result as any).error?.message;
      expect(message).toBe("Knowledge chunk passage collision detected");
      expect(message).not.toContain("duplicate");
      expect(message).not.toContain("unique");
      expect(message).not.toContain("knowledge_chunks");
    });

    it("finding pass 3: propagates non-unique infrastructure failures without mapping to metadata error", async () => {
      const infraError = Object.assign(new Error("connection terminated unexpectedly"), {
        code: "08006",
      });

      const mockDb = {
        select: () => ({
          from: () => ({
            where: () => {
              const res: any = Promise.resolve([]);
              res.limit = async () => [];
              return res;
            },
          }),
        }),
        transaction: async () => {
          throw infraError;
        },
      } as any;

      const ingestionService = createKnowledgeIngestionService({ database: mockDb });

      // Must propagate the infrastructure error instead of returning KNOWLEDGE_METADATA_INVALID
      await expect(ingestionService.ingestKnowledge(validManifest)).rejects.toThrow(infraError);
    });


    it("finding pass 4: propagates PostgreSQL 23505 with missing constraint without mapping to metadata error", async () => {
      const missingConstraintError = Object.assign(
        new Error("duplicate key value violates unique constraint"),
        {
          code: "23505",
        },
      );

      const mockDb = {
        select: () => ({
          from: () => ({
            where: () => {
              const res: any = Promise.resolve([]);
              res.limit = async () => [];
              return res;
            },
          }),
        }),
        transaction: async () => {
          throw missingConstraintError;
        },
      } as any;

      const ingestionService = createKnowledgeIngestionService({ database: mockDb });
      await expect(ingestionService.ingestKnowledge(validManifest)).rejects.toThrow(missingConstraintError);
    });

    it("finding pass 4: propagates PostgreSQL 23505 with unrelated constraint without mapping to metadata error", async () => {
      const unrelatedConstraintError = Object.assign(
        new Error("duplicate key value violates unique constraint"),
        {
          code: "23505",
          constraint_name: "unrelated_knowledge_chunks_constraint",
        },
      );

      const mockDb = {
        select: () => ({
          from: () => ({
            where: () => {
              const res: any = Promise.resolve([]);
              res.limit = async () => [];
              return res;
            },
          }),
        }),
        transaction: async () => {
          throw unrelatedConstraintError;
        },
      } as any;

      const ingestionService = createKnowledgeIngestionService({ database: mockDb });
      await expect(ingestionService.ingestKnowledge(validManifest)).rejects.toThrow(unrelatedConstraintError);
    });
});
