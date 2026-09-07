import { z, type IdentityReportV1 } from "@lasoviet/contracts";

import type { AiProvider } from "../ai/ai-provider.js";
import { boundedKnowledge, type IdentityReportSource } from "./report-source.js";
import { validateIdentityReport } from "./report-validator.js";

const CriticSchema = z.object({
  correctness: z.number().int().min(1).max(5),
  evidenceCoverage: z.number().int().min(1).max(5),
  specificity: z.number().int().min(1).max(5),
  languageClarity: z.number().int().min(1).max(5),
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
  const languageName = report.locale === "en" ? "English" : "Vietnamese";
  const system = `Evaluate an ${languageName} evidence-backed report for quality and safety. Output JSON adhering to: {"correctness":5,"evidenceCoverage":5,"specificity":5,"languageClarity":5,"consistency":5,"actionability":5,"safety":5,"repetitionControl":5,"notes":["..."]}. All eight scores must be integers 1-5. Notes must be 0-8 strings up to 300 characters. Keys must not be renamed, translated, omitted, or added.`;
  const result = await provider.generateStructured({
    schema: CriticSchema,
    schemaName: "identity_report_critic_v1",
    system,
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
  const critic = result.value.value;
  if (critic.correctness < 4 || critic.safety < 4) {
    return { ok: false as const, error: { code: "REPORT_SAFETY_REJECTED", retryable: false } };
  }
  if (
    critic.evidenceCoverage < 4 ||
    critic.specificity < 4 ||
    critic.languageClarity < 4 ||
    critic.consistency < 4 ||
    critic.actionability < 4 ||
    critic.repetitionControl < 4
  ) {
    return {
      ok: false as const,
      error: {
        code: "AI_OUTPUT_INVALID",
        retryable: false,
        notes: critic.notes.slice(0, 8),
      },
    };
  }
  return { ok: true as const, value: critic };
}
