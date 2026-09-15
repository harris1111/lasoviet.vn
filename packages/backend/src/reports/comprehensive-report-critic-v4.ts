import { type AiCostRequestContext, z, type ZiweiComprehensiveReportContentV2 } from "@lasoviet/contracts";

import type { AiProvider, AiProviderError } from "../ai/ai-provider.js";
import type { ComprehensiveZiweiFactsV4 } from "./comprehensive-ziwei-facts-v4.js";
import {
  COMPREHENSIVE_REPORT_SECTION_KEYS,
  type ComprehensiveReportSectionKey,
} from "./comprehensive-report-section-v4.js";

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
        | { code: "REPORT_SAFETY_REJECTED"; retryable: false; notes?: string[] }
        | { code: "AI_OUTPUT_INVALID"; retryable: false; notes?: string[] }
        | AiProviderError;
    };

const SectionedFindingSchema = z.object({
  key: z.enum(COMPREHENSIVE_REPORT_SECTION_KEYS),
  note: z.string().trim().min(1).max(300),
}).strict();

const SectionedCriticSchema = CriticSchema.extend({
  findings: z.array(SectionedFindingSchema).max(8),
}).strict();

export type ComprehensiveSectionedCriticV4Evaluation = z.infer<typeof SectionedCriticSchema>;
export type ComprehensiveSectionedCriticV4Result =
  | { ok: true; value: ComprehensiveSectionedCriticV4Evaluation }
  | {
      ok: false;
      error:
        | { code: "REPORT_SAFETY_REJECTED"; retryable: false; notes?: string[] }
        | {
            code: "AI_OUTPUT_INVALID";
            retryable: false;
            notes?: string[];
            findings?: Array<{ key: ComprehensiveReportSectionKey; note: string }>;
          }
        | AiProviderError;
    };

export async function critiqueComprehensiveZiweiReportV4(
  report: ZiweiComprehensiveReportContentV2,
  facts: ComprehensiveZiweiFactsV4,
  provider: AiProvider,
  options?: { costContext?: AiCostRequestContext },
): Promise<ComprehensiveCriticV4Result> {
  const system = `Bạn là chuyên gia thẩm định chất lượng báo cáo luận giải Tử Vi Đẩu Số V4 tại lasoviet.net.
Đánh giá bản báo cáo dựa trên dữ kiện lá số và chuẩn mực chất lượng.
Đầu ra PHẢI là JSON object hợp lệ tuân thủ: {"correctness":5,"evidenceCoverage":5,"specificity":5,"languageClarity":5,"consistency":5,"actionability":5,"safety":5,"repetitionControl":5,"notes":["..."]}.
Tất cả 8 điểm số phải là số nguyên từ 1 đến 5. "notes" là mảng gồm 0-8 chuỗi string (tối đa 300 ký tự mỗi chuỗi).
CẤM đổi tên, dịch nghĩa, thêm hoặc bớt các trường điểm số trên.
HƯỚNG DẪN THẨM ĐỊNH ĐẶC THÙ:
- KHÔNG trừ điểm đối với các lời khuyên tham vấn bác sĩ, luật sư hoặc chuyên gia có chuyên môn phù hợp được lồng ghép tự nhiên trong mạch văn về sức khỏe, pháp lý, tài chính.
- PHẢI chấm điểm thấp (safety hoặc correctness < 4) nếu phát hiện: khẳng định định mệnh chắc chắn (chắc chắn tai nạn, phá sản, tử vong, phản bội), bịa đặt dữ kiện không có trong facts, rò rỉ mã định danh kỹ thuật thô (ziwei.*) hoặc xuất hiện khối tuyên bố miễn trừ trách nhiệm đứng riêng.`;

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
      error: {
        code: "REPORT_SAFETY_REJECTED",
        retryable: false,
        notes: critic.notes.slice(0, 8),
      },
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

export async function critiqueComprehensiveZiweiReportSectionedV4(
  report: ZiweiComprehensiveReportContentV2,
  facts: ComprehensiveZiweiFactsV4,
  provider: AiProvider,
  options?: { costContext?: AiCostRequestContext },
): Promise<ComprehensiveSectionedCriticV4Result> {
  const result = await provider.generateStructured({
    schema: SectionedCriticSchema,
    schemaName: "comprehensive_report_sectioned_critic_v4",
    system: `Bạn là chuyên gia thẩm định chất lượng toàn bộ báo cáo luận giải Tử Vi Đẩu Số V4 tại lasoviet.net.
Đánh giá một báo cáo đã được lắp ghép hoàn chỉnh, chỉ dựa trên facts. Đầu ra JSON phải chứa đầy đủ tám điểm 1-5, notes và findings.
findings là mảng 0-8 mục {key,note}; key phải thuộc danh sách section key được cung cấp và note phải không rỗng, tối đa 300 ký tự.
Chỉ trả findings khi có ít nhất một tiêu chí chất lượng dưới 4 và finding chỉ đúng section có thể viết lại. Khi tất cả điểm đều từ 4 trở lên, findings phải rỗng.
Nếu có điểm safety hoặc correctness dưới 4, đây là từ chối an toàn: không trả findings viết lại.
Không trừ điểm đối với lời khuyên tham vấn bác sĩ, luật sư hoặc chuyên gia phù hợp được lồng ghép tự nhiên.`,
    user: JSON.stringify({
      report,
      facts: {
        natalPalaces: facts.natal.palaces,
        transformations: facts.natal.transformations,
        patterns: facts.natal.patterns,
        decadalCycle: facts.timing.decadal,
        annualSnapshot: facts.timing.annual,
        evidenceKeys: facts.evidenceKeys,
      },
      allowedSectionKeys: COMPREHENSIVE_REPORT_SECTION_KEYS,
    }),
    use: "production_report_generation",
    purpose: "critic",
    maxOutputTokens: 900,
    costContext: options?.costContext,
  });
  if (!result.ok) return result;
  const parsed = SectionedCriticSchema.safeParse(result.value.value);
  if (!parsed.success) {
    return { ok: false, error: { code: "AI_OUTPUT_INVALID", retryable: false } };
  }
  const critic = parsed.data;
  if (critic.correctness < 4 || critic.safety < 4) {
    return {
      ok: false,
      error: {
        code: "REPORT_SAFETY_REJECTED",
        retryable: false,
        notes: critic.notes,
      },
    };
  }
  const lowQuality = critic.evidenceCoverage < 4 ||
    critic.specificity < 4 ||
    critic.languageClarity < 4 ||
    critic.consistency < 4 ||
    critic.actionability < 4 ||
    critic.repetitionControl < 4;
  if (lowQuality) {
    return {
      ok: false,
      error: {
        code: "AI_OUTPUT_INVALID",
        retryable: false,
        notes: critic.notes,
        ...(critic.findings.length > 0 ? { findings: critic.findings } : {}),
      },
    };
  }
  if (critic.findings.length > 0) {
    return { ok: false, error: { code: "AI_OUTPUT_INVALID", retryable: false, notes: critic.notes } };
  }
  return { ok: true, value: critic };
}
