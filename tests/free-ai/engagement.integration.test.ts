import { createHash } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { CurrentActor } from "../../packages/contracts/src/index.js";
import { createFreePalaceEngagementService } from "../../packages/backend/src/ziwei/free-palace-engagement.service.js";
import { createFreePalaceRequestService } from "../../packages/backend/src/ziwei/free-palace-request.service.js";
import { createDatabaseZiweiQueryRepository } from "../../packages/backend/src/ziwei/ziwei-query.repository.js";
import { createDatabaseAnonymousRetentionRepository } from "../../packages/backend/src/privacy/anonymous-retention.repository.js";
import { createDatabaseDeletionRepository } from "../../packages/backend/src/privacy/deletion.repository.js";
import { createFreeAiDispatchService } from "../../packages/backend/src/ziwei/free-ai-dispatch.service.js";
import { createFreeAiSettlementService } from "../../packages/backend/src/ziwei/free-ai-settlement.service.js";
import { COORDINATION_LOCK_KEY, raceBehindLock, seedChartVersion, startFreeAiDatabase, type TestDatabase } from "./free-ai-test-harness.js";

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
  const make = (database: TestDatabase, flag = true, over: { now?: () => Date } = {}) => {
    const sources = createDatabaseZiweiQueryRepository(database as never);
    const request = createFreePalaceRequestService({ database: database as never, sources, flagEnabled: () => flag, provider: "p", model: "m", loadActiveTariff: async () => tariff, boundProofFor: proofFor });
    return createFreePalaceEngagementService({ database: database as never, sources, request, flagEnabled: () => flag, now: over.now });
  };
  async function guestChart(over: { anonymousActorId?: string; expiresAt?: Date } = {}) {
    const anonymousActorId = over.anonymousActorId ?? `eng-guest-${++seq}`;
    const expiresAt = over.expiresAt ?? new Date(Date.now() + 3_600_000);
    const chartVersionId = `eng-chart-${++seq}`;
    const { chartId } = await seedChartVersion(main, chartVersionId, { kind: "guest", anonymousActorId, expiresAt }, { normalizedOutput: chart });
    const actor: CurrentActor = { kind: "anonymous", anonymousActorId, sessionId: "s", requestId: "r", expiresAt: expiresAt.toISOString() };
    return { actor, chartId, chartVersionId, anonymousActorId };
  }
  const count = async (table: string) => Number((await h.raw.unsafe(`SELECT count(*)::int AS n FROM ${table}`))[0]!.n);

  async function deletionFixture(kind: "guest" | "account", at: Date) {
    if (kind === "guest") {
      const g = await guestChart({ expiresAt: new Date("2026-10-03T14:00:00.000Z") });
      return { ...g, delete: (database: TestDatabase) =>
        createDatabaseAnonymousRetentionRepository(database).deleteNow(g.anonymousActorId) };
    }
    const userId = `eng-delete-user-${++seq}`;
    const chartVersionId = `eng-delete-chart-${++seq}`;
    const { chartId } = await seedChartVersion(main, chartVersionId, { kind: "account", userId }, { normalizedOutput: chart });
    const requested = await createDatabaseDeletionRepository(main).request({
      userId, requestId: `delete-${seq}`, requestedAt: new Date(at.getTime() - 86_400_000), recoverUntil: new Date(at.getTime() - 1),
    });
    if (!requested.ok) throw new Error("ACCOUNT_DELETION_FIXTURE_FAILED");
    const actor: CurrentActor = { kind: "account", userId, sessionId: "s", requestId: "r", emailVerified: false };
    return { actor, chartId, chartVersionId, delete: async (database: TestDatabase) => {
      const purged = await createDatabaseDeletionRepository(database).purgeExpired(at, 100);
      return { ok: purged.includes(requested.value.requestId) };
    } };
  }

  it.each(["guest", "account"] as const)("engagement authorized first cannot recreate a marker after concurrent %s deletion", async (kind) => {
    const at = new Date("2026-10-03T12:00:00.000Z");
    const g = await deletionFixture(kind, at);
    const sources = createDatabaseZiweiQueryRepository(h.connect());
    let authorized = false;
    let resume!: () => void;
    const gate = new Promise<void>((resolve) => { resume = resolve; });
    const request = { request: vi.fn(async () => ({ kind: "skipped", reason: "test_no_dispatch" } as const)) };
    const service = createFreePalaceEngagementService({
      database: h.connect(), flagEnabled: () => true, now: () => at, request,
      sources: {
        async readAuthorizedChart(...args) {
          const source = await sources.readAuthorizedChart(...args);
          authorized = true;
          await gate;
          return source;
        },
      },
    });
    const recording = service.record(g.actor, g.chartId, "palaces", "vi");
    await vi.waitFor(() => expect(authorized).toBe(true));
    let deleted = false;
    const deletion = g.delete(h.connect())
      .then((result) => { deleted = true; return result; });
    try {
      // Original code finishes deletion while authorization is paused, then writes an orphan.
      // Fixed code queues deletion behind the engagement transaction instead.
      await vi.waitFor(async () => {
        const [locks] = await h.raw`SELECT EXISTS (SELECT 1 FROM pg_locks WHERE locktype='advisory' AND NOT granted) AS waiting`;
        expect(deleted || locks!.waiting).toBe(true);
      });
    } finally {
      resume();
      await Promise.all([recording, deletion]);
    }
    expect(await deletion).toMatchObject({ ok: true });
    expect(await h.raw`SELECT 1 FROM audit_logs WHERE action='free_palace.engagement' AND target_id=${g.chartVersionId}`).toHaveLength(0);
    expect(request.request).not.toHaveBeenCalled();
    expect(await count("free_ai_requests")).toBe(0);
  });

  it.each(["guest", "account"] as const)("%s deletion holding the coordination lock prevents later engagement authorization", async (kind) => {
    const at = new Date("2026-10-03T12:00:00.000Z");
    const g = await deletionFixture(kind, at);
    let lockAcquired = false;
    let resume!: () => void;
    const gate = new Promise<void>((resolve) => { resume = resolve; });
    // Pause the actual privacy transaction immediately after its first SQL statement,
    // the shared advisory lock. Its remaining cascade/purge runs without modification.
    const deletionDatabase = new Proxy(h.connect(), {
      get(database, key, receiver) {
        if (key !== "transaction") return Reflect.get(database, key, receiver);
        return (run: Parameters<TestDatabase["transaction"]>[0]) => database.transaction(async (transaction) => {
          let paused = false;
          return run(new Proxy(transaction, {
            get(target, property, proxy) {
              if (property !== "execute") return Reflect.get(target, property, proxy);
              return async (query: Parameters<typeof transaction.execute>[0]) => {
                const result = await transaction.execute(query);
                if (!paused) {
                  paused = true;
                  lockAcquired = true;
                  await gate;
                }
                return result;
              };
            },
          }));
        });
      },
    });
    const deletion = g.delete(deletionDatabase);
    let recording: ReturnType<ReturnType<typeof make>["record"]> | undefined;
    try {
      await vi.waitFor(() => expect(lockAcquired).toBe(true));
      recording = make(h.connect(), true, { now: () => at }).record(g.actor, g.chartId, "palaces", "vi");
      await vi.waitFor(async () => {
        const [locks] = await h.raw`SELECT EXISTS (SELECT 1 FROM pg_locks WHERE locktype='advisory' AND NOT granted) AS waiting`;
        expect(locks!.waiting).toBe(true);
      });
    } finally {
      resume();
      await Promise.all([deletion, recording]);
    }
    expect(await deletion).toMatchObject({ ok: true });
    expect(await recording).toEqual({ kind: "ignored", reason: "source_unavailable" });
    if (g.actor.kind === "account") {
      // The asynchronous deletion worker has not removed these rows yet; purge state
      // alone must already revoke the captured actor's source authorization.
      expect(await h.raw`SELECT 1 FROM birth_profiles WHERE user_id=${g.actor.userId}`).toHaveLength(1);
    }
    expect(await h.raw`SELECT 1 FROM audit_logs WHERE action='free_palace.engagement' AND target_id=${g.chartVersionId}`).toHaveLength(0);
    expect(await count("free_ai_requests")).toBe(0);
  });

  it.each(["verified", "third-tab"] as const)("account purge after %s engagement commits cannot recreate a request or private payload", async (trigger) => {
    const at = new Date("2026-10-03T12:00:00.000Z");
    const g = await deletionFixture("account", at);
    if (g.actor.kind !== "account") throw new Error("ACCOUNT_DELETION_FIXTURE_FAILED");
    const actor: CurrentActor = { ...g.actor, emailVerified: trigger === "verified" };
    if (trigger === "third-tab") {
      const preliminary = make(main, true, { now: () => at });
      await preliminary.record(actor, g.chartId, "overview", "vi");
      await preliminary.record(actor, g.chartId, "palaces", "vi");
    }
    const database = h.connect();
    const sources = createDatabaseZiweiQueryRepository(database);
    let tariffReached = false;
    let resume!: () => void;
    const gate = new Promise<void>((resolve) => { resume = resolve; });
    const request = createFreePalaceRequestService({
      database, sources, flagEnabled: () => true, now: () => at, provider: "p", model: "m", boundProofFor: proofFor,
      loadActiveTariff: async () => { tariffReached = true; await gate; return tariff; },
    });
    const service = createFreePalaceEngagementService({ database, sources, request, flagEnabled: () => true, now: () => at });
    const recording = service.record(actor, g.chartId, "topics", "vi");
    try {
      // Engagement has committed and the request has already read an authorized source.
      // Purge wins before the first reservation, so there is no budget tombstone to rely on.
      await vi.waitFor(() => expect(tariffReached).toBe(true));
      expect(await count("free_ai_chart_budgets")).toBe(0);
      expect(await g.delete(h.connect())).toMatchObject({ ok: true });
      expect(await h.raw`SELECT 1 FROM birth_profiles WHERE user_id=${actor.userId}`).toHaveLength(1);
    } finally {
      resume();
      await recording;
    }
    expect(await recording).toMatchObject({ kind: "requested", distinctTabs: trigger === "verified" ? 1 : 3,
      request: { kind: "refused", reason: "source_unavailable" } });
    for (const table of ["free_ai_requests", "free_ai_artifacts", "free_ai_admissions", "free_ai_chart_budgets"]) {
      expect(await count(table)).toBe(0);
    }
    expect(await h.raw`SELECT 1 FROM audit_logs WHERE action='free_palace.engagement' AND target_id=${g.chartVersionId}`).toHaveLength(0);
  });

  it("recoverable and cancelled account deletion retain their existing chart authorization", async () => {
    const at = new Date("2026-10-03T12:00:00.000Z");
    const userId = `eng-recoverable-user-${++seq}`;
    const { chartId } = await seedChartVersion(main, `eng-recoverable-chart-${++seq}`, { kind: "account", userId }, { normalizedOutput: chart });
    const actor: CurrentActor = { kind: "account", userId, sessionId: "s", requestId: "r", emailVerified: false };
    const deletions = createDatabaseDeletionRepository(main);
    const requested = await deletions.request({ userId, requestId: "recoverable", requestedAt: at,
      recoverUntil: new Date("2026-10-03T13:00:00.000Z") });
    if (!requested.ok) throw new Error("ACCOUNT_DELETION_FIXTURE_FAILED");
    const sources = createDatabaseZiweiQueryRepository(main);
    expect(await sources.readAuthorizedChart(actor, chartId, at)).toMatchObject({ chartId });
    expect(await deletions.cancel(userId, "cancel-recovery", at)).toMatchObject({ ok: true });
    expect(await sources.readAuthorizedChart(actor, chartId, at)).toMatchObject({ chartId });
    expect(await make(main, true, { now: () => at }).record(actor, chartId, "palaces", "vi"))
      .toEqual({ kind: "recorded", distinctTabs: 1 });
    expect(await count("free_ai_requests")).toBe(0);
  });

  it("a guest expiring while queued is authorized against the clock after the lock wait", async () => {
    let at = new Date("2026-10-03T12:00:00.000Z");
    const g = await guestChart({ expiresAt: new Date("2026-10-03T13:00:00.000Z") });
    let lockAcquired = false;
    let resume!: () => void;
    const gate = new Promise<void>((resolve) => { resume = resolve; });
    const holder = h.rawClient().begin(async (transaction) => {
      await transaction`SELECT pg_advisory_xact_lock(hashtextextended(${COORDINATION_LOCK_KEY}, 0))`;
      lockAcquired = true;
      await gate;
    });
    let recording: ReturnType<ReturnType<typeof make>["record"]> | undefined;
    try {
      await vi.waitFor(() => expect(lockAcquired).toBe(true));
      recording = make(h.connect(), true, { now: () => at }).record(g.actor, g.chartId, "palaces", "vi");
      await vi.waitFor(async () => {
        const [locks] = await h.raw`SELECT EXISTS (SELECT 1 FROM pg_locks WHERE locktype='advisory' AND NOT granted) AS waiting`;
        expect(locks!.waiting).toBe(true);
      });
      at = new Date("2026-10-03T14:00:00.000Z");
    } finally {
      resume();
      await Promise.all([holder, recording]);
    }
    expect(await recording).toEqual({ kind: "ignored", reason: "source_unavailable" });
    expect(await h.raw`SELECT 1 FROM audit_logs WHERE action='free_palace.engagement' AND target_id=${g.chartVersionId}`).toHaveLength(0);
    expect(await count("free_ai_requests")).toBe(0);
  });

  it("concurrent repeats of one tab persist one marker and never trigger a gift request", async () => {
    const at = new Date("2026-10-03T12:00:00.000Z");
    const g = await guestChart({ expiresAt: new Date("2026-10-03T14:00:00.000Z") });
    const results = await raceBehindLock(h.rawClient(), Array.from({ length: 6 }, () =>
      () => make(h.connect(), true, { now: () => at }).record(g.actor, g.chartId, "palaces", "vi")));
    expect(results).toEqual(Array.from({ length: 6 }, () => ({ kind: "recorded", distinctTabs: 1 })));
    expect(await h.raw`SELECT 1 FROM audit_logs WHERE action='free_palace.engagement' AND target_id=${g.chartVersionId}`).toHaveLength(1);
    expect(await count("free_ai_requests")).toBe(0);
  });

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

  it("manual guest deletion purges engagement markers even when no budget row exists (1 and 2 tab interactions)", async () => {
    // 1 tab interaction: no budget row ever created
    const g1 = await guestChart();
    const service = make(main);
    expect(await service.record(g1.actor, g1.chartId, "palaces", "vi")).toEqual({ kind: "recorded", distinctTabs: 1 });
    expect(await count("free_ai_chart_budgets")).toBe(0);
    const markers1 = await h.raw`SELECT target_id FROM audit_logs WHERE action='free_palace.engagement' AND target_id=${g1.chartVersionId}`;
    expect(markers1).toHaveLength(1);
    expect(await createDatabaseAnonymousRetentionRepository(h.connect()).deleteNow(g1.anonymousActorId)).toMatchObject({ ok: true });
    expect(await h.raw`SELECT 1 FROM audit_logs WHERE action='free_palace.engagement' AND target_id=${g1.chartVersionId}`).toHaveLength(0);

    // 2 tab interactions: still no budget row created
    const g2 = await guestChart();
    expect(await service.record(g2.actor, g2.chartId, "palaces", "vi")).toEqual({ kind: "recorded", distinctTabs: 1 });
    expect(await service.record(g2.actor, g2.chartId, "topics", "vi")).toEqual({ kind: "recorded", distinctTabs: 2 });
    expect(await count("free_ai_chart_budgets")).toBe(0);
    const markers2 = await h.raw`SELECT target_id FROM audit_logs WHERE action='free_palace.engagement' AND target_id=${g2.chartVersionId}`;
    expect(markers2).toHaveLength(2);
    expect(await createDatabaseAnonymousRetentionRepository(h.connect()).deleteNow(g2.anonymousActorId)).toMatchObject({ ok: true });
    expect(await h.raw`SELECT 1 FROM audit_logs WHERE action='free_palace.engagement' AND target_id=${g2.chartVersionId}`).toHaveLength(0);
  });

  it("TTL expiry purges engagement markers without budget rows (1 and 2 tabs), using frozen clock", async () => {
    const fixedBeforeExpiry = new Date("2026-10-03T12:00:00.000Z");
    const expiresAt = new Date("2026-10-03T14:00:00.000Z");
    const frozenNow = new Date("2026-10-03T15:00:00.000Z");
    const service = make(main, true, { now: () => fixedBeforeExpiry });

    // 1 tab guest interaction recorded before expiry
    const g1 = await guestChart({ expiresAt });
    expect(await service.record(g1.actor, g1.chartId, "palaces", "vi")).toEqual({ kind: "recorded", distinctTabs: 1 });

    // 2 tabs guest interaction recorded before expiry
    const g2 = await guestChart({ expiresAt });
    expect(await service.record(g2.actor, g2.chartId, "palaces", "vi")).toEqual({ kind: "recorded", distinctTabs: 1 });
    expect(await service.record(g2.actor, g2.chartId, "topics", "vi")).toEqual({ kind: "recorded", distinctTabs: 2 });

    expect(await count("free_ai_chart_budgets")).toBe(0);
    expect(await h.raw`SELECT 1 FROM audit_logs WHERE action='free_palace.engagement'`).toHaveLength(3);

    const purged = await createDatabaseAnonymousRetentionRepository(h.connect()).purgeExpired(frozenNow, 10);
    expect(purged).toEqual(expect.arrayContaining([g1.anonymousActorId, g2.anonymousActorId]));
    expect(await h.raw`SELECT 1 FROM audit_logs WHERE action='free_palace.engagement'`).toHaveLength(0);
  });

  it("mixed budget and no-budget chart versions remove all markers while retaining resolved accounting history", async () => {
    const anonymousActorId = `eng-guest-mixed-${++seq}`;
    const expiresAt = new Date(Date.now() + 3_600_000);
    const service = make(main);

    // Chart version 1 (with budget): reached 3 tabs -> admitted
    const gBudget = await guestChart({ anonymousActorId, expiresAt });
    await service.record(gBudget.actor, gBudget.chartId, "palaces", "vi");
    await service.record(gBudget.actor, gBudget.chartId, "topics", "vi");
    const admitted = await service.record(gBudget.actor, gBudget.chartId, "evidence", "vi");
    expect(admitted).toMatchObject({ kind: "requested", request: { kind: "admitted" } });
    expect(await count("free_ai_chart_budgets")).toBe(1);

    // Fence and settle the admitted request via actual services
    const [requestRow] = await h.raw`SELECT id, pricing_snapshot_id FROM free_ai_requests WHERE chart_version_id=${gBudget.chartVersionId}`;
    const dispatchService = createFreeAiDispatchService(main as never);
    const fenceResult = await dispatchService.fence({
      requestId: requestRow!.id,
      flagEnabled: true,
      isSourceAvailable: async () => true,
      activePricingSnapshotId: async () => requestRow!.pricing_snapshot_id,
    });
    expect(fenceResult).toMatchObject({ kind: "fenced" });
    if (fenceResult.kind !== "fenced") throw new Error("fence failed");

    const settlementService = createFreeAiSettlementService(main as never);
    const settleResult = await settlementService.settle({
      requestId: requestRow!.id,
      attemptId: fenceResult.attemptId,
      settlement: { kind: "resolved", actualMicroVnd: 45_000_000n, disposition: "publishable" },
    });
    expect(settleResult).toMatchObject({ kind: "settled" });

    // Chart version 2 (no budget): same anonymous actor, only 2 tabs -> no budget row created
    const gNoBudget = await guestChart({ anonymousActorId, expiresAt });
    await service.record(gNoBudget.actor, gNoBudget.chartId, "palaces", "vi");
    await service.record(gNoBudget.actor, gNoBudget.chartId, "overview", "vi");

    // Total markers: 3 from gBudget + 2 from gNoBudget
    expect(await h.raw`SELECT 1 FROM audit_logs WHERE action='free_palace.engagement'`).toHaveLength(5);
    // Budget rows: only 1 exists (for gBudget)
    expect(await count("free_ai_chart_budgets")).toBe(1);

    // Single purge call for the anonymous actor owning both chart versions
    expect(await createDatabaseAnonymousRetentionRepository(h.connect()).deleteNow(anonymousActorId)).toMatchObject({ ok: true });

    // Markers for BOTH chart versions are removed
    expect(await h.raw`SELECT 1 FROM audit_logs WHERE action='free_palace.engagement'`).toHaveLength(0);

    // Resolved accounting history for the budgeted chart version is retained
    const [budgetRow] = await h.raw`SELECT resolved_micro_vnd::text AS s, deleted_at FROM free_ai_chart_budgets WHERE chart_version_id=${gBudget.chartVersionId}`;
    expect(budgetRow).toBeDefined();
    expect(budgetRow!.s).toBe("45000000");
    expect(budgetRow!.deleted_at).not.toBeNull();

    const [settlementRow] = await h.raw`SELECT outcome, actual_micro_vnd::text AS actual FROM free_ai_settlements WHERE request_id=${requestRow!.id}`;
    expect(settlementRow).toEqual({ outcome: "resolved", actual: "45000000" });

    // The no-budget chart version still has no budget row
    const noBudgetRows = await h.raw`SELECT 1 FROM free_ai_chart_budgets WHERE chart_version_id=${gNoBudget.chartVersionId}`;
    expect(noBudgetRows).toHaveLength(0);
  });
});
