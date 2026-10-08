import { z } from "zod";
import { PalaceIdSchema } from "./normalized-ziwei-chart-v1.js";
import { FreePalaceGiftFactV1Schema } from "./free-palace-gift-v1.js";

// Private preparation contract. This is not a browser projection or a publish gate.
export const FREE_READING_SCHEMA_VERSION = "free-reading-v2-draft-1";
const key = z.string().min(1).max(160).regex(/^[a-z0-9:._-]+$/);
const keys = z.array(key).min(1).max(5).refine(v => new Set(v).size === v.length);
const text = (max: number) => z.string().trim().min(1).max(max);
const target = z.string().regex(/^(palace|topic):[a-z_]+$/);
const basis = z.object({
  keys,
  chain: z.array(z.object({ k: key, say: text(170) }).strict()).min(2).max(3),
}).strict().superRefine((value, context) => {
  if (value.chain.some(step => !value.keys.includes(step.k))) {
    context.addIssue({ code: "custom", message: "Chain keys must belong to this claim's basis" });
  }
});
const claim = z.object({ text: text(900), basis }).strict();
export const FreeReadingContentV2Schema = z.object({
  version: z.literal(2),
  overview: z.object({
    portrait: claim, axis: claim,
    strengths: z.array(claim).min(2).max(3), snags: z.array(claim).min(2).max(3),
    work: claim, money: claim, love: claim, actions: z.array(claim).length(3),
    bridge: z.object({ text: text(420), keys }).strict(),
  }).strict(),
  focusPalace: z.object({
    palaceKey: z.enum(PalaceIdSchema.options.map(id => id.replace("ziwei.palace.", ""))),
    title: text(80), conclusion: claim, keyPoints: z.array(claim).length(3),
    paragraphs: z.array(claim).min(3).max(4),
    do: z.array(claim).min(2).max(3), avoid: z.array(claim).length(2),
  }).strict(),
  teasers: z.array(z.object({ targetKey: target, title: text(60), line: text(260), keys }).strict()).min(1).max(13),
  yearHook: z.object({
    shown: z.array(text(320)).length(2), clip: text(130), keys, basis,
    withheld: z.enum(["han_months", "focus_area", "annual_palace_meaning", "decadal_interplay"]),
  }).strict().nullable(),
}).strict();
export type FreeReadingContentV2 = z.infer<typeof FreeReadingContentV2Schema>;

// Keep the JSON schema generated at the package that owns the pinned Zod dependency.
export function freeReadingDraftJsonSchema() {
  return z.toJSONSchema(FreeReadingContentV2Schema);
}

const temporalCycle = z.object({
  ordinal: z.number().int().min(0).max(11), palaceId: PalaceIdSchema,
  startAge: z.number().int().positive(), endAge: z.number().int().positive(),
  startYear: z.number().int(), endYear: z.number().int(),
}).strict();
export const FreeReadingTemporalV2Schema = z.object({
  targetYear: z.number().int().min(1900).max(2100), lunarAge: z.number().int().min(1).max(120),
  annualPalaceId: PalaceIdSchema,
  cycles: z.array(temporalCycle).length(12),
}).strict().superRefine((value, ctx) => {
  if (value.cycles.some((cycle, i) => cycle.ordinal !== i || cycle.startYear - cycle.startAge !== value.targetYear - value.lunarAge || cycle.endAge !== cycle.startAge + 9 ||
      cycle.endYear !== cycle.startYear + 9 || (i > 0 &&
        (cycle.startAge !== value.cycles[i - 1]!.endAge + 1 || cycle.startYear !== value.cycles[i - 1]!.endYear + 1)))) {
    ctx.addIssue({ code: "custom", message: "Temporal cycles must retain the complete consecutive engine sequence" });
  }
});
export type FreeReadingTemporalV2 = z.infer<typeof FreeReadingTemporalV2Schema>;

// No identity, birth data, provider settings, private lineage, hashes or paid prose are accepted.
export const FreeReadingFactsV2Schema = z.object({
  version: z.literal(2), locale: z.enum(["vi", "en"]), focusPalaceId: PalaceIdSchema,
  provisional: z.boolean(),
  facts: z.array(FreePalaceGiftFactV1Schema).min(1).max(160),
  locked: z.array(target).min(1).max(13),
  allowedWithheld: z.array(z.enum(["han_months", "focus_area", "annual_palace_meaning", "decadal_interplay"])).max(4),
  timing: FreeReadingTemporalV2Schema.optional(),
}).strict().superRefine((value, context) => {
  if (new Set(value.facts.map(fact => fact.key)).size !== value.facts.length ||
      new Set(value.locked).size !== value.locked.length ||
      new Set(value.allowedWithheld).size !== value.allowedWithheld.length) {
    context.addIssue({ code: "custom", message: "Fact keys and target lists must be unique" });
  }
  if (value.provisional && value.allowedWithheld.length !== 0) {
    context.addIssue({ code: "custom", message: "Provisional charts cannot supply a year hook" });
  }
  if (value.timing && (value.provisional ||
      value.facts.find(fact => fact.key === "timing:year")?.value !== String(value.timing.targetYear) ||
      value.facts.find(fact => fact.key === "timing:age")?.value !== String(value.timing.lunarAge) ||
      !value.facts.some(fact => fact.key === "timing:annual-palace") ||
      value.timing.cycles.some(cycle => !value.facts.some(fact => fact.key === `timing:cycle:${cycle.ordinal}`)))) {
    context.addIssue({ code: "custom", message: "Temporal context requires non-provisional matching literal facts" });
  }
});
export type FreeReadingFactsV2 = z.infer<typeof FreeReadingFactsV2Schema>;

/** Checks references only. Factual prose, legal, length and leakage gates are separate. */
export function validateFreeReadingReferences(content: unknown, source: unknown):
  { ok: true; content: FreeReadingContentV2 } | { ok: false; code: "schema_invalid" | "source_invalid" | "reference_invalid" } {
  const parsed = FreeReadingContentV2Schema.safeParse(content);
  if (!parsed.success) return { ok: false, code: "schema_invalid" };
  const facts = FreeReadingFactsV2Schema.safeParse(source);
  if (!facts.success) return { ok: false, code: "source_invalid" };
  const c = parsed.data;
  const o = c.overview;
  const p = c.focusPalace;
  const claims = [o.portrait, o.axis, ...o.strengths, ...o.snags, o.work, o.money, o.love,
    ...o.actions, p.conclusion, ...p.keyPoints, ...p.paragraphs, ...p.do, ...p.avoid];
  const used = [...claims.flatMap(item => [...item.basis.keys, ...item.basis.chain.map(step => step.k)]),
    ...o.bridge.keys, ...c.teasers.flatMap(item => item.keys),
    ...(c.yearHook ? [...c.yearHook.keys, ...c.yearHook.basis.keys, ...c.yearHook.basis.chain.map(step => step.k)] : [])];
  const available = new Set(facts.data.facts.map(fact => fact.key));
  const targets = new Set(c.teasers.map(item => item.targetKey));
  if (p.palaceKey !== facts.data.focusPalaceId.replace("ziwei.palace.", "") ||
      used.some(id => !available.has(id)) || targets.size !== c.teasers.length ||
      targets.size !== facts.data.locked.length || facts.data.locked.some(id => !targets.has(id)) ||
      (c.yearHook !== null && (facts.data.provisional || !facts.data.allowedWithheld.includes(c.yearHook.withheld)))) {
    return { ok: false, code: "reference_invalid" };
  }
  return { ok: true, content: c };
}
