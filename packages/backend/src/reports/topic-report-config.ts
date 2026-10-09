import type { ZiweiTopicDeepDiveId } from "@lasoviet/contracts";
import {
  REPORT_KNOWLEDGE_VERSION_V4,
  REPORT_TIMING_RULE_VERSION_V1,
  CURRENT_REPORT_RENDER_VERSION,
} from "./identity-report-config.js";

export const REPORT_CONFIG_VERSION_TOPIC_DEEP_DIVE_V1 = "ziwei.topic-deep-dive.report.v1" as const;
export const REPORT_PROMPT_VERSION_TOPIC_DEEP_DIVE_V1 = "ziwei.topic-deep-dive.prompt.v1" as const;
export const REPORT_QUALITY_VERSION_TOPIC_DEEP_DIVE_V1 = "ziwei.topic-deep-dive.quality.v1" as const;
export const REPORT_QUALITY_VERSION_TOPIC_DEEP_DIVE_V2 = "ziwei.topic-deep-dive.quality.v2" as const;
export const REPORT_QUALITY_VERSION_TOPIC_DEEP_DIVE_V3 = "ziwei.topic-deep-dive.quality.v3" as const;
export const REPORT_TEMPLATE_VERSION_TOPIC_DEEP_DIVE_V1 = "ziwei.topic-deep-dive.html.v1" as const;

export function topicIdForSku(sku: string): ZiweiTopicDeepDiveId | null {
  return sku === "ZIWEI-RELATIONSHIP-P0" ? "relationship_marriage"
    : sku === "ZIWEI-CAREER-P0" ? "career_wealth" : null;
}

// v4_1 identifies the frozen source/evidence family, not the generated product.
export function topicReportVersions() {
  return {
    family: "v4_1" as const,
    knowledgeVersion: REPORT_KNOWLEDGE_VERSION_V4,
    promptVersion: REPORT_PROMPT_VERSION_TOPIC_DEEP_DIVE_V1,
    reportConfigVersion: REPORT_CONFIG_VERSION_TOPIC_DEEP_DIVE_V1,
    qualityVersion: REPORT_QUALITY_VERSION_TOPIC_DEEP_DIVE_V3,
    contentVersion: "ziwei.topic-deep-dive.v1" as const,
    templateVersion: REPORT_TEMPLATE_VERSION_TOPIC_DEEP_DIVE_V1,
    renderVersion: CURRENT_REPORT_RENDER_VERSION,
    timingRuleVersion: REPORT_TIMING_RULE_VERSION_V1,
  };
}

export function isTopicReportTuple(value: { sku: string; locale: string; promptVersion: string; reportConfigVersion: string; knowledgeVersionId: string }): boolean {
  return topicIdForSku(value.sku) !== null && value.locale === "vi" &&
    value.promptVersion === REPORT_PROMPT_VERSION_TOPIC_DEEP_DIVE_V1 &&
    value.reportConfigVersion === REPORT_CONFIG_VERSION_TOPIC_DEEP_DIVE_V1 &&
    value.knowledgeVersionId === REPORT_KNOWLEDGE_VERSION_V4;
}
