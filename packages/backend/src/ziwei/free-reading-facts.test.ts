import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IztroAdapter } from "../../../engine-adapters/src/index.js";
import { type NormalizedBirthProfileV1 } from "@lasoviet/contracts";
import { buildFreeReadingFacts } from "./free-reading-facts.js";

async function chart() {
  const profile: NormalizedBirthProfileV1 = { version: 1,
    originalInput: { version: 1, calendar: { kind: "solar", date: "1992-06-15" }, time: { precision: "exact_minute", localTime: "08:30" }, timezone: { offsetMinutes: 420 }, gender: "male", consentVersion: "test" },
    normalizedCalendar: { kind: "solar", date: "1992-06-15" }, normalizedTime: { precision: "exact_minute", localTime: "08:30" },
    timezoneProvenance: { source: "offset", offsetMinutes: 420 }, normalizationWarnings: [], limitations: [] };
  const result = await new IztroAdapter().calculateWithPrivateSnapshot({ birthProfile: profile });
  if (!result.result.ok) throw new Error("SYNTHETIC_ENGINE_FIXTURE_FAILED");
  return result.result.output;
}
describe("offline free-reading facts preparation", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-08T00:00:00Z")); });
  afterEach(() => vi.useRealTimers());
  it.each(["vi", "en"] as const)("projects only fixed-label structural facts in %s", async locale => {
    const source = await chart();
    const result = buildFreeReadingFacts({ chart: source, focusPalaceId: "ziwei.palace.career", locale });
    expect(result.locked).toHaveLength(13);
    expect(result.locked).not.toContain("palace:career");
    expect(new Set(result.facts.map(f => f.key)).size).toBe(result.facts.length);
    const serialized = JSON.stringify(result);
    for (const privateValue of ["1992-06-15", "08:30", source.provenance.inputHash, source.provenance.rawSnapshotHash]) {
      expect(serialized).not.toContain(privateValue);
    }
    expect(result.allowedWithheld).toEqual([]);
    for (const fact of result.facts.filter(f => f.key.includes(":star:"))) {
      const [, palace, , star] = fact.key.split(":");
      const matching = source.palaces.find(p => p.id === `ziwei.palace.${palace}`)!.stars.find(s => s.id === `ziwei.star.${star}`);
      expect(matching?.category).toBe("major");
    }
    const shuffled = { ...source, palaces: [...source.palaces].reverse().map(p => ({ ...p, stars: [...p.stars].reverse() })), transformations: [...source.transformations].reverse() };
    expect(buildFreeReadingFacts({ chart: shuffled, focusPalaceId: "ziwei.palace.career", locale })).toEqual(result);
  });
  it("omits unreviewed major/auxiliary meanings without falsely calling the palace empty", async () => {
    const source = await chart();
    const changed = { ...source, palaces: source.palaces.map(p => p.id === "ziwei.palace.life" ? { ...p, stars: [{ id: "ziwei.star.unreviewed", brightness: "ziwei.brightness.neutral" as const, category: "major" as const }] } : p) };
    const result = buildFreeReadingFacts({ chart: changed, focusPalaceId: "ziwei.palace.life", locale: "vi" });
    expect(result.facts.some(f => f.key.includes("unreviewed"))).toBe(false);
    expect(result.facts.some(f => f.key === "palace:life:empty")).toBe(false);
  });
  it("marks uncertain time and never exports a temporal hook allowance", async () => {
    const source = await chart();
    const result = buildFreeReadingFacts({ chart: { ...source, provisional: true, timePrecision: "unknown" }, focusPalaceId: "ziwei.palace.life", locale: "vi" });
    expect(result.provisional).toBe(true);
    expect(result.facts.some(f => f.key === "data:time-uncertain")).toBe(true);
    expect(result.allowedWithheld).toEqual([]);
  });
  it("does not infer an empty palace from a legacy star with unspecified category", async () => {
    const source = await chart();
    const legacy = { ...source, palaces: source.palaces.map(p => p.id === "ziwei.palace.life" ? { ...p,
      stars: [{ id: "ziwei.star.ziwei", brightness: "ziwei.brightness.exalted" as const }] } : p) };
    const result = buildFreeReadingFacts({ chart: legacy, focusPalaceId: "ziwei.palace.life", locale: "vi" });
    expect(result.facts.some(f => f.key === "palace:life:empty")).toBe(false);
  });
});
