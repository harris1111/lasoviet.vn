import { createHash } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { CurrentActor } from "../../packages/contracts/src/index.js";
import { createFreePalaceEngagementService } from "../../packages/backend/src/ziwei/free-palace-engagement.service.js";
import { createFreePalaceRequestService } from "../../packages/backend/src/ziwei/free-palace-request.service.js";
import { createDatabaseZiweiQueryRepository } from "../../packages/backend/src/ziwei/ziwei-query.repository.js";
import { createDatabaseAnonymousRetentionRepository } from "../../packages/backend/src/privacy/anonymous-retention.repository.js";
import { raceBehindLock, seedChartVersion, startFreeAiDatabase, type TestDatabase } from "./free-ai-test-harness.js";

type Harness = Awaited<ReturnType<typeof startFreeAiDatabase>>;
const TABLES = ["outbox", "free_ai_artifacts", "free_ai_settlements", "free_ai_admissions", "free_ai_requests", "free_ai_quota_aliases", "free_ai_quota_subjects", "free_ai_daily_budgets", "free_ai_chart_budgets", "audit_logs"];
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

describe("free palace engagement → guest trust → gift request (real Postgres)", () => {
  let h: Harness;
  let main: TestDatabase;
  let seq = 0;
  beforeAll(async () => { h = await startFreeAiDatabase(); main = h.connect(); }, 180000);
  afterAll(async () => { if (h) await h.stop(); });
  beforeEach(async () => { for (const table of TABLES) await h.raw.unsafe(`DELETE FROM ${table}`); });

  const proofFor = ({ serializedRequest, maxOutputTokens }: { serializedRequest: string; maxOutputTokens: number }) => ({
    serializedRequestHash: createHash("sha256").update(serializedRequest).digest("hex"), maxInputTokens: 4000, enforcedMaxOutputTokens: maxOutputTokens, semanticsVersion: "test-adapter-v1",
  });
  const make = (database: TestDatabase, flag = true) => {
    const sources = createDatabaseZiweiQueryRepository(database as never);
    const request = createFreePalaceRequestService({ database: database as never, sources, flagEnabled: () => flag, provider: "p", model: "m", loadActiveTariff: async () => tariff, boundProofFor: proofFor });
    return createFreePalaceEngagementService({ database: database as never, sources, request, flagEnabled: () => flag });
  };
  async function guestChart() {
    const anonymousActorId = `eng-guest-${++seq}`;
    const expiresAt = new Date(Date.now() + 3_600_000);
    const { chartId } = await seedChartVersion(main, `eng-chart-${seq}`, { kind: "guest", anonymousActorId, expiresAt }, { normalizedOutput: chart });
    const actor: CurrentActor = { kind: "anonymous", anonymousActorId, sessionId: "s", requestId: "r", expiresAt: expiresAt.toISOString() };
    return { actor, chartId, chartVersionId: `eng-chart-${seq}`, anonymousActorId };
  }
  const count = async (table: string) => Number((await h.raw.unsafe(`SELECT count(*)::int AS n FROM ${table}`))[0]!.n);

  it("a guest is not trusted by one or two tabs, and becomes trusted at the third distinct tab", async () => {
    const g = await guestChart();
    const service = make(main);
    expect(await service.record(g.actor, g.chartId, "palaces", "vi")).toEqual({ kind: "recorded", distinctTabs: 1 });
    expect(await service.record(g.actor, g.chartId, "topics", "vi")).toEqual({ kind: "recorded", distinctTabs: 2 });
    expect(await count("free_ai_requests")).toBe(0);
    const third = await service.record(g.actor, g.chartId, "evidence", "vi");
    expect(third).toMatchObject({ kind: "requested", distinctTabs: 3, request: { kind: "admitted" } });
    expect(await count("free_ai_requests")).toBe(1);
    expect(await count("outbox")).toBe(1);
  });

  it("repeating the same tab never counts twice and never re-requests", async () => {
    const g = await guestChart();
    const service = make(main);
    for (let i = 0; i < 5; i += 1) await service.record(g.actor, g.chartId, "palaces", "vi");
    expect(await count("audit_logs")).toBe(1);
    await service.record(g.actor, g.chartId, "topics", "vi");
    expect(await service.record(g.actor, g.chartId, "palaces", "vi")).toEqual({ kind: "recorded", distinctTabs: 2 });
    expect(await count("free_ai_requests")).toBe(0);
  });

  it("owner decision: the gift is requested in the reader's locale (English)", async () => {
    const g = await guestChart();
    const service = make(main);
    for (const tab of ["palaces", "topics", "evidence"]) await service.record(g.actor, g.chartId, tab, "en");
    const [request] = await h.raw`SELECT locale, palace_id FROM free_ai_requests`;
    expect(request).toEqual({ locale: "en", palace_id: "ziwei.palace.life" });
    const [artifact] = await h.raw`SELECT frozen_call FROM free_ai_artifacts`;
    expect(artifact!.frozen_call.serializedPrompt).toContain("Zi Wei");
    expect(artifact!.frozen_call.serializedPrompt).toContain("Principal star in this palace");
    expect(artifact!.frozen_call.locale).toBe("en");
  });

  it("the first request fixes the slot's locale; engaging later in the other locale cannot re-grant it", async () => {
    const g = await guestChart();
    const service = make(main);
    for (const tab of ["palaces", "topics", "evidence"]) await service.record(g.actor, g.chartId, tab, "en");
    await service.record(g.actor, g.chartId, "chart", "vi");
    await service.record(g.actor, g.chartId, "overview", "vi");
    expect(await count("free_ai_requests")).toBe(1);
    expect((await h.raw`SELECT locale FROM free_ai_requests`)[0]!.locale).toBe("en");
  });

  it("a verified account is requested on its first opened tab; an unverified account needs the same three tabs as a guest", async () => {
    const userId = `eng-user-${++seq}`;
    const { chartId } = await seedChartVersion(main, `eng-acct-${seq}`, { kind: "account", userId }, { normalizedOutput: chart });
    const verified: CurrentActor = { kind: "account", userId, sessionId: "s", requestId: "r", emailVerified: true };
    expect(await make(main).record(verified, chartId, "overview", "vi")).toMatchObject({ kind: "requested", request: { kind: "admitted" } });
    const otherUser = `eng-user-${++seq}`;
    const other = await seedChartVersion(main, `eng-acct-${seq}`, { kind: "account", userId: otherUser }, { normalizedOutput: chart });
    const unverified: CurrentActor = { kind: "account", userId: otherUser, sessionId: "s", requestId: "r", emailVerified: false };
    expect(await make(main).record(unverified, other.chartId, "overview", "vi")).toEqual({ kind: "recorded", distinctTabs: 1 });
    await make(main).record(unverified, other.chartId, "palaces", "vi");
    expect(await make(main).record(unverified, other.chartId, "topics", "vi")).toMatchObject({ kind: "requested", request: { kind: "admitted" } });
  });

  it("flag off, an invalid tab and a stranger record nothing and request nothing", async () => {
    const g = await guestChart();
    expect(await make(main, false).record(g.actor, g.chartId, "palaces", "vi")).toEqual({ kind: "ignored", reason: "flag_disabled" });
    expect(await make(main).record(g.actor, g.chartId, "admin", "vi")).toEqual({ kind: "ignored", reason: "tab_invalid" });
    const stranger: CurrentActor = { kind: "anonymous", anonymousActorId: "someone-else", sessionId: "s", requestId: "r", expiresAt: new Date(Date.now() + 3_600_000).toISOString() };
    expect(await make(main).record(stranger, g.chartId, "palaces", "vi")).toEqual({ kind: "ignored", reason: "source_unavailable" });
    expect(await count("audit_logs")).toBe(0);
    expect(await count("free_ai_requests")).toBe(0);
  });

  it("concurrent tab reports from one guest produce exactly one request", async () => {
    const g = await guestChart();
    const tabs = ["palaces", "topics", "evidence", "chart", "overview", "nam-nay"];
    const results = await raceBehindLock(h.rawClient(), tabs.map((tab) => () => make(h.connect()).record(g.actor, g.chartId, tab, "vi")));
    expect(results.every((r) => r.kind !== "ignored")).toBe(true);
    expect(await count("free_ai_requests")).toBe(1);
    expect(await count("outbox")).toBe(1);
  });

  it("engagement markers are removed with the guest's data (24h deletion) and carry no birth data", async () => {
    const g = await guestChart();
    const service = make(main);
    for (const tab of ["palaces", "topics"]) await service.record(g.actor, g.chartId, tab, "vi");
    const [marker] = await h.raw`SELECT actor_id, target_id, metadata FROM audit_logs WHERE action='free_palace.engagement' LIMIT 1`;
    expect(Object.keys(marker!).sort()).toEqual(["actor_id", "metadata", "target_id"]);
    expect(marker!.metadata).toEqual({ tab: expect.any(String) });
    // the guest has a gift request so the purge path touches this chart version
    await service.record(g.actor, g.chartId, "evidence", "vi");
    expect(await createDatabaseAnonymousRetentionRepository(h.connect()).deleteNow(g.anonymousActorId)).toMatchObject({ ok: true });
    expect(await h.raw`SELECT 1 FROM audit_logs WHERE action='free_palace.engagement'`).toHaveLength(0);
  });
});
