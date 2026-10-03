import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FreePalaceGiftFrozenCallV1 } from "../../packages/contracts/src/index.js";
import { createFreeAiBudgetRepository, readDailyGateTotal } from "../../packages/backend/src/ziwei/free-ai-budget.repository.js";
import { createFreeAiDispatchService, type FreeAiFenceInput } from "../../packages/backend/src/ziwei/free-ai-dispatch.service.js";
import type { FreeAiAttemptSettlement } from "../../packages/backend/src/ziwei/free-ai-settlement.service.js";
import { MICRO, admitRequest, costContext, lineage, raceBehindLock, startFreeAiDatabase } from "./free-ai-test-harness.js";

type Harness = Awaited<ReturnType<typeof startFreeAiDatabase>>;
const VND = (n: number) => BigInt(n) * MICRO;
const TABLES = ["outbox", "free_ai_artifacts", "free_ai_settlements", "free_ai_admissions", "free_ai_requests", "free_ai_quota_aliases", "free_ai_quota_subjects", "free_ai_daily_budgets", "free_ai_chart_budgets", "audit_logs"];

describe("free AI dispatch fence (real Postgres)", () => {
  let h: Harness;
  let seq = 0;
  beforeAll(async () => { h = await startFreeAiDatabase(); }, 180000);
  afterAll(async () => { if (h) await h.stop(); });
  beforeEach(async () => { for (const table of TABLES) await h.raw.unsafe(`DELETE FROM ${table}`); });

  const fenceInput = (requestId: string, over: Partial<FreeAiFenceInput> = {}): FreeAiFenceInput => ({
    requestId, flagEnabled: true, isSourceAvailable: async () => true, activePricingSnapshotId: async () => "price-1", ...over,
  });
  // A fake provider whose physical attempts are counted: the only honest proof of "exactly one".
  const provider = (behaviour: "ok" | "throw" = "ok") => {
    const attempts: Array<{ attemptId: string; call: FreePalaceGiftFrozenCallV1 }> = [];
    const send = async (call: FreePalaceGiftFrozenCallV1, attemptId: string): Promise<FreeAiAttemptSettlement> => {
      attempts.push({ attemptId, call });
      if (behaviour === "throw") throw new Error("socket hang up");
      return { kind: "resolved", actualMicroVnd: VND(400), disposition: "publishable" };
    };
    return { attempts, send };
  };
  const row = async (id: string) => (await h.raw`SELECT status, attempt_id, dispatch_day::text AS dispatch_day, admission_day::text AS admission_day, fenced_at FROM free_ai_requests WHERE id=${id}`)[0]!;
  const sumReserved = async () => BigInt((await h.raw`SELECT coalesce(sum(reserved_micro_vnd),0)::text AS s FROM free_ai_daily_budgets`)[0]!.s);
  const chart = () => `d-${++seq}`;

  it("pins dispatch day, attempt id and fence in one transaction and returns the persisted call", async () => {
    const db = h.connect();
    const id = await admitRequest(db, chart(), { bound: VND(900) });
    const result = await createFreeAiDispatchService(db).fence(fenceInput(id));
    expect(result).toMatchObject({ kind: "fenced", reservedMicroVnd: VND(900) });
    const request = await row(id);
    expect(request).toMatchObject({ status: "dispatching" });
    expect(request.fenced_at).not.toBeNull();
    expect(request.dispatch_day).toBe(request.admission_day);
    if (result.kind === "fenced") expect(result.call).toMatchObject({ requestId: id, reservedMicroVnd: VND(900).toString() });
  });

  it("row 16: two workers racing on one request cross the fence once and send exactly one physical attempt", async () => {
    const db = h.connect();
    const id = await admitRequest(db, chart());
    const fake = provider();
    const results = await raceBehindLock(h.rawClient(), [0, 1, 2].map(() => () => createFreeAiDispatchService(h.connect()).dispatch({ ...fenceInput(id), send: fake.send })));
    expect(results.map((r) => r.kind).sort()).toEqual(["already_fenced", "already_fenced", "fenced"]);
    expect(fake.attempts).toHaveLength(1);
  });

  it("row 17: a crash after the fence but before the HTTP call never sends on redelivery and burns the slot", async () => {
    const db = h.connect();
    const name = chart();
    const id = await admitRequest(db, name);
    const service = createFreeAiDispatchService(db);
    expect((await service.fence(fenceInput(id))).kind).toBe("fenced"); // ... and the worker dies here
    const fake = provider();
    for (let redelivery = 0; redelivery < 3; redelivery += 1) {
      expect(await service.dispatch({ ...fenceInput(id), send: fake.send })).toMatchObject({ kind: "already_fenced", status: "dispatching" });
    }
    expect(fake.attempts).toHaveLength(0);
    const again = await createFreeAiBudgetRepository(db).reserve({
      flagEnabled: true, actor: { kind: "account", id: "someone", trusted: true }, lineage: lineage(name), concern: null,
      cost: costContext(VND(1000)), traceId: "t", authorizeSource: async () => ({ expiresAt: null }),
    });
    expect(again.kind).toBe("fallback");
  });

  it("row 18: lease expiry, restart and transport failure never authorize a second physical attempt", async () => {
    const db = h.connect();
    const id = await admitRequest(db, chart());
    const service = createFreeAiDispatchService(db);
    const fake = provider("throw");
    const first = await service.dispatch({ ...fenceInput(id), send: fake.send });
    expect(first).toMatchObject({ kind: "fenced", settlement: { kind: "settled", status: "cost_unknown" } });
    for (let i = 0; i < 3; i += 1) {
      const replay = await createFreeAiDispatchService(h.connect()).dispatch({ ...fenceInput(id), send: fake.send });
      expect(["already_fenced", "not_dispatchable"]).toContain(replay.kind);
    }
    expect(fake.attempts).toHaveLength(1);
  });

  it("row 19: a lock wait that crosses midnight fences against the day sampled after the wait", async () => {
    let now = new Date("2026-10-03T23:59:30Z");
    const clock = async () => now;
    const db = h.connect();
    const id = await admitRequest(db, chart(), { bound: VND(700), clock });
    expect((await row(id)).admission_day).toBe("2026-10-03");
    const [result] = await raceBehindLock(h.rawClient(), [() => {
      const pending = createFreeAiDispatchService(h.connect()).fence(fenceInput(id, { clock }));
      now = new Date("2026-10-04T00:00:20Z"); // midnight passes while the fence waits on the lock
      return pending;
    }]);
    expect(result).toMatchObject({ kind: "fenced", dispatchDay: "2026-10-04" });
    const days = await h.raw`SELECT utc_day::text AS d, reserved_micro_vnd::text AS r FROM free_ai_daily_budgets ORDER BY utc_day`;
    expect(days.map((d) => [d.d, d.r])).toEqual([["2026-10-03", "0"], ["2026-10-04", VND(700).toString()]]);
    expect(await sumReserved()).toBe(VND(700)); // moved, never double counted
  });

  it("an admission that waits across midnight is judged against the new day", async () => {
    let now = new Date("2026-10-03T23:59:50Z");
    const clock = async () => now;
    const [id] = await raceBehindLock(h.rawClient(), [() => {
      const pending = admitRequest(h.connect(), chart(), { clock });
      now = new Date("2026-10-04T00:00:10Z");
      return pending;
    }]);
    expect((await row(id!)).admission_day).toBe("2026-10-04");
  });

  it("a queued request whose new day cannot hold it is cancelled and its hold fully released", async () => {
    let now = new Date("2026-10-03T12:00:00Z");
    const clock = async () => now;
    const db = h.connect();
    const id = await admitRequest(db, chart(), { bound: VND(1000), clock });
    await h.raw`INSERT INTO free_ai_daily_budgets(utc_day,unknown_micro_vnd) VALUES ('2026-10-04',${VND(49500).toString()})`;
    now = new Date("2026-10-04T01:00:00Z");
    expect(await createFreeAiDispatchService(db).fence(fenceInput(id, { clock }))).toEqual({ kind: "cancelled", reason: "daily_budget_exhausted" });
    expect((await row(id)).status).toBe("cancelled");
    expect(await sumReserved()).toBe(0n);
    expect((await h.raw`SELECT reserved_micro_vnd::text AS r FROM free_ai_chart_budgets`)[0]!.r).toBe("0");
  });

  it("unresolved exposure from an earlier day stays in today's gate and is not discarded at midnight", async () => {
    await h.raw`INSERT INTO free_ai_daily_budgets(utc_day,unknown_micro_vnd,reserved_micro_vnd) VALUES ('2026-10-03',${VND(30000).toString()},${VND(19500).toString()})`;
    const clock = async () => new Date("2026-10-04T00:30:00Z");
    await expect(admitRequest(h.connect(), chart(), { bound: VND(1000), clock })).rejects.toThrow(/daily_budget_exhausted/);
    await h.raw`UPDATE free_ai_daily_budgets SET reserved_micro_vnd=0`;
    await expect(admitRequest(h.connect(), chart(), { bound: VND(1000), clock })).resolves.toBeTruthy();
    const total = await h.connect().transaction((tx) => readDailyGateTotal(tx, "2026-10-04"));
    expect(total).toBe(VND(31000));
  });

  it("row 25: a changed pricing snapshot cancels instead of silently re-pricing, and releases the hold", async () => {
    const db = h.connect();
    const id = await admitRequest(db, chart());
    expect(await createFreeAiDispatchService(db).fence(fenceInput(id, { activePricingSnapshotId: async () => "price-2" }))).toEqual({ kind: "cancelled", reason: "pricing_changed" });
    expect(await createFreeAiDispatchService(db).fence(fenceInput(id, { activePricingSnapshotId: async () => null }))).toMatchObject({ kind: "not_dispatchable", status: "cancelled" });
    expect(await sumReserved()).toBe(0n);
  });

  it("cancels, with proof of no fence, when the source is gone or the deletion generation moved", async () => {
    const db = h.connect();
    const gone = await admitRequest(db, chart());
    expect(await createFreeAiDispatchService(db).fence(fenceInput(gone, { isSourceAvailable: async () => false }))).toEqual({ kind: "cancelled", reason: "source_unavailable" });
    const deleted = await admitRequest(db, chart());
    await h.raw`UPDATE free_ai_chart_budgets SET deletion_generation = deletion_generation + 1 WHERE chart_version_id = (SELECT chart_version_id FROM free_ai_requests WHERE id=${deleted})`;
    expect(await createFreeAiDispatchService(db).fence(fenceInput(deleted))).toEqual({ kind: "cancelled", reason: "deleted" });
    expect(await sumReserved()).toBe(0n);
  });

  it("flag off prohibits fencing and leaves the request reserved with its hold", async () => {
    const db = h.connect();
    const id = await admitRequest(db, chart(), { bound: VND(500) });
    expect(await createFreeAiDispatchService(db).fence(fenceInput(id, { flagEnabled: false }))).toEqual({ kind: "flag_disabled" });
    expect((await row(id)).status).toBe("reserved");
    expect(await sumReserved()).toBe(VND(500));
  });

  it("an unknown request id is reported, not fenced", async () => {
    expect(await createFreeAiDispatchService(h.connect()).fence(fenceInput("123e4567-e89b-42d3-a456-426614174099"))).toEqual({ kind: "not_found" });
  });
});
