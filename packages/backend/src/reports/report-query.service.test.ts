import { describe, expect, it, vi } from "vitest";

import type { CurrentActor } from "@lasoviet/contracts";
import {
  CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER,
  CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER_EN,
  IDENTITY_REPORT_SECTION_IDS,
} from "@lasoviet/contracts";
import {
  ZIWEI_PALACE_IDS,
  ZIWEI_THEMATIC_SYNTHESIS_IDS,
} from "@lasoviet/contracts";
import {
  CANONICAL_PALACE_TITLES_VI,
  CANONICAL_THEMATIC_TITLES_VI,
} from "./identity-report-config.js";

import {
  REPORT_KNOWLEDGE_VERSION_V1,
  REPORT_KNOWLEDGE_VERSION_V2,
  REPORT_KNOWLEDGE_VERSION_V3,
  REPORT_PROMPT_VERSION_V1,
  REPORT_PROMPT_VERSION_V2,
  REPORT_PROMPT_VERSION_V3,
} from "./identity-report-config.js";
import {
  createReportQueryService,
  ReportQueryDataError,
  type ReportQueryRepository,
  type AuthorizedReportQueryRecord,
} from "./report-query.service.js";

const accountActor: CurrentActor = {
  kind: "account",
  userId: "owner-1",
  role: "authenticated",
  permissions: [],
};

const otherAccountActor: CurrentActor = {
  kind: "account",
  userId: "owner-2",
  role: "authenticated",
  permissions: [],
};

const anonymousActor: CurrentActor = {
  kind: "anonymous",
  anonymousActorId: "anon-1",
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
};

function validSections() {
  return IDENTITY_REPORT_SECTION_IDS.map((id, index) => ({
    id,
    title: "Section " + (index + 1),
    narrative: "Narrative description for self reflection.",
    claims: id === "data_and_method" || id === "reflection_questions" || id === "action_summary" || id === "limitations_and_disclaimer"
      ? []
      : [{
          id: "claim-" + (index + 1),
          text: "Claim narrative.",
          evidenceIds: ["ziwei.identity.life-palace"],
          interpretationBoundCode: "reflective_identity_only" as const,
          confidence: "moderate" as const,
          limitations: ["Hours offset"],
          suggestedActions: [{
            category: "reflect" as const,
            text: "Observe your feelings.",
          }],
        }],
  }));
}

function validStructuredContent(overrides = {}) {
  return {
    version: 1 as const,
    sku: "ZIWEI-IDENTITY-P0" as const,
    capabilityId: "ziwei.identity.p0" as const,
    locale: "vi" as const,
    provenance: {
      chartVersionId: "chart-c678f352-452a-402e-a688-566fabd31f67",
      ruleVersion: "ziwei.identity.v1",
      evidenceVersion: 1,
      knowledgeVersion: REPORT_KNOWLEDGE_VERSION_V1,
      providerId: "open-router",
      modelId: "synthetic-model",
      promptVersion: REPORT_PROMPT_VERSION_V1,
      templateVersion: "identity-report-template.v1",
    },
    sections: validSections(),
    reflectionQuestions: [
      "Question 1?",
      "Question 2?",
      "Question 3?",
    ],
    summaryActions: ["Action 1"],
    professionalAdviceDisclaimer: CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER,
    ...overrides,
  };
}

function sampleEvidenceItems() {
  return [
    {
      id: "ev-row-1",
      evidenceSetId: "ev-set-1",
      evidenceKey: "ziwei.identity.life-palace",
      payload: {
        id: "ziwei.identity.life-palace",
        factReferences: ["life palace fact"],
        confidence: "high",
        interpretationBounds: ["Reflective bound"],
        interpretationBoundCodes: ["reflective_identity_only"],
        limitations: ["Hours offset"],
        riskTags: ["identity"],
        allowedActionCategories: ["reflect"],
      },
      createdAt: new Date(),
    },
    {
      id: "ev-row-2",
      evidenceSetId: "ev-set-1",
      evidenceKey: "ziwei.identity.unreferenced",
      payload: {
        id: "ziwei.identity.unreferenced",
        factReferences: ["unreferenced fact"],
        confidence: "moderate",
        interpretationBounds: ["Bound"],
        interpretationBoundCodes: ["reflective_identity_only"],
        limitations: ["Limit"],
        riskTags: ["identity"],
        allowedActionCategories: ["reflect"],
      },
      createdAt: new Date(),
    },
  ];
}


function validV3StructuredContent() {
  return {
    overview: {
      title: "Tổng quan bản mệnh",
      narrative: "Tổng quan cuộc đời với Tử Vi đắc địa, tạo phong thái đĩnh đạc và uy tín tự nhiên.",
      evidenceKeys: ["ziwei.palace.life", "ziwei.star.ziwei"],
    },
    coreAxis: {
      title: "Mệnh, Thân và động lực cốt lõi",
      narrative: "Trục Mệnh Thân thể hiện ý chí quật cường, kiên trì theo đuổi mục tiêu lớn dài hạn.",
      evidenceKeys: ["ziwei.palace.life"],
    },
    keyConfigurations: [
      {
        title: "Cách cục Tử Phủ Đồng Cung",
        narrative: "Tử Vi và Thiên Phủ cùng hội tụ đem lại sự vững vàng về tài chính và sự nghiệp.",
        evidenceKeys: ["ziwei.palace.life", "zi-fu-tong-gong"],
      },
    ],
    palaceReadings: ZIWEI_PALACE_IDS.map((palaceId) => ({
      palaceId,
      title: CANONICAL_PALACE_TITLES_VI[palaceId],
      narrative: `Luận giải chi tiết cho ${CANONICAL_PALACE_TITLES_VI[palaceId]}.`,
      evidenceKeys: [palaceId],
    })),
    thematicSynthesis: ZIWEI_THEMATIC_SYNTHESIS_IDS.map((id) => ({
      id,
      title: CANONICAL_THEMATIC_TITLES_VI[id],
      narrative: `Phân tích chuyên đề ${CANONICAL_THEMATIC_TITLES_VI[id]}.`,
      evidenceKeys: ["ziwei.palace.life"],
    })),
    strengthsAndTensions: {
      title: "Điểm mạnh, điểm vướng và điều kiện phát huy",
      narrative: "Thế mạnh là tính kỷ luật, điểm cần lưu ý là tránh thái độ độc đoán.",
      evidenceKeys: ["ziwei.palace.life"],
    },
    practicalDirection: [
      "Ưu tiên phát triển năng lực chuyên môn sâu trong 3 năm tới.",
    ],
  };
}

function createSampleRecord(overrides: Partial<AuthorizedReportQueryRecord> = {}): AuthorizedReportQueryRecord {
  const reservation = {
    id: "res-uuid-1",
    reportId: "834e9e89-19cb-44a6-bc59-ba7741374553",
    reportVersionId: "c678f352-452a-402e-a688-566fabd31f67",
    entitlementId: "ent-1",
    chartVersionId: "chart-c678f352-452a-402e-a688-566fabd31f67",
    evidenceVersionId: "ev-set-1",
    knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V1,
    promptVersion: REPORT_PROMPT_VERSION_V1,
    reportConfigVersion: "report-config.v1",
    locale: "vi",
    sku: "ZIWEI-IDENTITY-P0",
    status: "generating",
    stateVersion: 1,
    attemptCount: 1,
    activeJobId: "job-1",
    lastErrorCode: null,
    nextAttemptAt: null,
    createdAt: new Date("2026-09-05T00:00:00+07:00"),
    updatedAt: new Date("2026-09-05T00:00:00+07:00"),
    ...(overrides.reservation || {}),
  } as any;

  const order = {
    id: "ord-uuid-1",
    invoiceNumber: "INV-SAMPLE-001",
    chartId: "chart-1",
    chartVersionId: "chart-c678f352-452a-402e-a688-566fabd31f67",
    ownerId: "owner-1",
    sku: "ZIWEI-IDENTITY-P0",
    amount: 100000,
    currency: "VND",
    locale: "vi",
    status: "paid",
    createdAt: new Date("2026-09-05T00:00:00+07:00"),
    paidAt: new Date("2026-09-05T00:01:00+07:00"),
    ...(overrides.order || {}),
  } as any;

  const version = overrides.version === undefined ? null : overrides.version;
  const evidenceItems = overrides.evidenceItems || [];

  return { reservation, order, version, evidenceItems };
}

describe("report query service", () => {
  it("returns REPORT_NOT_FOUND without calling repository for non-UUID reportId", async () => {
    const repository: ReportQueryRepository = {
      readAuthorizedReport: vi.fn(),
    };
    const service = createReportQueryService({ repository });

    const result = await service.getReport(accountActor, "not-a-valid-uuid");
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("REPORT_NOT_FOUND");
    expect(repository.readAuthorizedReport).not.toHaveBeenCalled();
  });

  it("throws ReportQueryDataError when reservation and version metadata disagree", async () => {
    const versionRecord = {
      id: "ver-uuid-1",
      reportId: "834e9e89-19cb-44a6-bc59-ba7741374553",
      reportVersionId: "c678f352-452a-402e-a688-566fabd31f67",
      entitlementId: "ent-2", // mismatched entitlementId
      chartVersionId: "chart-c678f352-452a-402e-a688-566fabd31f67",
      evidenceVersionId: "ev-set-1",
      knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V1,
      promptVersion: REPORT_PROMPT_VERSION_V1,
      reportConfigVersion: "report-config.v1",
      templateVersion: "identity-report-template.v1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      providerId: "open-router",
      modelId: "synthetic-model",
      structuredContent: validStructuredContent(),
      htmlContent: "<html></html>",
      contentHash: "a".repeat(64),
      pdfAssetId: "44444444-4444-4444-8444-444444444444",
      renderVersion: "identity-report-pdf.v1",
      supersedesReportVersionId: null,
      createdAt: new Date("2026-09-05T00:00:00+07:00"),
    } as any;

    const record = createSampleRecord({
      reservation: { entitlementId: "ent-1" } as any,
      version: versionRecord,
      evidenceItems: sampleEvidenceItems() as any,
    });

    const repository: ReportQueryRepository = {
      readAuthorizedReport: vi.fn().mockResolvedValue(record),
    };
    const service = createReportQueryService({ repository });

    await expect(service.getReport(accountActor, "e2a22be2-2be2-4be2-8be2-2be22be22be2")).rejects.toThrow(ReportQueryDataError);
  });

  it("throws ReportQueryDataError when structured content provenance disagrees with stored version", async () => {
    const versionRecord = {
      id: "ver-uuid-1",
      reportId: "834e9e89-19cb-44a6-bc59-ba7741374553",
      reportVersionId: "c678f352-452a-402e-a688-566fabd31f67",
      entitlementId: "ent-1",
      chartVersionId: "chart-c678f352-452a-402e-a688-566fabd31f67",
      evidenceVersionId: "ev-set-1",
      knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V1,
      promptVersion: REPORT_PROMPT_VERSION_V1,
      reportConfigVersion: "report-config.v1",
      templateVersion: "identity-report-template.v1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      providerId: "open-router",
      modelId: "synthetic-model",
      structuredContent: validStructuredContent({
        provenance: {
          chartVersionId: "chart-version-mismatch",
          ruleVersion: "ziwei.identity.v1",
          evidenceVersion: 1,
          knowledgeVersion: REPORT_KNOWLEDGE_VERSION_V1,
          providerId: "open-router",
          modelId: "synthetic-model",
          promptVersion: REPORT_PROMPT_VERSION_V1,
          templateVersion: "identity-report-template.v1",
        },
      }),
      htmlContent: "<html></html>",
      contentHash: "a".repeat(64),
      pdfAssetId: "44444444-4444-4444-8444-444444444444",
      renderVersion: "identity-report-pdf.v1",
      supersedesReportVersionId: null,
      createdAt: new Date("2026-09-05T00:00:00+07:00"),
    } as any;

    const record = createSampleRecord({
      reservation: { chartVersionId: "chart-c678f352-452a-402e-a688-566fabd31f67" } as any,
      version: versionRecord,
      evidenceItems: sampleEvidenceItems() as any,
    });

    const repository: ReportQueryRepository = {
      readAuthorizedReport: vi.fn().mockResolvedValue(record),
    };
    const service = createReportQueryService({ repository });

    await expect(service.getReport(accountActor, "e2a22be2-2be2-4be2-8be2-2be22be22be2")).rejects.toThrow(ReportQueryDataError);
  });

  it("returns REPORT_NOT_FOUND for empty or malformed reportId", async () => {
    const repository: ReportQueryRepository = {
      readAuthorizedReport: vi.fn(),
    };
    const service = createReportQueryService({ repository });

    const resultEmpty = await service.getReport(accountActor, "");
    expect(resultEmpty.ok).toBe(false);
    expect(resultEmpty.error?.code).toBe("REPORT_NOT_FOUND");
    expect(repository.readAuthorizedReport).not.toHaveBeenCalled();

    const resultWhitespace = await service.getReport(accountActor, "   ");
    expect(resultWhitespace.ok).toBe(false);
    expect(resultWhitespace.error?.code).toBe("REPORT_NOT_FOUND");
  });

  it("returns internal REPORT_FORBIDDEN for anonymous actor with no repository read", async () => {
    const repository: ReportQueryRepository = {
      readAuthorizedReport: vi.fn(),
    };
    const service = createReportQueryService({ repository });

    const result = await service.getReport(anonymousActor, "834e9e89-19cb-44a6-bc59-ba7741374553");
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("REPORT_FORBIDDEN");
    expect(repository.readAuthorizedReport).not.toHaveBeenCalled();
  });

  it("passes ownerId derived strictly from actor to repository", async () => {
    const repository: ReportQueryRepository = {
      readAuthorizedReport: vi.fn().mockResolvedValue(null),
    };
    const service = createReportQueryService({ repository });

    const result = await service.getReport(accountActor, "834e9e89-19cb-44a6-bc59-ba7741374553");
    expect(repository.readAuthorizedReport).toHaveBeenCalledWith("owner-1", "834e9e89-19cb-44a6-bc59-ba7741374553");
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("REPORT_NOT_FOUND");
  });

  it("owner reads pending reservation", async () => {
    const record = createSampleRecord();
    const repository: ReportQueryRepository = {
      readAuthorizedReport: vi.fn().mockResolvedValue(record),
    };
    const service = createReportQueryService({ repository });

    const result = await service.getReport(accountActor, "834e9e89-19cb-44a6-bc59-ba7741374553");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({
      version: 1,
      state: "pending",
      reportId: "834e9e89-19cb-44a6-bc59-ba7741374553",
      reportVersionId: "c678f352-452a-402e-a688-566fabd31f67",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      fulfillmentStatus: "generating",
      refreshAfterMs: 5000,
    });
  });

  it("owner reads ready immutable version with exact evidence and safe provenance", async () => {
    const versionRecord = {
      id: "ver-uuid-1",
      reportId: "834e9e89-19cb-44a6-bc59-ba7741374553",
      reportVersionId: "c678f352-452a-402e-a688-566fabd31f67",
      entitlementId: "ent-1",
      chartVersionId: "chart-c678f352-452a-402e-a688-566fabd31f67",
      evidenceVersionId: "ev-set-1",
      knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V1,
      promptVersion: REPORT_PROMPT_VERSION_V1,
      reportConfigVersion: "report-config.v1",
      templateVersion: "identity-report-template.v1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      providerId: "open-router",
      modelId: "synthetic-model",
      structuredContent: validStructuredContent(),
      htmlContent: "<script>alert(1)</script>",
      contentHash: "a".repeat(64),
      pdfAssetId: "44444444-4444-4444-8444-444444444444",
      renderVersion: "identity-report-pdf.v1",
      supersedesReportVersionId: "55555555-5555-4555-8555-555555555555",
      createdAt: new Date("2026-09-05T00:00:00+07:00"),
    } as any;

    const record = createSampleRecord({
      reservation: { status: "complete" } as any,
      version: versionRecord,
      evidenceItems: sampleEvidenceItems() as any,
    });

    const repository: ReportQueryRepository = {
      readAuthorizedReport: vi.fn().mockResolvedValue(record),
    };
    const service = createReportQueryService({ repository });

    const result = await service.getReport(accountActor, "834e9e89-19cb-44a6-bc59-ba7741374553");
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.state).toBe("ready");
    if (result.value.state !== "ready") return;

    expect(result.value.fulfillmentStatus).toBe("complete");
    expect(result.value.lineage.supersedesReportVersionId).toBe("55555555-5555-4555-8555-555555555555");
    expect(result.value.evidence).toHaveLength(1);
    expect(result.value.evidence[0].id).toBe("ziwei.identity.life-palace");
    expect(result.value.provenance).toEqual({
      method: "ziwei",
      ruleVersion: "ziwei.identity.v1",
      evidenceVersion: 1,
      knowledgeVersion: REPORT_KNOWLEDGE_VERSION_V1,
      templateVersion: "identity-report-template.v1",
      createdAt: expect.any(String),
    });

    expect((result.value as any).htmlContent).toBeUndefined();
    expect((result.value as any).providerId).toBeUndefined();
    expect((result.value as any).modelId).toBeUndefined();
  });

  it("owner reads terminal generation failure without internal error detail", async () => {
    const record = createSampleRecord({
      reservation: {
        status: "terminal_failure",
        lastErrorCode: "CRITICAL_SYSTEM_FAILURE_SECRET_INFO",
      } as any,
    });
    const repository: ReportQueryRepository = {
      readAuthorizedReport: vi.fn().mockResolvedValue(record),
    };
    const service = createReportQueryService({ repository });

    const result = await service.getReport(accountActor, "834e9e89-19cb-44a6-bc59-ba7741374553");
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value).toEqual({
      version: 1,
      state: "failed",
      reportId: "834e9e89-19cb-44a6-bc59-ba7741374553",
      reportVersionId: "c678f352-452a-402e-a688-566fabd31f67",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      fulfillmentStatus: "terminal_failure",
      invoiceNumber: "INV-SAMPLE-001",
      paymentReceivedAt: "2026-09-04T17:01:00.000Z",
      paidAt: "2026-09-04T17:01:00.000Z",
      reportStatusUpdatedAt: "2026-09-04T17:00:00.000Z",
      statusUpdatedAt: "2026-09-04T17:00:00.000Z",
      supportEmail: "support@lasoviet.vn",
      supportSubject: "[Lá Số Việt] Hỗ trợ báo cáo đơn hàng INV-SAMPLE-001",
      supportReference: "INV-SAMPLE-001",
    });
    expect((result.value as any).lastErrorCode).toBeUndefined();
    expect((result.value as any).providerId).toBeUndefined();
    expect((result.value as any).modelId).toBeUndefined();
  });

  it("fails closed on locale, SKU, or evidence mismatch by throwing ReportQueryDataError", async () => {
    const versionRecord = {
      id: "ver-uuid-1",
      reportId: "834e9e89-19cb-44a6-bc59-ba7741374553",
      reportVersionId: "c678f352-452a-402e-a688-566fabd31f67",
      entitlementId: "ent-1",
      chartVersionId: "chart-c678f352-452a-402e-a688-566fabd31f67",
      evidenceVersionId: "ev-set-1",
      knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V1,
      promptVersion: REPORT_PROMPT_VERSION_V1,
      reportConfigVersion: "report-config.v1",
      templateVersion: "identity-report-template.v1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      providerId: "open-router",
      modelId: "synthetic-model",
      structuredContent: validStructuredContent({ locale: "en", professionalAdviceDisclaimer: CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER_EN }),
      htmlContent: "<html></html>",
      contentHash: "a".repeat(64),
      pdfAssetId: "44444444-4444-4444-8444-444444444444",
      renderVersion: "identity-report-pdf.v1",
      supersedesReportVersionId: null,
      createdAt: new Date("2026-09-05T00:00:00+07:00"),
    } as any;

    const record = createSampleRecord({
      reservation: { locale: "vi" } as any,
      version: versionRecord,
      evidenceItems: sampleEvidenceItems() as any,
    });

    const repository: ReportQueryRepository = {
      readAuthorizedReport: vi.fn().mockResolvedValue(record),
    };
    const service = createReportQueryService({ repository });

    await expect(service.getReport(accountActor, "834e9e89-19cb-44a6-bc59-ba7741374553")).rejects.toThrow(ReportQueryDataError);
  });
  it("owner reads V3 comprehensive report with contentVersion ziwei-comprehensive.v1 and without internal evidence/provenance", async () => {
    const versionRecord = {
      id: "ver-uuid-v3",
      reportId: "834e9e89-19cb-44a6-bc59-ba7741374553",
      reportVersionId: "c678f352-452a-402e-a688-566fabd31f67",
      entitlementId: "ent-1",
      chartVersionId: "chart-c678f352-452a-402e-a688-566fabd31f67",
      evidenceVersionId: "ev-set-1",
      knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V3,
      promptVersion: REPORT_PROMPT_VERSION_V3,
      reportConfigVersion: "report-config.v3",
      templateVersion: "ziwei-comprehensive-html.v1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      providerId: "open-router",
      modelId: "synthetic-model",
      structuredContent: validV3StructuredContent(),
      htmlContent: "<html>canonical</html>",
      contentHash: "b".repeat(64),
      pdfAssetId: null,
      renderVersion: "identity-report-pdf.v1",
      supersedesReportVersionId: "prev-ver-123",
      createdAt: new Date("2026-09-08T00:00:00+07:00"),
    } as any;

    const record = createSampleRecord({
      reservation: {
        status: "complete",
        promptVersion: REPORT_PROMPT_VERSION_V3,
        knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V3,
        reportConfigVersion: "report-config.v3",
        locale: "vi",
      } as any,
      version: versionRecord,
      evidenceItems: sampleEvidenceItems() as any,
    });

    const repository: ReportQueryRepository = {
      readAuthorizedReport: vi.fn().mockResolvedValue(record),
    };
    const service = createReportQueryService({ repository });

    const result = await service.getReport(accountActor, "834e9e89-19cb-44a6-bc59-ba7741374553");
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.state).toBe("ready");
    if (result.value.state !== "ready") return;

    expect(result.value.contentVersion).toBe("ziwei-comprehensive.v1");
    if (result.value.contentVersion !== "ziwei-comprehensive.v1") return;

    expect(result.value.locale).toBe("vi");
    expect(result.value.fulfillmentStatus).toBe("complete");
    expect(result.value.lineage.supersedesReportVersionId).toBe("prev-ver-123");

    // Comprehensive content has twelve palace readings
    expect(result.value.content.palaceReadings).toHaveLength(12);
    expect(result.value.content.thematicSynthesis).toHaveLength(4);
    expect(result.value.content.keyConfigurations).toHaveLength(1);
    expect(result.value.content.practicalDirection).toHaveLength(1);

    // No internal evidenceKeys exposed in public projection
    expect((result.value.content.overview as any).evidenceKeys).toBeUndefined();
    expect((result.value.content.coreAxis as any).evidenceKeys).toBeUndefined();
    expect((result.value.content.keyConfigurations[0] as any).evidenceKeys).toBeUndefined();
    expect((result.value.content.palaceReadings[0] as any).evidenceKeys).toBeUndefined();
    expect((result.value.content.thematicSynthesis[0] as any).evidenceKeys).toBeUndefined();
    expect((result.value.content.strengthsAndTensions as any).evidenceKeys).toBeUndefined();

    // No evidence records or technical provenance in comprehensive ready view
    expect((result.value as any).evidence).toBeUndefined();
    expect((result.value as any).provenance).toBeUndefined();
    expect((result.value as any).providerId).toBeUndefined();
    expect((result.value as any).modelId).toBeUndefined();
    expect((result.value as any).htmlContent).toBeUndefined();
  });

  it("owner reads legacy V2 fixture with contentVersion identity.v1 and existing public content", async () => {
    const versionRecord = {
      id: "ver-uuid-v2",
      reportId: "834e9e89-19cb-44a6-bc59-ba7741374553",
      reportVersionId: "c678f352-452a-402e-a688-566fabd31f67",
      entitlementId: "ent-1",
      chartVersionId: "chart-c678f352-452a-402e-a688-566fabd31f67",
      evidenceVersionId: "ev-set-1",
      knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V2,
      promptVersion: REPORT_PROMPT_VERSION_V2,
      reportConfigVersion: "report-config.v1",
      templateVersion: "identity-report-template.v1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      providerId: "open-router",
      modelId: "synthetic-model",
      structuredContent: validStructuredContent({
        provenance: {
          chartVersionId: "chart-c678f352-452a-402e-a688-566fabd31f67",
          ruleVersion: "ziwei.identity.v1",
          evidenceVersion: 1,
          knowledgeVersion: REPORT_KNOWLEDGE_VERSION_V2,
          providerId: "open-router",
          modelId: "synthetic-model",
          promptVersion: REPORT_PROMPT_VERSION_V2,
          templateVersion: "identity-report-template.v1",
        },
      }),
      htmlContent: "<html>legacy v2</html>",
      contentHash: "c".repeat(64),
      pdfAssetId: null,
      renderVersion: "identity-report-pdf.v1",
      supersedesReportVersionId: null,
      createdAt: new Date("2026-09-05T00:00:00+07:00"),
    } as any;

    const record = createSampleRecord({
      reservation: {
        status: "complete",
        promptVersion: REPORT_PROMPT_VERSION_V2,
        knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V2,
      } as any,
      version: versionRecord,
      evidenceItems: sampleEvidenceItems() as any,
    });

    const repository: ReportQueryRepository = {
      readAuthorizedReport: vi.fn().mockResolvedValue(record),
    };
    const service = createReportQueryService({ repository });

    const result = await service.getReport(accountActor, "834e9e89-19cb-44a6-bc59-ba7741374553");
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.state).toBe("ready");
    if (result.value.state !== "ready") return;

    expect(result.value.contentVersion).toBe("identity.v1");
    if (result.value.contentVersion !== "identity.v1") return;

    expect(result.value.content.sections).toBeDefined();
    expect(result.value.evidence).toHaveLength(1);
    expect(result.value.provenance).toBeDefined();
  });

  it("fails closed with ReportQueryDataError on mixed or invalid version families", async () => {
    const invalidTuples = [
      { promptVersion: REPORT_PROMPT_VERSION_V1, knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V2 },
      { promptVersion: REPORT_PROMPT_VERSION_V3, knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V1 },
      { promptVersion: "unsupported-prompt", knowledgeVersionId: "unsupported-knowledge" },
    ];

    for (const tuple of invalidTuples) {
      const versionRecord = {
        id: "ver-uuid-invalid",
        reportId: "834e9e89-19cb-44a6-bc59-ba7741374553",
        reportVersionId: "c678f352-452a-402e-a688-566fabd31f67",
        entitlementId: "ent-1",
        chartVersionId: "chart-c678f352-452a-402e-a688-566fabd31f67",
        evidenceVersionId: "ev-set-1",
        knowledgeVersionId: tuple.knowledgeVersionId,
        promptVersion: tuple.promptVersion,
        reportConfigVersion: "report-config.v1",
        templateVersion: "template.v1",
        locale: "vi",
        sku: "ZIWEI-IDENTITY-P0",
        providerId: "open-router",
        modelId: "synthetic-model",
        structuredContent: validStructuredContent(),
        htmlContent: "<html></html>",
        contentHash: "d".repeat(64),
        pdfAssetId: null,
        renderVersion: "identity-report-pdf.v1",
        supersedesReportVersionId: null,
        createdAt: new Date("2026-09-05T00:00:00+07:00"),
      } as any;

      const record = createSampleRecord({
        reservation: {
          status: "complete",
          promptVersion: tuple.promptVersion,
          knowledgeVersionId: tuple.knowledgeVersionId,
        } as any,
        version: versionRecord,
        evidenceItems: sampleEvidenceItems() as any,
      });

      const repository: ReportQueryRepository = {
        readAuthorizedReport: vi.fn().mockResolvedValue(record),
      };
      const service = createReportQueryService({ repository });

      await expect(service.getReport(accountActor, "834e9e89-19cb-44a6-bc59-ba7741374553")).rejects.toThrow(
        ReportQueryDataError,
      );
    }
  });

  it("fails closed when V3 report is requested with non-Vietnamese locale", async () => {
    const versionRecord = {
      id: "ver-uuid-v3-en",
      reportId: "834e9e89-19cb-44a6-bc59-ba7741374553",
      reportVersionId: "c678f352-452a-402e-a688-566fabd31f67",
      entitlementId: "ent-1",
      chartVersionId: "chart-c678f352-452a-402e-a688-566fabd31f67",
      evidenceVersionId: "ev-set-1",
      knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V3,
      promptVersion: REPORT_PROMPT_VERSION_V3,
      reportConfigVersion: "report-config.v3",
      templateVersion: "ziwei-comprehensive-html.v1",
      locale: "en",
      sku: "ZIWEI-IDENTITY-P0",
      providerId: "open-router",
      modelId: "synthetic-model",
      structuredContent: validV3StructuredContent(),
      htmlContent: "<html></html>",
      contentHash: "e".repeat(64),
      pdfAssetId: null,
      renderVersion: "identity-report-pdf.v1",
      supersedesReportVersionId: null,
      createdAt: new Date("2026-09-08T00:00:00+07:00"),
    } as any;

    const record = createSampleRecord({
      reservation: {
        status: "complete",
        promptVersion: REPORT_PROMPT_VERSION_V3,
        knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V3,
        locale: "en",
      } as any,
      version: versionRecord,
      evidenceItems: sampleEvidenceItems() as any,
    });

    const repository: ReportQueryRepository = {
      readAuthorizedReport: vi.fn().mockResolvedValue(record),
    };
    const service = createReportQueryService({ repository });

    await expect(service.getReport(accountActor, "834e9e89-19cb-44a6-bc59-ba7741374553")).rejects.toThrow(
      ReportQueryDataError,
    );
  });
});
