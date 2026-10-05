import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { createCampaignBudget, withBudget, TOTAL_CAP_VND, DEFAULT_ALLOCATIONS_VND } from "./lib/campaign-budget.mjs";

const fresh = (opts = {}) => {
  const dir = mkdtempSync(join(tmpdir(), "budget-"));
  return { budget: createCampaignBudget({ ledgerPath: join(dir, "ledger.jsonl"), ...opts }), cleanup: () => rmSync(dir, { recursive: true, force: true }) };
};

test("allocations never exceed the owner-approved total cap", () => {
  assert.ok(Object.values(DEFAULT_ALLOCATIONS_VND).reduce((a, b) => a + b, 0) <= TOTAL_CAP_VND);
});

test("reservation is refused before the cap is exceeded, never after", () => {
  const { budget, cleanup } = fresh({ totalCapVnd: 10_000, allocationsVnd: { a: 8_000, b: 8_000 } });
  budget.reserve("a", 6_000);
  assert.throws(() => budget.reserve("a", 3_000), { code: "BUDGET_CAMPAIGN_CAP_REACHED" });
  assert.throws(() => budget.reserve("b", 5_000), { code: "BUDGET_TOTAL_CAP_REACHED" });
  budget.reserve("b", 4_000);
  assert.equal(budget.status().totalVnd, 10_000);
  cleanup();
});

test("settled and crashed reservations stay charged; only release refunds", () => {
  const { budget, cleanup } = fresh({ totalCapVnd: 5_000, allocationsVnd: { a: 5_000 } });
  const sent = budget.reserve("a", 2_000); budget.settle(sent);
  budget.reserve("a", 1_000); // never settled: process crashed after send, fail closed
  const unsent = budget.reserve("a", 2_000); budget.release(unsent);
  assert.equal(budget.status().totalVnd, 3_000);
  assert.equal(budget.status().openReservations, 1);
  cleanup();
});

test("unknown campaign and invalid amounts are rejected", () => {
  const { budget, cleanup } = fresh();
  assert.throws(() => budget.reserve("nope", 100), { code: "BUDGET_CAMPAIGN_UNKNOWN" });
  assert.throws(() => budget.reserve("daily-reading", 0), { code: "BUDGET_RESERVATION_INVALID" });
  assert.throws(() => budget.reserve("daily-reading", 1.5), { code: "BUDGET_RESERVATION_INVALID" });
  cleanup();
});

test("withBudget reserves worst case before the provider call and keeps the charge when the call fails", async () => {
  const { budget, cleanup } = fresh({ totalCapVnd: 4_000, allocationsVnd: { a: 4_000 } });
  let calls = 0;
  const generate = withBudget(budget, "a", { perCallVnd: 1_000, maxCalls: 2 }, async () => { calls++; if (calls === 1) throw new Error("provider down"); return "ok"; });
  await assert.rejects(generate({}), /provider down/);
  assert.equal(budget.status().totalVnd, 2_000);
  assert.equal(await generate({}), "ok");
  await assert.rejects(generate({}), { code: "BUDGET_TOTAL_CAP_REACHED" });
  assert.equal(calls, 2, "provider is not contacted once the cap is reached");
  cleanup();
});
