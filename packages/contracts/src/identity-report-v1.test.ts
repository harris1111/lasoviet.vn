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
    };
    expect(ReportViewV1Schema.safeParse(failed).success).toBe(true);
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
});
