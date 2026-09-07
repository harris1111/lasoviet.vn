import {
  REPORT_KNOWLEDGE_VERSION_V1,
  REPORT_KNOWLEDGE_VERSION_V2,
  REPORT_PROMPT_VERSION_V1,
  REPORT_PROMPT_VERSION_V2,
} from "./identity-report-config.js";

export type IdentityReportVersionFamily = "v1" | "v2";

export function resolveIdentityReportVersionFamily(
  promptVersion: unknown,
  knowledgeVersion: unknown,
): IdentityReportVersionFamily | null {
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
    return "v1";
  }

  if (
    promptVersion === REPORT_PROMPT_VERSION_V2 &&
    knowledgeVersion === REPORT_KNOWLEDGE_VERSION_V2
  ) {
    return "v2";
  }

  return null;
}
