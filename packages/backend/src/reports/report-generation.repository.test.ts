import { describe, expect, it, vi } from "vitest";
import type { NormalizedZiweiChartV1, ZiweiPalaceId } from "@lasoviet/contracts";
import { createDatabaseReportGenerationSourceRepository } from "./report-generation.repository.js";
import {
  REPORT_KNOWLEDGE_VERSION_V1,
  REPORT_KNOWLEDGE_VERSION_V2,
  REPORT_PROMPT_VERSION_V1,
  REPORT_PROMPT_VERSION_V2,
} from "./identity-report-config.js";
import { buildZiweiIdentityEvidence } from "../evidence/ziwei-identity-rules.js";
import { KnowledgeError, type KnowledgePassageV1 } from "../knowledge/knowledge-retrieval.service.js";

const palaceIds: ZiweiPalaceId[] = [
  "ziwei.palace.life",
  "ziwei.palace.siblings",
  "ziwei.palace.spouse",
  "ziwei.palace.children",
  "ziwei.palace.wealth",
  "ziwei.palace.health",
  "ziwei.palace.travel",
  "ziwei.palace.friends",
  "ziwei.palace.career",
  "ziwei.palace.property",
  "ziwei.palace.fortune",
  "ziwei.palace.parents",
];

const branches = [
  "ziwei.branch.tiger",
  "ziwei.branch.rabbit",
  "ziwei.branch.dragon",
  "ziwei.branch.snake",
  "ziwei.branch.horse",
  "ziwei.branch.goat",
  "ziwei.branch.monkey",
  "ziwei.branch.rooster",
  "ziwei.branch.dog",
  "ziwei.branch.pig",
  "ziwei.branch.rat",
  "ziwei.branch.ox",
] as const;

function createSampleChart(): NormalizedZiweiChartV1 {
  return {
    version: 1,
    systemId: "ziwei",
    palaces: palaceIds.map((id, index) => ({
      id,
      earthlyBranchId: branches[index]!,
      heavenlyStemId: "ziwei.stem.jia",
      isBodyPalace: id === "ziwei.palace.career",
      isOriginalPalace: index === 0,
      cycleStateId: "ziwei.cycle.born",
      stars:
        id === "ziwei.palace.life"
          ? [
              {
                id: "ziwei.star.ziwei",
                brightness: "ziwei.brightness.prosperous",
                category: "major",
              },
              {
                id: "ziwei.star.tianfu",
                brightness: "ziwei.brightness.prosperous",
                category: "major",
              },
            ]
          : [],
    })),
    transformations: [
      {
        starId: "ziwei.star.ziwei",
        id: "ziwei.transformation.power",
      },
      {
        starId: "ziwei.star.tianfu",
        id: "ziwei.transformation.prosperity",
      },
    ],
    soulPalaceId: "ziwei.palace.life",
    bodyPalaceId: "ziwei.palace.career",
    horoscopeCapabilities: [
      { id: "ziwei.horoscope.decadal", supported: true },
      { id: "ziwei.horoscope.annual", supported: true },
    ],
    warnings: [],
    provenance: {
      version: 1,
      engineId: "ziwei.iztro",
      engineVersion: "2.6.0",
      adapterId: "ziwei.iztro-adapter",
      adapterVersion: "1.0.0",
      schemaId: "normalized-ziwei-chart-v1",
      ruleSetId: "ziwei.default",
      inputHash: "a".repeat(64),
      configHash: "b".repeat(64),
      rawSnapshotHash: "c".repeat(64),
      calculatedAt: "2026-09-02T00:00:00+00:00",
      limitations: ["IZTRO_NO_TRUE_SOLAR_TIME_CORRECTION"],
    },
  };
}

describe("createDatabaseReportGenerationSourceRepository - version family gating", () => {
  it.each([
    ["mismatched V1 prompt and V2 knowledge", REPORT_PROMPT_VERSION_V1, REPORT_KNOWLEDGE_VERSION_V2, "vi"],
    ["mismatched V2 prompt and V1 knowledge", REPORT_PROMPT_VERSION_V2, REPORT_KNOWLEDGE_VERSION_V1, "vi"],
    ["mismatched V3 prompt and V2 knowledge", "ziwei.comprehensive.prompt.v3", REPORT_KNOWLEDGE_VERSION_V2, "vi"],
    ["mismatched V2 prompt and V3 knowledge", REPORT_PROMPT_VERSION_V2, "ziwei.comprehensive.knowledge.v3", "vi"],
    ["V3 prompt with locale en", "ziwei.comprehensive.prompt.v3", "ziwei.comprehensive.knowledge.v3", "en"],
    ["unknown knowledge version", REPORT_PROMPT_VERSION_V2, "unknown.knowledge.v999", "vi"],
    ["unknown prompt version", "unknown.prompt.v999", REPORT_KNOWLEDGE_VERSION_V2, "vi"],
  ])("returns REPORT_EVIDENCE_INVALID for %s without querying knowledge", async (_name, promptVersion, knowledgeVersionId, locale) => {
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
      locale: locale as "vi" | "en",
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

describe("createDatabaseReportGenerationSourceRepository - V3 source loading", () => {
  it("loads immutable chart, builds comprehensive facts, retrieves packs, and returns bound V3 source", async () => {
    const chart = createSampleChart();
    const evidenceResult = buildZiweiIdentityEvidence(chart, "chart-v1");
    expect(evidenceResult.ok).toBe(true);
    if (!evidenceResult.ok) return;

    const mockDb = {
      select: vi.fn().mockImplementation((fields) => ({
        from: vi.fn().mockImplementation(() => ({
          where: vi.fn().mockImplementation(() => {
            if (fields && fields.normalizedOutput !== undefined) {
              return {
                limit: vi.fn().mockResolvedValue([{ normalizedOutput: chart }]),
              };
            }
            if (fields && fields.chartVersionId !== undefined) {
              return {
                limit: vi.fn().mockResolvedValue([{
                  id: "evidence-v1",
                  chartVersionId: evidenceResult.value.chartVersionId,
                  capabilityId: evidenceResult.value.capabilityId,
                  ruleVersion: evidenceResult.value.ruleVersion,
                }]),
              };
            }
            return {
              orderBy: vi.fn().mockResolvedValue(
                evidenceResult.value.items.map((item) => ({
                  evidenceKey: item.id,
                  payload: item,
                })),
              ),
            };
          }),
        })),
      })),
    };

    const dummyPassage: KnowledgePassageV1 = {
      id: "row-v3-1",
      passageId: "passage-v3-01",
      documentId: "doc-v3",
      discipline: "ziwei",
      locale: "vi",
      reportSections: ["identity_analysis"],
      knowledgeVersion: "ziwei.comprehensive.knowledge.v3",
      content: "Nội dung đoạn trích V3 cho toàn bộ lá số.",
      contentHash: "hash-v3-01",
      sourceAttribution: "Lá Số Việt",
      permittedUse: "reference_rewrite",
      metadata: {
        topics: ["overview"],
        palaces: ["ziwei.palace.life"],
        stars: ["ziwei.star.ziwei"],
        brightness: ["ziwei.brightness.prosperous"],
        transformations: [],
        relations: [],
        patterns: [],
        sourceType: "classical",
        languageOrigin: "vi",
        priority: 2,
      },
    };

    const retrieveZiweiKnowledgeSpy = vi.fn().mockResolvedValue([dummyPassage]);
    const retrieveKnowledgeSpy = vi.fn();

    const repository = createDatabaseReportGenerationSourceRepository({
      database: mockDb as never,
      knowledgeRetrieval: {
        retrieveKnowledge: retrieveKnowledgeSpy,
        retrieveZiweiKnowledge: retrieveZiweiKnowledgeSpy,
      },
    });

    const result = await repository.loadSource({
      reportVersionId: "report-v3",
      chartVersionId: "chart-v1",
      evidenceVersionId: "evidence-v1",
      knowledgeVersionId: "ziwei.comprehensive.knowledge.v3",
      promptVersion: "ziwei.comprehensive.prompt.v3",
      locale: "vi",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.comprehensiveFacts).toBeDefined();
    expect(result.value.comprehensiveFacts?.palaces).toHaveLength(12);
    expect(result.value.knowledgePacks).toHaveLength(19);
    expect(result.value.knowledgePassages.length).toBeGreaterThan(0);
    expect(retrieveKnowledgeSpy).not.toHaveBeenCalled();
    expect(retrieveZiweiKnowledgeSpy).toHaveBeenCalledTimes(19);
  });

  it("catches KnowledgeError and returns REPORT_EVIDENCE_INVALID", async () => {
    const chart = createSampleChart();
    const evidenceResult = buildZiweiIdentityEvidence(chart, "chart-v1");
    expect(evidenceResult.ok).toBe(true);
    if (!evidenceResult.ok) return;

    const mockDb = {
      select: vi.fn().mockImplementation((fields) => ({
        from: vi.fn().mockImplementation(() => ({
          where: vi.fn().mockImplementation(() => {
            if (fields && fields.normalizedOutput !== undefined) {
              return {
                limit: vi.fn().mockResolvedValue([{ normalizedOutput: chart }]),
              };
            }
            if (fields && fields.chartVersionId !== undefined) {
              return {
                limit: vi.fn().mockResolvedValue([{
                  id: "evidence-v1",
                  chartVersionId: evidenceResult.value.chartVersionId,
                  capabilityId: evidenceResult.value.capabilityId,
                  ruleVersion: evidenceResult.value.ruleVersion,
                }]),
              };
            }
            return {
              orderBy: vi.fn().mockResolvedValue(
                evidenceResult.value.items.map((item) => ({
                  evidenceKey: item.id,
                  payload: item,
                })),
              ),
            };
          }),
        })),
      })),
    };

    const repository = createDatabaseReportGenerationSourceRepository({
      database: mockDb as never,
      knowledgeRetrieval: {
        retrieveKnowledge: vi.fn(),
        retrieveZiweiKnowledge: vi.fn().mockRejectedValue(
          new KnowledgeError("KNOWLEDGE_CONTEXT_LIMIT", "Context limit exceeded"),
        ),
      },
    });

    const result = await repository.loadSource({
      reportVersionId: "report-v3",
      chartVersionId: "chart-v1",
      evidenceVersionId: "evidence-v1",
      knowledgeVersionId: "ziwei.comprehensive.knowledge.v3",
      promptVersion: "ziwei.comprehensive.prompt.v3",
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
  });

  it("preserves V1 and V2 source loading unchanged", async () => {
    const chart = createSampleChart();
    const evidenceResult = buildZiweiIdentityEvidence(chart, "chart-v1");
    expect(evidenceResult.ok).toBe(true);
    if (!evidenceResult.ok) return;

    const mockDb = {
      select: vi.fn().mockImplementation((fields) => ({
        from: vi.fn().mockImplementation(() => ({
          where: vi.fn().mockImplementation(() => {
            if (fields && fields.normalizedOutput !== undefined) {
              return {
                limit: vi.fn().mockResolvedValue([{ normalizedOutput: chart }]),
              };
            }
            if (fields && fields.chartVersionId !== undefined) {
              return {
                limit: vi.fn().mockResolvedValue([{
                  id: "evidence-v1",
                  chartVersionId: evidenceResult.value.chartVersionId,
                  capabilityId: evidenceResult.value.capabilityId,
                  ruleVersion: evidenceResult.value.ruleVersion,
                }]),
              };
            }
            return {
              orderBy: vi.fn().mockResolvedValue(
                evidenceResult.value.items.map((item) => ({
                  evidenceKey: item.id,
                  payload: item,
                })),
              ),
            };
          }),
        })),
      })),
    };

    const dummyPassage: KnowledgePassageV1 = {
      id: "row-v2-1",
      passageId: "passage-v2-01",
      documentId: "doc-v2",
      discipline: "ziwei",
      locale: "en",
      reportSections: ["identity_analysis"],
      knowledgeVersion: REPORT_KNOWLEDGE_VERSION_V2,
      content: "Legacy V2 knowledge passage content.",
      contentHash: "hash-v2-01",
      sourceAttribution: "Lá Số Việt",
      permittedUse: "first_party",
    };

    const retrieveKnowledgeSpy = vi.fn().mockResolvedValue([dummyPassage]);

    const repository = createDatabaseReportGenerationSourceRepository({
      database: mockDb as never,
      knowledgeRetrieval: {
        retrieveKnowledge: retrieveKnowledgeSpy,
      },
    });

    const result = await repository.loadSource({
      reportVersionId: "report-v2",
      chartVersionId: "chart-v1",
      evidenceVersionId: "evidence-v1",
      knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V2,
      promptVersion: REPORT_PROMPT_VERSION_V2,
      locale: "en",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.comprehensiveFacts).toBeUndefined();
    expect(result.value.knowledgePacks).toBeUndefined();
    expect(result.value.knowledgePassages.length).toBeGreaterThan(0);
    expect(retrieveKnowledgeSpy).toHaveBeenCalled();
  });
});
