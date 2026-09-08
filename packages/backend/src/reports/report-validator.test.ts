import { describe, expect, it } from "vitest";

import {
  CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER,
  CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER_EN,
  IDENTITY_REPORT_SECTION_IDS,
  type EvidenceSetV1,
  type IdentityReportV1,
} from "@lasoviet/contracts";

import { validateIdentityReport } from "./report-validator.js";

function report(): IdentityReportV1 {
  return {
    version: 1, sku: "ZIWEI-IDENTITY-P0", capabilityId: "ziwei.identity.p0", locale: "vi",
    provenance: { chartVersionId: "chart-1", ruleVersion: "ziwei.identity.v1", evidenceVersion: 1, knowledgeVersion: "ziwei.identity.knowledge.v2", providerId: "9router-an", modelId: "model", promptVersion: "ziwei.identity.prompt.v2", templateVersion: "template.v1" },
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

function englishReport(): IdentityReportV1 {
  return {
    version: 1,
    sku: "ZIWEI-IDENTITY-P0",
    capabilityId: "ziwei.identity.p0",
    locale: "en",
    provenance: {
      chartVersionId: "chart-1",
      ruleVersion: "ziwei.identity.v1",
      evidenceVersion: 1,
      knowledgeVersion: "ziwei.identity.knowledge.v2",
      providerId: "9router-an",
      modelId: "model",
      promptVersion: "ziwei.identity.prompt.v2",
      templateVersion: "template.v1",
    },
    sections: IDENTITY_REPORT_SECTION_IDS.map((id, index) => ({
      id,
      title: `Section ${index + 1}`,
      narrative: "You should observe calmly and adjust according to practical conditions.",
      claims: ["data_and_method", "reflection_questions", "action_summary", "limitations_and_disclaimer"].includes(id)
        ? []
        : [{
          id: `claim-${index}`,
          text: "This is a prompt for personal reflection based on evidence.",
          evidenceIds: ["ziwei.identity.life-palace"],
          interpretationBoundCode: "reflective_identity_only",
          confidence: "moderate",
          limitations: ["Depends on accurate birth time."],
          suggestedActions: [{ category: "reflect", text: "Note your observations." }],
        }],
    })),
    reflectionQuestions: [
      "What do you value most in your daily work?",
      "Which environment best supports your natural rhythm?",
      "What small experiment will you run this week?",
    ],
    summaryActions: ["Try one small step this week."],
    professionalAdviceDisclaimer: CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER_EN,
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

  it.each([
    ["line feed", "Bạn nên quan sát bình tĩnh.\nHãy ghi lại điều bạn nhận thấy."],
    ["CRLF", "Bạn nên quan sát bình tĩnh.\r\nHãy ghi lại điều bạn nhận thấy."],
    ["tab", "Bạn nên quan sát bình tĩnh.\tHãy ghi lại điều bạn nhận thấy."],
  ])("accepts valid narrative formatting with %s", (_name, narrative) => {
    const candidate = report();
    candidate.sections[0].narrative = narrative;
    expect(validateIdentityReport(candidate, { evidence, frozenFacts })).toEqual({
      ok: true,
      findings: [],
    });
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

  it("accepts a genuinely valid English report", () => {
    expect(validateIdentityReport(englishReport(), { evidence, frozenFacts })).toEqual({
      ok: true,
      findings: [],
    });
  });

  it("rejects non-NFC normalized text in Vietnamese report", () => {
    const candidate = report();
    candidate.sections[0].narrative = "Bạn nên quan sát bình tĩnh.".normalize("NFD");
    expect(validateIdentityReport(candidate, { evidence, frozenFacts })).toMatchObject({
      ok: false,
      findings: expect.arrayContaining([expect.objectContaining({ code: "REPORT_LANGUAGE_INVALID", sectionId: "personal_summary" })]),
    });
  });

  it.each([
    ["section narrative", (value: IdentityReportV1) => { value.sections[0].narrative = "Bạn nên quan sát bình tĩnh."; }],
    ["section title", (value: IdentityReportV1) => { value.sections[0].title = "Mục 1"; }],
    ["claim text", (value: IdentityReportV1) => { value.sections[0].claims[0].text = "Đây là gợi ý để bạn tự phản chiếu."; }],
    ["claim limitation", (value: IdentityReportV1) => { value.sections[0].claims[0].limitations[0] = "Phụ thuộc vào giờ sinh."; }],
    ["claim action", (value: IdentityReportV1) => { value.sections[0].claims[0].suggestedActions[0].text = "Ghi lại quan sát của bạn."; }],
    ["reflection question", (value: IdentityReportV1) => { value.reflectionQuestions[0] = "Bạn đang coi trọng điều gì?"; }],
    ["summary action", (value: IdentityReportV1) => { value.summaryActions[0] = "Thử một bước nhỏ trong tuần này."; }],
  ])("rejects Vietnamese text in English report %s", (_name, mutate) => {
    const candidate = englishReport();
    mutate(candidate);
    expect(validateIdentityReport(candidate, { evidence, frozenFacts })).toMatchObject({
      ok: false,
      findings: expect.arrayContaining([expect.objectContaining({ code: "REPORT_LANGUAGE_INVALID" })]),
    });
  });

  it.each([
    ["unsafe absolute claim", (value: IdentityReportV1) => { value.sections[0].claims[0].text = "You will definitely suffer a bankruptcy in career."; }, "REPORT_SAFETY_REJECTED"],
    ["psychological diagnosis", (value: IdentityReportV1) => { value.sections[0].claims[0].text = "You have diagnosed depression."; }, "REPORT_SAFETY_REJECTED"],
    ["fear upsell", (value: IdentityReportV1) => { value.sections[0].claims[0].text = "If you do not buy now, you will lose everything."; }, "REPORT_SAFETY_REJECTED"],
    ["DEL control character", (value: IdentityReportV1) => { value.sections[0].narrative = "You\u007F should observe calmly."; }, "REPORT_LANGUAGE_INVALID"],
    ["mojibake", (value: IdentityReportV1) => { value.sections[0].narrative = "Corrupted text with Ã£ and â€™ encoding errors."; }, "REPORT_LANGUAGE_INVALID"],
  ])("rejects invalid or unsafe content in English report: %s", (_name, mutate, code) => {
    const candidate = englishReport();
    mutate(candidate);
    expect(validateIdentityReport(candidate, { evidence, frozenFacts })).toMatchObject({
      ok: false,
      findings: expect.arrayContaining([expect.objectContaining({ code })]),
    });
  });

  it.each([
    ["line feed", "You should observe calmly.\nNote what you discover."],
    ["CRLF", "You should observe calmly.\r\nNote what you discover."],
    ["tab", "You should observe calmly.\tNote what you discover."],
  ])("accepts valid English narrative formatting with %s", (_name, narrative) => {
    const candidate = englishReport();
    candidate.sections[0].narrative = narrative;
    expect(validateIdentityReport(candidate, { evidence, frozenFacts })).toEqual({
      ok: true,
      findings: [],
    });
  });
  it("enforces claims on cycles_and_timing for V1 prompt but allows empty claims for V2 prompt", () => {
    const candidate = report();
    // remove claims from cycles_and_timing
    const cyclesSec = candidate.sections.find((s) => s.id === "cycles_and_timing")!;
    cyclesSec.claims = [];

    // In V1: must fail because cycles_and_timing requires claims in V1
    const v1Result = validateIdentityReport(candidate, { evidence, frozenFacts }, {
      promptVersion: "ziwei.identity.prompt.v1",
      knowledgeVersion: "ziwei.identity.knowledge.v1",
    });
    expect(v1Result.ok).toBe(false);
    expect(v1Result.findings).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "REPORT_EVIDENCE_INVALID", sectionId: "cycles_and_timing" })]),
    );

    // In V2: passes because cycles_and_timing does not require claims in V2
    const v2Result = validateIdentityReport(candidate, { evidence, frozenFacts }, {
      promptVersion: "ziwei.identity.prompt.v2",
      knowledgeVersion: "ziwei.identity.knowledge.v2",
    });
    expect(v2Result.ok).toBe(true);
  });

  it.each([
    ["mismatched V1 prompt and V2 knowledge", "ziwei.identity.prompt.v1", "ziwei.identity.knowledge.v2"],
    ["mismatched V2 prompt and V1 knowledge", "ziwei.identity.prompt.v2", "ziwei.identity.knowledge.v1"],
    ["unknown knowledge version", "ziwei.identity.prompt.v2", "unknown.knowledge.v999"],
    ["unknown prompt version", "unknown.prompt.v999", "ziwei.identity.knowledge.v2"],
  ])("rejects %s with REPORT_EVIDENCE_INVALID", (_name, promptVersion, knowledgeVersion) => {
    const candidate = report();
    const result = validateIdentityReport(candidate, { evidence, frozenFacts }, {
      promptVersion,
      knowledgeVersion,
    });
    expect(result).toEqual({ ok: false, findings: [{ code: "REPORT_EVIDENCE_INVALID" }] });
  });
});
