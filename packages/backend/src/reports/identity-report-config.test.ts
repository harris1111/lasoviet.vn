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
  REPORT_CONFIG_VERSION_V3,
  REPORT_CONTENT_VERSION_COMPREHENSIVE_V1,
  REPORT_KNOWLEDGE_VERSION_V3,
  REPORT_PROMPT_VERSION_V3,
  REPORT_TEMPLATE_VERSION_V3,
  currentReportVersions,
  REPORT_KNOWLEDGE_VERSION_V4,
  REPORT_PROMPT_VERSION_V4,
  REPORT_PROMPT_VERSION_V4_0_1,
  REPORT_CONFIG_VERSION_V4,
  REPORT_CONFIG_VERSION_V4_1_SECTIONED,
  REPORT_QUALITY_VERSION_COMPREHENSIVE_V1,
  REPORT_CONTENT_VERSION_COMPREHENSIVE_V2,
  REPORT_PROMPT_VERSION_V4_1_SENSITIVITY,
  REPORT_PROMPT_VERSION_V4_1_1_SENSITIVITY,
  REPORT_CONFIG_VERSION_V4_1_SECTIONED_SENSITIVITY,
  REPORT_CONFIG_VERSION_V4_1_1_SECTIONED_SENSITIVITY,
  REPORT_QUALITY_VERSION_COMPREHENSIVE_V2_SENSITIVITY,
  REPORT_QUALITY_VERSION_COMPREHENSIVE_V2_1_SENSITIVITY,
  REPORT_CONTENT_VERSION_COMPREHENSIVE_V3,
  REPORT_TEMPLATE_VERSION_V4_1_SENSITIVITY,
  REPORT_RENDER_VERSION_V4_1_SENSITIVITY,
  REPORT_TIMING_RULE_VERSION_V1,
  REPORT_SENSITIVITY_RULE_VERSION_V1,
  v4ReportVersions,
  v4_0_1ReportVersions,
  v4SectionedReportVersions,
  v4_1SensitivityReportVersions,
  v4_1_1SensitivityReportVersions,
  v4_1_1KeyConfigSensitivityReportVersions,
  resolveReportRuntimePolicy,
  deriveReportTimingLineage,
  REPORT_CONFIG_VERSION_V1,
  REPORT_KNOWLEDGE_VERSION_V1,
  REPORT_KNOWLEDGE_VERSION_V2,
  REPORT_PROMPT_VERSION_V2,
  REPORT_RENDER_VERSION_V1,
  REPORT_TEMPLATE_VERSION_V1,
} from "./identity-report-config.js";
import { validateKnowledgeManifest } from "../knowledge/knowledge-ingestion.service.js";

describe("identity report config", () => {
  it("exports exact version constants for V2 knowledge and prompt and V1 render/template/config", () => {
    expect(REPORT_KNOWLEDGE_VERSION_V1).toBe("ziwei.identity.knowledge.v1");
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

    expect(REPORT_KNOWLEDGE_VERSION_V3).toBe("ziwei.comprehensive.knowledge.v3");
    expect(REPORT_PROMPT_VERSION_V3).toBe("ziwei.comprehensive.prompt.v3");
    expect(REPORT_CONFIG_VERSION_V3).toBe("ziwei.comprehensive.report.v3");
    expect(REPORT_TEMPLATE_VERSION_V3).toBe("ziwei-comprehensive-html.v1");
    expect(REPORT_CONTENT_VERSION_COMPREHENSIVE_V1).toBe("ziwei-comprehensive.v1");
  });

  it("currentReportVersions returns V4 for Vietnamese and V2 for English", () => {
    const viVersions = currentReportVersions("vi");
    expect(viVersions).toEqual({
      family: "v4",
      knowledgeVersion: "ziwei.comprehensive.knowledge.v3",
      promptVersion: "ziwei.comprehensive.prompt.v4",
      reportConfigVersion: "ziwei.comprehensive.report.v4",
      templateVersion: "ziwei-comprehensive-html.v1",
      contentVersion: "ziwei-comprehensive.v2",
      timingRuleVersion: "ziwei.timing.v1",
    });

    const enVersions = currentReportVersions("en");
    expect(enVersions).toEqual({
      family: "v2",
      knowledgeVersion: REPORT_KNOWLEDGE_VERSION_V2,
      promptVersion: REPORT_PROMPT_VERSION_V2,
      reportConfigVersion: REPORT_CONFIG_VERSION_V1,
      templateVersion: REPORT_TEMPLATE_VERSION_V1,
    });
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
  it("exports V4 constants and timing/sensitivity rule strings", () => {
    expect(REPORT_KNOWLEDGE_VERSION_V4).toBe("ziwei.comprehensive.knowledge.v4");
    expect(REPORT_PROMPT_VERSION_V4).toBe("ziwei.comprehensive.prompt.v4");
    expect(REPORT_PROMPT_VERSION_V4_0_1).toBe("ziwei.comprehensive.prompt.v4.0.1");
    expect(REPORT_CONFIG_VERSION_V4).toBe("ziwei.comprehensive.report.v4");
    expect(REPORT_CONFIG_VERSION_V4_1_SECTIONED).toBe("ziwei.comprehensive.report.v4.1-sectioned");
    expect(REPORT_QUALITY_VERSION_COMPREHENSIVE_V1).toBe("ziwei.comprehensive.quality.v1");
    expect(REPORT_CONTENT_VERSION_COMPREHENSIVE_V2).toBe("ziwei-comprehensive.v2");
    expect(REPORT_PROMPT_VERSION_V4_1_SENSITIVITY).toBe("ziwei.comprehensive.prompt.v4.1-sensitivity");
    expect(REPORT_PROMPT_VERSION_V4_1_1_SENSITIVITY).toBe("ziwei.comprehensive.prompt.v4.1.1-sensitivity");
    expect(REPORT_CONFIG_VERSION_V4_1_SECTIONED_SENSITIVITY).toBe("ziwei.comprehensive.report.v4.1-sectioned-sensitivity");
    expect(REPORT_QUALITY_VERSION_COMPREHENSIVE_V2_SENSITIVITY).toBe("ziwei.comprehensive.quality.v2-sensitivity");
    expect(REPORT_CONFIG_VERSION_V4_1_1_SECTIONED_SENSITIVITY).toBe("ziwei.comprehensive.report.v4.1.1-sectioned-sensitivity");
    expect(REPORT_QUALITY_VERSION_COMPREHENSIVE_V2_1_SENSITIVITY).toBe("ziwei.comprehensive.quality.v2.1-sensitivity");
    expect(REPORT_CONTENT_VERSION_COMPREHENSIVE_V3).toBe("ziwei-comprehensive.v3");
    expect(REPORT_TEMPLATE_VERSION_V4_1_SENSITIVITY).toBe("ziwei-comprehensive-html.v2");
    expect(REPORT_RENDER_VERSION_V4_1_SENSITIVITY).toBe("identity-report-pdf.v2");
    expect(REPORT_TIMING_RULE_VERSION_V1).toBe("ziwei.timing.v1");
    expect(REPORT_SENSITIVITY_RULE_VERSION_V1).toBe("ziwei.sensitivity.v1");
  });

  it("v4ReportVersions returns family v4 matching activated currentReportVersions for Vietnamese while legacy V3 constants remain available", () => {
    const v4 = v4ReportVersions();
    expect(v4).toEqual({
      family: "v4",
      knowledgeVersion: "ziwei.comprehensive.knowledge.v3",
      promptVersion: "ziwei.comprehensive.prompt.v4",
      reportConfigVersion: "ziwei.comprehensive.report.v4",
      templateVersion: "ziwei-comprehensive-html.v1",
      contentVersion: "ziwei-comprehensive.v2",
      timingRuleVersion: "ziwei.timing.v1",
    });

    // Verify currentReportVersions matches v4ReportVersions for Vietnamese
    expect(currentReportVersions("vi")).toEqual(v4);

    // Regression check: legacy V3 constants remain available for existing reports
    expect(REPORT_KNOWLEDGE_VERSION_V3).toBe("ziwei.comprehensive.knowledge.v3");
    expect(REPORT_PROMPT_VERSION_V3).toBe("ziwei.comprehensive.prompt.v3");
    expect(REPORT_CONFIG_VERSION_V3).toBe("ziwei.comprehensive.report.v3");
    expect(REPORT_TEMPLATE_VERSION_V3).toBe("ziwei-comprehensive-html.v1");
    expect(REPORT_CONTENT_VERSION_COMPREHENSIVE_V1).toBe("ziwei-comprehensive.v1");
  });

  it("provides an inactive V4.0.1 selection with the legacy V4 config, content, template, and timing versions", () => {
    expect(v4_0_1ReportVersions()).toEqual({
      family: "v4",
      knowledgeVersion: "ziwei.comprehensive.knowledge.v3",
      promptVersion: "ziwei.comprehensive.prompt.v4.0.1",
      reportConfigVersion: "ziwei.comprehensive.report.v4",
      templateVersion: "ziwei-comprehensive-html.v1",
      contentVersion: "ziwei-comprehensive.v2",
      timingRuleVersion: "ziwei.timing.v1",
    });

    expect(currentReportVersions("vi")).toEqual(v4ReportVersions("vi"));
    expect(currentReportVersions("vi").promptVersion).toBe(REPORT_PROMPT_VERSION_V4);
  });

  it("provides an inactive sectioned V4 selection and a closed runtime policy without changing paid selection", () => {
    expect(v4SectionedReportVersions()).toEqual({
      family: "v4",
      knowledgeVersion: "ziwei.comprehensive.knowledge.v3",
      promptVersion: "ziwei.comprehensive.prompt.v4.0.1",
      reportConfigVersion: "ziwei.comprehensive.report.v4.1-sectioned",
      qualityVersion: "ziwei.comprehensive.quality.v1",
      templateVersion: "ziwei-comprehensive-html.v1",
      contentVersion: "ziwei-comprehensive.v2",
      timingRuleVersion: "ziwei.timing.v1",
    });
    expect(resolveReportRuntimePolicy(REPORT_CONFIG_VERSION_V4_1_SECTIONED)).toEqual({
      maximumWallClockMs: 3_600_000,
    });
    expect(() => resolveReportRuntimePolicy(REPORT_CONFIG_VERSION_V4)).toThrow(
      "REPORT_RUNTIME_POLICY_UNKNOWN_CONFIG",
    );
    expect(currentReportVersions("vi")).toEqual(v4ReportVersions("vi"));
  });

  it("provides the dormant V4.1 sensitivity tuple and matching runtime policy", () => {
    expect(v4_1SensitivityReportVersions()).toEqual({
      family: "v4_1",
      knowledgeVersion: "ziwei.comprehensive.knowledge.v4",
      promptVersion: "ziwei.comprehensive.prompt.v4.1-sensitivity",
      reportConfigVersion: "ziwei.comprehensive.report.v4.1-sectioned-sensitivity",
      qualityVersion: "ziwei.comprehensive.quality.v2-sensitivity",
      contentVersion: "ziwei-comprehensive.v3",
      templateVersion: "ziwei-comprehensive-html.v2",
      renderVersion: "identity-report-pdf.v2",
      timingRuleVersion: "ziwei.timing.v1",
    });
    expect(resolveReportRuntimePolicy(REPORT_CONFIG_VERSION_V4_1_SECTIONED_SENSITIVITY)).toEqual({
      maximumWallClockMs: 3_600_000,
    });
    expect(currentReportVersions("vi")).toEqual(v4ReportVersions("vi"));
  });

  it("provides the additive V4.1.1 sensitivity tuple without remapping V4.1", () => {
    expect(v4_1SensitivityReportVersions().reportConfigVersion).toBe(
      "ziwei.comprehensive.report.v4.1-sectioned-sensitivity",
    );
    expect(v4_1_1SensitivityReportVersions()).toEqual({
      family: "v4_1",
      knowledgeVersion: "ziwei.comprehensive.knowledge.v4",
      promptVersion: "ziwei.comprehensive.prompt.v4.1-sensitivity",
      reportConfigVersion: "ziwei.comprehensive.report.v4.1.1-sectioned-sensitivity",
      qualityVersion: "ziwei.comprehensive.quality.v2.1-sensitivity",
      contentVersion: "ziwei-comprehensive.v3",
      templateVersion: "ziwei-comprehensive-html.v2",
      renderVersion: "identity-report-pdf.v2",
      timingRuleVersion: "ziwei.timing.v1",
    });
    expect(resolveReportRuntimePolicy(REPORT_CONFIG_VERSION_V4_1_1_SECTIONED_SENSITIVITY)).toEqual({
      maximumWallClockMs: 3_600_000,
    });
    expect(currentReportVersions("vi")).toEqual(v4ReportVersions("vi"));
  });

  it("adds the key-configuration prompt tuple without changing the durable V4.1.1 resolver", () => {
    expect(v4_1_1SensitivityReportVersions().promptVersion).toBe(
      REPORT_PROMPT_VERSION_V4_1_SENSITIVITY,
    );
    expect(v4_1_1KeyConfigSensitivityReportVersions()).toEqual({
      family: "v4_1",
      knowledgeVersion: "ziwei.comprehensive.knowledge.v4",
      promptVersion: "ziwei.comprehensive.prompt.v4.1.1-sensitivity",
      reportConfigVersion: "ziwei.comprehensive.report.v4.1.1-sectioned-sensitivity",
      qualityVersion: "ziwei.comprehensive.quality.v2.1-sensitivity",
      contentVersion: "ziwei-comprehensive.v3",
      templateVersion: "ziwei-comprehensive-html.v2",
      renderVersion: "identity-report-pdf.v2",
      timingRuleVersion: "ziwei.timing.v1",
    });
  });

  it("deriveReportTimingLineage converts Date to Asia/Ho_Chi_Minh asOfDate and derives matching targetYear", () => {
    // 2026-12-31 20:00:00 UTC -> 2027-01-01 03:00:00 in Vietnam (+7)
    const newYearEveUtc = new Date("2026-12-31T20:00:00.000Z");
    const lineage1 = deriveReportTimingLineage(newYearEveUtc);
    expect(lineage1).toEqual({
      asOfDate: "2027-01-01",
      targetYear: 2027,
      timingRuleVersion: "ziwei.timing.v1",
      sensitivityRuleVersion: "ziwei.sensitivity.v1",
    });

    // 2026-12-31 16:59:59 UTC -> 2026-12-31 23:59:59 in Vietnam (+7)
    const beforeMidnightUtc = new Date("2026-12-31T16:59:59.000Z");
    const lineage2 = deriveReportTimingLineage(beforeMidnightUtc);
    expect(lineage2).toEqual({
      asOfDate: "2026-12-31",
      targetYear: 2026,
      timingRuleVersion: "ziwei.timing.v1",
      sensitivityRuleVersion: "ziwei.sensitivity.v1",
    });
  });
});
