import {
  EvidenceSetV1Schema,
  FrozenIdentityReportFactsV1Schema,
  type EvidenceSetV1,
  type FrozenIdentityReportFactsV1,
} from "@lasoviet/contracts";

export type ApprovedKnowledgePassage = {
  id: string;
  content: string;
};

export type IdentityReportSource = {
  evidence: EvidenceSetV1;
  frozenFacts: FrozenIdentityReportFactsV1;
  knowledgePassages: readonly ApprovedKnowledgePassage[];
};

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
