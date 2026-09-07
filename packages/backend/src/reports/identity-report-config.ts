import type { IdentityReportSectionId } from "@lasoviet/contracts";

export const REPORT_KNOWLEDGE_VERSION_V1 = "ziwei.identity.knowledge.v1" as const;
export const REPORT_KNOWLEDGE_VERSION_V2 = "ziwei.identity.knowledge.v2" as const;
export const REPORT_PROMPT_VERSION_V1 = "ziwei.identity.prompt.v1" as const;
export const REPORT_PROMPT_VERSION_V2 = "ziwei.identity.prompt.v2" as const;
export const REPORT_CONFIG_VERSION_V1 = "ziwei.identity.report.v1" as const;
export const REPORT_TEMPLATE_VERSION_V1 = "identity-report-html.v1" as const;
export const REPORT_RENDER_VERSION_V1 = "identity-report-pdf.v1" as const;

export const CURRENT_REPORT_KNOWLEDGE_VERSION = REPORT_KNOWLEDGE_VERSION_V2;
export const CURRENT_REPORT_PROMPT_VERSION = REPORT_PROMPT_VERSION_V2;
export const CURRENT_REPORT_CONFIG_VERSION = REPORT_CONFIG_VERSION_V1;
export const CURRENT_REPORT_TEMPLATE_VERSION = REPORT_TEMPLATE_VERSION_V1;
export const CURRENT_REPORT_RENDER_VERSION = REPORT_RENDER_VERSION_V1;

export const CANONICAL_IDENTITY_REPORT_TITLES_VI: Record<IdentityReportSectionId, string> = {
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
};

export const CANONICAL_IDENTITY_REPORT_TITLES_EN: Record<IdentityReportSectionId, string> = {
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
};

export const DETERMINISTIC_CYCLES_NARRATIVE_VI =
  "Phiên bản báo cáo này chưa sử dụng dữ liệu đại hạn, tiểu hạn hoặc lưu niên, nên không đưa ra nhận định về thời điểm. Phần này sẽ được mở rộng khi dữ liệu vận hạn đã được kiểm chứng.";

export const DETERMINISTIC_CYCLES_NARRATIVE_EN =
  "This report version does not yet use verified decadal, annual, or shorter-cycle data, so it does not make timing claims. This section will expand when validated timing evidence is available.";
