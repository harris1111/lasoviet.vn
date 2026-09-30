// Deterministic beginner-first gates for FD-106 wave 2.
// Spec: docs/superpowers/specs/2026-09-28-report-writing-rules-beginner-first.md §2b, §2c, §3.3, §5.1.

function escape(term: string): string {
  return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsWhole(text: string, term: string): boolean {
  return new RegExp(`(?<![\\p{L}\\p{N}])${escape(term)}(?![\\p{L}\\p{N}])`, "iu").test(text);
}

// "Tử Vi" is both a star and the name of the discipline. Only the star counts.
const DISCIPLINE_NAME = /Tử Vi Đẩu Số|(?:trong|môn|lá số|xem|học|sách|người học) Tử Vi/giu;

/** First phrase from the anywhere-banned list (spec §2b.2, §2c.3) found in the text, or null. */
export function findBannedPhrase(text: string, bannedPhrases: readonly string[]): string | null {
  const normalized = text.normalize("NFC");
  return bannedPhrases.find((phrase) => containsWhole(normalized, phrase.normalize("NFC"))) ?? null;
}

/** First label phrase (spec §2b.1) that opens the text, a line, or a sentence, or null. */
export function findBannedOpener(text: string, bannedOpeners: readonly string[]): string | null {
  const normalized = text.normalize("NFC");
  return bannedOpeners.find((opener) =>
    new RegExp(`(?:^|[\\n.!?…])\\s*${escape(opener.normalize("NFC"))}(?![\\p{L}\\p{N}])`, "iu").test(normalized),
  ) ?? null;
}

/**
 * A machine sub-heading is a short line (2 to 6 words, no sentence punctuation) that is
 * followed by another paragraph, including Markdown headings and colon labels.
 */
export function findMachineSubheading(text: string): string | null {
  const lines = text.normalize("NFC").split("\n");
  for (let i = 0; i < lines.length - 1; i++) {
    const original = lines[i]!.trim();
    const line = original.replace(/^#{1,6}\s+/u, "").replace(/^\*\*|\*\*$/gu, "");
    const next = lines.slice(i + 1).find((value) => value.trim() !== "");
    if (!line || !next) continue;
    const words = line.split(/\s+/u).length;
    if (words >= 2 && words <= 6 && !/[.!?;,…]$/u.test(line)) return original;
  }
  return null;
}

/** Distinct star names allowed: `per80` per 80 syllables, rounded up, minimum one. */
export function starDensityProblem(
  text: string,
  starLabels: readonly string[],
  per80: number,
): string | null {
  const normalized = text.normalize("NFC");
  const syllables = normalized.trim() === "" ? 0 : normalized.trim().split(/\s+/u).length;
  const counted = normalized.replace(DISCIPLINE_NAME, " ");
  const distinct = new Set(starLabels.filter((label) => containsWhole(counted, label))).size;
  const allowed = Math.max(1, Math.ceil((syllables / 80) * per80));
  return distinct > allowed
    ? `${distinct} distinct star names in ${syllables} syllables; at most ${allowed} allowed.`
    : null;
}

/** Overview must have the five-beat arc as paragraphs and must not open on a star name. */
export function overviewArcProblem(
  text: string,
  starLabels: readonly string[],
  minimumParagraphs: number,
): string | null {
  const paragraphs = text
    .normalize("NFC")
    .split(/\n\s*\n/u)
    .map((p) => p.trim())
    .filter(Boolean);
  if (paragraphs.length < minimumParagraphs) {
    return `Overview needs ${minimumParagraphs} paragraphs; found ${paragraphs.length}.`;
  }
  const opening = paragraphs[0]!.toLocaleLowerCase("vi-VN");
  if (starLabels.some((label) => opening.startsWith(label.toLocaleLowerCase("vi-VN")))) {
    return "Overview opens with a star name; it must open with the person or the pattern.";
  }
  return null;
}
