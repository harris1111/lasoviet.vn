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
  /(?:nếu|neu|if).*(?:không|khong|not|do not).*(?:mua|buy).*(?:ngay|now)/i,
];
const corruption = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]|\uFFFD|(?:Ã.|Â.|â[€™“”–])/u;

function isVietnamese(text: string): boolean {
  const normalized = text.normalize("NFC");
  return !corruption.test(normalized) &&
    /[àáảãạăắằẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ]/i.test(normalized);
}

function isEnglish(text: string): boolean {
  const normalized = text.normalize("NFC");
  return !corruption.test(normalized) &&
    /[a-zA-Z]/.test(normalized) &&
    !/[àáảãạăắằẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ]/i.test(normalized);
}

function confidenceRank(value: "high" | "moderate" | "low"): number {
  return { low: 1, moderate: 2, high: 3 }[value];
}

function textFindings(
  text: string,
  locale: "vi" | "en",
  finding: Omit<ReportValidationFinding, "code">,
): ReportValidationFinding[] {
  const findings: ReportValidationFinding[] = [];
  const isNfc = text === text.normalize("NFC");
  const validLanguage = isNfc && (locale === "en" ? isEnglish(text) : isVietnamese(text));
  if (!validLanguage) findings.push({ ...finding, code: "REPORT_LANGUAGE_INVALID" });
  if (prohibited.some((pattern) => pattern.test(text))) {
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
    findings.push(...textFindings(section.title, report.locale, { sectionId: section.id }));
    findings.push(...textFindings(section.narrative, report.locale, { sectionId: section.id }));
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
      findings.push(...textFindings(claim.text, report.locale, { sectionId: section.id, claimId: claim.id, evidenceIds: claim.evidenceIds }));
      claim.limitations.forEach((text) => findings.push(...textFindings(text, report.locale, { sectionId: section.id, claimId: claim.id, evidenceIds: claim.evidenceIds })));
      claim.suggestedActions.forEach((action) => findings.push(...textFindings(action.text, report.locale, { sectionId: section.id, claimId: claim.id, evidenceIds: claim.evidenceIds })));
    }
  }
  report.reflectionQuestions.forEach((text) => findings.push(...textFindings(text, report.locale, {})));
  report.summaryActions.forEach((text) => findings.push(...textFindings(text, report.locale, {})));
  findings.push(...textFindings(report.professionalAdviceDisclaimer, report.locale, {}));
  return findings.length === 0 ? { ok: true, findings: [] } : { ok: false, findings };
}
