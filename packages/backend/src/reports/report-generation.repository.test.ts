import { describe, expect, it, vi } from "vitest";
import { createDatabaseReportGenerationSourceRepository } from "./report-generation.repository.js";
import {
  REPORT_KNOWLEDGE_VERSION_V1,
  REPORT_KNOWLEDGE_VERSION_V2,
  REPORT_PROMPT_VERSION_V1,
  REPORT_PROMPT_VERSION_V2,
} from "./identity-report-config.js";

describe("createDatabaseReportGenerationSourceRepository - version family gating", () => {
  it.each([
    ["mismatched V1 prompt and V2 knowledge", REPORT_PROMPT_VERSION_V1, REPORT_KNOWLEDGE_VERSION_V2],
    ["mismatched V2 prompt and V1 knowledge", REPORT_PROMPT_VERSION_V2, REPORT_KNOWLEDGE_VERSION_V1],
    ["unknown knowledge version", REPORT_PROMPT_VERSION_V2, "unknown.knowledge.v999"],
    ["unknown prompt version", "unknown.prompt.v999", REPORT_KNOWLEDGE_VERSION_V2],
  ])("returns REPORT_EVIDENCE_INVALID for %s without querying knowledge", async (_name, promptVersion, knowledgeVersionId) => {
    const retrieveKnowledgeSpy = vi.fn();
    const mockDb = {
      select: vi.fn(),
    };

    const repository = createDatabaseReportGenerationSourceRepository({
      database: mockDb as never,
      knowledgeRetrieval: {
        retrieveKnowledge: retrieveKnowledgeSpy,
      },
    });

    const result = await repository.loadSource({
      reportVersionId: "report-v1",
      chartVersionId: "chart-v1",
      evidenceVersionId: "evidence-v1",
      knowledgeVersionId,
      promptVersion,
      locale: "vi",
    });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "REPORT_EVIDENCE_INVALID",
        messageKey: "reports.report_evidence_invalid",
        retryable: false,
      },
    });
    expect(retrieveKnowledgeSpy).not.toHaveBeenCalled();
    expect(mockDb.select).not.toHaveBeenCalled();
  });
});
