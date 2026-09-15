import { ziweiComprehensiveReportQualityV1 } from "@lasoviet/config";

import {
  COMPREHENSIVE_REPORT_SECTION_KEYS,
  isComprehensiveReportPalaceSection,
  parseComprehensiveReportAcceptedSection,
  type ComprehensiveReportAcceptedSection,
} from "./comprehensive-report-section-v4.js";
import type { ZiweiComprehensiveReportContentV2 } from "@lasoviet/contracts";

export type ComprehensiveReportSectionDigestEntry = {
  key: string;
  headline: string;
  claim: string;
  evidenceKeys: string[];
  configurations: Array<{
    headline: string;
    claim: string;
    evidenceKeys: string[];
  }>;
  actions: Array<{
    recommendation: string;
    rationale: string;
    avoid: string;
    evidenceKeys: string[];
  }>;
};

export type ComprehensiveReportSectionDigest = {
  entries: ComprehensiveReportSectionDigestEntry[];
};

function firstSentence(text: string): string {
  const boundary = text.search(/[.!?](?:\s|$)/u);
  return (boundary < 0 ? text : text.slice(0, boundary + 1)).trim();
}

function boundedSnippet(text: string): string {
  return text.trim().slice(0, 240).trimEnd();
}

function mandatorySnippet(text: string): string {
  return text.trim().slice(0, 160).trimEnd();
}

function sortedEvidenceKeys(value: { evidenceKeys: readonly string[] }): string[] {
  return [...new Set(value.evidenceKeys)].sort((left, right) => left.localeCompare(right, "en"));
}

function entryFor(section: ComprehensiveReportAcceptedSection): ComprehensiveReportSectionDigestEntry {
  if (section.key === "keyConfigurations") {
    const configurations = section.value as ZiweiComprehensiveReportContentV2["keyConfigurations"];
    return {
      key: section.key,
      headline: "keyConfigurations",
      claim: "",
      evidenceKeys: [],
      configurations: configurations.map((item) => ({
        headline: mandatorySnippet(item.title),
        claim: mandatorySnippet(firstSentence(item.narrative)),
        evidenceKeys: [],
      })),
      actions: [],
    };
  }
  if (section.key === "practicalDirection") {
    const actions = section.value as ZiweiComprehensiveReportContentV2["practicalDirection"];
    return {
      key: section.key,
      headline: "practicalDirection",
      claim: "",
      evidenceKeys: [],
      configurations: [],
      actions: actions.map((item) => ({
        recommendation: mandatorySnippet(item.recommendation),
        rationale: mandatorySnippet(firstSentence(item.rationale)),
        avoid: mandatorySnippet(item.avoid),
        evidenceKeys: [],
      })),
    };
  }
  return {
    key: section.key,
    headline: boundedSnippet(section.value.title),
    claim: boundedSnippet(firstSentence(section.value.narrative)),
    evidenceKeys: [],
    configurations: [],
    actions: [],
  };
}

function serializedLength(entries: readonly ComprehensiveReportSectionDigestEntry[]): number {
  return JSON.stringify({ entries }).length;
}

function failClosed(): never {
  throw new Error("COMPREHENSIVE_REPORT_SECTION_DIGEST_INVALID");
}

function appendEvidenceKeysThatFit(
  entries: ComprehensiveReportSectionDigestEntry[],
  sections: readonly ComprehensiveReportAcceptedSection[],
  maxChars: number,
): void {
  for (const section of sections) {
    const entry = entries.find((candidate) => candidate.key === section.key);
    if (!entry) continue;

    const addIfFits = (keys: string[], key: string) => {
      keys.push(key);
      if (serializedLength(entries) > maxChars) keys.pop();
    };

    if (section.key === "keyConfigurations") {
      section.value.forEach((item, index) => {
        for (const key of sortedEvidenceKeys(item)) {
          addIfFits(entry.configurations[index]!.evidenceKeys, key);
        }
      });
      continue;
    }
    if (section.key === "practicalDirection") {
      section.value.forEach((item, index) => {
        for (const key of sortedEvidenceKeys(item)) {
          addIfFits(entry.actions[index]!.evidenceKeys, key);
        }
      });
      continue;
    }
    for (const key of sortedEvidenceKeys(section.value)) {
      addIfFits(entry.evidenceKeys, key);
    }
  }
}

function boundedDigest(sections: readonly ComprehensiveReportAcceptedSection[]): ComprehensiveReportSectionDigest {
  const maxEntries = ziweiComprehensiveReportQualityV1.digestMaxEntries;
  const maxChars = ziweiComprehensiveReportQualityV1.digestMaxChars;
  const mandatoryKeys = new Set(["keyConfigurations", "practicalDirection"]);
  const selected = new Map<string, ComprehensiveReportSectionDigestEntry>();

  // Reserve aggregate entries before ordinary sections, then restore registry order.
  for (const section of sections) {
    if (!mandatoryKeys.has(section.key)) continue;
    if (selected.size === maxEntries) failClosed();
    selected.set(section.key, entryFor(section));
  }

  const selectedEntries = () =>
    sections.flatMap((section) => {
      const entry = selected.get(section.key);
      return entry ? [entry] : [];
    });

  if (serializedLength(selectedEntries()) > maxChars) failClosed();

  for (const section of sections) {
    if (selected.has(section.key) || selected.size === maxEntries) continue;
    const entry = entryFor(section);
    selected.set(section.key, entry);
    if (serializedLength(selectedEntries()) > maxChars) {
      selected.delete(section.key);
      continue;
    }
  }

  const entries = selectedEntries();
  appendEvidenceKeysThatFit(entries, sections, maxChars);
  if (entries.length > maxEntries || serializedLength(entries) > maxChars) failClosed();
  return { entries };
}

export function buildComprehensiveReportSectionDigest(
  source: readonly unknown[],
): ComprehensiveReportSectionDigest {
  const byKey = new Map<string, ComprehensiveReportAcceptedSection>();
  for (const entry of source) {
    const parsed = parseComprehensiveReportAcceptedSection(entry);
    if (byKey.has(parsed.key)) {
      throw new Error("COMPREHENSIVE_REPORT_SECTION_DIGEST_INVALID");
    }
    byKey.set(parsed.key, parsed);
  }
  return boundedDigest(
    COMPREHENSIVE_REPORT_SECTION_KEYS.flatMap((key) => {
      const entry = byKey.get(key);
      return entry ? [entry] : [];
    }),
  );
}

export function buildComprehensiveReportPalaceSectionDigest(
  source: readonly unknown[],
): ComprehensiveReportSectionDigest {
  const byKey = new Map<string, ComprehensiveReportAcceptedSection>();
  for (const entry of source) {
    const parsed = parseComprehensiveReportAcceptedSection(entry);
    if (!isComprehensiveReportPalaceSection(parsed)) continue;
    if (byKey.has(parsed.key)) {
      throw new Error("COMPREHENSIVE_REPORT_SECTION_DIGEST_INVALID");
    }
    byKey.set(parsed.key, parsed);
  }
  return boundedDigest(
    COMPREHENSIVE_REPORT_SECTION_KEYS.flatMap((key) => {
      const entry = byKey.get(key);
      return entry ? [entry] : [];
    }),
  );
}
