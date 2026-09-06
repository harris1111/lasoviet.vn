import { describe, expect, it } from "vitest";

import {
  CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER,
  CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER_EN,
  IDENTITY_REPORT_SECTION_IDS,
  type IdentityReportV1,
} from "@lasoviet/contracts";

import { renderIdentityReportHtml } from "./identity-report-html.js";

function sampleVietnameseReport(): IdentityReportV1 {
  return {
    version: 1,
    sku: "ZIWEI-IDENTITY-P0",
    capabilityId: "ziwei.identity.p0",
    locale: "vi",
    provenance: {
      chartVersionId: "chart-1",
      ruleVersion: "ziwei.identity.v1",
      evidenceVersion: 1,
      knowledgeVersion: "knowledge.vi.v1",
      providerId: "9router-an",
      modelId: "canonical-model",
      promptVersion: "prompt.v1",
      templateVersion: "template.v1",
    },
    sections: IDENTITY_REPORT_SECTION_IDS.map((id, index) => ({
      id,
      title: `Tiêu đề mục ${index + 1}`,
      narrative: `Lời dẫn cho mục ${index + 1} cần được quan sát bình tĩnh và điều chỉnh theo thực tế.`,
      claims: ["data_and_method", "reflection_questions", "action_summary", "limitations_and_disclaimer"].includes(id)
        ? []
        : [{
          id: `claim-${index}`,
          text: `Nhận định cốt lõi số ${index + 1} mang tính chiêm nghiệm cá nhân.`,
          evidenceIds: ["ziwei.identity.life-palace"],
          interpretationBoundCode: "reflective_identity_only",
          confidence: "moderate",
          limitations: [`Giới hạn của nhận định ${index + 1} phụ thuộc giờ sinh.`],
          suggestedActions: [{ category: "reflect", text: `Hành động gợi ý cho mục ${index + 1}.` }],
        }],
    })),
    reflectionQuestions: [
      "Bạn coi trọng giá trị nào nhất trong công việc hiện tại?",
      "Môi trường nào giúp bạn phát huy sự điềm tĩnh tự nhiên?",
      "Bước thử nghiệm nhỏ nào bạn có thể thực hiện trong tuần?",
    ],
    summaryActions: [
      "Thực hiện một cuộc trò chuyện thẳng thắn và bình tĩnh.",
      "Ghi chép lại các tình huống lặp lại trong tuần.",
    ],
    professionalAdviceDisclaimer: CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER,
  };
}

function sampleEnglishReport(): IdentityReportV1 {
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
      modelId: "canonical-model",
      promptVersion: "prompt.v1",
      templateVersion: "template.v1",
    },
    sections: IDENTITY_REPORT_SECTION_IDS.map((id, index) => ({
      id,
      title: `Section ${index + 1} Title`,
      narrative: `Narrative for section ${index + 1} encourages steady reflection and grounded action.`,
      claims: ["data_and_method", "reflection_questions", "action_summary", "limitations_and_disclaimer"].includes(id)
        ? []
        : [{
          id: `claim-${index}`,
          text: `Core reflective insight ${index + 1} based on verified evidence bounds.`,
          evidenceIds: ["ziwei.identity.life-palace"],
          interpretationBoundCode: "reflective_identity_only",
          confidence: "moderate",
          limitations: [`Limitation for claim ${index + 1} depends on birth time accuracy.`],
          suggestedActions: [{ category: "reflect", text: `Suggested action for section ${index + 1}.` }],
        }],
    })),
    reflectionQuestions: [
      "What core value matters most in your daily decisions?",
      "Which environment best supports your natural focus?",
      "What small experiment can you run this week?",
    ],
    summaryActions: [
      "Have one calm, deliberate conversation this week.",
      "Write down recurring patterns observed over seven days.",
    ],
    professionalAdviceDisclaimer: CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER_EN,
  };
}

describe("identity report html renderer", () => {
  it("returns a byte-identical complete HTML document across repeated renders", () => {
    const report = sampleVietnameseReport();
    const first = renderIdentityReportHtml(report);
    const second = renderIdentityReportHtml(report);

    expect(first).toBe(second);
    expect(first).toContain("<!DOCTYPE html>");
    expect(first).toContain('<html lang="vi">');
    expect(first).toContain("</html>");
  });

  it("sets lang='en' and includes the exact English disclaimer for an English report", () => {
    const report = sampleEnglishReport();
    const html = renderIdentityReportHtml(report);

    expect(html).toContain('<html lang="en">');
    expect(html).toContain(CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER_EN);
  });

  it("renders all canonical sections in order with all required text fields", () => {
    const report = sampleVietnameseReport();
    const html = renderIdentityReportHtml(report);

    let lastIndex = -1;
    for (const section of report.sections) {
      const titleIndex = html.indexOf(section.title);
      expect(titleIndex).toBeGreaterThan(lastIndex);
      lastIndex = titleIndex;

      expect(html).toContain(section.narrative);
      for (const claim of section.claims) {
        expect(html).toContain(claim.text);
        claim.limitations.forEach((limitation) => expect(html).toContain(limitation));
        claim.suggestedActions.forEach((action) => expect(html).toContain(action.text));
      }
    }

    report.reflectionQuestions.forEach((question) => expect(html).toContain(question));
    report.summaryActions.forEach((action) => expect(html).toContain(action));
    expect(html).toContain(report.professionalAdviceDisclaimer);
  });

  it("does not leak evidence IDs, provenance identifiers, or model metadata into rendered HTML", () => {
    const report = sampleVietnameseReport();
    const html = renderIdentityReportHtml(report);

    expect(html).not.toContain("ziwei.identity.life-palace");
    expect(html).not.toContain("chart-1");
    expect(html).not.toContain("canonical-model");
    expect(html).not.toContain("knowledge.vi.v1");
    expect(html).not.toContain("9router-an");
  });

  it("escapes hostile content (&, <, >, \", ') and excludes executable or external markup across all text fields", () => {
    const hostile = sampleEnglishReport();
    const payload = 'Hostile <script>alert("xss")</script> & \'quotes\' <img src="x" onerror="steal()" />';

    hostile.sections.forEach((section, index) => {
      section.title = `Hostile Title ${index + 1} <script>alert(1)</script>`;
      section.narrative = `Hostile Narrative ${index + 1} & 'quotes' <iframe src="evil.html"></iframe>`;
      section.claims.forEach((claim) => {
        claim.text = payload;
        claim.limitations = [payload];
        claim.suggestedActions = [{ category: "reflect", text: payload }];
      });
    });
    hostile.reflectionQuestions = [payload, payload, payload];
    hostile.summaryActions = [payload, payload];

    const html = renderIdentityReportHtml(hostile);

    expect(html).not.toContain("<script>");
    expect(html).not.toContain("</script>");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<iframe");
    expect(html).not.toMatch(/<script\b/i);
    expect(html).not.toMatch(/https?:\/\//i);

    expect(html).toContain("&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;");
    expect(html).toContain("&amp;");
    expect(html).toMatch(/(&#39;|&#x27;|&apos;)quotes\1/);
  });
});
