import { IDENTITY_REPORT_SECTION_IDS, type IdentityReportSectionId } from "@lasoviet/contracts";

export type IdentityReportOutlineSection = {
  id: IdentityReportSectionId;
  purpose: string;
  requiresEvidenceBackedClaims: boolean;
};

const evidenceBackedV1 = new Set<IdentityReportSectionId>([
  "personal_summary",
  "primary_evidence",
  "strengths_and_resources",
  "tensions_and_blind_spots",
  "identity_analysis",
  "cycles_and_timing",
  "within_control",
]);

const evidenceBackedV2 = new Set<IdentityReportSectionId>([
  "personal_summary",
  "primary_evidence",
  "strengths_and_resources",
  "tensions_and_blind_spots",
  "identity_analysis",
  "within_control",
]);

export const identityReportOutlineV1: readonly IdentityReportOutlineSection[] =
  IDENTITY_REPORT_SECTION_IDS.map((id) => ({
    id,
    purpose: id.replaceAll("_", " "),
    requiresEvidenceBackedClaims: evidenceBackedV1.has(id),
  }));

export const identityReportOutlineV2: readonly IdentityReportOutlineSection[] =
  IDENTITY_REPORT_SECTION_IDS.map((id) => ({
    id,
    purpose: id.replaceAll("_", " "),
    requiresEvidenceBackedClaims: evidenceBackedV2.has(id),
  }));

export const identityReportOutline = identityReportOutlineV2;

export function getIdentityReportOutline(
  promptVersion?: string,
): readonly IdentityReportOutlineSection[] {
  return promptVersion === "ziwei.identity.prompt.v1"
    ? identityReportOutlineV1
    : identityReportOutlineV2;
}
