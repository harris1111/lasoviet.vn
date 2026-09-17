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

describe("createDatabaseReportGenerationSourceRepository - V4 source loading", () => {
  function createSampleSnapshot() {
    return {
      id: "snap-1",
      reportId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      reportVersionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      chartVersionId: "chart-v1",
      asOfDate: "2026-09-12",
      targetYear: 2026,
      timingRuleVersion: "ziwei.timing.v1",
      sensitivityRuleVersion: "ziwei.sensitivity.v1",
      snapshotHash: "c".repeat(64),
      snapshot: {
        version: 1,
        chartVersionId: "chart-v1",
        asOfDate: "2026-09-12",
        timezone: "Asia/Ho_Chi_Minh",
        timingRuleVersion: "ziwei.timing.v1",
        sensitivityRuleVersion: "ziwei.sensitivity.v1",
        timing: {
          decadal: {
            state: "active" as const,
            index: 1,
            ageRange: [15, 24] as [number, number],
            yearRange: [2020, 2029] as [number, number],
            palaceId: "ziwei.palace.siblings" as const,
            heavenlyStemId: "ziwei.stem.yi",
            earthlyBranchId: "ziwei.branch.rabbit" as const,
            palaces: palaceIds.map((id, index) => ({
              palaceId: id,
              heavenlyStemId: "ziwei.stem.jia",
              earthlyBranchId: branches[index]!,
              isOriginalPalace: index === 0,
              cycleStateId: "ziwei.cycle.born",
              stars: [{ id: "ziwei.star.ziwei", brightness: "ziwei.brightness.prosperous", category: "major" as const }],
              transformations: [],
            })),
          },
          annual: {
            targetYear: 2026,
            palaceId: "ziwei.palace.travel" as const,
            heavenlyStemId: "ziwei.stem.bing",
            earthlyBranchId: "ziwei.branch.horse" as const,
            palaces: palaceIds.map((id, index) => ({
              palaceId: id,
              heavenlyStemId: "ziwei.stem.jia",
              earthlyBranchId: branches[index]!,
              isOriginalPalace: index === 0,
              cycleStateId: "ziwei.cycle.born",
              stars: [{ id: "ziwei.star.ziwei", brightness: "ziwei.brightness.prosperous", category: "major" as const }],
              transformations: [],
            })),
          },
          provenance: {
            engineId: "ziwei.iztro",
            engineVersion: "2.6.0",
            adapterId: "ziwei.iztro-adapter",
            adapterVersion: "1.0.0",
            ruleSetId: "ziwei.default",
            config: {
              yearDivide: "normal",
              horoscopeDivide: "normal",
              ageDivide: "normal",
              dayDivide: "current",
            },
          },
        },
        sensitivity: {
          selectedFrame: { position: "selected" as const, vendorTimeIndex: 6, civilDateOffset: 0 as const, frameId: "ziwei.time-frame.horse" },
          previousFrame: { position: "previous" as const, vendorTimeIndex: 5, civilDateOffset: 0 as const, frameId: "ziwei.time-frame.snake" },
          nextFrame: { position: "next" as const, vendorTimeIndex: 7, civilDateOffset: 0 as const, frameId: "ziwei.time-frame.goat" },
          stableFactKeys: ["ziwei.fact.soul-palace"],
          sensitiveFacts: [],
        },
        provenance: {
          chartVersionId: "chart-v1",
          timingRuleVersion: "ziwei.timing.v1",
          sensitivityRuleVersion: "ziwei.sensitivity.v1",
          snapshotHash: "c".repeat(64),
        },
      },
      createdAt: new Date(),
    };
  }

  it("loads frozen snapshot, builds V4 facts, queries V3 knowledge corpus, and returns bound V4 source", async () => {
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
    const mockSnapshotRepo = {
      getByReportVersionId: vi.fn().mockResolvedValue(createSampleSnapshot()),
      persist: vi.fn(),
    };

    const repository = createDatabaseReportGenerationSourceRepository({
      database: mockDb as never,
      knowledgeRetrieval: {
        retrieveKnowledge: vi.fn(),
        retrieveZiweiKnowledge: retrieveZiweiKnowledgeSpy,
      },
      snapshotRepository: mockSnapshotRepo as never,
    });

    const result = await repository.loadSource({
      reportVersionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      chartVersionId: "chart-v1",
      evidenceVersionId: "evidence-v1",
      knowledgeVersionId: "ziwei.comprehensive.knowledge.v3",
      promptVersion: "ziwei.comprehensive.prompt.v4",
      locale: "vi",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.comprehensiveFacts).toBeDefined();
    expect(result.value.comprehensiveFactsV4).toBeDefined();
    expect(result.value.comprehensiveFactsV4?.timing.decadal.state).toBe("active");
    expect(result.value.comprehensiveFactsV4?.timing.annual.targetYear).toBe(2026);
    expect(result.value.knowledgePacks).toHaveLength(19);
    expect(retrieveZiweiKnowledgeSpy).toHaveBeenCalledTimes(19);
    // Verifies retrieval query explicitly asked for V3 knowledge corpus
    expect(retrieveZiweiKnowledgeSpy.mock.calls[0][0].knowledgeVersion).toBe("ziwei.comprehensive.knowledge.v3");
  });

  it.each([
    [
      "loads a valid frozen ReadingContextV1 revision",
      { lifeStage: "early_career", topConcern: "career" },
      true,
    ],
    [
      "fails closed for an invalid database enum",
      { lifeStage: "not_a_life_stage", topConcern: "career" },
      false,
    ],
    [
      "fails closed when the requested frozen revision is missing",
      undefined,
      false,
    ],
  ])("%s", async (_name, revision, expectedSuccess) => {
    const chart = createSampleChart();
    const evidenceResult = buildZiweiIdentityEvidence(chart, "chart-v1");
    if (!evidenceResult.ok) return;

    const mockDb = {
      select: vi.fn().mockImplementation((fields) => ({
        from: vi.fn().mockImplementation(() => ({
          where: vi.fn().mockImplementation(() => {
            if (fields && fields.normalizedOutput !== undefined) {
              return { limit: vi.fn().mockResolvedValue([{ normalizedOutput: chart }]) };
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
            if (fields && fields.evidenceKey !== undefined) {
              return {
                orderBy: vi.fn().mockResolvedValue(evidenceResult.value.items.map((item) => ({
                  evidenceKey: item.id,
                  payload: item,
                }))),
              };
            }
            return { limit: vi.fn().mockResolvedValue(revision === undefined ? [] : [revision]) };
          }),
        })),
      })),
    };
    const passage: KnowledgePassageV1 = {
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
    const repository = createDatabaseReportGenerationSourceRepository({
      database: mockDb as never,
      knowledgeRetrieval: {
        retrieveKnowledge: vi.fn(),
        retrieveZiweiKnowledge: vi.fn().mockResolvedValue([passage]),
      },
      snapshotRepository: {
        getByReportVersionId: vi.fn().mockResolvedValue(createSampleSnapshot()),
        persist: vi.fn(),
      } as never,
    });

    const result = await repository.loadSource({
      reportVersionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      chartVersionId: "chart-v1",
      evidenceVersionId: "evidence-v1",
      knowledgeVersionId: "ziwei.comprehensive.knowledge.v3",
      promptVersion: "ziwei.comprehensive.prompt.v4",
      locale: "vi",
      readingContextRevisionId: "context-1",
    });

    expect(result.ok).toBe(expectedSuccess);
    if (result.ok) {
      expect(result.value.readingContext).toEqual({
        version: 1,
        lifeStage: "early_career",
        topConcern: "career",
      });
    } else {
      expect(result.error.code).toBe("REPORT_EVIDENCE_INVALID");
    }
  });

  it("returns REPORT_EVIDENCE_INVALID when snapshot is missing", async () => {
    const chart = createSampleChart();
    const evidenceResult = buildZiweiIdentityEvidence(chart, "chart-v1");
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

    const mockSnapshotRepo = {
      getByReportVersionId: vi.fn().mockResolvedValue(null),
      persist: vi.fn(),
    };

    const repository = createDatabaseReportGenerationSourceRepository({
      database: mockDb as never,
      knowledgeRetrieval: {
        retrieveKnowledge: vi.fn(),
        retrieveZiweiKnowledge: vi.fn(),
      },
      snapshotRepository: mockSnapshotRepo as never,
    });

    const result = await repository.loadSource({
      reportVersionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      chartVersionId: "chart-v1",
      evidenceVersionId: "evidence-v1",
      knowledgeVersionId: "ziwei.comprehensive.knowledge.v3",
      promptVersion: "ziwei.comprehensive.prompt.v4",
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
});

describe("createDatabaseReportGenerationSourceRepository - lifecycle fence", () => {
  function createLifecycleDatabase(row: Record<string, unknown> | undefined) {
    const limit = vi.fn().mockResolvedValue(row === undefined ? [] : [row]);
    const where = vi.fn().mockReturnValue({ limit });
    const leftJoin = vi.fn();
    const joins = { leftJoin, where };
    leftJoin.mockImplementation(() => joins);
    const from = vi.fn().mockReturnValue(joins);
    const select = vi.fn().mockReturnValue({ from });
    return { database: { select } as never, select, from, leftJoin, where, limit };
  }

  async function validate(
    row: Record<string, unknown> | undefined,
    readingContextRevisionId: string | null = null,
  ) {
    const mock = createLifecycleDatabase(row);
    const repository = createDatabaseReportGenerationSourceRepository({
      database: mock.database,
      knowledgeRetrieval: { retrieveKnowledge: vi.fn() },
    });
    const result = await repository.validateLifecycle({
      reportVersionId: "report-version-1",
      jobId: "active-job-1",
      readingContextRevisionId,
    });
    return { result, mock };
  }

  function validOrderAuthority(
    context: {
      reservationContextRevisionId: string | null;
      revisionId: string | null;
      revisionProfileId: string | null;
    },
  ) {
    return {
      ...context,
      profileId: "profile-1",
      profileOwnerId: "owner-1",
      chartVersionChartId: "chart-1",
      reservation: {
        chartVersionId: "chart-version-1",
        evidenceVersionId: "evidence-1",
        sku: "ZIWEI-IDENTITY-P0",
        locale: "vi",
      },
      entitlement: {
        id: "entitlement-1",
        orderId: "order-1",
        ledgerSpendId: null,
        ownerId: "owner-1",
        chartId: "chart-1",
        sku: "ZIWEI-IDENTITY-P0",
      },
      order: {
        id: "order-1",
        kind: "content_purchase",
        status: "paid",
        ownerId: "owner-1",
        chartId: "chart-1",
        chartVersionId: "chart-version-1",
        sku: "ZIWEI-IDENTITY-P0",
        locale: "vi",
      },
      spend: null,
      wallet: null,
      intent: null,
      evidence: {
        id: "evidence-1",
        chartVersionId: "chart-version-1",
        capabilityId: "ziwei.identity.p0",
      },
    };
  }

  it("fails REPORT_CONTEXT_MISMATCH when no scoped lifecycle record remains", async () => {
    const { result, mock } = await validate(undefined);

    expect(result).toMatchObject({
      ok: false,
      error: { code: "REPORT_CONTEXT_MISMATCH", retryable: false },
    });
    expect(mock.select).toHaveBeenCalledTimes(1);
    expect(mock.leftJoin).toHaveBeenCalledTimes(10);
    expect(mock.where).toHaveBeenCalledTimes(1);
    expect(mock.limit).toHaveBeenCalledWith(1);
    const containsValue = (
      value: unknown,
      target: string,
      seen = new Set<object>(),
    ): boolean => {
      if (value === target) return true;
      if (value === null || typeof value !== "object") return false;
      if (seen.has(value)) return false;
      seen.add(value);
      return Object.values(value).some((child) => containsValue(child, target, seen));
    };
    const scopedCondition = mock.where.mock.calls[0]![0];
    expect(containsValue(scopedCondition, "report-version-1")).toBe(true);
    expect(containsValue(scopedCondition, "active-job-1")).toBe(true);
  });

  it.each([
    ["with a null frozen context", null],
    ["with a non-null frozen context", "context-1"],
  ])("fails REPORT_PROFILE_PURGED after hard purge %s", async (_name, readingContextRevisionId) => {
    const { result } = await validate(
      {
        reservationContextRevisionId: readingContextRevisionId,
        profileId: null,
        revisionId: readingContextRevisionId,
        revisionProfileId: "profile-1",
      },
      readingContextRevisionId,
    );

    expect(result).toMatchObject({
      ok: false,
      error: { code: "REPORT_PROFILE_PURGED", retryable: false },
    });
  });

  it("allows an active or soft-archived profile when frozen null context matches", async () => {
    for (const deletedAt of [null, new Date("2026-09-15T00:00:00.000Z")]) {
      const { result } = await validate({
        ...validOrderAuthority({
          reservationContextRevisionId: null,
          revisionId: null,
          revisionProfileId: null,
        }),
        profileDeletedAt: deletedAt,
      });

      expect(result).toEqual({
        ok: true,
        value: { readingContextRevisionId: null },
      });
    }
  });

  it("allows an active frozen context revision only when it belongs to the joined profile", async () => {
    const { result } = await validate(
      {
        ...validOrderAuthority({
          reservationContextRevisionId: "context-1",
          revisionId: "context-1",
          revisionProfileId: "profile-1",
        }),
      },
      "context-1",
    );

    expect(result).toEqual({
      ok: true,
      value: { readingContextRevisionId: "context-1" },
    });
  });

  it.each([
    [
      "payload does not match the frozen reservation context",
      validOrderAuthority({
        reservationContextRevisionId: "context-1",
        revisionId: "context-1",
        revisionProfileId: "profile-1",
      }),
      "context-2",
    ],
    [
      "the frozen revision no longer exists",
      validOrderAuthority({
        reservationContextRevisionId: "context-1",
        revisionId: null,
        revisionProfileId: null,
      }),
      "context-1",
    ],
    [
      "the frozen revision belongs to another profile",
      validOrderAuthority({
        reservationContextRevisionId: "context-1",
        revisionId: "context-1",
        revisionProfileId: "profile-2",
      }),
      "context-1",
    ],
  ])("fails REPORT_CONTEXT_MISMATCH when %s", async (_name, row, readingContextRevisionId) => {
    const { result } = await validate(row, readingContextRevisionId);

    expect(result).toMatchObject({
      ok: false,
      error: { code: "REPORT_CONTEXT_MISMATCH", retryable: false },
    });
  });
});
