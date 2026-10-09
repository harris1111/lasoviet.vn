import assert from "node:assert/strict";
import { test } from "node:test";
import { EventEmitter } from "node:events";
import { createHash } from "node:crypto";
import { PassThrough, Readable } from "node:stream";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createCampaignBudget } from "./lib/campaign-budget.mjs";
import { runBridge, dispatchOnce } from "./lib/prod-9router-child.mjs";
import { runProdRouterAttempt, paidTrialAttemptKey, conservativeTrialReserve } from "./lib/prod-9router-attempt.mjs";
import { makePaidTrialInput, assertTrialResume, runTrialSequence } from "./run-paid-manual-trials.mjs";

const now = () => new Date("2026-10-09T12:00:00Z");
const trace = { requestedAlias: "ag/gemini-3.8-flash", wireModel: "gemini-3.8-flash-medium",
  requestId: "agent/11111111-1111-4111-a111-111111111111/1791547200000/22222222-2222-4222-a222-222222222222/1",
  effectiveMaxOutputTokens: 16384, requestSha256: "a".repeat(64) };
const bounds = { inputTokens: 1048576, outputTokens: 65536, reasoningTokens: 65536 };
const prepared = { trace, bounds, expiresAtMs: Date.parse("2026-10-10T00:00:00Z") };
const result = () => ({ type: "result", outputText: '{"synthetic":true}', conflictingUsage: false,
  receipt: { modelVersion: "gemini-3.8-flash-medium", usageMetadata: { promptTokenCount: 100,
    candidatesTokenCount: 50, cachedContentTokenCount: 20, thoughtsTokenCount: 30, totalTokenCount: 180 } } });
function fresh() {
  const ledgerPath = join(mkdtempSync(join(tmpdir(), "fd121-ledger-")), "ledger.jsonl");
  const options = { ledgerPath, totalCapVnd: 180000, allocationsVnd: { "v4.2-report": 180000 }, settleActualUsage: true, now };
  return { ledgerPath, options, budget: createCampaignBudget(options) };
}
function childFactory({ reply = result(), onAck = () => {}, preparedValue = prepared } = {}) {
  let physical = 0;
  return { physical: () => physical, factory() {
    const child = new EventEmitter(); child.stdin = new PassThrough(); child.stdout = new PassThrough();
    child.kill = () => { child.stdin.destroy(); child.stdout.end(); };
    let buffer = "", stage = 0;
    child.stdin.on("data", data => {
      buffer += data.toString();
      let split;
      while ((split = buffer.indexOf("\n")) >= 0) {
        const line = JSON.parse(buffer.slice(0, split)); buffer = buffer.slice(split + 1);
        if (!stage++) child.stdout.write(JSON.stringify({ type: "prepared", ...preparedValue }) + "\n");
        else { assert.equal(line.type, "dispatch"); onAck(); physical++; child.stdout.end(JSON.stringify(reply) + "\n"); }
      }
    });
    return child;
  } };
}
const attempt = (budget, processFactory, slot = "relationship_marriage:0", extra = {}) => runProdRouterAttempt({
  system: "synthetic", user: "synthetic", maxOutputTokens: 14000, budget, now, processFactory,
  attemptKey: paidTrialAttemptKey(slot, "report"), ...extra,
});

test("FD121 actual settlement releases only verified unused reservation and replays it", async () => {
  const { budget, options, ledgerPath } = fresh();
  const fixture = childFactory({ onAck: () => { assert.equal(budget.status().openReservations, 1); assert.ok(budget.status().totalVnd >= conservativeTrialReserve(bounds, now())); } });
  const value = await attempt(budget, () => fixture.factory());
  assert.equal(value.quote.quoteVnd, "10"); assert.equal(fixture.physical(), 1);
  assert.equal(budget.status().totalVnd, 10);
  assert.deepEqual(createCampaignBudget(options).status(), budget.status());
  assert.throws(() => createCampaignBudget({ ...options, settleActualUsage: false }).status(), { code: "BUDGET_LEDGER_CONFIG_MISMATCH" });
  await assert.rejects(attempt(budget, () => fixture.factory()), { code: "BUDGET_ATTEMPT_ALREADY_CLAIMED" });
  assert.equal(fixture.physical(), 1);
  const journal = readFileSync(ledgerPath, "utf8"); assert.ok(!journal.includes("synthetic"));
  for (let i = 1; i < 10; i++) await attempt(budget, () => fixture.factory(), `slot:${i}`);
  assert.equal(fixture.physical(), 10); assert.equal(budget.status().totalVnd, 100);
});
test("missing zero counter preserves full unknown exposure and fences the next report", async () => {
  const { budget, options } = fresh(), bad = result(); delete bad.receipt.usageMetadata.cachedContentTokenCount;
  const fixture = childFactory({ reply: bad });
  await assert.rejects(attempt(budget, () => fixture.factory()), { code: "NATIVE_API_PRICING_USAGE_UNVERIFIED" });
  assert.equal(budget.status().openReservations, 1); assert.equal(budget.status().totalVnd, conservativeTrialReserve(bounds, now()));
  await assert.rejects(attempt(createCampaignBudget(options), () => fixture.factory(), "career_wealth:0"), { code: "BUDGET_ATTEMPT_UNRESOLVED" });
  assert.equal(fixture.physical(), 1);
});
test("checkpoint failure and wire mismatch cannot acknowledge dispatch", async () => {
  const { budget } = fresh(); const fixture = childFactory();
  await assert.rejects(attempt(budget, () => fixture.factory(), undefined, { onPrepared: () => { throw new Error("checkpoint failure"); } }));
  assert.equal(fixture.physical(), 0); assert.equal(budget.status().totalVnd, 0);
  const wrong = childFactory({ preparedValue: { ...prepared, trace: { ...trace, wireModel: "another-model" } } });
  await assert.rejects(attempt(budget, () => wrong.factory()), { code: "ROUTER_PREPARE_UNVERIFIED" }); assert.equal(wrong.physical(), 0);
});
test("exhausted aggregate cap stops before the second physical send", async () => {
  const { budget } = fresh(); budget.reserve("v4.2-report", 160000); const fixture = childFactory();
  await assert.rejects(attempt(budget, () => fixture.factory()), { code: "BUDGET_TOTAL_CAP_REACHED" });
  assert.equal(fixture.physical(), 0);
});
test("child protocol preserves one prepared object and requires exact acknowledgment", async () => {
  for (const acknowledge of [true, false]) {
    const input = new PassThrough(), output = []; let sends = 0;
    const promise = runBridge({ input, prepare: async () => prepared, send: async p => { assert.equal(p, prepared); sends++; return result(); },
      emit: row => { output.push(row); if (row.type === "prepared") input.end(JSON.stringify({ type: "dispatch", requestSha256: acknowledge ? trace.requestSha256 : "b".repeat(64) }) + "\n"); } });
    input.write(JSON.stringify({ system: "synthetic", user: "synthetic", maxOutputTokens: 16384 }) + "\n");
    await promise; assert.equal(sends, acknowledge ? 1 : 0);
    assert.equal(output.at(-1).type, acknowledge ? "result" : "failure");
  }
});
test("child errors never echo credential-bearing exception text", async () => {
  const rows = [];
  await runBridge({ input: Readable.from(['{}\n']), emit: r => rows.push(r), prepare: async () => { throw new Error("SYNTHETIC_SECRET_ACCESS_TOKEN"); } });
  assert.deepEqual(rows, [{ type: "failure", code: "ROUTER_BRIDGE_FAILED" }]);
});
test("expired immutable body and endpoint fail before constructing HTTPS", async () => {
  let sends = 0;
  await assert.rejects(dispatchOnce({ ...prepared, endpoint: "https://example.org", body: "{}", headers: {} }, { now, requestImpl: () => sends++ }), { code: "ROUTER_DISPATCH_INVALID" });
  assert.equal(sends, 0);
});

test("single native HTTPS dispatch strips thought text and never retries errors or redirects", async () => {
  const body = "{}", requestSha256 = createHash("sha256").update(body).digest("hex");
  const nativePrepared = { ...prepared, body, endpoint: "https://daily-cloudcode-pa.googleapis.com/v1internal:generateContent",
    headers: { Authorization: "Bearer SYNTHETIC_TOKEN" }, trace: { ...trace, requestSha256 } };
  for (const status of [200, 301, 429, 503]) {
    let sends = 0;
    const requestImpl = (url, options, callback) => {
      sends++; assert.equal(url, nativePrepared.endpoint); assert.equal(options.rejectUnauthorized, true); assert.equal(options.agent, false);
      const req = new EventEmitter(); req.destroy = () => {};
      req.end = sent => {
        assert.equal(sent, body);
        const response = Readable.from([Buffer.from(JSON.stringify({ response: { modelVersion: "gemini-3.8-flash-medium", usageMetadata: result().receipt.usageMetadata,
          candidates: [{ finishReason: "STOP", content: { role: "model", parts: [{ text: "SYNTHETIC_PRIVATE_THOUGHT", thought: true }, { text: '{"synthetic":true}' }] } }] } }))]);
        response.statusCode = status; callback(response);
      };
      return req;
    };
    if (status === 200) {
      const response = await dispatchOnce(nativePrepared, { requestImpl, now });
      assert.equal(response.outputText, '{"synthetic":true}'); assert.ok(!JSON.stringify(response).includes("SYNTHETIC_PRIVATE_THOUGHT"));
      assert.ok(!JSON.stringify(response).includes("SYNTHETIC_TOKEN"));
    } else await assert.rejects(dispatchOnce(nativePrepared, { requestImpl, now }), { code: "ROUTER_HTTP_STATUS", httpStatus: status });
    assert.equal(sends, 1);
  }
});

test("report sequence checkpoints before generation and stops on first failed quality", async () => {
  const manifest = { campaign: "FD121-paid-manual-trials-v1", status: "running", reports: [] }, checkpoints = [];
  let calls = 0;
  await runTrialSequence({ inputs: [{ group: "monthly", index: 0, facts: {} }, { group: "monthly", index: 1, facts: {} }], manifest,
    save: value => checkpoints.push(structuredClone(value)), generate: async () => {
      assert.equal(checkpoints.at(-1).reports[0].status, "prepared"); calls++;
      return { ok: true, value: { quality: { ok: false, findings: ["SYNTHETIC_QUALITY_FAILURE"] } } };
    } });
  assert.equal(calls, 1); assert.equal(manifest.status, "stopped");
  assert.throws(() => assertTrialResume(manifest), { code: "PAID_TRIAL_RESTART_REQUIRES_RECONCILIATION" });
});

test("crash after settled receipt but before result checkpoint blocks automatic restart", async () => {
  const manifest = { campaign: "FD121-paid-manual-trials-v1", status: "running", reports: [] }; let checkpoint;
  await assert.rejects(runTrialSequence({ inputs: [{ group: "monthly", index: 0, facts: {} }], manifest,
    save: value => { checkpoint = structuredClone(value); }, generate: async (_input, row) => {
      row.attempts.push({ status: "settled", outputSha256: "a".repeat(64) }); checkpoint = structuredClone(manifest);
      throw new Error("SYNTHETIC_CRASH_AFTER_SETTLEMENT");
    } }));
  assert.equal(checkpoint.reports[0].attempts[0].status, "settled");
  assert.throws(() => assertTrialResume(checkpoint), { code: "PAID_TRIAL_RESTART_REQUIRES_RECONCILIATION" });
});

test("actual engine uses current/next lunar years with stable distinct source identity across Tet", async () => {
  const modules = { backend: await import("../packages/backend/dist/index.js"), contracts: await import("../packages/contracts/dist/index.js"), engine: await import("../packages/engine-adapters/dist/index.js") };
  const current = await makePaidTrialInput("current_annual", 0, "2027-01-15", modules);
  const next = await makePaidTrialInput("next_annual", 0, "2027-01-15", modules);
  const replay = await makePaidTrialInput("current_annual", 0, "2027-01-15", modules);
  assert.equal(current.targetYear, 2026); assert.equal(next.targetYear, 2027);
  assert.equal(current.facts.targetYear, 2026); assert.equal(next.facts.targetYear, 2027);
  assert.notEqual(current.facts.periodKey, next.facts.periodKey);
  assert.deepEqual(current, replay); assert.notEqual(current.snapshotHash, next.snapshotHash);
});
