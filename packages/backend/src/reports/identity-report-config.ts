import type { IdentityReportSectionId, ZiweiPalaceId } from "@lasoviet/contracts";
import { getVietnamCalendarDayBounds } from "../commerce/payment-claim-time.js";

export const REPORT_KNOWLEDGE_VERSION_V1 = "ziwei.identity.knowledge.v1" as const;
export const REPORT_KNOWLEDGE_VERSION_V2 = "ziwei.identity.knowledge.v2" as const;
export const REPORT_PROMPT_VERSION_V1 = "ziwei.identity.prompt.v1" as const;
export const REPORT_PROMPT_VERSION_V2 = "ziwei.identity.prompt.v2" as const;
export const REPORT_CONFIG_VERSION_V1 = "ziwei.identity.report.v1" as const;
export const REPORT_TEMPLATE_VERSION_V1 = "identity-report-html.v1" as const;
export const REPORT_RENDER_VERSION_V1 = "identity-report-pdf.v1" as const;

export const REPORT_KNOWLEDGE_VERSION_V3 = "ziwei.comprehensive.knowledge.v3" as const;
export const REPORT_PROMPT_VERSION_V3 = "ziwei.comprehensive.prompt.v3" as const;
export const REPORT_CONFIG_VERSION_V3 = "ziwei.comprehensive.report.v3" as const;
export const REPORT_TEMPLATE_VERSION_V3 = "ziwei-comprehensive-html.v1" as const;
export const REPORT_CONTENT_VERSION_COMPREHENSIVE_V1 = "ziwei-comprehensive.v1" as const;

export const REPORT_KNOWLEDGE_VERSION_V4 = "ziwei.comprehensive.knowledge.v4" as const;
export const REPORT_PROMPT_VERSION_V4 = "ziwei.comprehensive.prompt.v4" as const;
export const REPORT_CONFIG_VERSION_V4 = "ziwei.comprehensive.report.v4" as const;
export const REPORT_CONTENT_VERSION_COMPREHENSIVE_V2 = "ziwei-comprehensive.v2" as const;

export const REPORT_TIMING_RULE_VERSION_V1 = "ziwei.timing.v1" as const;
export const REPORT_SENSITIVITY_RULE_VERSION_V1 = "ziwei.sensitivity.v1" as const;

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

export const CANONICAL_COMPREHENSIVE_SECTION_TITLES = {
  overview: "Tổng quan lá số",
  coreAxis: "Mệnh, Thân và động lực cốt lõi",
  palaces: "Luận giải mười hai cung",
  thematic: "Tổng hợp theo lĩnh vực",
  strengthsAndTensions: "Điểm mạnh, điểm vướng và điều kiện phát huy",
  practicalDirection: "Định hướng thực tế",
} as const;

export const CANONICAL_PALACE_TITLES_VI: Record<ZiweiPalaceId, string> = {
  "ziwei.palace.life": "Cung Mệnh",
  "ziwei.palace.siblings": "Cung Huynh Đệ",
  "ziwei.palace.spouse": "Cung Phu Thê",
  "ziwei.palace.children": "Cung Tử Tức",
  "ziwei.palace.wealth": "Cung Tài Bạch",
  "ziwei.palace.health": "Cung Tật Ách",
  "ziwei.palace.travel": "Cung Thiên Di",
  "ziwei.palace.friends": "Cung Nô Bộc",
  "ziwei.palace.career": "Cung Quan Lộc",
  "ziwei.palace.property": "Cung Điền Trạch",
  "ziwei.palace.fortune": "Cung Phúc Đức",
  "ziwei.palace.parents": "Cung Phụ Mẫu",
};

export const CANONICAL_THEMATIC_TITLES_VI: Record<
  "career_wealth" | "relationships_family" | "social_environment" | "wellbeing_inner_resources",
  string
> = {
  career_wealth: "Sự nghiệp và tài chính",
  relationships_family: "Quan hệ và gia đình",
  social_environment: "Môi trường xã hội",
  wellbeing_inner_resources: "Sức khỏe và nội tâm",
};

export type ReportVersionSelectionV2 = {
  family: "v2";
  knowledgeVersion: typeof REPORT_KNOWLEDGE_VERSION_V2;
  promptVersion: typeof REPORT_PROMPT_VERSION_V2;
  reportConfigVersion: typeof REPORT_CONFIG_VERSION_V1;
  templateVersion: typeof REPORT_TEMPLATE_VERSION_V1;
};

export type ReportVersionSelectionV3 = {
  family: "v3";
  knowledgeVersion: typeof REPORT_KNOWLEDGE_VERSION_V3;
  promptVersion: typeof REPORT_PROMPT_VERSION_V3;
  reportConfigVersion: typeof REPORT_CONFIG_VERSION_V3;
  templateVersion: typeof REPORT_TEMPLATE_VERSION_V3;
};

export type ReportVersionSelectionV4 = {
  family: "v4";
  knowledgeVersion: typeof REPORT_KNOWLEDGE_VERSION_V3;
  promptVersion: typeof REPORT_PROMPT_VERSION_V4;
  reportConfigVersion: typeof REPORT_CONFIG_VERSION_V4;
  templateVersion: typeof REPORT_TEMPLATE_VERSION_V3;
  contentVersion: typeof REPORT_CONTENT_VERSION_COMPREHENSIVE_V2;
  timingRuleVersion: typeof REPORT_TIMING_RULE_VERSION_V1;
};

export type ReportVersionSelection =
  | ReportVersionSelectionV2
  | ReportVersionSelectionV3
  | ReportVersionSelectionV4;

export type ReportVersionResolver = (locale: string) => ReportVersionSelection;

export function currentReportVersions(locale: string): ReportVersionSelectionV2 | ReportVersionSelectionV4 {
  return locale === "vi"
    ? v4ReportVersions("vi")
    : { family: "v2" as const, knowledgeVersion: REPORT_KNOWLEDGE_VERSION_V2, promptVersion: REPORT_PROMPT_VERSION_V2, reportConfigVersion: REPORT_CONFIG_VERSION_V1, templateVersion: REPORT_TEMPLATE_VERSION_V1 };
}

export function v4ReportVersions(_locale: string = "vi"): ReportVersionSelectionV4 {
  return {
    family: "v4",
    knowledgeVersion: REPORT_KNOWLEDGE_VERSION_V3,
    promptVersion: REPORT_PROMPT_VERSION_V4,
    reportConfigVersion: REPORT_CONFIG_VERSION_V4,
    templateVersion: REPORT_TEMPLATE_VERSION_V3,
    contentVersion: REPORT_CONTENT_VERSION_COMPREHENSIVE_V2,
    timingRuleVersion: REPORT_TIMING_RULE_VERSION_V1,
  };
}

export type ReportTimingLineage = {
  asOfDate: string;
  targetYear: number;
  timingRuleVersion: string;
  sensitivityRuleVersion: string;
};

export function deriveReportTimingLineage(
  now: Date,
  options?: {
    timingRuleVersion?: string;
    sensitivityRuleVersion?: string;
  },
): ReportTimingLineage {
  const { localDateKey } = getVietnamCalendarDayBounds(now);
  const targetYear = parseInt(localDateKey.slice(0, 4), 10);
  return {
    asOfDate: localDateKey,
    targetYear,
    timingRuleVersion: options?.timingRuleVersion ?? REPORT_TIMING_RULE_VERSION_V1,
    sensitivityRuleVersion: options?.sensitivityRuleVersion ?? REPORT_SENSITIVITY_RULE_VERSION_V1,
  };
}

export const DETERMINISTIC_CYCLES_NARRATIVE_VI =
  "Phiên bản báo cáo này chưa sử dụng dữ liệu đại hạn, tiểu hạn hoặc lưu niên, nên không đưa ra nhận định về thời điểm. Phần này sẽ được mở rộng khi dữ liệu vận hạn đã được kiểm chứng.";

export const DETERMINISTIC_CYCLES_NARRATIVE_EN =
  "This report version does not yet use verified decadal, annual, or shorter-cycle data, so it does not make timing claims. This section will expand when validated timing evidence is available.";
