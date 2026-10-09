import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { NormalizedBaziChartV1Schema } from "@lasoviet/contracts";
import { calculateNormalizedBaziChart, validateNormalizedBaziChart, baziCalculationKey } from "./normalized-bazi-chart.js";
const input = {localSolarDate: "1992-06-15", localTime: "08:30", offsetMinutes: 420};
const at = new Date("2026-10-09T00:00:00.000Z");
const chart = () => calculateNormalizedBaziChart(input, at);

it("freezes linked canonical facts, structural evidence and explicit method provenance", () => {
  const result = chart();
  expect(validateNormalizedBaziChart(result)).toEqual(result);
  expect(result).toMatchObject({systemId: "bazi", timePrecision: "exact_minute", provisional: false,
    provenance: {engineId: "lunar-typescript", engineVersion: "lunar-typescript1.8.6", calculatedAt: "2026-10-09T00:00:00.000+00:00"},
    structure: {visibleElementInventory: {complete: true, characterCount: 8}}});
  expect(result.structure.relativeReadings[0]!.dayMasterStemId).toBe(result.facts.pillars.day[0]!.stemId);
  expect(result.structure.relativeReadings[0]!.pillars.find(p => p.pillar === "day")).toMatchObject({stemRole: "day_master", stemTenGod: null});
  const serialized = JSON.stringify(result);
  for (const privateValue of [input.localSolarDate, input.localTime, "displayName", "placeLabel", "getEightChar", "compatibility"]) expect(serialized).not.toContain(privateValue);
});
it("keeps source hashes and reusable key independent of injected calculation time", () => {
  const first = chart(), later = calculateNormalizedBaziChart(input, new Date("2027-01-01T00:00:00Z"));
  expect(first.provenance.calculatedAt).not.toBe(later.provenance.calculatedAt);
  expect(first.provenance.rawSnapshotHash).toBe(later.provenance.rawSnapshotHash);
  expect(baziCalculationKey(first)).toBe(baziCalculationKey(later));
  expect(baziCalculationKey(first)).not.toBe(baziCalculationKey(calculateNormalizedBaziChart({...input, localTime: "10:30"}, at)));
  expect(first).toEqual(chart());
});
it("preserves date-only counterpart input without manufacturing an eighth character", () => {
  const result = calculateNormalizedBaziChart({...input, localTime: null}, at);
  expect(validateNormalizedBaziChart(result)).toEqual(result);
  expect(result).toMatchObject({timePrecision: "unknown", provisional: true, facts: {pillars: {hour: null}},
    structure: {visibleElementInventory: {complete: false, characterCount: 6}}});
  expect(result.provenance.limitations).toContain("BAZI_HOUR_UNKNOWN");
  expect(result.structure.relativeReadings.every(r => r.pillars.every(p => p.pillar !== "hour"))).toBe(true);
});
it("retains LiChun alternatives as separate evidence rather than a definitive annual chart", () => {
  const result = calculateNormalizedBaziChart({...input, localSolarDate: "2027-02-04", localTime: null}, at);
  expect(validateNormalizedBaziChart(result)).toEqual(result);
  expect(result.facts.pillars.year).toHaveLength(2);
  expect(result.facts.pillars.month).toHaveLength(2);
  expect(result.structure.visibleElementInventory).toBeNull();
  expect(result.provisional).toBe(true);
  expect(result.provenance.limitations).toContain("BAZI_SOLAR_TERM_TIME_UNCERTAIN");
});
it("keeps local-midnight day lineage distinct from the UTC+8 term clock", () => {
  const before = calculateNormalizedBaziChart({...input, localTime: "22:59"}, at);
  const late = calculateNormalizedBaziChart({...input, localTime: "23:30"}, at);
  const next = calculateNormalizedBaziChart({...input, localSolarDate: "1992-06-16", localTime: "00:00"}, at);
  expect(late.facts.pillars.day).toEqual(before.facts.pillars.day);
  expect(next.facts.pillars.day).not.toEqual(late.facts.pillars.day);
  expect(late.provenance.rawSnapshotHash).not.toBe(next.provenance.rawSnapshotHash);
});
it.each([
  ["input hash", (c: ReturnType<typeof chart>) => {c.provenance.inputHash = "a".repeat(64);} ],
  ["structure hash", (c: ReturnType<typeof chart>) => {c.structure.sourceInputHash = "a".repeat(64);} ],
  ["engine method", (c: ReturnType<typeof chart>) => {c.provenance.adapterVersion = "2.0.0";} ],
  ["uncertainty", (c: ReturnType<typeof chart>) => {c.structure.uncertainty.hourMissing = true;} ],
  ["precision", (c: ReturnType<typeof chart>) => {c.timePrecision = "unknown";} ],
  ["provisional", (c: ReturnType<typeof chart>) => {c.provisional = true;} ],
  ["limitations", (c: ReturnType<typeof chart>) => {c.provenance.limitations = [];} ],
  ["source evidence", (c: ReturnType<typeof chart>) => {c.structure.relativeReadings[0]!.pillars[0]!.sourceEvidenceKeys = ["invented"];} ],
  ["duplicate variant", (c: ReturnType<typeof chart>) => {c.structure.relativeReadings[0]!.pillars[1] = c.structure.relativeReadings[0]!.pillars[0]!;} ],
] as const)("rejects disconnected %s in the normalized contract", (_name, mutate) => {
  const value = chart(); mutate(value);
  expect(NormalizedBaziChartV1Schema.safeParse(value).success).toBe(false);
});
it.each(["configHash", "rawSnapshotHash"] as const)("rejects corrupted %s before exposing a reusable key", field => {
  const value = chart(); value.provenance[field] = "a".repeat(64);
  expect(() => validateNormalizedBaziChart(value)).toThrow("BAZI_NORMALIZED_SOURCE_MISMATCH");
  expect(() => baziCalculationKey(value)).toThrow("BAZI_NORMALIZED_SOURCE_MISMATCH");
});
it("rechecks vendor structural mapping even when a corrupt snapshot is consistently rehashed", () => {
  const value = chart(), pillar = value.structure.relativeReadings[0]!.pillars[0]!;
  pillar.stemTenGod = pillar.stemTenGod === "peer" ? "direct_resource" : "peer";
  function canonical(v: unknown): string {
    if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
    if (v !== null && typeof v === "object") return `{${Object.entries(v).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => `${JSON.stringify(k)}:${canonical(x)}`).join(",")}}`;
    return JSON.stringify(v);
  }
  const {facts, structure, timePrecision, provisional} = value;
  value.provenance.rawSnapshotHash = createHash("sha256").update(canonical({facts, structure, timePrecision, provisional})).digest("hex");
  expect(() => validateNormalizedBaziChart(value)).toThrow("BAZI_NORMALIZED_SOURCE_MISMATCH");
});
it("requires explicit valid input and calculation timestamp", () => {
  expect(() => calculateNormalizedBaziChart({...input, localSolarDate: "2026-02-30"}, at)).toThrow("BAZI_INPUT_INVALID");
  expect(() => calculateNormalizedBaziChart(input, new Date("invalid"))).toThrow();
});
