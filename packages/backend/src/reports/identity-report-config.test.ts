import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import { IDENTITY_REPORT_SECTION_IDS } from "@lasoviet/contracts";
import {
  CANONICAL_IDENTITY_REPORT_TITLES_EN,
  CANONICAL_IDENTITY_REPORT_TITLES_VI,
  CURRENT_REPORT_CONFIG_VERSION,
  CURRENT_REPORT_KNOWLEDGE_VERSION,
  CURRENT_REPORT_PROMPT_VERSION,
  CURRENT_REPORT_RENDER_VERSION,
  CURRENT_REPORT_TEMPLATE_VERSION,
  DETERMINISTIC_CYCLES_NARRATIVE_EN,
  DETERMINISTIC_CYCLES_NARRATIVE_VI,
  REPORT_CONFIG_VERSION_V1,
  REPORT_KNOWLEDGE_VERSION_V2,
  REPORT_PROMPT_VERSION_V2,
  REPORT_RENDER_VERSION_V1,
  REPORT_TEMPLATE_VERSION_V1,
} from "./identity-report-config.js";
import { validateKnowledgeManifest } from "../knowledge/knowledge-ingestion.service.js";

describe("identity report config", () => {
  it("exports exact version constants for V2 knowledge and prompt and V1 render/template/config", () => {
    expect(REPORT_KNOWLEDGE_VERSION_V2).toBe("ziwei.identity.knowledge.v2");
    expect(REPORT_PROMPT_VERSION_V2).toBe("ziwei.identity.prompt.v2");
    expect(REPORT_CONFIG_VERSION_V1).toBe("ziwei.identity.report.v1");
    expect(REPORT_TEMPLATE_VERSION_V1).toBe("identity-report-html.v1");
    expect(REPORT_RENDER_VERSION_V1).toBe("identity-report-pdf.v1");
    expect(CURRENT_REPORT_KNOWLEDGE_VERSION).toBe("ziwei.identity.knowledge.v2");
    expect(CURRENT_REPORT_PROMPT_VERSION).toBe("ziwei.identity.prompt.v2");
    expect(CURRENT_REPORT_CONFIG_VERSION).toBe("ziwei.identity.report.v1");
    expect(CURRENT_REPORT_TEMPLATE_VERSION).toBe("identity-report-html.v1");
    expect(CURRENT_REPORT_RENDER_VERSION).toBe("identity-report-pdf.v1");
  });

  it("exports canonical localized section titles covering all 11 sections exactly", () => {
    expect(Object.keys(CANONICAL_IDENTITY_REPORT_TITLES_VI)).toEqual(IDENTITY_REPORT_SECTION_IDS);
    expect(Object.keys(CANONICAL_IDENTITY_REPORT_TITLES_EN)).toEqual(IDENTITY_REPORT_SECTION_IDS);

    expect(CANONICAL_IDENTITY_REPORT_TITLES_VI).toEqual({
      personal_summary: "Tóm tắt cá nhân",
      data_and_method: "Dữ liệu và phương pháp",
      primary_evidence: "Căn cứ chính",
      strengths_and_resources: "Thế mạnh và nguồn lực",
      tensions_and_blind_spots: "Mâu thuẫn và điểm dễ mắc kẹt",
      identity_analysis: "Phân tích bản sắc",
      cycles_and_timing: "Chu kỳ và thời điểm",
      within_control: "Điều nằm trong tầm kiểm soát",
      reflection_questions: "Câu hỏi tự suy ngẫm",
      action_summary: "Tóm tắt hành động",
      limitations_and_disclaimer: "Giới hạn phương pháp",
    });

    expect(CANONICAL_IDENTITY_REPORT_TITLES_EN).toEqual({
      personal_summary: "Personal summary",
      data_and_method: "Data and method",
      primary_evidence: "Primary evidence",
      strengths_and_resources: "Strengths and resources",
      tensions_and_blind_spots: "Tensions and blind spots",
      identity_analysis: "Identity analysis",
      cycles_and_timing: "Cycles and timing",
      within_control: "Within your control",
      reflection_questions: "Reflection questions",
      action_summary: "Action summary",
      limitations_and_disclaimer: "Method limitations",
    });
  });

  it("exports deterministic cycles narrative matching exact required wording", () => {
    expect(DETERMINISTIC_CYCLES_NARRATIVE_VI).toBe(
      "Phiên bản báo cáo này chưa sử dụng dữ liệu đại hạn, tiểu hạn hoặc lưu niên, nên không đưa ra nhận định về thời điểm. Phần này sẽ được mở rộng khi dữ liệu vận hạn đã được kiểm chứng.",
    );
    expect(DETERMINISTIC_CYCLES_NARRATIVE_EN).toBe(
      "This report version does not yet use verified decadal, annual, or shorter-cycle data, so it does not make timing claims. This section will expand when validated timing evidence is available.",
    );
  });

  it("validates integrity and schema compliance of both V2 knowledge manifests", () => {
    const repoRoot = resolve(process.cwd());
    const viPath = resolve(repoRoot, "content/knowledge/vi/ziwei/identity-report-foundation.v2.json");
    const enPath = resolve(repoRoot, "content/knowledge/en/ziwei/identity-report-foundation.v2.json");

    const viRaw = JSON.parse(readFileSync(viPath, "utf8"));
    const enRaw = JSON.parse(readFileSync(enPath, "utf8"));

    const viValidation = validateKnowledgeManifest(viRaw, { repositoryRoot: repoRoot });
    expect(viValidation.ok).toBe(true);
    if (!viValidation.ok) throw new Error("VI manifest invalid");

    const enValidation = validateKnowledgeManifest(enRaw, { repositoryRoot: repoRoot });
    expect(enValidation.ok).toBe(true);
    if (!enValidation.ok) throw new Error("EN manifest invalid");

    expect(viValidation.value.knowledgeVersion).toBe("ziwei.identity.knowledge.v2");
    expect(enValidation.value.knowledgeVersion).toBe("ziwei.identity.knowledge.v2");
    expect(viValidation.value.approval.status).toBe("approved");
    expect(viValidation.value.approval.approver).toBe("phase04-content-review");
    expect(viValidation.value.permittedUse).toBe("first_party");
    expect(enValidation.value.approval.status).toBe("approved");
    expect(enValidation.value.approval.approver).toBe("phase04-content-review");
    expect(enValidation.value.permittedUse).toBe("first_party");

    for (const sectionId of IDENTITY_REPORT_SECTION_IDS) {
      const viHasSection = viValidation.value.chunks.some((chunk) => chunk.reportSections.includes(sectionId));
      const enHasSection = enValidation.value.chunks.some((chunk) => chunk.reportSections.includes(sectionId));
      expect(viHasSection).toBe(true);
      expect(enHasSection).toBe(true);
    }
  });
});
