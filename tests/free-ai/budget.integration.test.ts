import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createFreeAiBudgetRepository, type FreePalaceReservationInput } from "../../packages/backend/src/ziwei/free-ai-budget.repository.js";
import { MICRO, costContext, insertLegacyAttempt, lineage, raceBehindLock, startFreeAiDatabase } from "./free-ai-test-harness.js";

type Harness = Awaited<ReturnType<typeof startFreeAiDatabase>>;
const VND = (n: number) => BigInt(n) * MICRO;
const FREE_TABLES = ["outbox", "free_ai_artifacts", "free_ai_settlements", "free_ai_admissions", "free_ai_requests", "free_ai_quota_aliases", "free_ai_quota_subjects", "free_ai_daily_budgets", "free_ai_chart_budgets"];
const WRITES = ["outbox", "free_ai_artifacts", "free_ai_admissions", "free_ai_requests", "free_ai_quota_aliases", "free_ai_quota_subjects", "free_ai_daily_budgets", "free_ai_chart_budgets"];

describe("free AI shared reservation (real Postgres)", () => {
  let h: Harness;
  beforeAll(async () => { h = await startFreeAiDatabase(); }, 180000);
  afterAll(async () => { if (h) await h.stop(); });
  beforeEach(async () => { for (const table of FREE_TABLES) await h.raw.unsafe(`DELETE FROM ${table}`); });

  type Options = { bound?: bigint; actorId?: string; kind?: "guest" | "account"; lineageOverrides?: Parameters<typeof lineage>[1]; flagEnabled?: boolean; trusted?: boolean; authorized?: boolean };
  const input = (chart: string, o: Options = {}): FreePalaceReservationInput => ({
    flagEnabled: o.flagEnabled ?? true,
    actor: { kind: o.kind ?? "account", id: o.actorId ?? `actor-${chart}`, trusted: o.trusted ?? true },
    lineage: lineage(chart, o.lineageOverrides), concern: null, cost: costContext(o.bound ?? VND(1000)), traceId: "trace",
    authorizeSource: async () => (o.authorized === false ? null : { expiresAt: null }),
  });
  const reserve = (chart: string, o: Options = {}, db = h.connect()) => createFreeAiBudgetRepository(db).reserve(input(chart, o));
  const count = async (table: string) => Number((await h.raw.unsafe(`SELECT count(*)::int AS n FROM ${table}`))[0]!.n);
  const totals = async (table: "free_ai_chart_budgets" | "free_ai_daily_budgets", key?: string) => {
    const rows = await h.raw.unsafe(`SELECT reserved_micro_vnd::text r, resolved_micro_vnd::text s, unknown_micro_vnd::text u FROM ${table}${key ? ` WHERE ${table === "free_ai_chart_budgets" ? "chart_version_id" : "utc_day::text"}='${key}'` : ""}`);
    return rows.map((row) => ({ reserved: BigInt(row.r), resolved: BigInt(row.s), unknown: BigInt(row.u) }));
  };
  const today = () => new Date().toISOString().slice(0, 10);

  it("admits atomically: slot, admission, reservation, frozen call and one typed outbox event", async () => {
    expect(await reserve("c-ok", { bound: VND(1200) })).toMatchObject({ kind: "admitted", reservedMicroVnd: VND(1200) });
    const [chart] = await totals("free_ai_chart_budgets", "c-ok");
    expect(chart!.reserved).toBe(VND(1200));
    expect((await totals("free_ai_daily_budgets", today()))[0]!.reserved).toBe(VND(1200));
    expect(await count("free_ai_requests")).toBe(1);
    expect(await count("free_ai_admissions")).toBe(1);
    const [artifact] = await h.raw`SELECT frozen_call, content FROM free_ai_artifacts`;
    expect(artifact!.content).toBeNull();
    expect(artifact!.frozen_call.reservedMicroVnd).toBe(VND(1200).toString());
    const events = await h.raw`SELECT event_type, aggregate_type, payload FROM outbox`;
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ event_type: "free_palace.generation.requested.v1", aggregate_type: "chart" });
    const [legacy] = await h.raw`SELECT legacy_reconciled_at FROM free_ai_chart_budgets WHERE chart_version_id='c-ok'`;
    expect(legacy!.legacy_reconciled_at).not.toBeNull();
  });

  it("rows 1 and 9: two connections on one chart admit exactly once; a technical key change never re-grants the slot", async () => {
    const results = await raceBehindLock(h.rawClient(), [
      () => reserve("c-race", { actorId: "u1" }), () => reserve("c-race", { actorId: "u2" }),
    ]);
    expect(results.map((r) => r.kind).sort()).toEqual(["admitted", "fallback"]);
    expect(await count("free_ai_requests")).toBe(1);
    const changed = await reserve("c-race", { actorId: "u3", lineageOverrides: { promptVersion: "p2", locale: "en", palaceId: "ziwei.palace.wealth", model: "fake-model" } });
    expect(changed.kind).toBe("fallback");
    expect(await count("free_ai_requests")).toBe(1);
    expect((await totals("free_ai_chart_budgets", "c-race"))[0]!.reserved).toBe(VND(1000));
  });

  it("row 1 (ceiling): reserved + resolved can never exceed 3,000 VND for one chart version", async () => {
    await insertLegacyAttempt(h.raw, { chart: "c-ceiling", costMicroVnd: VND(2500) });
    expect(await reserve("c-ceiling", { bound: VND(600) })).toEqual({ kind: "refused", reason: "chart_budget_exhausted" });
    expect(await count("free_ai_requests")).toBe(0);
    expect(await reserve("c-ceiling", { bound: VND(500) })).toMatchObject({ kind: "admitted" });
    const [chart] = await totals("free_ai_chart_budgets", "c-ceiling");
    expect(chart!.reserved + chart!.resolved).toBe(VND(3000));
  });

  it("row 2: concurrent connections on different charts cannot exceed the 50,000 VND UTC-day ceiling", async () => {
    await h.raw`INSERT INTO free_ai_daily_budgets(utc_day,reserved_micro_vnd) VALUES (${today()},${VND(47000).toString()})`;
    const results = await raceBehindLock(h.rawClient(), [0, 1, 2, 3].map((i) => () => reserve(`c-day-${i}`, { bound: VND(1100), actorId: `day-${i}` })));
    expect(results.filter((r) => r.kind === "admitted")).toHaveLength(2);
    expect(results.filter((r) => r.kind === "refused" && r.reason === "daily_budget_exhausted")).toHaveLength(2);
    const [day] = await totals("free_ai_daily_budgets", today());
    expect(day!.reserved + day!.resolved + day!.unknown).toBeLessThanOrEqual(VND(50000));
    expect(day!.reserved).toBe(VND(49200));
  });

  it("row 3: reserved, resolved and unknown exposure all count toward both ceilings", async () => {
    await h.raw`INSERT INTO free_ai_daily_budgets(utc_day,unknown_micro_vnd) VALUES (${today()},${VND(49000).toString()})`;
    expect(await reserve("c-u1", { bound: VND(1500) })).toEqual({ kind: "refused", reason: "daily_budget_exhausted" });
    expect(await reserve("c-u2", { bound: VND(1000) })).toMatchObject({ kind: "admitted" });
    await h.raw`INSERT INTO free_ai_chart_budgets(chart_version_id,unknown_micro_vnd) VALUES ('c-u3',${VND(2000).toString()})`;
    expect(await reserve("c-u3", { bound: VND(1500) })).toEqual({ kind: "refused", reason: "chart_budget_exhausted" });
  });

  it("row 4: unknown or unreconciled legacy exposure blocks a new admission", async () => {
    await insertLegacyAttempt(h.raw, { chart: "c-legacy-none", outcome: "none" });
    await insertLegacyAttempt(h.raw, { chart: "c-legacy-unknown", outcome: "unknown" });
    expect(await reserve("c-legacy-none")).toEqual({ kind: "refused", reason: "legacy_unreconciled" });
    expect(await reserve("c-legacy-unknown")).toEqual({ kind: "refused", reason: "legacy_unreconciled" });
    expect(await count("free_ai_requests")).toBe(0);
    expect(await count("free_ai_chart_budgets")).toBe(0);
  });

  it("row 5: a legacy outcome is imported once however many times admission runs", async () => {
    await insertLegacyAttempt(h.raw, { chart: "c-once", costMicroVnd: VND(500) });
    await h.raw`INSERT INTO free_ai_daily_budgets(utc_day,unknown_micro_vnd) VALUES (${today()},${VND(49900).toString()})`;
    expect(await reserve("c-once")).toEqual({ kind: "refused", reason: "daily_budget_exhausted" });
    expect(await count("free_ai_chart_budgets")).toBe(0); // refusal rolled the import back
    await h.raw`UPDATE free_ai_daily_budgets SET unknown_micro_vnd=0`;
    expect(await reserve("c-once")).toMatchObject({ kind: "admitted" });
    expect((await totals("free_ai_chart_budgets", "c-once"))[0]!.resolved).toBe(VND(500));
    expect((await totals("free_ai_daily_budgets", today()))[0]!.resolved).toBe(VND(500));
    expect((await reserve("c-once", { actorId: "someone-else" })).kind).toBe("fallback");
    expect((await totals("free_ai_chart_budgets", "c-once"))[0]!.resolved).toBe(VND(500));
  });

  it("row 6: guest rolling 24h is 1, verified account is 3, and a 25-hour-old admission no longer counts", async () => {
    expect(await reserve("g1", { kind: "guest", actorId: "guest-a" })).toMatchObject({ kind: "admitted" });
    expect(await reserve("g2", { kind: "guest", actorId: "guest-a" })).toEqual({ kind: "refused", reason: "quota_exhausted" });
    for (const chart of ["a1", "a2", "a3"]) expect(await reserve(chart, { actorId: "acct" })).toMatchObject({ kind: "admitted" });
    expect(await reserve("a4", { actorId: "acct" })).toEqual({ kind: "refused", reason: "quota_exhausted" });
    await h.raw`UPDATE free_ai_admissions SET admitted_at = now() - interval '25 hours' WHERE request_id = (SELECT id FROM free_ai_requests WHERE chart_version_id='a1')`;
    expect(await reserve("a4", { actorId: "acct" })).toMatchObject({ kind: "admitted" });
  });

  it("row 7: an authorized supported cache hit returns before any charge, even with the flag off", async () => {
    const first = await reserve("c-cache", { bound: VND(800) });
    expect(first.kind).toBe("admitted");
    if (first.kind !== "admitted") return;
    await h.raw`UPDATE free_ai_requests SET status='ready' WHERE id=${first.requestId}`;
    await h.raw`UPDATE free_ai_artifacts SET content='{}'::jsonb, facts='[]'::jsonb WHERE request_id=${first.requestId}`;
    const before = [await totals("free_ai_chart_budgets"), await totals("free_ai_daily_budgets"), await count("free_ai_admissions"), await count("outbox")];
    expect(await reserve("c-cache", { actorId: "other", flagEnabled: false })).toMatchObject({ kind: "cache", requestId: first.requestId });
    expect([await totals("free_ai_chart_budgets"), await totals("free_ai_daily_budgets"), await count("free_ai_admissions"), await count("outbox")]).toEqual(before);
    await h.raw`UPDATE free_ai_artifacts SET expires_at = now() - interval '1 minute' WHERE request_id=${first.requestId}`;
    expect((await reserve("c-cache", { flagEnabled: false })).kind).toBe("fallback");
  });

  it("refuses without any write when the flag is off, identity is untrusted, or the source is unavailable or deleted", async () => {
    expect(await reserve("r1", { flagEnabled: false })).toEqual({ kind: "refused", reason: "flag_disabled" });
    expect(await reserve("r2", { trusted: false })).toEqual({ kind: "refused", reason: "identity_unverified" });
    expect(await reserve("r3", { authorized: false })).toEqual({ kind: "refused", reason: "source_unavailable" });
    await h.raw`INSERT INTO free_ai_chart_budgets(chart_version_id,deleted_at) VALUES ('r4',now())`;
    expect(await reserve("r4")).toEqual({ kind: "refused", reason: "source_unavailable" });
    for (const table of ["free_ai_requests", "free_ai_admissions", "free_ai_artifacts", "outbox", "free_ai_quota_subjects", "free_ai_daily_budgets"]) expect(await count(table)).toBe(0);
  });

  describe("row 8: a fault injected after each individual write leaves no partial rows", () => {
    const faults: Array<[string, string, string]> = [
      ["quota subject insert", "free_ai_quota_subjects", "BEFORE INSERT"],
      ["quota alias insert", "free_ai_quota_aliases", "BEFORE INSERT"],
      ["chart reservation update", "free_ai_chart_budgets", "BEFORE UPDATE OF reserved_micro_vnd"],
      ["daily reservation update", "free_ai_daily_budgets", "BEFORE UPDATE OF reserved_micro_vnd"],
      ["request insert", "free_ai_requests", "BEFORE INSERT"],
      ["admission insert", "free_ai_admissions", "BEFORE INSERT"],
      ["artifact insert", "free_ai_artifacts", "BEFORE INSERT"],
      ["outbox insert", "outbox", "BEFORE INSERT"],
    ];
    it.each(faults)("%s", async (_name, table, event) => {
      await h.raw.unsafe(`CREATE OR REPLACE FUNCTION inject_free_ai_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected_free_ai_fault'; END $$`);
      await h.raw.unsafe(`CREATE TRIGGER inject_fault ${event} ON ${table} FOR EACH ROW EXECUTE FUNCTION inject_free_ai_fault()`);
      try {
        await expect(reserve("c-fault")).rejects.toThrow();
      } finally {
        await h.raw.unsafe(`DROP TRIGGER inject_fault ON ${table}`);
      }
      for (const name of WRITES) expect(await count(name), `${name} must be empty`).toBe(0);
      expect(await reserve("c-fault")).toMatchObject({ kind: "admitted" });
    });
  });
});
