import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createFreeAiDispatchService, type FreeAiFenceInput } from "../../packages/backend/src/ziwei/free-ai-dispatch.service.js";
import { createFreeAiSettlementService } from "../../packages/backend/src/ziwei/free-ai-settlement.service.js";
import { MICRO, admitRequest, raceBehindLock, startFreeAiDatabase } from "./free-ai-test-harness.js";

type Harness = Awaited<ReturnType<typeof startFreeAiDatabase>>;
const VND = (n: number) => BigInt(n) * MICRO;
const TABLES = ["outbox", "free_ai_artifacts", "free_ai_settlements", "free_ai_admissions", "free_ai_requests", "free_ai_quota_aliases", "free_ai_quota_subjects", "free_ai_daily_budgets", "free_ai_chart_budgets", "audit_logs"];

describe("free AI settlement (real Postgres)", () => {
  let h: Harness;
  let seq = 0;
  beforeAll(async () => { h = await startFreeAiDatabase(); }, 180000);
  afterAll(async () => { if (h) await h.stop(); });
  beforeEach(async () => { for (const table of TABLES) await h.raw.unsafe(`DELETE FROM ${table}`); });

  const fenceInput = (requestId: string, over: Partial<FreeAiFenceInput> = {}): FreeAiFenceInput => ({
    requestId, flagEnabled: true, isSourceAvailable: async () => true, activePricingSnapshotId: async () => "price-1", ...over,
  });
  const db = () => h.connect();
  async function fenced(bound = VND(1000), options: { clock?: () => Promise<Date>; actorId?: string; kind?: "guest" | "account" } = {}) {
    const database = db();
    const name = `s-${++seq}`;
    const requestId = await admitRequest(database, name, { bound, actorId: options.actorId, kind: options.kind, clock: options.clock as never });
    const result = await createFreeAiDispatchService(database).fence(fenceInput(requestId, { clock: options.clock as never }));
    if (result.kind !== "fenced") throw new Error("setup fence failed");
    return { requestId, attemptId: result.attemptId, chart: name, database };
  }
  const settle = (requestId: string, attemptId: string, settlement: Parameters<ReturnType<typeof createFreeAiSettlementService>["settle"]>[0]["settlement"], database = db()) =>
    createFreeAiSettlementService(database).settle({ requestId, attemptId, settlement });
  const budgets = async () => (await h.raw`SELECT coalesce(sum(reserved_micro_vnd),0)::text r, coalesce(sum(resolved_micro_vnd),0)::text s, coalesce(sum(unknown_micro_vnd),0)::text u FROM free_ai_chart_budgets`)[0]!;
  const dayBudgets = async () => (await h.raw`SELECT coalesce(sum(reserved_micro_vnd),0)::text r, coalesce(sum(resolved_micro_vnd),0)::text s, coalesce(sum(unknown_micro_vnd),0)::text u FROM free_ai_daily_budgets`)[0]!;
  const status = async (id: string) => (await h.raw`SELECT status, settled_at FROM free_ai_requests WHERE id=${id}`)[0]!;

  it("charges the true cost, releases the unused remainder and leaves a publishable request for B11", async () => {
    const f = await fenced(VND(1000));
    expect(await settle(f.requestId, f.attemptId, { kind: "resolved", actualMicroVnd: VND(380), disposition: "publishable" })).toMatchObject({ kind: "settled", status: "dispatching", overshootMicroVnd: 0n });
    for (const totals of [await budgets(), await dayBudgets()]) expect(totals).toEqual({ r: "0", s: VND(380).toString(), u: "0" });
    expect((await status(f.requestId)).settled_at).not.toBeNull();
  });

  it("row 23: a quality failure is still charged and the rolling quota stays consumed", async () => {
    const f = await fenced(VND(1000), { actorId: "guest-q", kind: "guest" });
    expect(await settle(f.requestId, f.attemptId, { kind: "resolved", actualMicroVnd: VND(450), disposition: "failed" })).toMatchObject({ kind: "settled", status: "terminal_failure" });
    expect(await budgets()).toEqual({ r: "0", s: VND(450).toString(), u: "0" });
    await expect(admitRequest(db(), `s-next-${++seq}`, { actorId: "guest-q", kind: "guest" })).rejects.toThrow(/quota_exhausted/);
  });

  it("row 21: a duplicate settlement callback is idempotent and moves no money", async () => {
    const f = await fenced(VND(1000));
    const outcome = { kind: "resolved", actualMicroVnd: VND(300), disposition: "publishable" } as const;
    expect((await settle(f.requestId, f.attemptId, outcome)).kind).toBe("settled");
    const before = [await budgets(), await dayBudgets()];
    expect(await settle(f.requestId, f.attemptId, outcome)).toEqual({ kind: "duplicate", outcome: "resolved" });
    expect(await settle(f.requestId, f.attemptId, { kind: "unknown" })).toEqual({ kind: "duplicate", outcome: "resolved" });
    expect([await budgets(), await dayBudgets()]).toEqual(before);
    expect(await settle(f.requestId, "123e4567-e89b-42d3-a456-426614174055", outcome)).toEqual({ kind: "attempt_mismatch" });
  });

  it("row 21: simultaneous duplicate callbacks settle exactly once", async () => {
    const f = await fenced(VND(1000));
    const results = await raceBehindLock(h.rawClient(), [0, 1, 2].map(() => () => settle(f.requestId, f.attemptId, { kind: "resolved", actualMicroVnd: VND(200), disposition: "publishable" }, h.connect())));
    expect(results.map((r) => r.kind).sort()).toEqual(["duplicate", "duplicate", "settled"]);
    expect(await budgets()).toEqual({ r: "0", s: VND(200).toString(), u: "0" });
    expect(Number((await h.raw`SELECT count(*)::int AS n FROM free_ai_settlements`)[0]!.n)).toBe(1);
  });

  it("row 22: an unknown outcome retains the whole hold as exposure, blocks ready, and still counts toward the ceilings", async () => {
    const f = await fenced(VND(1000));
    expect(await settle(f.requestId, f.attemptId, { kind: "unknown" })).toMatchObject({ kind: "settled", status: "cost_unknown" });
    expect(await budgets()).toEqual({ r: "0", s: "0", u: VND(1000).toString() });
    expect(await dayBudgets()).toEqual({ r: "0", s: "0", u: VND(1000).toString() });
    const [settlement] = await h.raw`SELECT outcome, actual_micro_vnd FROM free_ai_settlements`;
    expect(settlement).toMatchObject({ outcome: "unknown", actual_micro_vnd: null });
    await h.raw`UPDATE free_ai_daily_budgets SET unknown_micro_vnd = unknown_micro_vnd + ${VND(48500).toString()}`;
    await expect(admitRequest(db(), `s-extra-${++seq}`, { bound: VND(600) })).rejects.toThrow(/daily_budget_exhausted/);
  });

  it("row 20: a dispatch spanning midnight settles against the pinned dispatch day", async () => {
    let now = new Date("2026-10-03T23:58:00Z");
    const clock = async () => now;
    const f = await fenced(VND(1000), { clock });
    now = new Date("2026-10-04T00:40:00Z");
    expect((await createFreeAiSettlementService(db()).settle({ requestId: f.requestId, attemptId: f.attemptId, clock, settlement: { kind: "resolved", actualMicroVnd: VND(250), disposition: "publishable" } })).kind).toBe("settled");
    const days = await h.raw`SELECT utc_day::text AS d, reserved_micro_vnd::text r, resolved_micro_vnd::text s FROM free_ai_daily_budgets ORDER BY utc_day`;
    expect(days.map((d) => [d.d, d.r, d.s])).toEqual([["2026-10-03", "0", VND(250).toString()]]);
  });

  it("an in-flight hold from yesterday counts once against today's gate until it settles", async () => {
    let now = new Date("2026-10-03T23:58:00Z");
    const clock = async () => now;
    const f = await fenced(VND(2900), { clock });
    now = new Date("2026-10-04T00:10:00Z");
    await h.raw`INSERT INTO free_ai_daily_budgets(utc_day,reserved_micro_vnd) VALUES ('2026-10-04',${VND(47000).toString()})`;
    await expect(admitRequest(db(), `s-today-${++seq}`, { bound: VND(500), clock })).rejects.toThrow(/daily_budget_exhausted/);
    await settle(f.requestId, f.attemptId, { kind: "resolved", actualMicroVnd: VND(100), disposition: "publishable" });
    await expect(admitRequest(db(), `s-today-${++seq}`, { bound: VND(500), clock })).resolves.toBeTruthy();
  });

  it("row 24: an overshoot records the true cost uncapped, halts free dispatch and leaves a redacted incident", async () => {
    const f = await fenced(VND(1000));
    const other = await admitRequest(db(), `s-other-${++seq}`);
    expect(await settle(f.requestId, f.attemptId, { kind: "resolved", actualMicroVnd: VND(1750), disposition: "publishable" })).toMatchObject({ kind: "settled", overshootMicroVnd: VND(750) });
    expect(await budgets()).toEqual({ r: VND(1000).toString(), s: VND(1750).toString(), u: "0" }); // other request's hold + uncapped actual
    const [incident] = await h.raw`SELECT action, metadata FROM audit_logs WHERE action='free_ai.overshoot'`;
    expect(incident!.metadata).toMatchObject({ overshootMicroVnd: VND(750).toString(), actualMicroVnd: VND(1750).toString() });
    expect(JSON.stringify(incident!.metadata)).not.toMatch(/prompt|palace|birth/i);
    await expect(admitRequest(db(), `s-blocked-${++seq}`)).rejects.toThrow(/dispatch_halted/);
    expect(await createFreeAiDispatchService(db()).fence(fenceInput(other))).toEqual({ kind: "dispatch_halted" });
    await createFreeAiSettlementService(db()).acknowledgeOvershoot({ requestId: f.requestId, actorId: "owner" });
    expect((await createFreeAiDispatchService(db()).fence(fenceInput(other))).kind).toBe("fenced");
  });

  it("self-recovers a crash between fence and settlement as unknown exposure, once, never as a retry", async () => {
    const f = await fenced(VND(1000));
    const unfenced = await admitRequest(db(), `s-unfenced-${++seq}`);
    await h.raw`UPDATE free_ai_requests SET fenced_at = now() - interval '2 hours' WHERE id=${f.requestId}`;
    const service = createFreeAiSettlementService(db());
    expect(await service.settleAbandoned({ staleAfterMs: 3_600_000, limit: 10 })).toBe(1);
    expect(await service.settleAbandoned({ staleAfterMs: 3_600_000, limit: 10 })).toBe(0);
    expect((await status(f.requestId)).status).toBe("cost_unknown");
    expect((await status(unfenced)).status).toBe("reserved");
    expect(await budgets()).toEqual({ r: VND(1000).toString(), s: "0", u: VND(1000).toString() });
  });

  it("refuses to settle a request that was never fenced", async () => {
    const id = await admitRequest(db(), `s-nofence-${++seq}`);
    expect(await settle(id, "123e4567-e89b-42d3-a456-426614174077", { kind: "unknown" })).toEqual({ kind: "not_fenced" });
    expect(await settle("123e4567-e89b-42d3-a456-426614174078", "123e4567-e89b-42d3-a456-426614174077", { kind: "unknown" })).toEqual({ kind: "not_found" });
  });
});
