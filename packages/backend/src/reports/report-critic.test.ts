import { describe, expect, it } from "vitest";

import {
  CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER,
  CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER_EN,
  IDENTITY_REPORT_SECTION_IDS,
  type EvidenceSetV1,
  type IdentityReportV1,
} from "@lasoviet/contracts";
import type { AiProvider } from "../ai/ai-provider.js";
import { critiqueIdentityReport } from "./report-critic.js";

function report(): IdentityReportV1 {
  return {
    version: 1, sku: "ZIWEI-IDENTITY-P0", capabilityId: "ziwei.identity.p0", locale: "vi",
    provenance: { chartVersionId: "chart-1", ruleVersion: "ziwei.identity.v1", evidenceVersion: 1, knowledgeVersion: "knowledge.vi.v1", providerId: "9router-an", modelId: "model", promptVersion: "prompt.v1", templateVersion: "template.v1" },
    sections: IDENTITY_REPORT_SECTION_IDS.map((id, index) => ({
      id, title: `Mục ${index + 1}`, narrative: "Bạn nên quan sát bình tĩnh và điều chỉnh theo điều kiện thực tế.",
      claims: ["personal_summary", "primary_evidence", "strengths_and_resources", "tensions_and_blind_spots", "identity_analysis", "cycles_and_timing", "within_control"].includes(id) ? [{
        id: `claim-${index}`, text: "Đây là gợi ý để bạn tự phản chiếu theo bằng chứng.", evidenceIds: ["ziwei.identity.life-palace"], interpretationBoundCode: "reflective_identity_only", confidence: "moderate", limitations: ["Phụ thuộc vào giờ sinh."], suggestedActions: [{ category: "reflect", text: "Ghi lại quan sát của bạn." }],
      }] : [],
    })),
    reflectionQuestions: ["Bạn coi trọng điều gì?", "Môi trường nào phù hợp?", "Bước nhỏ nào bạn sẽ thử?"],
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
      knowledgeVersion: "knowledge.en.v1",
      providerId: "9router-an",
      modelId: "model",
      promptVersion: "prompt.v1",
      templateVersion: "template.v1",
    },
    sections: IDENTITY_REPORT_SECTION_IDS.map((id, index) => ({
      id,
      title: `Section ${index + 1}`,
      narrative: "You should observe calmly and adjust according to practical conditions.",
      claims: ["personal_summary", "primary_evidence", "strengths_and_resources", "tensions_and_blind_spots", "identity_analysis", "cycles_and_timing", "within_control"].includes(id) ? [{
        id: `claim-${index}`,
        text: "This is a prompt for personal reflection based on evidence.",
        evidenceIds: ["ziwei.identity.life-palace"],
        interpretationBoundCode: "reflective_identity_only",
        confidence: "moderate",
        limitations: ["Depends on accurate birth time."],
        suggestedActions: [{ category: "reflect", text: "Note your observations." }],
      }] : [],
    })),
    reflectionQuestions: ["What do you value most?", "Which environment fits you best?", "What small step will you try?"],
    summaryActions: ["Try one small step this week."],
    professionalAdviceDisclaimer: CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER_EN,
  };
}

const evidence: EvidenceSetV1 = {
  version: 1, capabilityId: "ziwei.identity.p0", chartVersionId: "chart-1", ruleVersion: "ziwei.identity.v1",
  items: ["life-palace", "body-palace", "transformations"].map((suffix) => ({
    id: `ziwei.identity.${suffix}`, factReferences: [suffix === "life-palace" ? "soulPalaceId" : suffix === "body-palace" ? "bodyPalaceId" : "transformations"],
    confidence: "moderate" as const, interpretationBounds: ["Reflective identity signal."], interpretationBoundCodes: ["reflective_identity_only" as const],
    limitations: ["Phụ thuộc vào giờ sinh."], riskTags: ["identity" as const], allowedActionCategories: ["reflect" as const],
  })),
};
const context = {
  evidence,
  frozenFacts: {
    version: 1, capabilityId: "ziwei.identity.p0", chartVersionId: "chart-1", ruleVersion: "ziwei.identity.v1", evidenceVersion: 1,
    facts: { soulPalaceId: "ziwei.palace.life", bodyPalaceId: "ziwei.palace.career", transformations: ["ziwei.transformation.prosperity"] },
  },
  knowledgePassages: [{ id: "knowledge-1", content: "Nội dung đã được phê duyệt." }],
};
const englishContext = {
  evidence,
  frozenFacts: context.frozenFacts,
  knowledgePassages: [{ id: "knowledge-1", content: "Approved English content." }],
};

describe("identity report critic", () => {
  it("runs deterministic validation itself before calling the provider", async () => {
    const provider: AiProvider = { async generateStructured() { throw new Error("must not run"); } };
    const invalid = report();
    invalid.sections[0].claims = [];
    await expect(critiqueIdentityReport(invalid, context, provider)).resolves.toMatchObject({
      ok: false, error: { code: "REPORT_EVIDENCE_INVALID" },
    });
  });

  it("rejects critic scores below the correctness threshold with REPORT_SAFETY_REJECTED", async () => {
    const provider: AiProvider = {
      async generateStructured() {
        return {
          ok: true,
          value: {
            value: {
              correctness: 3,
              evidenceCoverage: 5,
              specificity: 5,
              languageClarity: 5,
              consistency: 5,
              actionability: 5,
              safety: 5,
              repetitionControl: 5,
              notes: [],
            },
            providerId: "9router-an",
            modelId: "model",
          },
        };
      },
    };
    await expect(critiqueIdentityReport(report(), context, provider)).resolves.toMatchObject({
      ok: false,
      error: { code: "REPORT_SAFETY_REJECTED", retryable: false },
    });
  });

  it("rejects critic scores below the safety threshold with REPORT_SAFETY_REJECTED", async () => {
    const provider: AiProvider = {
      async generateStructured() {
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
              safety: 3,
              repetitionControl: 5,
              notes: [],
            },
            providerId: "9router-an",
            modelId: "model",
          },
        };
      },
    };
    await expect(critiqueIdentityReport(report(), context, provider)).resolves.toMatchObject({
      ok: false,
      error: { code: "REPORT_SAFETY_REJECTED", retryable: false },
    });
  });

  it("supplies frozen facts, evidence, and bounded approved knowledge to score correctness", async () => {
    let request: unknown;
    const provider: AiProvider = {
      async generateStructured(candidate) {
        request = candidate;
        return { ok: true, value: { value: { correctness: 5, evidenceCoverage: 5, specificity: 5, languageClarity: 5, consistency: 5, actionability: 5, safety: 5, repetitionControl: 5, notes: [] }, providerId: "9router-an", modelId: "model" } };
      },
    };
    await expect(critiqueIdentityReport(report(), context, provider)).resolves.toMatchObject({
      ok: true,
      value: { languageClarity: 5 },
    });
    expect(JSON.stringify(request)).toContain("soulPalaceId");
  });

  it("makes the critic system instruction locale-aware for English reports", async () => {
    let capturedRequest: unknown;
    const provider: AiProvider = {
      async generateStructured(candidate) {
        capturedRequest = candidate;
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
            providerId: "9router-an",
            modelId: "model",
          },
        };
      },
    };
    const enResult = await critiqueIdentityReport(englishReport(), englishContext, provider);
    expect(enResult).toMatchObject({
      ok: true,
      value: { languageClarity: 5 },
    });
    expect((capturedRequest as { system: string }).system).toMatch(/English/i);
    expect((capturedRequest as { system: string }).system).not.toMatch(/Vietnamese/i);
  });
});
