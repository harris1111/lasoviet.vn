import { describe, expect, it, vi } from "vitest";

const sectionedFinalValidator = vi.hoisted(() => ({ errors: null as string[] | null, remaining: 0 }));

vi.mock("./comprehensive-report-validator-v4.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./comprehensive-report-validator-v4.js")>();
  return {
    ...actual,
    validateComprehensiveZiweiReportV4: (...args: Parameters<typeof actual.validateComprehensiveZiweiReportV4>) =>
      sectionedFinalValidator.errors === null || sectionedFinalValidator.remaining-- <= 0
        ? actual.validateComprehensiveZiweiReportV4(...args)
        : { ok: false as const, errors: sectionedFinalValidator.errors },
  };
});

import {
  CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER,
  IDENTITY_REPORT_SECTION_IDS,
  ZIWEI_PALACE_IDS,
  ZIWEI_THEMATIC_SYNTHESIS_IDS,
  type EvidenceSetV1,
  type IdentityReportV1,
  type ZiweiComprehensiveReportContentV1,
  type ReportGenerateJobEnvelopeV1,
  type ReportGenerateJobEnvelopeV2,
  type ReportGenerationRequestedV2,
} from "@lasoviet/contracts";

import type { AiProductionGate, AiProvider } from "../ai/ai-provider.js";
import {
  createReportGenerationService,
  type ReportGenerationServiceDependencies,
} from "./report-generation.service.js";
import type { ReportGenerationSourceRepository } from "./report-generation.repository.js";
import type { ReportVersionRepository } from "./report-version.repository.js";
import type { ReportSourceSnapshotPreparationService } from "./report-source-snapshot.service.js";
import type { PersistedReportSourceSnapshotRecord } from "./report-source-snapshot.repository.js";
import {
  REPORT_CONFIG_VERSION_V3,
  CANONICAL_PALACE_TITLES_VI,
  CANONICAL_THEMATIC_TITLES_VI,
  REPORT_KNOWLEDGE_VERSION_V3,
  REPORT_PROMPT_VERSION_V1,
  REPORT_PROMPT_VERSION_V2,
  REPORT_PROMPT_VERSION_V3,
  REPORT_PROMPT_VERSION_V4,
  REPORT_PROMPT_VERSION_V4_0_1,
  REPORT_PROMPT_VERSION_V4_1_SENSITIVITY,
  REPORT_CONFIG_VERSION_V4_1_SECTIONED,
  REPORT_CONFIG_VERSION_V4_1_SECTIONED_SENSITIVITY,
  REPORT_KNOWLEDGE_VERSION_V4,
  REPORT_TEMPLATE_VERSION_V3,
} from "./identity-report-config.js";
import {
  COMPREHENSIVE_REPORT_SECTION_KEYS,
  COMPREHENSIVE_REPORT_SECTION_KEYS_V4_1,
  parseComprehensiveReportAcceptedSection,
  type ComprehensiveReportSectionKey,
} from "./comprehensive-report-section-v4.js";
import { validateComprehensiveReportSectionQualityV4 } from "./comprehensive-report-quality-v4.js";
import type { ComprehensiveZiweiFacts } from "./comprehensive-ziwei-facts.js";
import type { ZiweiReportKnowledgePack } from "./comprehensive-report-retrieval.js";
import {
  VIETNAMESE_COMPREHENSIVE_REPORT_V4_0_1_SYSTEM_PROMPT,
  VIETNAMESE_COMPREHENSIVE_REPORT_V4_SYSTEM_PROMPT,
  VIETNAMESE_COMPREHENSIVE_REPORT_V4_SYSTEM_PROMPT_WITH_CONTEXT,
} from "./comprehensive-report-writer-v4.js";

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

function withSuccessfulLifecycle<T extends { loadSource: unknown }>(source: T) {
  return {
    ...source,
    validateLifecycle: vi.fn(async ({ readingContextRevisionId }: {
      reportVersionId: string;
      jobId: string;
      readingContextRevisionId: string | null;
    }) => ({
      ok: true as const,
      value: { readingContextRevisionId },
    })),
  };
}

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
    const sourceRepository: ReportGenerationSourceRepository = withSuccessfulLifecycle({
      loadSource: vi.fn().mockResolvedValue({ ok: true, value: mockSource }),
    });

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

    const sourceRepository: ReportGenerationSourceRepository = withSuccessfulLifecycle({
      loadSource: vi.fn().mockResolvedValue({ ok: true, value: mockSource }),
    });

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

    expect(result.ok ? null : result.error).toBeNull();
    expect(writerCallCount).toBe(2);
    expect(criticCallCount).toBe(2);
    expect(committedRecord).not.toBeNull();
  });

  it("performs no rewrite on a later invocation when rewrite budget is already consumed", async () => {
    let writerCallCount = 0;
    let criticCallCount = 0;
    const commitSpy = vi.fn();

    const sourceRepository: ReportGenerationSourceRepository = withSuccessfulLifecycle({
      loadSource: vi.fn().mockResolvedValue({ ok: true, value: mockSource }),
    });

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

    const sourceRepository: ReportGenerationSourceRepository = withSuccessfulLifecycle({
      loadSource: vi.fn().mockResolvedValue({ ok: true, value: mockSource }),
    });

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

    const sourceRepository: ReportGenerationSourceRepository = withSuccessfulLifecycle({
      loadSource: vi.fn().mockImplementation(async (input) => {
        // Assert promptVersion was passed to loadSource
        expect(input.promptVersion).toBe(REPORT_PROMPT_VERSION_V1);
        return { ok: true, value: mockSource };
      }),
    });

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

    const sourceRepository: ReportGenerationSourceRepository = withSuccessfulLifecycle({
      loadSource: vi.fn().mockResolvedValue({ ok: true, value: mockSource }),
    });

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

    const sourceRepository: ReportGenerationSourceRepository = withSuccessfulLifecycle({
      loadSource: vi.fn().mockResolvedValue({ ok: true, value: mockSource }),
    });

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

    const sourceRepository: ReportGenerationSourceRepository = withSuccessfulLifecycle({
      loadSource: vi.fn().mockResolvedValue({ ok: true, value: mockV3Source }),
    });

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

    const sourceRepository: ReportGenerationSourceRepository = withSuccessfulLifecycle({
      loadSource: vi.fn().mockResolvedValue({ ok: true, value: mockV3Source }),
    });

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

    const sourceRepository: ReportGenerationSourceRepository = withSuccessfulLifecycle({
      loadSource: vi.fn().mockResolvedValue({ ok: true, value: mockV3Source }),
    });

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
    const sourceRepository: ReportGenerationSourceRepository = withSuccessfulLifecycle({
      loadSource: vi.fn(),
    });

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
    const sourceRepository: ReportGenerationSourceRepository = withSuccessfulLifecycle({
      // Missing comprehensiveFacts and knowledgePacks
      loadSource: vi.fn().mockResolvedValue({ ok: true, value: mockSource }),
    });

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

function createV2Job(overrides?: Partial<ReportGenerationRequestedV2>): ReportGenerateJobEnvelopeV2 {
  return {
    schemaVersion: 2,
    name: "report.generate.v2",
    sourceEventId: "event-2",
    traceId: "trace-2",
    idempotencyKey: "job-2",
    payload: {
      reportId: "11111111-1111-4111-8111-111111111111",
      reportVersionId: "22222222-2222-4222-8222-222222222222",
      entitlementId: "entitlement-2",
      chartVersionId: "chart-2",
      evidenceVersionId: "evidence-2",
      knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V3,
      promptVersion: REPORT_PROMPT_VERSION_V3,
      reportConfigVersion: REPORT_CONFIG_VERSION_V3,
      locale: "vi",
      sku: "ZIWEI-NATAL-V4",
      asOfDate: "2026-09-12",
      targetYear: 2026,
      timingRuleVersion: "ziwei.timing.v1",
      sensitivityRuleVersion: "ziwei.sensitivity.v1",
      ...overrides,
    },
  };
}

describe("createReportGenerationService V2 source snapshot ordering", () => {
  it("does not call sourceSnapshotPreparer for V1 jobs", async () => {
    const preparer: ReportSourceSnapshotPreparationService = {
      prepare: vi.fn(),
    };
    const sourceRepository: ReportGenerationSourceRepository = withSuccessfulLifecycle({
      loadSource: vi.fn().mockResolvedValue({ ok: true, value: mockSource }),
    });
    const versionRepository: ReportVersionRepository = {
      getImmutableVersion: vi.fn().mockResolvedValue(null),
      startOrReuseAttempt: vi.fn().mockResolvedValue({ ok: true }),
      recordFailedAttempt: vi.fn().mockResolvedValue({ ok: true }),
    } as unknown as ReportVersionRepository;
    const gate: AiProductionGate = { allows: () => true } as unknown as AiProductionGate;
    const provider: AiProvider = { generateStructured: vi.fn() };

    const service = createReportGenerationService({
      sourceRepository,
      versionRepository,
      gate,
      provider,
      sourceSnapshotPreparer: preparer,
    });

    await service.generateReport({
      job: createJob({ promptVersion: "unknown.v999", knowledgeVersionId: "unknown.v999" }),
      attemptNumber: 1,
      workerId: "worker-1",
    });

    expect(preparer.prepare).not.toHaveBeenCalled();
  });

  it("calls sourceSnapshotPreparer before sourceRepository.loadSource and provider for V2 jobs", async () => {
    const callOrder: string[] = [];
    const preparer: ReportSourceSnapshotPreparationService = {
      prepare: vi.fn().mockImplementation(async () => {
        callOrder.push("preparer");
        return {
          ok: true,
          value: {
            id: "snap-1",
            reportId: "11111111-1111-4111-8111-111111111111",
            reportVersionId: "22222222-2222-4222-8222-222222222222",
            chartVersionId: "chart-2",
            asOfDate: "2026-09-12",
            targetYear: 2026,
            timingRuleVersion: "ziwei.timing.v1",
            sensitivityRuleVersion: "ziwei.sensitivity.v1",
            snapshotHash: "a".repeat(64),
            snapshot: {} as any,
            createdAt: new Date(),
          },
        };
      }),
    };
    const sourceRepository: ReportGenerationSourceRepository = withSuccessfulLifecycle({
      loadSource: vi.fn().mockImplementation(async () => {
        callOrder.push("source");
        return { ok: true, value: mockV3Source };
      }),
    });
    const versionRepository: ReportVersionRepository = {
      getImmutableVersion: vi.fn().mockResolvedValue(null),
      startOrReuseAttempt: vi.fn().mockResolvedValue({ ok: true }),
      recordFailedAttempt: vi.fn().mockResolvedValue({ ok: true }),
      commitImmutableVersion: vi.fn().mockResolvedValue({ ok: true, value: {} as any }),
    } as unknown as ReportVersionRepository;
    const gate: AiProductionGate = { allows: () => true } as unknown as AiProductionGate;
    const provider: AiProvider = {
      generateStructured: vi.fn().mockImplementation(async () => {
        callOrder.push("provider");
        return {
          ok: true,
          value: {
            value: buildV3ReportContent(),
            providerId: "v3-test-provider",
            modelId: "v3-test-model",
          },
        };
      }),
    };

    const service = createReportGenerationService({
      sourceRepository,
      versionRepository,
      gate,
      provider,
      sourceSnapshotPreparer: preparer,
    });

    const result = await service.generateReport({
      job: createV2Job(),
      attemptNumber: 1,
      workerId: "worker-1",
    });

    expect(result.ok).toBe(true);
    expect(callOrder[0]).toBe("preparer");
    expect(callOrder[1]).toBe("source");
    expect(callOrder[2]).toBe("provider");
  });

  it("fails closed when V2 job has missing sourceSnapshotPreparer and never calls provider", async () => {
    const providerSpy = vi.fn();
    const sourceRepository: ReportGenerationSourceRepository = withSuccessfulLifecycle({
      loadSource: vi.fn(),
    });
    const versionRepository: ReportVersionRepository = {
      getImmutableVersion: vi.fn().mockResolvedValue(null),
      startOrReuseAttempt: vi.fn().mockResolvedValue({ ok: true }),
      recordFailedAttempt: vi.fn().mockResolvedValue({ ok: true }),
    } as unknown as ReportVersionRepository;
    const gate: AiProductionGate = { allows: () => true } as unknown as AiProductionGate;
    const provider: AiProvider = { generateStructured: providerSpy };

    const service = createReportGenerationService({
      sourceRepository,
      versionRepository,
      gate,
      provider,
      // sourceSnapshotPreparer omitted
    });

    const result = await service.generateReport({
      job: createV2Job(),
      attemptNumber: 1,
      workerId: "worker-1",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("REPORT_SOURCE_SNAPSHOT_INVALID");
      expect(result.error.retryable).toBe(false);
    }
    expect(providerSpy).not.toHaveBeenCalled();
    expect(sourceRepository.loadSource).not.toHaveBeenCalled();
  });

  it("prevents source loading and provider calls when sourceSnapshotPreparer fails", async () => {
    const loadSourceSpy = vi.fn();
    const providerSpy = vi.fn();
    const preparer: ReportSourceSnapshotPreparationService = {
      prepare: vi.fn().mockResolvedValue({
        ok: false,
        error: {
          code: "REPORT_SOURCE_SNAPSHOT_UNAVAILABLE",
          messageKey: "reports.report_source_snapshot_unavailable",
          retryable: true,
        },
      }),
    };
    const sourceRepository: ReportGenerationSourceRepository = withSuccessfulLifecycle({
      loadSource: loadSourceSpy,
    });
    const versionRepository: ReportVersionRepository = {
      getImmutableVersion: vi.fn().mockResolvedValue(null),
      startOrReuseAttempt: vi.fn().mockResolvedValue({ ok: true }),
      recordFailedAttempt: vi.fn().mockResolvedValue({ ok: true }),
    } as unknown as ReportVersionRepository;
    const gate: AiProductionGate = { allows: () => true } as unknown as AiProductionGate;
    const provider: AiProvider = { generateStructured: providerSpy };

    const service = createReportGenerationService({
      sourceRepository,
      versionRepository,
      gate,
      provider,
      sourceSnapshotPreparer: preparer,
    });

    const result = await service.generateReport({
      job: createV2Job(),
      attemptNumber: 1,
      workerId: "worker-1",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("REPORT_SOURCE_SNAPSHOT_UNAVAILABLE");
      expect(result.error.retryable).toBe(true);
    }
    expect(loadSourceSpy).not.toHaveBeenCalled();
    expect(providerSpy).not.toHaveBeenCalled();
  });

  it("retries reuse existing snapshot without recomputing", async () => {
    const existingSnapshotRecord: PersistedReportSourceSnapshotRecord = {
      id: "snap-1",
      reportId: "11111111-1111-4111-8111-111111111111",
      reportVersionId: "22222222-2222-4222-8222-222222222222",
      chartVersionId: "chart-2",
      asOfDate: "2026-09-12",
      targetYear: 2026,
      timingRuleVersion: "ziwei.timing.v1",
      sensitivityRuleVersion: "ziwei.sensitivity.v1",
      snapshotHash: "a".repeat(64),
      snapshot: {} as any,
      createdAt: new Date(),
    };

    const preparer: ReportSourceSnapshotPreparationService = {
      prepare: vi.fn().mockResolvedValue({ ok: true, value: existingSnapshotRecord }),
    };
    const sourceRepository: ReportGenerationSourceRepository = withSuccessfulLifecycle({
      loadSource: vi.fn().mockResolvedValue({ ok: true, value: mockV3Source }),
    });
    const versionRepository: ReportVersionRepository = {
      getImmutableVersion: vi.fn().mockResolvedValue(null),
      startOrReuseAttempt: vi.fn().mockResolvedValue({ ok: true }),
      recordFailedAttempt: vi.fn().mockResolvedValue({ ok: true }),
      commitImmutableVersion: vi.fn().mockResolvedValue({ ok: true, value: {} as any }),
    } as unknown as ReportVersionRepository;
    const gate: AiProductionGate = { allows: () => true } as unknown as AiProductionGate;
    const provider: AiProvider = {
      generateStructured: vi.fn().mockResolvedValue({
        ok: true,
        value: {
          value: buildV3ReportContent(),
          providerId: "v3-test-provider",
          modelId: "v3-test-model",
        },
      }),
    };

    const service = createReportGenerationService({
      sourceRepository,
      versionRepository,
      gate,
      provider,
      sourceSnapshotPreparer: preparer,
    });

    const result = await service.generateReport({
      job: createV2Job(),
      attemptNumber: 2,
      workerId: "worker-1",
    });

    expect(result.ok).toBe(true);
    expect(preparer.prepare).toHaveBeenCalledTimes(1);
    expect(versionRepository.startOrReuseAttempt).toHaveBeenCalledWith(
      expect.objectContaining({ attemptNumber: 2 }),
    );
  });
});

describe("createReportGenerationService V4 generation and critic", () => {
  const palaceNarratives: Record<string, string> = {
    "ziwei.palace.life": "Cung Mệnh định hình nhân sinh quan độc lập, phong thái đĩnh đạc và bản lĩnh tự thân lập nghiệp.",
    "ziwei.palace.siblings": "Mối quan hệ anh chị em giữ được sự hòa thuận cơ bản, có sự trợ lực khi đối diện hoàn cảnh ngặt nghèo.",
    "ziwei.palace.spouse": "Hôn phối có trình độ chuyên môn tốt, là hậu phương vững chắc dù đôi khi có bất đồng quan điểm.",
    "ziwei.palace.children": "Hậu duệ thông minh, có xu hướng phát triển cá tính riêng từ sớm và cần phương pháp giáo dục kiên nhẫn.",
    "ziwei.palace.wealth": "Nguồn tài chính hình thành từ tích lũy chuyên môn bền bỉ, dòng tiền ổn định hơn là đầu cơ mạo hiểm.",
    "ziwei.palace.health": "Thể trạng tương đối tốt nhưng cần lưu ý hệ tiêu hóa và duy trì nhịp độ sinh hoạt điều độ.",
    "ziwei.palace.travel": "Không gian bên ngoài mở ra nhiều cơ hội hợp tác giá trị, đi xa được nhiều quý nhân tương trợ.",
    "ziwei.palace.friends": "Mạng lưới bạn bè và đồng nghiệp đáng tin cậy, hỗ trợ đắc lực trong những thời điểm then chốt.",
    "ziwei.palace.career": "Đường quan lộ hanh thông nhờ năng lực chuyên môn sâu và tác phong làm việc bài bản, chỉn chu.",
    "ziwei.palace.property": "Cơ ngơi điền sản gia tăng theo thời gian, có duyên gìn giữ đất đai hoặc bất động sản ổn định.",
    "ziwei.palace.fortune": "Đời sống tinh thần an định, có chiều sâu tâm tưởng và khả năng tự cân bằng trước nghịch cảnh.",
    "ziwei.palace.parents": "Song thân là tấm gương lớn về đạo đức, tạo nền tảng giáo dưỡng gia đình chu đáo từ thuở ấu thơ.",
  };

  const thematicNarratives: Record<string, string> = {
    career_wealth: "Sự kết hợp giữa tài năng điều hành và kiểm soát tài chính mang lại lợi thế cạnh tranh dài hạn.",
    relationships_family: "Nền tảng gia đình vững chắc tạo bệ phóng tinh thần cho mọi nỗ lực ngoài xã hội.",
    social_environment: "Môi trường làm việc mở rộng giúp tiếp cận các nguồn lực tri thức và đối tác uy tín.",
    wellbeing_inner_resources: "Nội lực bền bỉ giúp hóa giải áp lực bên ngoài, duy trì sức khỏe thể chất và tâm lý an nhiên.",
  };

  function buildV4ReportContent() {
    return {
      overview: {
        title: "Tổng quan lá số",
        narrative: "Bản mệnh vững vàng, cách cục phối hợp hài hòa.",
        evidenceKeys: ["ziwei.palace.life"],
      },
      coreAxis: {
        title: "Mệnh, Thân và động lực cốt lõi",
        narrative: "Mệnh Thân đồng cung tại Dần tạo nên tính cách kiên định.",
        evidenceKeys: ["ziwei.palace.life"],
      },
      keyConfigurations: [
        {
          title: "Cách cục Tử Phủ Đồng Cung",
          narrative: "Tử Vi và Thiên Phủ cùng hội tụ đem lại vị thế vững chắc.",
          evidenceKeys: ["ziwei.palace.life"],
        },
      ],
      palaceReadings: ZIWEI_PALACE_IDS.map((palaceId) => ({
        palaceId,
        title: CANONICAL_PALACE_TITLES_VI[palaceId],
        narrative: palaceNarratives[palaceId] || "Luận giải cung.",
        evidenceKeys: ["ziwei.palace.life"],
      })),
      thematicSynthesis: ZIWEI_THEMATIC_SYNTHESIS_IDS.map((id) => ({
        id,
        title: CANONICAL_THEMATIC_TITLES_VI[id],
        narrative: thematicNarratives[id] || "Tổng hợp chủ đề.",
        evidenceKeys: ["ziwei.palace.life"],
      })),
      strengthsAndTensions: {
        title: "Điểm mạnh, điểm vướng và điều kiện phát huy",
        narrative: "Điểm mạnh là tầm nhìn chiến lược, cần lưu ý điều phối.",
        evidenceKeys: ["ziwei.palace.life"],
      },
      currentDecadal: {
        title: "Đại vận hiện hành (22-31 tuổi)",
        state: "active" as const,
        index: 2,
        ageRange: [22, 31] as [number, number],
        yearRange: [2022, 2031] as [number, number],
        narrative: "Đại vận 10 năm tại cung Phúc Đức mở ra nhiều bước tiến.",
        evidenceKeys: ["decadal.state.active"],
      },
      annualSnapshot: {
        title: "Lưu niên năm 2026",
        targetYear: 2026,
        asOfDate: "2026-09-12",
        narrative: "Lưu niên năm 2026 thuận lợi củng cố uy tín.",
        evidenceKeys: ["annual.target-year.2026"],
      },
      practicalDirection: [
        {
          recommendation: "Tập trung nâng cao năng lực chuyên môn.",
          rationale: "Mệnh vững vàng cần năng lực thực tiễn.",
          avoid: "Tránh các quyết định bốc đồng ngắn hạn.",
          evidenceKeys: ["ziwei.palace.life"],
        },
        {
          recommendation: "Xây dựng mạng lưới cộng sự đáng tin cậy.",
          rationale: "Hợp tác minh bạch đem lại hiệu quả lâu bền.",
          avoid: "Tránh đơn độc hành động.",
          evidenceKeys: ["ziwei.palace.life"],
        },
        {
          recommendation: "Giữ vững kỷ luật quản lý tài chính.",
          rationale: "Tích lũy tài sản cho chu kỳ kế tiếp.",
          avoid: "Tránh đầu tư mạo hiểm thiếu cơ sở.",
          evidenceKeys: ["ziwei.palace.life"],
        },
      ],
    };
  }  const mockV4Source = {
    ...mockV3Source,
    comprehensiveFactsV4: {
      version: 4 as const,
      natal: mockV3Source.comprehensiveFacts,
      timing: {
        decadal: {
          state: "active" as const,
          index: 2,
          ageRange: [22, 31] as [number, number],
          yearRange: [2022, 2031] as [number, number],
          palaceId: "ziwei.palace.fortune" as const,
          heavenlyStemId: "ziwei.stem.yi",
          earthlyBranchId: "ziwei.branch.rabbit" as const,
          palaces: [],
        },
        annual: {
          targetYear: 2026,
          palaceId: "ziwei.palace.career" as const,
          heavenlyStemId: "ziwei.stem.bing",
          earthlyBranchId: "ziwei.branch.horse" as const,
          palaces: [],
        },
        provenance: {} as any,
      },
      sensitivity: {} as any,
      sourceSnapshot: {
        reportVersionId: "22222222-2222-4222-8222-222222222222",
        chartVersionId: "chart-2",
        asOfDate: "2026-09-12",
        targetYear: 2026,
        timingRuleVersion: "ziwei.timing.v1",
        sensitivityRuleVersion: "ziwei.sensitivity.v1",
        snapshotHash: "a".repeat(64),
      },
      evidence: {} as any,
      evidenceKeys: [
        ...mockV3Source.comprehensiveFacts.evidenceKeys,
        "decadal.state.active",
        "annual.target-year.2026",
      ],
    },
  };

  function createV4LifecycleFixture(
    outcomes: Array<"ok" | "purged" | "mismatch">,
    generateStructured: (request: any) => unknown,
  ) {
    const lifecycle = vi.fn(async (input: {
      reportVersionId: string;
      jobId: string;
      readingContextRevisionId: string | null;
    }) => {
      const outcome = outcomes.shift() ?? "ok";
      if (outcome === "ok") {
        return { ok: true as const, value: { readingContextRevisionId: input.readingContextRevisionId } };
      }
      return {
        ok: false as const,
        error: {
          code: outcome === "purged" ? "REPORT_PROFILE_PURGED" as const : "REPORT_CONTEXT_MISMATCH" as const,
          messageKey: "reports.report_lifecycle_failed",
          retryable: false,
        },
      };
    });
    const sourceRepository = {
      loadSource: vi.fn().mockResolvedValue({ ok: true, value: mockV4Source }),
      validateLifecycle: lifecycle,
    };
    const versionRepository = {
      getImmutableVersion: vi.fn().mockResolvedValue(null),
      startOrReuseAttempt: vi.fn().mockResolvedValue({ ok: true }),
      recordFailedAttempt: vi.fn().mockResolvedValue({ ok: true }),
      commitImmutableVersion: vi.fn().mockResolvedValue({ ok: true, value: { id: "v4-committed" } }),
      consumeRewriteBudget: vi.fn().mockResolvedValue({ ok: true, value: { consumed: true } }),
    };
    const provider = { generateStructured: vi.fn(generateStructured) };
    const service = createReportGenerationService({
      sourceRepository: sourceRepository as any,
      versionRepository: versionRepository as any,
      gate: { allows: () => true } as any,
      provider: provider as any,
      sourceSnapshotPreparer: { prepare: vi.fn().mockResolvedValue({ ok: true, value: {} }) } as any,
    });
    return { service, lifecycle, versionRepository, provider };
  }

  const criticPass = {
    correctness: 5,
    evidenceCoverage: 5,
    specificity: 5,
    languageClarity: 5,
    consistency: 5,
    actionability: 5,
    safety: 5,
    repetitionControl: 5,
    notes: [],
  };
  const criticFailure = { ...criticPass, specificity: 3, notes: ["Cần tăng tính cụ thể."] };

  it.each([
    ["REPORT_PROFILE_PURGED", "purged"],
    ["REPORT_CONTEXT_MISMATCH", "mismatch"],
  ] as const)("blocks the initial V4 writer on %s with no provider call", async (code, lifecycle) => {
    const fixture = createV4LifecycleFixture([lifecycle], () => {
      throw new Error("provider must not be called");
    });
    const job = createV2Job({
      promptVersion: REPORT_PROMPT_VERSION_V4,
      knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V3,
      readingContextRevisionId: "context-1",
    });
    const result = await fixture.service.generateReport({
      job,
      attemptNumber: 1,
      workerId: "worker-1",
      jobId: "active-job-1",
    });

    expect(result).toMatchObject({ ok: false, error: { code, retryable: false } });
    expect(fixture.provider.generateStructured).not.toHaveBeenCalled();
    expect(fixture.versionRepository.recordFailedAttempt).toHaveBeenCalledWith(
      expect.objectContaining({ errorCode: code }),
    );
  });

  it("blocks the critic after an initial writer when the profile is purged", async () => {
    const fixture = createV4LifecycleFixture(["ok", "purged"], () => ({
      ok: true,
      value: { value: buildV4ReportContent(), providerId: "writer", modelId: "writer-model" },
    }));
    const result = await fixture.service.generateReport({
      job: createV2Job({ promptVersion: REPORT_PROMPT_VERSION_V4, knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V3 }),
      attemptNumber: 1,
      workerId: "worker-1",
    });

    expect(result).toMatchObject({
      ok: false,
      error: { code: "REPORT_PROFILE_PURGED", retryable: false },
    });
    expect(fixture.provider.generateStructured).toHaveBeenCalledTimes(1);
  });

  it("blocks rewrite and rewrite re-critic provider calls at their lifecycle fences", async () => {
    const rewrite = createV4LifecycleFixture(["ok", "ok", "purged"], (request) => ({
      ok: true,
      value: request.schemaName.includes("critic")
        ? { value: criticFailure, providerId: "critic", modelId: "critic-model" }
        : { value: buildV4ReportContent(), providerId: "writer", modelId: "writer-model" },
    }));
    const rewriteResult = await rewrite.service.generateReport({
      job: createV2Job({ promptVersion: REPORT_PROMPT_VERSION_V4, knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V3 }),
      attemptNumber: 1,
      workerId: "worker-1",
    });
    expect(rewriteResult).toMatchObject({
      ok: false,
      error: { code: "REPORT_PROFILE_PURGED", retryable: false },
    });
    expect(rewrite.provider.generateStructured).toHaveBeenCalledTimes(2);

    const recritic = createV4LifecycleFixture(["ok", "ok", "ok", "mismatch"], (request) => ({
      ok: true,
      value: request.schemaName.includes("critic")
        ? { value: criticFailure, providerId: "critic", modelId: "critic-model" }
        : { value: buildV4ReportContent(), providerId: "writer", modelId: "writer-model" },
    }));
    const recriticResult = await recritic.service.generateReport({
      job: createV2Job({ promptVersion: REPORT_PROMPT_VERSION_V4, knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V3 }),
      attemptNumber: 1,
      workerId: "worker-1",
    });
    expect(recriticResult).toMatchObject({
      ok: false,
      error: { code: "REPORT_CONTEXT_MISMATCH", retryable: false },
    });
    expect(recritic.provider.generateStructured).toHaveBeenCalledTimes(3);
  });

  it("passes explicit and legacy-null context IDs through every V4 provider fence", async () => {
    let explicitCriticCalls = 0;
    const explicit = createV4LifecycleFixture(["ok", "ok", "ok", "ok"], (request) => ({
      ok: true,
      value: request.schemaName.includes("critic")
        ? {
          value: ++explicitCriticCalls === 1 ? criticFailure : criticPass,
          providerId: "critic",
          modelId: "critic-model",
        }
        : { value: buildV4ReportContent(), providerId: "writer", modelId: "writer-model" },
    }));
    const explicitJob = createV2Job({
      promptVersion: REPORT_PROMPT_VERSION_V4,
      knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V3,
      readingContextRevisionId: "context-1",
    });
    const explicitResult = await explicit.service.generateReport({
      job: explicitJob,
      attemptNumber: 1,
      workerId: "worker-1",
      jobId: "active-job-1",
    });
    expect(explicitResult.ok).toBe(true);
    expect(explicit.lifecycle).toHaveBeenCalledTimes(4);
    expect(explicit.lifecycle.mock.calls.every(([input]) =>
      input.readingContextRevisionId === "context-1" &&
      input.reportVersionId === explicitJob.payload.reportVersionId &&
      input.jobId === "active-job-1",
    )).toBe(true);

    const legacy = createV4LifecycleFixture(["ok", "ok"], (request) => ({
      ok: true,
      value: request.schemaName.includes("critic")
        ? { value: criticPass, providerId: "critic", modelId: "critic-model" }
        : { value: buildV4ReportContent(), providerId: "writer", modelId: "writer-model" },
    }));
    const legacyJob = createV2Job({
      promptVersion: REPORT_PROMPT_VERSION_V4,
      knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V3,
    });
    delete (legacyJob.payload as any).readingContextRevisionId;
    const legacyResult = await legacy.service.generateReport({
      job: legacyJob,
      attemptNumber: 1,
      workerId: "worker-1",
    });
    expect(legacyResult.ok).toBe(true);
    expect(legacy.lifecycle.mock.calls.every(([input]) => input.readingContextRevisionId === null)).toBe(true);
  });

    it("successfully generates V4 report with exactly one critic call and commits without consuming rewrite budget", async () => {
    const preparer = {
      prepare: vi.fn().mockResolvedValue({ ok: true, value: {} }),
    };
    const sourceRepository = withSuccessfulLifecycle({
      loadSource: vi.fn().mockResolvedValue({ ok: true, value: mockV4Source }),
    });
    const versionRepository = {
      getImmutableVersion: vi.fn().mockResolvedValue(null),
      startOrReuseAttempt: vi.fn().mockResolvedValue({ ok: true }),
      recordFailedAttempt: vi.fn().mockResolvedValue({ ok: true }),
      commitImmutableVersion: vi.fn().mockResolvedValue({ ok: true, value: { id: "v4-committed" } }),
      consumeRewriteBudget: vi.fn(),
    };
    const gate = { allows: () => true };
    const provider = {
      generateStructured: vi.fn()
        // 1st call: V4 writer
        .mockResolvedValueOnce({
          ok: true,
          value: {
            value: buildV4ReportContent(),
            providerId: "v4-provider",
            modelId: "v4-model",
          },
        })
        // 2nd call: V4 critic
        .mockResolvedValueOnce({
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
            providerId: "v4-critic-provider",
            modelId: "v4-critic-model",
          },
        }),
    };

    const service = createReportGenerationService({
      sourceRepository: sourceRepository as any,
      versionRepository: versionRepository as any,
      gate: gate as any,
      provider: provider as any,
      sourceSnapshotPreparer: preparer as any,
    });

    const v4Job = createV2Job({
      promptVersion: "ziwei.comprehensive.prompt.v4",
      knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V3,
    });

    const result = await service.generateReport({
      job: v4Job,
      attemptNumber: 1,
      workerId: "worker-1",
    });

    expect(result.ok).toBe(true);
    // Exactly 2 provider calls: 1 writer + 1 critic
    expect(provider.generateStructured).toHaveBeenCalledTimes(2);
    // Did not need rewrite budget
    expect(versionRepository.consumeRewriteBudget).not.toHaveBeenCalled();
    expect(versionRepository.commitImmutableVersion).toHaveBeenCalledTimes(1);
    expect(provider.generateStructured.mock.calls[0][0].system).toBe(
      VIETNAMESE_COMPREHENSIVE_REPORT_V4_SYSTEM_PROMPT_WITH_CONTEXT,
    );
    expect(versionRepository.commitImmutableVersion.mock.calls[0][0].promptVersion).toBe(
      REPORT_PROMPT_VERSION_V4,
    );
  });

  it("rewrites once when V4 validator fails, passes re-validation/critic, and commits", async () => {
    const preparer = {
      prepare: vi.fn().mockResolvedValue({ ok: true, value: {} }),
    };
    const sourceRepository = withSuccessfulLifecycle({
      loadSource: vi.fn().mockResolvedValue({ ok: true, value: mockV4Source }),
    });
    const versionRepository = {
      getImmutableVersion: vi.fn().mockResolvedValue(null),
      startOrReuseAttempt: vi.fn().mockResolvedValue({ ok: true }),
      recordFailedAttempt: vi.fn().mockResolvedValue({ ok: true }),
      commitImmutableVersion: vi.fn().mockResolvedValue({ ok: true, value: { id: "v4-committed" } }),
      consumeRewriteBudget: vi.fn().mockResolvedValue({ ok: true, value: { consumed: true } }),
    };
    const gate = { allows: () => true };

    const invalidDraftContent = buildV4ReportContent();
    // Insert an unknown evidence key to fail validation
    invalidDraftContent.overview.evidenceKeys = ["unknown.fabricated.key"];

    const validRevisedContent = buildV4ReportContent();

    const provider = {
      generateStructured: vi.fn()
        // 1st call: initial writer produces invalid evidenceKeys
        .mockResolvedValueOnce({
          ok: true,
          value: {
            value: invalidDraftContent,
            providerId: "v4-provider",
            modelId: "v4-model",
          },
        })
        // 2nd call: rewrite writer produces valid content
        .mockResolvedValueOnce({
          ok: true,
          value: {
            value: validRevisedContent,
            providerId: "v4-provider",
            modelId: "v4-model",
          },
        })
        // 3rd call: critic on revised content passes
        .mockResolvedValueOnce({
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
            providerId: "v4-critic-provider",
            modelId: "v4-critic-model",
          },
        }),
    };

    const service = createReportGenerationService({
      sourceRepository: sourceRepository as any,
      versionRepository: versionRepository as any,
      gate: gate as any,
      provider: provider as any,
      sourceSnapshotPreparer: preparer as any,
    });

    const v4Job = createV2Job({
      promptVersion: REPORT_PROMPT_VERSION_V4_0_1,
      knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V3,
    });

    const result = await service.generateReport({
      job: v4Job,
      attemptNumber: 1,
      workerId: "worker-1",
    });

    expect(result.ok).toBe(true);
    expect(versionRepository.consumeRewriteBudget).toHaveBeenCalledTimes(1);
    // 3 calls: initial writer + rewrite writer + critic
    expect(provider.generateStructured).toHaveBeenCalledTimes(3);
    expect(versionRepository.commitImmutableVersion).toHaveBeenCalledTimes(1);
    expect(provider.generateStructured.mock.calls[0][0].system).toBe(
      VIETNAMESE_COMPREHENSIVE_REPORT_V4_0_1_SYSTEM_PROMPT,
    );
    expect(provider.generateStructured.mock.calls[1][0].system).toContain(
      VIETNAMESE_COMPREHENSIVE_REPORT_V4_0_1_SYSTEM_PROMPT,
    );
    expect(versionRepository.commitImmutableVersion.mock.calls[0][0].promptVersion).toBe(
      REPORT_PROMPT_VERSION_V4_0_1,
    );
  });

  it("rewrites once when V4 critic quality fails, passes second critic, and commits", async () => {
    const preparer = {
      prepare: vi.fn().mockResolvedValue({ ok: true, value: {} }),
    };
    const sourceRepository = withSuccessfulLifecycle({
      loadSource: vi.fn().mockResolvedValue({ ok: true, value: mockV4Source }),
    });
    const versionRepository = {
      getImmutableVersion: vi.fn().mockResolvedValue(null),
      startOrReuseAttempt: vi.fn().mockResolvedValue({ ok: true }),
      recordFailedAttempt: vi.fn().mockResolvedValue({ ok: true }),
      commitImmutableVersion: vi.fn().mockResolvedValue({ ok: true, value: { id: "v4-committed" } }),
      consumeRewriteBudget: vi.fn().mockResolvedValue({ ok: true, value: { consumed: true } }),
    };
    const gate = { allows: () => true };

    const provider = {
      generateStructured: vi.fn()
        // 1st call: initial writer
        .mockResolvedValueOnce({
          ok: true,
          value: {
            value: buildV4ReportContent(),
            providerId: "v4-provider",
            modelId: "v4-model",
          },
        })
        // 2nd call: critic quality failure (specificity < 4)
        .mockResolvedValueOnce({
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
              notes: ["Phần luận giải cần tăng tính cụ thể."],
            },
            providerId: "v4-critic-provider",
            modelId: "v4-critic-model",
          },
        })
        // 3rd call: rewrite writer produces improved content
        .mockResolvedValueOnce({
          ok: true,
          value: {
            value: buildV4ReportContent(),
            providerId: "v4-provider",
            modelId: "v4-model",
          },
        })
        // 4th call: second critic passes
        .mockResolvedValueOnce({
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
            providerId: "v4-critic-provider",
            modelId: "v4-critic-model",
          },
        }),
    };

    const service = createReportGenerationService({
      sourceRepository: sourceRepository as any,
      versionRepository: versionRepository as any,
      gate: gate as any,
      provider: provider as any,
      sourceSnapshotPreparer: preparer as any,
    });

    const v4Job = createV2Job({
      promptVersion: "ziwei.comprehensive.prompt.v4",
      knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V3,
    });

    const result = await service.generateReport({
      job: v4Job,
      attemptNumber: 1,
      workerId: "worker-1",
    });

    expect(result.ok).toBe(true);
    expect(versionRepository.consumeRewriteBudget).toHaveBeenCalledTimes(1);
    // 4 calls: writer 1 + critic 1 + rewrite writer + critic 2
    expect(provider.generateStructured).toHaveBeenCalledTimes(4);
    expect(versionRepository.commitImmutableVersion).toHaveBeenCalledTimes(1);
  });

  it("rewrites once when V4 critic safety fails, passes second critic, and commits", async () => {
    const preparer = {
      prepare: vi.fn().mockResolvedValue({ ok: true, value: {} }),
    };
    const sourceRepository = withSuccessfulLifecycle({
      loadSource: vi.fn().mockResolvedValue({ ok: true, value: mockV4Source }),
    });
    const versionRepository = {
      getImmutableVersion: vi.fn().mockResolvedValue(null),
      startOrReuseAttempt: vi.fn().mockResolvedValue({ ok: true }),
      recordFailedAttempt: vi.fn().mockResolvedValue({ ok: true }),
      commitImmutableVersion: vi.fn().mockResolvedValue({ ok: true, value: { id: "v4-committed" } }),
      consumeRewriteBudget: vi.fn().mockResolvedValue({ ok: true, value: { consumed: true } }),
    };
    const gate = { allows: () => true };

    const provider = {
      generateStructured: vi.fn()
        // 1st call: initial writer
        .mockResolvedValueOnce({
          ok: true,
          value: {
            value: buildV4ReportContent(),
            providerId: "v4-provider",
            modelId: "v4-model",
          },
        })
        // 2nd call: critic safety rejection
        .mockResolvedValueOnce({
          ok: true,
          value: {
            value: {
              correctness: 3,
              evidenceCoverage: 5,
              specificity: 5,
              languageClarity: 5,
              consistency: 5,
              actionability: 5,
              safety: 3,
              repetitionControl: 5,
              notes: ["Phát hiện nhận định chưa an toàn."],
            },
            providerId: "v4-critic-provider",
            modelId: "v4-critic-model",
          },
        })
        // 3rd call: rewrite writer produces safe content
        .mockResolvedValueOnce({
          ok: true,
          value: {
            value: buildV4ReportContent(),
            providerId: "v4-provider",
            modelId: "v4-model",
          },
        })
        // 4th call: second critic passes
        .mockResolvedValueOnce({
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
            providerId: "v4-critic-provider",
            modelId: "v4-critic-model",
          },
        }),
    };

    const service = createReportGenerationService({
      sourceRepository: sourceRepository as any,
      versionRepository: versionRepository as any,
      gate: gate as any,
      provider: provider as any,
      sourceSnapshotPreparer: preparer as any,
    });

    const v4Job = createV2Job({
      promptVersion: "ziwei.comprehensive.prompt.v4",
      knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V3,
    });

    const result = await service.generateReport({
      job: v4Job,
      attemptNumber: 1,
      workerId: "worker-1",
    });

    expect(result.ok).toBe(true);
    expect(versionRepository.consumeRewriteBudget).toHaveBeenCalledTimes(1);
    expect(provider.generateStructured).toHaveBeenCalledTimes(4);
    expect(versionRepository.commitImmutableVersion).toHaveBeenCalledTimes(1);
  });

  it("fails terminal immediately without extra rewrite loop when rewrite budget is exhausted", async () => {
    const preparer = {
      prepare: vi.fn().mockResolvedValue({ ok: true, value: {} }),
    };
    const sourceRepository = withSuccessfulLifecycle({
      loadSource: vi.fn().mockResolvedValue({ ok: true, value: mockV4Source }),
    });
    const versionRepository = {
      getImmutableVersion: vi.fn().mockResolvedValue(null),
      startOrReuseAttempt: vi.fn().mockResolvedValue({ ok: true }),
      recordFailedAttempt: vi.fn().mockResolvedValue({ ok: true }),
      commitImmutableVersion: vi.fn(),
      // Budget was consumed by a prior attempt
      consumeRewriteBudget: vi.fn().mockResolvedValue({ ok: true, value: { consumed: false } }),
    };
    const gate = { allows: () => true };

    const provider = {
      generateStructured: vi.fn()
        // 1st call: initial writer
        .mockResolvedValueOnce({
          ok: true,
          value: {
            value: buildV4ReportContent(),
            providerId: "v4-provider",
            modelId: "v4-model",
          },
        })
        // 2nd call: critic safety rejection
        .mockResolvedValueOnce({
          ok: true,
          value: {
            value: {
              correctness: 3,
              evidenceCoverage: 5,
              specificity: 5,
              languageClarity: 5,
              consistency: 5,
              actionability: 5,
              safety: 3,
              repetitionControl: 5,
              notes: ["Safety issue"],
            },
            providerId: "v4-critic-provider",
            modelId: "v4-critic-model",
          },
        }),
    };

    const service = createReportGenerationService({
      sourceRepository: sourceRepository as any,
      versionRepository: versionRepository as any,
      gate: gate as any,
      provider: provider as any,
      sourceSnapshotPreparer: preparer as any,
    });

    const v4Job = createV2Job({
      promptVersion: "ziwei.comprehensive.prompt.v4",
      knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V3,
    });

    const result = await service.generateReport({
      job: v4Job,
      attemptNumber: 1,
      workerId: "worker-1",
    });

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("REPORT_SAFETY_REJECTED");
    expect(versionRepository.consumeRewriteBudget).toHaveBeenCalledTimes(1);
    // Strictly NO rewrite call: exactly 2 calls occurred
    expect(provider.generateStructured).toHaveBeenCalledTimes(2);
    expect(versionRepository.commitImmutableVersion).not.toHaveBeenCalled();
    expect(versionRepository.recordFailedAttempt).toHaveBeenCalledWith(
      expect.objectContaining({ errorCode: "REPORT_SAFETY_REJECTED" }),
    );
  });

  it("terminal-fails and does not commit when rewritten V4 content still fails validation", async () => {
    const preparer = {
      prepare: vi.fn().mockResolvedValue({ ok: true, value: {} }),
    };
    const sourceRepository = withSuccessfulLifecycle({
      loadSource: vi.fn().mockResolvedValue({ ok: true, value: mockV4Source }),
    });
    const versionRepository = {
      getImmutableVersion: vi.fn().mockResolvedValue(null),
      startOrReuseAttempt: vi.fn().mockResolvedValue({ ok: true }),
      recordFailedAttempt: vi.fn().mockResolvedValue({ ok: true }),
      commitImmutableVersion: vi.fn(),
      consumeRewriteBudget: vi.fn().mockResolvedValue({ ok: true, value: { consumed: true } }),
    };
    const gate = { allows: () => true };

    const invalidContent = buildV4ReportContent();
    invalidContent.overview.evidenceKeys = ["unknown.key.1"];

    const stillInvalidContent = buildV4ReportContent();
    stillInvalidContent.overview.evidenceKeys = ["unknown.key.2"];

    const provider = {
      generateStructured: vi.fn()
        // 1st call: initial writer fails validation
        .mockResolvedValueOnce({
          ok: true,
          value: {
            value: invalidContent,
            providerId: "v4-provider",
            modelId: "v4-model",
          },
        })
        // 2nd call: rewrite writer still produces invalid content
        .mockResolvedValueOnce({
          ok: true,
          value: {
            value: stillInvalidContent,
            providerId: "v4-provider",
            modelId: "v4-model",
          },
        }),
    };

    const service = createReportGenerationService({
      sourceRepository: sourceRepository as any,
      versionRepository: versionRepository as any,
      gate: gate as any,
      provider: provider as any,
      sourceSnapshotPreparer: preparer as any,
    });

    const v4Job = createV2Job({
      promptVersion: "ziwei.comprehensive.prompt.v4",
      knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V3,
    });

    const result = await service.generateReport({
      job: v4Job,
      attemptNumber: 1,
      workerId: "worker-1",
    });

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("AI_OUTPUT_INVALID");
    expect(versionRepository.consumeRewriteBudget).toHaveBeenCalledTimes(1);
    // Exactly 2 writer calls, no critic, no 3rd writer
    expect(provider.generateStructured).toHaveBeenCalledTimes(2);
    expect(versionRepository.commitImmutableVersion).not.toHaveBeenCalled();
    expect(versionRepository.recordFailedAttempt).toHaveBeenCalledWith(
      expect.objectContaining({ errorCode: "AI_OUTPUT_INVALID" }),
    );
  });

  it("propagates purpose and request cost context to writer and critic calls", async () => {
    const preparer = {
      prepare: vi.fn().mockResolvedValue({ ok: true, value: {} }),
    };
    const sourceRepository = withSuccessfulLifecycle({
      loadSource: vi.fn().mockResolvedValue({ ok: true, value: mockV4Source }),
    });
    const versionRepository = {
      getImmutableVersion: vi.fn().mockResolvedValue(null),
      startOrReuseAttempt: vi.fn().mockResolvedValue({ ok: true }),
      recordFailedAttempt: vi.fn().mockResolvedValue({ ok: true }),
      commitImmutableVersion: vi.fn().mockResolvedValue({ ok: true, value: {} }),
    };
    const gate = { allows: () => true };
    const calls: unknown[] = [];
    const mockProvider = {
      generateStructured: vi.fn().mockImplementation(async (req: any) => {
        calls.push(req);
        if (req.schemaName.includes("critic")) {
          return {
            ok: true,
            value: {
              value: {
                correctness: 5, evidenceCoverage: 5, specificity: 5, languageClarity: 5,
                consistency: 5, actionability: 5, safety: 5, repetitionControl: 5, notes: [],
              },
              providerId: "test", modelId: "test",
            },
          };
        }
        return {
          ok: true,
          value: { value: buildV4ReportContent(), providerId: "test", modelId: "test" },
        };
      }),
    };

    const service = createReportGenerationService({
      sourceRepository: sourceRepository as any,
      versionRepository: versionRepository as any,
      gate: gate as any,
      provider: mockProvider as any,
      sourceSnapshotPreparer: preparer as any,
    });

    const v4Job = createV2Job({
      promptVersion: "ziwei.comprehensive.prompt.v4",
      knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V3,
    });

    await service.generateReport({ job: v4Job, attemptNumber: 1, workerId: "worker-1" });

    expect(calls).toHaveLength(2);
    const writerCall = calls[0] as any;
    const criticCall = calls[1] as any;
    expect(writerCall.purpose).toBe("report");
    expect(writerCall.costContext).toMatchObject({ reportId: v4Job.payload.reportId, purpose: "report" });
    // Correction 8: chartId is NOT set to chartVersionId
    expect(writerCall.costContext.chartId).toBeUndefined();
    expect(writerCall.costContext.chartVersionId).toBe(v4Job.payload.chartVersionId);
    expect(criticCall.purpose).toBe("critic");
    expect(criticCall.costContext).toMatchObject({ reportId: v4Job.payload.reportId, purpose: "critic" });
    expect(criticCall.costContext.chartId).toBeUndefined();
  });

  it("propagates AI_COST_RECORDING_FAILED as its own code preserving retryability", async () => {
    const preparer = { prepare: vi.fn().mockResolvedValue({ ok: true, value: {} }) };
    const sourceRepository = withSuccessfulLifecycle({ loadSource: vi.fn().mockResolvedValue({ ok: true, value: mockV4Source }) });
    const versionRepository = {
      getImmutableVersion: vi.fn().mockResolvedValue(null),
      startOrReuseAttempt: vi.fn().mockResolvedValue({ ok: true }),
      recordFailedAttempt: vi.fn().mockResolvedValue({ ok: true }),
      commitImmutableVersion: vi.fn(),
    };
    const gate = { allows: () => true };
    const failingProvider = {
      generateStructured: vi.fn().mockResolvedValue({
        ok: false,
        error: { code: "AI_COST_RECORDING_FAILED", retryable: false },
      }),
    };

    const service = createReportGenerationService({
      sourceRepository: sourceRepository as any,
      versionRepository: versionRepository as any,
      gate: gate as any,
      provider: failingProvider as any,
      sourceSnapshotPreparer: preparer as any,
    });

    const v4Job = createV2Job({
      promptVersion: "ziwei.comprehensive.prompt.v4",
      knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V3,
    });

    const result = await service.generateReport({ job: v4Job, attemptNumber: 1, workerId: "worker-1" });
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("AI_COST_RECORDING_FAILED");
    expect(result.error?.retryable).toBe(false);
    expect(versionRepository.recordFailedAttempt).toHaveBeenCalledWith(
      expect.objectContaining({ errorCode: "AI_COST_RECORDING_FAILED" }),
    );
  });

  it("propagates cost context with report and critic purpose during V4 rewrite", async () => {
    const preparer = { prepare: vi.fn().mockResolvedValue({ ok: true, value: {} }) };
    const sourceRepository = withSuccessfulLifecycle({ loadSource: vi.fn().mockResolvedValue({ ok: true, value: mockV4Source }) });
    const versionRepository = {
      getImmutableVersion: vi.fn().mockResolvedValue(null),
      startOrReuseAttempt: vi.fn().mockResolvedValue({ ok: true }),
      recordFailedAttempt: vi.fn().mockResolvedValue({ ok: true }),
      commitImmutableVersion: vi.fn().mockResolvedValue({ ok: true, value: {} }),
      consumeRewriteBudget: vi.fn().mockResolvedValue({ ok: true, value: { consumed: true } }),
    };
    const gate = { allows: () => true };
    const calls: unknown[] = [];
    const invalidReport = buildV4ReportContent();
    invalidReport.overview.evidenceKeys = ["unknown.key.1"];
    const validReport = buildV4ReportContent();

    const mockProvider = {
      generateStructured: vi.fn().mockImplementation(async (req: any) => {
        calls.push(req);
        if (req.schemaName.includes("critic")) {
          return {
            ok: true,
            value: {
              value: {
                correctness: 5, evidenceCoverage: 5, specificity: 5, languageClarity: 5,
                consistency: 5, actionability: 5, safety: 5, repetitionControl: 5, notes: [],
              },
              providerId: "test", modelId: "test",
            },
          };
        }
        const isFirstWriter = calls.filter((c: any) => !c.schemaName.includes("critic")).length === 1;
        return {
          ok: true,
          value: { value: isFirstWriter ? invalidReport : validReport, providerId: "test", modelId: "test" },
        };
      }),
    };

    const service = createReportGenerationService({
      sourceRepository: sourceRepository as any,
      versionRepository: versionRepository as any,
      gate: gate as any,
      provider: mockProvider as any,
      sourceSnapshotPreparer: preparer as any,
    });

    const v4Job = createV2Job({
      promptVersion: "ziwei.comprehensive.prompt.v4",
      knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V3,
    });

    const result = await service.generateReport({ job: v4Job, attemptNumber: 1, workerId: "worker-1" });
    expect(result.ok).toBe(true);
    expect(calls).toHaveLength(3);
    const initialWriterCall = calls[0] as any;
    const rewriteWriterCall = calls[1] as any;
    const criticCall = calls[2] as any;
    expect(initialWriterCall.purpose).toBe("report");
    expect(initialWriterCall.costContext).toMatchObject({ reportId: v4Job.payload.reportId, purpose: "report" });
    expect(initialWriterCall.costContext.chartId).toBeUndefined();
    expect(rewriteWriterCall.purpose).toBe("report");
    expect(rewriteWriterCall.costContext).toMatchObject({ reportId: v4Job.payload.reportId, purpose: "report" });
    expect(rewriteWriterCall.costContext.chartId).toBeUndefined();
    expect(criticCall.purpose).toBe("critic");
    expect(criticCall.costContext).toMatchObject({ reportId: v4Job.payload.reportId, purpose: "critic" });
    expect(criticCall.costContext.chartId).toBeUndefined();
  });

  it("rewrites and passes when initial critic rejects quality and second critic passes, preserving 4-call cost lineage", async () => {
    const preparer = { prepare: vi.fn().mockResolvedValue({ ok: true, value: {} }) };
    const sourceRepository = withSuccessfulLifecycle({ loadSource: vi.fn().mockResolvedValue({ ok: true, value: mockV4Source }) });
    const versionRepository = {
      getImmutableVersion: vi.fn().mockResolvedValue(null),
      startOrReuseAttempt: vi.fn().mockResolvedValue({ ok: true }),
      recordFailedAttempt: vi.fn().mockResolvedValue({ ok: true }),
      commitImmutableVersion: vi.fn().mockResolvedValue({ ok: true, value: { id: "v4-committed" } }),
      consumeRewriteBudget: vi.fn().mockResolvedValue({ ok: true, value: { consumed: true } }),
    };
    const gate = { allows: () => true };
    const calls: any[] = [];
    let criticCount = 0;

    const mockProvider = {
      generateStructured: vi.fn().mockImplementation(async (req: any) => {
        calls.push(req);
        if (req.schemaName.includes("critic")) {
          criticCount += 1;
          if (criticCount === 1) {
            return {
              ok: true,
              value: {
                value: {
                  correctness: 5,
                  evidenceCoverage: 2,
                  specificity: 5,
                  languageClarity: 5,
                  consistency: 5,
                  actionability: 5,
                  safety: 5,
                  repetitionControl: 5,
                  notes: ["Cần bổ sung dẫn chứng chi tiết."],
                },
                providerId: "test-critic",
                modelId: "test-critic-model",
              },
            };
          }
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
              providerId: "test-critic",
              modelId: "test-critic-model",
            },
          };
        }
        return {
          ok: true,
          value: { value: buildV4ReportContent(), providerId: "test-writer", modelId: "test-writer-model" },
        };
      }),
    };

    const service = createReportGenerationService({
      sourceRepository: sourceRepository as any,
      versionRepository: versionRepository as any,
      gate: gate as any,
      provider: mockProvider as any,
      sourceSnapshotPreparer: preparer as any,
    });

    const v4Job = createV2Job({
      promptVersion: "ziwei.comprehensive.prompt.v4",
      knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V3,
    });

    const result = await service.generateReport({ job: v4Job, attemptNumber: 1, workerId: "worker-1" });
    expect(result.ok).toBe(true);
    expect(versionRepository.consumeRewriteBudget).toHaveBeenCalledTimes(1);
    expect(versionRepository.commitImmutableVersion).toHaveBeenCalledTimes(1);
    expect(calls).toHaveLength(4);

    expect(calls.map((c) => c.purpose)).toEqual(["report", "critic", "report", "critic"]);
    expect(calls.map((call) => call.costContext.purpose)).toEqual(["report", "critic", "report", "critic"]);
    for (const call of calls) {
      expect(call.costContext).toMatchObject({
        reportId: v4Job.payload.reportId,
        reportVersionId: v4Job.payload.reportVersionId,
        chartVersionId: v4Job.payload.chartVersionId,
        entitlementId: v4Job.payload.entitlementId,
        sku: v4Job.payload.sku,
        attemptNumber: 1,
      });
      expect(call.costContext.chartId).toBeUndefined();
    }
  });

  it("terminal-fails with REPORT_SAFETY_REJECTED and does not commit when rewritten V4 content fails second critic on safety", async () => {
    const preparer = { prepare: vi.fn().mockResolvedValue({ ok: true, value: {} }) };
    const sourceRepository = withSuccessfulLifecycle({ loadSource: vi.fn().mockResolvedValue({ ok: true, value: mockV4Source }) });
    const versionRepository = {
      getImmutableVersion: vi.fn().mockResolvedValue(null),
      startOrReuseAttempt: vi.fn().mockResolvedValue({ ok: true }),
      recordFailedAttempt: vi.fn().mockResolvedValue({ ok: true }),
      commitImmutableVersion: vi.fn(),
      consumeRewriteBudget: vi.fn().mockResolvedValue({ ok: true, value: { consumed: true } }),
    };
    const gate = { allows: () => true };
    const calls: any[] = [];
    let criticCount = 0;

    const mockProvider = {
      generateStructured: vi.fn().mockImplementation(async (req: any) => {
        calls.push(req);
        if (req.schemaName.includes("critic")) {
          criticCount += 1;
          if (criticCount === 1) {
            return {
              ok: true,
              value: {
                value: {
                  correctness: 5,
                  evidenceCoverage: 2,
                  specificity: 5,
                  languageClarity: 5,
                  consistency: 5,
                  actionability: 5,
                  safety: 5,
                  repetitionControl: 5,
                  notes: ["Chất lượng chưa đạt chuẩn."],
                },
                providerId: "test-critic",
                modelId: "test-critic-model",
              },
            };
          }
          return {
            ok: true,
            value: {
              value: {
                correctness: 2,
                evidenceCoverage: 5,
                specificity: 5,
                languageClarity: 5,
                consistency: 5,
                actionability: 5,
                safety: 2,
                repetitionControl: 5,
                notes: ["Phát hiện nhận định chưa an toàn."],
              },
              providerId: "test-critic",
              modelId: "test-critic-model",
            },
          };
        }
        return {
          ok: true,
          value: { value: buildV4ReportContent(), providerId: "test-writer", modelId: "test-writer-model" },
        };
      }),
    };

    const service = createReportGenerationService({
      sourceRepository: sourceRepository as any,
      versionRepository: versionRepository as any,
      gate: gate as any,
      provider: mockProvider as any,
      sourceSnapshotPreparer: preparer as any,
    });

    const v4Job = createV2Job({
      promptVersion: "ziwei.comprehensive.prompt.v4",
      knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V3,
    });

    const result = await service.generateReport({ job: v4Job, attemptNumber: 1, workerId: "worker-1" });
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("REPORT_SAFETY_REJECTED");
    expect(versionRepository.recordFailedAttempt).toHaveBeenCalledWith(
      expect.objectContaining({ errorCode: "REPORT_SAFETY_REJECTED" }),
    );
    expect(versionRepository.consumeRewriteBudget).toHaveBeenCalledTimes(1);
    expect(versionRepository.commitImmutableVersion).not.toHaveBeenCalled();
    expect(calls).toHaveLength(4);

    expect(calls.map((c) => c.purpose)).toEqual(["report", "critic", "report", "critic"]);
    expect(calls.map((call) => call.costContext.purpose)).toEqual(["report", "critic", "report", "critic"]);
    for (const call of calls) {
      expect(call.costContext).toMatchObject({
        reportId: v4Job.payload.reportId,
        reportVersionId: v4Job.payload.reportVersionId,
        chartVersionId: v4Job.payload.chartVersionId,
        entitlementId: v4Job.payload.entitlementId,
        sku: v4Job.payload.sku,
        attemptNumber: 1,
      });
      expect(call.costContext.chartId).toBeUndefined();
    }
  });
});

describe("createReportGenerationService V4.1 sectioned orchestration", () => {
  type Key = ComprehensiveReportSectionKey;

  const longProse = (anchors: string[], seed: string) =>
    `${anchors.join(" và ")}. ${Array.from({ length: 24 }, (_, index) =>
      `Trong nhịp ${seed.replace(/[^a-z]+/gu, "")}${index + 1}, người đọc ${seed.replace(/[^a-z]+/gu, "")} có thể ${seed.replace(/[^a-z]+/gu, "")} cân nhắc công việc, quan hệ, sức khỏe và nguồn lực để lựa chọn bước đi phù hợp.`,
    ).join(" ")}`;

  const actionProse = (slot: number) => {
    const themes = [
      "lịch làm việc, nhịp nghỉ ngơi và thứ tự ưu tiên trong tuần",
      "nguồn lực tài chính, quỹ dự phòng và các khoản chi thiết yếu",
      "mối quan hệ hợp tác, cách trao đổi và phạm vi trách nhiệm",
      "kỹ năng chuyên môn, kế hoạch học tập và phản hồi từ đồng nghiệp",
      "sức khỏe thường ngày, vận động nhẹ và chất lượng giấc ngủ",
      "mục tiêu gia đình, thời gian hiện diện và các cam kết chung",
      "mạng lưới hỗ trợ, người cố vấn và cơ hội kết nối phù hợp",
      "không gian sống, nề nếp cá nhân và khả năng tập trung",
      "dự án dài hạn, các mốc kiểm tra và điều kiện điều chỉnh",
    ];
    const theme = themes[slot]!;
    return `${Array.from({ length: 7 }, (_, index) =>
      `Ở bước ${index + 1}, hãy quan sát ${theme}, ghi nhận thay đổi thực tế và chọn một điều chỉnh nhỏ có thể duy trì ổn định.`,
    ).join(" ")}`;
  };

  const sectionFor = (key: Key) => {
    const evidenceKeys = key === "birthTimeSensitivity"
      ? [
          "sensitivity.stable.soul-palace",
          "sensitivity.stable.major-star",
          "sensitivity.sensitive.life-palace",
          "sensitivity.sensitive.major-star",
        ]
      : ["e-life", "e-star"];
    if (key === "keyConfigurations") {
      return { key, value: [{ title: "Cấu trúc trọng yếu", narrative: longProse(["cung Mệnh", "sao Tử Vi"], key), evidenceKeys }] };
    }
    if (key.startsWith("palace:")) {
      return {
        key,
        value: {
          palaceId: key.slice("palace:".length),
          title: "Luận giải cung",
          narrative: longProse(["sao Tử Vi", "sao Thiên Cơ"], key),
          evidenceKeys,
        },
      };
    }
    if (key.startsWith("thematic:")) {
      return {
        key,
        value: { id: key.slice("thematic:".length), title: "Tổng hợp chủ đề", narrative: longProse(["cung Mệnh", "sao Tử Vi"], key), evidenceKeys },
      };
    }
    if (key === "currentDecadal") {
      return {
        key,
        value: {
          title: "Đại vận hiện hành", state: "active", index: 2, ageRange: [22, 31], yearRange: [2022, 2031],
          narrative: longProse(["cung Mệnh", "sao Tử Vi"], key), evidenceKeys,
        },
      };
    }
    if (key === "annualSnapshot") {
      return {
        key,
        value: {
          title: "Lưu niên năm 2026", targetYear: 2026, asOfDate: "2026-09-12",
          narrative: longProse(["cung Mệnh", "sao Tử Vi"], key), evidenceKeys,
        },
      };
    }
    if (key === "birthTimeSensitivity") {
      return {
        key,
        value: {
          title: "Độ nhạy theo khung giờ sinh",
          stableFactors: {
            title: "Những điểm ổn định",
            narrative: longProse(["cung Mệnh", "sao Tử Vi"], `${key}Stable`),
            evidenceKeys: ["sensitivity.stable.soul-palace", "sensitivity.stable.major-star"],
          },
          sensitiveFactors: {
            title: "Những điểm cần quan sát thêm",
            narrative: longProse(["cung Mệnh", "sao Tử Vi"], `${key}Sensitive`),
            evidenceKeys: ["sensitivity.sensitive.life-palace", "sensitivity.sensitive.major-star"],
          },
        },
      };
    }
    if (key === "practicalDirection") {
      return {
        key,
        value: Array.from({ length: 3 }, (_, index) => ({
          recommendation: `${"cung Mệnh và sao Tử Vi. "} ${actionProse(index * 3)}`,
          rationale: `${"cung Mệnh và sao Tử Vi. "} ${actionProse(index * 3 + 1)}`,
          avoid: `${"cung Mệnh và sao Tử Vi. "} ${actionProse(index * 3 + 2)}`,
          evidenceKeys,
        })),
      };
    }
    return { key, value: { title: "Luận giải trọng tâm", narrative: longProse(["cung Mệnh", "sao Tử Vi"], key), evidenceKeys } };
  };

  const sectionedFacts = {
    version: 4,
    natal: {
      palaces: ZIWEI_PALACE_IDS.map((palaceId, index) => ({
        palaceId,
        earthlyBranchId: `ziwei.branch.${index}`,
        isLifePalace: palaceId === "ziwei.palace.life",
        isBodyPalace: palaceId === "ziwei.palace.career",
        stars: [
          { id: "ziwei.star.ziwei", category: "major" },
          { id: "ziwei.star.tianji", category: "major" },
        ],
        triadPalaceIds: [],
        oppositePalaceId: "ziwei.palace.life",
        flankingPalaceIds: [],
      })),
      transformations: [],
      patterns: [],
      evidenceKeys: [],
    },
    timing: {
      decadal: { state: "active", index: 2, ageRange: [22, 31], yearRange: [2022, 2031], palaceId: "ziwei.palace.fortune", palaces: [] },
      annual: { targetYear: 2026, palaceId: "ziwei.palace.career", palaces: [] },
    },
    sensitivity: {
      stableFactKeys: ["ziwei.fact.soul-palace"],
      sensitiveFacts: [],
    },
    sourceSnapshot: {
      reportVersionId: "22222222-2222-4222-8222-222222222222",
      chartVersionId: "chart-2",
      asOfDate: "2026-09-12",
      targetYear: 2026,
      timingRuleVersion: "ziwei.timing.v1",
      sensitivityRuleVersion: "ziwei.sensitivity.v1",
      snapshotHash: "a".repeat(64),
    },
    evidence: {
      items: [
        { key: "e-life", sourceKeys: ["ziwei.palace.life"] },
        { key: "e-star", sourceKeys: ["ziwei.star.ziwei"] },
        { key: "sensitivity.stable.soul-palace", sourceKeys: ["ziwei.palace.life"] },
        { key: "sensitivity.stable.major-star", sourceKeys: ["ziwei.star.ziwei"] },
        { key: "sensitivity.sensitive.life-palace", sourceKeys: ["ziwei.palace.life"] },
        { key: "sensitivity.sensitive.major-star", sourceKeys: ["ziwei.star.ziwei"] },
      ],
    },
    evidenceKeys: [
      "e-life",
      "e-star",
      "sensitivity.stable.soul-palace",
      "sensitivity.stable.major-star",
      "sensitivity.sensitive.life-palace",
      "sensitivity.sensitive.major-star",
    ],
  } as any;

  const sectionedSource = {
    ...mockV3Source,
    comprehensiveFactsV4: sectionedFacts,
    knowledgePacks: [],
  } as any;

  function checkpoint(key: Key, value = sectionFor(key).value, providerId = "section-provider", modelId = "section-model") {
    return {
      id: `checkpoint-${key}`, reportVersionId: "22222222-2222-4222-8222-222222222222", sectionKey: key,
      sectionOrder: COMPREHENSIVE_REPORT_SECTION_KEYS.indexOf(key), promptVersion: REPORT_PROMPT_VERSION_V4_0_1,
      knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V3, reportConfigVersion: REPORT_CONFIG_VERSION_V4_1_SECTIONED,
      qualityConfigVersion: "ziwei.comprehensive.quality.v1", stateVersion: 1, status: "passed",
      generationAttemptCount: 1, rewriteAttemptCount: 0, activeJobId: null, activeWorkerId: null,
      acceptedSection: { key, value }, contentHash: "a".repeat(64), providerId, modelId, failureCode: null,
      createdAt: new Date(), updatedAt: new Date(),
    } as any;
  }

  function createCheckpointFake(initial: readonly any[] = []) {
    const rows = new Map<Key, any>(initial.map((row) => [row.sectionKey, { ...row }]));
    const revisions = new Map<Key, any>();
    const revisionHistory = new Map<Key, any[]>();
    const qualityCandidates = new Map<Key, any>();
    const calls = { claims: [] as Key[], rewrites: [] as Key[], passed: [] as Key[], releases: [] as Key[], terminals: [] as Key[], qualityRewrites: [] as Key[] };
    const accepted = () => [...rows.values()]
      .sort((left, right) => left.sectionOrder - right.sectionOrder)
      .flatMap((base) => {
      const key = base.sectionKey as Key;
      const revision = (revisionHistory.get(key) ?? []).filter((item) => item.status === "passed").at(-1);
      return base?.status === "passed" ? [{ ...base, ...(revision?.status === "passed" ? {
        acceptedSection: { key, value: revision.acceptedSection.value }, providerId: revision.providerId, modelId: revision.modelId,
      } : {}) }] : [];
    });
    return {
      calls, rows, revisions, qualityCandidates,
      listAccepted: vi.fn(async () => ({ ok: true, value: accepted() })),
      claim: vi.fn(async (input: any) => {
        calls.claims.push(input.sectionKey);
        const current = rows.get(input.sectionKey);
        if (current?.status === "passed") return { ok: true, value: { outcome: "replay", checkpoint: current } };
        const count = (current?.generationAttemptCount ?? 0) + 1;
        if (count > input.generationAttemptCap) return { ok: true, value: { outcome: "terminal", checkpoint: current ?? checkpoint(input.sectionKey) } };
        const next = { ...(current ?? checkpoint(input.sectionKey)), ...input, status: "generating", stateVersion: (current?.stateVersion ?? 0) + 1, generationAttemptCount: count };
        rows.set(input.sectionKey, next);
        return { ok: true, value: { outcome: "claimed", checkpoint: next } };
      }),
      markPassed: vi.fn(async (input: any) => {
        calls.passed.push(input.sectionKey);
        const current = rows.get(input.sectionKey);
        const next = { ...current, status: "passed", stateVersion: current.stateVersion + 1, acceptedSection: { key: input.sectionKey, value: input.acceptedContent }, providerId: input.providerId, modelId: input.modelId };
        rows.set(input.sectionKey, next);
        return { ok: true, value: { outcome: "passed", checkpoint: next } };
      }),
      releaseRetryableFailure: vi.fn(async (input: any) => {
        calls.releases.push(input.sectionKey);
        const current = rows.get(input.sectionKey);
        rows.set(input.sectionKey, { ...current, status: "pending", stateVersion: current.stateVersion + 1, failureCode: input.failureCode });
        return { ok: true, value: rows.get(input.sectionKey) };
      }),
      markTerminalFailure: vi.fn(async (input: any) => {
        calls.terminals.push(input.sectionKey);
        const current = rows.get(input.sectionKey);
        rows.set(input.sectionKey, {
          ...current,
          status: "terminal_failure",
          activeJobId: null,
          activeWorkerId: null,
          stateVersion: current.stateVersion + 1,
          failureCode: input.failureCode,
        });
        return { ok: true, value: rows.get(input.sectionKey) };
      }),
      claimQualityRewrite: vi.fn(async (input: any) => {
        calls.qualityRewrites.push(input.sectionKey);
        const candidate = qualityCandidates.get(input.sectionKey);
        if (!candidate) return { ok: true, value: { outcome: "none" } };
        if (candidate.status === "terminal_failure") return { ok: true, value: { outcome: "terminal" } };
        if (candidate.status === "generating" && candidate.activeJobId === input.jobId && candidate.activeWorkerId === input.workerId && candidate.activeAttemptNumber === input.attemptNumber) {
          return { ok: true, value: { outcome: "in_progress", candidate } };
        }
        const claimed = { ...candidate, status: "generating", activeJobId: input.jobId, activeWorkerId: input.workerId, activeAttemptNumber: input.attemptNumber, stateVersion: candidate.stateVersion + 1 };
        qualityCandidates.set(input.sectionKey, claimed);
        const current = rows.get(input.sectionKey);
        rows.set(input.sectionKey, { ...current, status: "generating", activeJobId: input.jobId, activeWorkerId: input.workerId, stateVersion: current.stateVersion + 1 });
        return { ok: true, value: { outcome: "claimed", candidate: claimed } };
      }),
      recordQualityCandidate: vi.fn(async (input: any) => {
        const current = rows.get(input.sectionKey);
        const existing = qualityCandidates.get(input.sectionKey);
        if (existing) return { ok: true, value: { outcome: "replay", candidate: existing } };
        if (current.rewriteAttemptCount >= input.rewriteAttemptCap) {
          rows.set(input.sectionKey, { ...current, status: "terminal_failure", activeJobId: null, activeWorkerId: null });
          return { ok: false, error: { code: "REPORT_SECTION_CHECKPOINT_ATTEMPT_LIMIT" } };
        }
        const candidate = {
          id: `quality-${input.sectionKey}`, checkpointId: `checkpoint-${input.sectionKey}`,
          rewriteOrdinal: current.rewriteAttemptCount + 1, generationOrdinal: current.generationAttemptCount,
          stateVersion: 1, status: "pending", activeJobId: null, activeWorkerId: null, activeAttemptNumber: null,
          candidateSection: { key: input.sectionKey, value: input.candidateContent },
          candidateHash: input.candidateHash, candidateProviderId: input.candidateProviderId,
          candidateModelId: input.candidateModelId, findings: input.findings, acceptedSection: null,
        };
        qualityCandidates.set(input.sectionKey, candidate);
        rows.set(input.sectionKey, { ...current, status: "pending", activeJobId: null, activeWorkerId: null, rewriteAttemptCount: candidate.rewriteOrdinal, stateVersion: current.stateVersion + 1 });
        return { ok: true, value: { outcome: "recorded", candidate } };
      }),
      releaseQualityRewriteRetryableFailure: vi.fn(async (input: any) => {
        const candidate = qualityCandidates.get(input.sectionKey);
        const released = { ...candidate, status: "pending", activeJobId: null, activeWorkerId: null, activeAttemptNumber: null, stateVersion: candidate.stateVersion + 1, failureCode: input.failureCode };
        qualityCandidates.set(input.sectionKey, released);
        const current = rows.get(input.sectionKey);
        rows.set(input.sectionKey, { ...current, status: "pending", activeJobId: null, activeWorkerId: null, stateVersion: current.stateVersion + 1, failureCode: input.failureCode });
        return { ok: true, value: released };
      }),
      markQualityRewriteTerminalFailure: vi.fn(async (input: any) => {
        const candidate = qualityCandidates.get(input.sectionKey);
        const terminal = { ...candidate, status: "terminal_failure", activeJobId: null, activeWorkerId: null, activeAttemptNumber: null, stateVersion: candidate.stateVersion + 1, failureCode: input.failureCode };
        qualityCandidates.set(input.sectionKey, terminal);
        const current = rows.get(input.sectionKey);
        rows.set(input.sectionKey, {
          ...current,
          status: "terminal_failure",
          activeJobId: null,
          activeWorkerId: null,
          acceptedSection: null,
          contentHash: null,
          providerId: null,
          modelId: null,
          stateVersion: current.stateVersion + 1,
          failureCode: input.failureCode,
        });
        return { ok: true, value: terminal };
      }),
      markQualityRewritePassed: vi.fn(async (input: any) => {
        const candidate = qualityCandidates.get(input.sectionKey);
        const passed = { ...candidate, status: "passed", activeJobId: null, activeWorkerId: null, activeAttemptNumber: null, stateVersion: candidate.stateVersion + 1, acceptedSection: { key: input.sectionKey, value: input.acceptedContent }, providerId: input.providerId, modelId: input.modelId };
        qualityCandidates.set(input.sectionKey, passed);
        const current = rows.get(input.sectionKey);
        rows.set(input.sectionKey, { ...current, status: "passed", activeJobId: null, activeWorkerId: null, stateVersion: current.stateVersion + 1, acceptedSection: passed.acceptedSection, providerId: input.providerId, modelId: input.modelId });
        return { ok: true, value: { outcome: "passed", candidate: passed } };
      }),
      claimPassedRewrite: vi.fn(async (input: any) => {
        calls.rewrites.push(input.sectionKey);
        const history = revisionHistory.get(input.sectionKey) ?? [];
        const unfinished = history.find((item) => item.status === "pending" || item.status === "generating");
        if (unfinished?.status === "generating" && unfinished.activeJobId === input.jobId && unfinished.activeWorkerId === input.workerId) {
          revisions.set(input.sectionKey, unfinished);
          return { ok: true, value: { outcome: "claimed", revision: unfinished } };
        }
        if (unfinished) {
          unfinished.status = "terminal_failure";
          unfinished.activeJobId = null;
          unfinished.activeWorkerId = null;
          unfinished.failureCode = "REWRITE_OWNER_ABANDONED";
          unfinished.stateVersion += 1;
        }
        const current = rows.get(input.sectionKey);
        const ordinal = (current?.rewriteAttemptCount ?? 0) + 1;
        if (ordinal > input.rewriteAttemptCap) return { ok: true, value: { outcome: "terminal", revision: unfinished ?? history.at(-1) ?? {} } };
        rows.set(input.sectionKey, { ...current, rewriteAttemptCount: ordinal });
        const revision = {
          id: `revision-${input.sectionKey}-${ordinal}`,
          checkpointId: `checkpoint-${input.sectionKey}`,
          rewriteOrdinal: ordinal,
          stateVersion: 1,
          status: "generating",
          activeJobId: input.jobId,
          activeWorkerId: input.workerId,
          acceptedSection: null,
          failureCode: null,
        };
        history.push(revision);
        revisionHistory.set(input.sectionKey, history);
        revisions.set(input.sectionKey, revision);
        return { ok: true, value: { outcome: "claimed", revision } };
      }),
      markPassedRewrite: vi.fn(async (input: any) => {
        const current = revisions.get(input.sectionKey);
        const revision = { ...current, status: "passed", stateVersion: current.stateVersion + 1, acceptedSection: { key: input.sectionKey, value: input.acceptedContent }, providerId: input.providerId, modelId: input.modelId };
        revisions.set(input.sectionKey, revision);
        const history = revisionHistory.get(input.sectionKey) ?? [];
        const index = history.findIndex((item) => item.rewriteOrdinal === revision.rewriteOrdinal);
        if (index >= 0) history[index] = revision;
        revisionHistory.set(input.sectionKey, history);
        return { ok: true, value: { outcome: "passed", revision } };
      }),
      releaseRewriteRetryableFailure: vi.fn(async (input: any) => {
        const current = revisions.get(input.sectionKey);
        const revision = {
          ...current,
          status: "terminal_failure",
          activeJobId: null,
          activeWorkerId: null,
          stateVersion: current.stateVersion + 1,
          failureCode: input.failureCode,
        };
        revisions.set(input.sectionKey, revision);
        const history = revisionHistory.get(input.sectionKey) ?? [];
        const index = history.findIndex((item) => item.rewriteOrdinal === revision.rewriteOrdinal);
        if (index >= 0) history[index] = revision;
        revisionHistory.set(input.sectionKey, history);
        return { ok: true, value: revision };
      }),
    } as any;
  }

  function createSectionedService(options: {
    initial?: readonly any[];
    onSection?: (key: Key, request: any) => any;
    onCritic?: (request: any, pass: number) => any;
    guard?: { state(): "active" | "lease_lost" | "wall_clock_exhausted" };
    readingContext?: { version: 1; lifeStage?: any; topConcern?: any } | null;
    lifecycle?: Array<"ok" | "purged" | "mismatch">;
  } = {}) {
    const repository = createCheckpointFake(options.initial);
    const starts: Key[] = [];
    const costContexts: any[] = [];
    let criticPass = 0;
    let inFlight = 0;
    let maxInFlight = 0;
    const lifecycle = vi.fn(async (input: {
      reportVersionId: string;
      jobId: string;
      readingContextRevisionId: string | null;
    }) => {
      const outcome = options.lifecycle?.shift() ?? "ok";
      if (outcome === "ok") {
        return { ok: true as const, value: { readingContextRevisionId: input.readingContextRevisionId } };
      }
      return {
        ok: false as const,
        error: {
          code: outcome === "purged" ? "REPORT_PROFILE_PURGED" as const : "REPORT_CONTEXT_MISMATCH" as const,
          messageKey: "reports.report_lifecycle_failed",
          retryable: false,
        },
      };
    });
    const provider = {
      generateStructured: vi.fn(async (request: any) => {
        costContexts.push(request.costContext);
        if (request.schemaName === "comprehensive_report_sectioned_critic_v4") {
          criticPass += 1;
          return options.onCritic?.(request, criticPass) ?? { ok: true, value: { value: { correctness: 5, evidenceCoverage: 5, specificity: 5, languageClarity: 5, consistency: 5, actionability: 5, safety: 5, repetitionControl: 5, notes: [], findings: [] }, providerId: "critic-provider", modelId: "critic-model" } };
        }
        const key = JSON.parse(request.user).sectionKey as Key;
        starts.push(key);
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((resolve) => setTimeout(resolve, 1));
        inFlight -= 1;
        const overridden = options.onSection?.(key, request);
        const output = overridden ?? { ok: true, value: { value: sectionFor(key), providerId: "section-provider", modelId: "section-model" } };
        if (output.ok && !overridden) {
          const parsed = request.schema.safeParse(output.value.value);
          if (!parsed.success) {
            throw new Error(`provider schema rejected ${key}: ${parsed.error.issues.map((issue: any) => issue.message).join("; ")}`);
          }
        }
        return output;
      }),
    };
    const versionRepository = {
      getImmutableVersion: vi.fn().mockResolvedValue(null),
      startOrReuseAttempt: vi.fn().mockResolvedValue({ ok: true, value: {} }),
      recordFailedAttempt: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
      commitImmutableVersion: vi.fn().mockResolvedValue({ ok: true, value: { id: "committed" } }),
      consumeRewriteBudget: vi.fn(),
    };
    const service = createReportGenerationService({
      sourceRepository: {
        loadSource: vi.fn().mockResolvedValue({
          ok: true,
          value: { ...sectionedSource, readingContext: options.readingContext ?? null },
        }),
        validateLifecycle: lifecycle,
      } as any,
      sourceSnapshotPreparer: { prepare: vi.fn().mockResolvedValue({ ok: true, value: {} }) } as any,
      versionRepository: versionRepository as any,
      sectionCheckpointRepository: repository,
      gate: { allows: () => true } as any,
      provider: provider as any,
    });
    return { service, repository, provider, versionRepository, starts, costContexts, lifecycle, maxInFlight: () => maxInFlight, guard: options.guard };
  }

  const sectionedJob = (overrides: Record<string, unknown> = {}) => createV2Job({
    promptVersion: REPORT_PROMPT_VERSION_V4_0_1,
    reportConfigVersion: REPORT_CONFIG_VERSION_V4_1_SECTIONED,
    ...overrides,
  });

  function expectSectionedSuccess(result: any, fixture: any) {
    if (!result.ok) {
      throw new Error(JSON.stringify({
        error: result.error,
        starts: fixture.starts,
        checkpointCalls: fixture.repository.calls,
        providerSchemas: fixture.provider.generateStructured.mock.calls.map(([request]: [any]) => request.schemaName),
      }));
    }
  }

  it("generates in canonical dependency order with bounded palace/theme concurrency and durable cost lineage", async () => {
    const fixture = createSectionedService();
    expect(() => parseComprehensiveReportAcceptedSection(sectionFor("palace:ziwei.palace.life"))).not.toThrow();
    const overview = sectionFor("overview").value as any;
    expect(validateComprehensiveReportSectionQualityV4({
      key: "overview", kind: "overview", text: `${overview.title} ${overview.narrative}`, evidenceKeys: overview.evidenceKeys,
    }, sectionedFacts)).toEqual({ ok: true, findings: [] });
    const result = await fixture.service.generateReport({ job: sectionedJob(), attemptNumber: 7, workerId: "worker-1" });

    expectSectionedSuccess(result, fixture);
    expect(fixture.starts).toEqual(COMPREHENSIVE_REPORT_SECTION_KEYS);
    expect(fixture.maxInFlight()).toBeLessThanOrEqual(2);
    expect(fixture.starts.indexOf("coreAxis")).toBeGreaterThan(fixture.starts.indexOf("overview"));
    expect(fixture.starts.indexOf("keyConfigurations")).toBeGreaterThan(fixture.starts.indexOf("coreAxis"));
    expect(fixture.versionRepository.startOrReuseAttempt).toHaveBeenCalledTimes(1);
    expect(fixture.versionRepository.commitImmutableVersion).toHaveBeenCalledTimes(1);
    expect(fixture.versionRepository.consumeRewriteBudget).not.toHaveBeenCalled();
    expect(fixture.costContexts.filter((context) => context.purpose === "report")).toHaveLength(COMPREHENSIVE_REPORT_SECTION_KEYS.length);
    expect(fixture.costContexts.find((context) => context.purpose === "report")).toMatchObject({
      idempotencyKey: expect.stringMatching(/:overview:generation:1:critic:0$/),
      reportVersionId: sectionedJob().payload.reportVersionId,
      chartVersionId: sectionedJob().payload.chartVersionId,
      entitlementId: sectionedJob().payload.entitlementId,
      attemptNumber: 7,
    });
    expect(fixture.costContexts.every((context) => context.chartId === undefined)).toBe(true);
    expect(fixture.costContexts.filter((context) => context.purpose === "critic").map((context) => context.idempotencyKey)).toEqual([
      `${sectionedJob().payload.reportVersionId}:critic:1`,
    ]);
  });

  it("commits the exact V4.1 sensitivity tuple through checkpoints and V3 HTML", async () => {
    const fixture = createSectionedService();
    const job = sectionedJob({
      knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V4,
      promptVersion: REPORT_PROMPT_VERSION_V4_1_SENSITIVITY,
      reportConfigVersion: REPORT_CONFIG_VERSION_V4_1_SECTIONED_SENSITIVITY,
    });

    const result = await fixture.service.generateReport({ job, attemptNumber: 1, workerId: "worker-1" });

    expectSectionedSuccess(result, fixture);
    expect(fixture.starts).toEqual(COMPREHENSIVE_REPORT_SECTION_KEYS_V4_1);
    const committed = fixture.versionRepository.commitImmutableVersion.mock.calls[0]![0];
    expect(committed).toMatchObject({
      templateVersion: "ziwei-comprehensive-html.v2",
      renderVersion: "identity-report-pdf.v2",
    });
    expect(committed.structuredContent.birthTimeSensitivity).toBeDefined();
    expect(committed.htmlContent).toContain("Độ nhạy theo khung giờ sinh");
  });

  it("prioritizes the matching thematic section without changing canonical assembly", async () => {
    const fixture = createSectionedService({
      readingContext: { version: 1, lifeStage: "early_career", topConcern: "career" },
    });
    const result = await fixture.service.generateReport({
      job: sectionedJob({ readingContextRevisionId: "context-1" }),
      attemptNumber: 1,
      workerId: "worker-1",
      jobId: "active-job-1",
    });
    expectSectionedSuccess(result, fixture);
    const themes = fixture.starts.filter((key) => key.startsWith("thematic:"));
    expect(themes[0]).toBe("thematic:career_wealth");
    expect(fixture.versionRepository.commitImmutableVersion).toHaveBeenCalledTimes(1);
    expect(fixture.lifecycle).toHaveBeenCalled();
    for (const call of fixture.lifecycle.mock.calls) {
      expect(call[0]).toEqual({
        reportVersionId: sectionedJob({ readingContextRevisionId: "context-1" }).payload.reportVersionId,
        jobId: "active-job-1",
        readingContextRevisionId: "context-1",
      });
    }
  });

  it("normalizes legacy context and stops all later provider calls on lifecycle mismatch", async () => {
    const fixture = createSectionedService({ lifecycle: ["ok", "mismatch"] });
    const job = sectionedJob();
    delete (job.payload as any).readingContextRevisionId;
    const result = await fixture.service.generateReport({
      job,
      attemptNumber: 1,
      workerId: "worker-1",
      jobId: "active-job-legacy",
    });
    expect(result).toMatchObject({
      ok: false,
      error: { code: "REPORT_CONTEXT_MISMATCH", retryable: false },
    });
    expect(fixture.provider.generateStructured).toHaveBeenCalledTimes(1);
    expect(fixture.starts).toEqual(["overview"]);
    expect(fixture.lifecycle.mock.calls).toHaveLength(2);
    expect(fixture.lifecycle.mock.calls[0][0]).toMatchObject({
      reportVersionId: job.payload.reportVersionId,
      jobId: "active-job-legacy",
      readingContextRevisionId: null,
    });
  });

  it.each([
    ["REPORT_PROFILE_PURGED", "purged"],
    ["REPORT_CONTEXT_MISMATCH", "mismatch"],
  ] as const)("fences every section provider call and blocks later sections on %s", async (code, lifecycle) => {
    const fixture = createSectionedService({ lifecycle: ["ok", lifecycle] });
    const job = sectionedJob({ readingContextRevisionId: "context-1" });
    const result = await fixture.service.generateReport({
      job,
      attemptNumber: 1,
      workerId: "worker-1",
      jobId: "active-job-1",
    });

    expect(result).toMatchObject({ ok: false, error: { code, retryable: false } });
    expect(fixture.provider.generateStructured).toHaveBeenCalledTimes(1);
    expect(fixture.starts).toEqual(["overview"]);
    expect(fixture.lifecycle).toHaveBeenCalledTimes(2);
    expect(fixture.lifecycle.mock.calls.every(([input]) =>
      input.readingContextRevisionId === "context-1" &&
      input.reportVersionId === job.payload.reportVersionId &&
      input.jobId === "active-job-1",
    )).toBe(true);
  });

  it("fences a section rewrite before its provider call", async () => {
    const fixture = createSectionedService({
      initial: COMPREHENSIVE_REPORT_SECTION_KEYS.map((key) => checkpoint(key)),
      lifecycle: ["ok", "purged"],
      onCritic: () => ({
        ok: true,
        value: {
          value: {
            correctness: 5, evidenceCoverage: 3, specificity: 5, languageClarity: 5,
            consistency: 5, actionability: 5, safety: 5, repetitionControl: 5, notes: [],
            findings: [{ key: "palace:ziwei.palace.life", note: "Bổ sung căn cứ." }],
          },
          providerId: "critic-provider",
          modelId: "critic-model",
        },
      }),
    });
    const result = await fixture.service.generateReport({
      job: sectionedJob({ readingContextRevisionId: "context-1" }),
      attemptNumber: 1,
      workerId: "worker-1",
    });

    expect(result).toMatchObject({
      ok: false,
      error: { code: "REPORT_PROFILE_PURGED", retryable: false },
    });
    expect(fixture.provider.generateStructured).toHaveBeenCalledTimes(1);
    expect(fixture.repository.calls.rewrites).toEqual(["palace:ziwei.palace.life"]);
    expect(fixture.starts).toEqual([]);
  });

  it("fences initial and rewrite re-critic calls without dispatching forbidden critics", async () => {
    const initialCritic = createSectionedService({
      initial: COMPREHENSIVE_REPORT_SECTION_KEYS.map((key) => checkpoint(key)),
      lifecycle: ["mismatch"],
    });
    const initialResult = await initialCritic.service.generateReport({
      job: sectionedJob({ readingContextRevisionId: "context-1" }),
      attemptNumber: 1,
      workerId: "worker-1",
    });
    expect(initialResult).toMatchObject({
      ok: false,
      error: { code: "REPORT_CONTEXT_MISMATCH", retryable: false },
    });
    expect(initialCritic.provider.generateStructured).not.toHaveBeenCalled();

    const recritic = createSectionedService({
      initial: COMPREHENSIVE_REPORT_SECTION_KEYS.map((key) => checkpoint(key)),
      lifecycle: ["ok", "ok", "purged"],
      onCritic: (_request, pass) => pass === 1
        ? {
          ok: true,
          value: {
            value: {
              correctness: 5, evidenceCoverage: 3, specificity: 5, languageClarity: 5,
              consistency: 5, actionability: 5, safety: 5, repetitionControl: 5, notes: [],
              findings: [{ key: "palace:ziwei.palace.life", note: "Bổ sung căn cứ." }],
            },
            providerId: "critic-provider",
            modelId: "critic-model",
          },
        }
        : undefined,
    });
    const recriticResult = await recritic.service.generateReport({
      job: sectionedJob({ readingContextRevisionId: "context-1" }),
      attemptNumber: 1,
      workerId: "worker-1",
    });
    expect(recriticResult).toMatchObject({
      ok: false,
      error: { code: "REPORT_PROFILE_PURGED", retryable: false },
    });
    expect(recritic.provider.generateStructured).toHaveBeenCalledTimes(2);
    expect(recritic.starts).toEqual(["palace:ziwei.palace.life"]);
  });

  it("reuses passed checkpoints, retries only invalid/retryable sections, and never regenerates passed key configurations", async () => {
    const initial = [checkpoint("overview"), checkpoint("coreAxis"), checkpoint("keyConfigurations")];
    let retry = true;
    const fixture = createSectionedService({
      initial,
      onSection: (key) => {
        if (key === "palace:ziwei.palace.life" && retry) {
          retry = false;
          return { ok: false, error: { code: "AI_PROVIDER_REQUEST_FAILED", retryable: true } };
        }
        return { ok: true, value: { value: sectionFor(key), providerId: "section-provider", modelId: "section-model" } };
      },
    });
    const first = await fixture.service.generateReport({ job: sectionedJob(), attemptNumber: 1, workerId: "worker-1" });
    expect(first).toMatchObject({ ok: false, error: { code: "AI_TIMEOUT", retryable: true } });
    expect(fixture.starts).toEqual(["palace:ziwei.palace.life", "palace:ziwei.palace.siblings"]);
    expect(fixture.repository.calls.releases).toEqual(["palace:ziwei.palace.life"]);
    expect(fixture.versionRepository.commitImmutableVersion).not.toHaveBeenCalled();

    const resumed = await fixture.service.generateReport({ job: sectionedJob(), attemptNumber: 2, workerId: "worker-2" });
    expectSectionedSuccess(resumed, fixture);
    expect(fixture.starts.filter((key) => key === "overview" || key === "coreAxis" || key === "keyConfigurations")).toEqual([]);
    expect(fixture.repository.calls.passed).not.toContain("keyConfigurations");
  });

  it("retries pre-cap malformed output and completes within the same invocation", async () => {
    let malformed = true;
    const fixture = createSectionedService({
      initial: [checkpoint("overview"), checkpoint("coreAxis"), checkpoint("keyConfigurations")],
      onSection: (key) => {
        if (key === "palace:ziwei.palace.life" && malformed) {
          malformed = false;
          return { ok: false, error: { code: "AI_OUTPUT_INVALID", retryable: false } };
        }
        return { ok: true, value: { value: sectionFor(key), providerId: "section-provider", modelId: "section-model" } };
      },
    });

    const result = await fixture.service.generateReport({
      job: sectionedJob(),
      attemptNumber: 1,
      workerId: "worker-1",
    });
    expectSectionedSuccess(result, fixture);
    expect(fixture.repository.rows.get("palace:ziwei.palace.life")).toMatchObject({
      status: "passed",
      generationAttemptCount: 2,
    });
    expect(fixture.repository.recordQualityCandidate).not.toHaveBeenCalled();
    expect(fixture.repository.qualityCandidates.size).toBe(0);
    expect(fixture.repository.calls.releases).toEqual(["palace:ziwei.palace.life"]);
    expect(fixture.starts.filter((key) =>
      key === "overview" || key === "coreAxis" || key === "keyConfigurations",
    )).toEqual([]);
    expect(fixture.starts.filter((key) => key === "palace:ziwei.palace.life")).toHaveLength(2);
    expect(fixture.costContexts.filter((context) =>
      context.idempotencyKey.includes(":palace:ziwei.palace.life:generation:"),
    ).map((context) => context.idempotencyKey)).toEqual([
      `${sectionedJob().payload.reportVersionId}:palace:ziwei.palace.life:generation:1:critic:0`,
      `${sectionedJob().payload.reportVersionId}:palace:ziwei.palace.life:generation:2:critic:0`,
    ]);
  });

  it("completes multiple deterministic quality candidate handoffs within one invocation", async () => {
    const shortCandidate = {
      key: "keyConfigurations" as const,
      value: [{
        title: "Cấu hình ngắn",
        narrative: "Nội dung hợp schema nhưng chưa đủ độ sâu.",
        evidenceKeys: ["e-life", "e-star"],
      }],
    };
    const shortPalace = {
      key: "palace:ziwei.palace.life" as const,
      value: {
        palaceId: "ziwei.palace.life" as const,
        title: "Cung Mệnh ngắn",
        narrative: "Nội dung hợp schema nhưng chưa đủ độ sâu.",
        evidenceKeys: ["e-life", "e-star"],
      },
    };
    const rewritePayloads = new Map<string, any>();
    const fixture = createSectionedService({
      initial: [checkpoint("overview"), checkpoint("coreAxis")],
      onSection: (key, request) => {
        const payload = JSON.parse(request.user);
        if (key === "keyConfigurations" && !payload.rewrite) {
          return { ok: true, value: { value: shortCandidate, providerId: "section-provider", modelId: "section-model" } };
        }
        if (key === "palace:ziwei.palace.life" && !payload.rewrite) {
          return { ok: true, value: { value: shortPalace, providerId: "section-provider", modelId: "section-model" } };
        }
        if (payload.rewrite) {
          rewritePayloads.set(key, payload.rewrite);
        }
        return { ok: true, value: { value: sectionFor(key), providerId: "section-provider", modelId: "section-model" } };
      },
    });

    const result = await fixture.service.generateReport({
      job: sectionedJob(), attemptNumber: 1, workerId: "worker-1",
    });
    expectSectionedSuccess(result, fixture);
    expect(fixture.repository.recordQualityCandidate).toHaveBeenCalledTimes(2);
    const recordInputs = fixture.repository.recordQualityCandidate.mock.calls.map(([input]: [any]) => input);
    expect(recordInputs[0]).toMatchObject({
      sectionKey: "keyConfigurations",
      generationOrdinal: 1,
      candidateContent: shortCandidate.value,
    });
    expect(recordInputs[0].findings.length).toBeGreaterThan(0);
    expect(recordInputs[0].findings.every((finding: any) =>
      finding.itemKey === "keyConfigurations[0]" &&
      finding.note.length <= 300,
    )).toBe(true);
    expect(recordInputs[1]).toMatchObject({
      sectionKey: "palace:ziwei.palace.life",
      generationOrdinal: 1,
      candidateContent: shortPalace.value,
    });
    expect(fixture.repository.rows.get("keyConfigurations")).toMatchObject({
      status: "passed",
      generationAttemptCount: 1,
      rewriteAttemptCount: 1,
      acceptedSection: sectionFor("keyConfigurations"),
    });
    expect(fixture.repository.rows.get("palace:ziwei.palace.life")).toMatchObject({
      status: "passed",
      generationAttemptCount: 1,
      rewriteAttemptCount: 1,
      acceptedSection: sectionFor("palace:ziwei.palace.life"),
    });
    expect(rewritePayloads.get("keyConfigurations").priorSection).toEqual(shortCandidate);
    expect(rewritePayloads.get("keyConfigurations").findings).toEqual(expect.arrayContaining([
      expect.stringContaining("keyConfigurations[0] MINIMUM_SYLLABLES"),
    ]));
    expect(rewritePayloads.get("palace:ziwei.palace.life").priorSection).toEqual(shortPalace);
    expect(fixture.costContexts.filter((context) => context.purpose === "rewrite")
      .map((context) => context.idempotencyKey)).toEqual([
      `${sectionedJob().payload.reportVersionId}:keyConfigurations:quality-rewrite:1`,
      `${sectionedJob().payload.reportVersionId}:palace:ziwei.palace.life:quality-rewrite:1`,
    ]);
    expect(fixture.starts.filter((key) => key === "keyConfigurations")).toHaveLength(2);
    expect(fixture.starts.filter((key) => key === "palace:ziwei.palace.life")).toHaveLength(2);
    expect(fixture.starts.filter((key) => key === "overview" || key === "coreAxis")).toEqual([]);
    expect(fixture.starts).toHaveLength(COMPREHENSIVE_REPORT_SECTION_KEYS.length);
  });

  it("releases a retryable quality provider failure and resumes the same ordinal with one cost key", async () => {
    const shortCandidate = {
      key: "keyConfigurations" as const,
      value: [{ title: "Ngắn", narrative: "Chưa đủ độ sâu.", evidenceKeys: ["e-life", "e-star"] }],
    };
    let rewriteFailure = true;
    const fixture = createSectionedService({
      initial: [checkpoint("overview"), checkpoint("coreAxis")],
      onSection: (key, request) => {
        const payload = JSON.parse(request.user);
        if (key === "keyConfigurations" && !payload.rewrite) {
          return { ok: true, value: { value: shortCandidate, providerId: "section-provider", modelId: "section-model" } };
        }
        if (key === "keyConfigurations" && payload.rewrite && rewriteFailure) {
          rewriteFailure = false;
          return { ok: false, error: { code: "AI_PROVIDER_REQUEST_FAILED", retryable: true } };
        }
        return { ok: true, value: { value: sectionFor(key), providerId: "section-provider", modelId: "section-model" } };
      },
    });

    await expect(fixture.service.generateReport({
      job: sectionedJob(), attemptNumber: 1, workerId: "worker-1",
    })).resolves.toMatchObject({ ok: false, error: { code: "AI_TIMEOUT", retryable: true } });
    expect(fixture.repository.qualityCandidates.get("keyConfigurations")).toMatchObject({
      status: "pending",
      rewriteOrdinal: 1,
    });
    const completed = await fixture.service.generateReport({
      job: sectionedJob(), attemptNumber: 2, workerId: "worker-2",
    });
    expectSectionedSuccess(completed, fixture);
    const rewriteKeys = fixture.costContexts
      .filter((context) => context.purpose === "rewrite")
      .map((context) => context.idempotencyKey);
    expect(rewriteKeys).toEqual([
      `${sectionedJob().payload.reportVersionId}:keyConfigurations:quality-rewrite:1`,
      `${sectionedJob().payload.reportVersionId}:keyConfigurations:quality-rewrite:1`,
    ]);
    expect(fixture.repository.rows.get("keyConfigurations")).toMatchObject({
      generationAttemptCount: 1,
      rewriteAttemptCount: 1,
      status: "passed",
    });
  });

  it("terminalizes a deterministic quality rewrite failure without accepting candidate content", async () => {
    const shortCandidate = {
      key: "keyConfigurations" as const,
      value: [{ title: "Ngắn", narrative: "Chưa đủ độ sâu.", evidenceKeys: ["e-life", "e-star"] }],
    };
    const fixture = createSectionedService({
      initial: [checkpoint("overview"), checkpoint("coreAxis")],
      onSection: (key) => key === "keyConfigurations"
        ? { ok: true, value: { value: shortCandidate, providerId: "section-provider", modelId: "section-model" } }
        : { ok: true, value: { value: sectionFor(key), providerId: "section-provider", modelId: "section-model" } },
    });

    const failed = await fixture.service.generateReport({ job: sectionedJob(), attemptNumber: 1, workerId: "worker-1" });
    expect(failed).toMatchObject({ ok: false, error: { code: "AI_OUTPUT_INVALID", retryable: false } });
    expect(fixture.repository.qualityCandidates.get("keyConfigurations")).toMatchObject({
      status: "terminal_failure",
      acceptedSection: null,
      rewriteOrdinal: 1,
    });
    expect(fixture.repository.rows.get("keyConfigurations")).toMatchObject({
      status: "terminal_failure",
      acceptedSection: null,
    });
    expect(fixture.versionRepository.commitImmutableVersion).not.toHaveBeenCalled();
  });

  it("does not call the provider for a same-attempt quality rewrite already in progress", async () => {
    const shortCandidate = {
      key: "keyConfigurations" as const,
      value: [{ title: "Ngắn", narrative: "Chưa đủ độ sâu.", evidenceKeys: ["e-life", "e-star"] }],
    };
    const fixture = createSectionedService({
      initial: [checkpoint("overview"), checkpoint("coreAxis")],
    });
    fixture.repository.rows.set("keyConfigurations", {
      ...checkpoint("keyConfigurations"),
      status: "generating",
      generationAttemptCount: 1,
      rewriteAttemptCount: 1,
      activeJobId: sectionedJob().idempotencyKey,
      activeWorkerId: "worker-2",
      acceptedSection: null,
      contentHash: null,
      providerId: null,
      modelId: null,
    });
    fixture.repository.qualityCandidates.set("keyConfigurations", {
      id: "quality-keyConfigurations",
      checkpointId: "checkpoint-keyConfigurations",
      rewriteOrdinal: 1,
      generationOrdinal: 1,
      stateVersion: 2,
      status: "generating",
      activeJobId: sectionedJob().idempotencyKey,
      activeWorkerId: "worker-2",
      activeAttemptNumber: 2,
      candidateSection: shortCandidate,
      candidateHash: "a".repeat(64),
      candidateProviderId: "section-provider",
      candidateModelId: "section-model",
      findings: [{
        itemKey: "keyConfigurations[0]",
        code: "MINIMUM_SYLLABLES",
        note: "Requires more detail.",
      }],
      acceptedSection: null,
      contentHash: null,
      providerId: null,
      modelId: null,
      failureCode: null,
    });
    const providerCalls = fixture.provider.generateStructured.mock.calls.length;
    const result = await fixture.service.generateReport({
      job: sectionedJob(), attemptNumber: 2, workerId: "worker-2",
    });
    expect(result).toMatchObject({ ok: false, error: { code: "AI_TIMEOUT", retryable: true } });
    expect(fixture.provider.generateStructured).toHaveBeenCalledTimes(providerCalls);
  });

  it("terminal-fails malformed section output at the durable generation cap without commit", async () => {
    const nearCap = checkpoint("overview");
    nearCap.status = "pending";
    nearCap.acceptedSection = null;
    nearCap.contentHash = null;
    nearCap.providerId = null;
    nearCap.modelId = null;
    nearCap.generationAttemptCount = 2;
    const fixture = createSectionedService({
      initial: [nearCap],
      onSection: (key) => key === "overview"
        ? { ok: false, error: { code: "AI_OUTPUT_INVALID", retryable: false } }
        : { ok: true, value: { value: sectionFor(key), providerId: "section-provider", modelId: "section-model" } },
    });

    const result = await fixture.service.generateReport({
      job: sectionedJob(),
      attemptNumber: 3,
      workerId: "worker-3",
    });
    expect(result).toMatchObject({ ok: false, error: { code: "AI_OUTPUT_INVALID", retryable: false } });
    expect(fixture.repository.rows.get("overview")).toMatchObject({
      status: "terminal_failure",
      generationAttemptCount: 3,
      failureCode: "AI_OUTPUT_INVALID",
    });
    expect(fixture.repository.calls.terminals).toEqual(["overview"]);
    expect(fixture.repository.calls.releases).toEqual([]);
    expect(fixture.versionRepository.commitImmutableVersion).not.toHaveBeenCalled();
  });

  it("fails closed when malformed output cannot release its checkpoint", async () => {
    const fixture = createSectionedService({
      onSection: () => ({ ok: false, error: { code: "AI_OUTPUT_INVALID", retryable: false } }),
    });
    fixture.repository.releaseRetryableFailure.mockResolvedValueOnce({
      ok: false,
      error: { code: "REPORT_SECTION_CHECKPOINT_LEASE_LOST" },
    });

    const result = await fixture.service.generateReport({
      job: sectionedJob(),
      attemptNumber: 1,
      workerId: "worker-1",
    });
    expect(result).toMatchObject({
      ok: false,
      error: { code: "REPORT_VERSION_CONFLICT", retryable: false },
    });
    expect(fixture.versionRepository.commitImmutableVersion).not.toHaveBeenCalled();
  });

  it("fails closed for malformed section output, maps named critic findings to append-only revisions, and refreshes lineage", async () => {
    const malformed = createSectionedService({
      onSection: (key) => key === "overview"
        ? { ok: true, value: { value: { key: "coreAxis", value: sectionFor("coreAxis").value }, providerId: "section-provider", modelId: "section-model" } }
        : { ok: true, value: { value: sectionFor(key), providerId: "section-provider", modelId: "section-model" } },
    });
    const rejected = await malformed.service.generateReport({ job: sectionedJob(), attemptNumber: 1, workerId: "worker-1" });
    expect(rejected).toMatchObject({ ok: false, error: { code: "AI_OUTPUT_INVALID", retryable: false } });
    expect(malformed.repository.calls.releases).toEqual(["overview", "overview"]);
    expect(malformed.repository.calls.terminals).toEqual(["overview"]);
    expect(malformed.starts).toEqual(["overview", "overview", "overview"]);
    expect(malformed.repository.recordQualityCandidate).not.toHaveBeenCalled();
    expect(malformed.versionRepository.commitImmutableVersion).not.toHaveBeenCalled();

    const rewrite = createSectionedService({
      initial: COMPREHENSIVE_REPORT_SECTION_KEYS.map((key) => checkpoint(key)),
      onSection: (key, request) => ({ ok: true, value: { value: sectionFor(key), providerId: "section-provider", modelId: "section-model" } }),
      onCritic: (_request, pass) => pass === 1
        ? { ok: true, value: { value: { correctness: 5, evidenceCoverage: 3, specificity: 5, languageClarity: 5, consistency: 5, actionability: 5, safety: 5, repetitionControl: 5, notes: [], findings: [
          { key: "palace:ziwei.palace.life", note: "Bổ sung căn cứ." },
          { key: "palace:ziwei.palace.life", note: "Làm rõ diễn giải." },
        ] }, providerId: "critic-provider", modelId: "critic-model" } }
        : { ok: true, value: { value: { correctness: 5, evidenceCoverage: 5, specificity: 5, languageClarity: 5, consistency: 5, actionability: 5, safety: 5, repetitionControl: 5, notes: [], findings: [] }, providerId: "critic-provider", modelId: "critic-model" } },
    });
    const rewritten = await rewrite.service.generateReport({ job: sectionedJob(), attemptNumber: 1, workerId: "worker-1" });
    expectSectionedSuccess(rewritten, rewrite);
    expect(rewrite.repository.calls.rewrites).toEqual(["palace:ziwei.palace.life"]);
    expect(rewrite.starts).toEqual(["palace:ziwei.palace.life"]);
    expect(rewrite.costContexts.filter((context) => context.purpose === "rewrite")).toMatchObject([
      { idempotencyKey: `${sectionedJob().payload.reportVersionId}:palace:ziwei.palace.life:rewrite:1:critic:1` },
    ]);
    expect(rewrite.costContexts.filter((context) => context.purpose === "critic")).toHaveLength(2);
  });

  it("does not repeat a failed rewrite provider call after the durable cap-one ordinal is consumed", async () => {
    let rewriteCalls = 0;
    const fixture = createSectionedService({
      initial: COMPREHENSIVE_REPORT_SECTION_KEYS.map((key) => checkpoint(key)),
      onSection: (key) => {
        if (key === "palace:ziwei.palace.life") {
          rewriteCalls += 1;
          return { ok: false, error: { code: "AI_PROVIDER_REQUEST_FAILED", retryable: true } };
        }
        return { ok: true, value: { value: sectionFor(key), providerId: "section-provider", modelId: "section-model" } };
      },
      onCritic: () => ({ ok: true, value: { value: {
        correctness: 5, evidenceCoverage: 3, specificity: 5, languageClarity: 5, consistency: 5,
        actionability: 5, safety: 5, repetitionControl: 5, notes: [], findings: [
          { key: "palace:ziwei.palace.life", note: "Bổ sung căn cứ." },
        ],
      }, providerId: "critic-provider", modelId: "critic-model" } }),
    });

    const first = await fixture.service.generateReport({ job: sectionedJob(), attemptNumber: 1, workerId: "worker-1" });
    expect(first).toMatchObject({ ok: false, error: { code: "AI_TIMEOUT", retryable: true } });
    expect(rewriteCalls).toBe(1);
    expect(fixture.repository.revisions.get("palace:ziwei.palace.life")).toMatchObject({
      rewriteOrdinal: 1,
      status: "terminal_failure",
      failureCode: "AI_TIMEOUT",
    });
    expect(fixture.costContexts.filter((context) => context.purpose === "rewrite")).toMatchObject([
      { idempotencyKey: `${sectionedJob().payload.reportVersionId}:palace:ziwei.palace.life:rewrite:1:critic:1` },
    ]);

    const retry = await fixture.service.generateReport({ job: sectionedJob(), attemptNumber: 2, workerId: "worker-2" });
    expect(retry).toMatchObject({ ok: false, error: { code: "AI_OUTPUT_INVALID", retryable: false } });
    expect(rewriteCalls).toBe(1);
    expect(fixture.costContexts.filter((context) => context.purpose === "rewrite")).toHaveLength(1);
  });

  it("blocks post-provider pass and final commit after lease loss or wall-clock expiry", async () => {
    let state: "active" | "lease_lost" | "wall_clock_exhausted" = "active";
    const fixture = createSectionedService({
      guard: { state: () => state },
      onSection: (key) => {
        if (key === "overview") state = "lease_lost";
        return { ok: true, value: { value: sectionFor(key), providerId: "section-provider", modelId: "section-model" } };
      },
    });
    const lost = await fixture.service.generateReport({ job: sectionedJob(), attemptNumber: 1, workerId: "worker-1", executionGuard: fixture.guard });
    expect(lost).toMatchObject({ ok: false, error: { code: "REPORT_VERSION_CONFLICT" } });
    expect(fixture.repository.calls.passed).toEqual([]);
    expect(fixture.versionRepository.commitImmutableVersion).not.toHaveBeenCalled();

    state = "active";
    const allPassed = createSectionedService({
      initial: COMPREHENSIVE_REPORT_SECTION_KEYS.map((key) => checkpoint(key)),
      guard: { state: () => state },
      onCritic: () => {
        state = "wall_clock_exhausted";
        return { ok: true, value: { value: { correctness: 5, evidenceCoverage: 5, specificity: 5, languageClarity: 5, consistency: 5, actionability: 5, safety: 5, repetitionControl: 5, notes: [], findings: [] }, providerId: "critic-provider", modelId: "critic-model" } };
      },
    });
    const expired = await allPassed.service.generateReport({ job: sectionedJob(), attemptNumber: 1, workerId: "worker-1", executionGuard: allPassed.guard });
    expect(expired).toMatchObject({ ok: false, error: { code: "AI_TIMEOUT", retryable: true } });
    expect(allPassed.versionRepository.commitImmutableVersion).not.toHaveBeenCalled();
  });

  it("maps bracketed palace and thematic validator paths to only those append-only rewrites", async () => {
    sectionedFinalValidator.errors = [
      "palaceReadings[ziwei.palace.life]: requires correction",
      "thematicSynthesis[career_wealth]: requires correction",
    ];
    sectionedFinalValidator.remaining = 1;
    try {
      const fixture = createSectionedService({
        initial: COMPREHENSIVE_REPORT_SECTION_KEYS.map((key) => checkpoint(key)),
      });
      const result = await fixture.service.generateReport({ job: sectionedJob(), attemptNumber: 1, workerId: "worker-1" });
      expectSectionedSuccess(result, fixture);
      expect(fixture.repository.calls.rewrites).toEqual([
        "palace:ziwei.palace.life",
        "thematic:career_wealth",
      ]);
      expect(fixture.starts).toEqual([
        "palace:ziwei.palace.life",
        "thematic:career_wealth",
      ]);
      expect(fixture.versionRepository.commitImmutableVersion).toHaveBeenCalledTimes(1);
    } finally {
      sectionedFinalValidator.errors = null;
      sectionedFinalValidator.remaining = 0;
    }
  });

  it("terminal-fails unaddressable validator and empty or safety critic rejections without rewrite or commit", async () => {
    sectionedFinalValidator.errors = ["Unknown or unsupported evidence key: unexpected-key"];
    sectionedFinalValidator.remaining = 1;
    try {
      const unaddressable = createSectionedService({
        initial: COMPREHENSIVE_REPORT_SECTION_KEYS.map((key) => checkpoint(key)),
      });
      const result = await unaddressable.service.generateReport({ job: sectionedJob(), attemptNumber: 1, workerId: "worker-1" });
      expect(result).toMatchObject({ ok: false, error: { code: "AI_OUTPUT_INVALID", retryable: false } });
      expect(unaddressable.repository.calls.rewrites).toEqual([]);
      expect(unaddressable.versionRepository.commitImmutableVersion).not.toHaveBeenCalled();
    } finally {
      sectionedFinalValidator.errors = null;
      sectionedFinalValidator.remaining = 0;
    }

    const emptyFindings = createSectionedService({
      initial: COMPREHENSIVE_REPORT_SECTION_KEYS.map((key) => checkpoint(key)),
      onCritic: () => ({ ok: true, value: { value: {
        correctness: 5, evidenceCoverage: 3, specificity: 5, languageClarity: 5, consistency: 5,
        actionability: 5, safety: 5, repetitionControl: 5, notes: [], findings: [],
      }, providerId: "critic-provider", modelId: "critic-model" } }),
    });
    const emptyResult = await emptyFindings.service.generateReport({ job: sectionedJob(), attemptNumber: 1, workerId: "worker-1" });
    expect(emptyResult).toMatchObject({ ok: false, error: { code: "AI_OUTPUT_INVALID", retryable: false } });
    expect(emptyFindings.repository.calls.rewrites).toEqual([]);
    expect(emptyFindings.versionRepository.commitImmutableVersion).not.toHaveBeenCalled();

    const safety = createSectionedService({
      initial: COMPREHENSIVE_REPORT_SECTION_KEYS.map((key) => checkpoint(key)),
      onCritic: () => ({ ok: true, value: { value: {
        correctness: 3, evidenceCoverage: 5, specificity: 5, languageClarity: 5, consistency: 5,
        actionability: 5, safety: 5, repetitionControl: 5, notes: [], findings: [],
      }, providerId: "critic-provider", modelId: "critic-model" } }),
    });
    const safetyResult = await safety.service.generateReport({ job: sectionedJob(), attemptNumber: 1, workerId: "worker-1" });
    expect(safetyResult).toMatchObject({ ok: false, error: { code: "REPORT_SAFETY_REJECTED", retryable: false } });
    expect(safety.repository.calls.rewrites).toEqual([]);
    expect(safety.versionRepository.commitImmutableVersion).not.toHaveBeenCalled();
  });

  it("deduplicates critic findings, preserves one rewrite ordinal, and terminal-fails a second critic rejection", async () => {
    const fixture = createSectionedService({
      initial: COMPREHENSIVE_REPORT_SECTION_KEYS.map((key) => checkpoint(key)),
      onCritic: (_request, pass) => pass === 1
        ? { ok: true, value: { value: {
          correctness: 5, evidenceCoverage: 3, specificity: 5, languageClarity: 5, consistency: 5,
          actionability: 5, safety: 5, repetitionControl: 5, notes: [], findings: [
            { key: "palace:ziwei.palace.life", note: "Bổ sung căn cứ." },
            { key: "palace:ziwei.palace.life", note: "Không lặp lại lập luận." },
          ],
        }, providerId: "critic-provider", modelId: "critic-model" } }
        : { ok: true, value: { value: {
          correctness: 5, evidenceCoverage: 3, specificity: 5, languageClarity: 5, consistency: 5,
          actionability: 5, safety: 5, repetitionControl: 5, notes: [], findings: [
            { key: "palace:ziwei.palace.life", note: "Vẫn chưa đạt." },
          ],
        }, providerId: "critic-provider", modelId: "critic-model" } },
    });
    const result = await fixture.service.generateReport({ job: sectionedJob(), attemptNumber: 1, workerId: "worker-1" });
    expect(result).toMatchObject({ ok: false, error: { code: "AI_OUTPUT_INVALID", retryable: false } });
    expect(fixture.repository.calls.rewrites).toEqual(["palace:ziwei.palace.life"]);
    expect(fixture.repository.revisions.get("palace:ziwei.palace.life").rewriteOrdinal).toBe(1);
    expect(fixture.costContexts.filter((context) => context.purpose === "critic")).toHaveLength(2);
    expect(fixture.versionRepository.commitImmutableVersion).not.toHaveBeenCalled();
  });

  it("fails closed on mixed final provider/model lineage before critic or immutable commit", async () => {
    const rows = COMPREHENSIVE_REPORT_SECTION_KEYS.map((key) => checkpoint(key));
    rows[0] = checkpoint("overview", sectionFor("overview").value, "other-provider", "section-model");
    const fixture = createSectionedService({ initial: rows });
    const result = await fixture.service.generateReport({ job: sectionedJob(), attemptNumber: 1, workerId: "worker-1" });
    expect(result).toMatchObject({ ok: false, error: { code: "AI_OUTPUT_INVALID", retryable: false } });
    expect(fixture.repository.calls.rewrites).toEqual([]);
    expect(fixture.costContexts).toEqual([]);
    expect(fixture.versionRepository.commitImmutableVersion).not.toHaveBeenCalled();
  });
});
