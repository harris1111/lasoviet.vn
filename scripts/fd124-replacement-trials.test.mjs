import assert from "node:assert/strict";
import { test } from "node:test";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, symlinkSync, linkSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EventEmitter } from "node:events";
import { Readable, PassThrough } from "node:stream";
import { createCampaignBudget } from "./lib/campaign-budget.mjs";
import { FD123_POLICY, FD123_TECHNICAL_CAP_VND, FD123_MODEL_BOUND_MODE, fd123AttemptKey } from "./lib/fd123-reference-continuation.mjs";
import { FD124_POLICY, FD124_SLOTS, FD124_RESERVE_VND, FD124_TECHNICAL_CAP_VND, FD124_OUTPUT_TOKENS, fd124AttemptKey, isFd124AttemptKey } from "./lib/fd124-replacement-trials.mjs";
import { API_REFERENCE_PRICING } from "./lib/native-campaign-api-pricing.mjs";
import { runProdRouterAttempt } from "./lib/prod-9router-attempt.mjs";
import { makePaidTrialInput, makeFreshPaidTrialInput } from "./run-paid-manual-trials.mjs";
import { captureNativeAccountingEvidence, parseNativeResponse, inspectNativeFailureDiagnostic, runBridge } from "./lib/prod-9router-child.mjs";
import { assertFd124Path, assertFd124Authorities, durableFd124Save, assertFd124FreshCampaign, assertFd124FrozenInputs, fd124Provider, runFd124Sequence } from "./run-replacement-paid-trials.mjs";

const now = () => new Date("2026-10-10T16:00:00Z");
const hash = value => createHash("sha256").update(value).digest("hex");
const trace = { pricingVersion: API_REFERENCE_PRICING.version, pricingSnapshotSha256: API_REFERENCE_PRICING.snapshotSha256,
  requestedAlias: "ag/gemini-3.8-flash", wireModel: "gemini-3.8-flash-medium",
  requestId: "agent/11111111-1111-4111-a111-111111111111/1791648000000/22222222-2222-4222-a222-222222222222/1",
  effectiveMaxOutputTokens: FD124_OUTPUT_TOKENS, requestSha256: "a".repeat(64) };
function fresh() {
  const ledgerPath = join(mkdtempSync(join(tmpdir(), "fd124-ledger-")), "ledger.jsonl");
  const options = { ledgerPath, totalCapVnd: FD124_TECHNICAL_CAP_VND, allocationsVnd: { "v4.2-report": FD124_TECHNICAL_CAP_VND },
    settleActualUsage: true, referenceContinuation: FD124_POLICY, now };
  return { ledgerPath, options, budget: createCampaignBudget(options) };
}
function payload(text = '{"synthetic":true}') {
  return { modelVersion: "gemini-3.8-flash-medium", usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 50, totalTokenCount: 150 },
    candidates: [{ finishReason: "STOP", content: { role: "model", parts: [{ text }] } }] };
}
function settle(budget, key) {
  const id = budget.reserveAttempt("v4.2-report", FD124_RESERVE_VND, { attemptKey: key, trace }); budget.markDispatched(id);
  const native = payload(), outputText = native.candidates[0].content.parts[0].text;
  const accountingEvidence = captureNativeAccountingEvidence(native, { requestSha256: trace.requestSha256, responseSha256: hash(JSON.stringify(native)), outputText });
  budget.settleAttempt(id, { receipt: { modelVersion: native.modelVersion, usageMetadata: native.usageMetadata }, outputSha256: hash(outputText), accountingEvidence, referenceMode: FD123_MODEL_BOUND_MODE });
  return id;
}
test("FD124 closed twelve-key cap, prerequisite, permanent replay claims and policy isolation", () => {
  const { budget, options, ledgerPath } = fresh(); budget.status();
  assert.equal(new Set(FD124_SLOTS.flatMap(slot => ["report", "rewrite"].map(purpose => fd124AttemptKey(slot, purpose)))).size, 12);
  assert.throws(() => fd124AttemptKey(FD124_SLOTS[0], "third"));
  assert.equal(isFd124AttemptKey(fd123AttemptKey("career_wealth:0", "report")), false);
  assert.throws(() => budget.reserveAttempt("v4.2-report", FD124_RESERVE_VND, { attemptKey: fd124AttemptKey(FD124_SLOTS[0], "rewrite"), trace }), { code: "BUDGET_ATTEMPT_INVALID" });
  assert.throws(() => budget.reserveAttempt("v4.2-report", FD124_RESERVE_VND, { attemptKey: fd124AttemptKey(FD124_SLOTS[0], "report"), trace: { ...trace, effectiveMaxOutputTokens: 16384 } }), { code: "BUDGET_ATTEMPT_INVALID" });
  assert.throws(() => budget.reserve("v4.2-report", FD124_RESERVE_VND), { code: "BUDGET_ATTEMPT_INVALID" });
  for (const slot of FD124_SLOTS) for (const purpose of ["report", "rewrite"]) settle(budget, fd124AttemptKey(slot, purpose));
  assert.equal(budget.status().totalVnd, FD124_TECHNICAL_CAP_VND); assert.equal(budget.status().openReservations, 0);
  assert.deepEqual(createCampaignBudget(options).status(), budget.status());
  assert.throws(() => budget.reserveAttempt("v4.2-report", FD124_RESERVE_VND, { attemptKey: fd124AttemptKey(FD124_SLOTS[0], "report"), trace }), { code: "BUDGET_ATTEMPT_ALREADY_CLAIMED" });
  assert.throws(() => createCampaignBudget({ ...options, referenceContinuation: undefined }), { code: "BUDGET_CONFIG_INVALID" });
  assert.throws(() => createCampaignBudget({ ...options, ledgerPath, referenceContinuation: FD123_POLICY, totalCapVnd: FD123_TECHNICAL_CAP_VND,
    allocationsVnd: { "v4.2-report": FD123_TECHNICAL_CAP_VND } }).status(), { code: "BUDGET_LEDGER_CONFIG_MISMATCH" });
});
test("unknown dispatched attempt cannot release or advance, and partial campaign cannot restart", () => {
  const { budget } = fresh(), key = fd124AttemptKey(FD124_SLOTS[0], "report");
  const id = budget.reserveAttempt("v4.2-report", FD124_RESERVE_VND, { attemptKey: key, trace }); budget.markDispatched(id);
  assert.throws(() => budget.release(id), { code: "BUDGET_TRANSITION_INVALID" });
  assert.throws(() => budget.reserveAttempt("v4.2-report", FD124_RESERVE_VND, { attemptKey: fd124AttemptKey(FD124_SLOTS[1], "report"), trace }), { code: "BUDGET_ATTEMPT_UNRESOLVED" });
  for (const state of [{ journalExists: true, markerExists: false, state: { totalVnd: 0, openReservations: 0 } },
    { journalExists: false, markerExists: true, state: { totalVnd: 0, openReservations: 0 } },
    { journalExists: false, markerExists: false, state: budget.status() }]) assert.throws(() => assertFd124FreshCampaign(state), { code: "FD124_RESTART_REQUIRES_RECONCILIATION" });
});
test("storage rejects symlink ancestors, dangling leaf, hardlinks, authority writes and concurrent checkpoints", () => {
  const root = mkdtempSync(join(tmpdir(), "fd124-storage-")), oldRoot = join(root, "old"), newRoot = join(root, "new");
  mkdirSync(oldRoot, { mode: 0o700 }); mkdirSync(newRoot, { mode: 0o700 });
  const options = { oldRoot, newRoot };
  const authority = join(oldRoot, "journal"); writeFileSync(authority, "original", { mode: 0o600 });
  assert.throws(() => assertFd124Path(authority, options), { code: "FD124_PATH_FORBIDDEN" });
  symlinkSync(oldRoot, join(root, "alias")); assert.throws(() => assertFd124Path(join(root, "alias", "new"), options), { code: "FD124_STORAGE_UNSAFE" });
  symlinkSync(join(root, "missing"), join(root, "dangling")); assert.throws(() => assertFd124Path(join(root, "dangling"), options), { code: "FD124_STORAGE_UNSAFE" });
  linkSync(authority, join(root, "hardlink")); assert.throws(() => assertFd124Path(join(root, "hardlink"), options), { code: "FD124_STORAGE_UNSAFE" });
  const target = join(newRoot, "journal"); durableFd124Save(target, { ok: true }, { ...options, privateStorage: true });
  assert.equal(statSync(target).mode & 0o077, 0);
  writeFileSync(`${target}.next`, "previous", { mode: 0o600 });
  assert.throws(() => durableFd124Save(target, { ok: false }, { ...options, privateStorage: true }), { code: "EEXIST" });
  assert.deepEqual(JSON.parse(readFileSync(target)), { ok: true }); assert.equal(readFileSync(authority, "utf8"), "original");
});
test("old authority digest mutation stops before checkpoint", () => {
  const root = mkdtempSync(join(tmpdir(), "fd124-authority-")); writeFileSync(join(root, "reports"), "frozen", { mode: 0o600 });
  const expected = { reports: hash("frozen") }; assertFd124Authorities(root, expected);
  writeFileSync(join(root, "reports"), "changed", { mode: 0o600 }); assert.throws(() => assertFd124Authorities(root, expected), { code: "FD124_OLD_AUTHORITY_CHANGED" });
});
test("native invalid response diagnostics use only closed projections; thoughts and arbitrary fields never escape", async () => {
  const secret = "PRIVATE_THOUGHT_OR_TOKEN";
  for (const [raw, reason, finish] of [[Buffer.from(secret), "JSON_PARSE"],
    [Buffer.from(JSON.stringify({ ...payload(), candidates: [] })), "CANDIDATE_COUNT"],
    [Buffer.from(JSON.stringify({ ...payload(), candidates: [{ finishReason: secret, content: { role: "model", parts: [{ text: secret }] } }] })), "FINISH_REASON", "UNSUPPORTED"],
    [Buffer.from(JSON.stringify({ ...payload(), candidates: [{ finishReason: "MAX_TOKENS", content: { role: "model", parts: [{ text: secret }] } }] })), "FINISH_REASON", "MAX_TOKENS"],
    [Buffer.from(JSON.stringify({ ...payload(), candidates: [{ finishReason: "STOP", content: { role: secret, parts: [{ text: secret }] } }] })), "CONTENT_ROLE"],
    [Buffer.from(JSON.stringify({ ...payload(), candidates: [{ finishReason: "STOP", content: { role: "model", parts: [{ text: secret, injected: secret }] } }] })), "PARTS_SHAPE"],
    [Buffer.from(JSON.stringify({ ...payload(), candidates: [{ finishReason: "STOP", content: { role: "model", parts: [{ text: secret, thought: true }] } }] })), "EMPTY_VISIBLE"]]) {
    assert.throws(() => parseNativeResponse(raw, trace.requestSha256), error => {
      assert.equal(error.code, "ROUTER_RESPONSE_INVALID"); assert.equal(error.diagnostic.reason, reason);
      if (finish) assert.equal(error.diagnostic.finishReason, finish);
      assert.equal(JSON.stringify(error.diagnostic).includes(secret), false); assert.equal(error.diagnostic.responseSha256, hash(raw)); return true;
    });
  }
  const native = payload(); native.candidates[0].content.parts.unshift({ text: secret, thought: true });
  assert.equal(parseNativeResponse(Buffer.from(JSON.stringify(native)), trace.requestSha256).outputText.includes(secret), false);
  const diagnostic = { reason: "JSON_PARSE", responseBytes: 2, requestSha256: trace.requestSha256, responseSha256: "b".repeat(64) };
  assert.throws(() => inspectNativeFailureDiagnostic({ ...diagnostic, raw: secret }), { code: "ROUTER_DIAGNOSTIC_INVALID" });
  const emitted = [];
  await runBridge({ input: Readable.from([JSON.stringify({}) + "\n" + JSON.stringify({ type: "dispatch", requestSha256: trace.requestSha256 }) + "\n"]),
    emit: value => emitted.push(value), prepare: async () => ({ trace }), send: async () => { throw Object.assign(new Error(secret), { code: "ROUTER_RESPONSE_INVALID", diagnostic: { ...diagnostic, raw: secret } }); } });
  assert.equal(JSON.stringify(emitted).includes(secret), false); assert.equal(emitted[1].diagnostic, undefined);
});
function providerFixture(outputs) {
  const row = { slot: FD124_SLOTS[0], attempts: [] }, manifest = { status: "running", reports: [row] }, calls = [];
  const schema = { safeParse: value => value?.valid ? { success: true, data: value } : { success: false } };
  const provider = fd124Provider({ row, manifest, save: () => {}, budget: {}, modules: { contracts: { z: { toJSONSchema: () => ({ type: "object" }) } } }, unchanged: () => {},
    runAttempt: async request => { calls.push(request); const value = outputs.shift(); if (value instanceof Error) throw value;
      return { outputText: value, quote: { quoteVnd: "33368", quoteMicroVnd: "33368000000", tokensUnknown: true } }; } });
  return { row, manifest, calls, run: purpose => provider.generateStructured({ purpose, schema, system: "synthetic", user: "facts" }) };
}
test("complete accounted malformed product JSON permits only one correction; unknown never retries", async () => {
  const good = providerFixture(["invalid", '{"valid":true}']); assert.equal((await good.run("report")).ok, true);
  assert.deepEqual(good.calls.map(call => call.attemptKey), [fd124AttemptKey(FD124_SLOTS[0], "report"), fd124AttemptKey(FD124_SLOTS[0], "rewrite")]);
  assert.ok(good.calls.every(call => call.maxOutputTokens === FD124_OUTPUT_TOKENS));
  assert.equal((await good.run("rewrite")).ok, false); assert.equal(good.calls.length, 2);
  const bad = providerFixture([Object.assign(new Error("unknown"), { code: "ROUTER_RESPONSE_INVALID" })]);
  assert.equal((await bad.run("report")).ok, false); assert.equal(bad.calls.length, 1); assert.equal(bad.manifest.status, "stopped");
});
test("known completed quality rejection advances; unresolved attempt stops all subsequent slots", async () => {
  for (const unresolved of [false, true]) {
    const manifest = { reports: [] }; let calls = 0;
    await runFd124Sequence({ inputs: [{ group: "current_annual", index: 1, facts: {} }, { group: "next_annual", index: 0, facts: {} }], manifest, save: () => {},
      generate: async (_input, row) => { calls++; row.attempts.push({ status: unresolved ? "stopped" : "reference_settled" }); return { ok: false, error: { code: "AI_OUTPUT_INVALID" } }; } });
    assert.equal(calls, unresolved ? 1 : 2); assert.equal(manifest.status, unresolved ? "stopped" : "complete_with_rejections");
  }
});
test("live source freeze rejects changed source tuples and an unreviewed slot list", () => {
  assert.throws(() => assertFd124FrozenInputs([], { campaign: FD124_POLICY, asOfDate: "2026-10-09", physicalDispatches: 0, inputs: [{}] }), { code: "FD124_FROZEN_INPUT_CHANGED" });
});

test("FD124 real parent bridge settles complete proof and retains unknown diagnostic without accepting unsafe wire fields", async () => {
  for (const failure of [false, true, "unsafe", "wrong_request", "checkpoint"]) {
    const { budget } = fresh(); let sends = 0;
    const diagnostic = { reason: "FINISH_REASON", finishReason: "MAX_TOKENS", responseBytes: 200, requestSha256: trace.requestSha256, responseSha256: "b".repeat(64) };
    const processFactory = () => {
      const child = new EventEmitter(); child.stdin = new PassThrough(); child.stdout = new PassThrough();
      child.kill = () => { child.stdin.destroy(); child.stdout.end(); };
      let buffer = "", stage = 0;
      child.stdin.on("data", data => {
        buffer += data.toString(); let split;
        while ((split = buffer.indexOf("\n")) >= 0) {
          const input = JSON.parse(buffer.slice(0, split)); buffer = buffer.slice(split + 1);
          if (!stage++) child.stdout.write(JSON.stringify({ type: "prepared", trace: Object.fromEntries(Object.entries(trace).filter(([key]) => !key.startsWith("pricing"))),
            bounds: { inputTokens: 1048576, outputTokens: 65536, reasoningTokens: 65536 }, expiresAtMs: now().getTime() + 1000000 }) + "\n");
          else {
            assert.equal(input.type, "dispatch"); sends++;
            const result = parseNativeResponse(Buffer.from(JSON.stringify(payload())), trace.requestSha256);
            child.stdout.end(JSON.stringify(failure ? { type: "failure", code: "ROUTER_RESPONSE_INVALID", diagnostic: { ...diagnostic, ...(failure === "unsafe" ? { raw: "PRIVATE_SECRET" } : {}), ...(failure === "wrong_request" ? { requestSha256: "c".repeat(64) } : {}) } } : { type: "result", ...result }) + "\n");
          }
        }
      }); return child;
    };
    const attempt = runProdRouterAttempt({ system: "synthetic", user: "synthetic", maxOutputTokens: FD124_OUTPUT_TOKENS,
      attemptKey: fd124AttemptKey(FD124_SLOTS[0], "report"), budget, referenceContinuation: true, referenceMode: FD123_MODEL_BOUND_MODE, processFactory, now,
      onDispatchReady: () => { if (failure === "checkpoint") throw Object.assign(new Error("checkpoint unavailable"), { code: "FD124_CHECKPOINT_FAILED" }); } });
    if (failure) await assert.rejects(attempt, error => {
      assert.equal(error.code, failure === "unsafe" ? "ROUTER_DIAGNOSTIC_INVALID" : failure === "wrong_request" ? "ROUTER_DIAGNOSTIC_REQUEST_MISMATCH" : failure === "checkpoint" ? "FD124_CHECKPOINT_FAILED" : "ROUTER_RESPONSE_INVALID");
      assert.equal(JSON.stringify(error).includes("PRIVATE_SECRET"), false);
      assert.deepEqual(error.failureDiagnostic, ["unsafe", "wrong_request", "checkpoint"].includes(failure) ? undefined : diagnostic); return true;
    });
    else assert.equal((await attempt).quote.quoteVnd, "33368");
    assert.equal(sends, failure === "checkpoint" ? 0 : 1); assert.equal(budget.status().openReservations, failure ? 1 : 0);
    if (failure === "checkpoint") {
      assert.throws(() => budget.reserveAttempt("v4.2-report", FD124_RESERVE_VND, { attemptKey: fd124AttemptKey(FD124_SLOTS[1], "report"), trace }), { code: "BUDGET_ATTEMPT_UNRESOLVED" });
      assert.equal(readFileSync(budget.ledgerPath, "utf8").includes("settle-attempt"), false);
    }
  }
});
test("actual fresh synthetic profiles have distinct normalized birth facts; old profiles retain their frozen lineage", async () => {
  const modules = { backend: await import("../packages/backend/dist/index.js"), contracts: await import("../packages/contracts/dist/index.js"), engine: await import("../packages/engine-adapters/dist/index.js") };
  const old = await Promise.all([0, 1].map(index => makePaidTrialInput("career_wealth", index, "2026-10-09", modules)));
  const fresh = await Promise.all([2, 3].map(index => makeFreshPaidTrialInput("career_wealth", index, "2026-10-09", modules)));
  assert.equal(new Set([...old, ...fresh].map(input => input.snapshotHash)).size, 4);
  assert.equal(new Set([...old, ...fresh].map(input => hash(JSON.stringify(input.facts)))).size, 4);
  assert.equal(fresh[0].chartVersionId, "fd124-synthetic-chart-2");
  await assert.rejects(makePaidTrialInput("career_wealth", 2, "2026-10-09", modules), { code: "PAID_TRIAL_INPUT_INVALID" });
  await assert.rejects(makeFreshPaidTrialInput("monthly", 2, "2026-10-09", modules), { code: "PAID_TRIAL_INPUT_INVALID" });
});
