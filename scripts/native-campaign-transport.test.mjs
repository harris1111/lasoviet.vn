import assert from "node:assert/strict";
import { test, before, after } from "node:test";
import { createServer, request as httpsRequest } from "node:https";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, openSync, fsyncSync, closeSync, constants } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildNativeCampaignPreflight, NATIVE_CAMPAIGN_ENDPOINT } from "./lib/native-campaign-preflight.mjs";
import { sendNativeOnce } from "./lib/native-campaign-transport.mjs";
import { createCampaignBudget } from "./lib/campaign-budget.mjs";

const at = new Date("2026-10-06T08:00:00Z"), now = () => at;
const base = { system: "synthetic system", user: "synthetic user", maxOutputTokens: 20_000, deadlineMs: 2_000, now, credential: { accessToken: "synthetic-token", projectId: "synthetic-project", expiresAt: "2026-10-07T08:00:00Z" } };
let dir, key, cert;
before(() => {
  dir = mkdtempSync(join(tmpdir(), "native-campaign-tls-"));
  execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", join(dir, "key.pem"), "-out", join(dir, "cert.pem"), "-days", "1", "-subj", "/CN=localhost", "-addext", "subjectAltName=IP:127.0.0.1,DNS:localhost"], { stdio: "ignore" });
  key = readFileSync(join(dir, "key.pem")); cert = readFileSync(join(dir, "cert.pem"));
});
after(() => rmSync(dir, { recursive: true, force: true }));

async function fixture(t, handler) {
  const posts = [];
  const server = createServer({ key, cert }, (req, res) => {
    posts.push({ method: req.method, path: req.url, body: "" }); const row = posts.at(-1);
    req.on("data", chunk => { row.body += chunk; }); req.on("end", () => handler(req, res));
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  const local = `https://127.0.0.1:${server.address().port}/v1internal:generateContent`;
  let constructors = 0;
  const requestImpl = (url, options, callback) => {
    constructors++;
    assert.equal(url, NATIVE_CAMPAIGN_ENDPOINT); assert.equal(options.method, "POST"); assert.equal(options.agent, false); assert.equal(options.rejectUnauthorized, true);
    return httpsRequest(local, { ...options, ca: cert, servername: "localhost" }, callback);
  };
  return { posts, requestImpl, constructors: () => constructors };
}

const run = (requestImpl, changes = {}, beforeSend = () => true) => sendNativeOnce(buildNativeCampaignPreflight({ ...base, ...changes }), { beforeSend, requestImpl, now });

test("local TLS success produces exactly one actual POST and preserves raw body", async t => {
  const payload = { response: { usageMetadata: { promptTokenCount: 100 }, modelVersion: "gemini-3.8-flash" } };
  const f = await fixture(t, (_req, res) => { res.writeHead(200); res.end(JSON.stringify(payload)); });
  const response = await run(f.requestImpl);
  assert.equal(f.constructors(), 1); assert.equal(f.posts.length, 1); assert.equal(f.posts[0].method, "POST"); assert.deepEqual(response.body, payload);
});

test("401, 429 and server errors never cause HTTP replay or credential rotation", async t => {
  for (const status of [401, 429, 503]) await t.test(String(status), async sub => {
    const f = await fixture(sub, (_req, res) => { res.writeHead(status); res.end("synthetic failure"); });
    await assert.rejects(run(f.requestImpl), { code: "NATIVE_HTTP_STATUS", httpStatus: status });
    assert.equal(f.posts.length, 1); assert.equal(f.constructors(), 1);
  });
});

test("redirect is rejected without a second POST", async t => {
  const f = await fixture(t, (_req, res) => { res.writeHead(307, { Location: "/redirect-target" }); res.end(); });
  await assert.rejects(run(f.requestImpl), { code: "NATIVE_HTTP_STATUS", httpStatus: 307 }); assert.equal(f.posts.length, 1); assert.equal(f.constructors(), 1);
});

test("full-body timeout retains a dispatched reservation and never retries", async t => {
  const owned = mkdtempSync(join(tmpdir(), "native-campaign-budget-")); t.after(() => rmSync(owned, { recursive: true, force: true }));
  const budget = createCampaignBudget({ ledgerPath: join(owned, "ledger.jsonl"), totalCapVnd: 1_000, allocationsVnd: { "v4.2-report": 1_000 }, now });
  const f = await fixture(t, (_req, res) => { res.writeHead(200); res.write('{"unfinished":'); });
  let id;
  await assert.rejects(run(f.requestImpl, { deadlineMs: 2_000 }, trace => {
    id = budget.reserve("v4.2-report", 500); budget.markDispatched(id);
    const audit = join(owned, "audit.jsonl"); writeFileSync(audit, `${JSON.stringify(trace)}\n`, { mode: 0o600 });
    const fd = openSync(audit, "r"); fsyncSync(fd); closeSync(fd);
    const directory = openSync(owned, constants.O_RDONLY | constants.O_DIRECTORY); fsyncSync(directory); closeSync(directory);
    assert.ok(!readFileSync(audit, "utf8").includes("synthetic-token")); return true;
  }), { code: "NATIVE_DEADLINE_EXCEEDED" });
  assert.equal(f.posts.length, 1); assert.equal(f.constructors(), 1); assert.equal(budget.status().totalVnd, 500);
  assert.throws(() => budget.release(id), { code: "BUDGET_TRANSITION_INVALID" });
});

test("connection reset after receiving POST does not create another send", async t => {
  const f = await fixture(t, (req, _res) => req.socket.destroy());
  await assert.rejects(run(f.requestImpl), { code: "NATIVE_TRANSPORT_ERROR" }); assert.equal(f.posts.length, 1); assert.equal(f.constructors(), 1);
});

test("untrusted TLS certificate fails verification without a POST", async t => {
  let posts = 0;
  const server = createServer({ key, cert }, () => { posts++; assert.fail("untrusted TLS must not reach HTTP"); });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  await assert.rejects(run((_url, options, callback) => httpsRequest(`https://127.0.0.1:${server.address().port}`, options, callback)), { code: "NATIVE_TRANSPORT_ERROR" });
  assert.equal(posts, 0);
});

test("missing authorization, failed durable audit and expiry produce zero POST", async t => {
  const f = await fixture(t, (_req, res) => res.end("{}"));
  const request = buildNativeCampaignPreflight(base);
  await assert.rejects(sendNativeOnce(request, { requestImpl: f.requestImpl, now }), { code: "NATIVE_DISPATCH_NOT_AUTHORIZED" });
  await assert.rejects(run(f.requestImpl, {}, () => false), { code: "NATIVE_DISPATCH_NOT_AUTHORIZED" });
  await assert.rejects(run(f.requestImpl, {}, () => { throw Object.assign(new Error("synthetic_audit_failure"), { code: "AUDIT_FAILED" }); }), { code: "AUDIT_FAILED" });
  await assert.rejects(sendNativeOnce(request, { beforeSend: () => true, requestImpl: f.requestImpl, now: () => new Date("2026-10-07T08:00:00Z") }), { code: "NATIVE_CREDENTIAL_EXPIRED" });
  await assert.rejects(sendNativeOnce({ ...request }, { beforeSend: () => true, requestImpl: f.requestImpl, now }), { code: "NATIVE_DISPATCH_NOT_AUTHORIZED" });
  assert.equal(f.constructors(), 0); assert.equal(f.posts.length, 0);
});

test("default live transport is hard-gated even if caller supplies a permission callback", async () => {
  let authorized = false;
  await assert.rejects(sendNativeOnce(buildNativeCampaignPreflight(base), { beforeSend: () => { authorized = true; return true; }, now }), { code: "NATIVE_LIVE_GATE_UNVERIFIED" });
  assert.equal(authorized, false);
});
