import { describe, expect, it } from "vitest";

import { IDENTITY_REPORT_SECTION_IDS, type EvidenceSetV1 } from "@lasoviet/contracts";

import type { AiProvider } from "../ai/ai-provider.js";
import { writeIdentityReportDraft } from "./identity-report-writer.js";

describe("identity report writer", () => {
  it("sends resolved frozen facts only and assembles trusted provenance after model content", async () => {
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
                title: `Mục ${index + 1}`,
                narrative: "Bạn nên quan sát bình tĩnh và điều chỉnh theo điều kiện thực tế.",
                claims: ["personal_summary", "primary_evidence", "strengths_and_resources", "tensions_and_blind_spots", "identity_analysis", "cycles_and_timing", "within_control"].includes(id)
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
              professionalAdviceDisclaimer: "Nội dung không thay thế tư vấn y tế, sức khỏe tâm thần, pháp lý, tài chính hoặc chuyên môn được cấp phép.",
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
      chartVersionId: "chart-1",
      evidence,
      frozenFacts: {
        version: 1, capabilityId: "ziwei.identity.p0", chartVersionId: "chart-1", ruleVersion: "ziwei.identity.v1", evidenceVersion: 1,
        facts: { soulPalaceId: "ziwei.palace.life", bodyPalaceId: "ziwei.palace.career", transformations: ["ziwei.transformation.prosperity"] },
      },
      knowledgePassages: [{ id: "knowledge-1", content: "Nội dung đã được phê duyệt." }],
      provenance: { evidenceVersion: 1, knowledgeVersion: "knowledge.vi.v1", promptVersion: "prompt.v1", templateVersion: "template.v1" },
      provider,
    });
    expect(result).toMatchObject({ ok: true, value: { report: { provenance: { chartVersionId: "chart-1", modelId: "canonical-model" } } } });
    expect(JSON.stringify(request)).not.toMatch(/chartVersionId|birth|email|order|persist|publish/i);
    expect(JSON.stringify(request)).toContain("soulPalaceId");
  });
});
