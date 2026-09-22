import { describe, expect, it, vi } from "vitest";

import type { CurrentActor, EntitlementScope } from "@lasoviet/contracts";
import {
  CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER,
  CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER_EN,
  IDENTITY_REPORT_SECTION_IDS,
} from "@lasoviet/contracts";
import {
  ZIWEI_PALACE_IDS,
  ZIWEI_THEMATIC_SYNTHESIS_IDS,
  TIER_1_ENTITLEMENT_SCOPE,
  TIER_2_ENTITLEMENT_SCOPE,
  TIER_2_V4_ENTITLEMENT_SCOPE,
  TIER_2_V4_1_ENTITLEMENT_SCOPE,
} from "@lasoviet/contracts";
import {
  CANONICAL_PALACE_TITLES_VI,
  CANONICAL_THEMATIC_TITLES_VI,
} from "./identity-report-config.js";

import {
  REPORT_KNOWLEDGE_VERSION_V1,
  REPORT_KNOWLEDGE_VERSION_V2,
  REPORT_KNOWLEDGE_VERSION_V3,
  REPORT_KNOWLEDGE_VERSION_V4,
  REPORT_PROMPT_VERSION_V4_1_1_SENSITIVITY,
  REPORT_PROMPT_VERSION_V4_1_2_SENSITIVITY,
  REPORT_PROMPT_VERSION_V1,
  REPORT_PROMPT_VERSION_V2,
  REPORT_PROMPT_VERSION_V3,
  REPORT_PROMPT_VERSION_V4,
  REPORT_PROMPT_VERSION_V4_1_SENSITIVITY,
  REPORT_CONFIG_VERSION_V4,
  REPORT_CONFIG_VERSION_V4_1_SECTIONED_SENSITIVITY,
  REPORT_CONFIG_VERSION_V4_1_1_SECTIONED_SENSITIVITY,
  REPORT_RENDER_VERSION_V4_1_SENSITIVITY,
  REPORT_TEMPLATE_VERSION_V3,
  REPORT_TEMPLATE_VERSION_V4_1_SENSITIVITY,
} from "./identity-report-config.js";
import {
  createReportQueryService,
  resolveEffectiveComprehensiveTier,
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
  const entitlements = (overrides.entitlements ?? [{
    id: "ent-1",
    chartId: "chart-1",
    sku: "ZIWEI-IDENTITY-P0",
    scope: TIER_2_ENTITLEMENT_SCOPE,
    active: true,
    source: "order",
  }]).map((entitlement) => ({
    ...entitlement,
    active: !(
      "orderStatus" in entitlement &&
      entitlement.orderStatus === "refunded"
    ) as true,
    source: entitlement.source === "ledger_spend" ? "ledger_spend" as const : "order" as const,
  }));

  return { source: "order", reservation, order, version, evidenceItems, entitlements };
}

function createWalletSampleRecord(
  overrides: Parameters<typeof createSampleRecord>[0] = {},
): Extract<AuthorizedReportQueryRecord, { source: "ledger_spend" }> {
  const record = createSampleRecord(overrides);
  return {
    source: "ledger_spend",
    reservation: record.reservation,
    version: record.version,
    evidenceItems: record.evidenceItems,
    entitlements: record.entitlements,
    wallet: {
      spendId: "wallet-spend-1",
      purchaseIntentId: "wallet-intent-1",
    },
  };
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
      reportStatusUpdatedAt: "2026-09-04T17:00:00.000Z",
      supportEmail: "support@lasoviet.net",
      supportSubject: "[Lá Số Việt] Hỗ trợ báo cáo đơn hàng INV-SAMPLE-001",
      supportReference: "INV-SAMPLE-001",
    });
    expect((result.value as any).lastErrorCode).toBeUndefined();
    expect((result.value as any).providerId).toBeUndefined();
    expect((result.value as any).modelId).toBeUndefined();
  });

  it("returns the strict wallet terminal failure projection without order or ledger fields", async () => {
    const record = createWalletSampleRecord({
      reservation: {
        status: "terminal_failure",
        lastErrorCode: "PROVIDER_SECRET_DETAIL",
      } as any,
    });
    const service = createReportQueryService({
      repository: { readAuthorizedReport: vi.fn().mockResolvedValue(record) },
    });

    const result = await service.getReport(
      accountActor,
      "834e9e89-19cb-44a6-bc59-ba7741374553",
    );
    expect(result).toEqual({
      ok: true,
      value: {
        version: 2,
        purchaseSource: "wallet_spend",
        reportId: "834e9e89-19cb-44a6-bc59-ba7741374553",
        reportVersionId: "c678f352-452a-402e-a688-566fabd31f67",
        errorCode: "REPORT_GENERATION_FAILED",
        supportReference: "RPT-834E9E8919CB",
      },
    });
    if (!result.ok) return;
    expect(Object.keys(result.value).sort()).toEqual([
      "errorCode",
      "purchaseSource",
      "reportId",
      "reportVersionId",
      "supportReference",
      "version",
    ]);
  });

  it("returns the existing V1 pending view for a wallet authority", async () => {
    const record = createWalletSampleRecord();
    const service = createReportQueryService({
      repository: { readAuthorizedReport: vi.fn().mockResolvedValue(record) },
    });
    await expect(service.getReport(
      accountActor,
      "834e9e89-19cb-44a6-bc59-ba7741374553",
    )).resolves.toMatchObject({
      ok: true,
      value: { version: 1, state: "pending", fulfillmentStatus: "generating" },
    });
  });

  it.each([
    ["null paidAt", { paidAt: null }],
    ["non-paid order", { status: "failed" }],
  ])("fails closed for terminal generation failure with %s", async (_name, order) => {
    const record = createSampleRecord({
      reservation: {
        status: "terminal_failure",
        lastErrorCode: "AI_OUTPUT_INVALID",
      } as any,
      order: order as any,
    });
    const repository: ReportQueryRepository = {
      readAuthorizedReport: vi.fn().mockResolvedValue(record),
    };
    const service = createReportQueryService({ repository });

    await expect(
      service.getReport(
        accountActor,
        "834e9e89-19cb-44a6-bc59-ba7741374553",
      ),
    ).rejects.toThrow(ReportQueryDataError);
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
        reportConfigVersion: "report-config.v3",
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
        reportConfigVersion: "report-config.v3",
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
        reportConfigVersion: "report-config.v3",
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
  it("returns Tier-1 public projection when effective scope is Tier 1 (Acceptance test 6)", async () => {
    const versionRecord = {
      id: "ver-uuid-v3-tier1",
      reportId: "834e9e89-19cb-44a6-bc59-ba7741374553",
      reportVersionId: "c678f352-452a-402e-a688-566fabd31f67",
      entitlementId: "ent-tier1",
      chartVersionId: "chart-c678f352-452a-402e-a688-566fabd31f67",
      evidenceVersionId: "ev-set-1",
      knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V3,
        reportConfigVersion: "report-config.v3",
      promptVersion: REPORT_PROMPT_VERSION_V3,
      reportConfigVersion: "report-config.v3",
      templateVersion: "ziwei-comprehensive-html.v1",
      locale: "vi",
      sku: "ZIWEI-NATAL-EXCERPT-P0",
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
        entitlementId: "ent-tier1",
        sku: "ZIWEI-NATAL-EXCERPT-P0",
        status: "complete",
        promptVersion: REPORT_PROMPT_VERSION_V3,
        knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V3,
        reportConfigVersion: "report-config.v3",
        locale: "vi",
      } as any,
      order: {
        sku: "ZIWEI-NATAL-EXCERPT-P0",
        status: "paid",
      } as any,
      version: versionRecord,
      entitlements: [
        {
          id: "ent-tier1",
          orderId: "ord-uuid-1",
          chartId: "chart-1",
          sku: "ZIWEI-NATAL-EXCERPT-P0",
          scope: TIER_1_ENTITLEMENT_SCOPE,
          orderStatus: "paid",
        },
      ],
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
    const content = result.value.content as any;

    // Unlocked sections present
    expect(content.overview.title).toBe("Tổng quan bản mệnh");
    expect(content.coreAxis.title).toBe("Mệnh, Thân và động lực cốt lõi");
    expect(content.strengthsAndTensions.title).toBe("Điểm mạnh, điểm vướng và điều kiện phát huy");
    expect(content.practicalDirection).toEqual([
      "Ưu tiên phát triển năng lực chuyên môn sâu trong 3 năm tới.",
    ]);

    // Locked sections metadata present
    expect(content.lockedSections).toEqual([
      "keyConfigurations",
      "palaceReadings",
      "thematicSynthesis",
    ]);

    // Locked sections NOT present on object
    expect(content).not.toHaveProperty("keyConfigurations");
    expect(content).not.toHaveProperty("palaceReadings");
    expect(content).not.toHaveProperty("thematicSynthesis");

    // Serialization verification: no locked prose, titles, or palace IDs leak
    const serialized = JSON.stringify(result.value);
    expect(serialized).not.toContain("Cách cục Tử Phủ Đồng Cung");
    expect(serialized).not.toContain("ziwei.palace.life");
    expect(serialized).not.toContain("keyConfigurations\":");
    expect(serialized).not.toContain("palaceReadings\":");
    expect(serialized).not.toContain("thematicSynthesis\":");
  });

  it("returns Tier-2 public projection with all 12 palace readings and synthesis (Acceptance test 7)", async () => {
    const versionRecord = {
      id: "ver-uuid-v3-tier2",
      reportId: "834e9e89-19cb-44a6-bc59-ba7741374553",
      reportVersionId: "c678f352-452a-402e-a688-566fabd31f67",
      entitlementId: "ent-tier2",
      chartVersionId: "chart-c678f352-452a-402e-a688-566fabd31f67",
      evidenceVersionId: "ev-set-1",
      knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V3,
        reportConfigVersion: "report-config.v3",
      promptVersion: REPORT_PROMPT_VERSION_V3,
      reportConfigVersion: "report-config.v3",
      templateVersion: "ziwei-comprehensive-html.v1",
      locale: "vi",
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
        entitlementId: "ent-tier2",
        sku: "ZIWEI-IDENTITY-P0",
        status: "complete",
        promptVersion: REPORT_PROMPT_VERSION_V3,
        knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V3,
        reportConfigVersion: "report-config.v3",
        locale: "vi",
      } as any,
      order: {
        sku: "ZIWEI-IDENTITY-P0",
        status: "paid",
      } as any,
      version: versionRecord,
      entitlements: [
        {
          id: "ent-tier2",
          orderId: "ord-uuid-1",
          chartId: "chart-1",
          sku: "ZIWEI-IDENTITY-P0",
          scope: TIER_2_ENTITLEMENT_SCOPE,
          orderStatus: "paid",
        },
      ],
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

    const content = result.value.content as any;
    expect(content.palaceReadings).toHaveLength(12);
    expect(content.thematicSynthesis).toHaveLength(4);
    expect(content.keyConfigurations).toHaveLength(1);
    expect(content.practicalDirection).toBeDefined();
    expect(content).not.toHaveProperty("lockedSections");
  });

  it("unions scopes across multiple non-refunded entitlements for one chart (Acceptance test 8)", async () => {
    const versionRecord = {
      id: "ver-uuid-v3-union",
      reportId: "834e9e89-19cb-44a6-bc59-ba7741374553",
      reportVersionId: "c678f352-452a-402e-a688-566fabd31f67",
      entitlementId: "ent-tier1",
      chartVersionId: "chart-c678f352-452a-402e-a688-566fabd31f67",
      evidenceVersionId: "ev-set-1",
      knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V3,
        reportConfigVersion: "report-config.v3",
      promptVersion: REPORT_PROMPT_VERSION_V3,
      reportConfigVersion: "report-config.v3",
      templateVersion: "ziwei-comprehensive-html.v1",
      locale: "vi",
      sku: "ZIWEI-NATAL-EXCERPT-P0",
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

    const record = createWalletSampleRecord({
      reservation: {
        entitlementId: "ent-tier1",
        sku: "ZIWEI-NATAL-EXCERPT-P0",
        status: "complete",
        promptVersion: REPORT_PROMPT_VERSION_V3,
        knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V3,
        reportConfigVersion: "report-config.v3",
        locale: "vi",
      } as any,
      order: {
        sku: "ZIWEI-NATAL-EXCERPT-P0",
        status: "paid",
      } as any,
      version: versionRecord,
      entitlements: [
        {
          id: "ent-tier1",
          orderId: "ord-uuid-1",
          chartId: "chart-1",
          sku: "ZIWEI-NATAL-EXCERPT-P0",
          scope: TIER_1_ENTITLEMENT_SCOPE,
          orderStatus: "paid",
        },
        {
          id: "ent-tier2",
          chartId: "chart-1",
          sku: "ZIWEI-IDENTITY-P0",
          scope: TIER_2_ENTITLEMENT_SCOPE,
          active: true,
          source: "ledger_spend",
        },
      ],
    });

    const repository: ReportQueryRepository = {
      readAuthorizedReport: vi.fn().mockResolvedValue(record),
    };
    const service = createReportQueryService({ repository });

    const result = await service.getReport(accountActor, "834e9e89-19cb-44a6-bc59-ba7741374553");
    expect(result.ok).toBe(true);
    if (!result.ok || result.value.state !== "ready") return;

    const content = result.value.content as any;
    // Union contains all Tier 2 sections
    expect(content.palaceReadings).toHaveLength(12);
    expect(content.thematicSynthesis).toHaveLength(4);
    expect(content.keyConfigurations).toHaveLength(1);
    expect(content).not.toHaveProperty("lockedSections");
  });

  it("ignores refunded entitlements when calculating effective scope (Acceptance test 8)", async () => {
    const versionRecord = {
      id: "ver-uuid-v3-refunded",
      reportId: "834e9e89-19cb-44a6-bc59-ba7741374553",
      reportVersionId: "c678f352-452a-402e-a688-566fabd31f67",
      entitlementId: "ent-tier1",
      chartVersionId: "chart-c678f352-452a-402e-a688-566fabd31f67",
      evidenceVersionId: "ev-set-1",
      knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V3,
        reportConfigVersion: "report-config.v3",
      promptVersion: REPORT_PROMPT_VERSION_V3,
      reportConfigVersion: "report-config.v3",
      templateVersion: "ziwei-comprehensive-html.v1",
      locale: "vi",
      sku: "ZIWEI-NATAL-EXCERPT-P0",
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
        entitlementId: "ent-tier1",
        sku: "ZIWEI-NATAL-EXCERPT-P0",
        status: "complete",
        promptVersion: REPORT_PROMPT_VERSION_V3,
        knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V3,
        reportConfigVersion: "report-config.v3",
        locale: "vi",
      } as any,
      order: {
        sku: "ZIWEI-NATAL-EXCERPT-P0",
        status: "paid",
      } as any,
      version: versionRecord,
      entitlements: [
        {
          id: "ent-tier1",
          orderId: "ord-uuid-1",
          chartId: "chart-1",
          sku: "ZIWEI-NATAL-EXCERPT-P0",
          scope: TIER_1_ENTITLEMENT_SCOPE,
          orderStatus: "paid",
        },
        {
          id: "ent-tier2",
          orderId: "ord-uuid-2",
          chartId: "chart-1",
          sku: "ZIWEI-IDENTITY-P0",
          scope: TIER_2_ENTITLEMENT_SCOPE,
          orderStatus: "refunded",
        },
      ],
    });

    const repository: ReportQueryRepository = {
      readAuthorizedReport: vi.fn().mockResolvedValue(record),
    };
    const service = createReportQueryService({ repository });

    const result = await service.getReport(accountActor, "834e9e89-19cb-44a6-bc59-ba7741374553");
    expect(result.ok).toBe(true);
    if (!result.ok || result.value.state !== "ready") return;

    const content = result.value.content as any;
    // Refunded Tier 2 contributes nothing, so effective scope remains Tier 1
    expect(content.lockedSections).toEqual([
      "keyConfigurations",
      "palaceReadings",
      "thematicSynthesis",
    ]);
    expect(content).not.toHaveProperty("keyConfigurations");
    expect(content).not.toHaveProperty("palaceReadings");
  });

  it("fails closed when all entitlements for the chart are refunded", async () => {
    const versionRecord = {
      id: "ver-uuid-v3-all-refunded",
      reportId: "834e9e89-19cb-44a6-bc59-ba7741374553",
      reportVersionId: "c678f352-452a-402e-a688-566fabd31f67",
      entitlementId: "ent-tier1",
      chartVersionId: "chart-c678f352-452a-402e-a688-566fabd31f67",
      evidenceVersionId: "ev-set-1",
      knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V3,
        reportConfigVersion: "report-config.v3",
      promptVersion: REPORT_PROMPT_VERSION_V3,
      reportConfigVersion: "report-config.v3",
      templateVersion: "ziwei-comprehensive-html.v1",
      locale: "vi",
      sku: "ZIWEI-NATAL-EXCERPT-P0",
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
        entitlementId: "ent-tier1",
        sku: "ZIWEI-NATAL-EXCERPT-P0",
        status: "complete",
        promptVersion: REPORT_PROMPT_VERSION_V3,
        knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V3,
        reportConfigVersion: "report-config.v3",
        locale: "vi",
      } as any,
      order: {
        sku: "ZIWEI-NATAL-EXCERPT-P0",
        status: "refunded",
      } as any,
      version: versionRecord,
      entitlements: [
        {
          id: "ent-tier1",
          orderId: "ord-uuid-1",
          chartId: "chart-1",
          sku: "ZIWEI-NATAL-EXCERPT-P0",
          scope: TIER_1_ENTITLEMENT_SCOPE,
          orderStatus: "refunded",
        },
      ],
    });

    const repository: ReportQueryRepository = {
      readAuthorizedReport: vi.fn().mockResolvedValue(record),
    };
    const service = createReportQueryService({ repository });

    await expect(
      service.getReport(accountActor, "834e9e89-19cb-44a6-bc59-ba7741374553"),
    ).rejects.toThrow(ReportQueryDataError);
  });

  it("fails closed on corrupt/invalid entitlement scope", async () => {
    const versionRecord = {
      id: "ver-uuid-v3-corrupt-scope",
      reportId: "834e9e89-19cb-44a6-bc59-ba7741374553",
      reportVersionId: "c678f352-452a-402e-a688-566fabd31f67",
      entitlementId: "ent-tier1",
      chartVersionId: "chart-c678f352-452a-402e-a688-566fabd31f67",
      evidenceVersionId: "ev-set-1",
      knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V3,
        reportConfigVersion: "report-config.v3",
      promptVersion: REPORT_PROMPT_VERSION_V3,
      reportConfigVersion: "report-config.v3",
      templateVersion: "ziwei-comprehensive-html.v1",
      locale: "vi",
      sku: "ZIWEI-NATAL-EXCERPT-P0",
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
        entitlementId: "ent-tier1",
        sku: "ZIWEI-NATAL-EXCERPT-P0",
        status: "complete",
        promptVersion: REPORT_PROMPT_VERSION_V3,
        knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V3,
        reportConfigVersion: "report-config.v3",
        locale: "vi",
      } as any,
      order: {
        sku: "ZIWEI-NATAL-EXCERPT-P0",
        status: "paid",
      } as any,
      version: versionRecord,
      entitlements: [
        {
          id: "ent-tier1",
          orderId: "ord-uuid-1",
          chartId: "chart-1",
          sku: "ZIWEI-NATAL-EXCERPT-P0",
          scope: { sections: ["unrecognized_section_name"] } as any,
          orderStatus: "paid",
        },
      ],
    });

    const repository: ReportQueryRepository = {
      readAuthorizedReport: vi.fn().mockResolvedValue(record),
    };
    const service = createReportQueryService({ repository });

    await expect(
      service.getReport(accountActor, "834e9e89-19cb-44a6-bc59-ba7741374553"),
    ).rejects.toThrow(ReportQueryDataError);
  });

  it("proves upgrade/unlock reads do not create a second report version or generation request (Acceptance test 9)", async () => {
    const versionRecord = {
      id: "ver-uuid-v3-upgrade",
      reportId: "834e9e89-19cb-44a6-bc59-ba7741374553",
      reportVersionId: "c678f352-452a-402e-a688-566fabd31f67",
      entitlementId: "ent-tier1",
      chartVersionId: "chart-c678f352-452a-402e-a688-566fabd31f67",
      evidenceVersionId: "ev-set-1",
      knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V3,
        reportConfigVersion: "report-config.v3",
      promptVersion: REPORT_PROMPT_VERSION_V3,
      reportConfigVersion: "report-config.v3",
      templateVersion: "ziwei-comprehensive-html.v1",
      locale: "vi",
      sku: "ZIWEI-NATAL-EXCERPT-P0",
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

    const readMock = vi.fn().mockResolvedValue(
      createSampleRecord({
        reservation: {
        entitlementId: "ent-tier1",
          sku: "ZIWEI-NATAL-EXCERPT-P0",
          status: "complete",
          promptVersion: REPORT_PROMPT_VERSION_V3,
          knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V3,
        reportConfigVersion: "report-config.v3",
          locale: "vi",
        } as any,
        version: versionRecord,
        entitlements: [
          {
            id: "ent-tier1",
            orderId: "ord-uuid-1",
            chartId: "chart-1",
            sku: "ZIWEI-NATAL-EXCERPT-P0",
            scope: TIER_1_ENTITLEMENT_SCOPE,
            orderStatus: "paid",
          },
          {
            id: "ent-tier2",
            orderId: "ord-uuid-2",
            chartId: "chart-1",
            sku: "ZIWEI-IDENTITY-P0",
            scope: TIER_2_ENTITLEMENT_SCOPE,
            orderStatus: "paid",
          },
        ],
      }),
    );

    const repository: ReportQueryRepository = {
      readAuthorizedReport: readMock,
    };
    const service = createReportQueryService({ repository });

    const result = await service.getReport(accountActor, "834e9e89-19cb-44a6-bc59-ba7741374553");
    expect(result.ok).toBe(true);

    // Exact read call occurred once; no second generation or version creation
    expect(readMock).toHaveBeenCalledTimes(1);
    expect(readMock).toHaveBeenCalledWith(accountActor.userId, "834e9e89-19cb-44a6-bc59-ba7741374553");
  });

  describe("resolveEffectiveComprehensiveTier legacy V3 and V4 scope separation", () => {
    const tier1Sections = new Set([
      "overview",
      "coreAxis",
      "strengthsAndTensions",
      "practicalDirection",
    ] as const);

    const legacyTier2Sections = new Set([
      "overview",
      "coreAxis",
      "strengthsAndTensions",
      "practicalDirection",
      "keyConfigurations",
      "palaceReadings",
      "thematicSynthesis",
    ] as const);

    const v4Tier2Sections = new Set([
      "overview",
      "coreAxis",
      "strengthsAndTensions",
      "practicalDirection",
      "keyConfigurations",
      "palaceReadings",
      "thematicSynthesis",
      "currentDecadal",
      "annualSnapshot",
    ] as const);

    it("evaluates legacy 7-section entitlement as Tier-2 for V3 reports", () => {
      expect(resolveEffectiveComprehensiveTier(legacyTier2Sections, "v3")).toBe(2);
    });

    it("evaluates legacy 7-section entitlement as Tier-1 for V4 reports (cannot unlock V4 timing sections)", () => {
      expect(resolveEffectiveComprehensiveTier(legacyTier2Sections, "v4")).toBe(1);
    });

    it("evaluates 9-section entitlement as Tier-2 for both V3 and V4 reports", () => {
      expect(resolveEffectiveComprehensiveTier(v4Tier2Sections, "v3")).toBe(2);
      expect(resolveEffectiveComprehensiveTier(v4Tier2Sections, "v4")).toBe(2);
    });

    it("evaluates 4-section entitlement as Tier-1 for both V3 and V4 reports", () => {
      expect(resolveEffectiveComprehensiveTier(tier1Sections, "v3")).toBe(1);
      expect(resolveEffectiveComprehensiveTier(tier1Sections, "v4")).toBe(1);
    });

    it("returns null when natal Tier-1 sections are incomplete", () => {
      const incomplete = new Set(["overview", "coreAxis"] as const);
      expect(resolveEffectiveComprehensiveTier(incomplete as any, "v3")).toBeNull();
      expect(resolveEffectiveComprehensiveTier(incomplete as any, "v4")).toBeNull();
    });

    it("allows a user with 9-section scope to read a V3 report with full Tier-2 projection", async () => {
      const versionRecord = {
        id: "ver-uuid-v3-10sec",
        reportId: "834e9e89-19cb-44a6-bc59-ba7741374553",
        reportVersionId: "c678f352-452a-402e-a688-566fabd31f67",
        entitlementId: "ent-v4-scope",
        chartVersionId: "chart-c678f352-452a-402e-a688-566fabd31f67",
        evidenceVersionId: "ev-set-1",
        knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V3,
        reportConfigVersion: "report-config.v3",
        promptVersion: REPORT_PROMPT_VERSION_V3,
        templateVersion: "ziwei-comprehensive-html.v1",
        locale: "vi",
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

      const readMock = vi.fn().mockResolvedValue(
        createSampleRecord({
          order: {
            id: "ord-uuid-v4",
            invoiceNumber: "LSV-INV-V4",
            status: "paid",
            paidAt: new Date("2026-09-08T10:05:00.000Z"),
          } as any,
          reservation: {
            entitlementId: "ent-v4-scope",
            sku: "ZIWEI-IDENTITY-P0",
            status: "complete",
            promptVersion: REPORT_PROMPT_VERSION_V3,
            knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V3,
            reportConfigVersion: "report-config.v3",
            locale: "vi",
          } as any,
          version: versionRecord,
          entitlements: [
            {
              id: "ent-v4-scope",
              orderId: "ord-uuid-v4",
              chartId: "chart-1",
              sku: "ZIWEI-IDENTITY-P0",
              scope: {
                sections: [
                  "overview",
                  "coreAxis",
                  "strengthsAndTensions",
                  "practicalDirection",
                  "keyConfigurations",
                  "palaceReadings",
                  "thematicSynthesis",
                              "currentDecadal",
                  "annualSnapshot",
                ],
              },
              orderStatus: "paid",
            },
          ],
        }),
      );

      const service = createReportQueryService({ repository: { readAuthorizedReport: readMock } });
      const result = await service.getReport(accountActor, "834e9e89-19cb-44a6-bc59-ba7741374553");

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.state).toBe("ready");
      if (result.value.state !== "ready") return;

      const content = result.value.content as any;
      expect(content.keyConfigurations).toBeDefined();
      expect(content.palaceReadings).toBeDefined();
      expect(content.thematicSynthesis).toBeDefined();
      expect(content.lockedSections).toBeUndefined();
    });
  });

  describe("V4 report reading and scope projection", () => {
    function validV4StructuredContent() {
      return {
        overview: { title: "Tổng quan", narrative: "Bản mệnh vững vàng.", evidenceKeys: ["ziwei.palace.life"] },
        coreAxis: { title: "Mệnh Thân", narrative: "Ý chí kiên định.", evidenceKeys: ["ziwei.palace.life"] },
        keyConfigurations: [{ title: "Cách cục", narrative: "Tử Phủ đồng cung.", evidenceKeys: ["ziwei.palace.life"] }],
        palaceReadings: ZIWEI_PALACE_IDS.map((palaceId) => ({ palaceId, title: "Cung", narrative: "Luận giải.", evidenceKeys: ["ziwei.palace.life"] })),
        thematicSynthesis: ZIWEI_THEMATIC_SYNTHESIS_IDS.map((id) => ({ id, title: "Chuyên đề", narrative: "Tổng hợp.", evidenceKeys: ["ziwei.palace.life"] })),
        strengthsAndTensions: { title: "Điểm mạnh", narrative: "Nội lực bền bỉ.", evidenceKeys: ["ziwei.palace.life"] },
        currentDecadal: { title: "Đại vận", state: "active", index: 2, ageRange: [22, 31], yearRange: [2022, 2031], narrative: "Đại vận hanh thông.", evidenceKeys: ["decadal.state.active"] },
        annualSnapshot: { title: "Lưu niên", targetYear: 2026, asOfDate: "2026-09-12", narrative: "Lưu niên nhiều cơ hội.", evidenceKeys: ["annual.target-year.2026"] },
        practicalDirection: [
          { recommendation: "Khuyến nghị 1", rationale: "Lý do 1", avoid: "Tránh 1", evidenceKeys: ["ziwei.palace.life"] },
          { recommendation: "Khuyến nghị 2", rationale: "Lý do 2", avoid: "Tránh 2", evidenceKeys: ["ziwei.palace.life"] },
          { recommendation: "Khuyến nghị 3", rationale: "Lý do 3", avoid: "Tránh 3", evidenceKeys: ["ziwei.palace.life"] },
        ],
      };
    }

    function validV4_1StructuredContent() {
      return {
        ...validV4StructuredContent(),
        birthTimeSensitivity: {
          title: "Độ nhạy giờ sinh",
          stableFactors: {
            title: "Yếu tố ổn định",
            narrative: "Các nét cốt lõi vẫn nhất quán giữa các khung giờ lân cận.",
            evidenceKeys: ["sensitivity.stable.core-axis"],
          },
          sensitiveFactors: {
            title: "Yếu tố cần xác nhận",
            narrative: "Một số điểm cần đối chiếu thêm khi giờ sinh chưa chắc chắn.",
            evidenceKeys: ["sensitivity.sensitive.palace-shift"],
          },
        },
      };
    }

    function v4_1VersionRecord(options?: {
      sku?: "ZIWEI-IDENTITY-P0" | "ZIWEI-NATAL-EXCERPT-P0";
      promptVersion?: string;
      templateVersion?: string;
      renderVersion?: string;
      reportConfigVersion?: string;
    }) {
      const sku = options?.sku ?? "ZIWEI-IDENTITY-P0";
      return {
        id: "ver-uuid-v4-1",
        reportId: "834e9e89-19cb-44a6-bc59-ba7741374553",
        reportVersionId: "c678f352-452a-402e-a688-566fabd31f67",
        entitlementId: "ent-v4-1",
        chartVersionId: "chart-c678f352-452a-402e-a688-566fabd31f67",
        evidenceVersionId: "ev-set-1",
        knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V4,
        reportConfigVersion: options?.reportConfigVersion ??
          REPORT_CONFIG_VERSION_V4_1_SECTIONED_SENSITIVITY,
        promptVersion: options?.promptVersion ?? REPORT_PROMPT_VERSION_V4_1_SENSITIVITY,
        templateVersion: options?.templateVersion ?? REPORT_TEMPLATE_VERSION_V4_1_SENSITIVITY,
        locale: "vi",
        sku,
        providerId: "open-router",
        modelId: "synthetic-model",
        structuredContent: validV4_1StructuredContent(),
        htmlContent: "<html></html>",
        contentHash: "1".repeat(64),
        pdfAssetId: null,
        renderVersion: options?.renderVersion ?? REPORT_RENDER_VERSION_V4_1_SENSITIVITY,
        supersedesReportVersionId: null,
        createdAt: new Date("2026-09-16T00:00:00+07:00"),
      } as any;
    }

    function v4_1Record(options?: {
      sku?: "ZIWEI-IDENTITY-P0" | "ZIWEI-NATAL-EXCERPT-P0";
      promptVersion?: string;
      scope?: EntitlementScope;
      templateVersion?: string;
      renderVersion?: string;
      reportConfigVersion?: string;
    }) {
      const sku = options?.sku ?? "ZIWEI-IDENTITY-P0";
      return createSampleRecord({
        order: {
          id: "ord-uuid-v4-1",
          invoiceNumber: "LSV-INV-V4-1",
          sku,
          status: "paid",
          paidAt: new Date("2026-09-16T00:05:00.000Z"),
        } as any,
        reservation: {
          entitlementId: "ent-v4-1",
          sku,
          status: "complete",
          promptVersion: options?.promptVersion ?? REPORT_PROMPT_VERSION_V4_1_SENSITIVITY,
          knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V4,
          reportConfigVersion: options?.reportConfigVersion ??
            REPORT_CONFIG_VERSION_V4_1_SECTIONED_SENSITIVITY,
          locale: "vi",
        } as any,
        version: v4_1VersionRecord(options),
        entitlements: [
          {
            id: "ent-v4-1",
            orderId: "ord-uuid-v4-1",
            chartId: "chart-1",
            sku,
            scope: options?.scope ?? TIER_2_V4_1_ENTITLEMENT_SCOPE,
            orderStatus: "paid",
          },
        ],
      });
    }

    it("owner reads V4 comprehensive report with contentVersion ziwei-comprehensive.v2, decadal, annual, actions, and NO sensitivity", async () => {
      const versionRecord = {
        id: "ver-uuid-v4-t2",
        reportId: "834e9e89-19cb-44a6-bc59-ba7741374553",
        reportVersionId: "c678f352-452a-402e-a688-566fabd31f67",
        entitlementId: "ent-v4-full",
        chartVersionId: "chart-c678f352-452a-402e-a688-566fabd31f67",
        evidenceVersionId: "ev-set-1",
        knowledgeVersionId: "ziwei.comprehensive.knowledge.v3",
        reportConfigVersion: "ziwei.comprehensive.report.v4",
        promptVersion: "ziwei.comprehensive.prompt.v4",
        templateVersion: "ziwei-comprehensive-html.v1",
        locale: "vi",
        sku: "ZIWEI-IDENTITY-P0",
        providerId: "open-router",
        modelId: "synthetic-model",
        structuredContent: validV4StructuredContent(),
        htmlContent: "<html></html>",
        contentHash: "f".repeat(64),
        pdfAssetId: null,
        renderVersion: "identity-report-pdf.v1",
        supersedesReportVersionId: null,
        createdAt: new Date("2026-09-12T00:00:00+07:00"),
      } as any;

      const readMock = vi.fn().mockResolvedValue(
        createSampleRecord({
          order: {
            id: "ord-uuid-v4-t2",
            invoiceNumber: "LSV-INV-V4-T2",
            status: "paid",
            paidAt: new Date("2026-09-12T10:05:00.000Z"),
          } as any,
          reservation: {
            entitlementId: "ent-v4-full",
            sku: "ZIWEI-IDENTITY-P0",
            status: "complete",
            promptVersion: "ziwei.comprehensive.prompt.v4",
            knowledgeVersionId: "ziwei.comprehensive.knowledge.v3",
            reportConfigVersion: "ziwei.comprehensive.report.v4",
            locale: "vi",
          } as any,
          version: versionRecord,
          entitlements: [
            {
              id: "ent-v4-full",
              orderId: "ord-uuid-v4-t2",
              chartId: "chart-1",
              sku: "ZIWEI-IDENTITY-P0",
              scope: {
                sections: [
                  "overview",
                  "coreAxis",
                  "strengthsAndTensions",
                  "practicalDirection",
                  "keyConfigurations",
                  "palaceReadings",
                  "thematicSynthesis",
                  "currentDecadal",
                  "annualSnapshot",
                ],
              },
              orderStatus: "paid",
            },
          ],
        }),
      );

      const service = createReportQueryService({ repository: { readAuthorizedReport: readMock } });
      const result = await service.getReport(accountActor, "834e9e89-19cb-44a6-bc59-ba7741374553");

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.state).toBe("ready");
      if (result.value.state !== "ready") return;

      expect(result.value.contentVersion).toBe("ziwei-comprehensive.v2");
      const content = result.value.content as any;
      expect(content.currentDecadal.state).toBe("active");
      expect(content.annualSnapshot.targetYear).toBe(2026);
      expect(content.practicalDirection).toHaveLength(3);
      expect(content.birthTimeSensitivity).toBeUndefined();
    });

    it("Tier-1 entitlement for V4 report remains natal-only and locks timing sections", async () => {
      const versionRecord = {
        id: "ver-uuid-v4-t1",
        reportId: "834e9e89-19cb-44a6-bc59-ba7741374553",
        reportVersionId: "c678f352-452a-402e-a688-566fabd31f67",
        entitlementId: "ent-v4-t1",
        chartVersionId: "chart-c678f352-452a-402e-a688-566fabd31f67",
        evidenceVersionId: "ev-set-1",
        knowledgeVersionId: "ziwei.comprehensive.knowledge.v3",
        reportConfigVersion: "ziwei.comprehensive.report.v4",
        promptVersion: "ziwei.comprehensive.prompt.v4",
        templateVersion: "ziwei-comprehensive-html.v1",
        locale: "vi",
        sku: "ZIWEI-NATAL-EXCERPT-P0",
        providerId: "open-router",
        modelId: "synthetic-model",
        structuredContent: validV4StructuredContent(),
        htmlContent: "<html></html>",
        contentHash: "f".repeat(64),
        pdfAssetId: null,
        renderVersion: "identity-report-pdf.v1",
        supersedesReportVersionId: null,
        createdAt: new Date("2026-09-12T00:00:00+07:00"),
      } as any;

      const readMock = vi.fn().mockResolvedValue(
        createSampleRecord({
          order: {
            id: "ord-uuid-v4-t1",
            invoiceNumber: "LSV-INV-V4-T1",
            status: "paid",
            paidAt: new Date("2026-09-12T10:05:00.000Z"),
          } as any,
          reservation: {
            entitlementId: "ent-v4-t1",
            sku: "ZIWEI-NATAL-EXCERPT-P0",
            status: "complete",
            promptVersion: "ziwei.comprehensive.prompt.v4",
            knowledgeVersionId: "ziwei.comprehensive.knowledge.v3",
            reportConfigVersion: "ziwei.comprehensive.report.v4",
            locale: "vi",
          } as any,
          version: versionRecord,
          entitlements: [
            {
              id: "ent-v4-t1",
              orderId: "ord-uuid-v4-t1",
              chartId: "chart-1",
              sku: "ZIWEI-NATAL-EXCERPT-P0",
              scope: {
                sections: [
                  "overview",
                  "coreAxis",
                  "strengthsAndTensions",
                  "practicalDirection",
                ],
              },
              orderStatus: "paid",
            },
          ],
        }),
      );

      const service = createReportQueryService({ repository: { readAuthorizedReport: readMock } });
      const result = await service.getReport(accountActor, "834e9e89-19cb-44a6-bc59-ba7741374553");

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.state).toBe("ready");
      if (result.value.state !== "ready") return;

      expect(result.value.contentVersion).toBe("ziwei-comprehensive.v2");
      const content = result.value.content as any;
      expect(content.currentDecadal).toBeUndefined();
      expect(content.annualSnapshot).toBeUndefined();
      expect(content.birthTimeSensitivity).toBeUndefined();
      expect(content.lockedSections).toContain("currentDecadal");
      expect(content.lockedSections).toContain("annualSnapshot");
    });

    it("reads V4.1 content only from its exact tuple and removes sensitivity evidence metadata", async () => {
      const repository: ReportQueryRepository = {
        readAuthorizedReport: vi.fn().mockResolvedValue(v4_1Record()),
      };
      const result = await createReportQueryService({ repository }).getReport(
        accountActor,
        "834e9e89-19cb-44a6-bc59-ba7741374553",
      );

      expect(result.ok).toBe(true);
      if (!result.ok || result.value.state !== "ready") return;

      expect(result.value.contentVersion).toBe("ziwei-comprehensive.v3");
      const sensitivity = (result.value.content as any).birthTimeSensitivity;
      expect(sensitivity.stableFactors.narrative).toBeTruthy();
      expect(sensitivity.sensitiveFactors.narrative).toBeTruthy();
      expect(sensitivity).not.toHaveProperty("evidenceKeys");
      expect(sensitivity.stableFactors).not.toHaveProperty("evidenceKeys");
      expect(sensitivity.sensitiveFactors).not.toHaveProperty("evidenceKeys");
      expect(JSON.stringify(sensitivity)).not.toContain("sensitivity.stable");
      expect(JSON.stringify(sensitivity)).not.toContain("sensitivity.sensitive");
    });

    it("reads completed V4.1.1 content without weakening other lineage checks", async () => {
      const repository: ReportQueryRepository = {
        readAuthorizedReport: vi.fn().mockResolvedValue(v4_1Record({
          reportConfigVersion: REPORT_CONFIG_VERSION_V4_1_1_SECTIONED_SENSITIVITY,
        })),
      };
      const result = await createReportQueryService({ repository }).getReport(
        accountActor,
        "834e9e89-19cb-44a6-bc59-ba7741374553",
      );
      expect(result.ok).toBe(true);
      if (!result.ok || result.value.state !== "ready") return;
      expect(result.value.contentVersion).toBe("ziwei-comprehensive.v3");
      expect((result.value.content as any).birthTimeSensitivity).toBeDefined();
    });

    it.each([
      ["V4.1 prompt + V4.1 config", REPORT_PROMPT_VERSION_V4_1_SENSITIVITY, REPORT_CONFIG_VERSION_V4_1_SECTIONED_SENSITIVITY],
      ["V4.1 prompt + V4.1.1 config", REPORT_PROMPT_VERSION_V4_1_SENSITIVITY, REPORT_CONFIG_VERSION_V4_1_1_SECTIONED_SENSITIVITY],
      ["V4.1.1 prompt + V4.1.1 config", REPORT_PROMPT_VERSION_V4_1_1_SENSITIVITY, REPORT_CONFIG_VERSION_V4_1_1_SECTIONED_SENSITIVITY],
      ["V4.1.2 prompt + V4.1.1 config", REPORT_PROMPT_VERSION_V4_1_2_SENSITIVITY, REPORT_CONFIG_VERSION_V4_1_1_SECTIONED_SENSITIVITY],
    ] as const)("accepts the valid %s tuple", async (_label, promptVersion, reportConfigVersion) => {
      const repository: ReportQueryRepository = {
        readAuthorizedReport: vi.fn().mockResolvedValue(
          v4_1Record({ promptVersion, reportConfigVersion }),
        ),
      };
      const result = await createReportQueryService({ repository }).getReport(
        accountActor,
        "834e9e89-19cb-44a6-bc59-ba7741374553",
      );

      expect(result.ok).toBe(true);
      if (!result.ok || result.value.state !== "ready") return;
      expect(result.value.contentVersion).toBe("ziwei-comprehensive.v3");
    });

    it.each([
      ["V4.1.1 prompt + V4.1 config", REPORT_PROMPT_VERSION_V4_1_1_SENSITIVITY, REPORT_CONFIG_VERSION_V4_1_SECTIONED_SENSITIVITY],
      ["V4.1.2 prompt + V4.1 config", REPORT_PROMPT_VERSION_V4_1_2_SENSITIVITY, REPORT_CONFIG_VERSION_V4_1_SECTIONED_SENSITIVITY],
      ["unknown prompt + V4.1 config", "ziwei.comprehensive.prompt.v4.1.unknown", REPORT_CONFIG_VERSION_V4_1_SECTIONED_SENSITIVITY],
      ["unknown prompt + V4.1.1 config", "ziwei.comprehensive.prompt.v4.1.unknown", REPORT_CONFIG_VERSION_V4_1_1_SECTIONED_SENSITIVITY],
      ["V4.1 prompt + unknown config", REPORT_PROMPT_VERSION_V4_1_SENSITIVITY, "ziwei.comprehensive.report.v4.1-unknown"],
      ["V4.1.1 prompt + unknown config", REPORT_PROMPT_VERSION_V4_1_1_SENSITIVITY, "ziwei.comprehensive.report.v4.1-unknown"],
      ["V4.1.2 prompt + unknown config", REPORT_PROMPT_VERSION_V4_1_2_SENSITIVITY, "ziwei.comprehensive.report.v4.1-unknown"],
      ["unknown prompt + unknown config", "ziwei.comprehensive.prompt.v4.1.unknown", "ziwei.comprehensive.report.v4.1-unknown"],
    ] as const)("rejects the invalid %s tuple", async (_label, promptVersion, reportConfigVersion) => {
      const repository: ReportQueryRepository = {
        readAuthorizedReport: vi.fn().mockResolvedValue(
          v4_1Record({ promptVersion, reportConfigVersion }),
        ),
      };

      await expect(
        createReportQueryService({ repository }).getReport(
          accountActor,
          "834e9e89-19cb-44a6-bc59-ba7741374553",
        ),
      ).rejects.toThrow(ReportQueryDataError);
    });

    it("rejects V4.1 content paired with the historical V4 effective scope", async () => {
      const repository: ReportQueryRepository = {
        readAuthorizedReport: vi.fn().mockResolvedValue(v4_1Record({
          scope: TIER_2_V4_ENTITLEMENT_SCOPE,
        })),
      };

      await expect(
        createReportQueryService({ repository }).getReport(
          accountActor,
          "834e9e89-19cb-44a6-bc59-ba7741374553",
        ),
      ).rejects.toThrow(ReportQueryDataError);
    });

    it("rejects V4 content paired with a V4.1 effective scope", async () => {
      const versionRecord = {
        ...v4_1VersionRecord(),
        knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V3,
        reportConfigVersion: REPORT_CONFIG_VERSION_V4,
        promptVersion: REPORT_PROMPT_VERSION_V4,
        templateVersion: REPORT_TEMPLATE_VERSION_V3,
        renderVersion: "identity-report-pdf.v1",
        structuredContent: validV4StructuredContent(),
      };
      const record = createSampleRecord({
        reservation: {
          entitlementId: "ent-v4-1",
          sku: "ZIWEI-IDENTITY-P0",
          status: "complete",
          promptVersion: REPORT_PROMPT_VERSION_V4,
          knowledgeVersionId: REPORT_KNOWLEDGE_VERSION_V3,
          reportConfigVersion: REPORT_CONFIG_VERSION_V4,
          locale: "vi",
        } as any,
        version: versionRecord,
        entitlements: [{
          id: "ent-v4-1",
          orderId: "ord-uuid-v4-1",
          chartId: "chart-1",
          sku: "ZIWEI-IDENTITY-P0",
          scope: TIER_2_V4_1_ENTITLEMENT_SCOPE,
          orderStatus: "paid",
        }],
      });
      const repository: ReportQueryRepository = {
        readAuthorizedReport: vi.fn().mockResolvedValue(record),
      };

      await expect(
        createReportQueryService({ repository }).getReport(
          accountActor,
          "834e9e89-19cb-44a6-bc59-ba7741374553",
        ),
      ).rejects.toThrow(ReportQueryDataError);
    });

    it("rejects a V4.1 tuple with a mismatched template", async () => {
      const repository: ReportQueryRepository = {
        readAuthorizedReport: vi.fn().mockResolvedValue(v4_1Record({
          templateVersion: REPORT_TEMPLATE_VERSION_V3,
        })),
      };

      await expect(
        createReportQueryService({ repository }).getReport(
          accountActor,
          "834e9e89-19cb-44a6-bc59-ba7741374553",
        ),
      ).rejects.toThrow(ReportQueryDataError);
    });

    it("keeps a V4.1 natal excerpt at Tier-1 without timing or sensitivity", async () => {
      const repository: ReportQueryRepository = {
        readAuthorizedReport: vi.fn().mockResolvedValue(v4_1Record({
          sku: "ZIWEI-NATAL-EXCERPT-P0",
          scope: TIER_1_ENTITLEMENT_SCOPE,
        })),
      };
      const result = await createReportQueryService({ repository }).getReport(
        accountActor,
        "834e9e89-19cb-44a6-bc59-ba7741374553",
      );

      expect(result.ok).toBe(true);
      if (!result.ok || result.value.state !== "ready") return;

      expect(result.value.contentVersion).toBe("ziwei-comprehensive.v3");
      const content = result.value.content as any;
      expect(content.currentDecadal).toBeUndefined();
      expect(content.annualSnapshot).toBeUndefined();
      expect(content.birthTimeSensitivity).toBeUndefined();
      expect(content.lockedSections).toContain("birthTimeSensitivity");
    });
  });
});
