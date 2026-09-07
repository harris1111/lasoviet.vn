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
      claims: ["personal_summary", "primary_evidence", "strengths_and_resources", "tensions_and_blind_spots", "identity_analysis", "within_control"].includes(id) ? [{
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
      claims: ["personal_summary", "primary_evidence", "strengths_and_resources", "tensions_and_blind_spots", "identity_analysis", "within_control"].includes(id) ? [{
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

  it("rejects non-safety scores below 4 with AI_OUTPUT_INVALID and exposes bounded notes", async () => {
    const provider: AiProvider = {
      async generateStructured() {
        return {
          ok: true,
          value: {
            value: {
              correctness: 5,
              evidenceCoverage: 5,
              specificity: 3, // < 4
              languageClarity: 5,
              consistency: 5,
              actionability: 5,
              safety: 5,
              repetitionControl: 5,
              notes: ["Report lacks concrete specificity in identity section."],
            },
            providerId: "9router-an",
            modelId: "model",
          },
        };
      },
    };
    const result = await critiqueIdentityReport(report(), context, provider);
    expect(result).toMatchObject({
      ok: false,
      error: {
        code: "AI_OUTPUT_INVALID",
        retryable: false,
        notes: ["Report lacks concrete specificity in identity section."],
      },
    });
  });

  it("rejects languageClarity below 4 with AI_OUTPUT_INVALID", async () => {
    const provider: AiProvider = {
      async generateStructured() {
        return {
          ok: true,
          value: {
            value: {
              correctness: 4,
              evidenceCoverage: 4,
              specificity: 4,
              languageClarity: 2, // < 4
              consistency: 4,
              actionability: 4,
              safety: 4,
              repetitionControl: 4,
              notes: ["Sentences are too abstract."],
            },
            providerId: "9router-an",
            modelId: "model",
          },
        };
      },
    };
    const result = await critiqueIdentityReport(report(), context, provider);
    expect(result).toMatchObject({
      ok: false,
      error: {
        code: "AI_OUTPUT_INVALID",
        retryable: false,
        notes: ["Sentences are too abstract."],
      },
    });
  });

  it("succeeds when all eight dimensions score at least four", async () => {
    const provider: AiProvider = {
      async generateStructured() {
        return {
          ok: true,
          value: {
            value: {
              correctness: 4,
              evidenceCoverage: 4,
              specificity: 4,
              languageClarity: 5,
              consistency: 4,
              actionability: 4,
              safety: 5,
              repetitionControl: 4,
              notes: [],
            },
            providerId: "9router-an",
            modelId: "model",
          },
        };
      },
    };
    const result = await critiqueIdentityReport(report(), context, provider);
    expect(result).toMatchObject({
      ok: true,
      value: { correctness: 4, safety: 5, languageClarity: 5 },
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

  it("instructs provider with explicit literal JSON critic skeleton and key constraints while retaining locale awareness", async () => {
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

    const viResult = await critiqueIdentityReport(report(), context, provider);
    expect(viResult).toMatchObject({
      ok: true,
      value: { correctness: 5 },
    });
    const viSystem = (capturedRequest as { system: string }).system;
    expect(viSystem).toMatch(/Vietnamese/i);
    expect(viSystem).not.toMatch(/English/i);
    expect(viSystem).toContain('{"correctness":5,"evidenceCoverage":5,"specificity":5,"languageClarity":5,"consistency":5,"actionability":5,"safety":5,"repetitionControl":5,"notes":["..."]}');
    expect(viSystem).toMatch(/all eight scores must be integers 1-5/i);
    expect(viSystem).toMatch(/notes must be 0-8 strings up to 300 characters/i);
    expect(viSystem).toMatch(/keys must not be renamed, translated, omitted, or added/i);

    const enResult = await critiqueIdentityReport(englishReport(), englishContext, provider);
    expect(enResult).toMatchObject({
      ok: true,
      value: { correctness: 5 },
    });
    const enSystem = (capturedRequest as { system: string }).system;
    expect(enSystem).toMatch(/English/i);
    expect(enSystem).not.toMatch(/Vietnamese/i);
    expect(enSystem).toContain('{"correctness":5,"evidenceCoverage":5,"specificity":5,"languageClarity":5,"consistency":5,"actionability":5,"safety":5,"repetitionControl":5,"notes":["..."]}');
    expect(enSystem).toMatch(/all eight scores must be integers 1-5/i);
    expect(enSystem).toMatch(/notes must be 0-8 strings up to 300 characters/i);
    expect(enSystem).toMatch(/keys must not be renamed, translated, omitted, or added/i);
  });
});
