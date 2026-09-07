import { describe, expect, it, vi } from "vitest";

import {
  CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER,
  IDENTITY_REPORT_SECTION_IDS,
  type EvidenceSetV1,
  type IdentityReportV1,
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
  REPORT_PROMPT_VERSION_V1,
  REPORT_PROMPT_VERSION_V2,
} from "./identity-report-config.js";

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
  it("fails unknown prompt versions with stable non-retryable AI_OUTPUT_INVALID before any provider call", async () => {
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
      job: createJob({ promptVersion: "unknown.prompt.v999" }),
      attemptNumber: 1,
      workerId: "worker-1",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("AI_OUTPUT_INVALID");
      expect(result.error.retryable).toBe(false);
    }
    expect(writerSpy).not.toHaveBeenCalled();
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
});
