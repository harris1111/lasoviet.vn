import assert from "node:assert/strict";
import {test} from "node:test";
import {createHash} from "node:crypto";
import {mkdtempSync, mkdirSync, readFileSync, writeFileSync, symlinkSync, linkSync} from "node:fs";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {FD124_POLICY, FD124_SLOTS, FD124_RESERVE_VND, FD124_TECHNICAL_CAP_VND, fd124AttemptKey} from "./lib/fd124-replacement-trials.mjs";
import {FD124_OLD_AUTHORITIES, fd124InputProjection, fd124Provider} from "./run-replacement-paid-trials.mjs";
import {FD124_CORRECTION_SLOTS, FD124_COMPLETED_HASHES, validateFd124CompletedCorrection, prepareFd124Correction,
  runFd124Corrections, assertFd124CorrectionLedgerPrefix, createFd124CorrectionOnce, appendFd124CorrectionCheckpoint,
  readFd124CorrectionPrivate} from "./correct-fd124-completed-trials.mjs";
const hash = value => createHash("sha256").update(value).digest("hex");
function completed() {
  const inputs = FD124_SLOTS.map(slot => {
    const [group, index] = slot.split(":");
    return {group, index: Number(index), facts: {group, slot}, snapshotHash: hash(slot), targetYear: group === "next_annual" ? 2027 : 2026,
      chartVersionId: hash(`chart:${slot}`), sourceKind: "synthetic_actual_iztro", timingRuleVersion: "fixture"};
  });
  const ledger = [{type: "config", version: 2, referenceContinuation: FD124_POLICY,
    totalCapVnd: FD124_TECHNICAL_CAP_VND, allocationVnd: FD124_TECHNICAL_CAP_VND, settleActualUsage: true}];
  const reports = inputs.map(input => {
    const projection = fd124InputProjection(input), attempts = [];
    for (const purpose of ["report", ...(["next_annual:0", "career_wealth:2"].includes(projection.slot) ? ["rewrite"] : [])]) {
      const outputText = JSON.stringify({message: input.group === "next_annual" ? "trường thọ" : "synthetic wrong source"});
      const attemptKey = fd124AttemptKey(projection.slot, purpose), reservationId = hash(`reserve:${attemptKey}`), trace = {requestSha256: hash(attemptKey)};
      const outputSha256 = hash(outputText);
      attempts.push({purpose, attemptKey, reservationId, trace, outputText, outputSha256, parsedSha256: outputSha256,
        status: "reference_settled", formatStatus: "schema_valid", quote: {quoteVnd: String(FD124_RESERVE_VND)}});
      ledger.push({type: "reserve-attempt", id: reservationId, attemptKey, trace, campaign: "v4.2-report", vnd: FD124_RESERVE_VND},
        {type: "dispatch", id: reservationId}, {type: "settle-attempt", id: reservationId, settlement: {outputSha256}});
    }
    return {...projection, attempts, status: projection.slot === "next_annual:0" ? "rejected" : "quality_passed_pending_manual_review", manualAccepted: false};
  });
  const state = {totalVnd: 8 * FD124_RESERVE_VND, openReservations: 0, capVnd: FD124_TECHNICAL_CAP_VND};
  const journal = {campaign: FD124_POLICY, ownerDecision: "FD-124", status: "complete_with_rejections", asOfDate: "2026-10-09",
    maxPhysicalAttempts: 12, manualAccepted: false, dispatchPermissions: 8, frozenInputsSha256: FD124_COMPLETED_HASHES.frozen,
    oldAuthorityHashes: FD124_OLD_AUTHORITIES, budget: state, reports};
  const options = () => {
    const journalText = JSON.stringify(journal), ledgerText = ledger.map(entry => JSON.stringify(entry)).join("\n") + "\n";
    return {journalText, ledgerText, inputs, state, expected: {...FD124_COMPLETED_HASHES, journal: hash(journalText), ledger: hash(ledgerText)}};
  };
  return {inputs, journal, ledger, state, options};
}

test("only the immutable complete eight-attempt campaign qualifies; exactly three unused rewrites remain", () => {
  const fixture = completed(), args = fixture.options();
  const result = validateFd124CompletedCorrection(args);
  assert.deepEqual(FD124_CORRECTION_SLOTS, ["next_annual:1", "relationship_marriage:2", "relationship_marriage:3"]);
  assert.equal(result.reports.reduce((sum, row) => sum + row.attempts.length, 0), 8);
  assert.throws(() => validateFd124CompletedCorrection({...args, journalText: args.journalText + " "}), {code: "FD124_COMPLETED_AUTHORITY_CHANGED"});
  assert.throws(() => validateFd124CompletedCorrection({...args, ledgerText: args.ledgerText + " "}), {code: "FD124_COMPLETED_AUTHORITY_CHANGED"});
});
test("unknown, pending and exhausted authoritative states never qualify even with repinned synthetic hashes", () => {
  for (const mutate of [f => {f.state.openReservations = 1;}, f => {f.journal.status = "stopped";},
    f => {f.journal.reports[2].attempts[0].status = "dispatch_authorized";},
    f => {f.journal.reports[4].manualAccepted = true;}, f => {f.journal.dispatchPermissions = 9;},
    f => {f.journal.reports[2].attempts.push(structuredClone(f.journal.reports[1].attempts[1]));}]) {
    const fixture = completed(); mutate(fixture);
    assert.throws(() => validateFd124CompletedCorrection(fixture.options()));
  }
});
test("lineage, native output, request and ledger settlement must all agree", () => {
  for (const mutate of [f => {f.journal.reports[2].snapshotHash = "different";},
    f => {f.journal.reports[2].attempts[0].outputText = "different";},
    f => {f.ledger[1].trace = {requestSha256: "different"};},
    f => {f.ledger[3].settlement.outputSha256 = "different";},
    f => {f.ledger.splice(3, 1);}, f => {f.ledger[2].type = "release-attempt";},
    f => {f.journal.reports.reverse();}]) {
    const fixture = completed(); mutate(fixture);
    assert.throws(() => validateFd124CompletedCorrection(fixture.options()));
  }
});
test("the exact prefix allows only unique fixed rewrite transitions and preserves in-flight holds", () => {
  const prefix = completed().options().ledgerText;
  const reserve = {type: "reserve-attempt", id: "corrective", campaign: "v4.2-report", vnd: FD124_RESERVE_VND,
    attemptKey: fd124AttemptKey(FD124_CORRECTION_SLOTS[0], "rewrite")};
  const encode = values => prefix + values.map(value => JSON.stringify(value)).join("\n") + "\n";
  assertFd124CorrectionLedgerPrefix(prefix, prefix);
  assertFd124CorrectionLedgerPrefix(encode([reserve]), prefix);
  assertFd124CorrectionLedgerPrefix(encode([reserve, {type: "dispatch", id: "corrective"}]), prefix);
  assertFd124CorrectionLedgerPrefix(encode([reserve, {type: "dispatch", id: "corrective"}, {type: "settle-attempt", id: "corrective"}]), prefix);
  for (const entries of [[{...reserve, attemptKey: fd124AttemptKey("career_wealth:2", "rewrite")}],
    [reserve, {...reserve, id: "duplicate"}], [reserve, {type: "release-attempt", id: "corrective"}],
    [{type: "dispatch", id: "unreserved"}], [reserve, {type: "settle-attempt", id: "corrective"}]]) {
    assert.throws(() => assertFd124CorrectionLedgerPrefix(encode(entries), prefix));
  }
  assert.throws(() => assertFd124CorrectionLedgerPrefix(prefix.replace('"config"', '"other"'), prefix));
});

const schema = {parse: value => value, safeParse: value => ({success: true, data: value})};
function mockModules({reproduce = true} = {}) {
  const topicQuality = (value, facts) => value.corrected ? {ok: true, findings: []} : {ok: !reproduce,
    findings: reproduce ? [{code: "PALACE_FACTS", note: facts.slot.endsWith(":3") ? "Explicit brightness for Kình Dương" : "Explicit natal coordinate mismatch"}] : []};
  const periodQuality = value => value.corrected ? {ok: true, findings: []} : {ok: !reproduce, findings: reproduce ? ["CONTENT_LINE_VIOLATION"] : []};
  async function writer({facts, provider}) {
    const original = await provider.generateStructured({purpose: "report", schema, schemaName: "fixture", system: "bounded", user: JSON.stringify({facts}), maxOutputTokens: 100});
    assert(original.ok);
    let quality = facts.group === "relationship_marriage" ? topicQuality(original.value.value, facts) : periodQuality(original.value.value);
    if (quality.ok) return {ok: true, value: {content: original.value.value, quality}};
    const rewritten = await provider.generateStructured({purpose: "rewrite", schema, schemaName: "fixture", system: "bounded", user: JSON.stringify({facts, prior: original.value.value}), maxOutputTokens: 100});
    if (!rewritten.ok) return rewritten;
    quality = facts.group === "relationship_marriage" ? topicQuality(rewritten.value.value, facts) : periodQuality(rewritten.value.value);
    return {ok: true, value: {content: rewritten.value.value, quality}};
  }
  return {contracts: {z: {toJSONSchema: () => ({})}}, backend: {validateZiweiTopicDeepDiveQualityV4: topicQuality,
    validatePeriodReading: periodQuality, writePeriodReading: writer, generateZiweiTopicDeepDiveWithQualityLoopV4: writer}};
}
async function prepared(fixture, modules) {
  return Promise.all(FD124_CORRECTION_SLOTS.map(async slot => {
    const input = fixture.inputs.find(input => `${input.group}:${input.index}` === slot), original = fixture.journal.reports.find(row => row.slot === slot);
    return {input, original, ...await prepareFd124Correction(input, original, modules)};
  }));
}
test("cached first responses reproduce each specific defect with zero native calls", async () => {
  const fixture = completed(), modules = mockModules(), results = await prepared(fixture, modules);
  assert.equal(results.length, 3); assert(results.every(result => result.rewrite.purpose === "rewrite"));
  assert.equal(fixture.journal.reports.reduce((sum, row) => sum + row.attempts.length, 0), 8);
  await assert.rejects(() => prepared(fixture, mockModules({reproduce: false})), {code: "FD124_CORRECTION_DEFECT_NOT_REPRODUCED"});
  const item = results[0];
  await assert.rejects(() => prepareFd124Correction({...item.input, group: "career_wealth"}, item.original, modules));
  const changed = structuredClone(item.original); changed.attempts[0].parsedSha256 = "different";
  await assert.rejects(() => prepareFd124Correction(item.input, changed, modules), {code: "FD124_CORRECTION_OUTPUT_CHANGED"});
});
test("one cached report plus one accounted actual rewrite per fixed slot preserves the original journal", async () => {
  const fixture = completed(), modules = mockModules(), originals = JSON.stringify(fixture.journal), plans = await prepared(fixture, modules);
  let actualCalls = 0;
  const manifest = {status: "running", reports: []}, snapshots = [], save = value => snapshots.push(structuredClone(value));
  await runFd124Corrections({prepared: plans, manifest, save, modules, providerFor: row => fd124Provider({row, manifest, save, budget: {}, modules, unchanged() {},
    runAttempt: async () => {actualCalls++; const outputText = JSON.stringify({corrected: true});
      return {outputText, outputSha256: hash(outputText), quote: {quoteVnd: String(FD124_RESERVE_VND), quoteMicroVnd: "33368000000"}};}})});
  assert.equal(actualCalls, 3); assert.equal(manifest.status, "complete_pending_manual_review");
  assert(manifest.reports.every(row => row.attempts.length === 2 && !row.manualAccepted));
  assert.equal(JSON.stringify(fixture.journal), originals); assert(snapshots.length > 3);
});
test("an ambiguous rewrite stops immediately with no retry or later slot dispatch", async () => {
  const fixture = completed(), modules = mockModules(), plans = await prepared(fixture, modules), manifest = {status: "running", reports: []};
  let actualCalls = 0;
  await runFd124Corrections({prepared: plans, manifest, save() {}, modules, providerFor: row => fd124Provider({row, manifest, save() {}, budget: {}, modules, unchanged() {},
    runAttempt: async () => {actualCalls++; throw Object.assign(new Error("ambiguous"), {code: "ROUTER_RESULT_MISSING", reservationId: "open-hold"});}})});
  assert.equal(actualCalls, 1); assert.equal(manifest.status, "stopped"); assert.equal(manifest.reports.length, 1);
  assert.equal(manifest.reports[0].attempts[1].reservationId, "open-hold");
});
test("a complete but schema-invalid rewrite cannot receive a third attempt", async () => {
  const fixture = completed(), modules = mockModules(), plans = await prepared(fixture, modules), manifest = {status: "running", reports: []};
  modules.contracts.z.toJSONSchema = () => ({});
  let actualCalls = 0;
  await runFd124Corrections({prepared: plans, manifest, save() {}, modules, providerFor: row => fd124Provider({row, manifest, save() {}, budget: {}, modules, unchanged() {},
    runAttempt: async () => {actualCalls++; return {outputText: "invalid complete output", quote: {quoteVnd: String(FD124_RESERVE_VND)}};}})});
  assert.equal(actualCalls, 3); assert.equal(manifest.status, "complete_with_rejections");
  assert(manifest.reports.every(row => row.attempts.length === 2 && row.attempts[1].formatStatus === "invalid_complete_accounted_output"));
});
test("once intent is exclusive; correction checkpoints append without replacing history and refuse unsafe paths", () => {
  const root = mkdtempSync(join(tmpdir(), "fd124-corrections-")), oldRoot = join(root, "old"), newRoot = join(root, "new");
  mkdirSync(oldRoot, {mode: 0o700}); mkdirSync(newRoot, {mode: 0o700});
  const options = {oldRoot, newRoot}, once = join(newRoot, "once"), journal = join(newRoot, "journal.jsonl");
  createFd124CorrectionOnce(once, {intent: true}, options);
  assert.throws(() => createFd124CorrectionOnce(once, {intent: false}, options), {code: "EEXIST"});
  appendFd124CorrectionCheckpoint(journal, {status: "running"}, options); const first = readFileSync(journal, "utf8");
  appendFd124CorrectionCheckpoint(journal, {status: "stopped"}, options);
  assert(readFileSync(journal, "utf8").startsWith(first)); assert.equal(readFd124CorrectionPrivate(journal, options).trim().split("\n").length, 2);
  const authority = join(oldRoot, "authority"); writeFileSync(authority, "immutable", {mode: 0o600});
  assert.throws(() => appendFd124CorrectionCheckpoint(authority, {}, options));
  symlinkSync(journal, join(newRoot, "symlink")); assert.throws(() => readFd124CorrectionPrivate(join(newRoot, "symlink"), options));
  linkSync(journal, join(newRoot, "hardlink")); assert.throws(() => appendFd124CorrectionCheckpoint(journal, {}, options));
});
