import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type NormalizedBirthProfileV1, type NormalizedZiweiChartV1, PalaceIdSchema, validateFreeReadingReferences } from "@lasoviet/contracts";
import { IztroAdapter } from "../../../engine-adapters/src/index.js";
import { buildFreeReadingFacts } from "./free-reading-facts.js";
import { compileFreeReadingFallback } from "./free-reading-fallback.js";
import { checkFreeReadingQuality } from "./free-reading-quality.js";
import { buildFreeReadingPrompt } from "./free-reading-prompt.js";
import { selectFreeReadingCards } from "./free-reading-cards.js";
import { freePalaceStarNames } from "./free-palace-labels.js";

async function calculate(date = "1992-06-15", localTime: string | null = "08:30"): Promise<NormalizedZiweiChartV1> {
  const time = localTime ? { precision: "exact_minute" as const, localTime } : { precision: "unknown" as const };
  const profile: NormalizedBirthProfileV1 = { version: 1,
    originalInput: { version: 1, calendar: { kind: "solar", date }, time, timezone: { offsetMinutes: 420 }, gender: "male", consentVersion: "synthetic" },
    normalizedCalendar: { kind: "solar", date }, normalizedTime: time,
    timezoneProvenance: { source: "offset", offsetMinutes: 420 }, normalizationWarnings: [], limitations: [] };
  const output = await new IztroAdapter().calculateWithPrivateSnapshot({ birthProfile: profile });
  if (!output.result.ok) throw new Error("SYNTHETIC_ENGINE_FAILED");
  return output.result.output;
}
describe("offline free-reading copy preparation", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-08T00:00:00Z")); });
  afterEach(() => vi.useRealTimers());
  it.each(["vi", "en"] as const)("prepares reference-valid rule copy and private prompt in %s", async locale => {
    const chart = await calculate();
    const source = buildFreeReadingFacts({ chart, focusPalaceId: chart.soulPalaceId, locale });
    const reading = compileFreeReadingFallback(source);
    expect(validateFreeReadingReferences(reading, source).ok).toBe(true);
    expect(checkFreeReadingQuality({ content: reading, source })).toMatchObject({ ok: true });
    expect(reading.teasers).toHaveLength(13);
    expect(reading.yearHook).toBeNull();
    const prompt = buildFreeReadingPrompt(source);
    expect(prompt).toEqual(buildFreeReadingPrompt(source));
    expect(prompt).toMatchObject({ providerCalls: 0, accepted: false });
    expect(selectFreeReadingCards(source).every(c => !c.accepted && c.sourceId.startsWith("free-insight-major-star-meanings-v1:"))).toBe(true);
    const serialized = JSON.stringify({ prompt, reading });
    for (const secret of ["1992-06-15", "08:30", chart.provenance.inputHash, chart.provenance.rawSnapshotHash, "PRIVATE_PAID_SENTINEL"]) expect(serialized).not.toContain(secret);
    const shuffled = { ...source, facts: [...source.facts].reverse() };
    // Fact-array order is an explicit frozen input; chart input order is normalized by the facts builder.
    expect(validateFreeReadingReferences(compileFreeReadingFallback(shuffled), shuffled).ok).toBe(true);
  });
  it("uses actual relations and labels uncertain-time placements", async () => {
    const chart = await calculate("1975-02-04", "04:00");
    const focus = chart.palaces.find(p => !p.stars.some(s => s.category === "major"))!.id;
    const source = buildFreeReadingFacts({ chart, focusPalaceId: focus, locale: "vi" });
    const reading = compileFreeReadingFallback(source);
    expect(reading.focusPalace.conclusion.text).toContain("mượn từ");
    expect(reading.focusPalace.conclusion.basis.keys.some(k => k.startsWith("rel:"))).toBe(true);
    expect(checkFreeReadingQuality({ content: reading, source }).ok).toBe(true);
    const provisional = buildFreeReadingFacts({ chart: await calculate("2000-12-31", null), focusPalaceId: "ziwei.palace.life", locale: "vi" });
    const estimate = compileFreeReadingFallback(provisional);
    expect(estimate.overview.axis.text).toContain("tạm tính");
    expect(estimate.focusPalace.conclusion.basis.chain.every(s => s.say.includes("tạm tính"))).toBe(true);
    expect(estimate.yearHook).toBeNull();
  });
  it("fails closed for unknown meanings and optional legacy categories", async () => {
    const chart = await calculate();
    for (const star of [{ id: "ziwei.star.unreviewed", category: "major" as const, brightness: "ziwei.brightness.neutral" as const },
      { id: "ziwei.star.ziwei", brightness: "ziwei.brightness.exalted" as const }]) {
      const changed = { ...chart, palaces: chart.palaces.map(p => p.id === "ziwei.palace.life" ? { ...p, stars: [star] } : p) };
      const source = buildFreeReadingFacts({ chart: changed, focusPalaceId: "ziwei.palace.life", locale: "vi" });
      expect(() => compileFreeReadingFallback(source)).toThrow("FREE_READING_MEANING_UNAVAILABLE");
    }
  });
  it.each([
    ["formula_leak", "Điểm cấu trúc là 77/100."], ["uncomputed_date", "Năm 2027 sẽ đổi việc."],
    ["content_line", "Bạn sẽ chết sớm."], ["content_line", "Bạn mắc ung thư."],
    ["content_line", "Mua vật phẩm phong thủy để giải hạn."], ["content_line", "Chỉ còn 3 phút còn lại."],
    ["locale_integrity", "ziwei.palace.life là cung chính."], ["locale_integrity", "紫微"],
    ["self_reference", "AI của chúng tôi đã xem lá số."], ["teaser_boundary", "Hãy đổi việc vì sao này."],
  ])("rejects %s without altering a valid baseline", async (code, bad) => {
    const chart = await calculate();
    const source = buildFreeReadingFacts({ chart, focusPalaceId: chart.soulPalaceId, locale: "vi" });
    const good = compileFreeReadingFallback(source);
    expect(checkFreeReadingQuality({ content: good, source }).ok).toBe(true);
    const changed = structuredClone(good);
    if (code === "teaser_boundary") changed.teasers[0]!.line = bad!;
    else changed.overview.portrait.text += ` ${bad}`;
    const result = checkFreeReadingQuality({ content: changed, source });
    expect(result.ok).toBe(false);
    expect(result.findings.some(f => f.code === code && f.hard)).toBe(true);
  });
  it.each(["vi", "en"] as const)("rejects explicit wrong palace, brightness and Hoa in %s", async locale => {
    const chart = await calculate();
    const source = buildFreeReadingFacts({ chart, focusPalaceId: chart.soulPalaceId, locale });
    const good = compileFreeReadingFallback(source);
    const card = selectFreeReadingCards(source).find(c => !source.facts.find(f => f.key === c.factKey)!.value.includes(locale === "vi" ? "Hóa Kỵ" : "Obstacle"))!;
    const actual = source.facts.find(f => f.key === card.factKey)!.value.split(" · ");
    const wrongPalace = source.facts.find(f => /^palace:[a-z_]+$/u.test(f.key) && f.label !== actual[1])!.label;
    const wrongBrightness = actual[2] === (locale === "vi" ? "Miếu" : "Exalted") ? (locale === "vi" ? "Hãm" : "Unfavorable") : (locale === "vi" ? "Miếu" : "Exalted");
    for (const [code, text] of [
      ["placement_mismatch", `${card.name} ${locale === "vi" ? "ở" : "in"} ${wrongPalace}.`],
      ["brightness_mismatch", `${card.name} (${wrongBrightness}).`],
      ["hoa_mismatch", `${card.name} (${locale === "vi" ? "Hóa Kỵ" : "Obstacle"}).`],
    ]) {
      const changed = structuredClone(good); changed.overview.portrait.text = text!;
      expect(checkFreeReadingQuality({ content: changed, source }).findings.some(f => f.code === code)).toBe(true);
    }
  });
  it("checks local claim scope and basis prose, including a future hook", async () => {
    const chart = await calculate();
    const source = buildFreeReadingFacts({ chart, focusPalaceId: chart.soulPalaceId, locale: "vi" });
    const good = compileFreeReadingFallback(source);
    const scopedKeys = new Set(good.overview.portrait.basis.keys);
    const other = selectFreeReadingCards(source).find(c => !scopedKeys.has(c.factKey))!;
    const wrongScope = structuredClone(good);
    wrongScope.overview.portrait.text = `${other.name} là nét cần nhìn.`;
    expect(checkFreeReadingQuality({ content: wrongScope, source }).findings.some(f => f.code === "claim_scope")).toBe(true);
    const invented = freePalaceStarNames("vi").find(name => !source.facts.some(f => f.value.includes(name)))!;
    const changed = structuredClone(good); changed.overview.portrait.text = `Sao ${invented} ở Mệnh.`;
    expect(checkFreeReadingQuality({ content: changed, source }).findings.some(f => f.code === "invented_element")).toBe(true);
    const hookSource = { ...source, allowedWithheld: ["han_months" as const] };
    const palace = source.facts.find(f => /^palace:[a-z_]+$/u.test(f.key))!;
    const hook = { ...good, yearHook: { shown: [`${palace.label} là một góc nhìn.`, `${palace.label} có nét riêng.`],
      clip: "Điều cần nhìn là", keys: [palace.key], withheld: "han_months" as const,
      basis: { keys: [palace.key], chain: [{ k: palace.key, say: `${palace.label}: ${palace.value}` }, { k: palace.key, say: `${palace.label}: sẽ chết.` }] } } };
    expect(validateFreeReadingReferences(hook, hookSource).ok).toBe(true);
    expect(checkFreeReadingQuality({ content: hook, source: hookSource }).findings.some(f => f.block === "yearHook.basis.1" && f.code === "content_line")).toBe(true);
  });
  it("checks 200 synthetic charts deterministically across VI/EN without providers", async () => {
    for (let i = 0; i < 200; i++) {
      const date = `${1950 + i % 70}-${String(1 + i % 12).padStart(2, "0")}-${String(1 + i % 27).padStart(2, "0")}`;
      const chart = await calculate(date, i % 20 === 0 ? null : `${String(i % 24).padStart(2, "0")}:30`);
      const source = buildFreeReadingFacts({ chart, focusPalaceId: PalaceIdSchema.options[i % 12]!, locale: i % 2 ? "en" : "vi" });
      const reading = compileFreeReadingFallback(source);
      expect(compileFreeReadingFallback(source), date).toEqual(reading);
      const quality = checkFreeReadingQuality({ content: reading, source });
      expect(quality.findings.filter(f => f.hard), date).toEqual([]);
    }
  }, 120000);
});
