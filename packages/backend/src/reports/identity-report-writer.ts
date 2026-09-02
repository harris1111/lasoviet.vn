import {
  IdentityReportV1Schema,
  type EvidenceSetV1,
  type IdentityReportV1,
} from "@lasoviet/contracts";

import type { AiProvider } from "../ai/ai-provider.js";
import { identityReportOutline } from "./identity-report-outline.js";

export type ApprovedKnowledgePassage = {
  id: string;
  content: string;
};

export type IdentityReportWriterInput = {
  chartVersionId: string;
  evidence: EvidenceSetV1;
  knowledgePassages: readonly ApprovedKnowledgePassage[];
  provenance: {
    evidenceVersion: number;
    knowledgeVersion: string;
    promptVersion: string;
    templateVersion: string;
  };
  provider: AiProvider;
};

export async function writeIdentityReportDraft(input: IdentityReportWriterInput) {
  const knowledge = input.knowledgePassages.slice(0, 8).map((passage) => ({
    id: passage.id,
    content: passage.content.slice(0, 1_200),
  }));
  const result = await input.provider.generateStructured({
    schema: IdentityReportV1Schema,
    schemaName: "identity_report_v1",
    system: "Interpret supplied evidence only. Do not calculate chart facts or invent evidence.",
    user: JSON.stringify({
      chartVersionId: input.chartVersionId,
      evidence: input.evidence.items,
      knowledge,
      provenance: input.provenance,
      outline: identityReportOutline,
    }),
    use: "production_report_generation",
    maxOutputTokens: 4_000,
  });
  if (!result.ok) return result;
  const report: IdentityReportV1 = result.value.value;
  return {
    ok: true as const,
    value: {
      status: "draft" as const,
      report,
      providerId: result.value.providerId,
      modelId: result.value.modelId,
    },
  };
}
