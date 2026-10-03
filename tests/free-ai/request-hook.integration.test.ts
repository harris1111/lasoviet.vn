import { createHash } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { CurrentActor } from "../../packages/contracts/src/index.js";
import { createFreePalaceRequestService } from "../../packages/backend/src/ziwei/free-palace-request.service.js";
import { createDatabaseZiweiQueryRepository } from "../../packages/backend/src/ziwei/ziwei-query.repository.js";
import { createZiweiCalculationService } from "../../packages/backend/src/ziwei/ziwei.service.js";
import { raceBehindLock, seedChartVersion, startFreeAiDatabase, type TestDatabase } from "./free-ai-test-harness.js";

type Harness = Awaited<ReturnType<typeof startFreeAiDatabase>>;
const TABLES = ["outbox", "free_ai_artifacts", "free_ai_settlements", "free_ai_admissions", "free_ai_requests", "free_ai_quota_aliases", "free_ai_quota_subjects", "free_ai_daily_budgets", "free_ai_chart_budgets"];
const branches = ["rat", "ox", "tiger", "rabbit", "dragon", "snake", "horse", "goat", "monkey", "rooster", "dog", "pig"];
const palaces = ["life", "siblings", "spouse", "children", "wealth", "health", "travel", "friends", "career", "property", "fortune", "parents"];
const chart = {
  version: 1, systemId: "ziwei", soulPalaceId: "ziwei.palace.life", bodyPalaceId: "ziwei.palace.career", horoscopeCapabilities: [{ id: "ziwei.horoscope.annual", supported: true }], warnings: [],
  provenance: { version: 1, engineId: "e", engineVersion: "1", adapterId: "a", adapterVersion: "1", schemaId: "s", ruleSetId: "r", inputHash: "a".repeat(64), configHash: "b".repeat(64), rawSnapshotHash: "c".repeat(64), calculatedAt: "2026-10-03T00:00:00+07:00", limitations: [] },
  transformations: [{ starId: "ziwei.star.ziwei", id: "ziwei.transformation.power" }],
  palaces: palaces.map((name, index) => ({ id: `ziwei.palace.${name}`, earthlyBranchId: `ziwei.branch.${branches[index]}`,
    stars: name === "life" ? [{ id: "ziwei.star.ziwei", brightness: "ziwei.brightness.exalted", category: "major" }] : [] })),
};
const tariff = { id: "tariff-1", pricingVersion: "v1", providerId: "p", modelId: "m", currency: "VND", status: "active", inputPricePerMillion: 15000, outputPricePerMillion: 60000, effectiveFrom: new Date("2026-01-01") };
const account = (userId: string, verified = true): CurrentActor => ({ kind: "account", userId, sessionId: "s", requestId: "r", emailVerified: verified });

describe("free palace request hook (real Postgres)", () => {
  let h: Harness;
  let main: TestDatabase;
  let seq = 0;
  beforeAll(async () => { h = await startFreeAiDatabase(); main = h.connect(); }, 180000);
  afterAll(async () => { if (h) await h.stop(); });
  beforeEach(async () => { for (const table of TABLES) await h.raw.unsafe(`DELETE FROM ${table}`); });

  const proofFor = ({ serializedRequest, maxOutputTokens }: { serializedRequest: string; maxOutputTokens: number }) => ({
    serializedRequestHash: createHash("sha256").update(serializedRequest).digest("hex"), maxInputTokens: 4000, enforcedMaxOutputTokens: maxOutputTokens, semanticsVersion: "test-adapter-v1",
  });
  const make = (database: TestDatabase, over: { flag?: boolean; proof?: boolean; trustedGuest?: boolean } = {}) => createFreePalaceRequestService({
    database: database as never, sources: createDatabaseZiweiQueryRepository(database as never), flagEnabled: () => over.flag ?? true, provider: "p", model: "m",
    loadActiveTariff: async () => tariff, boundProofFor: over.proof === false ? () => null : proofFor, isTrustedGuest: () => over.trustedGuest ?? false,
  });
  async function seed(userId = `hook-user-${++seq}`) {
    const chartVersionId = `hook-chart-${seq}`;
    const { chartId } = await seedChartVersion(main, chartVersionId, { kind: "account", userId }, { normalizedOutput: chart });
    return { userId, chartVersionId, chartId };
  }
  const count = async (table: string) => Number((await h.raw.unsafe(`SELECT count(*)::int AS n FROM ${table}`))[0]!.n);

  it("reserves through the shared path: one request, one frozen palace prompt, one typed outbox event", async () => {
    const s = await seed();
    const outcome = await make(main).request(account(s.userId), s.chartId);
    expect(outcome.kind).toBe("admitted");
    const [request] = await h.raw`SELECT palace_id, locale, status FROM free_ai_requests`;
    expect(request).toEqual({ palace_id: "ziwei.palace.life", locale: "vi", status: "reserved" });
    const [artifact] = await h.raw`SELECT frozen_call FROM free_ai_artifacts`;
    expect(artifact!.frozen_call.serializedPrompt).toContain("Tử Vi");
    expect((await h.raw`SELECT event_type, aggregate_type FROM outbox`)[0]).toEqual({ event_type: "free_palace.generation.requested.v1", aggregate_type: "chart" });
    expect(await count("free_ai_chart_budgets")).toBe(1);
  });

  it("row 53: a repeated calculation (reused chart) and concurrent duplicates reuse the one slot", async () => {
    const s = await seed();
    const first = await make(main).request(account(s.userId), s.chartId);
    const again = await make(main).request(account(s.userId), s.chartId);
    expect(first.kind).toBe("admitted");
    expect(again).toMatchObject({ kind: "existing", requestId: (first as { requestId: string }).requestId });
    const racers = await raceBehindLock(h.rawClient(), [0, 1, 2].map(() => () => make(h.connect()).request(account(s.userId), s.chartId)));
    expect(racers.every((r) => r.kind === "existing")).toBe(true);
    expect(await count("free_ai_requests")).toBe(1);
    expect(await count("outbox")).toBe(1);
    const fresh = await seed();
    const parallel = await raceBehindLock(h.rawClient(), [0, 1, 2].map(() => () => make(h.connect()).request(account(fresh.userId), fresh.chartId)));
    expect(parallel.filter((r) => r.kind === "admitted")).toHaveLength(1);
    expect(await count("free_ai_requests")).toBe(2);
  });

  it("row 51: flag off, no proof, unverified account and untrusted guest all leave the database untouched", async () => {
    const s = await seed();
    const outcomes = [
      await make(main, { flag: false }).request(account(s.userId), s.chartId),
      await make(main, { proof: false }).request(account(s.userId), s.chartId),
      await make(main).request(account(s.userId, false), s.chartId),
    ];
    expect(outcomes.map((o) => o.kind)).toEqual(["skipped", "skipped", "skipped"]);
    for (const table of TABLES) expect(await count(table), table).toBe(0);
  });

  it("a stranger cannot request a gift for someone else's chart", async () => {
    const s = await seed();
    expect(await make(main).request(account("someone-else"), s.chartId)).toEqual({ kind: "skipped", reason: "source_unavailable" });
    expect(await count("free_ai_requests")).toBe(0);
  });

  it("a trusted guest is admitted with the 24h TTL on the artifact; an untrusted one is not", async () => {
    const anonymousActorId = `hook-guest-${++seq}`;
    const expiresAt = new Date(Date.now() + 3_600_000);
    const { chartId } = await seedChartVersion(main, `hook-guest-chart-${seq}`, { kind: "guest", anonymousActorId, expiresAt }, { normalizedOutput: chart });
    const actor: CurrentActor = { kind: "anonymous", anonymousActorId, sessionId: "s", requestId: "r", expiresAt: expiresAt.toISOString() };
    expect(await make(main).request(actor, chartId)).toEqual({ kind: "skipped", reason: "identity_unverified" });
    expect((await make(main, { trustedGuest: true }).request(actor, chartId)).kind).toBe("admitted");
    const [artifact] = await h.raw`SELECT expires_at FROM free_ai_artifacts`;
    expect(new Date(artifact!.expires_at).getTime()).toBe(expiresAt.getTime());
  });

  it("chart completion → hook: the calculation result is identical and the request exists only after evidence is persisted", async () => {
    const s = await seed();
    const request = make(main);
    let evidenceOk = false;
    const calc = createZiweiCalculationService({
      repository: {
        async readAuthorizedRevision() { return { profileId: "p", revisionId: "r", normalized: { version: 1, originalInput: { version: 1, calendar: { kind: "solar", date: "1990-01-01" }, time: { precision: "exact_minute", localTime: "12:00" }, timezone: { offsetMinutes: 420 }, gender: "male", consentVersion: "2026-09-01" }, normalizedCalendar: { kind: "solar", date: "1990-01-01" }, normalizedTime: { precision: "exact_minute", localTime: "12:00" }, timezoneProvenance: { source: "offset", offsetMinutes: 420 }, utcInstant: "1990-01-01T05:00:00.000Z", normalizationWarnings: [], limitations: [] } as never }; },
        async create() { return { chartId: s.chartId, chartVersionId: s.chartVersionId, reused: false }; },
      },
      evidenceService: { async buildAndPersist() { return evidenceOk ? { ok: true as const } : { ok: false as const }; } },
      engine: { async calculateWithPrivateSnapshot() { return { result: { ok: true as const, output: chart as never, provenance: chart.provenance as never, warnings: [] }, rawSnapshot: {} }; } },
      onChartReady: (actor, value) => request.request(actor, value.chartId),
    });
    expect(await calc.calculate(account(s.userId), "r")).toMatchObject({ ok: false });
    expect(await count("free_ai_requests")).toBe(0);
    evidenceOk = true;
    expect(await calc.calculate(account(s.userId), "r")).toEqual({ ok: true, value: { chartId: s.chartId, chartVersionId: s.chartVersionId, reused: false } });
    expect(await count("free_ai_requests")).toBe(1);
  });
});
