import { freeReadingDraftJsonSchema, FreeReadingFactsV2Schema, FREE_READING_SCHEMA_VERSION, type FreeReadingFactsV2 } from "@lasoviet/contracts";
import { FREE_READING_CARDS_VERSION, selectFreeReadingCards } from "./free-reading-cards.js";
import { FREE_READING_QUALITY_VERSION } from "./free-reading-quality.js";
import { FREE_READING_RULES_VERSION } from "./free-reading-fallback.js";

export const FREE_READING_PROMPT_VERSION = "free-reading-prompt-v2-draft-1";

/** Deterministic preparation payload; contains no adapter, dispatch or cost-bound claim. */
export function buildFreeReadingPrompt(input: FreeReadingFactsV2) {
  const source = FreeReadingFactsV2Schema.parse(input);
  const system = [
    "Write one whole free Zi Wei reading as JSON matching the supplied schema. No markdown or extra fields.",
    source.locale === "vi" ? "Write natural Vietnamese. Address the reader as bạn; no invented identity or display name." : "Write natural English. Address the reader as you; no invented identity or display name.",
    "Use only FACTS and CARDS. Cards are draft paraphrases of the versioned existing free catalog; never extend them into unprovided interpretations.",
    "Keep strengths and difficulties grounded in the supplied meaning. Describe observable possibilities, not events that allegedly happened or will happen.",
    "Every claim needs inline basis: literal valid fact keys and two or three short steps that mention their own fixed fact labels and explain the specific claim.",
    "Keep each star in its actual palace with its actual brightness and transformations. Borrow a related star only for a proved empty palace, naming the original palace and actual relation.",
    "Do not infer a missing star category or meaning to mean an empty palace. If meaning is unavailable, decline this draft rather than inventing it.",
    "No temporal hook is permitted for this preparation: yearHook must be null. No computed date, age, time-cycle count or invented pattern is supplied.",
    "Uncertain birth time makes all hour-dependent placements estimates; disclose this once in the overview and retain provisional wording in basis steps.",
    "Overview: portrait, Life/Body axis, strengths, difficulties, work, money, relationships, three specific practical actions and a bridge. Aim for 900–1300 Vietnamese syllables; do not pad or repeat claims to reach length.",
    "Full focus palace: conclusion, three key points, three or four paragraphs, two or three actions and two things to avoid. Use the exact frozen focus palace.",
    "Return one free-card-only teaser for every exact locked target. No paid source is provided. Teasers contain no advice, dates, numbers or detailed causal explanation.",
    "No formula, structural score, canonical identifier or provider self-reference in customer prose. Do not invent scarcity, timers, reference prices, reviews or experts.",
    "FD089: no death/lifespan, named disease diagnoses, ritual/remedy sales or feng shui objects, lottery numbers, invented events or uncomputed dates. Measured preparation advice remains allowed.",
    "New prose is a draft requiring human reading and source verification. Lexical checks cannot certify semantic truth.",
  ].join("\n");
  return { system, user: JSON.stringify({ FACTS: source, CARDS: selectFreeReadingCards(source),
    OUTPUT_SCHEMA: freeReadingDraftJsonSchema() }),
    versions: { prompt: FREE_READING_PROMPT_VERSION, schema: FREE_READING_SCHEMA_VERSION,
      cards: FREE_READING_CARDS_VERSION, quality: FREE_READING_QUALITY_VERSION, rules: FREE_READING_RULES_VERSION },
    providerCalls: 0 as const, accepted: false as const };
}
