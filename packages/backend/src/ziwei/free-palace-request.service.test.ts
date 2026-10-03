import { describe, expect, it, vi } from "vitest";
import type { CurrentActor, NormalizedZiweiChartV1 } from "@lasoviet/contracts";
import type { Database } from "@lasoviet/database";
import { buildFreePalaceFacts, createFreePalaceRequestService, currentFreePalaceLineageHash, freePalaceLineage } from "./free-palace-request.service.js";
import { freePalaceArtifactKey } from "./free-palace-selection.js";

const untouchable = new Proxy({}, { get() { throw new Error("database must not be reached"); } }) as unknown as Database;
const branches = ["rat", "ox", "tiger", "rabbit", "dragon", "snake", "horse", "goat", "monkey", "rooster", "dog", "pig"];
const palaces = ["life", "siblings", "spouse", "children", "wealth", "health", "travel", "friends", "career", "property", "fortune", "parents"];
const chart = {
  version: 1, systemId: "ziwei", soulPalaceId: "ziwei.palace.life", bodyPalaceId: "ziwei.palace.career", horoscopeCapabilities: [{ id: "ziwei.horoscope.annual", supported: true }], warnings: [],
  provenance: { version: 1, engineId: "e", engineVersion: "1", adapterId: "a", adapterVersion: "1", schemaId: "s", ruleSetId: "r", inputHash: "a".repeat(64), configHash: "b".repeat(64), rawSnapshotHash: "c".repeat(64), calculatedAt: "2026-10-03T00:00:00+07:00", limitations: [] },
  transformations: [{ starId: "ziwei.star.ziwei", id: "ziwei.transformation.power" }],
  palaces: palaces.map((name, index) => ({ id: `ziwei.palace.${name}`, earthlyBranchId: `ziwei.branch.${branches[index]}`,
    stars: name === "life" ? [{ id: "ziwei.star.ziwei", brightness: "ziwei.brightness.exalted", category: "major" }, { id: "ziwei.star.tianfu", brightness: "ziwei.brightness.prosperous", category: "major" }, { id: "ziwei.star.lucun", brightness: "ziwei.brightness.neutral", category: "minor" }] : [] })),
} as unknown as NormalizedZiweiChartV1;
const account = (over: Partial<Extract<CurrentActor, { kind: "account" }>> = {}): CurrentActor => ({ kind: "account", userId: "u", sessionId: "s", requestId: "r", emailVerified: true, ...over });
const guest: CurrentActor = { kind: "anonymous", anonymousActorId: "g", sessionId: "s", requestId: "r", expiresAt: new Date(Date.now() + 3_600_000).toISOString() };

function service(over: { flag?: boolean; source?: unknown; tariff?: unknown; proof?: unknown; isTrustedGuest?: () => boolean } = {}) {
  const readAuthorizedChart = vi.fn(async () => over.source === undefined ? { chartId: "c", chartVersionId: "cv", normalizedOutput: chart, topConcern: undefined } : over.source);
  const subject = createFreePalaceRequestService({
    database: untouchable, sources: { readAuthorizedChart: readAuthorizedChart as never }, flagEnabled: () => over.flag ?? true, provider: "p", model: "m",
    loadActiveTariff: async () => (over.tariff === undefined ? { id: "t", pricingVersion: "v", providerId: "p", modelId: "m", currency: "VND", status: "active", inputPricePerMillion: 1, outputPricePerMillion: 1, effectiveFrom: new Date("2026-01-01") } : over.tariff) as never,
    boundProofFor: () => (over.proof === undefined ? null : over.proof) as never, isTrustedGuest: over.isTrustedGuest,
  });
  return { subject, readAuthorizedChart };
}

describe("free palace request service (never reaches the database unless every gate passes)", () => {
  it("builds facts for one palace only, from the chart", () => {
    const facts = buildFreePalaceFacts(chart, "ziwei.palace.life");
    expect(facts.map((f) => f.key)).toEqual(["palace:life", "palace:life:star:ziwei", "palace:life:star:tianfu"]);
    expect(facts[0]!.value).toContain("cung Mệnh");
    expect(facts[1]!.value).toContain("sao Tử Vi");
    expect(facts[1]!.value).toContain("Hóa Quyền");
    expect(JSON.stringify(facts)).not.toContain("lucun");
    expect(buildFreePalaceFacts(chart, "ziwei.palace.unknown")).toEqual([]);
  });
  it("the lineage hash the reader expects matches the one admission would freeze", () => {
    const slot = { chartVersionId: "cv", palaceId: "ziwei.palace.life", locale: "vi" as const };
    expect(currentFreePalaceLineageHash("p", "m")(slot)).toBe(freePalaceArtifactKey(freePalaceLineage({ ...slot, palaceId: "ziwei.palace.life", provider: "p", model: "m" })));
    expect(currentFreePalaceLineageHash("p", "other")(slot)).not.toBe(currentFreePalaceLineageHash("p", "m")(slot));
  });
  it("flag off skips before reading anything", async () => {
    const { subject, readAuthorizedChart } = service({ flag: false });
    expect(await subject.request(account(), "c")).toEqual({ kind: "skipped", reason: "flag_disabled" });
    expect(readAuthorizedChart).not.toHaveBeenCalled();
  });
  it("an unverified account and an untrusted guest cannot dispatch", async () => {
    expect(await service().subject.request(account({ emailVerified: false }), "c")).toEqual({ kind: "skipped", reason: "identity_unverified" });
    expect(await service().subject.request(guest, "c")).toEqual({ kind: "skipped", reason: "identity_unverified" });
  });
  it("skips when the chart is not readable by the actor or is malformed", async () => {
    expect(await service({ source: null }).subject.request(account(), "c")).toEqual({ kind: "skipped", reason: "source_unavailable" });
    expect(await service({ source: { chartVersionId: "cv", normalizedOutput: { nope: true } } }).subject.request(account(), "c")).toEqual({ kind: "skipped", reason: "chart_invalid" });
  });
  it("fails closed without an approved tariff or a proven token bound", async () => {
    expect(await service({ tariff: null }).subject.request(account(), "c")).toEqual({ kind: "skipped", reason: "unapproved_pricing" });
    expect(await service().subject.request(account(), "c")).toEqual({ kind: "skipped", reason: "unproven_bound" }); // no proof supplier exists in production
  });
  it("never throws: an internal error is a redacted skip", async () => {
    const { subject, readAuthorizedChart } = service();
    readAuthorizedChart.mockRejectedValueOnce(new Error("birth data in this message"));
    expect(await subject.request(account(), "c")).toEqual({ kind: "skipped", reason: "error" });
  });
});
