import { describe, expect, it, vi } from "vitest";

import {
  CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER,
  IDENTITY_REPORT_SECTION_IDS,
  ZIWEI_PALACE_IDS,
  ZIWEI_THEMATIC_SYNTHESIS_IDS,
  type EvidenceSetV1,
  type IdentityReportV1,
  type ZiweiComprehensiveReportContentV1,
  type ReportGenerateJobEnvelopeV1,
} from "@lasoviet/contracts";

import type { AiProductionGate, AiProvider } from "../ai/ai-provider.js";
import {
  createReportGenerationService,
  type ReportGenerationServiceDependencies,
} from "./report-generation.service.js";
import type { ReportGenerationSourceRepository } from "./report-generation.repository.js";
import type { ReportVersionRepository } from "./report-version.repository.js";
import {
  REPORT_CONFIG_VERSION_V3,
  REPORT_KNOWLEDGE_VERSION_V3,
  REPORT_PROMPT_VERSION_V1,
  REPORT_PROMPT_VERSION_V2,
  REPORT_PROMPT_VERSION_V3,
  REPORT_TEMPLATE_VERSION_V3,
} from "./identity-report-config.js";
import type { ComprehensiveZiweiFacts } from "./comprehensive-ziwei-facts.js";
import type { ZiweiReportKnowledgePack } from "./comprehensive-report-retrieval.js";

function buildReport(titlePrefix = "Draft 1"): IdentityReportV1 {
  return {
    version: 1,
    sku: "ZIWEI-IDENTITY-P0",
    capabilityId: "ziwei.identity.p0",
    locale: "vi",
    provenance: {
      chartVersionId: "chart-1",
      ruleVersion: "ziwei.identity.v1",
      evidenceVersion: 1,
      knowledgeVersion: "ziwei.identity.knowledge.v2",
      providerId: "test-provider",
      modelId: "test-model",
      promptVersion: REPORT_PROMPT_VERSION_V2,
      templateVersion: "identity-report-html.v1",
    },
    professionalAdviceDisclaimer: CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER,
    sections: IDENTITY_REPORT_SECTION_IDS.map((id, index) => ({
      id,
      title: `${titlePrefix} Mục ${index + 1}`,
      narrative: "Quan sát cẩn trọng và hành động phù hợp với thực tế.",
      claims: [
        "personal_summary",
        "primary_evidence",
        "strengths_and_resources",
        "tensions_and_blind_spots",
        "identity_analysis",
        "within_control",
      ].includes(id)
        ? [
            {
              id: `claim-${index}`,
              text: "Gợi ý tự suy ngẫm theo căn cứ lá số.",
              evidenceIds: ["ziwei.identity.life-palace"],
              interpretationBoundCode: "reflective_identity_only" as const,
              confidence: "moderate" as const,
              limitations: ["Cần thông tin giờ sinh chính xác."],
              suggestedActions: [
                { category: "reflect" as const, text: "Ghi chép quan sát bản thân." },
              ],
            },
          ]
        : [],
    })),
    reflectionQuestions: ["Bạn coi trọng điều gì?", "Môi trường nào phù hợp?", "Thử nghiệm nhỏ nào?"],
    summaryActions: ["Thực hiện một hành động cụ thể trong tuần."],
  };
}

function buildV1Report(): IdentityReportV1 {
  return {
    version: 1,
    sku: "ZIWEI-IDENTITY-P0",
    capabilityId: "ziwei.identity.p0",
    locale: "vi",
    provenance: {
      chartVersionId: "chart-1",
      ruleVersion: "ziwei.identity.v1",
      evidenceVersion: 1,
      knowledgeVersion: "ziwei.identity.knowledge.v1",
      providerId: "test-provider",
      modelId: "test-model",
      promptVersion: REPORT_PROMPT_VERSION_V1,
      templateVersion: "identity-report-html.v1",
    },
    professionalAdviceDisclaimer: CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER,
    sections: IDENTITY_REPORT_SECTION_IDS.map((id, index) => ({
      id,
      title: `Tiêu đề V1 Mục ${index + 1}`,
      narrative: "Nội dung V1 phản chiếu.",
      claims: [
        "personal_summary",
        "primary_evidence",
        "strengths_and_resources",
        "tensions_and_blind_spots",
        "identity_analysis",
        "cycles_and_timing",
        "within_control",
      ].includes(id)
        ? [
            {
              id: `claim-v1-${index}`,
              text: "Gợi ý V1 tự suy ngẫm.",
              evidenceIds: ["ziwei.identity.life-palace"],
              interpretationBoundCode: "reflective_identity_only" as const,
              confidence: "moderate" as const,
              limitations: ["Giới hạn V1."],
              suggestedActions: [
                { category: "reflect" as const, text: "Ghi chép V1." },
              ],
            },
          ]
        : [],
    })),
    reflectionQuestions: ["Bạn coi trọng điều gì trong công việc?", "Môi trường nào phù hợp nhất?", "Thử nghiệm nhỏ nào bạn sẽ thử?"],
    summaryActions: ["Hành động V1."],
  };
}

const mockEvidenceSet: EvidenceSetV1 = {
  version: 1,
  capabilityId: "ziwei.identity.p0",
  chartVersionId: "chart-1",
  ruleVersion: "ziwei.identity.v1",
  items: [
    {
      id: "ziwei.identity.life-palace",
      factReferences: ["soulPalaceId"],
      confidence: "moderate",
      interpretationBounds: ["Reflective identity signal."],
      interpretationBoundCodes: ["reflective_identity_only"],
      limitations: ["Cần thông tin giờ sinh chính xác."],
      riskTags: ["identity"],
      allowedActionCategories: ["reflect"],
    },
    {
      id: "ziwei.identity.body-palace",
      factReferences: ["bodyPalaceId"],
      confidence: "moderate",
      interpretationBounds: ["Reflective identity signal."],
      interpretationBoundCodes: ["reflective_identity_only"],
      limitations: ["Cần thông tin giờ sinh chính xác."],
      riskTags: ["identity"],
      allowedActionCategories: ["reflect"],
    },
    {
      id: "ziwei.identity.transformations",
      factReferences: ["transformations"],
      confidence: "moderate",
      interpretationBounds: ["Reflective identity signal."],
      interpretationBoundCodes: ["reflective_identity_only"],
      limitations: ["Cần thông tin giờ sinh chính xác."],
      riskTags: ["identity"],
      allowedActionCategories: ["reflect"],
    },
  ],
};

const mockSource = {
  evidence: mockEvidenceSet,
  frozenFacts: {
    version: 1,
    capabilityId: "ziwei.identity.p0" as const,
    chartVersionId: "chart-1",
    ruleVersion: "ziwei.identity.v1",
    evidenceVersion: 1,
    facts: {
      soulPalaceId: "ziwei.palace.life",
      bodyPalaceId: "ziwei.palace.career",
      transformations: ["ziwei.transformation.prosperity"],
    },
  },
  knowledgePassages: [{ id: "k-1", content: "Nội dung phương pháp đã duyệt." }],
};

const mockV3Facts: ComprehensiveZiweiFacts = {
  palaces: [
    {
      palaceId: "ziwei.palace.life",
      earthlyBranchId: "ziwei.branch.tiger",
      isLifePalace: true,
      isBodyPalace: false,
      stars: [{ id: "ziwei.star.ziwei", type: "principal", brightness: "ziwei.brightness.temple" }],
      triadPalaceIds: ["ziwei.palace.career", "ziwei.palace.wealth"],
      oppositePalaceId: "ziwei.palace.travel",
      flankingPalaceIds: ["ziwei.palace.parents", "ziwei.palace.siblings"],
    },
  ],
  transformations: [],
  patterns: [{ id: "zi-fu-tong-gong", palaceIds: ["ziwei.palace.life"], starIds: ["ziwei.star.ziwei"] }],
  evidenceKeys: [...ZIWEI_PALACE_IDS, "ziwei.star.ziwei", "zi-fu-tong-gong"],
};

const mockV3Packs: ZiweiReportKnowledgePack[] = [
  {
    id: "core_temperament",
    isPalacePack: false,
    evidenceKeys: ["ziwei.palace.life", "ziwei.star.ziwei"],
    passages: [],
  },
];

const mockV3Source = {
  ...mockSource,
  comprehensiveFacts: mockV3Facts,
  knowledgePacks: mockV3Packs,
};

function buildV3ReportContent(): ZiweiComprehensiveReportContentV1 {
  const palaceNarratives: Record<string, string> = {
    "ziwei.palace.life": "Mệnh tọa Tử Vi tại Dần thể hiện khí phách đĩnh đạc, khả năng lãnh đạo bẩm sinh.",
    "ziwei.palace.siblings": "Huynh đệ tương trợ hòa thuận, luôn có sự thấu hiểu lúc khó khăn.",
    "ziwei.palace.spouse": "Phu thê môn đăng hộ đối, người phối ngẫu có tài năng và trách nhiệm cao.",
    "ziwei.palace.children": "Con cái thông minh hoạt bát, tự lập từ sớm và có chí tiến thủ.",
    "ziwei.palace.wealth": "Tài chính tích lũy qua thực lực và đầu tư bài bản, vững bền theo thời gian.",
    "ziwei.palace.health": "Sức khỏe dẻo dai nhưng cần chú ý chế độ ăn uống điều độ hợp lý.",
    "ziwei.palace.travel": "Ra ngoài được nhiều người nể trọng, môi trường bên ngoài đem lại nhiều bước tiến.",
    "ziwei.palace.friends": "Bạn bè bằng hữu chân thành, cộng sự đắc lực trong mọi dự án lớn.",
    "ziwei.palace.career": "Sự nghiệp thăng tiến vững chắc nhờ năng lực chuyên môn và tầm nhìn chiến lược.",
    "ziwei.palace.property": "Bất động sản gia tăng giá trị, có duyên nắm giữ tài sản đất đai ổn định.",
    "ziwei.palace.fortune": "Đời sống nội tâm an tĩnh, biết cân bằng giữa tham vọng và sự bình yên.",
    "ziwei.palace.parents": "Cha mẹ gương mẫu, tạo bệ phóng tinh thần và giáo dục gia phong nghiêm cẩn.",
  };

  return {
    overview: {
      title: "Tổng quan lá số",
      narrative: "Tổng quan cuộc đời với Tử Vi tọa thủ, biểu thị phẩm chất dẫn dắt tự nhiên.",
      evidenceKeys: ["ziwei.palace.life", "ziwei.star.ziwei"],
    },
    coreAxis: {
      title: "Mệnh, Thân và động lực cốt lõi",
      narrative: "Trục Mệnh Thân thể hiện ý chí quật cường, kiên trì theo đuổi mục tiêu lớn.",
      evidenceKeys: ["ziwei.palace.life", "ziwei.star.ziwei"],
    },
    keyConfigurations: [
      {
        title: "Cấu trúc Tử Phủ Đồng Cung",
        narrative: "Thế cục Tử Phủ hội tụ tạo tiền đề vững chắc cho sự phát triển lâu dài.",
        evidenceKeys: ["ziwei.palace.life", "zi-fu-tong-gong"],
      },
    ],
    palaceReadings: ZIWEI_PALACE_IDS.map((palaceId) => ({
      palaceId,
      title: `Cung ${palaceId}`,
      narrative: palaceNarratives[palaceId]!,
      evidenceKeys: [palaceId],
    })),
    thematicSynthesis: [
      {
        id: "career_wealth",
        title: "Chuyên đề sự nghiệp tài chính",
        narrative: "Năng lực chuyên môn sâu cùng khả năng quản lý tài chính chặt chẽ giúp duy trì tăng trưởng bền vững.",
        evidenceKeys: ["ziwei.palace.life"],
      },
      {
        id: "relationships_family",
        title: "Chuyên đề gia đạo",
        narrative: "Gia đình là điểm tựa tinh thần quan trọng, các thành viên chia sẻ trách nhiệm và hỗ trợ lẫn nhau.",
        evidenceKeys: ["ziwei.palace.life"],
      },
      {
        id: "social_environment",
        title: "Chuyên đề xã hội",
        narrative: "Quan hệ xã hội rộng mở tạo điều kiện tiếp cận các đối tác chiến lược và nguồn lực quý báu.",
        evidenceKeys: ["ziwei.palace.life"],
      },
      {
        id: "wellbeing_inner_resources",
        title: "Chuyên đề sức khỏe nội tâm",
        narrative: "Tâm lý điềm tĩnh và thói quen rèn luyện thể chất giúp phục hồi năng lượng nhanh chóng sau áp lực.",
        evidenceKeys: ["ziwei.palace.life"],
      },
    ],
    strengthsAndTensions: {
      title: "Điểm mạnh, điểm vướng và điều kiện phát huy",
      narrative: "Thế mạnh là tầm nhìn vĩ mô; điểm cần điều chỉnh là lắng nghe đóng góp từ tập thể.",
      evidenceKeys: ["ziwei.palace.life"],
    },
    practicalDirection: [
      "Ưu tiên hoàn thiện hệ thống quản trị nội bộ.",
      "Đầu tư nâng cao năng lực cho đội ngũ đồng hành.",
    ],
  };
}

function createJob(overrides?: Partial<ReportGenerateJobEnvelopeV1["payload"]>): ReportGenerateJobEnvelopeV1 {
  return {
    schemaVersion: 1,
    type: "report.generate.v1",
    eventId: "event-1",
    traceId: "trace-1",
    occurredAt: "2026-09-07T00:00:00.000Z",
    idempotencyKey: "job-1",
    payload: {
      reportId: "report-1",
      reportVersionId: "version-1",
      entitlementId: "entitlement-1",
      chartVersionId: "chart-1",
      evidenceVersionId: "evidence-1",
      knowledgeVersionId: "ziwei.identity.knowledge.v2",
      promptVersion: REPORT_PROMPT_VERSION_V2,
      reportConfigVersion: "ziwei.identity.report.v1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      ...overrides,
    },
  };
}

describe("createReportGenerationService", () => {
  it.each([
    ["mismatched V1 prompt and V2 knowledge", REPORT_PROMPT_VERSION_V1, "ziwei.identity.knowledge.v2"],
    ["mismatched V2 prompt and V1 knowledge", REPORT_PROMPT_VERSION_V2, "ziwei.identity.knowledge.v1"],
    ["unknown knowledge version", REPORT_PROMPT_VERSION_V2, "unknown.knowledge.v999"],
    ["unknown prompt version", "unknown.prompt.v999", "ziwei.identity.knowledge.v2"],
  ])("fails %s with stable non-retryable AI_OUTPUT_INVALID before any provider call", async (_name, promptVersion, knowledgeVersionId) => {
    const writerSpy = vi.fn();
    const sourceRepository: ReportGenerationSourceRepository = {
      loadSource: vi.fn().mockResolvedValue({ ok: true, value: mockSource }),
    };

    const versionRepository: ReportVersionRepository = {
      getImmutableVersion: vi.fn().mockResolvedValue(null),
      startOrReuseAttempt: vi.fn().mockResolvedValue({ ok: true }),
      recordFailedAttempt: vi.fn().mockResolvedValue({ ok: true }),
      commitImmutableVersion: vi.fn(),
      consumeRewriteBudget: vi.fn(),
    } as unknown as ReportVersionRepository;

    const gate: AiProductionGate = { allows: () => true } as unknown as AiProductionGate;
    const provider: AiProvider = {
      generateStructured: writerSpy,
    };

    const service = createReportGenerationService({
      sourceRepository,
      versionRepository,
      gate,
      provider,
    });

    const result = await service.generateReport({
      job: createJob({ promptVersion, knowledgeVersionId }),
      attemptNumber: 1,
      workerId: "worker-1",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("AI_OUTPUT_INVALID");
      expect(result.error.retryable).toBe(false);
    }
    expect(writerSpy).not.toHaveBeenCalled();
    expect(sourceRepository.loadSource).not.toHaveBeenCalled();
  });

  it("attempts one rewrite on first AI_OUTPUT_INVALID critic quality failure and persists if revision passes", async () => {
    let writerCallCount = 0;
    let criticCallCount = 0;
    let committedRecord: unknown = null;

    const sourceRepository: ReportGenerationSourceRepository = {
      loadSource: vi.fn().mockResolvedValue({ ok: true, value: mockSource }),
    };

    const versionRepository: ReportVersionRepository = {
      getImmutableVersion: vi.fn().mockResolvedValue(null),
      startOrReuseAttempt: vi.fn().mockResolvedValue({ ok: true }),
      recordFailedAttempt: vi.fn().mockResolvedValue({ ok: true }),
      consumeRewriteBudget: vi.fn().mockResolvedValue({ ok: true, value: { consumed: true } }),
      commitImmutableVersion: vi.fn().mockImplementation(async (input) => {
        committedRecord = input;
        return { ok: true, value: { ...input, createdAt: new Date() } };
      }),
      listImmutableVersions: vi.fn(),
    } as unknown as ReportVersionRepository;

    const gate: AiProductionGate = {
      allows: () => true,
    } as unknown as AiProductionGate;

    const provider: AiProvider = {
      generateStructured: vi.fn().mockImplementation(async (req) => {
        if (req.schemaName === "identity_report_content_v1") {
          writerCallCount++;
          const reportData = buildReport(writerCallCount === 1 ? "Draft 1" : "Revised Draft 2");
          return {
            ok: true,
            value: {
              value: {
                sections: reportData.sections,
                reflectionQuestions: reportData.reflectionQuestions,
                summaryActions: reportData.summaryActions,
              },
              providerId: "test-provider",
              modelId: "test-model",
            },
          };
        }
        if (req.schemaName === "identity_report_critic_v1") {
          criticCallCount++;
          if (criticCallCount === 1) {
            // First critic fails with low specificity (< 4)
            return {
              ok: true,
              value: {
                value: {
                  correctness: 5,
                  evidenceCoverage: 5,
                  specificity: 3, // < 4 triggers AI_OUTPUT_INVALID
                  languageClarity: 5,
                  consistency: 5,
                  actionability: 5,
                  safety: 5,
                  repetitionControl: 5,
                  notes: ["Improve specificity of claims in section 1."],
                },
                providerId: "test-provider",
                modelId: "test-model",
              },
            };
          }
          // Second critic succeeds with all scores >= 4
          return {
            ok: true,
            value: {
              value: {
                correctness: 5,
                evidenceCoverage: 5,
                specificity: 5,
                languageClarity: 5,
                consistency: 5,
                actionability: 5,
                safety: 5,
                repetitionControl: 5,
                notes: [],
              },
              providerId: "test-provider",
              modelId: "test-model",
            },
          };
        }
        throw new Error("Unexpected schemaName");
      }),
    };

    const service = createReportGenerationService({
      sourceRepository,
      versionRepository,
      gate,
      provider,
    });

    const result = await service.generateReport({
      job: createJob(),
      attemptNumber: 1,
      workerId: "worker-1",
    });

    expect(result.ok).toBe(true);
    expect(writerCallCount).toBe(2);
    expect(criticCallCount).toBe(2);
    expect(committedRecord).not.toBeNull();
  });

  it("performs no rewrite on a later invocation when rewrite budget is already consumed", async () => {
    let writerCallCount = 0;
    let criticCallCount = 0;
    const commitSpy = vi.fn();

    const sourceRepository: ReportGenerationSourceRepository = {
      loadSource: vi.fn().mockResolvedValue({ ok: true, value: mockSource }),
    };

    const versionRepository: ReportVersionRepository = {
      getImmutableVersion: vi.fn().mockResolvedValue(null),
      startOrReuseAttempt: vi.fn().mockResolvedValue({ ok: true }),
      recordFailedAttempt: vi.fn().mockResolvedValue({ ok: true }),
      commitImmutableVersion: commitSpy,
      listImmutableVersions: vi.fn(),
      // Budget was consumed by a prior worker attempt
      consumeRewriteBudget: vi.fn().mockResolvedValue({ ok: true, value: { consumed: false } }),
    } as unknown as ReportVersionRepository;

    const gate: AiProductionGate = { allows: () => true } as unknown as AiProductionGate;

    const provider: AiProvider = {
      generateStructured: vi.fn().mockImplementation(async (req) => {
        if (req.schemaName === "identity_report_content_v1") {
          writerCallCount++;
          const reportData = buildReport();
          return {
            ok: true,
            value: {
              value: {
                sections: reportData.sections,
                reflectionQuestions: reportData.reflectionQuestions,
                summaryActions: reportData.summaryActions,
              },
              providerId: "test-provider",
              modelId: "test-model",
            },
          };
        }
        if (req.schemaName === "identity_report_critic_v1") {
          criticCallCount++;
          return {
            ok: true,
            value: {
              value: {
                correctness: 5,
                evidenceCoverage: 5,
                specificity: 3, // < 4 triggers AI_OUTPUT_INVALID
                languageClarity: 5,
                consistency: 5,
                actionability: 5,
                safety: 5,
                repetitionControl: 5,
                notes: ["Still lacks specificity."],
              },
              providerId: "test-provider",
              modelId: "test-model",
            },
          };
        }
        throw new Error("Unexpected schemaName");
      }),
    };

    const service = createReportGenerationService({
      sourceRepository,
      versionRepository,
      gate,
      provider,
    });

    const result = await service.generateReport({
      job: createJob(),
      attemptNumber: 2,
      workerId: "worker-1",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("AI_OUTPUT_INVALID");
      expect(result.error.retryable).toBe(false);
    }
    expect(writerCallCount).toBe(1); // No rewrite performed!
    expect(criticCallCount).toBe(1);
    expect(commitSpy).not.toHaveBeenCalled();
  });

  it("terminates non-retryably when revision writer times out after budget is consumed", async () => {
    let writerCallCount = 0;
    const commitSpy = vi.fn();

    const sourceRepository: ReportGenerationSourceRepository = {
      loadSource: vi.fn().mockResolvedValue({ ok: true, value: mockSource }),
    };

    const versionRepository: ReportVersionRepository = {
      getImmutableVersion: vi.fn().mockResolvedValue(null),
      startOrReuseAttempt: vi.fn().mockResolvedValue({ ok: true }),
      recordFailedAttempt: vi.fn().mockResolvedValue({ ok: true }),
      consumeRewriteBudget: vi.fn().mockResolvedValue({ ok: true, value: { consumed: true } }),
      commitImmutableVersion: commitSpy,
    } as unknown as ReportVersionRepository;

    const gate: AiProductionGate = { allows: () => true } as unknown as AiProductionGate;

    const provider: AiProvider = {
      generateStructured: vi.fn().mockImplementation(async (req) => {
        if (req.schemaName === "identity_report_content_v1") {
          writerCallCount++;
          if (writerCallCount === 1) {
            const reportData = buildReport();
            return {
              ok: true,
              value: {
                value: {
                  sections: reportData.sections,
                  reflectionQuestions: reportData.reflectionQuestions,
                  summaryActions: reportData.summaryActions,
                },
                providerId: "test-provider",
                modelId: "test-model",
              },
            };
          }
          // Revision writer times out
          throw new Error("Provider timeout during revision draft");
        }
        if (req.schemaName === "identity_report_critic_v1") {
          return {
            ok: true,
            value: {
              value: {
                correctness: 5,
                evidenceCoverage: 5,
                specificity: 3,
                languageClarity: 5,
                consistency: 5,
                actionability: 5,
                safety: 5,
                repetitionControl: 5,
                notes: ["Needs more specifics."],
              },
              providerId: "test-provider",
              modelId: "test-model",
            },
          };
        }
        throw new Error("Unexpected schemaName");
      }),
    };

    const service = createReportGenerationService({
      sourceRepository,
      versionRepository,
      gate,
      provider,
    });

    const result = await service.generateReport({
      job: createJob(),
      attemptNumber: 1,
      workerId: "worker-1",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("AI_TIMEOUT");
      // Must be non-retryable after budget is consumed!
      expect(result.error.retryable).toBe(false);
    }
    expect(writerCallCount).toBe(2);
    expect(commitSpy).not.toHaveBeenCalled();
  });

  it("generates V1 report with V1 writer, critic, retrieval, and provenance without rewrite attempt", async () => {
    let writerCallCount = 0;
    let committedRecord: unknown = null;

    const sourceRepository: ReportGenerationSourceRepository = {
      loadSource: vi.fn().mockImplementation(async (input) => {
        // Assert promptVersion was passed to loadSource
        expect(input.promptVersion).toBe(REPORT_PROMPT_VERSION_V1);
        return { ok: true, value: mockSource };
      }),
    };

    const versionRepository: ReportVersionRepository = {
      getImmutableVersion: vi.fn().mockResolvedValue(null),
      startOrReuseAttempt: vi.fn().mockResolvedValue({ ok: true }),
      recordFailedAttempt: vi.fn().mockResolvedValue({ ok: true }),
      consumeRewriteBudget: vi.fn(),
      commitImmutableVersion: vi.fn().mockImplementation(async (input) => {
        committedRecord = input;
        return { ok: true, value: { ...input, createdAt: new Date() } };
      }),
    } as unknown as ReportVersionRepository;

    const gate: AiProductionGate = { allows: () => true } as unknown as AiProductionGate;

    const provider: AiProvider = {
      generateStructured: vi.fn().mockImplementation(async (req) => {
        if (req.schemaName === "identity_report_content_v1") {
          writerCallCount++;
          const reportData = buildV1Report();
          return {
            ok: true,
            value: {
              value: {
                sections: reportData.sections,
                reflectionQuestions: reportData.reflectionQuestions,
                summaryActions: reportData.summaryActions,
              },
              providerId: "v1-provider",
              modelId: "v1-model",
            },
          };
        }
        if (req.schemaName === "identity_report_critic_v1") {
          // Critic returns low specificity (2) which passes in V1!
          return {
            ok: true,
            value: {
              value: {
                correctness: 4,
                evidenceCoverage: 4,
                specificity: 2, // < 4 passes V1!
                languageClarity: 4,
                consistency: 4,
                actionability: 4,
                safety: 4,
                repetitionControl: 4,
                notes: [],
              },
              providerId: "v1-provider",
              modelId: "v1-model",
            },
          };
        }
        throw new Error("Unexpected schemaName");
      }),
    };

    const service = createReportGenerationService({
      sourceRepository,
      versionRepository,
      gate,
      provider,
    });

    const result = await service.generateReport({
      job: createJob({
        promptVersion: REPORT_PROMPT_VERSION_V1,
        knowledgeVersionId: "ziwei.identity.knowledge.v1",
      }),
      attemptNumber: 1,
      workerId: "worker-1",
    });

    expect(result.ok).toBe(true);
    expect(writerCallCount).toBe(1); // No rewrite in V1
    expect(committedRecord).not.toBeNull();
    const rec = committedRecord as { promptVersion: string; knowledgeVersionId: string; structuredContent: IdentityReportV1 };
    expect(rec.promptVersion).toBe(REPORT_PROMPT_VERSION_V1);
    expect(rec.knowledgeVersionId).toBe("ziwei.identity.knowledge.v1");
    expect(rec.structuredContent.provenance.promptVersion).toBe(REPORT_PROMPT_VERSION_V1);
    // Model original title preserved
    expect(rec.structuredContent.sections[0].title).toBe("Tiêu đề V1 Mục 1");
  });

  it("terminates safely and persists no draft when second critic attempt also fails quality", async () => {
    let writerCallCount = 0;
    let criticCallCount = 0;
    const commitSpy = vi.fn();

    const sourceRepository: ReportGenerationSourceRepository = {
      loadSource: vi.fn().mockResolvedValue({ ok: true, value: mockSource }),
    };

    const versionRepository: ReportVersionRepository = {
      getImmutableVersion: vi.fn().mockResolvedValue(null),
      startOrReuseAttempt: vi.fn().mockResolvedValue({ ok: true }),
      recordFailedAttempt: vi.fn().mockResolvedValue({ ok: true }),
      consumeRewriteBudget: vi.fn().mockResolvedValue({ ok: true, value: { consumed: true } }),
      commitImmutableVersion: commitSpy,
      listImmutableVersions: vi.fn(),
    } as unknown as ReportVersionRepository;

    const gate: AiProductionGate = { allows: () => true } as unknown as AiProductionGate;

    const provider: AiProvider = {
      generateStructured: vi.fn().mockImplementation(async (req) => {
        if (req.schemaName === "identity_report_content_v1") {
          writerCallCount++;
          const reportData = buildReport(`Attempt ${writerCallCount}`);
          return {
            ok: true,
            value: {
              value: {
                sections: reportData.sections,
                reflectionQuestions: reportData.reflectionQuestions,
                summaryActions: reportData.summaryActions,
              },
              providerId: "test-provider",
              modelId: "test-model",
            },
          };
        }
        if (req.schemaName === "identity_report_critic_v1") {
          criticCallCount++;
          // Both critic calls return quality failure (< 4)
          return {
            ok: true,
            value: {
              value: {
                correctness: 5,
                evidenceCoverage: 5,
                specificity: 3,
                languageClarity: 5,
                consistency: 5,
                actionability: 5,
                safety: 5,
                repetitionControl: 5,
                notes: ["Still lacks specificity."],
              },
              providerId: "test-provider",
              modelId: "test-model",
            },
          };
        }
        throw new Error("Unexpected schemaName");
      }),
    };

    const service = createReportGenerationService({
      sourceRepository,
      versionRepository,
      gate,
      provider,
    });

    const result = await service.generateReport({
      job: createJob(),
      attemptNumber: 1,
      workerId: "worker-1",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("AI_OUTPUT_INVALID");
    }
    expect(writerCallCount).toBe(2);
    expect(criticCallCount).toBe(2);
    expect(commitSpy).not.toHaveBeenCalled();
  });

  it("never rewrites when critic rejects with REPORT_SAFETY_REJECTED", async () => {
    let writerCallCount = 0;
    const commitSpy = vi.fn();

    const sourceRepository: ReportGenerationSourceRepository = {
      loadSource: vi.fn().mockResolvedValue({ ok: true, value: mockSource }),
    };

    const versionRepository: ReportVersionRepository = {
      getImmutableVersion: vi.fn().mockResolvedValue(null),
      startOrReuseAttempt: vi.fn().mockResolvedValue({ ok: true }),
      recordFailedAttempt: vi.fn().mockResolvedValue({ ok: true }),
      consumeRewriteBudget: vi.fn(),
      commitImmutableVersion: commitSpy,
      listImmutableVersions: vi.fn(),
    } as unknown as ReportVersionRepository;

    const gate: AiProductionGate = { allows: () => true } as unknown as AiProductionGate;

    const provider: AiProvider = {
      generateStructured: vi.fn().mockImplementation(async (req) => {
        if (req.schemaName === "identity_report_content_v1") {
          writerCallCount++;
          const reportData = buildReport();
          return {
            ok: true,
            value: {
              value: {
                sections: reportData.sections,
                reflectionQuestions: reportData.reflectionQuestions,
                summaryActions: reportData.summaryActions,
              },
              providerId: "test-provider",
              modelId: "test-model",
            },
          };
        }
        if (req.schemaName === "identity_report_critic_v1") {
          return {
            ok: true,
            value: {
              value: {
                correctness: 5,
                evidenceCoverage: 5,
                specificity: 5,
                languageClarity: 5,
                consistency: 5,
                actionability: 5,
                safety: 2, // < 4 safety failure
                repetitionControl: 5,
                notes: ["Safety issue detected."],
              },
              providerId: "test-provider",
              modelId: "test-model",
            },
          };
        }
        throw new Error("Unexpected schemaName");
      }),
    };

    const service = createReportGenerationService({
      sourceRepository,
      versionRepository,
      gate,
      provider,
    });

    const result = await service.generateReport({
      job: createJob(),
      attemptNumber: 1,
      workerId: "worker-1",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("REPORT_SAFETY_REJECTED");
    }
    expect(writerCallCount).toBe(1); // No rewrite attempted
    expect(commitSpy).not.toHaveBeenCalled();
  });

  it("generates V3 report with exactly one writer call, zero critic calls, and persists immutable structured content with empty htmlContent", async () => {
    let writerCalls = 0;
    let criticCalls = 0;
    let committedRecord: any = null;

    const sourceRepository: ReportGenerationSourceRepository = {
      loadSource: vi.fn().mockResolvedValue({ ok: true, value: mockV3Source }),
    };

    const versionRepository: ReportVersionRepository = {
      getImmutableVersion: vi.fn().mockResolvedValue(null),
      startOrReuseAttempt: vi.fn().mockResolvedValue({ ok: true }),
      recordFailedAttempt: vi.fn().mockResolvedValue({ ok: true }),
      commitImmutableVersion: vi.fn().mockImplementation(async (input) => {
        committedRecord = input;
        return { ok: true, value: { ...input, createdAt: new Date() } };
      }),
      consumeRewriteBudget: vi.fn(),
    } as unknown as ReportVersionRepository;

    const gate: AiProductionGate = { allows: () => true } as unknown as AiProductionGate;

    const provider: AiProvider = {
      generateStructured: vi.fn().mockImplementation(async (req) => {
        if (req.schemaName === "ziwei_comprehensive_report_content_v1") {
          writerCalls++;
          return {
            ok: true,
            value: {
              value: buildV3ReportContent(),
              providerId: "v3-test-provider",
              modelId: "v3-test-model",
            },
          };
        }
        if (req.schemaName === "identity_report_critic_v1") {
          criticCalls++;
          throw new Error("Critic must not be called for V3");
        }
        throw new Error(`Unexpected schemaName: ${req.schemaName}`);
      }),
    };

    const service = createReportGenerationService({
      sourceRepository,
      versionRepository,
      gate,
      provider,
    });

    const result = await service.generateReport({
      job: createJob({
        promptVersion: REPORT_PROMPT_VERSION_V3,
        knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V3,
        reportConfigVersion: REPORT_CONFIG_VERSION_V3,
      }),
      attemptNumber: 1,
      workerId: "worker-1",
    });

    expect(result.ok).toBe(true);
    expect(writerCalls).toBe(1);
    expect(criticCalls).toBe(0);

    expect(committedRecord).not.toBeNull();
    expect(committedRecord.templateVersion).toBe(REPORT_TEMPLATE_VERSION_V3);
    expect(committedRecord.htmlContent).not.toBe("");
    expect(committedRecord.htmlContent).toContain("<h1>Báo Cáo Luận Giải Toàn Diện Tử Vi</h1>");
    expect(committedRecord.htmlContent).toContain("Cung Mệnh");
    expect(committedRecord.htmlContent).toContain("Cung Phụ Mẫu");
    expect(committedRecord.htmlContent).not.toContain("evidenceKeys");
    expect(committedRecord.htmlContent).not.toContain("miễn trừ");
    expect(committedRecord.promptVersion).toBe(REPORT_PROMPT_VERSION_V3);
    expect(committedRecord.knowledgeVersionId).toBe(REPORT_KNOWLEDGE_VERSION_V3);
    expect(committedRecord.structuredContent.palaceReadings).toHaveLength(12);
  });

  it("fails V3 generation with retryable AI_TIMEOUT when provider times out and persists no version", async () => {
    const commitSpy = vi.fn();
    const recordFailedAttemptSpy = vi.fn().mockResolvedValue({ ok: true });

    const sourceRepository: ReportGenerationSourceRepository = {
      loadSource: vi.fn().mockResolvedValue({ ok: true, value: mockV3Source }),
    };

    const versionRepository: ReportVersionRepository = {
      getImmutableVersion: vi.fn().mockResolvedValue(null),
      startOrReuseAttempt: vi.fn().mockResolvedValue({ ok: true }),
      recordFailedAttempt: recordFailedAttemptSpy,
      commitImmutableVersion: commitSpy,
    } as unknown as ReportVersionRepository;

    const gate: AiProductionGate = { allows: () => true } as unknown as AiProductionGate;
    const provider: AiProvider = {
      generateStructured: vi.fn().mockRejectedValue(new Error("Provider timeout")),
    };

    const service = createReportGenerationService({
      sourceRepository,
      versionRepository,
      gate,
      provider,
    });

    const result = await service.generateReport({
      job: createJob({
        promptVersion: REPORT_PROMPT_VERSION_V3,
        knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V3,
        reportConfigVersion: REPORT_CONFIG_VERSION_V3,
      }),
      attemptNumber: 1,
      workerId: "worker-1",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("AI_TIMEOUT");
      expect(result.error.retryable).toBe(true);
    }
    expect(commitSpy).not.toHaveBeenCalled();
  });

  it("fails V3 generation non-retryably with AI_OUTPUT_INVALID when validator rejects and persists no version", async () => {
    const commitSpy = vi.fn();

    const invalidReportContent = buildV3ReportContent();
    invalidReportContent.overview.evidenceKeys.push("ziwei.star.unsupported");

    const sourceRepository: ReportGenerationSourceRepository = {
      loadSource: vi.fn().mockResolvedValue({ ok: true, value: mockV3Source }),
    };

    const versionRepository: ReportVersionRepository = {
      getImmutableVersion: vi.fn().mockResolvedValue(null),
      startOrReuseAttempt: vi.fn().mockResolvedValue({ ok: true }),
      recordFailedAttempt: vi.fn().mockResolvedValue({ ok: true }),
      commitImmutableVersion: commitSpy,
    } as unknown as ReportVersionRepository;

    const gate: AiProductionGate = { allows: () => true } as unknown as AiProductionGate;
    const provider: AiProvider = {
      generateStructured: vi.fn().mockResolvedValue({
        ok: true,
        value: {
          value: invalidReportContent,
          providerId: "v3-provider",
          modelId: "v3-model",
        },
      }),
    };

    const service = createReportGenerationService({
      sourceRepository,
      versionRepository,
      gate,
      provider,
    });

    const result = await service.generateReport({
      job: createJob({
        promptVersion: REPORT_PROMPT_VERSION_V3,
        knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V3,
        reportConfigVersion: REPORT_CONFIG_VERSION_V3,
      }),
      attemptNumber: 1,
      workerId: "worker-1",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("AI_OUTPUT_INVALID");
      expect(result.error.retryable).toBe(false);
    }
    expect(commitSpy).not.toHaveBeenCalled();
  });

  it("replays existing V3 report without calling provider writer or critic", async () => {
    const writerSpy = vi.fn();
    const sourceRepository: ReportGenerationSourceRepository = {
      loadSource: vi.fn(),
    };

    const existingV3Record = {
      reportId: "report-v3",
      reportVersionId: "version-v3",
      entitlementId: "entitlement-v3",
      chartVersionId: "chart-1",
      evidenceVersionId: "evidence-1",
      knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V3,
      promptVersion: REPORT_PROMPT_VERSION_V3,
      reportConfigVersion: REPORT_CONFIG_VERSION_V3,
      templateVersion: REPORT_TEMPLATE_VERSION_V3,
      renderVersion: "identity-report-pdf.v1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      providerId: "v3-provider",
      modelId: "v3-model",
      structuredContent: buildV3ReportContent(),
      htmlContent: "",
      createdAt: new Date(),
    };

    const versionRepository: ReportVersionRepository = {
      getImmutableVersion: vi.fn().mockResolvedValue(existingV3Record),
      commitImmutableVersion: vi.fn().mockResolvedValue({ ok: true, value: existingV3Record }),
      startOrReuseAttempt: vi.fn(),
      recordFailedAttempt: vi.fn(),
    } as unknown as ReportVersionRepository;

    const gate: AiProductionGate = { allows: () => true } as unknown as AiProductionGate;
    const provider: AiProvider = { generateStructured: writerSpy };

    const service = createReportGenerationService({
      sourceRepository,
      versionRepository,
      gate,
      provider,
    });

    const result = await service.generateReport({
      job: createJob({
        promptVersion: REPORT_PROMPT_VERSION_V3,
        knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V3,
        reportConfigVersion: REPORT_CONFIG_VERSION_V3,
      }),
      attemptNumber: 1,
      workerId: "worker-1",
    });

    expect(result.ok).toBe(true);
    expect(writerSpy).not.toHaveBeenCalled();
  });

  it("fails V3 generation with REPORT_EVIDENCE_INVALID when comprehensive facts are missing from source", async () => {
    const sourceRepository: ReportGenerationSourceRepository = {
      // Missing comprehensiveFacts and knowledgePacks
      loadSource: vi.fn().mockResolvedValue({ ok: true, value: mockSource }),
    };

    const versionRepository: ReportVersionRepository = {
      getImmutableVersion: vi.fn().mockResolvedValue(null),
      startOrReuseAttempt: vi.fn().mockResolvedValue({ ok: true }),
      recordFailedAttempt: vi.fn().mockResolvedValue({ ok: true }),
    } as unknown as ReportVersionRepository;

    const gate: AiProductionGate = { allows: () => true } as unknown as AiProductionGate;
    const provider: AiProvider = { generateStructured: vi.fn() };

    const service = createReportGenerationService({ sourceRepository, versionRepository, gate, provider });
    const result = await service.generateReport({
      job: createJob({ promptVersion: REPORT_PROMPT_VERSION_V3, knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V3 }),
      attemptNumber: 1,
      workerId: "worker-1",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("REPORT_EVIDENCE_INVALID");
  });
});
