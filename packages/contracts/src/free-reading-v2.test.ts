import { describe, expect, it } from "vitest";
import { FreeReadingFactsV2Schema, validateFreeReadingReferences } from "./free-reading-v2.js";

const source = { version: 2, locale: "vi", focusPalaceId: "ziwei.palace.life", provisional: false,
  facts: [{ key: "palace:life", label: "Mệnh", value: "Mệnh tại Tý" }], locked: ["palace:career"], allowedWithheld: [] };
function content() {
  const claim = () => ({ text: "Synthetic contract fixture, not accepted product copy.", basis: {
    keys: ["palace:life"], chain: [{ k: "palace:life", say: "Synthetic first step" }, { k: "palace:life", say: "Synthetic second step" }],
  } });
  return { version: 2, overview: { portrait: claim(), axis: claim(), strengths: [claim(), claim()], snags: [claim(), claim()],
    work: claim(), money: claim(), love: claim(), actions: [claim(), claim(), claim()], bridge: { text: "Synthetic bridge", keys: ["palace:life"] } },
  focusPalace: { palaceKey: "life", title: "Synthetic focus", conclusion: claim(), keyPoints: [claim(), claim(), claim()],
    paragraphs: [claim(), claim(), claim()], do: [claim(), claim()], avoid: [claim(), claim()] },
  teasers: [{ targetKey: "palace:career", title: "Synthetic teaser", line: "Synthetic free excerpt", keys: ["palace:life"] }], yearHook: null };
}
describe("private free-reading reference contract preparation", () => {
  it("accepts complete resolved references without implying prose quality", () => {
    expect(validateFreeReadingReferences(content(), source).ok).toBe(true);
  });
  it("rejects unresolved keys even in bridge and teaser fields", () => {
    const c = content(); c.overview.bridge.keys = ["invented:key"];
    expect(validateFreeReadingReferences(c, source)).toEqual({ ok: false, code: "reference_invalid" });
    const t = content(); t.teasers[0]!.keys = ["invented:key"];
    expect(validateFreeReadingReferences(t, source).ok).toBe(false);
  });
  it("rejects a chain key outside its own claim even if the source contains it", () => {
    const c = content(); c.overview.portrait.basis.chain[0]!.k = "palace:career";
    expect(validateFreeReadingReferences(c, { ...source, facts: [...source.facts, { key: "palace:career", label: "Quan Lộc", value: "Quan Lộc" }] })).toEqual({ ok: false, code: "schema_invalid" });
  });
  it("requires the exact locked target set and focus identity", () => {
    const c = content(); c.focusPalace.palaceKey = "career";
    expect(validateFreeReadingReferences(c, source).ok).toBe(false);
    const missing = { ...source, locked: ["palace:career", "palace:wealth"] };
    expect(validateFreeReadingReferences(content(), missing).ok).toBe(false);
    const duplicate = content(); duplicate.teasers.push(duplicate.teasers[0]!);
    expect(validateFreeReadingReferences(duplicate, source).ok).toBe(false);
  });
  it("rejects extra paid/private fields rather than silently carrying them", () => {
    expect(validateFreeReadingReferences({ ...content(), paidNarrative: "PRIVATE_PAID_SENTINEL" }, source).ok).toBe(false);
    expect(FreeReadingFactsV2Schema.safeParse({ ...source, displayName: "PRIVATE_OWNER_SENTINEL" }).success).toBe(false);
    expect(FreeReadingFactsV2Schema.safeParse({ ...source, chartVersionId: "PRIVATE_LINEAGE_SENTINEL" }).success).toBe(false);
  });
  it("rejects duplicate facts and provisional timing eligibility", () => {
    expect(validateFreeReadingReferences(content(), { ...source, facts: [...source.facts, source.facts[0]] })).toEqual({ ok: false, code: "source_invalid" });
    expect(FreeReadingFactsV2Schema.safeParse({ ...source, provisional: true, allowedWithheld: ["han_months"] }).success).toBe(false);
  });
  it("does not accept a year hook with unresolved facts or unapproved disclosure", () => {
    const c = { ...content(), yearHook: { shown: ["Synthetic first sentence.", "Synthetic second sentence."], clip: "Synthetic unfinished phrase",
      keys: ["palace:life"], basis: content().overview.portrait.basis, withheld: "han_months" } };
    expect(validateFreeReadingReferences(c, source).ok).toBe(false);
    expect(validateFreeReadingReferences(c, { ...source, allowedWithheld: ["han_months"] }).ok).toBe(true);
    c.yearHook.basis.chain[0]!.k = "missing:time";
    expect(validateFreeReadingReferences(c, { ...source, allowedWithheld: ["han_months"] }).ok).toBe(false);
  });
});
