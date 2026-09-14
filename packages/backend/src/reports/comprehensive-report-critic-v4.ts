import { type AiCostRequestContext, z, type ZiweiComprehensiveReportContentV2 } from "@lasoviet/contracts";

import type { AiProvider, AiProviderError } from "../ai/ai-provider.js";
import type { ComprehensiveZiweiFactsV4 } from "./comprehensive-ziwei-facts-v4.js";

const CriticSchema = z
  .object({
    correctness: z.number().int().min(1).max(5),
    evidenceCoverage: z.number().int().min(1).max(5),
    specificity: z.number().int().min(1).max(5),
    languageClarity: z.number().int().min(1).max(5),
    consistency: z.number().int().min(1).max(5),
    actionability: z.number().int().min(1).max(5),
    safety: z.number().int().min(1).max(5),
    repetitionControl: z.number().int().min(1).max(5),
    notes: z.array(z.string().max(300)).max(8),
  })
  .strict();

export type ComprehensiveCriticV4Evaluation = z.infer<typeof CriticSchema>;

export type ComprehensiveCriticV4Result =
  | {
      ok: true;
      value: ComprehensiveCriticV4Evaluation;
    }
  | {
      ok: false;
      error:
        | { code: "REPORT_SAFETY_REJECTED"; retryable: false }
        | { code: "AI_OUTPUT_INVALID"; retryable: false; notes?: string[] }
        | AiProviderError;
    };

export async function critiqueComprehensiveZiweiReportV4(
  report: ZiweiComprehensiveReportContentV2,
  facts: ComprehensiveZiweiFactsV4,
  provider: AiProvider,
  options?: { costContext?: AiCostRequestContext },
): Promise<ComprehensiveCriticV4Result> {
  const system = `Bạn là chuyên gia thẩm định chất lượng báo cáo luận giải Tử Vi Đẩu Số V4 tại lasoviet.vn.
Đánh giá bản báo cáo dựa trên dữ kiện lá số và chuẩn mực chất lượng.
Đầu ra PHẢI là JSON object hợp lệ tuân thủ: {"correctness":5,"evidenceCoverage":5,"specificity":5,"languageClarity":5,"consistency":5,"actionability":5,"safety":5,"repetitionControl":5,"notes":["..."]}.
Tất cả 8 điểm số phải là số nguyên từ 1 đến 5. "notes" là mảng gồm 0-8 chuỗi string (tối đa 300 ký tự mỗi chuỗi).
CẤM đổi tên, dịch nghĩa, thêm hoặc bớt các trường điểm số trên.`;

  // Safe factual payload without raw birth date, birth time, or location
  const safePayload = {
    report,
    facts: {
      natalPalaces: facts.natal.palaces,
      transformations: facts.natal.transformations,
      patterns: facts.natal.patterns,
      decadalCycle: facts.timing.decadal,
      annualSnapshot: facts.timing.annual,
      evidenceKeys: facts.evidenceKeys,
    },
  };

  const result = await provider.generateStructured({
    schema: CriticSchema,
    schemaName: "comprehensive_report_critic_v4",
    system,
    user: JSON.stringify(safePayload),
    use: "production_report_generation",
    purpose: options?.costContext?.purpose ?? "critic",
    maxOutputTokens: 600,
    costContext: options?.costContext,
  });

  if (!result.ok) {
    return result;
  }

  const critic = result.value.value;

  if (critic.correctness < 4 || critic.safety < 4) {
    return {
      ok: false,
      error: { code: "REPORT_SAFETY_REJECTED", retryable: false },
    };
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
      ok: false,
      error: {
        code: "AI_OUTPUT_INVALID",
        retryable: false,
        notes: critic.notes.slice(0, 8),
      },
    };
  }

  return { ok: true, value: critic };
}
