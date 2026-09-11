import {
  ZIWEI_PALACE_IDS,
  ZIWEI_THEMATIC_SYNTHESIS_IDS,
  type ZiweiComprehensiveReportContentV1,
} from "./ziwei-comprehensive-report-v1.js";
import {
  TIER_1_ENTITLEMENT_SCOPE,
  TIER_2_ENTITLEMENT_SCOPE,
} from "./commerce.js";
import {
  ComprehensiveReportTier1PublicContentV1Schema,
  ComprehensiveReportTier2PublicContentV1Schema,
  ComprehensiveReportPublicContentV1Schema,
  ReportComprehensiveReadyViewV1Schema,
  ReportReadyViewV1Schema,
  projectComprehensiveReportPublicContent,
} from "./identity-report-v1.js";
import { describe, expect, it } from "vitest";

import {
  CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER,
  CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER_EN,
  IdentityReportContentV1Schema,
  IdentityReportV1Schema,
  IDENTITY_REPORT_SECTION_IDS,
} from "./identity-report-v1.js";
import { ReportPdfRequestedV1Schema } from "./jobs.js";

const sectionIds = [
  "personal_summary",
  "data_and_method",
  "primary_evidence",
  "strengths_and_resources",
  "tensions_and_blind_spots",
  "identity_analysis",
  "cycles_and_timing",
  "within_control",
  "reflection_questions",
  "action_summary",
  "limitations_and_disclaimer",
] as const;

function report() {
  return {
    version: 1,
    sku: "ZIWEI-IDENTITY-P0",
    capabilityId: "ziwei.identity.p0",
    locale: "vi",
    provenance: {
      chartVersionId: "chart-version-1",
      ruleVersion: "ziwei.identity.v1",
      evidenceVersion: 1,
      knowledgeVersion: "knowledge.vi.v1",
      providerId: "9router-an",
      modelId: "synthetic-model",
      promptVersion: "identity-report-prompt.v1",
      templateVersion: "identity-report-template.v1",
    },
    sections: sectionIds.map((id, index) => ({
      id,
      title: `Mục ${index + 1}`,
      narrative: "Bạn cần quan sát và điều chỉnh theo cách phù hợp.",
      claims: id === "data_and_method" || id === "reflection_questions" || id === "action_summary" || id === "limitations_and_disclaimer"
        ? []
        : [{
          id: `claim-${index + 1}`,
          text: "Bạn có thể xem đây là một gợi ý để tự phản chiếu.",
          evidenceIds: ["ziwei.identity.life-palace"],
          interpretationBoundCode: "reflective_identity_only",
          confidence: "moderate",
          limitations: ["Phụ thuộc vào giờ sinh và phạm vi bằng chứng."],
          suggestedActions: [{
            category: "reflect",
            text: "Ghi lại quan sát của bạn trong một vài tuần.",
          }],
        }],
    })),
    reflectionQuestions: [
      "Điều gì đang giúp bạn duy trì sự cân bằng?",
      "Môi trường nào giúp bạn phát huy thế mạnh?",
      "Bạn muốn điều chỉnh điều gì trong tháng tới?",
    ],
    summaryActions: ["Chọn một bước nhỏ và theo dõi kết quả."],
    professionalAdviceDisclaimer: CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER,
  };
}

function createValidV3ReportContent(): ZiweiComprehensiveReportContentV1 {
  return {
    overview: {
      title: "Tổng quan lá số",
      narrative: "Bản mệnh vững vàng, cách cục phối hợp hài hòa giữa các chính tinh miếu vượng.",
      evidenceKeys: ["ziwei.palace.life", "ziwei.star.ziwei"],
    },
    coreAxis: {
      title: "Mệnh, Thân và động lực cốt lõi",
      narrative: "Mệnh Thân đồng cung tại Dần tạo nên tính cách kiên định, giàu nội lực và tinh thần tự chủ.",
      evidenceKeys: ["ziwei.palace.life", "ziwei.star.ziwei", "ziwei.star.tianfu"],
    },
    keyConfigurations: [
      {
        title: "Cách cục Tử Phủ Đồng Cung",
        narrative: "Tử Vi và Thiên Phủ cùng hội tụ đem lại vị thế lãnh đạo và khả năng tích lũy tài nguyên vững chắc.",
        evidenceKeys: ["ziwei.palace.life", "ziwei.star.ziwei", "ziwei.star.tianfu", "zi-fu-tong-gong"],
      },
    ],
    palaceReadings: ZIWEI_PALACE_IDS.map((palaceId) => ({
      palaceId,
      title: `Luận giải ${palaceId}`,
      narrative: `Nội dung giải đoán chi tiết cho ${palaceId} dựa trên chính tinh và phụ tinh tọa thủ.`,
      evidenceKeys: [palaceId, "ziwei.star.ziwei"],
    })),
    thematicSynthesis: ZIWEI_THEMATIC_SYNTHESIS_IDS.map((id) => ({
      id,
      title: `Tổng hợp ${id}`,
      narrative: `Phân tích chuyên sâu về lĩnh vực ${id} qua các cung tam phương tứ chính.`,
      evidenceKeys: ["ziwei.palace.career", "ziwei.palace.wealth"],
    })),
    strengthsAndTensions: {
      title: "Điểm mạnh, điểm vướng và điều kiện phát huy",
      narrative: "Điểm mạnh là tầm nhìn chiến lược; cần lưu ý tính bảo thủ khi gặp biến động bất ngờ.",
      evidenceKeys: ["ziwei.palace.life", "ziwei.transformation.power"],
    },
    practicalDirection: [
      "Ưu tiên phát triển năng lực quản lý dài hạn thay vì các cơ hội ngắn hạn.",
      "Duy trì sự minh bạch trong hợp tác tài chính để hóa giải mâu thuẫn.",
    ],
  };
}

describe("identity report v1 contract", () => {
  it("requires the exact ordered report sections and provenance", () => {
    expect(IDENTITY_REPORT_SECTION_IDS).toEqual(sectionIds);
    expect(IdentityReportV1Schema.safeParse(report()).success).toBe(true);
    expect(IdentityReportV1Schema.safeParse({
      ...report(),
      sections: [...report().sections].reverse(),
    }).success).toBe(false);
  });

  it("bounds reflection questions and summary actions", () => {
    expect(IdentityReportV1Schema.safeParse({
      ...report(),
      reflectionQuestions: report().reflectionQuestions.slice(0, 2),
    }).success).toBe(false);
    expect(IdentityReportV1Schema.safeParse({
      ...report(),
      summaryActions: Array.from({ length: 6 }, (_, index) => `Action ${index}`),
    }).success).toBe(false);
  });

  it("requires an explicit professional-advice disclaimer", () => {
    expect(IdentityReportV1Schema.safeParse({
      ...report(),
      professionalAdviceDisclaimer: "Nội dung chỉ mang tính tham khảo.",
    }).success).toBe(false);
    expect(IdentityReportV1Schema.safeParse({
      ...report(),
      professionalAdviceDisclaimer: "Chuyên gia viết nội dung này.",
    }).success).toBe(false);
  });

  it("keeps immutable provenance out of model-authored report content", () => {
    const { provenance: _provenance, version: _version, sku: _sku, capabilityId: _capabilityId, locale: _locale, professionalAdviceDisclaimer: _disclaimer, ...content } = report();
    expect(IdentityReportContentV1Schema.safeParse(content).success).toBe(true);
    expect(IdentityReportContentV1Schema.safeParse({
      ...content,
      provenance: report().provenance,
    }).success).toBe(false);
    expect(IdentityReportContentV1Schema.safeParse({
      ...content,
      professionalAdviceDisclaimer: CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER,
    }).success).toBe(false);
  });

  it("requires the exact server-owned professional-advice disclaimer", () => {
    expect(IdentityReportV1Schema.safeParse({
      ...report(),
      professionalAdviceDisclaimer: `${CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER} Nội dung này có thể thay thế tư vấn tài chính.`,
    }).success).toBe(false);
  });

  it("supports discriminated en locale with the exact english disclaimer", () => {
    const enReport = {
      ...report(),
      locale: "en",
      professionalAdviceDisclaimer: CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER_EN,
    };
    expect(IdentityReportV1Schema.safeParse(enReport).success).toBe(true);
    expect(IdentityReportV1Schema.safeParse({
      ...enReport,
      professionalAdviceDisclaimer: CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER,
    }).success).toBe(false);
    expect(IdentityReportV1Schema.safeParse({
      ...report(),
      professionalAdviceDisclaimer: CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER_EN,
    }).success).toBe(false);
  });
});

describe("report pdf requested v1 contract", () => {
  it("validates trimmed non-empty fields", () => {
    const valid = {
      reportId: "report-1",
      reportVersionId: "version-1",
      assetId: "asset-1",
      renderVersion: "identity-report-pdf.v1",
    };
    expect(ReportPdfRequestedV1Schema.safeParse(valid).success).toBe(true);
    expect(ReportPdfRequestedV1Schema.safeParse({ ...valid, reportId: "   " }).success).toBe(false);
    expect(ReportPdfRequestedV1Schema.safeParse({ ...valid, reportVersionId: "" }).success).toBe(false);
    expect(ReportPdfRequestedV1Schema.safeParse({ ...valid, assetId: "" }).success).toBe(false);
    expect(ReportPdfRequestedV1Schema.safeParse({ ...valid, renderVersion: "   " }).success).toBe(false);
    expect(ReportPdfRequestedV1Schema.safeParse({ ...valid, extra: "unknown" }).success).toBe(false);
  });
});

import {
  REPORT_VIEW_REFRESH_MS,
  REPORT_PENDING_STATUSES,
  REPORT_READY_STATUSES,
  ReportViewV1Schema,
} from "./identity-report-v1.js";

describe("report view v1 contract", () => {
  it("rejects malformed evidence items in ready view", () => {
    const readyWithMalformedEvidence = {
      version: 1,
      state: "ready",
      contentVersion: "identity.v1",
      reportId: "report-1",
      reportVersionId: "version-1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      fulfillmentStatus: "complete",
      content: readyReportContent,
      evidence: [
        {
          id: "ziwei.identity.life-palace",
          // missing required factReferences, confidence, etc.
          title: "Mệnh Cung",
        },
      ],
      lineage: { supersedesReportVersionId: null },
      provenance: safeProvenance,
    };
    expect(ReportViewV1Schema.safeParse(readyWithMalformedEvidence).success).toBe(false);
  });

  const readyReportContent = {
    sections: report().sections,
    reflectionQuestions: report().reflectionQuestions,
    summaryActions: report().summaryActions,
    professionalAdviceDisclaimer: CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER,
  };

  const safeProvenance = {
    method: "ziwei",
    ruleVersion: "ziwei.identity.v1",
    evidenceVersion: 1,
    knowledgeVersion: "knowledge.vi.v1",
    templateVersion: "identity-report-template.v1",
    createdAt: "2026-09-05T00:00:00+07:00",
  };

  const sampleEvidence = [
    {
      id: "ziwei.identity.life-palace",
      factReferences: ["life palace fact"],
      confidence: "high" as const,
      interpretationBounds: ["Reflective bound"],
      interpretationBoundCodes: ["reflective_identity_only" as const],
      limitations: ["Hours offset"],
      riskTags: ["identity" as const],
      allowedActionCategories: ["reflect" as const],
    },
  ];

  it("exports expected constants", () => {
    expect(REPORT_VIEW_REFRESH_MS).toBe(5000);
    expect(REPORT_PENDING_STATUSES).toEqual([
      "requested",
      "generating",
      "validating",
      "retryable_failure",
    ]);
    expect(REPORT_READY_STATUSES).toEqual([
      "html_ready",
      "pdf_pending",
      "complete",
    ]);
  });

  it("parses all three states (pending, ready, failed)", () => {
    const pending = {
      version: 1,
      state: "pending",
      reportId: "report-1",
      reportVersionId: "version-1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      fulfillmentStatus: "generating",
      refreshAfterMs: 5000,
    };
    expect(ReportViewV1Schema.safeParse(pending).success).toBe(true);

    const ready = {
      version: 1,
      state: "ready",
      contentVersion: "identity.v1",
      reportId: "report-1",
      reportVersionId: "version-1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      fulfillmentStatus: "complete",
      content: readyReportContent,
      evidence: sampleEvidence,
      lineage: {
        supersedesReportVersionId: "version-0",
      },
      provenance: safeProvenance,
    };
    expect(ReportViewV1Schema.safeParse(ready).success).toBe(true);

    const failed = {
      version: 1,
      state: "failed",
      reportId: "report-1",
      reportVersionId: "version-1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      fulfillmentStatus: "terminal_failure",
      invoiceNumber: "LSV-INV-001",
      paymentReceivedAt: "2026-09-08T00:00:00.000Z",
      reportStatusUpdatedAt: "2026-09-08T00:05:00.000Z",
      supportEmail: "support@lasoviet.net",
      supportSubject: "[Lá Số Việt] Hỗ trợ báo cáo đơn hàng LSV-INV-001",
      supportReference: "LSV-INV-001",
    };
    expect(ReportViewV1Schema.safeParse(failed).success).toBe(true);
  });

  it("validates terminal failure view with bounded support and order lineage fields", () => {
    const failedWithSupport = {
      version: 1,
      state: "failed",
      reportId: "report-1",
      reportVersionId: "version-1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      fulfillmentStatus: "terminal_failure",
      invoiceNumber: "LSV-INV-001",
      paymentReceivedAt: "2026-09-08T00:00:00.000Z",
      reportStatusUpdatedAt: "2026-09-08T00:05:00.000Z",
      supportEmail: "support@lasoviet.net",
      supportSubject: "[Lá Số Việt] Hỗ trợ báo cáo đơn hàng LSV-INV-001",
      supportReference: "LSV-INV-001",
    };
    expect(ReportViewV1Schema.safeParse(failedWithSupport).success).toBe(true);

    expect(
      ReportViewV1Schema.safeParse({
        ...failedWithSupport,
        supportEmail: "other@example.com",
      }).success,
    ).toBe(false);

    for (const field of [
      "invoiceNumber",
      "paymentReceivedAt",
      "reportStatusUpdatedAt",
      "supportEmail",
      "supportSubject",
      "supportReference",
    ] as const) {
      const missingField: Record<string, unknown> = { ...failedWithSupport };
      delete missingField[field];
      expect(ReportViewV1Schema.safeParse(missingField).success).toBe(false);
    }

    expect(
      ReportViewV1Schema.safeParse({
        ...failedWithSupport,
        paymentReceivedAt: "invalid-date",
      }).success,
    ).toBe(false);

    expect(
      ReportViewV1Schema.safeParse({
        ...failedWithSupport,
        lastErrorCode: "AI_TIMEOUT",
      }).success,
    ).toBe(false);
  });

  it("rejects extra fields on all states", () => {
    const pending = {
      version: 1,
      state: "pending",
      reportId: "report-1",
      reportVersionId: "version-1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      fulfillmentStatus: "generating",
      refreshAfterMs: 5000,
      extraField: "bad",
    };
    expect(ReportViewV1Schema.safeParse(pending).success).toBe(false);
  });

  it("rejects leaked provider/model/prompt/config/HTML fields in ready view", () => {
    const ready = {
      version: 1,
      state: "ready",
      contentVersion: "identity.v1",
      reportId: "report-1",
      reportVersionId: "version-1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      fulfillmentStatus: "complete",
      content: readyReportContent,
      evidence: sampleEvidence,
      lineage: { supersedesReportVersionId: null },
      provenance: safeProvenance,
      htmlContent: "<script>alert(1)</script>",
      providerId: "open-router",
    };
    expect(ReportViewV1Schema.safeParse(ready).success).toBe(false);
  });

  it("rejects VI/EN disclaimer and locale mismatches", () => {
    const readyMismatched = {
      version: 1,
      state: "ready",
      contentVersion: "identity.v1",
      reportId: "report-1",
      reportVersionId: "version-1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      fulfillmentStatus: "complete",
      content: {
        ...readyReportContent,
        professionalAdviceDisclaimer: CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER_EN,
      },
      evidence: sampleEvidence,
      lineage: { supersedesReportVersionId: null },
      provenance: safeProvenance,
    };
    expect(ReportViewV1Schema.safeParse(readyMismatched).success).toBe(false);
  });

  it("allows nullable supersedesReportVersionId and rejects legacy supersedesReportId", () => {
    const readyWithNullLineage = {
      version: 1,
      state: "ready",
      contentVersion: "identity.v1",
      reportId: "report-1",
      reportVersionId: "version-1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      fulfillmentStatus: "complete",
      content: readyReportContent,
      evidence: sampleEvidence,
      lineage: { supersedesReportVersionId: null },
      provenance: safeProvenance,
    };
    expect(ReportViewV1Schema.safeParse(readyWithNullLineage).success).toBe(true);

    const readyWithLegacyField = {
      ...readyWithNullLineage,
      lineage: { supersedesReportVersionId: null, supersedesReportId: "old-id" },
    };
    expect(ReportViewV1Schema.safeParse(readyWithLegacyField).success).toBe(false);
  });

  it("rejects ready view payloads with a missing contentVersion discriminator", () => {
    const readyMissingDiscriminator = {
      version: 1,
      state: "ready",
      reportId: "report-1",
      reportVersionId: "version-1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      fulfillmentStatus: "complete",
      content: readyReportContent,
      evidence: sampleEvidence,
      lineage: { supersedesReportVersionId: null },
      provenance: safeProvenance,
    };
    expect(ReportViewV1Schema.safeParse(readyMissingDiscriminator).success).toBe(false);
  });

  it("rejects ready view payloads with an unknown contentVersion discriminator", () => {
    const readyUnknownDiscriminator = {
      version: 1,
      state: "ready",
      contentVersion: "unknown-discriminator.v99",
      reportId: "report-1",
      reportVersionId: "version-1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      fulfillmentStatus: "complete",
      content: readyReportContent,
      evidence: sampleEvidence,
      lineage: { supersedesReportVersionId: null },
      provenance: safeProvenance,
    };
    expect(ReportViewV1Schema.safeParse(readyUnknownDiscriminator).success).toBe(false);
  });
  it("proves Tier-1 report projection contains only 4 sections and no locked prose or palace IDs (Acceptance test 6)", () => {
    const rawReport = createValidV3ReportContent();
    const tier1 = projectComprehensiveReportPublicContent(rawReport, TIER_1_ENTITLEMENT_SCOPE);

    // Verify 4 unlocked sections exist
    expect(tier1.overview.title).toBe("Tổng quan lá số");
    expect(tier1.coreAxis.title).toBe("Mệnh, Thân và động lực cốt lõi");
    expect(tier1.strengthsAndTensions.title).toBe("Điểm mạnh, điểm vướng và điều kiện phát huy");
    expect(tier1.practicalDirection).toEqual(rawReport.practicalDirection);

    // Verify lockedSections metadata
    expect((tier1 as any).lockedSections).toEqual([
      "keyConfigurations",
      "palaceReadings",
      "thematicSynthesis",
    ]);

    // Verify no locked fields exist on the object
    expect(tier1).not.toHaveProperty("keyConfigurations");
    expect(tier1).not.toHaveProperty("palaceReadings");
    expect(tier1).not.toHaveProperty("thematicSynthesis");

    // Proves serialization does not leak locked keys or strings
    const serialized = JSON.stringify(tier1);
    expect(serialized).not.toContain("Cách cục Tử Phủ Đồng Cung");
    expect(serialized).not.toContain("Luận giải ziwei.palace.life");
    expect(serialized).not.toContain("ziwei.palace.");
    expect(serialized).not.toContain("thematicSynthesis\":");
    expect(serialized).not.toContain("palaceReadings\":");

    // Schema validations
    expect(ComprehensiveReportTier1PublicContentV1Schema.safeParse(tier1).success).toBe(true);
    expect(ComprehensiveReportPublicContentV1Schema.safeParse(tier1).success).toBe(true);

    const readyView = {
      version: 1,
      state: "ready",
      contentVersion: "ziwei-comprehensive.v1",
      reportId: "report-1",
      reportVersionId: "version-1",
      locale: "vi",
      sku: "ZIWEI-NATAL-EXCERPT-P0",
      fulfillmentStatus: "complete",
      content: tier1,
      lineage: { supersedesReportVersionId: null },
    };
    expect(ReportReadyViewV1Schema.safeParse(readyView).success).toBe(true);
  });

  it("proves Tier-2 report projection contains all 12 palace readings and full synthesis (Acceptance test 7)", () => {
    const rawReport = createValidV3ReportContent();
    const tier2 = projectComprehensiveReportPublicContent(rawReport, TIER_2_ENTITLEMENT_SCOPE);

    expect((tier2 as any).palaceReadings).toHaveLength(12);
    expect((tier2 as any).thematicSynthesis).toHaveLength(4);
    expect((tier2 as any).keyConfigurations).toHaveLength(1);
    expect(tier2.practicalDirection).toEqual(rawReport.practicalDirection);
    expect(tier2).not.toHaveProperty("lockedSections");

    expect(ComprehensiveReportTier2PublicContentV1Schema.safeParse(tier2).success).toBe(true);
    expect(ComprehensiveReportPublicContentV1Schema.safeParse(tier2).success).toBe(true);

    const readyView = {
      version: 1,
      state: "ready",
      contentVersion: "ziwei-comprehensive.v1",
      reportId: "report-1",
      reportVersionId: "version-1",
      locale: "vi",
      sku: "ZIWEI-IDENTITY-P0",
      fulfillmentStatus: "complete",
      content: tier2,
      lineage: { supersedesReportVersionId: null },
    };
    expect(ReportReadyViewV1Schema.safeParse(readyView).success).toBe(true);
  });
});