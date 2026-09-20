import {
  type AiCostRequestContext,
  ZIWEI_PALACE_IDS,
  ZIWEI_THEMATIC_SYNTHESIS_IDS,
  ZiweiComprehensiveReportActionItemV2Schema,
  ZiweiComprehensiveReportAnnualSnapshotV2Schema,
  ZiweiComprehensiveReportBirthTimeSensitivityV2Schema,
  ZiweiComprehensiveReportCurrentDecadalV2Schema,
  type ZiweiPalaceId,
  type ZiweiThematicSynthesisId,
  ReadingContextV1Schema,
  type ReadingContextV1,
  z,
} from "@lasoviet/contracts";
import {
  resolveZiweiReportQualityConfig,
  resolveZiweiReportQualitySectionThreshold,
  ziweiComprehensiveReportQualityV1,
  ziweiComprehensiveReportQualityV2Sensitivity,
} from "@lasoviet/config";

import type { AiProvider, AiProviderError } from "../ai/ai-provider.js";
import type { ComprehensiveZiweiFactsV4 } from "./comprehensive-ziwei-facts-v4.js";
import type { ZiweiReportKnowledgePack } from "./comprehensive-report-retrieval.js";
import {
  COMPREHENSIVE_REPORT_SECTION_KEYS,
  parseComprehensiveReportAcceptedSection,
  resolveComprehensiveReportSectionKeys,
  type ComprehensiveReportAcceptedSection,
  type ComprehensiveReportSectionKey,
} from "./comprehensive-report-section-v4.js";
import type { ComprehensiveReportSectionDigest } from "./comprehensive-report-section-digest-v4.js";
import { countVietnameseSyllables } from "./comprehensive-report-quality-v4.js";
import { BRIGHTNESS_LABELS_VI } from "./comprehensive-report-writer.js";
import {
  REPORT_CONFIG_VERSION_V4_1_SECTIONED,
  REPORT_CONFIG_VERSION_V4_1_SECTIONED_SENSITIVITY,
  REPORT_CONFIG_VERSION_V4_1_1_SECTIONED_SENSITIVITY,
  REPORT_PROMPT_VERSION_V4_0_1,
  REPORT_PROMPT_VERSION_V4_1_1_SENSITIVITY,
  REPORT_PROMPT_VERSION_V4_1_2_SENSITIVITY,
  REPORT_PROMPT_VERSION_V4_1_SENSITIVITY,
  REPORT_QUALITY_VERSION_COMPREHENSIVE_V2_1_SENSITIVITY,
  REPORT_QUALITY_VERSION_COMPREHENSIVE_V2_SENSITIVITY,
} from "./identity-report-config.js";

const narrativeSchema = z.object({
  title: z.string().trim().min(1).max(120),
  narrative: z.string().trim().min(1).max(5_000),
  evidenceKeys: z.array(z.string().trim().min(1)).min(1),
}).strict();

const keyConfigurationsSchema = z.array(narrativeSchema).min(1).max(12);
const palaceValueSchema = narrativeSchema.extend({ palaceId: z.enum(ZIWEI_PALACE_IDS) }).strict();
const thematicValueSchema = narrativeSchema.extend({ id: z.enum(ZIWEI_THEMATIC_SYNTHESIS_IDS) }).strict();
const practicalDirectionSchema = z.array(ZiweiComprehensiveReportActionItemV2Schema).min(3).max(5);

export type ComprehensiveReportSectionWriterV4Rewrite = {
  priorSection: ComprehensiveReportAcceptedSection;
  findings: readonly (string | ComprehensiveReportSectionWriterV4Finding)[];
};

export type ComprehensiveReportSectionWriterV4Finding = {
  itemKey: string;
  code: string;
  note: string;
};

export type ComprehensiveReportSectionWriterV4Input = {
  sectionKey: ComprehensiveReportSectionKey;
  facts: ComprehensiveZiweiFactsV4;
  knowledgePacks: readonly ZiweiReportKnowledgePack[];
  priorSectionDigest?: ComprehensiveReportSectionDigest;
  rewrite?: ComprehensiveReportSectionWriterV4Rewrite;
  provider: AiProvider;
  promptVersion:
    | typeof REPORT_PROMPT_VERSION_V4_0_1
    | typeof REPORT_PROMPT_VERSION_V4_1_SENSITIVITY
    | typeof REPORT_PROMPT_VERSION_V4_1_1_SENSITIVITY
    | typeof REPORT_PROMPT_VERSION_V4_1_2_SENSITIVITY;
  reportConfigVersion?:
    | typeof REPORT_CONFIG_VERSION_V4_1_SECTIONED
    | typeof REPORT_CONFIG_VERSION_V4_1_SECTIONED_SENSITIVITY
    | typeof REPORT_CONFIG_VERSION_V4_1_1_SECTIONED_SENSITIVITY;
  costContext?: AiCostRequestContext;
  readingContext?: ReadingContextV1 | null;
};

export type ComprehensiveReportSectionWriterV4Result =
  | { ok: true; value: ComprehensiveReportAcceptedSection & { providerId: string; modelId: string } }
  | { ok: false; error: AiProviderError | { code: "AI_OUTPUT_INVALID"; retryable: false } };

type SectionScope = {
  kind: keyof typeof ziweiComprehensiveReportQualityV2Sensitivity.sections;
  palaceIds: readonly ZiweiPalaceId[];
  packIds: readonly string[];
  includePatterns: boolean;
  includeTransformations: boolean;
  includeAllNatalConfigurations: boolean;
  includeDecadal: boolean;
  includeAnnual: boolean;
};

const THEMATIC_PALACES: Record<ZiweiThematicSynthesisId, readonly ZiweiPalaceId[]> = {
  career_wealth: ["ziwei.palace.career", "ziwei.palace.wealth", "ziwei.palace.property", "ziwei.palace.life"],
  relationships_family: ["ziwei.palace.spouse", "ziwei.palace.children", "ziwei.palace.parents", "ziwei.palace.siblings"],
  social_environment: ["ziwei.palace.travel", "ziwei.palace.friends"],
  wellbeing_inner_resources: ["ziwei.palace.health", "ziwei.palace.fortune", "ziwei.palace.life"],
};

function isPalaceKey(key: ComprehensiveReportSectionKey): key is `palace:${ZiweiPalaceId}` {
  return key.startsWith("palace:");
}

function isThematicKey(key: ComprehensiveReportSectionKey): key is `thematic:${ZiweiThematicSynthesisId}` {
  return key.startsWith("thematic:");
}

function scopeFor(key: ComprehensiveReportSectionKey, facts: ComprehensiveZiweiFactsV4): SectionScope {
  const lifeAndBody = facts.natal.palaces
    .filter((palace) => palace.isLifePalace || palace.isBodyPalace)
    .map((palace) => palace.palaceId);
  if (isPalaceKey(key)) {
    const palaceId = key.slice("palace:".length) as ZiweiPalaceId;
    return { kind: "palace", palaceIds: [palaceId], packIds: [`palace_${palaceId}`], includePatterns: true, includeTransformations: true, includeAllNatalConfigurations: false, includeDecadal: false, includeAnnual: false };
  }
  if (isThematicKey(key)) {
    const id = key.slice("thematic:".length) as ZiweiThematicSynthesisId;
    return { kind: "thematic", palaceIds: THEMATIC_PALACES[id], packIds: [`thematic_${id}`], includePatterns: true, includeTransformations: true, includeAllNatalConfigurations: false, includeDecadal: false, includeAnnual: false };
  }
  switch (key) {
    case "overview":
      return { kind: "overview", palaceIds: lifeAndBody, packIds: ["core_temperament", "final_synthesis"], includePatterns: true, includeTransformations: true, includeAllNatalConfigurations: false, includeDecadal: false, includeAnnual: false };
    case "coreAxis":
      return { kind: "coreAxis", palaceIds: lifeAndBody, packIds: ["core_temperament"], includePatterns: true, includeTransformations: true, includeAllNatalConfigurations: false, includeDecadal: false, includeAnnual: false };
    case "keyConfigurations":
      return { kind: "keyConfigurations", palaceIds: [], packIds: ["patterns_transformations"], includePatterns: true, includeTransformations: true, includeAllNatalConfigurations: true, includeDecadal: false, includeAnnual: false };
    case "strengthsAndTensions":
      return { kind: "strengthsAndTensions", palaceIds: lifeAndBody, packIds: ["core_temperament", "patterns_transformations", "final_synthesis"], includePatterns: true, includeTransformations: true, includeAllNatalConfigurations: false, includeDecadal: false, includeAnnual: false };
    case "currentDecadal":
      return {
        kind: "currentDecadal",
        palaceIds: facts.timing.decadal.state === "active" ? [facts.timing.decadal.palaceId] : [],
        packIds: [],
        includePatterns: false,
        includeTransformations: false,
        includeAllNatalConfigurations: false,
        includeDecadal: true,
        includeAnnual: false,
      };
    case "annualSnapshot":
      return { kind: "annualSnapshot", palaceIds: [facts.timing.annual.palaceId], packIds: [], includePatterns: false, includeTransformations: false, includeAllNatalConfigurations: false, includeDecadal: false, includeAnnual: true };
    case "birthTimeSensitivity":
      return { kind: "birthTimeSensitivity", palaceIds: [], packIds: [], includePatterns: false, includeTransformations: false, includeAllNatalConfigurations: false, includeDecadal: false, includeAnnual: false };
    case "practicalDirection":
      return { kind: "practicalAction", palaceIds: lifeAndBody, packIds: ["final_synthesis"], includePatterns: true, includeTransformations: true, includeAllNatalConfigurations: false, includeDecadal: true, includeAnnual: true };
  }
}

function schemaFor(key: ComprehensiveReportSectionKey): z.ZodType {
  let value: z.ZodType;
  if (key === "overview" || key === "coreAxis" || key === "strengthsAndTensions") value = narrativeSchema;
  else if (key === "keyConfigurations") value = keyConfigurationsSchema;
  else if (isPalaceKey(key)) value = palaceValueSchema;
  else if (isThematicKey(key)) value = thematicValueSchema;
  else if (key === "currentDecadal") value = ZiweiComprehensiveReportCurrentDecadalV2Schema;
  else if (key === "annualSnapshot") value = ZiweiComprehensiveReportAnnualSnapshotV2Schema;
  else if (key === "birthTimeSensitivity") value = ZiweiComprehensiveReportBirthTimeSensitivityV2Schema;
  else value = practicalDirectionSchema;
  return z.object({ key: z.literal(key), value }).strict();
}

function boundedFindings(
  findings: readonly (string | ComprehensiveReportSectionWriterV4Finding)[],
): Array<string | ComprehensiveReportSectionWriterV4Finding> {
  return findings.slice(0, 8).map((finding) =>
    typeof finding === "string"
      ? finding.trim().slice(0, 300)
      : {
          itemKey: finding.itemKey.trim().slice(0, 120),
          code: finding.code,
          note: finding.note.trim().slice(0, 300),
        },
  );
}

function keyConfigurationRequirements(input: ComprehensiveReportSectionWriterV4Input) {
  if (
    !isKeyConfigurationContractPrompt(input.promptVersion) ||
    input.reportConfigVersion !== REPORT_CONFIG_VERSION_V4_1_1_SECTIONED_SENSITIVITY ||
    input.sectionKey !== "keyConfigurations"
  ) {
    return null;
  }
  const threshold = resolveZiweiReportQualitySectionThreshold(
    input.reportConfigVersion,
    REPORT_QUALITY_VERSION_COMPREHENSIVE_V2_1_SENSITIVITY,
    "keyConfigurations",
  );
  return Object.freeze({
    perItem: true as const,
    minimumSyllables: threshold.minimumSyllables,
    targetMinimumSyllables: threshold.targetMinimumSyllables,
    targetMaximumSyllables: threshold.targetMaximumSyllables,
  });
}

function isKeyConfigurationContractPrompt(promptVersion: ComprehensiveReportSectionWriterV4Input["promptVersion"]): boolean {
  return promptVersion === REPORT_PROMPT_VERSION_V4_1_1_SENSITIVITY ||
    promptVersion === REPORT_PROMPT_VERSION_V4_1_2_SENSITIVITY;
}

function rewritePayload(input: ComprehensiveReportSectionWriterV4Input) {
  if (!input.rewrite) return {};
  const priorItems = input.rewrite.priorSection.key === "keyConfigurations"
    ? input.rewrite.priorSection.value
    : null;
  const isKeyConfigurationContract =
    isKeyConfigurationContractPrompt(input.promptVersion) &&
    input.sectionKey === "keyConfigurations" &&
    priorItems !== null;
  return {
    rewrite: {
      priorSection: input.rewrite.priorSection,
      findings: boundedFindings(input.rewrite.findings),
      ...(isKeyConfigurationContract ? {
        itemKeys: priorItems.map(
          (_item, index) => `keyConfigurations[${index}]`,
        ),
        preserveItemCount: true,
        preserveItemOrder: true,
        preserveEvidenceKeys: true,
      } : {}),
    },
  };
}

function natalSourceKeys(
  palaces: ComprehensiveZiweiFactsV4["natal"]["palaces"],
  transformations: ComprehensiveZiweiFactsV4["natal"]["transformations"],
  patterns: ComprehensiveZiweiFactsV4["natal"]["patterns"],
): Set<string> {
  const keys = new Set<string>();
  for (const palace of palaces) {
    keys.add(palace.palaceId);
    keys.add(palace.earthlyBranchId);
    if (palace.heavenlyStemId) keys.add(palace.heavenlyStemId);
    for (const star of palace.stars) {
      keys.add(star.id);
      if (star.brightness) keys.add(star.brightness);
    }
  }
  for (const transformation of transformations) {
    keys.add(transformation.id);
    keys.add(transformation.starId);
  }
  for (const pattern of patterns) {
    keys.add(pattern.id);
    for (const palaceId of pattern.palaceIds) keys.add(palaceId);
    for (const starId of pattern.starIds) keys.add(starId);
  }
  return keys;
}

function decadalSourceKeys(decadal: ComprehensiveZiweiFactsV4["timing"]["decadal"]): Set<string> {
  const keys = new Set<string>();
  if (decadal.state === "not_started") {
    keys.add("timing.decadal.state:not_started");
    keys.add(`timing.decadal.firstCycleStartAge:${decadal.firstCycleStartAge}`);
    keys.add(`timing.decadal.firstCycleStartYear:${decadal.firstCycleStartYear}`);
    return keys;
  }

  keys.add("timing.decadal.state:active");
  keys.add(`timing.decadal.index:${decadal.index}`);
  keys.add(`timing.decadal.ageRange:${decadal.ageRange[0]}-${decadal.ageRange[1]}`);
  keys.add(`timing.decadal.yearRange:${decadal.yearRange[0]}-${decadal.yearRange[1]}`);
  keys.add(decadal.palaceId);
  keys.add(decadal.heavenlyStemId);
  keys.add(decadal.earthlyBranchId);
  for (const palace of decadal.palaces) {
    keys.add(palace.palaceId);
    keys.add(palace.heavenlyStemId);
    keys.add(palace.earthlyBranchId);
    keys.add(palace.cycleStateId);
    if (palace.isOriginalPalace) keys.add("isOriginalPalace:true");
    for (const star of palace.stars) {
      keys.add(star.id);
      if (star.brightness) keys.add(star.brightness);
      if (star.category) keys.add(star.category);
    }
    for (const transformation of palace.transformations) {
      keys.add(transformation.id);
      keys.add(transformation.starId);
    }
  }
  return keys;
}

function annualSourceKeys(annual: ComprehensiveZiweiFactsV4["timing"]["annual"]): Set<string> {
  const keys = new Set<string>([
    `timing.annual.targetYear:${annual.targetYear}`,
    annual.palaceId,
    annual.heavenlyStemId,
    annual.earthlyBranchId,
  ]);
  for (const palace of annual.palaces) {
    keys.add(palace.palaceId);
    keys.add(palace.heavenlyStemId);
    keys.add(palace.earthlyBranchId);
    keys.add(palace.cycleStateId);
    if (palace.isOriginalPalace) keys.add("isOriginalPalace:true");
    for (const star of palace.stars) {
      keys.add(star.id);
      if (star.brightness) keys.add(star.brightness);
      if (star.category) keys.add(star.category);
    }
    for (const transformation of palace.transformations) {
      keys.add(transformation.id);
      keys.add(transformation.starId);
    }
  }
  return keys;
}

function mappedEvidenceKeys(
  facts: ComprehensiveZiweiFactsV4,
  sourceKeys: ReadonlySet<string>,
  dimensions: readonly string[],
): string[] {
  const allowedDimensions = new Set(dimensions);
  return facts.evidence.items
    .filter((item) =>
      allowedDimensions.has(item.dimension)
      && facts.evidenceKeys.includes(item.key)
      && item.sourceKeys.some((sourceKey) => sourceKeys.has(sourceKey)),
    )
    .map((item) => item.key)
    .sort();
}

function scopedPayload(input: ComprehensiveReportSectionWriterV4Input, scope: SectionScope) {
  const requirements = keyConfigurationRequirements(input);
  if (input.sectionKey === "birthTimeSensitivity") {
    const allowedEvidenceKeys = input.facts.evidence.items
      .filter((item) =>
        input.facts.evidenceKeys.includes(item.key) &&
        (item.key.startsWith("sensitivity.stable.") || item.key.startsWith("sensitivity.sensitive.")),
      )
      .map((item) => item.key)
      .sort();
    return {
      sectionKey: input.sectionKey,
      facts: {
        sensitivity: {
          stableFactKeys: [...input.facts.sensitivity.stableFactKeys],
          sensitiveFacts: input.facts.sensitivity.sensitiveFacts.map((fact) => ({
            factKey: fact.factKey,
            variants: fact.variants.map((variant) => ({
              position: variant.position,
              valueIds: [...variant.valueIds],
              evidenceKeys: variant.evidenceKeys.filter((key) => allowedEvidenceKeys.includes(key)),
            })),
          })),
        },
      },
      allowedEvidenceKeys,
      knowledgePacks: [],
      readingContext: null,
      personalizationGuidance: null,
      ...(requirements ? { keyConfigurationRequirements: requirements } : {}),
      ...(input.priorSectionDigest ? { priorSectionDigest: input.priorSectionDigest } : {}),
      ...rewritePayload(input),
    };
  }
  const palaces = input.facts.natal.palaces.filter((palace) => scope.palaceIds.includes(palace.palaceId));
  const transformations = scope.includeTransformations
    ? scope.includeAllNatalConfigurations
      ? input.facts.natal.transformations
      : input.facts.natal.transformations.filter((item) => palaces.some((palace) => palace.stars.some((star) => star.id === item.starId)))
    : [];
  const patterns = scope.includePatterns
    ? scope.includeAllNatalConfigurations
      ? input.facts.natal.patterns
      : input.facts.natal.patterns.filter((item) => item.palaceIds.some((id) => scope.palaceIds.includes(id)))
    : [];
  const natalKeys = natalSourceKeys(palaces, transformations, patterns);
  const decadalKeys = scope.includeDecadal ? decadalSourceKeys(input.facts.timing.decadal) : new Set<string>();
  const annualKeys = scope.includeAnnual ? annualSourceKeys(input.facts.timing.annual) : new Set<string>();
  const allowedEvidenceKeys = new Set<string>([
    ...mappedEvidenceKeys(input.facts, natalKeys, ["natal"]),
    ...mappedEvidenceKeys(input.facts, decadalKeys, ["decadal"]),
    ...mappedEvidenceKeys(input.facts, annualKeys, ["annual"]),
  ]);
  const knowledgePacks = input.knowledgePacks
    .filter((pack) => scope.packIds.includes(pack.id))
    .map((pack) => ({
      id: pack.id,
      evidenceKeys: mappedEvidenceKeys(
        input.facts,
        new Set(pack.evidenceKeys.filter((key) => natalKeys.has(key))),
        ["natal"],
      ),
      passages: pack.passages.slice(0, 2).map((passage) => ({
        passageId: passage.passageId,
        content: passage.content.slice(0, 1_800),
        metadata: passage.metadata,
      })),
    }));
  knowledgePacks.forEach((pack) => pack.evidenceKeys.forEach((key) => allowedEvidenceKeys.add(key)));

  return {
    sectionKey: input.sectionKey,
    facts: {
      natal: { palaces, transformations, patterns },
      ...(scope.includeDecadal ? { decadal: input.facts.timing.decadal } : {}),
      ...(scope.includeAnnual ? {
        annual: input.facts.timing.annual,
        frozenTiming: { targetYear: input.facts.timing.annual.targetYear, asOfDate: input.facts.sourceSnapshot.asOfDate },
      } : {}),
    },
    allowedEvidenceKeys: [...allowedEvidenceKeys].sort(),
    brightnessLabelsVi: BRIGHTNESS_LABELS_VI,
    knowledgePacks,
    readingContext: (() => {
      const parsed = ReadingContextV1Schema.safeParse(input.readingContext ?? null);
      return parsed.success
        ? { lifeStage: parsed.data.lifeStage ?? null, topConcern: parsed.data.topConcern ?? null }
        : null;
    })(),
    thematicPriority:
      input.sectionKey === "thematic:career_wealth"
        ? input.readingContext?.topConcern === "career" || input.readingContext?.topConcern === "money"
        : input.sectionKey === "thematic:relationships_family"
          ? input.readingContext?.topConcern === "love" || input.readingContext?.topConcern === "family"
          : input.sectionKey === "thematic:wellbeing_inner_resources"
            ? input.readingContext?.topConcern === "wellbeing" || input.readingContext?.topConcern === "self_understanding"
            : false,
    personalizationGuidance:
      input.sectionKey === "overview" || input.sectionKey === "coreAxis"
        ? { useLifeStageForFraming: true }
        : input.sectionKey === "practicalDirection"
          ? { useTopConcernForPracticalDirection: true }
          : null,
    ...(requirements ? { keyConfigurationRequirements: requirements } : {}),
    ...(input.priorSectionDigest ? { priorSectionDigest: input.priorSectionDigest } : {}),
    ...rewritePayload(input),
  };
}

const SECTION_SYSTEM_PROMPT = `Bạn là chuyên gia luận giải Tử Vi Đẩu Số tại lasoviet.net.
Viết đúng một phần báo cáo tiếng Việt bằng JSON theo schema được cung cấp, chỉ dựa trên facts, knowledgePacks và allowedEvidenceKeys.
Không nhắc AI, prompt, dữ liệu đầu vào, hệ thống, quy trình tính toán hoặc truy xuất. Không dùng khối tuyên bố miễn trừ trách nhiệm.
Không bịa sự kiện tương lai cụ thể, không dùng khẳng định định mệnh về tai nạn, tử vong, phá sản hoặc phản bội.
Tên cung như Phu Thê và Tử Tức được phép khi đang mô tả cấu trúc lá số một cách thực tế; hãy viết kèm ngữ cảnh cung, tam phương, đối cung hoặc xung chiếu, không dùng chúng như nhãn diễn giải rời.
Không đặt câu hỏi tự suy ngẫm, không tạo mã định danh mới, và không lặp lại lời khuyên/cảnh báo.
 Mọi evidenceKeys phải sao chép nguyên văn từ allowedEvidenceKeys. Chỉ dùng nhãn brightnessLabelsVi cho độ sáng sao; không dùng chữ Hán, chữ Nôm hoặc mô tả độ sáng bằng tiếng Anh.
readingContext chỉ dùng mã enum lifeStage và topConcern để chọn ví dụ đời sống gần gũi hoặc nhấn mạnh chủ đề. Tuyệt đối không nói hay ngụ ý lá số đã tiết lộ hoàn cảnh hoặc mối quan tâm này, và không tạo bất kỳ khẳng định Tử Vi nào liên kết sao với readingContext. Khi readingContext là null, dùng ví dụ trung tính, cân bằng.`;

function acceptanceContract(
  input: ComprehensiveReportSectionWriterV4Input,
  sectionKind: SectionScope["kind"],
) {
  if (input.promptVersion !== REPORT_PROMPT_VERSION_V4_1_2_SENSITIVITY) return null;
  const quality = resolveZiweiReportQualityConfig(
    REPORT_CONFIG_VERSION_V4_1_1_SECTIONED_SENSITIVITY,
    REPORT_QUALITY_VERSION_COMPREHENSIVE_V2_1_SENSITIVITY,
  );
  const threshold = resolveZiweiReportQualitySectionThreshold(
    REPORT_CONFIG_VERSION_V4_1_1_SECTIONED_SENSITIVITY,
    REPORT_QUALITY_VERSION_COMPREHENSIVE_V2_1_SENSITIVITY,
    sectionKind,
  );
  return {
    scope: "section-and-item-addressed",
    suppliedFindings: "Correct every supplied finding for its exact section or itemKey.",
    sectionLength: {
      appliesPerItem:
        input.sectionKey === "keyConfigurations" ||
        input.sectionKey === "practicalDirection" ||
        input.sectionKey === "birthTimeSensitivity",
      minimumSyllables: threshold.minimumSyllables,
      targetMinimumSyllables: threshold.targetMinimumSyllables,
      targetMaximumSyllables: threshold.targetMaximumSyllables,
    },
    forbiddenTerms: {
      discouraged: [...quality.discouragedTerms],
      contextualPalaceNameExceptions: {
        terms: ["Phu Thê", "Tử Tức"],
        rule: "Allow only explicit palace-name references in chart-structure context; reject ambiguous interpretive usage.",
      },
      death: [...quality.deathTerms],
      certainty: [...quality.certaintyPhrases],
    },
    localeIntegrity: {
      language: "vi",
      noHanIdeographs: true,
      noNomIdeographs: true,
      noEnglishBrightnessDescriptors: true,
      allowedBrightnessLabels: Object.values(BRIGHTNESS_LABELS_VI),
    },
    properNameDensity: {
      configuredProperNames: [...quality.properNames],
      maximumPer100Syllables: quality.maxProperNamesPer100Syllables,
    },
    evidence: {
      useOnlyAllowedEvidenceKeys: true,
      preserveEvidenceBackedChartFacts: true,
      preserveRequiredEvidenceKeys: true,
    },
    noNewQualityViolations: true,
    ...(input.sectionKey === "keyConfigurations" ? {
      keyConfigurations: {
        preserveExactTitleOrderEvidenceKeysIdentity: true,
      },
    } : {}),
  } as const;
}

function appliesLengthPerItem(sectionKey: ComprehensiveReportSectionKey): boolean {
  return sectionKey === "keyConfigurations" ||
    sectionKey === "practicalDirection" ||
    sectionKey === "birthTimeSensitivity";
}

function measuredSectionLengths(section: ComprehensiveReportAcceptedSection): Array<{
  itemKey: string;
  syllables: number;
}> {
  if (section.key === "birthTimeSensitivity") {
    return [
      {
        itemKey: "birthTimeSensitivity.stableFactors",
        syllables: countVietnameseSyllables(
          `${section.value.stableFactors.title} ${section.value.stableFactors.narrative}`,
        ),
      },
      {
        itemKey: "birthTimeSensitivity.sensitiveFactors",
        syllables: countVietnameseSyllables(
          `${section.value.sensitiveFactors.title} ${section.value.sensitiveFactors.narrative}`,
        ),
      },
    ];
  }
  if (Array.isArray(section.value)) {
    return section.value.map((item, index) => ({
      itemKey: `${section.key}[${index}]`,
      syllables: countVietnameseSyllables(
        "recommendation" in item
          ? `${item.recommendation} ${item.rationale} ${item.avoid}`
          : `${item.title} ${item.narrative}`,
      ),
    }));
  }
  return [{
    itemKey: section.key,
    syllables: countVietnameseSyllables(`${section.value.title} ${section.value.narrative}`),
  }];
}

function v4_1_2LengthInstruction(
  input: ComprehensiveReportSectionWriterV4Input,
  contract: NonNullable<ReturnType<typeof acceptanceContract>>,
): string {
  const { minimumSyllables, targetMinimumSyllables, targetMaximumSyllables } = contract.sectionLength;
  const perItem = appliesLengthPerItem(input.sectionKey);
  const paragraphCount = targetMinimumSyllables >= 700 ? 5 : targetMinimumSyllables >= 400 ? 4 : 3;
  const minimumPerParagraph = Math.ceil(targetMinimumSyllables / paragraphCount);
  const base = `Yêu cầu độ dài bắt buộc: hệ thống đếm mỗi đơn vị đã chuẩn hóa và được ngăn cách bởi whitespace là 1 âm tiết. ${perItem ? "Mỗi phần tử được kiểm tra riêng." : "Toàn bộ phần này được kiểm tra."} Tối thiểu ${minimumSyllables} âm tiết; mục tiêu ${targetMinimumSyllables}-${targetMaximumSyllables} âm tiết. Không kết thúc khi chưa đạt tối thiểu ${targetMinimumSyllables} âm tiết.`;
  const deliveryPlan = !perItem
    ? `Kế hoạch triển khai: viết ${paragraphCount} đoạn văn thực chất, mỗi đoạn ít nhất ${minimumPerParagraph} đơn vị, để tổng phần nằm trong ${targetMinimumSyllables}-${targetMaximumSyllables} âm tiết và trong giới hạn schema.`
    : input.sectionKey === "practicalDirection"
      ? `Kế hoạch triển khai: với TỪNG practicalDirection[i], phân bổ nội dung thực chất cho recommendation, rationale và avoid; mỗi trường ít nhất ${Math.ceil(targetMinimumSyllables / 3)} đơn vị để mỗi item đạt ${targetMinimumSyllables}-${targetMaximumSyllables} âm tiết, không vượt giới hạn schema.`
      : input.sectionKey === "birthTimeSensitivity"
        ? `Kế hoạch triển khai: với TỪNG mục stableFactors và sensitiveFactors, viết ${paragraphCount} đoạn thực chất trong narrative, mỗi đoạn ít nhất ${minimumPerParagraph} đơn vị, để mỗi mục đạt ${targetMinimumSyllables}-${targetMaximumSyllables} âm tiết và trong giới hạn schema.`
        : `Kế hoạch triển khai: với TỪNG keyConfigurations[i], viết ${paragraphCount} đoạn thực chất trong narrative, mỗi đoạn ít nhất ${minimumPerParagraph} đơn vị, để mỗi item đạt ${targetMinimumSyllables}-${targetMaximumSyllables} âm tiết và trong giới hạn schema.`;
  if (!input.rewrite) return `${base}\n${deliveryPlan}`;

  const measurements = measuredSectionLengths(input.rewrite.priorSection);
  const measuredPriorLength = measurements
    .map(({ itemKey, syllables }) =>
      `${itemKey}: hiện ${syllables} âm tiết, cần bổ sung ít nhất ${Math.max(0, targetMinimumSyllables - syllables)} âm tiết`,
    )
    .join("; ");
  const hasMinimumSyllablesFinding = input.rewrite.findings.some((finding) =>
    typeof finding !== "string" && finding.code === "MINIMUM_SYLLABLES",
  );
  const rewriteInstruction = hasMinimumSyllablesFinding
    ? `Có finding MINIMUM_SYLLABLES: giữ nguyên mọi nội dung hợp lệ, không tóm tắt hoặc nén nội dung, và bổ sung văn xuôi tiếng Việt có thực chất theo số lượng nêu trên để đạt ít nhất ${targetMinimumSyllables} âm tiết cho ${perItem ? "từng item" : "phần này"}.`
    : `Khi rewrite, giữ nguyên nội dung hợp lệ và mở rộng theo số lượng nêu trên khi cần để đạt ít nhất ${targetMinimumSyllables} âm tiết cho ${perItem ? "từng item" : "phần này"}.`;
  return `${base}
${deliveryPlan}
Độ dài prior section theo cách đếm trên: ${measuredPriorLength}.
${rewriteInstruction}`;
}

export async function writeComprehensiveReportSectionV4(
  input: ComprehensiveReportSectionWriterV4Input,
): Promise<ComprehensiveReportSectionWriterV4Result> {
  const reportConfigVersion = input.reportConfigVersion ?? REPORT_CONFIG_VERSION_V4_1_SECTIONED;
  const isV4 = input.promptVersion === REPORT_PROMPT_VERSION_V4_0_1 &&
    reportConfigVersion === REPORT_CONFIG_VERSION_V4_1_SECTIONED;
  const isV4_1 = input.promptVersion === REPORT_PROMPT_VERSION_V4_1_SENSITIVITY &&
    (
      reportConfigVersion === REPORT_CONFIG_VERSION_V4_1_SECTIONED_SENSITIVITY ||
      reportConfigVersion === REPORT_CONFIG_VERSION_V4_1_1_SECTIONED_SENSITIVITY
    );
  const isV4_1_1 = input.promptVersion === REPORT_PROMPT_VERSION_V4_1_1_SENSITIVITY &&
    reportConfigVersion === REPORT_CONFIG_VERSION_V4_1_1_SECTIONED_SENSITIVITY;
  const isV4_1_2 = input.promptVersion === REPORT_PROMPT_VERSION_V4_1_2_SENSITIVITY &&
    reportConfigVersion === REPORT_CONFIG_VERSION_V4_1_1_SECTIONED_SENSITIVITY;
  if (!isV4 && !isV4_1 && !isV4_1_1 && !isV4_1_2) {
    throw new Error("COMPREHENSIVE_REPORT_SECTION_PROMPT_UNSUPPORTED");
  }
  if (!resolveComprehensiveReportSectionKeys(reportConfigVersion).includes(input.sectionKey)) {
    throw new Error("COMPREHENSIVE_REPORT_SECTION_KEY_UNSUPPORTED");
  }
  if (input.rewrite && input.rewrite.priorSection.key !== input.sectionKey) {
    throw new Error("COMPREHENSIVE_REPORT_SECTION_REWRITE_KEY_MISMATCH");
  }
  const scope = scopeFor(input.sectionKey, input.facts);
  const requirements = keyConfigurationRequirements({
    ...input,
    reportConfigVersion,
  });
  const contract = acceptanceContract(
    { ...input, reportConfigVersion },
    scope.kind,
  );
  const maxOutputTokens = isV4
    ? ziweiComprehensiveReportQualityV1.sections[
      scope.kind as keyof typeof ziweiComprehensiveReportQualityV1.sections
    ].maxOutputTokens
    : resolveZiweiReportQualitySectionThreshold(
      reportConfigVersion,
      reportConfigVersion === REPORT_CONFIG_VERSION_V4_1_SECTIONED_SENSITIVITY
        ? REPORT_QUALITY_VERSION_COMPREHENSIVE_V2_SENSITIVITY
        : REPORT_QUALITY_VERSION_COMPREHENSIVE_V2_1_SENSITIVITY,
      scope.kind,
    ).maxOutputTokens;
  const result = await input.provider.generateStructured({
    schema: schemaFor(input.sectionKey),
    schemaName: `ziwei_comprehensive_report_section_${input.sectionKey.replace(/[^a-z0-9]+/giu, "_")}`,
    system: contract
      ? `${SECTION_SYSTEM_PROMPT}
Acceptance contract: every supplied finding must be corrected at its exact section/item address; meet the configured per-section or per-item syllable range; avoid every configured discouraged, death, and certainty term, except Phu Thê and Tử Tức when they are explicit palace-name references in chart-structure context; emit no Han/Nom ideograph or English brightness descriptor; satisfy configured proper-name density; preserve evidence-backed chart facts and required evidence keys; introduce no new quality violation.
${v4_1_2LengthInstruction(input, contract)}
${requirements ? `Với keyConfigurations, áp dụng keyConfigurationRequirements cho TỪNG phần tử riêng biệt: tối thiểu ${requirements.minimumSyllables} âm tiết, mục tiêu ${requirements.targetMinimumSyllables}-${requirements.targetMaximumSyllables} âm tiết.
Khi rewrite, phải giữ nguyên số lượng, thứ tự và evidenceKeys của từng keyConfigurations[i], sửa đầy đủ mọi finding theo đúng itemKey, không bịa facts hoặc evidence.` : ""}`
      : requirements
      ? `${SECTION_SYSTEM_PROMPT}
Với keyConfigurations, áp dụng keyConfigurationRequirements cho TỪNG phần tử riêng biệt: tối thiểu ${requirements.minimumSyllables} âm tiết, mục tiêu ${requirements.targetMinimumSyllables}-${requirements.targetMaximumSyllables} âm tiết.
Khi rewrite, phải giữ nguyên số lượng, thứ tự và evidenceKeys của từng keyConfigurations[i], sửa đầy đủ mọi finding theo đúng itemKey, không bịa facts hoặc evidence.`
      : SECTION_SYSTEM_PROMPT,
    user: JSON.stringify({
      ...scopedPayload(input, scope),
      ...(contract ? { acceptanceContract: contract } : {}),
    }),
    use: "production_report_generation",
    purpose: input.rewrite ? "rewrite" : "report",
    maxOutputTokens,
    costContext: input.costContext,
  });
  if (!result.ok) return result;
  try {
    const section = parseComprehensiveReportAcceptedSection(result.value.value, reportConfigVersion);
    if (section.key !== input.sectionKey) throw new Error("key mismatch");
    return { ok: true, value: { ...section, providerId: result.value.providerId, modelId: result.value.modelId } };
  } catch {
    return { ok: false, error: { code: "AI_OUTPUT_INVALID", retryable: false } };
  }
}

export { COMPREHENSIVE_REPORT_SECTION_KEYS };
