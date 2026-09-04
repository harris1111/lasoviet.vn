import {
  EvidenceSetV1Schema,
  FrozenIdentityReportFactsV1Schema,
  type EvidenceSetV1,
  type FrozenIdentityReportFactsV1,
  type IdentityReportSectionId,
} from "@lasoviet/contracts";
import type { PermittedUseBasis } from "../knowledge/knowledge-ingestion.service.js";
import type { KnowledgePassageV1 } from "../knowledge/knowledge-retrieval.service.js";

export type ApprovedKnowledgePassage = {
  id: string;
  content: string;
  passageId?: string;
  documentId?: string;
  discipline?: "ziwei";
  locale?: "vi" | "en";
  reportSections?: readonly IdentityReportSectionId[];
  knowledgeVersion?: string;
  contentHash?: string;
  sourceAttribution?: string;
  permittedUse?: PermittedUseBasis;
};

export type IdentityReportSource = {
  evidence: EvidenceSetV1;
  frozenFacts: FrozenIdentityReportFactsV1;
  knowledgePassages: readonly (ApprovedKnowledgePassage | KnowledgePassageV1)[];
};

const vietnameseSectionPurposes: Record<IdentityReportSectionId, string> = {
  data_and_method: "phương pháp luận báo cáo",
  personal_summary: "tóm tắt bản sắc cá nhân",
  primary_evidence: "căn cứ chính báo cáo",
  strengths_and_resources: "thế mạnh và nguồn lực",
  tensions_and_blind_spots: "mâu thuẫn và điểm mù",
  identity_analysis: "phân tích bản sắc",
  cycles_and_timing: "chu kỳ và thời điểm",
  within_control: "vùng kiểm soát",
  reflection_questions: "câu hỏi tự phản chiếu",
  action_summary: "tóm tắt hành động",
  limitations_and_disclaimer: "nội dung báo cáo tư vấn",
};

export function identityReportSectionPurpose(
  sectionId: IdentityReportSectionId,
  locale: "vi" | "en",
): string {
  return locale === "vi"
    ? vietnameseSectionPurposes[sectionId]
    : sectionId.replaceAll("_", " ");
}

export function boundedKnowledge(
  passages: readonly ApprovedKnowledgePassage[],
) {
  return passages.slice(0, 8).map((passage) => ({
    id: passage.id,
    content: passage.content.slice(0, 1_200),
  }));
}

export function isBoundIdentityReportSource(
  source: IdentityReportSource,
): boolean {
  const evidence = EvidenceSetV1Schema.safeParse(source.evidence);
  const facts = FrozenIdentityReportFactsV1Schema.safeParse(source.frozenFacts);
  if (!evidence.success || !facts.success) return false;
  if (
    evidence.data.chartVersionId !== facts.data.chartVersionId ||
    evidence.data.capabilityId !== facts.data.capabilityId ||
    evidence.data.ruleVersion !== facts.data.ruleVersion
  ) {
    return false;
  }
  const references = new Set(
    evidence.data.items.flatMap((item) => item.factReferences),
  );
  const factKeys = Object.keys(facts.data.facts);
  return factKeys.length === references.size &&
    factKeys.every((reference) => references.has(reference));
}
