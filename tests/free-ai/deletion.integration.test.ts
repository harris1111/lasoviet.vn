import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { authAnonymousActors, authUsers } from "../../packages/database/src/schema/auth.js";
import { birthProfileRevisions, birthProfiles, calculationRuns, ziweiChartVersions, ziweiCharts } from "../../packages/database/src/schema/birth-profile.js";
import { createFreeAiBudgetRepository } from "../../packages/backend/src/ziwei/free-ai-budget.repository.js";
import { createFreeAiDispatchService } from "../../packages/backend/src/ziwei/free-ai-dispatch.service.js";
import { createFreeAiSettlementService } from "../../packages/backend/src/ziwei/free-ai-settlement.service.js";
import { createFreePalaceArtifactRepository } from "../../packages/backend/src/ziwei/free-palace-artifact.repository.js";
import { createDatabaseAnonymousRetentionRepository } from "../../packages/backend/src/privacy/anonymous-retention.repository.js";
import { createDatabaseDeletionRepository } from "../../packages/backend/src/privacy/deletion.repository.js";
import { MICRO, costContext, lineage, raceBehindLock, startFreeAiDatabase, type TestDatabase } from "./free-ai-test-harness.js";

type Harness = Awaited<ReturnType<typeof startFreeAiDatabase>>;
const VND = (n: number) => BigInt(n) * MICRO;
const BIRTH_SENTINEL = "SENTINEL-BIRTH-1990-03-04";
const PROSE_SENTINEL = "SENTINEL-GIFT-PROSE";
const point = (text: string) => ({ text, evidenceKeys: ["fact:one"] });
const content = (palaceId = "ziwei.palace.life") => ({
  palaceId, title: "t", conclusion: PROSE_SENTINEL, keyPoints: [point("a"), point("b"), point("c")], narrative: PROSE_SENTINEL,
  do: [point("d")], avoid: [point("e")], evidenceKeys: ["fact:one"],
});
const facts = [{ key: "fact:one", label: "L", value: "V" }];

describe("free AI deletion-safe publication and retention (real Postgres)", () => {
  let h: Harness;
  let main: TestDatabase;
  let seq = 0;
  beforeAll(async () => { h = await startFreeAiDatabase(); main = h.connect(); }, 180000);
  afterAll(async () => { if (h) await h.stop(); });

  async function seedChart(owner: { userId: string } | { anonymousActorId: string }, chartVersionId: string) {
    const n = ++seq;
    const profileId = `profile-${n}`;
    const expires = "anonymousActorId" in owner ? { anonymousExpiresAt: new Date(Date.now() + 3_600_000) } : {};
    await main.insert(birthProfiles).values({ id: profileId, ...owner, ...expires });
    await main.insert(birthProfileRevisions).values({ id: `rev-${n}`, profileId, revisionNumber: 1, originalInput: { born: BIRTH_SENTINEL }, consentVersion: "v1" });
    await main.insert(calculationRuns).values({ id: `run-${n}`, profileId, profileRevisionId: `rev-${n}`, idempotencyKey: `k-${n}`, engineId: "e", engineVersion: "1", adapterId: "a", adapterVersion: "1", schemaId: "s", ruleSetId: "r", inputHash: "i", configHash: "c", rawSnapshotHash: "h" });
    await main.insert(ziweiCharts).values({ id: `chart-${n}`, profileId, profileRevisionId: `rev-${n}` });
    await main.insert(ziweiChartVersions).values({ id: chartVersionId, chartId: `chart-${n}`, calculationRunId: `run-${n}`, normalizedOutput: {}, privateRawSnapshot: { born: BIRTH_SENTINEL }, warnings: [], provenance: {} });
  }
  async function newAccount() {
    const id = `user-${++seq}`;
    await main.insert(authUsers).values({ id, name: id, email: `${id}@example.test` });
    return id;
  }
  async function newGuest(expiresAt = new Date(Date.now() + 3_600_000)) {
    const id = `anon-${++seq}`;
    await main.insert(authUsers).values({ id, name: id, email: `${id}@example.test`, isAnonymous: true });
    await main.insert(authAnonymousActors).values({ id, expiresAt });
    return id;
  }
  // Admits a request whose frozen prompt carries a birth sentinel, then optionally fences/settles it.
  async function provision(chart: string, owner: { kind: "guest" | "account"; id: string }, stage: "reserved" | "fenced" | "settled" | "unknown", expiresAt: Date | null = null) {
    const result = await createFreeAiBudgetRepository(h.connect()).reserve({
      flagEnabled: true, actor: { kind: owner.kind, id: owner.id, trusted: true }, lineage: lineage(chart), concern: "career",
      cost: costContext(VND(1000), { finalSerializedRequest: `{"born":"${BIRTH_SENTINEL}"}` }), traceId: "t", authorizeSource: async () => ({ expiresAt }),
    });
    if (result.kind !== "admitted") throw new Error(`setup admission failed: ${JSON.stringify(result)}`);
    let attemptId = "";
    if (stage !== "reserved") {
      const fence = await createFreeAiDispatchService(h.connect()).fence({ requestId: result.requestId, flagEnabled: true, isSourceAvailable: async () => true, activePricingSnapshotId: async () => "price-1" });
      if (fence.kind !== "fenced") throw new Error("setup fence failed");
      attemptId = fence.attemptId;
    }
    if (stage === "settled" || stage === "unknown") {
      const settlement = stage === "settled" ? { kind: "resolved", actualMicroVnd: VND(300), disposition: "publishable" } as const : { kind: "unknown" } as const;
      await createFreeAiSettlementService(h.connect()).settle({ requestId: result.requestId, attemptId, settlement });
    }
    return { requestId: result.requestId, attemptId };
  }
  const publish = (r: { requestId: string; attemptId: string }, palaceId?: string, database = h.connect()) =>
    createFreePalaceArtifactRepository(database).publish({ requestId: r.requestId, attemptId: r.attemptId, content: content(palaceId), facts });
  const artifact = async (requestId: string) => (await h.raw`SELECT content, facts, frozen_call, content_hash FROM free_ai_artifacts WHERE request_id=${requestId}`)[0]!;
  const request = async (requestId: string) => (await h.raw`SELECT status, concern FROM free_ai_requests WHERE id=${requestId}`)[0]!;

  it("publishes a settled, undeleted request: artifact written and status ready in one transaction", async () => {
    const user = await newAccount();
    const r = await provision("pub-ok", { kind: "account", id: user }, "settled");
    const result = await publish(r);
    expect(result).toMatchObject({ kind: "published" });
    expect((await artifact(r.requestId)).content).toMatchObject({ palaceId: "ziwei.palace.life" });
    expect((await request(r.requestId)).status).toBe("ready");
  });

  it("refuses to publish unknown-cost, unsettled, wrong-attempt or wrong-palace results", async () => {
    const user = await newAccount();
    const unknown = await provision("pub-unknown", { kind: "account", id: user }, "unknown");
    expect(await publish(unknown)).toEqual({ kind: "refused", reason: "not_publishable" });
    const fenced = await provision("pub-fenced", { kind: "account", id: user }, "fenced");
    expect(await publish(fenced)).toEqual({ kind: "refused", reason: "not_publishable" });
    const settled = await provision("pub-attempt", { kind: "account", id: user }, "settled");
    expect(await publish({ requestId: settled.requestId, attemptId: "123e4567-e89b-42d3-a456-426614174000" })).toEqual({ kind: "refused", reason: "not_publishable" });
    expect(await publish(settled, "ziwei.palace.wealth")).toEqual({ kind: "refused", reason: "not_publishable" });
    // a charged result that cannot be published (wrong palace) ends terminally, never lingering as dispatching
    expect((await request(settled.requestId)).status).toBe("terminal_failure");
  });

  it("row 26/27: deletion landing between the worker's initial check and its final publish blocks the publish — no resurrection", async () => {
    const guest = await newGuest();
    await seedChart({ anonymousActorId: guest }, "del-between");
    const r = await provision("del-between", { kind: "guest", id: guest }, "settled");
    // the worker's initial authorization check passes here ...
    expect(await createDatabaseAnonymousRetentionRepository(h.connect()).deleteNow(guest)).toMatchObject({ ok: true });
    // ... and deletion commits before the final publish
    expect(await publish(r)).toEqual({ kind: "refused", reason: "deleted" });
    expect(await publish(r)).toEqual({ kind: "refused", reason: "deleted" });
    const stored = await artifact(r.requestId);
    expect([stored.content, stored.facts, stored.frozen_call, stored.content_hash]).toEqual([null, null, null, null]);
    expect((await request(r.requestId)).status).toBe("terminal_failure");
    const reAdmit = await createFreeAiBudgetRepository(h.connect()).reserve({
      flagEnabled: true, actor: { kind: "account", id: "someone", trusted: true }, lineage: lineage("del-between"), concern: null,
      cost: costContext(VND(1000)), traceId: "t", authorizeSource: async () => ({ expiresAt: null }),
    });
    expect(reAdmit).toEqual({ kind: "refused", reason: "source_unavailable" });
  });

  it("row 26: a publish and a deletion racing for the lock always end with no readable payload or consistent ready+published", async () => {
    for (const order of [0, 1]) {
      const guest = await newGuest();
      const chart = `del-race-${order}-${seq}`;
      await seedChart({ anonymousActorId: guest }, chart);
      const r = await provision(chart, { kind: "guest", id: guest }, "settled");
      const thunks = [() => publish(r, undefined, h.connect()), () => createDatabaseAnonymousRetentionRepository(h.connect()).deleteNow(guest)];
      const results = await raceBehindLock(h.rawClient(), order === 0 ? thunks : thunks.reverse());
      expect(results).toHaveLength(2);
      const stored = await artifact(r.requestId);
      expect(stored.content).toBeNull(); // deletion always wins the final state
      expect((await h.raw`SELECT deleted_at FROM free_ai_chart_budgets WHERE chart_version_id=${chart}`)[0]!.deleted_at).not.toBeNull();
      expect(["terminal_failure", "ready"]).toContain((await request(r.requestId)).status);
    }
  });

  it("queued, in-flight and unknown-cost requests behave: holds released only when unfenced, exposure survives deletion", async () => {
    const guest = await newGuest();
    await Promise.all(["q-queued", "q-flight", "q-unknown"].map((chart) => seedChart({ anonymousActorId: guest }, chart)));
    const owner = { kind: "account" as const, id: await newAccount() };
    const queued = await provision("q-queued", owner, "reserved");
    const flight = await provision("q-flight", owner, "fenced");
    const unknown = await provision("q-unknown", owner, "unknown");
    await createDatabaseAnonymousRetentionRepository(h.connect()).deleteNow(guest);
    expect((await request(queued.requestId)).status).toBe("cancelled");
    expect((await h.raw`SELECT reserved_micro_vnd::text AS r FROM free_ai_chart_budgets WHERE chart_version_id='q-queued'`)[0]!.r).toBe("0");
    expect((await request(flight.requestId)).status).toBe("dispatching");
    expect((await h.raw`SELECT reserved_micro_vnd::text AS r FROM free_ai_chart_budgets WHERE chart_version_id='q-flight'`)[0]!.r).toBe(VND(1000).toString());
    expect((await request(unknown.requestId)).status).toBe("cost_unknown");
    expect((await h.raw`SELECT unknown_micro_vnd::text AS u FROM free_ai_chart_budgets WHERE chart_version_id='q-unknown'`)[0]!.u).toBe(VND(1000).toString());
    // the in-flight attempt still settles, but its result can never be published
    await createFreeAiSettlementService(h.connect()).settle({ requestId: flight.requestId, attemptId: flight.attemptId, settlement: { kind: "resolved", actualMicroVnd: VND(200), disposition: "publishable" } });
    expect(await publish(flight)).toEqual({ kind: "refused", reason: "deleted" });
  });

  it("row 28: a guest's 24h expiry purges the payload and blocks publishing", async () => {
    const guest = await newGuest(new Date(Date.now() - 1000));
    await seedChart({ anonymousActorId: guest }, "ttl-expired");
    const r = await provision("ttl-expired", { kind: "guest", id: guest }, "settled", new Date(Date.now() - 1000));
    expect(await publish(r)).toEqual({ kind: "refused", reason: "expired" });
    expect(await createFreePalaceArtifactRepository(h.connect()).purgeExpiredPayloads({ limit: 10 })).toBe(1);
    expect((await artifact(r.requestId)).frozen_call).toBeNull();
    expect(await createFreePalaceArtifactRepository(h.connect()).purgeExpiredPayloads({ limit: 10 })).toBe(0);
    // and the expiry path through the retention repository purges the actor and bumps the generation
    const other = await newGuest(new Date(Date.now() - 1000));
    await seedChart({ anonymousActorId: other }, "ttl-actor");
    const o = await provision("ttl-actor", { kind: "guest", id: other }, "settled");
    expect(await createDatabaseAnonymousRetentionRepository(h.connect()).purgeExpired(new Date(), 10)).toContain(other);
    expect((await artifact(o.requestId)).content).toBeNull();
    expect(await publish(o)).toEqual({ kind: "refused", reason: "deleted" });
  });

  it("an unexpired guest is not purged by the retention path", async () => {
    const guest = await newGuest();
    await seedChart({ anonymousActorId: guest }, "ttl-live");
    const r = await provision("ttl-live", { kind: "guest", id: guest }, "settled");
    expect(await createDatabaseAnonymousRetentionRepository(h.connect()).purgeActor(guest, new Date())).toMatchObject({ ok: false });
    expect(await publish(r)).toMatchObject({ kind: "published" });
  });

  it("row 29/30: account deletion purges the payload immediately and tombstones hold no birth data or prose", async () => {
    const user = await newAccount();
    await seedChart({ userId: user }, "acct-del");
    const r = await provision("acct-del", { kind: "account", id: user }, "settled");
    expect(await publish(r)).toMatchObject({ kind: "published" });
    const deletions = createDatabaseDeletionRepository(h.connect());
    expect(await deletions.request({ userId: user, requestId: `req-${seq}`, requestedAt: new Date(Date.now() - 2000), recoverUntil: new Date(Date.now() - 1000) })).toMatchObject({ ok: true });
    expect(await deletions.purgeExpired(new Date(), 10)).toHaveLength(1);
    const stored = await artifact(r.requestId);
    expect([stored.content, stored.facts, stored.frozen_call, stored.content_hash]).toEqual([null, null, null, null]);
    expect((await request(r.requestId)).concern).toBeNull();
    const everything = JSON.stringify([
      await h.raw`SELECT * FROM free_ai_requests WHERE id=${r.requestId}`, await h.raw`SELECT * FROM free_ai_artifacts WHERE request_id=${r.requestId}`,
      await h.raw`SELECT * FROM free_ai_chart_budgets WHERE chart_version_id='acct-del'`, await h.raw`SELECT * FROM free_ai_settlements WHERE request_id=${r.requestId}`,
      await h.raw`SELECT * FROM free_ai_admissions WHERE request_id=${r.requestId}`, await h.raw`SELECT payload FROM outbox WHERE event_type='free_palace.generation.requested.v1'`,
    ]);
    expect(everything).not.toContain(BIRTH_SENTINEL);
    expect(everything).not.toContain(PROSE_SENTINEL);
    expect(await publish(r)).toEqual({ kind: "refused", reason: "deleted" });
  });

  it("accounting survives deletion: settlement, admission and budget rows remain as non-content tombstones", async () => {
    const guest = await newGuest();
    await seedChart({ anonymousActorId: guest }, "tomb");
    const r = await provision("tomb", { kind: "guest", id: guest }, "settled");
    await createDatabaseAnonymousRetentionRepository(h.connect()).deleteNow(guest);
    expect(await h.raw`SELECT 1 FROM free_ai_settlements WHERE request_id=${r.requestId}`).toHaveLength(1);
    expect(await h.raw`SELECT 1 FROM free_ai_admissions WHERE request_id=${r.requestId}`).toHaveLength(1);
    expect((await h.raw`SELECT resolved_micro_vnd::text AS s FROM free_ai_chart_budgets WHERE chart_version_id='tomb'`)[0]!.s).toBe(VND(300).toString());
  });
});
