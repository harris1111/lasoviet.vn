import {
  ZIWEI_PALACE_IDS,
  ZIWEI_THEMATIC_SYNTHESIS_IDS,
  ZiweiComprehensiveReportActionItemV2Schema,
  ZiweiComprehensiveReportAnnualSnapshotV2Schema,
  ZiweiComprehensiveReportBirthTimeSensitivityV2Schema,
  ZiweiComprehensiveReportCurrentDecadalV2Schema,
  type ZiweiPalaceId,
  type ZiweiThematicSynthesisId,
  z,
} from "@lasoviet/contracts";
import {
  REPORT_CONFIG_VERSION_V4,
  REPORT_CONFIG_VERSION_V4_1_SECTIONED,
  REPORT_CONFIG_VERSION_V4_1_SECTIONED_SENSITIVITY,
} from "./identity-report-config.js";

const narrativeSchema = z.object({
  title: z.string().trim().min(1).max(120),
  narrative: z.string().trim().min(1).max(5_000),
  evidenceKeys: z.array(z.string().trim().min(1)).min(1),
}).strict();

const keyConfigurationsSchema = z.array(narrativeSchema).min(1).max(12);
const palaceValueSchema = narrativeSchema.extend({
  palaceId: z.enum(ZIWEI_PALACE_IDS),
}).strict();
const thematicValueSchema = narrativeSchema.extend({
  id: z.enum(ZIWEI_THEMATIC_SYNTHESIS_IDS),
}).strict();
const practicalDirectionSchema = z.array(ZiweiComprehensiveReportActionItemV2Schema).min(3).max(5);

export const COMPREHENSIVE_REPORT_SECTION_KEYS = [
  "overview",
  "coreAxis",
  "keyConfigurations",
  ...ZIWEI_PALACE_IDS.map((id) => `palace:${id}` as const),
  ...ZIWEI_THEMATIC_SYNTHESIS_IDS.map((id) => `thematic:${id}` as const),
  "strengthsAndTensions",
  "currentDecadal",
  "annualSnapshot",
  "practicalDirection",
] as const;

export const COMPREHENSIVE_REPORT_SECTION_KEYS_V4_1 = [
  ...COMPREHENSIVE_REPORT_SECTION_KEYS.slice(0, -1),
  "birthTimeSensitivity",
  "practicalDirection",
] as const;

export type ComprehensiveReportSectionKeyV4 =
  | "overview"
  | "coreAxis"
  | "keyConfigurations"
  | `palace:${ZiweiPalaceId}`
  | `thematic:${ZiweiThematicSynthesisId}`
  | "strengthsAndTensions"
  | "currentDecadal"
  | "annualSnapshot"
  | "practicalDirection";
export type ComprehensiveReportSectionKeyV4_1 =
  | ComprehensiveReportSectionKeyV4
  | "birthTimeSensitivity";
export type ComprehensiveReportSectionKey = ComprehensiveReportSectionKeyV4_1;

export type ComprehensiveReportAcceptedSection =
  | { key: "overview" | "coreAxis" | "strengthsAndTensions"; value: z.infer<typeof narrativeSchema> }
  | { key: "keyConfigurations"; value: z.infer<typeof keyConfigurationsSchema> }
  | { key: `palace:${ZiweiPalaceId}`; value: z.infer<typeof palaceValueSchema> }
  | { key: `thematic:${ZiweiThematicSynthesisId}`; value: z.infer<typeof thematicValueSchema> }
  | { key: "currentDecadal"; value: z.infer<typeof ZiweiComprehensiveReportCurrentDecadalV2Schema> }
  | { key: "annualSnapshot"; value: z.infer<typeof ZiweiComprehensiveReportAnnualSnapshotV2Schema> }
  | { key: "birthTimeSensitivity"; value: z.infer<typeof ZiweiComprehensiveReportBirthTimeSensitivityV2Schema> }
  | { key: "practicalDirection"; value: z.infer<typeof practicalDirectionSchema> };

export class ComprehensiveReportSectionV4Error extends Error {
  constructor() {
    super("COMPREHENSIVE_REPORT_SECTION_INVALID");
    this.name = "ComprehensiveReportSectionV4Error";
  }
}

function fail(): never {
  throw new ComprehensiveReportSectionV4Error();
}

export function resolveComprehensiveReportSectionKeys(
  reportConfigVersion: string,
): readonly ComprehensiveReportSectionKey[] {
  if (
    reportConfigVersion === REPORT_CONFIG_VERSION_V4 ||
    reportConfigVersion === REPORT_CONFIG_VERSION_V4_1_SECTIONED
  ) {
    return COMPREHENSIVE_REPORT_SECTION_KEYS;
  }
  if (reportConfigVersion === REPORT_CONFIG_VERSION_V4_1_SECTIONED_SENSITIVITY) {
    return COMPREHENSIVE_REPORT_SECTION_KEYS_V4_1;
  }
  return fail();
}

function isPalaceKey(key: string): key is `palace:${ZiweiPalaceId}` {
  return key.startsWith("palace:") &&
    (ZIWEI_PALACE_IDS as readonly string[]).includes(key.slice("palace:".length));
}

function isThematicKey(key: string): key is `thematic:${ZiweiThematicSynthesisId}` {
  return key.startsWith("thematic:") &&
    (ZIWEI_THEMATIC_SYNTHESIS_IDS as readonly string[]).includes(key.slice("thematic:".length));
}

export function parseComprehensiveReportAcceptedSection(
  source: unknown,
  reportConfigVersion: string = REPORT_CONFIG_VERSION_V4_1_SECTIONED,
): ComprehensiveReportAcceptedSection {
  const envelope = z.object({
    key: z.string(),
    value: z.unknown(),
  }).strict().safeParse(source);
  if (!envelope.success) fail();

  const { key, value } = envelope.data;
  if (!resolveComprehensiveReportSectionKeys(reportConfigVersion).includes(key as ComprehensiveReportSectionKey)) {
    return fail();
  }
  if (key === "overview" || key === "coreAxis" || key === "strengthsAndTensions") {
    const parsed = narrativeSchema.safeParse(value);
    if (!parsed.success) fail();
    return { key, value: parsed.data };
  }
  if (key === "keyConfigurations") {
    const parsed = keyConfigurationsSchema.safeParse(value);
    if (!parsed.success) fail();
    return { key, value: parsed.data };
  }
  if (isPalaceKey(key)) {
    const parsed = palaceValueSchema.safeParse(value);
    if (!parsed.success || parsed.data.palaceId !== key.slice("palace:".length)) fail();
    return { key, value: parsed.data };
  }
  if (isThematicKey(key)) {
    const parsed = thematicValueSchema.safeParse(value);
    if (!parsed.success || parsed.data.id !== key.slice("thematic:".length)) fail();
    return { key, value: parsed.data };
  }
  if (key === "currentDecadal") {
    const parsed = ZiweiComprehensiveReportCurrentDecadalV2Schema.safeParse(value);
    if (!parsed.success) fail();
    return { key, value: parsed.data };
  }
  if (key === "annualSnapshot") {
    const parsed = ZiweiComprehensiveReportAnnualSnapshotV2Schema.safeParse(value);
    if (!parsed.success) fail();
    return { key, value: parsed.data };
  }
  if (key === "birthTimeSensitivity") {
    const parsed = ZiweiComprehensiveReportBirthTimeSensitivityV2Schema.safeParse(value);
    if (!parsed.success) fail();
    return { key, value: parsed.data };
  }
  if (key === "practicalDirection") {
    const parsed = practicalDirectionSchema.safeParse(value);
    if (!parsed.success) fail();
    return { key, value: parsed.data };
  }
  return fail();
}

export function parseCompleteComprehensiveReportAcceptedSections(
  source: unknown,
  reportConfigVersion: string = REPORT_CONFIG_VERSION_V4_1_SECTIONED,
): readonly ComprehensiveReportAcceptedSection[] {
  const sectionKeys = resolveComprehensiveReportSectionKeys(reportConfigVersion);
  if (!Array.isArray(source) || source.length !== sectionKeys.length) fail();
  const byKey = new Map<string, ComprehensiveReportAcceptedSection>();
  for (const entry of source) {
    const parsed = parseComprehensiveReportAcceptedSection(entry, reportConfigVersion);
    if (byKey.has(parsed.key)) fail();
    byKey.set(parsed.key, parsed);
  }
  return sectionKeys.map((key) => {
    const entry = byKey.get(key);
    return entry ?? fail();
  });
}

export function isComprehensiveReportPalaceSection(
  section: ComprehensiveReportAcceptedSection,
): section is Extract<ComprehensiveReportAcceptedSection, { key: `palace:${ZiweiPalaceId}` }> {
  return isPalaceKey(section.key);
}
