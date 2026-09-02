import {
  IdentityReportV1Schema,
  type IdentityReportV1,
} from "@lasoviet/contracts";

import { identityReportOutline } from "./identity-report-outline.js";
import {
  isBoundIdentityReportSource,
  type IdentityReportSource,
} from "./report-source.js";

export type ReportValidationFinding = {
  code:
    | "REPORT_SCHEMA_INVALID"
    | "REPORT_EVIDENCE_INVALID"
    | "REPORT_LANGUAGE_INVALID"
    | "REPORT_SAFETY_REJECTED";
  sectionId?: string;
  claimId?: string;
  evidenceIds?: string[];
};

export type ReportValidationResult =
  | { ok: true; findings: [] }
  | { ok: false; findings: ReportValidationFinding[] };

const prohibited = [
  /(?:chắc chắn|chac chan).*(?:tai nạn|tai nan|tử vong|tu vong|bệnh|benh|phá sản|pha san|phản bội|phan boi|đầu tư|dau tu|thu nhập|thu nhap)/i,
  /\b(?:will definitely|guaranteed).*(?:accident|death|disease|bankruptcy|investment)/i,
  /\b(?:bị|bi)\s+(?:trầm cảm|tram cam|rối loạn|roi loan)/i,
  /\b(?:diagnos(?:is|ed)|depression|mental disorder)\b/i,
  /(?:nếu|neu).*(?:không|khong).*(?:mua|buy).*(?:ngay|now)/i,
];

function isVietnamese(text: string): boolean {
  const normalized = text.normalize("NFC");
  return !normalized.includes("\uFFFD") &&
    !/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(normalized) &&
    /[àáảãạăắằẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ]/i.test(normalized);
}

function confidenceRank(value: "high" | "moderate" | "low"): number {
  return { low: 1, moderate: 2, high: 3 }[value];
}

function textFindings(
  text: string,
  finding: Omit<ReportValidationFinding, "code">,
): ReportValidationFinding[] {
  const normalized = text.normalize("NFC");
  const findings: ReportValidationFinding[] = [];
  if (!isVietnamese(normalized)) findings.push({ ...finding, code: "REPORT_LANGUAGE_INVALID" });
  if (prohibited.some((pattern) => pattern.test(normalized))) {
    findings.push({ ...finding, code: "REPORT_SAFETY_REJECTED" });
  }
  return findings;
}

export function validateIdentityReport(
  candidate: unknown,
  source: IdentityReportSource,
): ReportValidationResult {
  const parsed = IdentityReportV1Schema.safeParse(candidate);
  if (!parsed.success) return { ok: false, findings: [{ code: "REPORT_SCHEMA_INVALID" }] };
  if (!isBoundIdentityReportSource(source)) {
    return { ok: false, findings: [{ code: "REPORT_EVIDENCE_INVALID" }] };
  }
  const report = parsed.data;
  const evidenceById = new Map(source.evidence.items.map((item) => [item.id, item]));
  const findings: ReportValidationFinding[] = [];
  for (const section of report.sections) {
    findings.push(...textFindings(section.title, { sectionId: section.id }));
    findings.push(...textFindings(section.narrative, { sectionId: section.id }));
    const outline = identityReportOutline.find((item) => item.id === section.id);
    if (outline?.requiresEvidenceBackedClaims && section.claims.length === 0) {
      findings.push({ code: "REPORT_EVIDENCE_INVALID", sectionId: section.id });
    }
    for (const claim of section.claims) {
      const linkedEvidence = claim.evidenceIds.map((id) => evidenceById.get(id));
      if (linkedEvidence.some((item) => item === undefined)) {
        findings.push({ code: "REPORT_EVIDENCE_INVALID", sectionId: section.id, claimId: claim.id, evidenceIds: claim.evidenceIds });
        continue;
      }
      const evidence = linkedEvidence as typeof source.evidence.items;
      if (
        !evidence.every((item) => item.interpretationBoundCodes.includes(claim.interpretationBoundCode)) ||
        confidenceRank(claim.confidence) > Math.min(...evidence.map((item) => confidenceRank(item.confidence))) ||
        !claim.suggestedActions.every((action) => evidence.every((item) => item.allowedActionCategories.includes(action.category)))
      ) {
        findings.push({ code: "REPORT_EVIDENCE_INVALID", sectionId: section.id, claimId: claim.id, evidenceIds: claim.evidenceIds });
      }
      findings.push(...textFindings(claim.text, { sectionId: section.id, claimId: claim.id, evidenceIds: claim.evidenceIds }));
      claim.limitations.forEach((text) => findings.push(...textFindings(text, { sectionId: section.id, claimId: claim.id, evidenceIds: claim.evidenceIds })));
      claim.suggestedActions.forEach((action) => findings.push(...textFindings(action.text, { sectionId: section.id, claimId: claim.id, evidenceIds: claim.evidenceIds })));
    }
  }
  report.reflectionQuestions.forEach((text) => findings.push(...textFindings(text, {})));
  report.summaryActions.forEach((text) => findings.push(...textFindings(text, {})));
  findings.push(...textFindings(report.professionalAdviceDisclaimer, {}));
  return findings.length === 0 ? { ok: true, findings: [] } : { ok: false, findings };
}
