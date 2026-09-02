import {
  IdentityReportContentV1Schema,
  IdentityReportV1Schema,
} from "@lasoviet/contracts";

import type { AiProvider } from "../ai/ai-provider.js";
import { identityReportOutline } from "./identity-report-outline.js";
import {
  boundedKnowledge,
  isBoundIdentityReportSource,
  type IdentityReportSource,
} from "./report-source.js";

export type IdentityReportWriterInput = IdentityReportSource & {
  provenance: {
    knowledgeVersion: string;
    promptVersion: string;
    templateVersion: string;
  };
  provider: AiProvider;
};

export async function writeIdentityReportDraft(input: IdentityReportWriterInput) {
  if (!isBoundIdentityReportSource(input)) {
    return { ok: false as const, error: { code: "REPORT_EVIDENCE_INVALID", retryable: false } };
  }
  const knowledge = boundedKnowledge(input.knowledgePassages);
  const result = await input.provider.generateStructured({
    schema: IdentityReportContentV1Schema,
    schemaName: "identity_report_content_v1",
    system: "Interpret supplied evidence only. Do not calculate chart facts or invent evidence.",
    user: JSON.stringify({
      evidence: input.evidence.items,
      frozenFacts: input.frozenFacts.facts,
      knowledge,
      outline: identityReportOutline,
    }),
    use: "production_report_generation",
    maxOutputTokens: 4_000,
  });
  if (!result.ok) return result;
  const assembled = IdentityReportV1Schema.safeParse({
    version: 1,
    sku: "ZIWEI-IDENTITY-P0",
    capabilityId: "ziwei.identity.p0",
    locale: "vi",
    provenance: {
      chartVersionId: input.frozenFacts.chartVersionId,
      ruleVersion: input.evidence.ruleVersion,
      evidenceVersion: input.frozenFacts.evidenceVersion,
      knowledgeVersion: input.provenance.knowledgeVersion,
      providerId: result.value.providerId,
      modelId: result.value.modelId,
      promptVersion: input.provenance.promptVersion,
      templateVersion: input.provenance.templateVersion,
    },
    ...result.value.value,
  });
  if (!assembled.success) {
    return { ok: false as const, error: { code: "AI_OUTPUT_INVALID", retryable: false } };
  }
  return {
    ok: true as const,
    value: {
      status: "draft" as const,
      report: assembled.data,
      providerId: result.value.providerId,
      modelId: result.value.modelId,
    },
  };
}
