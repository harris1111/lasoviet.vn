import assert from "node:assert/strict";
import { appendFileSync, chmodSync, mkdtempSync, readFileSync, rmSync, unlinkSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { test } from "node:test";
import { createCampaignBudget, withBudget, TOTAL_CAP_VND, DEFAULT_ALLOCATIONS_VND } from "./lib/campaign-budget.mjs";
const at = "2026-10-06T00:00:00.000Z";
const campaign = "v4.2-report";
const moduleUrl = new URL("./lib/campaign-budget.mjs", import.meta.url).href;
function fresh(t, cap = 10_000) {
  const dir = mkdtempSync(join(tmpdir(), "campaign-budget-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const path = join(dir, "ledger.jsonl");
  const options = { ledgerPath: path, totalCapVnd: cap, allocationsVnd: { [campaign]: cap }, now: () => new Date(at) };
  return { dir, path, options, budget: createCampaignBudget(options) };
}
function child(path, cap, operation) {
  return spawn(process.execPath, ["--input-type=module", "-e", `
    import {createCampaignBudget} from ${JSON.stringify(moduleUrl)};
    const budget=createCampaignBudget({ledgerPath:${JSON.stringify(path)},totalCapVnd:${cap},allocationsVnd:{'v4.2-report':${cap}},now:()=>new Date(${JSON.stringify(at)})});
    ${operation}
  `], { stdio: ["ignore", "pipe", "pipe"] });
}
async function finished(proc) {
  let out = "", err = ""; proc.stdout.on("data", b => out += b); proc.stderr.on("data", b => err += b);
  const [code, signal] = await once(proc, "exit"); return { code, signal, out, err };
}
test("FD-112 defaults dedicate the entire cap to lifetime only", () => {
  assert.equal(TOTAL_CAP_VND, 200_000);
  assert.deepEqual(DEFAULT_ALLOCATIONS_VND, { [campaign]: 200_000 });
  for (const cap of [0, -1, 1.5, NaN, Infinity, 200_001]) {
    assert.throws(() => createCampaignBudget({ totalCapVnd: cap }), { code: "BUDGET_CONFIG_INVALID" });
  }
  assert.throws(() => createCampaignBudget({ allocationsVnd: { "daily-reading": 20_000 } }), { code: "BUDGET_CONFIG_INVALID" });
});
test("cap exhaustion and deferred campaigns reject before provider callback", async t => {
  const { budget } = fresh(t, 2_000); let calls = 0;
  const generate = withBudget(budget, campaign, { perCallVnd: 500, maxCalls: 2 }, async () => ++calls);
  assert.equal(await generate({}), 1); assert.equal(await generate({}), 2);
  await assert.rejects(generate({}), { code: "BUDGET_TOTAL_CAP_REACHED" });
  const deferred = withBudget(budget, "topic-deep-dive", { perCallVnd: 500, maxCalls: 1 }, async () => ++calls);
  await assert.rejects(deferred({}), { code: "BUDGET_CAMPAIGN_DEFERRED" });
  assert.equal(calls, 2); assert.equal(budget.status().totalVnd, 2_000);
});
test("bounds require explicit safe integer worst-case cost and call count", t => {
  const { budget } = fresh(t);
  for (const bounds of [undefined, {}, { perCallVnd: 1 }, { perCallVnd: 0, maxCalls: 1 },
    { perCallVnd: 1, maxCalls: Infinity }, { perCallVnd: 1, maxCalls: 0 },
    { perCallVnd: Number.MAX_SAFE_INTEGER, maxCalls: 2 }]) {
    assert.throws(() => withBudget(budget, campaign, bounds, () => {}), { code: "BUDGET_BOUND_UNVERIFIED" });
  }
  for (const amount of [0, -1, 1.5, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => budget.reserve(campaign, amount), { code: "BUDGET_RESERVATION_INVALID" });
  }
});
test("durable dispatch fences refunds and failed callbacks retain full reservation", async t => {
  const { budget, path } = fresh(t);
  const reserved = budget.reserve(campaign, 500); budget.release(reserved);
  assert.throws(() => budget.release(reserved), { code: "BUDGET_TRANSITION_INVALID" });
  const sent = budget.reserve(campaign, 1_000); budget.markDispatched(sent);
  assert.throws(() => budget.release(sent), { code: "BUDGET_TRANSITION_INVALID" });
  budget.settle(sent); assert.throws(() => budget.release(sent), { code: "BUDGET_TRANSITION_INVALID" });
  assert.throws(() => budget.settle(sent), { code: "BUDGET_TRANSITION_INVALID" });
  const run = withBudget(budget, campaign, { perCallVnd: 500, maxCalls: 2 }, async () => {
    const rows = readFileSync(path, "utf8").trim().split("\n").map(JSON.parse);
    assert.equal(rows.at(-1).type, "dispatch"); throw Error("provider failed");
  });
  await assert.rejects(run(), /provider failed/); assert.equal(budget.status().totalVnd, 2_000);
  assert(readFileSync(path, "utf8").split("\n").filter(Boolean).every(line => JSON.parse(line).at === at));
});
test("real competing processes cannot over-reserve; restart retains charges", async t => {
  const { path, budget } = fresh(t, 1_000);
  const children = Array.from({ length: 12 }, () => finished(child(path, 1_000,
    `try {budget.reserve('v4.2-report',100);console.log('reserved')} catch(e) {if(e.code!=='BUDGET_TOTAL_CAP_REACHED')throw e;console.log('denied')}`)));
  const results = await Promise.all(children);
  assert(results.every(r => r.code === 0), JSON.stringify(results));
  assert.equal(results.filter(r => r.out.trim() === "reserved").length, 10);
  assert.equal(budget.status().totalVnd, 1_000);
  assert.equal(budget.status().openReservations, 10);
});
test("process crash after dispatch retains exposure and OS lock is reusable", async t => {
  const { path, budget } = fresh(t, 1_000);
  const result = await finished(child(path, 1_000, `const id=budget.reserve('v4.2-report',600);budget.markDispatched(id);process.kill(process.pid,'SIGKILL')`));
  assert.equal(result.signal, "SIGKILL"); assert.equal(budget.status().totalVnd, 600);
  budget.reserve(campaign, 400); assert.equal(budget.status().totalVnd, 1_000);
});
test("partial/corrupt journals and incompatible config never reset exposure", t => {
  const { budget, path, options } = fresh(t); budget.reserve(campaign, 500);
  assert.throws(() => createCampaignBudget({ ...options, totalCapVnd: 20_000, allocationsVnd: { [campaign]: 20_000 } }).status(), { code: "BUDGET_LEDGER_CONFIG_MISMATCH" });
  appendFileSync(path, '{"type":"reserve"');
  const previous = readFileSync(path);
  assert.throws(() => budget.status(), { code: "BUDGET_LEDGER_CORRUPT" });
  assert.deepEqual(readFileSync(path), previous);
});
test("unknown journal transitions reject and unsafe ledger paths fail closed", t => {
  const { budget, path, dir } = fresh(t); budget.status();
  appendFileSync(path, JSON.stringify({ type: "release", id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", at }) + "\n");
  assert.throws(() => budget.status(), { code: "BUDGET_LEDGER_CORRUPT" });
  const other = join(dir, "other"); writeFileSync(other, "secret", { mode: 0o600 });
  const alias = join(dir, "alias"); symlinkSync(other, alias);
  const linked = createCampaignBudget({ ledgerPath: alias });
  assert.throws(() => linked.status(), { code: "BUDGET_LEDGER_CORRUPT" });
  assert.equal(readFileSync(other, "utf8"), "secret");
});
test("world-readable ledger rejected without changing permissions or contents", t => {
  const { budget, path } = fresh(t); budget.status(); chmodSync(path, 0o644);
  assert.throws(() => budget.reserve(campaign, 1), { code: "BUDGET_LEDGER_UNSAFE" });
});
test("OS lock held by another process is never deleted or stolen", async t => {
  const { budget, path } = fresh(t); budget.status();
  const holder = spawn("flock", ["--exclusive", `${path}.lock`, process.execPath, "-e", "console.log('locked');setTimeout(()=>{},30000)"], { stdio: ["ignore", "pipe", "pipe"], detached: true });
  t.after(() => { try { process.kill(-holder.pid, "SIGKILL"); } catch {} });
  await once(holder.stdout, "data");
  assert.throws(() => budget.reserve(campaign, 1), { code: "BUDGET_STORAGE_UNAVAILABLE" });
  const exited = once(holder, "exit"); process.kill(-holder.pid, "SIGKILL"); await exited;
  budget.reserve(campaign, 1); assert.equal(budget.status().totalVnd, 1);
});

test("truncated or missing initialized ledger never recreates zero exposure", t => {
  const { budget, path } = fresh(t); const id = budget.reserve(campaign, 500); budget.markDispatched(id);
  writeFileSync(path, "");
  assert.throws(() => budget.status(), { code: "BUDGET_LEDGER_CORRUPT" });
  assert.equal(readFileSync(path, "utf8"), "");
  unlinkSync(path);
  assert.throws(() => budget.reserve(campaign, 1), { code: "BUDGET_LEDGER_MISSING" });
});
test("new nested private directories support durable initialization and restart", t => {
  const { dir } = fresh(t); const path = join(dir, "new", "nested", "ledger.jsonl");
  const options = { ledgerPath: path, now: () => new Date(at) };
  const budget = createCampaignBudget(options); budget.reserve(campaign, 500);
  assert.equal(createCampaignBudget(options).status().totalVnd, 500);
});

test("concurrent nested bootstrap serializes reservations on the same new path", async t => {
  const { dir, options } = fresh(t, 1_000);
  const path = join(dir, "concurrent", "new", "nested", "ledger.jsonl");
  const children = Array.from({ length: 6 }, () => finished(child(path, 1_000,
    `try {budget.reserve('v4.2-report',250);console.log('reserved')} catch(e) {if(e.code!=='BUDGET_TOTAL_CAP_REACHED')throw e;console.log('denied')}`)));
  const results = await Promise.all(children);
  assert(results.every(r => r.code === 0), JSON.stringify(results));
  assert.equal(results.filter(r => r.out.trim() === "reserved").length, 4);
  assert.equal(createCampaignBudget({ ...options, ledgerPath: path }).status().totalVnd, 1_000);
});
