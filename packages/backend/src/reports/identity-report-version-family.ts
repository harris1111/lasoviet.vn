import {
  REPORT_KNOWLEDGE_VERSION_V1,
  REPORT_KNOWLEDGE_VERSION_V2,
  REPORT_KNOWLEDGE_VERSION_V3,
  REPORT_KNOWLEDGE_VERSION_V4,
  REPORT_PROMPT_VERSION_V1,
  REPORT_PROMPT_VERSION_V2,
  REPORT_PROMPT_VERSION_V3,
  REPORT_PROMPT_VERSION_V4,
  REPORT_PROMPT_VERSION_V4_0_1,
  REPORT_PROMPT_VERSION_V4_1_1_SENSITIVITY,
  REPORT_PROMPT_VERSION_V4_1_SENSITIVITY,
} from "./identity-report-config.js";

export type IdentityReportVersionFamily = "v1" | "v2" | "v3" | "v4" | "v4_1";

export function resolveIdentityReportVersionFamily<T extends string = IdentityReportVersionFamily>(
  promptVersion: unknown,
  knowledgeVersion: unknown,
): T | null {
  if (
    typeof promptVersion !== "string" ||
    typeof knowledgeVersion !== "string"
  ) {
    return null;
  }

  if (
    promptVersion === REPORT_PROMPT_VERSION_V1 &&
    knowledgeVersion === REPORT_KNOWLEDGE_VERSION_V1
  ) {
    return "v1" as unknown as T;
  }

  if (
    promptVersion === REPORT_PROMPT_VERSION_V2 &&
    knowledgeVersion === REPORT_KNOWLEDGE_VERSION_V2
  ) {
    return "v2" as unknown as T;
  }

  if (
    promptVersion === REPORT_PROMPT_VERSION_V3 &&
    knowledgeVersion === REPORT_KNOWLEDGE_VERSION_V3
  ) {
    return "v3" as unknown as T;
  }
  if (
    (promptVersion === REPORT_PROMPT_VERSION_V4 ||
      promptVersion === REPORT_PROMPT_VERSION_V4_0_1) &&
    knowledgeVersion === REPORT_KNOWLEDGE_VERSION_V3
  ) {
    return "v4" as unknown as T;
  }

  if (
    (
      promptVersion === REPORT_PROMPT_VERSION_V4_1_SENSITIVITY ||
      promptVersion === REPORT_PROMPT_VERSION_V4_1_1_SENSITIVITY
    ) &&
    knowledgeVersion === REPORT_KNOWLEDGE_VERSION_V4
  ) {
    return "v4_1" as unknown as T;
  }

  return null;
}
