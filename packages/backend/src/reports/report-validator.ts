import {
  IdentityReportV1Schema,
  type EvidenceItemV1,
  type IdentityReportV1,
} from "@lasoviet/contracts";

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
  return !text.includes("\uFFFD") && /[àáảãạăắằẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ]/i.test(text);
}

export function validateIdentityReport(
  candidate: unknown,
  evidence: readonly EvidenceItemV1[],
): ReportValidationResult {
  const parsed = IdentityReportV1Schema.safeParse(candidate);
  if (!parsed.success) return { ok: false, findings: [{ code: "REPORT_SCHEMA_INVALID" }] };
  const report = parsed.data;
  const allowedEvidenceIds = new Set(evidence.map((item) => item.id));
  const findings: ReportValidationFinding[] = [];
  for (const section of report.sections) {
    for (const claim of section.claims) {
      if (!claim.evidenceIds.every((id) => allowedEvidenceIds.has(id))) {
        findings.push({ code: "REPORT_EVIDENCE_INVALID", sectionId: section.id, claimId: claim.id, evidenceIds: claim.evidenceIds });
      }
      if (!isVietnamese(`${claim.text} ${claim.limitations.join(" ")} ${claim.suggestedActions.join(" ")}`)) {
        findings.push({ code: "REPORT_LANGUAGE_INVALID", sectionId: section.id, claimId: claim.id });
      }
      if (prohibited.some((pattern) => pattern.test(`${claim.text} ${claim.suggestedActions.join(" ")}`))) {
        findings.push({ code: "REPORT_SAFETY_REJECTED", sectionId: section.id, claimId: claim.id, evidenceIds: claim.evidenceIds });
      }
    }
  }
  if (!isVietnamese(report.professionalAdviceDisclaimer)) {
    findings.push({ code: "REPORT_LANGUAGE_INVALID" });
  }
  return findings.length === 0 ? { ok: true, findings: [] } : { ok: false, findings };
}
