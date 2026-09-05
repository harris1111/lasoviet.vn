import { IDENTITY_REPORT_SECTION_IDS, type IdentityReportSectionId } from "@lasoviet/contracts";

export type IdentityReportOutlineSection = {
  id: IdentityReportSectionId;
  purpose: string;
  requiresEvidenceBackedClaims: boolean;
};

const evidenceBacked = new Set<IdentityReportSectionId>([
  "personal_summary",
  "primary_evidence",
  "strengths_and_resources",
  "tensions_and_blind_spots",
  "identity_analysis",
  "cycles_and_timing",
  "within_control",
]);

export const identityReportOutline: readonly IdentityReportOutlineSection[] =
  IDENTITY_REPORT_SECTION_IDS.map((id) => ({
    id,
    purpose: id.replaceAll("_", " "),
    requiresEvidenceBackedClaims: evidenceBacked.has(id),
  }));
