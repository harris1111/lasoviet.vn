import {
  type AiCostRequestContext,
  ZIWEI_PALACE_IDS,
  ZIWEI_THEMATIC_SYNTHESIS_IDS,
  ZiweiComprehensiveReportActionItemV2Schema,
  ZiweiComprehensiveReportAnnualSnapshotV2Schema,
  ZiweiComprehensiveReportCurrentDecadalV2Schema,
  type ZiweiPalaceId,
  type ZiweiThematicSynthesisId,
  ReadingContextV1Schema,
  type ReadingContextV1,
  z,
} from "@lasoviet/contracts";
import { ziweiComprehensiveReportQualityV1 } from "@lasoviet/config";

import type { AiProvider, AiProviderError } from "../ai/ai-provider.js";
import type { ComprehensiveZiweiFactsV4 } from "./comprehensive-ziwei-facts-v4.js";
import type { ZiweiReportKnowledgePack } from "./comprehensive-report-retrieval.js";
import {
  COMPREHENSIVE_REPORT_SECTION_KEYS,
  parseComprehensiveReportAcceptedSection,
  type ComprehensiveReportAcceptedSection,
  type ComprehensiveReportSectionKey,
} from "./comprehensive-report-section-v4.js";
import type { ComprehensiveReportSectionDigest } from "./comprehensive-report-section-digest-v4.js";
import { BRIGHTNESS_LABELS_VI } from "./comprehensive-report-writer.js";
import { REPORT_PROMPT_VERSION_V4_0_1 } from "./identity-report-config.js";

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
  findings: readonly string[];
};

export type ComprehensiveReportSectionWriterV4Input = {
  sectionKey: ComprehensiveReportSectionKey;
  facts: ComprehensiveZiweiFactsV4;
  knowledgePacks: readonly ZiweiReportKnowledgePack[];
  priorSectionDigest?: ComprehensiveReportSectionDigest;
  rewrite?: ComprehensiveReportSectionWriterV4Rewrite;
  provider: AiProvider;
  promptVersion: typeof REPORT_PROMPT_VERSION_V4_0_1;
  costContext?: AiCostRequestContext;
  readingContext?: ReadingContextV1 | null;
};

export type ComprehensiveReportSectionWriterV4Result =
  | { ok: true; value: ComprehensiveReportAcceptedSection & { providerId: string; modelId: string } }
  | { ok: false; error: AiProviderError | { code: "AI_OUTPUT_INVALID"; retryable: false } };

type SectionScope = {
  kind: keyof typeof ziweiComprehensiveReportQualityV1.sections;
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
  else value = practicalDirectionSchema;
  return z.object({ key: z.literal(key), value }).strict();
}

function boundedFindings(findings: readonly string[]): string[] {
  return findings.slice(0, 8).map((finding) => finding.trim().slice(0, 300));
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
    ...(input.priorSectionDigest ? { priorSectionDigest: input.priorSectionDigest } : {}),
    ...(input.rewrite ? {
      rewrite: {
        priorSection: input.rewrite.priorSection,
        findings: boundedFindings(input.rewrite.findings),
      },
    } : {}),
  };
}

const SECTION_SYSTEM_PROMPT = `Bạn là chuyên gia luận giải Tử Vi Đẩu Số tại lasoviet.net.
Viết đúng một phần báo cáo tiếng Việt bằng JSON theo schema được cung cấp, chỉ dựa trên facts, knowledgePacks và allowedEvidenceKeys.
Không nhắc AI, prompt, dữ liệu đầu vào, hệ thống, quy trình tính toán hoặc truy xuất. Không dùng khối tuyên bố miễn trừ trách nhiệm.
Không bịa sự kiện tương lai cụ thể, không dùng khẳng định định mệnh về tai nạn, tử vong, phá sản hoặc phản bội.
Không đặt câu hỏi tự suy ngẫm, không tạo mã định danh mới, và không lặp lại lời khuyên/cảnh báo.
 Mọi evidenceKeys phải sao chép nguyên văn từ allowedEvidenceKeys. Chỉ dùng nhãn brightnessLabelsVi cho độ sáng sao; không dùng chữ Hán, chữ Nôm hoặc mô tả độ sáng bằng tiếng Anh.
 readingContext chỉ dùng mã enum lifeStage và topConcern để chọn ví dụ đời sống gần gũi hoặc nhấn mạnh chủ đề. Tuyệt đối không nói hay ngụ ý lá số đã tiết lộ hoàn cảnh hoặc mối quan tâm này, và không tạo bất kỳ khẳng định Tử Vi nào liên kết sao với readingContext. Khi readingContext là null, dùng ví dụ trung tính, cân bằng.`;

export async function writeComprehensiveReportSectionV4(
  input: ComprehensiveReportSectionWriterV4Input,
): Promise<ComprehensiveReportSectionWriterV4Result> {
  if (input.promptVersion !== REPORT_PROMPT_VERSION_V4_0_1) {
    throw new Error("COMPREHENSIVE_REPORT_SECTION_PROMPT_UNSUPPORTED");
  }
  if (input.rewrite && input.rewrite.priorSection.key !== input.sectionKey) {
    throw new Error("COMPREHENSIVE_REPORT_SECTION_REWRITE_KEY_MISMATCH");
  }
  const scope = scopeFor(input.sectionKey, input.facts);
  const result = await input.provider.generateStructured({
    schema: schemaFor(input.sectionKey),
    schemaName: `ziwei_comprehensive_report_section_${input.sectionKey.replace(/[^a-z0-9]+/giu, "_")}`,
    system: SECTION_SYSTEM_PROMPT,
    user: JSON.stringify(scopedPayload(input, scope)),
    use: "production_report_generation",
    purpose: input.rewrite ? "rewrite" : "report",
    maxOutputTokens: ziweiComprehensiveReportQualityV1.sections[scope.kind].maxOutputTokens,
    costContext: input.costContext,
  });
  if (!result.ok) return result;
  try {
    const section = parseComprehensiveReportAcceptedSection(result.value.value);
    if (section.key !== input.sectionKey) throw new Error("key mismatch");
    return { ok: true, value: { ...section, providerId: result.value.providerId, modelId: result.value.modelId } };
  } catch {
    return { ok: false, error: { code: "AI_OUTPUT_INVALID", retryable: false } };
  }
}

export { COMPREHENSIVE_REPORT_SECTION_KEYS };
