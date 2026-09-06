import {
  CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER,
  CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER_EN,
  IDENTITY_REPORT_SECTION_IDS,
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

const REQUIRED_CLAIM_SECTIONS = [
  "personal_summary",
  "primary_evidence",
  "strengths_and_resources",
  "tensions_and_blind_spots",
  "identity_analysis",
  "cycles_and_timing",
  "within_control",
] as const;

export type IdentityReportWriterInput = IdentityReportSource & {
  locale: "vi" | "en";
  sku: "ZIWEI-IDENTITY-P0";
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
  const languageInstruction = input.locale === "en"
    ? "Respond strictly in clear, natural English."
    : "Respond strictly in clear, natural Vietnamese.";
  const structuralRequirements = [
    "Top-level keys must be exactly: sections, reflectionQuestions, summaryActions.",
    `The sections array must contain exactly the 11 canonical section IDs in exact canonical sequence: ${IDENTITY_REPORT_SECTION_IDS.join(", ")}.`,
    "Each section object must contain keys exactly: id, title, narrative, claims.",
    'Each claim object must match the exact claim skeleton: {"id":"claim-1","text":"...","evidenceIds":["ziwei.identity.example"],"interpretationBoundCode":"reflective_identity_only","confidence":"moderate","limitations":["..."],"suggestedActions":[{"category":"reflect","text":"..."}]}.',
    "Each claim links exactly one supplied evidence item in evidenceIds; copies an allowed interpretationBoundCode from that evidence item; confidence does not exceed the evidence item confidence; suggestedActions action category is allowed for that evidence item.",
    "In each claim, limitations is 1-3 strings; suggestedActions is 0-2 objects with exactly category, text.",
    `These seven sections must have at least one claim: ${REQUIRED_CLAIM_SECTIONS.join(", ")}.`,
    "Do not use translated, renamed, or invented keys, IDs, codes, or categories.",
  ].join(" ");
  const result = await input.provider.generateStructured({
    schema: IdentityReportContentV1Schema,
    schemaName: "identity_report_content_v1",
    system: `Interpret supplied evidence only and produce evidence-bounded reflective content. ${languageInstruction} Do not calculate chart facts or invent evidence. ${structuralRequirements}`,
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
  const disclaimer = input.locale === "en"
    ? CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER_EN
    : CANONICAL_PROFESSIONAL_ADVICE_DISCLAIMER;
  const assembled = IdentityReportV1Schema.safeParse({
    version: 1,
    sku: input.sku,
    capabilityId: "ziwei.identity.p0",
    locale: input.locale,
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
    professionalAdviceDisclaimer: disclaimer,
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
