import { describe, expect, it, vi } from "vitest";

import {
  CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER,
  CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER_EN,
  IDENTITY_REPORT_SECTION_IDS,
  type EvidenceSetV1,
} from "@lasoviet/contracts";

import type { AiProvider } from "../ai/ai-provider.js";
import { writeIdentityReportDraft } from "./identity-report-writer.js";
import {
  CANONICAL_IDENTITY_REPORT_TITLES_EN,
  CANONICAL_IDENTITY_REPORT_TITLES_VI,
  DETERMINISTIC_CYCLES_NARRATIVE_EN,
  DETERMINISTIC_CYCLES_NARRATIVE_VI,
  REPORT_KNOWLEDGE_VERSION_V1,
  REPORT_KNOWLEDGE_VERSION_V2,
  REPORT_PROMPT_VERSION_V1,
  REPORT_PROMPT_VERSION_V2,
} from "./identity-report-config.js";

describe("identity report writer", () => {
  it.each([
    ["mismatched V1 prompt and V2 knowledge", REPORT_PROMPT_VERSION_V1, "ziwei.identity.knowledge.v2"],
    ["mismatched V2 prompt and V1 knowledge", REPORT_PROMPT_VERSION_V2, "ziwei.identity.knowledge.v1"],
    ["unknown knowledge version", REPORT_PROMPT_VERSION_V2, "unknown.knowledge.v999"],
    ["unknown prompt version", "unknown.prompt.v99", "ziwei.identity.knowledge.v2"],
  ])("rejects %s with AI_OUTPUT_INVALID before calling provider", async (_name, promptVersion, knowledgeVersion) => {
    const providerSpy = vi.fn();
    const provider: AiProvider = {
      generateStructured: providerSpy,
    };
    const evidence: EvidenceSetV1 = {
      version: 1, capabilityId: "ziwei.identity.p0", chartVersionId: "chart-1", ruleVersion: "ziwei.identity.v1",
      items: [{
        id: "ziwei.identity.life-palace", factReferences: ["soulPalaceId"], confidence: "moderate",
        interpretationBounds: ["Reflective identity signal."], interpretationBoundCodes: ["reflective_identity_only"],
        limitations: ["Phụ thuộc vào giờ sinh."], riskTags: ["identity"], allowedActionCategories: ["reflect"],
      }, {
        id: "ziwei.identity.body-palace", factReferences: ["bodyPalaceId"], confidence: "moderate",
        interpretationBounds: ["Reflective identity signal."], interpretationBoundCodes: ["reflective_identity_only"],
        limitations: ["Phụ thuộc vào giờ sinh."], riskTags: ["identity"], allowedActionCategories: ["reflect"],
      }, {
        id: "ziwei.identity.transformations", factReferences: ["transformations"], confidence: "moderate",
        interpretationBounds: ["Reflective identity signal."], interpretationBoundCodes: ["reflective_identity_only"],
        limitations: ["Phụ thuộc vào giờ sinh."], riskTags: ["identity"], allowedActionCategories: ["reflect"],
      }],
    };
    const result = await writeIdentityReportDraft({
      sku: "ZIWEI-IDENTITY-P0",
      locale: "vi",
      chartVersionId: "chart-1",
      evidence,
      frozenFacts: {
        version: 1, capabilityId: "ziwei.identity.p0", chartVersionId: "chart-1", ruleVersion: "ziwei.identity.v1", evidenceVersion: 1,
        facts: { soulPalaceId: "ziwei.palace.life", bodyPalaceId: "ziwei.palace.career", transformations: ["ziwei.transformation.prosperity"] },
      },
      knowledgePassages: [{ id: "knowledge-1", content: "Nội dung đã được phê duyệt." }],
      provenance: { evidenceVersion: 1, knowledgeVersion, promptVersion, templateVersion: "template.v1" },
      provider,
    });
    expect(result).toEqual({ ok: false, error: { code: "AI_OUTPUT_INVALID", retryable: false } });
    expect(providerSpy).not.toHaveBeenCalled();
  });

  it("uses legacy V1 writer behavior when promptVersion is ziwei.identity.prompt.v1", async () => {
    let capturedRequest: unknown;
    const provider: AiProvider = {
      async generateStructured(candidate) {
        capturedRequest = candidate;
        return {
          ok: true,
          value: {
            value: {
              sections: IDENTITY_REPORT_SECTION_IDS.map((id, index) => ({
                id,
                title: `Model Original Title ${index + 1}`,
                narrative: "Nội dung mô hình V1.",
                claims: ["personal_summary", "primary_evidence", "strengths_and_resources", "tensions_and_blind_spots", "identity_analysis", "cycles_and_timing", "within_control"].includes(id)
                  ? [{
                    id: `claim-${index}`,
                    text: "Gợi ý tự phản chiếu.",
                    evidenceIds: ["ziwei.identity.life-palace"],
                    interpretationBoundCode: "reflective_identity_only",
                    confidence: "moderate",
                    limitations: ["Phụ thuộc vào giờ sinh."],
                    suggestedActions: [{ category: "reflect", text: "Ghi lại quan sát." }],
                  }]
                  : [],
              })),
              reflectionQuestions: ["Câu hỏi 1", "Câu hỏi 2", "Câu hỏi 3"],
              summaryActions: ["Hành động 1"],
            },
            providerId: "v1-provider",
            modelId: "v1-model",
          },
        } as never;
      },
    };

    const evidence: EvidenceSetV1 = {
      version: 1, capabilityId: "ziwei.identity.p0", chartVersionId: "chart-1", ruleVersion: "ziwei.identity.v1",
      items: [{
        id: "ziwei.identity.life-palace", factReferences: ["soulPalaceId"], confidence: "moderate",
        interpretationBounds: ["Reflective identity signal."], interpretationBoundCodes: ["reflective_identity_only"],
        limitations: ["Phụ thuộc vào giờ sinh."], riskTags: ["identity"], allowedActionCategories: ["reflect"],
      }, {
        id: "ziwei.identity.body-palace", factReferences: ["bodyPalaceId"], confidence: "moderate",
        interpretationBounds: ["Reflective identity signal."], interpretationBoundCodes: ["reflective_identity_only"],
        limitations: ["Phụ thuộc vào giờ sinh."], riskTags: ["identity"], allowedActionCategories: ["reflect"],
      }, {
        id: "ziwei.identity.transformations", factReferences: ["transformations"], confidence: "moderate",
        interpretationBounds: ["Reflective identity signal."], interpretationBoundCodes: ["reflective_identity_only"],
        limitations: ["Phụ thuộc vào giờ sinh."], riskTags: ["identity"], allowedActionCategories: ["reflect"],
      }],
    };

    const result = await writeIdentityReportDraft({
      sku: "ZIWEI-IDENTITY-P0",
      locale: "vi",
      chartVersionId: "chart-1",
      evidence,
      frozenFacts: {
        version: 1, capabilityId: "ziwei.identity.p0", chartVersionId: "chart-1", ruleVersion: "ziwei.identity.v1", evidenceVersion: 1,
        facts: { soulPalaceId: "ziwei.palace.life", bodyPalaceId: "ziwei.palace.career", transformations: ["ziwei.transformation.prosperity"] },
      },
      knowledgePassages: Array.from({ length: 12 }, (_, i) => ({
        id: `k-${i}`,
        content: `Passage ${i}`,
        reportSections: ["personal_summary" as const],
        sourceAttribution: "Source Attribution",
      })),
      provenance: { evidenceVersion: 1, knowledgeVersion: "ziwei.identity.knowledge.v1", promptVersion: REPORT_PROMPT_VERSION_V1, templateVersion: "template.v1" },
      provider,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected V1 writer to succeed");

    // V1 keeps model-provided title (no overwriting)
    expect(result.value.report.sections[0].title).toBe("Model Original Title 1");
    // V1 keeps model-provided cycles_and_timing narrative and claims
    const cyclesSec = result.value.report.sections.find((s) => s.id === "cycles_and_timing");
    expect(cyclesSec?.narrative).toBe("Nội dung mô hình V1.");
    expect(cyclesSec?.claims.length).toBeGreaterThan(0);
    expect(result.value.report.provenance.promptVersion).toBe(REPORT_PROMPT_VERSION_V1);

    const req = capturedRequest as { maxOutputTokens: number; user: string; system: string };
    expect(req.maxOutputTokens).toBe(4000);
    const parsedUser = JSON.parse(req.user);
    expect(parsedUser.knowledge.length).toBeLessThanOrEqual(8);
    expect(parsedUser.knowledge[0].reportSections).toBeUndefined();
    expect(parsedUser.knowledge[0].sourceAttribution).toBeUndefined();
    expect(parsedUser.localizedFacts).toBeUndefined();
    expect(req.system).toContain("cycles_and_timing");
  });

  it("sends resolved frozen facts only and assembles trusted provenance after model content for V2", async () => {
    let request: unknown;
    const provider: AiProvider = {
      async generateStructured(candidate) {
        request = candidate;
        return {
          ok: true,
          value: {
            value: {
              sections: IDENTITY_REPORT_SECTION_IDS.map((id, index) => ({
                id,
                title: `Tên cũ của mô hình ${index + 1}`,
                narrative: "Bạn nên quan sát bình tĩnh và điều chỉnh theo điều kiện thực tế.",
                claims: ["personal_summary", "primary_evidence", "strengths_and_resources", "tensions_and_blind_spots", "identity_analysis", "within_control"].includes(id)
                  ? [{
                    id: `claim-${index}`,
                    text: "Đây là gợi ý để bạn tự phản chiếu theo bằng chứng.",
                    evidenceIds: ["ziwei.identity.life-palace"],
                    interpretationBoundCode: "reflective_identity_only",
                    confidence: "moderate",
                    limitations: ["Phụ thuộc vào giờ sinh."],
                    suggestedActions: [{ category: "reflect", text: "Ghi lại quan sát của bạn." }],
                  }]
                  : [],
              })),
              reflectionQuestions: ["Bạn coi trọng điều gì?", "Môi trường nào phù hợp?", "Bước nhỏ nào sẽ thử?"],
              summaryActions: ["Thử một bước nhỏ trong tuần này."],
            },
            providerId: "9router-an",
            modelId: "canonical-model",
          },
        } as never;
      },
    };
    const evidence: EvidenceSetV1 = {
      version: 1, capabilityId: "ziwei.identity.p0", chartVersionId: "chart-1", ruleVersion: "ziwei.identity.v1",
      items: [{
        id: "ziwei.identity.life-palace", factReferences: ["soulPalaceId"], confidence: "moderate",
        interpretationBounds: ["Reflective identity signal."], interpretationBoundCodes: ["reflective_identity_only"],
        limitations: ["Phụ thuộc vào giờ sinh."], riskTags: ["identity"], allowedActionCategories: ["reflect"],
      }, {
        id: "ziwei.identity.body-palace", factReferences: ["bodyPalaceId"], confidence: "moderate",
        interpretationBounds: ["Reflective identity signal."], interpretationBoundCodes: ["reflective_identity_only"],
        limitations: ["Phụ thuộc vào giờ sinh."], riskTags: ["identity"], allowedActionCategories: ["reflect"],
      }, {
        id: "ziwei.identity.transformations", factReferences: ["transformations"], confidence: "moderate",
        interpretationBounds: ["Reflective identity signal."], interpretationBoundCodes: ["reflective_identity_only"],
        limitations: ["Phụ thuộc vào giờ sinh."], riskTags: ["identity"], allowedActionCategories: ["reflect"],
      }],
    };
    const result = await writeIdentityReportDraft({
      sku: "ZIWEI-IDENTITY-P0",
      locale: "vi",
      chartVersionId: "chart-1",
      evidence,
      frozenFacts: {
        version: 1, capabilityId: "ziwei.identity.p0", chartVersionId: "chart-1", ruleVersion: "ziwei.identity.v1", evidenceVersion: 1,
        facts: { soulPalaceId: "ziwei.palace.life", bodyPalaceId: "ziwei.palace.career", transformations: ["ziwei.transformation.prosperity"] },
      },
      knowledgePassages: [{ id: "knowledge-1", content: "Nội dung đã được phê duyệt." }],
      provenance: { evidenceVersion: 1, knowledgeVersion: REPORT_KNOWLEDGE_VERSION_V2, promptVersion: REPORT_PROMPT_VERSION_V2, templateVersion: "template.v1" },
      provider,
    });
    expect(result).toMatchObject({
      ok: true,
      value: {
        report: {
          locale: "vi",
          sku: "ZIWEI-IDENTITY-P0",
          provenance: { chartVersionId: "chart-1", modelId: "canonical-model", promptVersion: REPORT_PROMPT_VERSION_V2 },
          professionalAdviceDisclaimer: CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER,
        },
      },
    });
    expect(JSON.stringify(request)).not.toMatch(/chartVersionId|birth|email|order|persist|publish/i);
    expect(JSON.stringify(request)).toContain("soulPalaceId");
    expect((request as { system: string }).system).toMatch(/reflective|self-reflection/i);
    expect((request as { system: string }).system).toMatch(/Vietnamese/i);
    expect((request as { system: string }).system).toMatch(/chart.*(?:calculation|calculat)|invent|fabricat/i);
    expect((request as { maxOutputTokens: number }).maxOutputTokens).toBe(6000);

    // Verify canonical title overwriting
    if (result.ok) {
      for (const sec of result.value.report.sections) {
        expect(sec.title).toBe(CANONICAL_IDENTITY_REPORT_TITLES_VI[sec.id]);
      }
      const cyclesSec = result.value.report.sections.find((s) => s.id === "cycles_and_timing");
      expect(cyclesSec?.narrative).toBe(DETERMINISTIC_CYCLES_NARRATIVE_VI);
      expect(cyclesSec?.claims).toEqual([]);
    }
  });

  it("selects the exact English disclaimer and requests English for an English reservation in V2", async () => {
    let request: unknown;
    const provider: AiProvider = {
      async generateStructured(candidate) {
        request = candidate;
        return {
          ok: true,
          value: {
            value: {
              sections: IDENTITY_REPORT_SECTION_IDS.map((id, index) => ({
                id,
                title: `Old Model Title ${index + 1}`,
                narrative: "You should observe calmly and adjust according to practical conditions.",
                claims: ["personal_summary", "primary_evidence", "strengths_and_resources", "tensions_and_blind_spots", "identity_analysis", "within_control"].includes(id)
                  ? [{
                    id: `claim-${index}`,
                    text: "This is a prompt for personal reflection based on evidence.",
                    evidenceIds: ["ziwei.identity.life-palace"],
                    interpretationBoundCode: "reflective_identity_only",
                    confidence: "moderate",
                    limitations: ["Depends on accurate birth time."],
                    suggestedActions: [{ category: "reflect", text: "Note your observations." }],
                  }]
                  : [],
              })),
              reflectionQuestions: [
                "What do you value most in daily work?",
                "Which environment fits you best?",
                "What small experiment will you try?",
              ],
              summaryActions: ["Try one small step this week."],
            },
            providerId: "9router-an",
            modelId: "canonical-model",
          },
        } as never;
      },
    };
    const evidence: EvidenceSetV1 = {
      version: 1, capabilityId: "ziwei.identity.p0", chartVersionId: "chart-1", ruleVersion: "ziwei.identity.v1",
      items: [{
        id: "ziwei.identity.life-palace", factReferences: ["soulPalaceId"], confidence: "moderate",
        interpretationBounds: ["Reflective identity signal."], interpretationBoundCodes: ["reflective_identity_only"],
        limitations: ["Phụ thuộc vào giờ sinh."], riskTags: ["identity"], allowedActionCategories: ["reflect"],
      }, {
        id: "ziwei.identity.body-palace", factReferences: ["bodyPalaceId"], confidence: "moderate",
        interpretationBounds: ["Reflective identity signal."], interpretationBoundCodes: ["reflective_identity_only"],
        limitations: ["Phụ thuộc vào giờ sinh."], riskTags: ["identity"], allowedActionCategories: ["reflect"],
      }, {
        id: "ziwei.identity.transformations", factReferences: ["transformations"], confidence: "moderate",
        interpretationBounds: ["Reflective identity signal."], interpretationBoundCodes: ["reflective_identity_only"],
        limitations: ["Phụ thuộc vào giờ sinh."], riskTags: ["identity"], allowedActionCategories: ["reflect"],
      }],
    };
    const result = await writeIdentityReportDraft({
      sku: "ZIWEI-IDENTITY-P0",
      locale: "en",
      chartVersionId: "chart-1",
      evidence,
      frozenFacts: {
        version: 1, capabilityId: "ziwei.identity.p0", chartVersionId: "chart-1", ruleVersion: "ziwei.identity.v1", evidenceVersion: 1,
        facts: { soulPalaceId: "ziwei.palace.life", bodyPalaceId: "ziwei.palace.career", transformations: ["ziwei.transformation.prosperity"] },
      },
      knowledgePassages: [{ id: "knowledge-1", content: "Approved English content." }],
      provenance: { evidenceVersion: 1, knowledgeVersion: REPORT_KNOWLEDGE_VERSION_V2, promptVersion: REPORT_PROMPT_VERSION_V2, templateVersion: "template.v1" },
      provider,
    });
    expect(result).toMatchObject({
      ok: true,
      value: {
        report: {
          locale: "en",
          sku: "ZIWEI-IDENTITY-P0",
          provenance: { chartVersionId: "chart-1", modelId: "canonical-model", promptVersion: REPORT_PROMPT_VERSION_V2 },
          professionalAdviceDisclaimer: CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER_EN,
        },
      },
    });
    expect(JSON.stringify(request)).not.toMatch(/chartVersionId|birth|email|order|persist|publish/i);
    expect(JSON.stringify(request)).toContain("soulPalaceId");
    expect((request as { system: string }).system).toMatch(/reflective|self-reflection/i);
    expect((request as { system: string }).system).toMatch(/English/i);
    expect((request as { system: string }).system).toMatch(/chart.*(?:calculation|calculat)|invent|fabricat/i);
    expect((request as { maxOutputTokens: number }).maxOutputTokens).toBe(6000);

    // Verify canonical title overwriting
    if (result.ok) {
      for (const sec of result.value.report.sections) {
        expect(sec.title).toBe(CANONICAL_IDENTITY_REPORT_TITLES_EN[sec.id]);
      }
      const cyclesSec = result.value.report.sections.find((s) => s.id === "cycles_and_timing");
      expect(cyclesSec?.narrative).toBe(DETERMINISTIC_CYCLES_NARRATIVE_EN);
      expect(cyclesSec?.claims).toEqual([]);
    }
  });

  it("instructs provider with exact structural constraints and plain language sequence without cycles_and_timing in required claims", async () => {
    let capturedSystem = "";
    const provider: AiProvider = {
      async generateStructured(candidate) {
        capturedSystem = candidate.system;
        return {
          ok: true,
          value: {
            value: {
              sections: IDENTITY_REPORT_SECTION_IDS.map((id, index) => ({
                id,
                title: `Mục ${index + 1}`,
                narrative: "Nội dung diễn giải phản chiếu.",
                claims: ["personal_summary", "primary_evidence", "strengths_and_resources", "tensions_and_blind_spots", "identity_analysis", "within_control"].includes(id)
                  ? [{
                    id: `claim-${index}`,
                    text: "Gợi ý tự phản chiếu.",
                    evidenceIds: ["ziwei.identity.life-palace"],
                    interpretationBoundCode: "reflective_identity_only",
                    confidence: "moderate",
                    limitations: ["Phụ thuộc vào giờ sinh."],
                    suggestedActions: [{ category: "reflect", text: "Ghi lại quan sát." }],
                  }]
                  : [],
              })),
              reflectionQuestions: ["Câu hỏi 1", "Câu hỏi 2", "Câu hỏi 3"],
              summaryActions: ["Hành động 1"],
            },
            providerId: "9router-an",
            modelId: "canonical-model",
          },
        } as never;
      },
    };
    const evidence: EvidenceSetV1 = {
      version: 1, capabilityId: "ziwei.identity.p0", chartVersionId: "chart-1", ruleVersion: "ziwei.identity.v1",
      items: [{
        id: "ziwei.identity.life-palace", factReferences: ["soulPalaceId"], confidence: "moderate",
        interpretationBounds: ["Reflective identity signal."], interpretationBoundCodes: ["reflective_identity_only"],
        limitations: ["Phụ thuộc vào giờ sinh."], riskTags: ["identity"], allowedActionCategories: ["reflect"],
      }, {
        id: "ziwei.identity.body-palace", factReferences: ["bodyPalaceId"], confidence: "moderate",
        interpretationBounds: ["Reflective identity signal."], interpretationBoundCodes: ["reflective_identity_only"],
        limitations: ["Phụ thuộc vào giờ sinh."], riskTags: ["identity"], allowedActionCategories: ["reflect"],
      }, {
        id: "ziwei.identity.transformations", factReferences: ["transformations"], confidence: "moderate",
        interpretationBounds: ["Reflective identity signal."], interpretationBoundCodes: ["reflective_identity_only"],
        limitations: ["Phụ thuộc vào giờ sinh."], riskTags: ["identity"], allowedActionCategories: ["reflect"],
      }],
    };
    await writeIdentityReportDraft({
      sku: "ZIWEI-IDENTITY-P0",
      locale: "vi",
      chartVersionId: "chart-1",
      evidence,
      frozenFacts: {
        version: 1, capabilityId: "ziwei.identity.p0", chartVersionId: "chart-1", ruleVersion: "ziwei.identity.v1", evidenceVersion: 1,
        facts: { soulPalaceId: "ziwei.palace.life", bodyPalaceId: "ziwei.palace.career", transformations: ["ziwei.transformation.prosperity"] },
      },
      knowledgePassages: [{ id: "knowledge-1", content: "Nội dung phê duyệt." }],
      provenance: { evidenceVersion: 1, knowledgeVersion: REPORT_KNOWLEDGE_VERSION_V2, promptVersion: REPORT_PROMPT_VERSION_V2, templateVersion: "template.v1" },
      provider,
    });

    expect(capturedSystem).toMatch(/sections.*reflectionQuestions.*summaryActions/);
    for (const sectionId of IDENTITY_REPORT_SECTION_IDS) {
      expect(capturedSystem).toContain(sectionId);
    }
    expect(capturedSystem).toMatch(/id.*title.*narrative.*claims/);
    expect(capturedSystem).toMatch(/id.*text.*evidenceIds.*interpretationBoundCode.*confidence.*limitations.*suggestedActions/);
    expect(capturedSystem).toMatch(/exactly one.*evidence/i);
    expect(capturedSystem).toMatch(/interpretationBoundCode/);
    expect(capturedSystem).toMatch(/confidence/);
    expect(capturedSystem).toMatch(/action/i);
    expect(capturedSystem).toMatch(/1-3/);
    expect(capturedSystem).toMatch(/0-2/);

    // Plain language sequence and style bans
    expect(capturedSystem).toMatch(/manifestation|daily/i);
    expect(capturedSystem).toMatch(/jargon/i);
    expect(capturedSystem).toMatch(/Barnum/i);

    // Required sections must NOT include cycles_and_timing
    const requiredMatch = capturedSystem.match(/These (?:six|7|seven) sections must have at least one claim:\s*([^\.]+)\./i);
    expect(requiredMatch?.[1]).not.toContain("cycles_and_timing");

    expect(capturedSystem).toMatch(/translate|rename|invent/i);
  });

  it("passes revision input with prior draft and critic notes when provided", async () => {
    let capturedUser = "";
    let capturedSystem = "";
    const provider: AiProvider = {
      async generateStructured(candidate) {
        capturedUser = candidate.user;
        capturedSystem = candidate.system;
        return {
          ok: true,
          value: {
            value: {
              sections: IDENTITY_REPORT_SECTION_IDS.map((id, index) => ({
                id,
                title: `Mục ${index + 1}`,
                narrative: "Nội dung phản chiếu.",
                claims: ["personal_summary", "primary_evidence", "strengths_and_resources", "tensions_and_blind_spots", "identity_analysis", "within_control"].includes(id)
                  ? [{
                    id: `claim-${index}`,
                    text: "Gợi ý tự phản chiếu.",
                    evidenceIds: ["ziwei.identity.life-palace"],
                    interpretationBoundCode: "reflective_identity_only",
                    confidence: "moderate",
                    limitations: ["Phụ thuộc vào giờ sinh."],
                    suggestedActions: [{ category: "reflect", text: "Ghi lại quan sát." }],
                  }]
                  : [],
              })),
              reflectionQuestions: ["Câu hỏi 1", "Câu hỏi 2", "Câu hỏi 3"],
              summaryActions: ["Hành động 1"],
            },
            providerId: "9router-an",
            modelId: "canonical-model",
          },
        } as never;
      },
    };

    const evidence: EvidenceSetV1 = {
      version: 1, capabilityId: "ziwei.identity.p0", chartVersionId: "chart-1", ruleVersion: "ziwei.identity.v1",
      items: [{
        id: "ziwei.identity.life-palace", factReferences: ["soulPalaceId"], confidence: "moderate",
        interpretationBounds: ["Reflective identity signal."], interpretationBoundCodes: ["reflective_identity_only"],
        limitations: ["Phụ thuộc vào giờ sinh."], riskTags: ["identity"], allowedActionCategories: ["reflect"],
      }, {
        id: "ziwei.identity.body-palace", factReferences: ["bodyPalaceId"], confidence: "moderate",
        interpretationBounds: ["Reflective identity signal."], interpretationBoundCodes: ["reflective_identity_only"],
        limitations: ["Phụ thuộc vào giờ sinh."], riskTags: ["identity"], allowedActionCategories: ["reflect"],
      }, {
        id: "ziwei.identity.transformations", factReferences: ["transformations"], confidence: "moderate",
        interpretationBounds: ["Reflective identity signal."], interpretationBoundCodes: ["reflective_identity_only"],
        limitations: ["Phụ thuộc vào giờ sinh."], riskTags: ["identity"], allowedActionCategories: ["reflect"],
      }],
    };

    await writeIdentityReportDraft({
      sku: "ZIWEI-IDENTITY-P0",
      locale: "vi",
      chartVersionId: "chart-1",
      evidence,
      frozenFacts: {
        version: 1, capabilityId: "ziwei.identity.p0", chartVersionId: "chart-1", ruleVersion: "ziwei.identity.v1", evidenceVersion: 1,
        facts: { soulPalaceId: "ziwei.palace.life", bodyPalaceId: "ziwei.palace.career", transformations: ["ziwei.transformation.prosperity"] },
      },
      knowledgePassages: [{ id: "knowledge-1", content: "Nội dung phê duyệt." }],
      provenance: { evidenceVersion: 1, knowledgeVersion: REPORT_KNOWLEDGE_VERSION_V2, promptVersion: REPORT_PROMPT_VERSION_V2, templateVersion: "template.v1" },
      provider,
      revision: {
        priorContent: {
          sections: [],
          reflectionQuestions: ["Câu hỏi cũ?"],
          summaryActions: ["Hành động cũ."],
        },
        criticNotes: ["Improve specificity of claims", "Avoid repetitive intros"],
      },
    });

    expect(capturedUser).toContain("criticNotes");
    expect(capturedUser).toContain("Improve specificity of claims");
    expect(capturedSystem).toMatch(/revision/i);
  });
});
