import assert from "node:assert/strict";
import { test } from "node:test";
import { runPeriodCampaign } from "./verify-period-reading-real-generations.mjs";
const makeInput = async (kindId, index) => ({ kindId, facts: { chartVersionId: `chart-${index}` } });
const good = async () => ({ ok: true, value: { quality: { ok: true }, content: { text: "synthetic output, not acceptance" }, providerId: "fixture", modelId: "fixture" } });
test("stops immediately on provider failure and never awards acceptance", async () => {
  let calls = 0;
  const snapshots = [];
  const result = await runPeriodCampaign({ selectedPeriods: ["monthly", "annual"], runs: 20, makeInput,
    generate: async () => ++calls === 3 ? { ok: false, error: { code: "AI_TIMEOUT" } } : good(), record: async rows => snapshots.push(rows.length) });
  assert.equal(calls, 3); assert.equal(result.status, "failed"); assert.deepEqual(result.acceptedPeriods, []); assert.deepEqual(snapshots, [1, 2, 3]);
});
test("quality failure is not counted as a successful provider response", async () => {
  const result = await runPeriodCampaign({ selectedPeriods: ["annual"], runs: 20, makeInput,
    generate: async () => ({ ok: true, value: { quality: { ok: false }, content: {}, providerId: "fixture", modelId: "fixture" } }), record: async () => {} });
  assert.equal(result.status, "failed"); assert.equal(result.evidence.length, 1);
});
test("two successful samples still require owner manual acceptance", async () => {
  const result = await runPeriodCampaign({ selectedPeriods: ["annual"], runs: 2, makeInput, generate: good, record: async () => {} });
  assert.equal(result.status, "diagnostic"); assert.deepEqual(result.acceptedPeriods, []);
});
test("twenty-run historical diagnostics no longer award automatic period acceptance", async () => {
  const result = await runPeriodCampaign({ selectedPeriods: ["monthly", "annual"], runs: 20, makeInput, generate: good, record: async () => {} });
  assert.equal(result.status, "diagnostic"); assert.equal(result.evidence.length, 40);
  assert.deepEqual(result.acceptedPeriods, []);
  for (const topic of ["monthly", "annual"]) assert.equal(new Set(result.evidence.filter(row => row.kindId === topic).map(row => row.chartVersionId)).size, 20);
});
