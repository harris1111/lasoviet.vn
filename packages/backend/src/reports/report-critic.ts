import { z, type IdentityReportV1 } from "@lasoviet/contracts";

import type { AiProvider } from "../ai/ai-provider.js";
import { boundedKnowledge, type IdentityReportSource } from "./report-source.js";
import { validateIdentityReport } from "./report-validator.js";

const CriticSchema = z.object({
  correctness: z.number().int().min(1).max(5),
  evidenceCoverage: z.number().int().min(1).max(5),
  specificity: z.number().int().min(1).max(5),
  vietnameseClarity: z.number().int().min(1).max(5),
  consistency: z.number().int().min(1).max(5),
  actionability: z.number().int().min(1).max(5),
  safety: z.number().int().min(1).max(5),
  repetitionControl: z.number().int().min(1).max(5),
  notes: z.array(z.string().max(300)).max(8),
}).strict();

export async function critiqueIdentityReport(
  report: IdentityReportV1,
  source: IdentityReportSource,
  provider: AiProvider,
) {
  const validation = validateIdentityReport(report, source);
  if (!validation.ok) {
    return { ok: false as const, error: { code: validation.findings[0]?.code ?? "REPORT_SAFETY_REJECTED", retryable: false } };
  }
  const result = await provider.generateStructured({
    schema: CriticSchema,
    schemaName: "identity_report_critic_v1",
    system: "Evaluate a Vietnamese evidence-backed report for quality and safety.",
    user: JSON.stringify({
      report,
      frozenFacts: source.frozenFacts.facts,
      evidence: source.evidence.items,
      knowledge: boundedKnowledge(source.knowledgePassages),
    }),
    use: "production_report_generation",
    maxOutputTokens: 600,
  });
  if (!result.ok) return result;
  if (result.value.value.correctness < 4 || result.value.value.safety < 4) {
    return { ok: false as const, error: { code: "REPORT_QUALITY_REJECTED", retryable: false } };
  }
  return { ok: true as const, value: result.value.value };
}
