import {
  type AiCostRequestContext,
  type ReadingContextV1,
  ReadingContextV1Schema,
  TOPIC_PALACE_SCOPES,
  type ZiweiPalaceId,
  type ZiweiTopicDeepDiveContentV1,
  ZiweiTopicDeepDiveContentV1Schema,
  type ZiweiTopicDeepDiveId,
  CANONICAL_TOPIC_DEEP_DIVE_TITLES_VI,
} from "@lasoviet/contracts";
import { resolveZiweiReportQualityConfig } from "@lasoviet/config";

import type { AiProvider, AiProviderError } from "../ai/ai-provider.js";
import type { ComprehensiveZiweiFactsV4 } from "./comprehensive-ziwei-facts-v4.js";
import type { ZiweiReportKnowledgePack } from "./comprehensive-report-retrieval.js";
import { BRIGHTNESS_LABELS_VI } from "./comprehensive-report-writer.js";
import {
  DEFAULT_TOPIC_DEEP_DIVE_QUALITY_CONFIG,
  type TopicDeepDiveQualityConfig,
  type TopicDeepDiveQualityFinding,
  type TopicDeepDiveQualityResult,
  validateZiweiTopicDeepDiveQualityV4,
} from "./topic-deep-dive-quality-v4.js";
import {
  REPORT_CONFIG_VERSION_V4_1_1_SECTIONED_SENSITIVITY,
  REPORT_QUALITY_VERSION_COMPREHENSIVE_V2_3_SENSITIVITY,
} from "./identity-report-config.js";

export const REPORT_CONFIG_VERSION_TOPIC_DEEP_DIVE_V1 =
  "ziwei.topic-deep-dive.report.v1" as const;
export const REPORT_PROMPT_VERSION_TOPIC_DEEP_DIVE_V1 =
  "ziwei.topic-deep-dive.prompt.v1" as const;
export const REPORT_QUALITY_VERSION_TOPIC_DEEP_DIVE_V1 =
  "ziwei.topic-deep-dive.quality.v1" as const;

export type ZiweiTopicDeepDiveWriterRewrite = {
  priorContent: ZiweiTopicDeepDiveContentV1;
  findings: readonly (string | TopicDeepDiveQualityFinding)[];
};

export type ZiweiTopicDeepDiveWriterInput = {
  topicId: ZiweiTopicDeepDiveId;
  facts: ComprehensiveZiweiFactsV4;
  knowledgePacks: readonly ZiweiReportKnowledgePack[];
  provider: AiProvider;
  rewrite?: ZiweiTopicDeepDiveWriterRewrite;
  costContext?: AiCostRequestContext;
  readingContext?: ReadingContextV1 | null;
  qualityConfig?: Partial<TopicDeepDiveQualityConfig>;
  priorThematicNarrative?: string;
};

export type ZiweiTopicDeepDiveWriterResult =
  | {
      ok: true;
      value: {
        content: ZiweiTopicDeepDiveContentV1;
        quality: TopicDeepDiveQualityResult;
        providerId: string;
        modelId: string;
      };
    }
  | {
      ok: false;
      error:
        | AiProviderError
        | { code: "AI_OUTPUT_INVALID"; retryable: false };
    };

const TOPIC_SYSTEM_PROMPT = `Bạn là chuyên gia luận giải Tử Vi Đẩu Số cao cấp tại lasoviet.net.
Nhiệm vụ của bạn là viết một bản luận giải chuyên sâu (Topic Deep Dive) hoàn chỉnh bằng tiếng Việt chuyên nghiệp, sắc sảo và thực chất.
Chỉ trả về ĐÚNG MỘT JSON hợp lệ duy nhất tuân thủ nghiêm ngặt schema được cung cấp, không kèm bất kỳ văn bản nào ngoài JSON.

NGUYÊN TẮC LUẬN GIẢI CHUYÊN SÂU:
1. Đào sâu cấu trúc cung vị và tương tác sao: Phân tích cụ thể các cung trọng điểm (Palace Anchors), chính tinh, phụ tinh hội tụ, cung tam hợp và đối cung xung chiếu. Không nhận định chung chung.
2. Thời vận 10 năm do hệ thống tính toán (Engine-Computed Decadal Timing): Luận giải đại vận 10 năm dựa CHÍNH XÁC trên thông tin decadal facts được cung cấp (tuổi, năm, cung tọa thủ). Tuyệt đối KHÔNG tự bịa ra năm, tháng hạn hoặc mốc thời gian không có trong facts.
3. Luận giải trực diện theo Tử Vi truyền thống (FD-089): Trình bày thẳng thắn cả vận hạn, hao tài, trắc trở, xung đột hay thử thách; không né tránh hay tô hồng gượng ép.
4. Ranh giới pháp lý và chất lượng bắt buộc (FD-077, FD-089):
   - CẤM TUYỆT ĐỐI đề cập đến cái chết, tuổi thọ, thọ yểu hay "khắc chết".
   - CẤM đưa ra mốc thời gian hạn dạng ngày/tháng cụ thể (ví dụ: ngày 15/8, tháng 3 âm lịch) hoặc năm ngoài đại vận facts.
   - CẤM gợi ý cúng bái, bùa chú, đồ phong thủy giải hạn hay nghi thức tâm linh.
   - CẤM khẳng định tuyệt đối (như "chắc chắn 100%", "chính xác 99%", "không thể tránh khỏi").
   - CẤM chữ Hán, chữ Nôm; chỉ dùng nhãn độ sáng tiếng Việt (Miếu, Vượng, Đắc, Bình hòa, Hãm).
   - KHÔNG nhắc AI, prompt, dữ liệu đầu vào hay hệ thống tính toán.
5. Căn cứ Evidence: Mọi chuỗi trong mảng "evidenceKeys" PHẢI sao chép nguyên văn từ allowedEvidenceKeys được cung cấp. Mỗi phần narrative phải nêu ít nhất 2 sự kiện lá số có căn cứ evidence.
6. Hành động thực tế: Cung cấp từ 3 đến 5 hành động thiết thực, mỗi hành động gồm đầy đủ khuyến nghị (recommendation), lý do thực chất (rationale) và điều nên tránh (avoid).`;

function extractTopicSourceKeys(
  topicId: ZiweiTopicDeepDiveId,
  facts: ComprehensiveZiweiFactsV4,
): {
  natalKeys: Set<string>;
  decadalKeys: Set<string>;
  scopePalaces: ZiweiPalaceId[];
} {
  const scope = TOPIC_PALACE_SCOPES[topicId];
  const allTopicPalaces = [
    ...scope.primaryPalaces,
    ...scope.supportingPalaces,
  ];

  const natalKeys = new Set<string>();
  const palaces = facts.natal.palaces.filter((p) =>
    allTopicPalaces.includes(p.palaceId),
  );

  for (const palace of palaces) {
    natalKeys.add(palace.palaceId);
    natalKeys.add(palace.earthlyBranchId);
    if (palace.heavenlyStemId) natalKeys.add(palace.heavenlyStemId);
    for (const star of palace.stars) {
      natalKeys.add(star.id);
      if (star.brightness) natalKeys.add(star.brightness);
    }
  }

  for (const transformation of facts.natal.transformations) {
    natalKeys.add(transformation.id);
    natalKeys.add(transformation.starId);
  }

  for (const pattern of facts.natal.patterns) {
    if (pattern.palaceIds.some((id) => allTopicPalaces.includes(id))) {
      natalKeys.add(pattern.id);
      for (const pId of pattern.palaceIds) natalKeys.add(pId);
      for (const sId of pattern.starIds) natalKeys.add(sId);
    }
  }

  const decadalKeys = new Set<string>();
  const decadal = facts.timing.decadal;
  if (decadal.state === "not_started") {
    decadalKeys.add("timing.decadal.state:not_started");
    decadalKeys.add(`timing.decadal.firstCycleStartAge:${decadal.firstCycleStartAge}`);
    decadalKeys.add(`timing.decadal.firstCycleStartYear:${decadal.firstCycleStartYear}`);
  } else {
    decadalKeys.add("timing.decadal.state:active");
    decadalKeys.add(`timing.decadal.index:${decadal.index}`);
    decadalKeys.add(`timing.decadal.ageRange:${decadal.ageRange[0]}-${decadal.ageRange[1]}`);
    decadalKeys.add(`timing.decadal.yearRange:${decadal.yearRange[0]}-${decadal.yearRange[1]}`);
    decadalKeys.add(decadal.palaceId);
    for (const palace of decadal.palaces) {
      if (allTopicPalaces.includes(palace.palaceId)) {
        decadalKeys.add(palace.palaceId);
        decadalKeys.add(palace.cycleStateId);
        for (const star of palace.stars) {
          decadalKeys.add(star.id);
          if (star.brightness) decadalKeys.add(star.brightness);
        }
        for (const tr of palace.transformations) {
          decadalKeys.add(tr.id);
          decadalKeys.add(tr.starId);
        }
      }
    }
  }

  return { natalKeys, decadalKeys, scopePalaces: allTopicPalaces };
}

function resolveTopicAllowedEvidenceKeys(
  facts: ComprehensiveZiweiFactsV4,
  natalKeys: Set<string>,
  decadalKeys: Set<string>,
): string[] {
  const allowed = new Set<string>();
  for (const item of facts.evidence.items) {
    if (
      item.dimension === "natal" &&
      item.sourceKeys.some((k) => natalKeys.has(k))
    ) {
      allowed.add(item.key);
    } else if (
      item.dimension === "decadal" &&
      item.sourceKeys.some((k) => decadalKeys.has(k))
    ) {
      allowed.add(item.key);
    }
  }
  return [...allowed].sort();
}

function filterTopicKnowledgePacks(
  topicId: ZiweiTopicDeepDiveId,
  knowledgePacks: readonly ZiweiReportKnowledgePack[],
  allowedEvidenceKeys: ReadonlySet<string>,
): Array<{ id: string; passages: Array<{ passageId: string; content: string }> }> {
  const prefix =
    topicId === "relationship_marriage"
      ? ["thematic_relationships_family", "palace_ziwei.palace.spouse", "palace_ziwei.palace.fortune"]
      : ["thematic_career_wealth", "palace_ziwei.palace.career", "palace_ziwei.palace.wealth"];

  return knowledgePacks
    .filter((pack) =>
      prefix.some((p) => pack.id.startsWith(p)) ||
      pack.id === "core_temperament" ||
      pack.id === "patterns_transformations",
    )
    .slice(0, 4)
    .map((pack) => ({
      id: pack.id,
      passages: pack.passages.slice(0, 2).map((p) => ({
        passageId: p.passageId,
        content: p.content.slice(0, 1_800),
      })),
    }));
}

export async function writeZiweiTopicDeepDiveV4(
  input: ZiweiTopicDeepDiveWriterInput,
): Promise<ZiweiTopicDeepDiveWriterResult> {
  const { natalKeys, decadalKeys, scopePalaces } = extractTopicSourceKeys(
    input.topicId,
    input.facts,
  );
  const allowedEvidenceKeys = resolveTopicAllowedEvidenceKeys(
    input.facts,
    natalKeys,
    decadalKeys,
  );
  const allowedSet = new Set(allowedEvidenceKeys);

  const filteredPacks = filterTopicKnowledgePacks(
    input.topicId,
    input.knowledgePacks,
    allowedSet,
  );

  const qualityConfig = {
    ...DEFAULT_TOPIC_DEEP_DIVE_QUALITY_CONFIG,
    ...input.qualityConfig,
  };
  const quality = resolveZiweiReportQualityConfig(
    REPORT_CONFIG_VERSION_V4_1_1_SECTIONED_SENSITIVITY,
    REPORT_QUALITY_VERSION_COMPREHENSIVE_V2_3_SENSITIVITY,
  );

  const topicTitle = CANONICAL_TOPIC_DEEP_DIVE_TITLES_VI[input.topicId];
  const primaryPalaces = TOPIC_PALACE_SCOPES[input.topicId].primaryPalaces;

  const acceptanceContract = {
    topicId: input.topicId,
    title: topicTitle,
    requiredPrimaryPalaces: primaryPalaces,
    minimumSyllables: {
      overview: qualityConfig.minOverviewSyllables,
      palaceAnchor: qualityConfig.minPalaceAnchorSyllables,
      thematicDimension: qualityConfig.minThematicDimensionSyllables,
      decadalTiming: qualityConfig.minDecadalTimingSyllables,
      actionItem: qualityConfig.minActionItemSyllables,
      total: qualityConfig.minTotalSyllables,
    },
    forbiddenTerms: {
      death: [...quality.deathTerms],
      discouraged: [...quality.discouragedTerms],
      certainty: [...quality.certaintyPhrases],
      contextualPalaceNameExceptions: ["Phu Thê", "Tử Tức"],
    },
    localeIntegrity: {
      language: "vi",
      noHanIdeographs: true,
      allowedBrightnessLabels: Object.values(BRIGHTNESS_LABELS_VI),
    },
    decadalTimingFact:
      input.facts.timing.decadal.state === "active"
        ? {
            state: "active",
            ageRange: input.facts.timing.decadal.ageRange,
            yearRange: input.facts.timing.decadal.yearRange,
            palaceId: input.facts.timing.decadal.palaceId,
          }
        : {
            state: "not_started",
            firstCycleStartAge: input.facts.timing.decadal.firstCycleStartAge,
            firstCycleStartYear: input.facts.timing.decadal.firstCycleStartYear,
          },
  };

  const userPayload = {
    topicId: input.topicId,
    title: topicTitle,
    scopedFacts: {
      natalPalaces: input.facts.natal.palaces.filter((p) =>
        scopePalaces.includes(p.palaceId),
      ),
      natalTransformations: input.facts.natal.transformations.filter((t) =>
        scopePalaces.some((pId) =>
          input.facts.natal.palaces
            .find((p) => p.palaceId === pId)
            ?.stars.some((s) => s.id === t.starId),
        ),
      ),
      decadalTiming: input.facts.timing.decadal,
    },
    allowedEvidenceKeys,
    knowledgePacks: filteredPacks,
    readingContext: (() => {
      const parsed = ReadingContextV1Schema.safeParse(input.readingContext ?? null);
      return parsed.success ? parsed.data : null;
    })(),
    ...(input.rewrite
      ? {
          rewrite: {
            priorContent: input.rewrite.priorContent,
            findings: input.rewrite.findings.map((f) =>
              typeof f === "string" ? f : `${f.sectionKey}: ${f.code} - ${f.note}`,
            ),
          },
        }
      : {}),
  };

  const systemPrompt = `${TOPIC_SYSTEM_PROMPT}

HỢP ĐỒNG NGHIỆM THU CHẤT LƯỢNG (Acceptance Contract):
${JSON.stringify(acceptanceContract, null, 2)}
Tất cả các tiêu chí trên là bắt buộc. Phản hồi phải là JSON hợp lệ theo đúng schema.`;

  const response = await input.provider.generateStructured({
    schema: ZiweiTopicDeepDiveContentV1Schema,
    schemaName: `ziwei_topic_deep_dive_${input.topicId}`,
    system: systemPrompt,
    user: JSON.stringify(userPayload),
    use: "production_report_generation",
    purpose: input.rewrite ? "rewrite" : "report",
    maxOutputTokens: 14_000,
    costContext: input.costContext,
  });

  if (!response.ok) {
    return response;
  }

  const parsed = ZiweiTopicDeepDiveContentV1Schema.safeParse(response.value.value);
  if (!parsed.success) {
    return {
      ok: false,
      error: { code: "AI_OUTPUT_INVALID", retryable: false },
    };
  }

  const content = parsed.data;
  const qualityResult = validateZiweiTopicDeepDiveQualityV4(
    content,
    input.facts,
    input.qualityConfig,
    input.priorThematicNarrative,
  );

  return {
    ok: true,
    value: {
      content,
      quality: qualityResult,
      providerId: response.value.providerId,
      modelId: response.value.modelId,
    },
  };
}

export async function generateZiweiTopicDeepDiveWithQualityLoopV4(
  input: ZiweiTopicDeepDiveWriterInput & { maxRewriteAttempts?: number },
): Promise<ZiweiTopicDeepDiveWriterResult> {
  const maxAttempts = input.maxRewriteAttempts ?? 1;

  let result = await writeZiweiTopicDeepDiveV4(input);
  if (!result.ok) return result;

  let currentContent = result.value.content;
  let currentQuality = result.value.quality;
  let attempts = 0;

  while (!currentQuality.ok && attempts < maxAttempts) {
    attempts++;
    const rewritten = await writeZiweiTopicDeepDiveV4({
      ...input,
      rewrite: {
        priorContent: currentContent,
        findings: currentQuality.findings,
      },
    });

    if (!rewritten.ok) {
      break;
    }

    currentContent = rewritten.value.content;
    currentQuality = rewritten.value.quality;
    result = rewritten;

    if (currentQuality.ok) {
      break;
    }
  }

  return result;
}
