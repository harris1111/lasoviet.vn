import { describe, expect, it } from "vitest";

import {
  CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER,
  IDENTITY_REPORT_SECTION_IDS,
  type EvidenceSetV1,
  type IdentityReportV1,
} from "@lasoviet/contracts";

import { validateIdentityReport } from "./report-validator.js";

function report(): IdentityReportV1 {
  return {
    version: 1, sku: "ZIWEI-IDENTITY-P0", capabilityId: "ziwei.identity.p0", locale: "vi",
    provenance: { chartVersionId: "chart-1", ruleVersion: "ziwei.identity.v1", evidenceVersion: 1, knowledgeVersion: "knowledge.vi.v1", providerId: "9router-an", modelId: "model", promptVersion: "prompt.v1", templateVersion: "template.v1" },
    sections: IDENTITY_REPORT_SECTION_IDS.map((id, index) => ({
      id, title: `Mục ${index + 1}`, narrative: "Bạn nên quan sát một cách bình tĩnh và có điều kiện.",
      claims: ["data_and_method", "reflection_questions", "action_summary", "limitations_and_disclaimer"].includes(id) ? [] : [{
        id: `claim-${index}`, text: "Đây là gợi ý để bạn tự phản chiếu theo bằng chứng.", evidenceIds: ["ziwei.identity.life-palace"], interpretationBoundCode: "reflective_identity_only", confidence: "moderate", limitations: ["Phụ thuộc vào giờ sinh."], suggestedActions: [{ category: "reflect", text: "Ghi lại quan sát của bạn." }],
      }],
    })),
    reflectionQuestions: ["Bạn đang coi trọng điều gì?", "Môi trường nào phù hợp?", "Bước nhỏ nào bạn sẽ thử?"],
    summaryActions: ["Thử một bước nhỏ trong tuần này."],
    professionalAdviceDisclaimer: CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER,
  };
}

const evidence: EvidenceSetV1 = {
  version: 1, capabilityId: "ziwei.identity.p0", chartVersionId: "chart-1", ruleVersion: "ziwei.identity.v1",
  items: [{
  id: "ziwei.identity.life-palace", factReferences: ["soulPalaceId"], confidence: "moderate" as const,
  interpretationBounds: ["Use only as a reflective identity signal, not a deterministic outcome."],
  interpretationBoundCodes: ["reflective_identity_only"],
  limitations: ["Phụ thuộc vào giờ sinh."], riskTags: ["identity", "determinism", "birth-time"] as const,
  allowedActionCategories: ["reflect", "explore"] as const,
}, {
  id: "ziwei.identity.body-palace", factReferences: ["bodyPalaceId"], confidence: "moderate",
  interpretationBounds: ["Reflective identity signal."], interpretationBoundCodes: ["reflective_identity_only"],
  limitations: ["Phụ thuộc vào giờ sinh."], riskTags: ["identity"], allowedActionCategories: ["reflect"],
}, {
  id: "ziwei.identity.transformations", factReferences: ["transformations"], confidence: "moderate",
  interpretationBounds: ["Reflective identity signal."], interpretationBoundCodes: ["reflective_identity_only"],
  limitations: ["Phụ thuộc vào giờ sinh."], riskTags: ["identity"], allowedActionCategories: ["reflect"],
}]};

const frozenFacts = {
  version: 1, capabilityId: "ziwei.identity.p0", chartVersionId: "chart-1",
  ruleVersion: "ziwei.identity.v1", evidenceVersion: 1,
  facts: {
    soulPalaceId: "ziwei.palace.life",
    bodyPalaceId: "ziwei.palace.career",
    transformations: ["ziwei.transformation.prosperity"],
  },
} as const;

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
    expect(validateIdentityReport(candidate, { evidence, frozenFacts })).toMatchObject({
      ok: false, findings: expect.arrayContaining([expect.objectContaining({ code })]),
    });
  });

  it.each([
    ["section narrative", (value: IdentityReportV1) => { value.sections[0].narrative = "Bạn chắc chắn sẽ tử vong."; }],
    ["section title", (value: IdentityReportV1) => { value.sections[0].title = "This title is English."; }],
    ["reflection question", (value: IdentityReportV1) => { value.reflectionQuestions[0] = "Bạn bị trầm cảm."; }],
    ["summary action", (value: IdentityReportV1) => { value.summaryActions[0] = "Nếu không mua ngay bạn sẽ gặp nguy hiểm."; }],
    ["claim limitation", (value: IdentityReportV1) => { value.sections[0].claims[0].limitations[0] = "This limitation is English."; }],
    ["claim action", (value: IdentityReportV1) => { value.sections[0].claims[0].suggestedActions[0].text = "Bạn chắc chắn sẽ phá sản."; }],
    ["DEL control", (value: IdentityReportV1) => { value.sections[0].narrative = "Bạn\u007F nên quan sát bình tĩnh."; }],
    ["mojibake", (value: IdentityReportV1) => { value.sections[0].narrative = "Bạn có nội dung mÃ£ hÃ³a bị lỗi."; }],
  ])("validates safety and locale in every rendered %s", (_name, mutate) => {
    const candidate = report();
    mutate(candidate);
    expect(validateIdentityReport(candidate, { evidence, frozenFacts }).ok).toBe(false);
  });

  it("accepts a genuinely valid report and rejects evidence-bound violations", () => {
    expect(validateIdentityReport(report(), { evidence, frozenFacts })).toEqual({ ok: true, findings: [] });
    const noClaim = report();
    noClaim.sections[0].claims = [];
    expect(validateIdentityReport(noClaim, { evidence, frozenFacts })).toMatchObject({
      ok: false, findings: expect.arrayContaining([expect.objectContaining({ code: "REPORT_EVIDENCE_INVALID" })]),
    });
    const excessiveConfidence = report();
    excessiveConfidence.sections[0].claims[0].confidence = "high";
    expect(validateIdentityReport(excessiveConfidence, { evidence, frozenFacts })).toMatchObject({ ok: false });
    const disallowedAction = report();
    disallowedAction.sections[0].claims[0].suggestedActions = [{ category: "discuss-with-support", text: "Bạn nên trao đổi thêm." }];
    expect(validateIdentityReport(disallowedAction, { evidence, frozenFacts })).toMatchObject({ ok: false });
  });
});
