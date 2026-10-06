import assert from "node:assert/strict";
import { test, before, after } from "node:test";
import { createServer, request as httpsRequest } from "node:https";
import { spawn, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import { createCampaignBudget } from "./lib/campaign-budget.mjs";
import { buildNativeCampaignPreflight, inspectNativeReceipt } from "./lib/native-campaign-preflight.mjs";
import { runNativeCampaignAttempt } from "./lib/native-campaign-attempt.mjs";

const at = "2026-10-06T08:00:00.000Z", now = () => new Date(at);
const campaign = "v4.2-report";
const keyOf = intent => createHash("sha256").update(intent).digest("hex");
const base = { system: "synthetic system", user: "synthetic user", maxOutputTokens: 20_000, deadlineMs: 2_000, now, credential: { accessToken: "synthetic-token", projectId: "synthetic-project", expiresAt: "2030-10-07T08:00:00Z" } };
const validBody = () => ({ response: { modelVersion: "gemini-3.8-flash-medium", usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 50, cachedContentTokenCount: 20, thoughtsTokenCount: 30, totalTokenCount: 180 }, candidates: [{ finishReason: "STOP", content: { role: "model", parts: [{ text: "SYNTHETIC_PRIVATE_THOUGHT", thought: true }, { text: '{"synthetic":true}' }] } }] } });
let tlsDir, key, cert;
before(() => {
  tlsDir = mkdtempSync(join(tmpdir(), "native-attempt-tls-"));
  execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", join(tlsDir, "key.pem"), "-out", join(tlsDir, "cert.pem"), "-days", "1", "-subj", "/CN=localhost", "-addext", "subjectAltName=IP:127.0.0.1,DNS:localhost"], { stdio: "ignore" });
  key = readFileSync(join(tlsDir, "key.pem")); cert = readFileSync(join(tlsDir, "cert.pem"));
});
after(() => rmSync(tlsDir, { recursive: true, force: true }));
function fresh(t) {
  const dir = mkdtempSync(join(tmpdir(), "native-attempt-budget-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const ledgerPath = join(dir, "ledger.jsonl");
  const options = { ledgerPath, totalCapVnd: 2_000, allocationsVnd: { [campaign]: 2_000 }, now };
  return { ledgerPath, options, budget: createCampaignBudget(options) };
}
async function fixture(t, handler = (_req, res) => res.end(JSON.stringify(validBody()))) {
  let posts = 0, constructors = 0;
  const server = createServer({ key, cert }, (req, res) => {
    req.resume(); req.on("end", () => { posts++; server.emit("received"); handler(req, res); });
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  const local = `https://127.0.0.1:${server.address().port}/v1internal:generateContent`;
  const requestImpl = (_url, options, callback) => {
    constructors++;
    return httpsRequest(local, { ...options, ca: cert, servername: "localhost" }, callback);
  };
  return { local, server, requestImpl, posts: () => posts, constructors: () => constructors };
}
function child(t, ledgerPath, operation, local) {
  const urls = Object.fromEntries(["campaign-budget", "native-campaign-preflight", "native-campaign-attempt"].map(name => [name, new URL(`./lib/${name}.mjs`, import.meta.url).href]));
  const proc = spawn(process.execPath, ["--input-type=module", "-e", `
    import {createCampaignBudget} from ${JSON.stringify(urls["campaign-budget"])};
    import {buildNativeCampaignPreflight} from ${JSON.stringify(urls["native-campaign-preflight"])};
    import {runNativeCampaignAttempt} from ${JSON.stringify(urls["native-campaign-attempt"])};
    import {request} from 'node:https';import {readFileSync} from 'node:fs';
    const now=()=>new Date(${JSON.stringify(at)});
    const budget=createCampaignBudget({ledgerPath:${JSON.stringify(ledgerPath)},totalCapVnd:2000,allocationsVnd:{'v4.2-report':2000},now});
    const preflight=buildNativeCampaignPreflight({...${JSON.stringify({ ...base, now: undefined })},now});
    const requestImpl=(_url,options,callback)=>request(${JSON.stringify(local ?? "https://127.0.0.1:1")},{...options,ca:readFileSync(${JSON.stringify(join(tlsDir, "cert.pem"))}),servername:'localhost'},callback);
    try {${operation}}catch(error){console.log(error.code??'FAILED');process.exitCode=2;}
  `], { stdio: ["ignore", "pipe", "pipe"] });
  let out = "", err = "";
  proc.stdout.on("data", bytes => out += bytes); proc.stderr.on("data", bytes => err += bytes);
  const done = once(proc, "exit").then(([code, signal]) => ({ code, signal, out: out.trim(), err }));
  t.after(() => { if (proc.exitCode === null && proc.signalCode === null) proc.kill("SIGKILL"); });
  return { proc, done };
}
const attempt = (budget, requestImpl, intent = "run-1/sample-1/attempt-1", extra = {}) => runNativeCampaignAttempt(buildNativeCampaignPreflight(base), { budget, attemptKey: keyOf(intent), reserveVnd: 500, requestImpl, now, ...extra });

test("native success settles full exposure and consumes the stable key despite rebuilt UUIDs", async t => {
  const { budget, options, ledgerPath } = fresh(t); const f = await fixture(t);
  const result = await attempt(budget, f.requestImpl);
  assert.equal(result.outputText, '{"synthetic":true}'); assert.equal(result.quote.quoteVnd, "10");
  assert.equal(budget.status().totalVnd, 500); assert.equal(budget.status().openReservations, 0);
  const journal = readFileSync(ledgerPath, "utf8");
  for (const secret of ["synthetic-token", "synthetic-project", "synthetic system", "synthetic user", "SYNTHETIC_PRIVATE_THOUGHT", '{"synthetic":true}']) assert.ok(!journal.includes(secret));
  const rows = journal.trim().split("\n").map(JSON.parse);
  assert.deepEqual(rows.map(row => row.type), ["config", "reserve-attempt", "dispatch", "settle-attempt"]);
  assert.equal(rows[1].attemptKey, keyOf("run-1/sample-1/attempt-1")); assert.equal(rows[3].settlement.outputSha256, keyOf(result.outputText));
  await assert.rejects(attempt(createCampaignBudget(options), f.requestImpl), { code: "BUDGET_ATTEMPT_ALREADY_CLAIMED" });
  assert.equal(f.posts(), 1); assert.equal(f.constructors(), 1);
  await attempt(createCampaignBudget(options), f.requestImpl, "run-1/sample-2/attempt-1");
  assert.equal(f.posts(), 2); assert.equal(budget.status().totalVnd, 1_000);
});
test("separate processes racing the same stable key produce exactly one actual TLS POST", async t => {
  const { ledgerPath, budget } = fresh(t); const f = await fixture(t); const attemptKey = keyOf("concurrent/same/1");
  const processes = Array.from({ length: 6 }, () => child(t, ledgerPath, `await runNativeCampaignAttempt(preflight,{budget,attemptKey:${JSON.stringify(attemptKey)},reserveVnd:500,requestImpl,now});console.log('SETTLED');`, f.local));
  const results = await Promise.all(processes.map(item => item.done));
  assert.equal(results.filter(row => row.out === "SETTLED" && row.code === 0).length, 1);
  assert.equal(results.filter(row => row.out === "BUDGET_ATTEMPT_ALREADY_CLAIMED" && row.code === 2).length, 5);
  assert.equal(f.posts(), 1); assert.equal(budget.status().totalVnd, 500);
});
test("two different keys racing an unresolved claim cannot both reserve", async t => {
  const { ledgerPath, budget } = fresh(t);
  const results = await Promise.all(["different/1", "different/2"].map(intent => child(t, ledgerPath, `budget.reserveAttempt('v4.2-report',500,{attemptKey:${JSON.stringify(keyOf(intent))},trace:preflight.trace});console.log('CLAIMED');`).done));
  assert.equal(results.filter(row => row.out === "CLAIMED" && row.code === 0).length, 1);
  assert.equal(results.filter(row => row.out === "BUDGET_ATTEMPT_UNRESOLVED" && row.code === 2).length, 1);
  assert.equal(budget.status().totalVnd, 500); assert.equal(budget.status().openReservations, 1);
});
test("process death between reserve and dispatch retains exposure and blocks continuation", async t => {
  const { ledgerPath, budget } = fresh(t); const attemptKey = keyOf("crash/before-dispatch/1");
  const killed = await child(t, ledgerPath, `budget.reserveAttempt('v4.2-report',500,{attemptKey:${JSON.stringify(attemptKey)},trace:preflight.trace});process.kill(process.pid,'SIGKILL');`).done;
  assert.equal(killed.signal, "SIGKILL"); assert.equal(budget.status().totalVnd, 500);
  const restarted = await child(t, ledgerPath, `budget.reserveAttempt('v4.2-report',500,{attemptKey:${JSON.stringify(keyOf("after-crash/2"))},trace:preflight.trace});`).done;
  assert.equal(restarted.out, "BUDGET_ATTEMPT_UNRESOLVED");
});
test("process death after the actual POST cannot resend or reopen the campaign", async t => {
  const { ledgerPath, budget } = fresh(t); const f = await fixture(t, (_req, res) => { res.writeHead(200); res.write('{"unfinished":'); });
  const attemptKey = keyOf("crash/after-dispatch/1"); const received = once(f.server, "received");
  const running = child(t, ledgerPath, `await runNativeCampaignAttempt(preflight,{budget,attemptKey:${JSON.stringify(attemptKey)},reserveVnd:500,requestImpl,now});`, f.local);
  await received; running.proc.kill("SIGKILL"); assert.equal((await running.done).signal, "SIGKILL");
  for (const intent of ["crash/after-dispatch/1", "crash/after-dispatch/2"]) {
    const result = await child(t, ledgerPath, `await runNativeCampaignAttempt(preflight,{budget,attemptKey:${JSON.stringify(keyOf(intent))},reserveVnd:500,requestImpl,now});`, f.local).done;
    assert.equal(result.out, intent.endsWith("/1") ? "BUDGET_ATTEMPT_ALREADY_CLAIMED" : "BUDGET_ATTEMPT_UNRESOLVED");
  }
  assert.equal(f.posts(), 1); assert.equal(budget.status().totalVnd, 500);
  const row = readFileSync(ledgerPath, "utf8").trim().split("\n").map(JSON.parse).find(row => row.type === "reserve-attempt");
  assert.throws(() => budget.release(row.id), { code: "BUDGET_TRANSITION_INVALID" });
  assert.throws(() => budget.settle(row.id), { code: "BUDGET_TRANSITION_INVALID" });
});
test("explicit pre-dispatch release consumes the old key while admitting a fresh key", t => {
  const { budget } = fresh(t); const trace = buildNativeCampaignPreflight(base).trace; const attemptKey = keyOf("released/1");
  const id = budget.reserveAttempt(campaign, 500, { attemptKey, trace }); budget.release(id);
  assert.equal(budget.status().totalVnd, 0);
  assert.throws(() => budget.reserveAttempt(campaign, 500, { attemptKey, trace }), { code: "BUDGET_ATTEMPT_ALREADY_CLAIMED" });
  budget.reserveAttempt(campaign, 500, { attemptKey: keyOf("released/2"), trace }); assert.equal(budget.status().totalVnd, 500);
});
test("HTTP failure, unknown usage, invalid candidates and excess cost retain full exposure and durable stop", async t => {
  const cases = [
    ["http-error", "NATIVE_HTTP_STATUS", (_req, res) => { res.writeHead(503); res.end("UPSTREAM_SECRET_BODY"); }],
    ["timeout", "NATIVE_DEADLINE_EXCEEDED", (_req, res) => { res.writeHead(200); res.write('{"unfinished":'); }],
    ["missing-counter", "NATIVE_API_PRICING_USAGE_UNVERIFIED", (_req, res) => { const body = validBody(); delete body.response.usageMetadata.thoughtsTokenCount; res.end(JSON.stringify(body)); }],
    ["wrong-model", "NATIVE_API_PRICING_USAGE_UNVERIFIED", (_req, res) => { const body = validBody(); body.response.modelVersion = "unknown-model"; res.end(JSON.stringify(body)); }],
    ["non-stop", "NATIVE_CANDIDATE_UNVERIFIED", (_req, res) => { const body = validBody(); body.response.candidates[0].finishReason = "MAX_TOKENS"; res.end(JSON.stringify(body)); }],
    ["tool", "NATIVE_CANDIDATE_UNVERIFIED", (_req, res) => { const body = validBody(); body.response.candidates[0].content.parts.push({ functionCall: { name: "forbidden" } }); res.end(JSON.stringify(body)); }],
    ["thought-only", "NATIVE_CANDIDATE_UNVERIFIED", (_req, res) => { const body = validBody(); body.response.candidates[0].content.parts.pop(); res.end(JSON.stringify(body)); }],
    ["multiple-candidates", "NATIVE_CANDIDATE_UNVERIFIED", (_req, res) => { const body = validBody(); body.response.candidates.push(body.response.candidates[0]); res.end(JSON.stringify(body)); }],
    ["cost-over-reserve", "NATIVE_ATTEMPT_COST_EXCEEDS_RESERVATION", (_req, res) => { const body = validBody(); body.response.usageMetadata.promptTokenCount = 1_000_000; body.response.usageMetadata.totalTokenCount = 1_000_080; res.end(JSON.stringify(body)); }],
  ];
  for (const [name, code, handler] of cases) await t.test(name, async sub => {
    const { budget, options, ledgerPath } = fresh(sub); const f = await fixture(sub, handler);
    await assert.rejects(attempt(budget, f.requestImpl), { code });
    await assert.rejects(attempt(createCampaignBudget(options), f.requestImpl, "new-key/2"), { code: "BUDGET_ATTEMPT_UNRESOLVED" });
    assert.equal(f.posts(), 1); assert.equal(budget.status().totalVnd, 500); assert.equal(budget.status().openReservations, 1);
    const journal = readFileSync(ledgerPath, "utf8"); assert.ok(!journal.includes("UPSTREAM_SECRET_BODY")); assert.ok(!journal.includes("settle-attempt"));
  });
});
test("strict trace projection and keyed settlement validation reject unsafe journal data", t => {
  const { budget, ledgerPath } = fresh(t); const trace = buildNativeCampaignPreflight(base).trace;
  for (const invalid of [{ ...trace, token: "secret" }, { ...trace, requestSha256: "bad" }, { ...trace, requestId: "secret" }, { ...trace, pricingVersion: "unknown" }]) {
    assert.throws(() => budget.reserveAttempt(campaign, 500, { attemptKey: keyOf("invalid"), trace: invalid }), { code: "BUDGET_ATTEMPT_INVALID" });
  }
  assert.equal(budget.status().totalVnd, 0);
  const id = budget.reserveAttempt(campaign, 500, { attemptKey: keyOf("settlement"), trace }); budget.markDispatched(id);
  const receipt = inspectNativeReceipt(validBody());
  for (const settlement of [{ receipt, outputSha256: "bad" }, { receipt: { ...receipt, rawThoughts: "secret" }, outputSha256: keyOf("output") }, { receipt: { ...receipt, inputTokens: 1_000_000, totalTokens: 1_000_080 }, outputSha256: keyOf("output") }]) {
    assert.throws(() => budget.settleAttempt(id, settlement), { code: "BUDGET_ATTEMPT_SETTLEMENT_INVALID" });
  }
  assert.equal(budget.status().openReservations, 1); assert.ok(!readFileSync(ledgerPath, "utf8").includes("secret"));
});
test("the live gate rejects before creating any durable reservation or POST", async t => {
  const { budget, ledgerPath } = fresh(t);
  await assert.rejects(attempt(budget, undefined), { code: "NATIVE_LIVE_GATE_UNVERIFIED" });
  assert.equal(budget.status().totalVnd, 0); assert.deepEqual(readFileSync(ledgerPath, "utf8").trim().split("\n").map(JSON.parse).map(row => row.type), ["config"]);
});
test("pricing is revalidated at dispatch and across the remaining deadline before claim", async t => {
  const { budget } = fresh(t); const f = await fixture(t); const preflight = buildNativeCampaignPreflight(base);
  for (const date of ["2027-01-01T00:00:00Z", "2026-12-31T23:59:59Z"]) {
    await assert.rejects(runNativeCampaignAttempt(preflight, { budget, attemptKey: keyOf(date), reserveVnd: 500, requestImpl: f.requestImpl, now: () => new Date(date) }), { code: "NATIVE_API_PRICING_OUTSIDE_VALIDITY" });
  }
  assert.equal(f.posts(), 0); assert.equal(f.constructors(), 0); assert.equal(budget.status().totalVnd, 0);
});
test("keyed attempts continue to enforce the aggregate cap without receipt refunds", async t => {
  const { budget } = fresh(t); const f = await fixture(t);
  for (let i = 0; i < 4; i++) await attempt(budget, f.requestImpl, `cap/${i}`);
  await assert.rejects(attempt(budget, f.requestImpl, "cap/4"), { code: "BUDGET_TOTAL_CAP_REACHED" });
  assert.equal(f.posts(), 4); assert.equal(budget.status().totalVnd, 2_000);
});

test("reservation and dispatch audit are durable before the HTTP constructor", async t => {
  const { budget, ledgerPath } = fresh(t); const f = await fixture(t);
  await attempt(budget, (url, options, callback) => {
    const rows = readFileSync(ledgerPath, "utf8").trim().split("\n").map(JSON.parse);
    assert.deepEqual(rows.map(row => row.type), ["config", "reserve-attempt", "dispatch"]);
    assert.equal(rows[1].id, rows[2].id); assert.equal(rows[1].vnd, 500);
    return f.requestImpl(url, options, callback);
  });
  assert.equal(f.posts(), 1);
});
test("ledger corruption fails closed before constructing a POST", async t => {
  const { budget, ledgerPath } = fresh(t); budget.status();
  writeFileSync(ledgerPath, "corrupt\n", { mode: 0o600 }); const f = await fixture(t);
  await assert.rejects(attempt(budget, f.requestImpl), { code: "BUDGET_LEDGER_CORRUPT" });
  assert.equal(f.constructors(), 0); assert.equal(f.posts(), 0);
});
test("pricing expiry during reservation leaves exposure reserved and sends no POST", async t => {
  const { budget } = fresh(t); const f = await fixture(t); let clocks = 0;
  const changingClock = () => new Date(++clocks <= 2 ? at : "2027-01-01T00:00:00Z");
  await assert.rejects(attempt(budget, f.requestImpl, "time-race/1", { now: changingClock }), { code: "NATIVE_API_PRICING_OUTSIDE_VALIDITY" });
  assert.equal(budget.status().totalVnd, 500); assert.equal(budget.status().openReservations, 1);
  await assert.rejects(attempt(budget, f.requestImpl, "time-race/2"), { code: "BUDGET_ATTEMPT_UNRESOLVED" });
  assert.equal(f.constructors(), 0); assert.equal(f.posts(), 0);
});
