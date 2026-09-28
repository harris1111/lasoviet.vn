// Splits a stored report narrative into readable paragraphs (FD-104 wave 1).
// Stored narratives are one string; the model may or may not have written
// line breaks between paragraphs.

const SENTENCE_BOUNDARY = /(?<=[.!?…])\s+(?=\p{Lu})/u;
const LEAD_SENTENCE = /^(.+?[.!?…])(?=\s|$)/su;
const MAX_SENTENCES_PER_BLOCK = 4;

export const SENTENCES_PER_PARAGRAPH = 3;

function chunkSentences(block: string, size: number): string[] {
  const sentences = block.split(SENTENCE_BOUNDARY);
  if (sentences.length <= MAX_SENTENCES_PER_BLOCK) return [block];
  const chunks: string[] = [];
  for (let i = 0; i < sentences.length; i += size) {
    chunks.push(sentences.slice(i, i + size).join(" "));
  }
  return chunks;
}

export function splitNarrative(text: string, size = SENTENCES_PER_PARAGRAPH): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (normalized.length === 0) return [];
  const blocks = /\n\s*\n/.test(normalized) ? normalized.split(/\n\s*\n/) : normalized.split("\n");
  return blocks
    .map((block) => block.replace(/\s*\n\s*/g, " ").trim())
    .filter((block) => block.length > 0)
    .flatMap((block) => chunkSentences(block, size));
}

export function splitLeadSentence(paragraph: string): { lead: string; rest: string } {
  const match = LEAD_SENTENCE.exec(paragraph);
  if (!match || match[1]!.length === paragraph.length) return { lead: paragraph, rest: "" };
  return { lead: match[1]!, rest: paragraph.slice(match[1]!.length) };
}
