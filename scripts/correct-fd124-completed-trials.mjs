#!/usr/bin/env node
import {parseArgs} from "node:util";
import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
import {closeSync, constants, existsSync, fstatSync, fsyncSync, lstatSync, openSync, readFileSync, writeFileSync} from "node:fs";
import {dirname, join, resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {FD121_ROOT} from "./lib/prod-9router-attempt.mjs";
import {createCampaignBudget} from "./lib/campaign-budget.mjs";
import {FD124_POLICY, FD124_SLOTS, FD124_RESERVE_VND, FD124_TECHNICAL_CAP_VND, fd124AttemptKey} from "./lib/fd124-replacement-trials.mjs";
import {FD124_ROOT, FD124_OLD_AUTHORITIES, assertFd124Authorities, assertFd124Path, assertFd124FrozenInputs,
  buildFd124Inputs, durableFd124Save, fd124InputProjection, fd124Provider} from "./run-replacement-paid-trials.mjs";
import {acquireTrialRunnerLock} from "./run-paid-manual-trials.mjs";
import {normalizeTrialJson} from "./continue-paid-manual-trials.mjs";

export const FD124_CORRECTION_SLOTS = Object.freeze(["next_annual:1", "relationship_marriage:2", "relationship_marriage:3"]);
export const FD124_COMPLETED_HASHES = Object.freeze({
  journal: "bd274050c57c439e61cc082acb7256bfd3786a4693fc26d191948158ad44cbdf",
  ledger: "801fee2a12127ec9a1861503b0a8e0901783ef678d631b075558b127f9e16257",
  stop: "bca3cc1f567c8d953b6bdf74b75d1e4c0fd2e3ac64817fe0a7b438653d51d5c3",
  frozen: "a46e8b878dacf63f01d657e46ab55b49a066f34bf2a77914e6ca31fc1ed696d9",
});
const hash = value => createHash("sha256").update(value).digest("hex");
const fail = code => {throw Object.assign(new Error(code), {code});};
const JOURNAL = join(FD124_ROOT, "reports.json"), LEDGER = join(FD124_ROOT, "budget.jsonl");
const CORRECTIONS = join(FD124_ROOT, "manual-corrections.jsonl"), ONCE = join(FD124_ROOT, "manual-corrections-once.json");
const FROZEN = new URL("../plan/evidence/2026-10-10-fd124-frozen-inputs.json", import.meta.url);
const correctionRowProjection = row => Object.fromEntries(["slot", "group", "index", "snapshotHash", "factsSha256", "targetYear", "chartVersionId", "sourceKind", "timingRuleVersion"].map(key => [key, row[key]]));

export function assertFd124CorrectionLedgerPrefix(current, original) {
  if (!original.endsWith("\n") || !current.startsWith(original)) fail("FD124_CORRECTION_LEDGER_PREFIX_CHANGED");
  const records = current.slice(original.length).trim();
  const attempts = new Map(), keys = new Set();
  for (const entry of records ? records.split("\n").map(line => JSON.parse(line)) : []) {
    const prior = attempts.get(entry.id);
    if (entry.type === "reserve-attempt" && !prior && FD124_CORRECTION_SLOTS.some(slot => fd124AttemptKey(slot, "rewrite") === entry.attemptKey) &&
        !keys.has(entry.attemptKey) && entry.campaign === "v4.2-report" && entry.vnd === FD124_RESERVE_VND && attempts.size < 3) {
      attempts.set(entry.id, {phase: "reserve"}); keys.add(entry.attemptKey);
    } else if (entry.type === "dispatch" && prior?.phase === "reserve") prior.phase = "dispatch";
    else if (entry.type === "settle-attempt" && prior?.phase === "dispatch") prior.phase = "settled";
    else fail("FD124_CORRECTION_LEDGER_EXTENSION_INVALID");
  }
}

export function readFd124CorrectionPrivate(path, options = {}) {
  assertFd124Path(path, {...options, privateStorage: true});
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = fstatSync(fd), leaf = lstatSync(path);
    if (!stat.isFile() || stat.nlink !== 1 || stat.uid !== process.getuid() || (stat.mode & 0o077) ||
        stat.dev !== leaf.dev || stat.ino !== leaf.ino || stat.size > 8_000_000) fail("FD124_CORRECTION_STORAGE_UNSAFE");
    return readFileSync(fd, "utf8");
  } finally {closeSync(fd);}
}

export function validateFd124CompletedCorrection({journalText, ledgerText, inputs, state, expected = FD124_COMPLETED_HASHES}) {
  if (hash(journalText) !== expected.journal || hash(ledgerText) !== expected.ledger) fail("FD124_COMPLETED_AUTHORITY_CHANGED");
  const original = JSON.parse(journalText), ledger = ledgerText.trim().split("\n").map(line => JSON.parse(line));
  if (original.campaign !== FD124_POLICY || original.ownerDecision !== "FD-124" || original.status !== "complete_with_rejections" ||
      original.asOfDate !== "2026-10-09" || original.maxPhysicalAttempts !== 12 || original.manualAccepted !== false ||
      original.dispatchPermissions !== 8 || original.frozenInputsSha256 !== expected.frozen ||
      JSON.stringify(original.oldAuthorityHashes) !== JSON.stringify(FD124_OLD_AUTHORITIES) ||
      original.reports?.length !== 6 || JSON.stringify(original.reports.map(row => row.slot)) !== JSON.stringify(FD124_SLOTS) ||
      state?.openReservations !== 0 || state.totalVnd !== 8 * FD124_RESERVE_VND || state.capVnd !== FD124_TECHNICAL_CAP_VND ||
      original.budget?.openReservations !== 0 || original.budget?.totalVnd !== state.totalVnd || original.budget?.capVnd !== state.capVnd) fail("FD124_COMPLETED_STATE_INVALID");
  const config = ledger[0];
  if (ledger.length !== 25 || config?.type !== "config" || config.version !== 2 || config.referenceContinuation !== FD124_POLICY ||
      config.totalCapVnd !== FD124_TECHNICAL_CAP_VND || config.allocationVnd !== FD124_TECHNICAL_CAP_VND || config.settleActualUsage !== true) fail("FD124_COMPLETED_LEDGER_INVALID");
  const transitions = new Map();
  for (const entry of ledger.slice(1)) {
    const prior = transitions.get(entry.id);
    if (entry.type === "reserve-attempt" && !prior) transitions.set(entry.id, {reserve: entry, phase: "reserve"});
    else if (entry.type === "dispatch" && prior?.phase === "reserve") prior.phase = "dispatch";
    else if (entry.type === "settle-attempt" && prior?.phase === "dispatch") {prior.phase = "settled"; prior.settlement = entry.settlement;}
    else fail("FD124_COMPLETED_LEDGER_INVALID");
  }
  const usedIds = new Set(), usedKeys = new Set();
  for (const [index, row] of original.reports.entries()) {
    if (row.manualAccepted !== false || !["quality_passed_pending_manual_review", "rejected"].includes(row.status) ||
        JSON.stringify(correctionRowProjection(row)) !== JSON.stringify(fd124InputProjection(inputs[index])) ||
        !Array.isArray(row.attempts) || ![1, 2].includes(row.attempts.length)) fail("FD124_COMPLETED_ROW_INVALID");
    for (const [attemptIndex, attempt] of row.attempts.entries()) {
      const purpose = attemptIndex ? "rewrite" : "report", record = transitions.get(attempt.reservationId);
      if (attempt.purpose !== purpose || attempt.attemptKey !== fd124AttemptKey(row.slot, purpose) || usedIds.has(attempt.reservationId) ||
          usedKeys.has(attempt.attemptKey) || attempt.status !== "reference_settled" || attempt.formatStatus !== "schema_valid" ||
          typeof attempt.outputText !== "string" || hash(attempt.outputText) !== attempt.outputSha256 ||
          record?.phase !== "settled" || record.reserve.attemptKey !== attempt.attemptKey || record.reserve.vnd !== FD124_RESERVE_VND ||
          record.reserve.trace?.requestSha256 !== attempt.trace?.requestSha256 || record.settlement?.outputSha256 !== attempt.outputSha256 ||
          Number(attempt.quote?.quoteVnd) !== FD124_RESERVE_VND) fail("FD124_COMPLETED_ATTEMPT_INVALID");
      usedIds.add(attempt.reservationId); usedKeys.add(attempt.attemptKey);
    }
  }
  if (usedIds.size !== 8 || transitions.size !== 8) fail("FD124_COMPLETED_LEDGER_INVALID");
  for (const slot of FD124_CORRECTION_SLOTS) {
    const row = original.reports.find(row => row.slot === slot);
    if (row.attempts.length !== 1 || usedKeys.has(fd124AttemptKey(slot, "rewrite"))) fail("FD124_CORRECTION_EXHAUSTED");
  }
  return original;
}

function generate(input, provider, modules) {
  return input.group === "relationship_marriage"
    ? modules.backend.generateZiweiTopicDeepDiveWithQualityLoopV4({topicId: input.group, facts: input.facts, knowledgePacks: [], provider, maxRewriteAttempts: 1})
    : modules.backend.writePeriodReading({facts: input.facts, provider});
}
export async function prepareFd124Correction(input, row, modules) {
  if (!FD124_CORRECTION_SLOTS.includes(row.slot) || row.slot !== `${input.group}:${input.index}` || row.attempts?.length !== 1) fail("FD124_CORRECTION_SLOT_INVALID");
  let calls = 0, cached, rewrite;
  await generate(input, {async generateStructured(request) {
    calls++;
    if (calls === 1 && request.purpose === "report") {
      const normalized = normalizeTrialJson(row.attempts[0].outputText);
      if (normalized.parsedSha256 !== row.attempts[0].parsedSha256) fail("FD124_CORRECTION_OUTPUT_CHANGED");
      cached = request.schema.parse(normalized.value);
      const quality = input.group === "relationship_marriage"
        ? modules.backend.validateZiweiTopicDeepDiveQualityV4(cached, input.facts)
        : modules.backend.validatePeriodReading(cached, input.facts);
      const findings = quality.findings;
      const required = row.slot === "next_annual:1"
        ? findings.includes("CONTENT_LINE_VIOLATION") && JSON.stringify(cached).normalize("NFC").includes("trường thọ")
        : findings.some(finding => finding.code === "PALACE_FACTS" &&
          (row.slot === "relationship_marriage:3" ? finding.note.includes("Kình Dương") : /Explicit (?:natal coordinate|branch opposition)/u.test(finding.note)));
      if (quality.ok || !required) fail("FD124_CORRECTION_DEFECT_NOT_REPRODUCED");
      return {ok: true, value: {value: cached, providerId: "immutable-accounted-cache", modelId: "immutable-accounted-cache"}};
    }
    if (calls !== 2 || request.purpose !== "rewrite" || rewrite) fail("FD124_CORRECTION_REQUEST_INVALID");
    rewrite = request;
    return {ok: false, error: {code: "AI_PROVIDER_REQUEST_FAILED", retryable: false}};
  }}, modules);
  if (calls !== 2 || !cached || !rewrite) fail("FD124_CORRECTION_REQUEST_INVALID");
  return {cached, rewrite};
}

export async function runFd124Corrections({prepared, manifest, save, providerFor, modules}) {
  for (const item of prepared) {
    const row = {...fd124InputProjection(item.input), status: "prepared", attempts: structuredClone(item.original.attempts), manualAccepted: false};
    manifest.reports.push(row); save(manifest);
    let cachedCalls = 0, rewriteCalls = 0;
    const live = providerFor(row);
    const result = await generate(item.input, {async generateStructured(request) {
      if (request.purpose === "report" && cachedCalls++ === 0 && rewriteCalls === 0) {
        return {ok: true, value: {value: item.cached, providerId: "immutable-accounted-cache", modelId: "immutable-accounted-cache"}};
      }
      if (request.purpose !== "rewrite" || cachedCalls !== 1 || rewriteCalls++ !== 0 || request.user !== item.rewrite.user ||
          request.system !== item.rewrite.system || request.schemaName !== item.rewrite.schemaName || request.maxOutputTokens !== item.rewrite.maxOutputTokens) fail("FD124_CORRECTION_REQUEST_CHANGED");
      return live.generateStructured(request);
    }}, modules);
    Object.assign(row, {result, status: result.ok && result.value.quality.ok ? "quality_passed_pending_manual_review" : "rejected"});
    if (row.attempts.length !== 2 || row.attempts.some(attempt => attempt.status !== "reference_settled")) {
      manifest.status = "stopped"; manifest.stopSlot = row.slot; save(manifest); return;
    }
    save(manifest);
  }
  manifest.status = manifest.reports.every(row => row.status === "quality_passed_pending_manual_review") ? "complete_pending_manual_review" : "complete_with_rejections";
  save(manifest);
}

export function createFd124CorrectionOnce(path, intent, options = {}) {
  assertFd124Path(path, {...options, privateStorage: true});
  const fd = openSync(path, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
  try {writeFileSync(fd, JSON.stringify(intent) + "\n"); fsyncSync(fd);} finally {closeSync(fd);}
  const directory = openSync(dirname(path), constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
  try {fsyncSync(directory);} finally {closeSync(directory);}
}

export function appendFd124CorrectionCheckpoint(path, value, {check = () => {}, ...options} = {}) {
  check(); assertFd124Path(path, {...options, privateStorage: true});
  const present = existsSync(path), data = JSON.stringify({kind: "checkpoint", manifest: value}) + "\n";
  const fd = openSync(path, constants.O_WRONLY | constants.O_APPEND | constants.O_NOFOLLOW |
    (present ? 0 : constants.O_CREAT | constants.O_EXCL), 0o600);
  try {
    const stat = fstatSync(fd), leaf = lstatSync(path);
    if (!stat.isFile() || stat.nlink !== 1 || stat.uid !== process.getuid() || (stat.mode & 0o077) ||
        stat.dev !== leaf.dev || stat.ino !== leaf.ino || stat.size + Buffer.byteLength(data) > 64_000_000) fail("FD124_CORRECTION_STORAGE_UNSAFE");
    writeFileSync(fd, data); fsyncSync(fd);
  } finally {closeSync(fd);}
  const directory = openSync(dirname(path), constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
  try {fsyncSync(directory);} finally {closeSync(directory);}
  check();
}

async function main(args) {
  const {values} = parseArgs({args, options: {live: {type: "boolean", default: false}, dryRun: {type: "boolean", default: false}, output: {type: "string"}}});
  if (values.live === values.dryRun || !values.output || process.getuid() !== 1000) fail("FD124_CORRECTION_MODE_INVALID");
  const output = assertFd124Path(values.output);
  const lockPath = join(FD121_ROOT, "runner.lock"), descriptor = openSync(lockPath, constants.O_RDWR | constants.O_NOFOLLOW);
  try {
    acquireTrialRunnerLock(descriptor, lockPath);
    assertFd124Authorities();
    for (const path of [ONCE, CORRECTIONS, `${CORRECTIONS}.next`]) {
      assertFd124Path(path, {privateStorage: true});
      if (existsSync(path)) fail("FD124_CORRECTION_RESTART_REFUSED");
    }
    const originalText = readFd124CorrectionPrivate(JOURNAL), ledgerPrefix = readFd124CorrectionPrivate(LEDGER);
    if (hash(readFd124CorrectionPrivate(join(FD124_ROOT, "known-zero-send-stop.json"))) !== FD124_COMPLETED_HASHES.stop ||
        hash(readFileSync(FROZEN)) !== FD124_COMPLETED_HASHES.frozen) fail("FD124_CORRECTION_SOURCE_CHANGED");
    const modules = {backend: await import("../packages/backend/dist/index.js"), contracts: await import("../packages/contracts/dist/index.js"),
      engine: await import("../packages/engine-adapters/dist/index.js"), topicConfig: await import("../packages/backend/dist/reports/topic-report-config.js")};
    const qualityVersions = {topic: modules.topicConfig.topicReportVersions().qualityVersion, period: modules.backend.PERIOD_READING_TUPLE.qualityVersion};
    if (qualityVersions.topic !== "ziwei.topic-deep-dive.quality.v5" || qualityVersions.period !== "ziwei.period-reading.quality.v4") fail("FD124_CORRECTED_QUALITY_REQUIRED");
    const preflight = JSON.parse(readFileSync(new URL("../plan/evidence/2026-10-09-fd121-paid-trials-preflight.json", import.meta.url), "utf8"));
    const inputs = await buildFd124Inputs(modules, preflight);
    assertFd124FrozenInputs(inputs, JSON.parse(readFileSync(FROZEN, "utf8")));
    const budget = createCampaignBudget({ledgerPath: LEDGER, totalCapVnd: FD124_TECHNICAL_CAP_VND, allocationsVnd: {"v4.2-report": FD124_TECHNICAL_CAP_VND}, settleActualUsage: true, referenceContinuation: FD124_POLICY});
    const original = validateFd124CompletedCorrection({journalText: originalText, ledgerText: ledgerPrefix, inputs, state: budget.status()});
    const unchanged = () => {
      assertFd124Authorities();
      assertFd124CorrectionLedgerPrefix(readFd124CorrectionPrivate(LEDGER), ledgerPrefix);
      if (readFd124CorrectionPrivate(JOURNAL) !== originalText ||
          hash(readFd124CorrectionPrivate(join(FD124_ROOT, "known-zero-send-stop.json"))) !== FD124_COMPLETED_HASHES.stop ||
          hash(readFileSync(FROZEN)) !== FD124_COMPLETED_HASHES.frozen) fail("FD124_CORRECTION_AUTHORITY_CHANGED");
    };
    const prepared = [];
    for (const slot of FD124_CORRECTION_SLOTS) {
      const input = inputs.find(input => `${input.group}:${input.index}` === slot), row = original.reports.find(row => row.slot === slot);
      prepared.push({input, original: row, ...await prepareFd124Correction(input, row, modules)});
    }
    unchanged();
    if (values.dryRun) {
      durableFd124Save(output, {status: "dry_run_not_acceptance", campaign: FD124_POLICY, slots: FD124_CORRECTION_SLOTS, originalAuthorityHashes: FD124_COMPLETED_HASHES,
        originalPhysicalSendPermissions: 8, maxNewPhysicalAttempts: 3, maxTotalPhysicalAttempts: 11, physicalDispatches: 0, originalJournalUnchanged: true}, {check: unchanged});
      console.log(JSON.stringify({status: "dry_run_not_acceptance", slots: 3, physicalDispatches: 0})); return;
    }
    const sourceRoot = fileURLToPath(new URL("../", import.meta.url));
    const git = args => execFileSync("git", args, {cwd: sourceRoot, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"]}).trim();
    if (git(["status", "--porcelain"])) fail("FD124_CORRECTION_SOURCE_DIRTY");
    const sourceIdentity = {commit: git(["rev-parse", "HEAD"]), tree: git(["rev-parse", "HEAD^{tree}"]),
      cliSha256: hash(readFileSync(fileURLToPath(import.meta.url))),
      compiled: Object.fromEntries(["topic-deep-dive-quality-v4", "period-reading-writer", "reading-content-line", "topic-report-config"]
        .map(name => [name, hash(readFileSync(new URL(`../packages/backend/dist/reports/${name}.js`, import.meta.url)))]))};
    createFd124CorrectionOnce(ONCE, {kind: "FD124-known-complete-unused-corrections-v1", originalAuthorityHashes: FD124_COMPLETED_HASHES,
      sourceIdentity, slots: FD124_CORRECTION_SLOTS, createdAt: new Date().toISOString()});
    unchanged();
    const manifest = {campaign: FD124_POLICY, ownerDecision: "FD-124", kind: "FD124-known-complete-unused-corrections-v1", status: "running", manualAccepted: false,
      originalAuthorityHashes: FD124_COMPLETED_HASHES, slots: FD124_CORRECTION_SLOTS, maxNewPhysicalAttempts: 3, maxTotalPhysicalAttempts: 11,
      sourceIdentity,
      qualityVersions, reports: []};
    const save = value => appendFd124CorrectionCheckpoint(CORRECTIONS, value, {check: unchanged});
    save(manifest);
    await runFd124Corrections({prepared, manifest, save, modules,
      providerFor: row => fd124Provider({row, manifest, save, budget, modules, unchanged})});
    manifest.budget = budget.status();
    const entries = readFd124CorrectionPrivate(LEDGER).trim().split("\n").map(line => JSON.parse(line));
    manifest.totalPhysicalSendPermissions = entries.filter(entry => entry.type === "dispatch").length;
    if (manifest.totalPhysicalSendPermissions > 11) fail("FD124_CORRECTION_SEND_BOUND_EXCEEDED");
    if (manifest.status !== "stopped" && manifest.budget.openReservations !== 0) fail("FD124_CORRECTION_ACCOUNTING_UNRESOLVED");
    save(manifest);
    durableFd124Save(output, {campaign: FD124_POLICY, kind: manifest.kind, status: manifest.status, manualAccepted: false,
      originalAuthorityHashes: FD124_COMPLETED_HASHES, originalJournalUnchanged: true, originalLedgerPrefixUnchanged: true,
      totalPhysicalSendPermissions: manifest.totalPhysicalSendPermissions, budget: manifest.budget, stopSlot: manifest.stopSlot,
      sourceIdentity, reports: manifest.reports.map(row => ({...correctionRowProjection(row), status: row.status, manualAccepted: false,
        quality: row.result?.ok ? row.result.value.quality : {ok: false, code: row.result?.error?.code, findings: row.result?.findings},
        attempts: row.attempts.map(attempt => ({purpose: attempt.purpose, status: attempt.status, attemptKey: attempt.attemptKey,
          requestSha256: attempt.trace?.requestSha256, outputSha256: attempt.outputSha256, errorCode: attempt.errorCode,
          formatStatus: attempt.formatStatus, referenceVnd: attempt.quote?.quoteVnd, providerBillingVerified: false}))}))}, {check: unchanged});
    console.log(JSON.stringify({status: manifest.status, totalPhysicalSendPermissions: manifest.totalPhysicalSendPermissions, budget: manifest.budget}));
  } finally {closeSync(descriptor); assertFd124Authorities();}
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(error => {console.error(JSON.stringify({status: "stopped", code: /^\w+$/.test(error.code ?? "") ? error.code : "FD124_CORRECTION_FAILED"})); process.exitCode = 1;});
}
