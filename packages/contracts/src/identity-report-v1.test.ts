import { describe, expect, it } from "vitest";

import {
  IdentityReportContentV1Schema,
  IdentityReportV1Schema,
  IDENTITY_REPORT_SECTION_IDS,
} from "./identity-report-v1.js";

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
    professionalAdviceDisclaimer: "Nội dung không thay thế tư vấn y tế, sức khỏe tâm thần, pháp lý, tài chính hoặc chuyên môn được cấp phép.",
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
    const { provenance: _provenance, version: _version, sku: _sku, capabilityId: _capabilityId, locale: _locale, ...content } = report();
    expect(IdentityReportContentV1Schema.safeParse(content).success).toBe(true);
    expect(IdentityReportContentV1Schema.safeParse({
      ...content,
      provenance: report().provenance,
    }).success).toBe(false);
  });
});
