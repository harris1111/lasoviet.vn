import { describe, expect, it } from "vitest";

import { IDENTITY_REPORT_SECTION_IDS, type IdentityReportV1 } from "@lasoviet/contracts";

import { validateIdentityReport } from "./report-validator.js";

function report(): IdentityReportV1 {
  return {
    version: 1, sku: "ZIWEI-IDENTITY-P0", capabilityId: "ziwei.identity.p0", locale: "vi",
    provenance: { chartVersionId: "chart-1", ruleVersion: "ziwei.identity.v1", evidenceVersion: 1, knowledgeVersion: "knowledge.vi.v1", providerId: "9router-an", modelId: "model", promptVersion: "prompt.v1", templateVersion: "template.v1" },
    sections: IDENTITY_REPORT_SECTION_IDS.map((id, index) => ({
      id, title: `Muc ${index + 1}`, narrative: "Ban nen quan sat mot cach binh tinh va co dieu kien.",
      claims: ["data_and_method", "reflection_questions", "action_summary", "limitations_and_disclaimer"].includes(id) ? [] : [{
        id: `claim-${index}`, text: "Day la goi y de ban tu phan chieu theo bang chung.", evidenceIds: ["ziwei.identity.life-palace"], confidence: "moderate", limitations: ["Phu thuoc vao gio sinh."], suggestedActions: ["Ghi lai quan sat cua ban."],
      }],
    })),
    reflectionQuestions: ["Ban dang coi trong dieu gi?", "Moi truong nao phu hop?", "Buoc nho nao ban se thu?"],
    summaryActions: ["Thu mot buoc nho trong tuan nay."],
    professionalAdviceDisclaimer: "Noi dung chi mang tinh tham khao va khong thay the y kien cua chuyen gia y te, tam ly, phap ly, tai chinh.",
  };
}

const evidence = [{
  id: "ziwei.identity.life-palace", factReferences: ["soulPalaceId"], confidence: "moderate" as const,
  interpretationBounds: ["Use only as a reflective identity signal, not a deterministic outcome."],
  limitations: ["Phu thuoc vao gio sinh."], riskTags: ["identity", "determinism", "birth-time"] as const,
  allowedActionCategories: ["reflect", "explore"] as const,
}];

describe("identity report validator", () => {
  it.each([
    ["fabricated evidence", (value: IdentityReportV1) => { value.sections[0].claims[0].evidenceIds = ["ziwei.identity.fabricated"]; }, "REPORT_EVIDENCE_INVALID"],
    ["unsafe absolute claim", (value: IdentityReportV1) => { value.sections[0].claims[0].text = "Ban chac chan gap tai nan nghiem trong."; }, "REPORT_SAFETY_REJECTED"],
    ["psychological diagnosis", (value: IdentityReportV1) => { value.sections[0].claims[0].text = "Ban bi tram cam."; }, "REPORT_SAFETY_REJECTED"],
    ["fear upsell", (value: IdentityReportV1) => { value.sections[0].claims[0].text = "Neu khong mua ngay, ban se bo lo co hoi quan trong."; }, "REPORT_SAFETY_REJECTED"],
    ["unsupported language", (value: IdentityReportV1) => { value.sections[0].claims[0].text = "This report is only in English."; }, "REPORT_LANGUAGE_INVALID"],
    ["missing disclaimer", (value: IdentityReportV1) => { value.professionalAdviceDisclaimer = ""; }, "REPORT_SCHEMA_INVALID"],
  ])("rejects %s", (_name, mutate, code) => {
    const candidate = report();
    mutate(candidate);
    expect(validateIdentityReport(candidate, evidence)).toMatchObject({
      ok: false, findings: expect.arrayContaining([expect.objectContaining({ code })]),
    });
  });
});
