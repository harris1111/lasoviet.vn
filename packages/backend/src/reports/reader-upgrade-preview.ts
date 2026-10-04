import {
  COMPREHENSIVE_REPORT_SECTION_IDS, ReportUpgradePreviewV1Schema,
  type ReportUpgradePreviewV1, type ZiweiComprehensiveReportContentV1,
  type ZiweiComprehensiveReportContentV2, type ZiweiComprehensiveReportContentV3,
} from "@lasoviet/contracts";

type StoredContent = ZiweiComprehensiveReportContentV1 | ZiweiComprehensiveReportContentV2 | ZiweiComprehensiveReportContentV3;

/** Called only after the ready report's immutable tuple and active ownership pass. */
export function buildReaderUpgradePreview(options: {
  stored: StoredContent;
  projected: object;
  reportVersionId: string;
  chartVersionId: string;
  locale: "vi" | "en";
}): ReportUpgradePreviewV1 | undefined {
  const {stored, projected} = options;
  const sourcePalaces = new Set<string>(stored.palaceReadings.map(item => item.palaceId));
  if (sourcePalaces.size !== stored.palaceReadings.length) return undefined;
  const projectedPalaces = "palaceReadings" in projected && Array.isArray(projected.palaceReadings)
    ? new Set(projected.palaceReadings.map((item: {palaceId: string}) => item.palaceId)) : new Set<string>();
  if ([...projectedPalaces].some(id => !sourcePalaces.has(id))) return undefined;
  const sections = COMPREHENSIVE_REPORT_SECTION_IDS.filter(id => id !== "palaceReadings" &&
    id !== "topicDeepDive" && id !== "periodReading" && Object.hasOwn(stored, id));
  const openedSections = sections.filter(id => Object.hasOwn(projected, id)).length;
  const result: ReportUpgradePreviewV1 = {
    version: 1, reportVersionId: options.reportVersionId, chartVersionId: options.chartVersionId, locale: options.locale,
    coverage: {openedSections, lockedSections: sections.length - openedSections,
      openedPalaces: projectedPalaces.size, lockedPalaces: sourcePalaces.size - projectedPalaces.size},
  };
  for (const palace of stored.palaceReadings) {
    if (projectedPalaces.has(palace.palaceId)) continue;
    const text = palace.narrative.trim();
    const boundaries = [...text.matchAll(/[.!?…](?:\s|$)/gu)].slice(0, 2).map(match => match.index + 1);
    if (boundaries.length === 2 && boundaries[1]! < 40) continue;
    const sentenceEnd = boundaries.find(index => index >= 40 && index <= 200);
    let prefix = text.slice(0, sentenceEnd ?? 200);
    if (/[\uD800-\uDBFF]$/u.test(prefix)) prefix = prefix.slice(0, -1);
    if (!sentenceEnd) {
      const lastSpace = prefix.lastIndexOf(" ");
      if (lastSpace >= 40) prefix = prefix.slice(0, lastSpace);
    }
    prefix = prefix.trimEnd();
    const remainingWords = text.slice(prefix.length).match(/\p{L}[\p{L}\p{M}]*/gu) ?? [];
    const remainingLetters = remainingWords.join("").match(/\p{L}/gu)?.length ?? 0;
    if (Array.from(prefix).length < 40 || remainingWords.length < 5 || remainingLetters < 40) continue;
    result.lockedPart = {palaceId: palace.palaceId, title: palace.title,
      clippedSentences: [prefix + "…"], lengthHint: Math.max(2, Math.min(8, Math.ceil(text.split(/\s+/u).length / 80)))};
    break;
  }
  return ReportUpgradePreviewV1Schema.parse(result);
}
