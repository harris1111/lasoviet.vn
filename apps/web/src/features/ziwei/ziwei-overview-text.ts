// Stopgap for the rule-based long overview (packages/backend/src/ziwei/free-structural-overview.ts), which opens
// each palace with a system-style facts sentence and starts titles and sentences in lowercase. The backend text is
// replaced by rule-v2 (LSV-82); until then the reader only gets presentation fixes: capital letters, the facts
// sentence moved into a "basis" fold, a doubled full stop. Meaning is never rewritten here.

export type OverviewSectionText = { id: string; title: string; paragraphs: string[] };
export type PresentedOverviewSection = OverviewSectionText & { basis: string[] };

// Where the facts sentence of FreeStructuralOverview starts, per language ("<palace> an tại X; dữ liệu ghi nhận …").
const FACTS_MARKERS = ["; dữ liệu ghi nhận", "; its recorded principal-star"];

function capitalise(text: string): string {
  const trimmed = text.trim();
  return trimmed.charAt(0).toLocaleUpperCase() + trimmed.slice(1);
}

function tidy(text: string): string {
  return text.replace(/(?<!\.)\.\.(?!\.)/g, ".");
}

/** Split a paragraph into the part to read and the facts sentence run (always the tail of the paragraph). */
function splitFacts(paragraph: string): { read: string; facts: string | null } {
  const at = FACTS_MARKERS.map((marker) => paragraph.indexOf(marker)).find((index) => index !== -1);
  if (at === undefined) return { read: paragraph, facts: null };
  const sentenceStart = paragraph.lastIndexOf(". ", at) + 1; // 0 when the facts open the paragraph
  return { read: paragraph.slice(0, sentenceStart).trim(), facts: paragraph.slice(sentenceStart).trim() };
}

export function presentOverviewSection(section: OverviewSectionText): PresentedOverviewSection {
  const paragraphs: string[] = [];
  const basis: string[] = [];
  for (const paragraph of section.paragraphs) {
    const { read, facts } = splitFacts(paragraph);
    if (facts) basis.push(capitalise(tidy(facts)));
    if (read) paragraphs.push(capitalise(tidy(read)));
  }
  return { id: section.id, title: capitalise(section.title), paragraphs, basis };
}
