import { describe, expect, it } from "vitest";

import { IdentityReportV1Schema, IDENTITY_REPORT_SECTION_IDS } from "./identity-report-v1.js";

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
      title: `Muc ${index + 1}`,
      narrative: "Ban can quan sat va dieu chinh theo cach phu hop.",
      claims: id === "data_and_method" || id === "reflection_questions" || id === "action_summary" || id === "limitations_and_disclaimer"
        ? []
        : [{
          id: `claim-${index + 1}`,
          text: "Ban co the xem day la mot goi y de tu phan chieu.",
          evidenceIds: ["ziwei.identity.life-palace"],
          confidence: "moderate",
          limitations: ["Phu thuoc vao gio sinh va pham vi bang chung."],
          suggestedActions: ["Ghi lai quan sat cua ban trong mot vai tuan."],
        }],
    })),
    reflectionQuestions: [
      "Dieu gi dang giup ban duy tri su can bang?",
      "Moi truong nao giup ban phat huy the manh?",
      "Ban muon dieu chinh dieu gi trong thang toi?",
    ],
    summaryActions: ["Chon mot buoc nho va theo doi ket qua."],
    professionalAdviceDisclaimer: "Noi dung chi mang tinh tham khao va khong thay the y kien cua chuyen gia y te, tam ly, phap ly, tai chinh.",
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
  });
});
