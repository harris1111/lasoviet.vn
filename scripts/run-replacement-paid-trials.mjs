#!/usr/bin/env node
import { parseArgs } from "node:util";
import { createHash } from "node:crypto";
import { closeSync, constants, existsSync, fstatSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { FD121_ROOT, runProdRouterAttempt } from "./lib/prod-9router-attempt.mjs";
import { createCampaignBudget } from "./lib/campaign-budget.mjs";
import { FD123_MODEL_BOUND_MODE } from "./lib/fd123-reference-continuation.mjs";
import { FD124_POLICY, FD124_SLOTS, FD124_OUTPUT_TOKENS, FD124_TECHNICAL_CAP_VND, fd124AttemptKey } from "./lib/fd124-replacement-trials.mjs";
import { makePaidTrialInput, makeFreshPaidTrialInput, acquireTrialRunnerLock } from "./run-paid-manual-trials.mjs";
import { normalizeTrialJson, paidTrialSchemaInstruction } from "./continue-paid-manual-trials.mjs";

export const FD124_ROOT = "/home/debian/.lasoviet/fd124-replacement-trials";
const JOURNAL = join(FD124_ROOT, "reports.json");
const FROZEN = new URL("../plan/evidence/2026-10-10-fd124-frozen-inputs.json", import.meta.url);
export const FD124_OLD_AUTHORITIES = Object.freeze({
  "reports.json": "16edf0e65dfc0689b86295ff62de6db49b13e3fea067033bb2c8d568a131ed05",
  "budget.jsonl": "693400c0fad865828e03dda94f9ada234afd4dbb6d8e6f4cb6f50a411d6280f5",
  "fd123-continuation/reports.json": "b1d0f876f7acfae79ce894e9eff41d7fd5b56b1b19b9ca66c28d069e5bc19fa2",
  "fd123-continuation/budget.jsonl": "1496236a197afb8e3362113cf45d093d69d495b41c1eed6ec8b8690189367b14",
});
const hash = value => createHash("sha256").update(value).digest("hex");
const fail = code => { throw Object.assign(new Error(code), { code }); };
const inside = (value, root) => value === root || value.startsWith(`${root}${sep}`);
export function assertFd124Path(path, { privateStorage = false, oldRoot = FD121_ROOT, newRoot = FD124_ROOT } = {}) {
  const target = resolve(path);
  if (inside(target, resolve(oldRoot)) || (!privateStorage && inside(target, resolve(newRoot)))) fail("FD124_PATH_FORBIDDEN");
  let current = target;
  while (true) {
    if (existsSync(current)) {
      const stat = lstatSync(current);
      if (stat.isSymbolicLink() || (!stat.isDirectory() && (!stat.isFile() || stat.nlink !== 1)) ||
          (privateStorage && inside(current, dirname(resolve(newRoot))) && (stat.uid !== process.getuid() || (stat.mode & 0o077)))) fail("FD124_STORAGE_UNSAFE");
    } else {
      try { lstatSync(current); fail("FD124_STORAGE_UNSAFE"); } catch (error) { if (error.code !== "ENOENT") throw error; }
    }
    const parent = dirname(current);
    if (current === parent) break;
    current = parent;
  }
  return target;
}
function privateRead(path) {
  // Authorities may live under the old root; perform the same strict inode checks.
  let ancestor = dirname(path);
  while (true) {
    if (!lstatSync(ancestor).isDirectory()) fail("FD124_STORAGE_UNSAFE");
    const parent = dirname(ancestor); if (ancestor === parent) break; ancestor = parent;
  }
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = fstatSync(fd), leaf = lstatSync(path);
    if (!stat.isFile() || stat.nlink !== 1 || stat.uid !== process.getuid() || (stat.mode & 0o077) || stat.dev !== leaf.dev || stat.ino !== leaf.ino || stat.size > 8000000) fail("FD124_STORAGE_UNSAFE");
    return readFileSync(fd, "utf8");
  } finally { closeSync(fd); }
}
export function assertFd124Authorities(root = FD121_ROOT, expected = FD124_OLD_AUTHORITIES) {
  for (const [path, digest] of Object.entries(expected)) if (hash(privateRead(join(root, path))) !== digest) fail("FD124_OLD_AUTHORITY_CHANGED");
}
export function durableFd124Save(path, value, { privateStorage = false, check = () => {}, oldRoot, newRoot } = {}) {
  check(); assertFd124Path(path, { privateStorage, oldRoot, newRoot });
  const temporary = `${path}.next`;
  assertFd124Path(temporary, { privateStorage, oldRoot, newRoot });
  const fd = openSync(temporary, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
  try { writeFileSync(fd, JSON.stringify(value, null, 2) + "\n"); fsyncSync(fd); } finally { closeSync(fd); }
  assertFd124Path(path, { privateStorage, oldRoot, newRoot });
  renameSync(temporary, path);
  const directory = openSync(dirname(path), constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
  try { fsyncSync(directory); } finally { closeSync(directory); }
  check();
}
export const fd124InputProjection = input => ({ slot: `${input.group}:${input.index}`, group: input.group, index: input.index,
  snapshotHash: input.snapshotHash, factsSha256: hash(JSON.stringify(input.facts)), targetYear: input.targetYear,
  chartVersionId: input.chartVersionId, sourceKind: input.sourceKind, timingRuleVersion: input.timingRuleVersion });
export async function buildFd124Inputs(modules, preflight) {
  const inputs = [];
  for (const slot of FD124_SLOTS) {
    const [group, text] = slot.split(":"), index = Number(text);
    const input = await (index < 2 ? makePaidTrialInput : makeFreshPaidTrialInput)(group, index, "2026-10-09", modules);
    if (index < 2) {
      const original = preflight.inputs.find(row => row.group === group && row.index === index);
      if (!original || original.snapshotHash !== input.snapshotHash || original.factsSha256 !== hash(JSON.stringify(input.facts))) fail("FD124_ANNUAL_SOURCE_CHANGED");
    }
    inputs.push(input);
  }
  const fresh = inputs.slice(3);
  if (fresh[0].snapshotHash !== fresh[1].snapshotHash || fresh[1].snapshotHash === fresh[2].snapshotHash ||
      fresh.some(input => preflight.inputs.some(old => old.snapshotHash === input.snapshotHash))) fail("FD124_FRESH_PROFILE_INVALID");
  return inputs;
}
export function assertFd124FrozenInputs(inputs, frozen) {
  if (frozen?.campaign !== FD124_POLICY || frozen.asOfDate !== "2026-10-09" || frozen.physicalDispatches !== 0 ||
      JSON.stringify(frozen.inputs) !== JSON.stringify(inputs.map(fd124InputProjection))) fail("FD124_FROZEN_INPUT_CHANGED");
}
export function assertFd124FreshCampaign({ journalExists, markerExists, state }) {
  if (journalExists || markerExists || state.totalVnd !== 0 || state.openReservations !== 0) fail("FD124_RESTART_REQUIRES_RECONCILIATION");
}

export function fd124Provider({ row, manifest, save, budget, modules, unchanged, runAttempt = runProdRouterAttempt }) {
  return { async generateStructured(request) {
    if (row.attempts.length >= 2 || request.purpose !== (row.attempts.length ? "rewrite" : "report")) return { ok: false, error: { code: "AI_PROVIDER_REQUEST_FAILED", retryable: false } };
    let formatFailure;
    while (row.attempts.length < 2) {
      const purpose = row.attempts.length ? "rewrite" : "report";
      unchanged();
      const attempt = { attemptKey: fd124AttemptKey(row.slot, purpose), purpose, status: "preparing" };
      row.attempts.push(attempt); save(manifest);
      try {
        const native = await runAttempt({
          system: `${request.system}\n${paidTrialSchemaInstruction(modules.contracts.z.toJSONSchema(request.schema))}`,
          user: formatFailure ? JSON.stringify({ originalRequest: request.user, correctiveRewrite: { reason: "Return the exact product JSON schema without annotations or extra fields.", priorOutput: formatFailure } }) : request.user,
          maxOutputTokens: FD124_OUTPUT_TOKENS, attemptKey: attempt.attemptKey, budget, referenceContinuation: true, referenceMode: FD123_MODEL_BOUND_MODE,
          onPrepared: trace => { unchanged(); Object.assign(attempt, trace, { status: "dispatch_pending" }); save(manifest); },
          onDispatchReady: checkpoint => { unchanged(); Object.assign(attempt, checkpoint, { status: "dispatch_authorized" }); save(manifest); },
          onReceipt: receipt => { unchanged(); Object.assign(attempt, receipt, { status: "native_received_pending_accounting" }); save(manifest); },
        });
        Object.assign(attempt, native, { status: "reference_settled" }); save(manifest);
        let parsed, normalized;
        try { normalized = normalizeTrialJson(native.outputText); parsed = request.schema.safeParse(normalized.value); } catch { /* Complete accounted output may receive its one format correction. */ }
        if (!parsed?.success) {
          attempt.formatStatus = "invalid_complete_accounted_output"; save(manifest);
          formatFailure = native.outputText;
          if (row.attempts.length < 2) continue;
          return { ok: false, error: { code: "AI_OUTPUT_INVALID", retryable: false } };
        }
        Object.assign(attempt, { formatStatus: "schema_valid", rawSha256: normalized.rawSha256, parsedSha256: normalized.parsedSha256, normalization: normalized.normalization }); save(manifest);
        return { ok: true, value: { value: parsed.data, providerId: "9router-antigravity-native", modelId: "gemini-3.8-flash-medium",
          usage: { tokensUnknown: native.quote.tokensUnknown ?? false, costStatus: "resolved", costMicroVnd: native.quote.quoteMicroVnd, costVnd: Number(native.quote.quoteVnd) } } };
      } catch (error) {
        Object.assign(attempt, { status: "stopped", errorCode: /^\w+$/.test(error.code ?? "") ? error.code : "FD124_ATTEMPT_FAILED",
          ...(error.reservationId ? { reservationId: error.reservationId } : {}),
          ...(error.accountingEvidence ? { accountingEvidence: error.accountingEvidence } : {}),
          ...(error.failureDiagnostic ? { failureDiagnostic: error.failureDiagnostic } : {}) });
        manifest.status = "stopped"; manifest.stopSlot = row.slot; save(manifest);
        return { ok: false, error: { code: "AI_PROVIDER_REQUEST_FAILED", retryable: false } };
      }
    }
    return { ok: false, error: { code: "AI_OUTPUT_INVALID", retryable: false } };
  } };
}
export async function runFd124Sequence({ inputs, manifest, save, generate }) {
  for (const input of inputs) {
    const row = { ...fd124InputProjection(input), status: "prepared", attempts: [], manualAccepted: false };
    manifest.reports.push(row); save(manifest);
    const result = await generate(input, row);
    const passed = result.ok && result.value.quality.ok;
    Object.assign(row, { result, status: passed ? "quality_passed_pending_manual_review" : "rejected" });
    // Only proven complete and accounted attempts may advance to another slot.
    if (!row.attempts.length || row.attempts.some(attempt => attempt.status !== "reference_settled")) {
      manifest.status = "stopped"; manifest.stopSlot = row.slot; save(manifest); return;
    }
    save(manifest);
  }
  manifest.status = manifest.reports.every(row => row.status === "quality_passed_pending_manual_review") ? "complete_pending_manual_review" : "complete_with_rejections";
  save(manifest);
}
export function fd124RedactedResult(manifest) {
  return { campaign: FD124_POLICY, status: manifest.status, manualAccepted: false, maxPhysicalAttempts: 12,
    physicalSendPermissions: manifest.dispatchPermissions,
    ...(manifest.reconciliation ? {zeroSendReconciliation: {kind: manifest.reconciliation.kind,
      journalSha256: manifest.reconciliation.journalSha256, ledgerSha256: manifest.reconciliation.ledgerSha256}} : {}),
    completeAccountedResponses: manifest.reports.reduce((sum, row) => sum + row.attempts.filter(attempt => attempt.status === "reference_settled").length, 0),
    oldAuthorityHashes: FD124_OLD_AUTHORITIES, budget: manifest.budget, stopSlot: manifest.stopSlot,
    reports: manifest.reports.map(row => ({ ...Object.fromEntries(Object.entries(row).filter(([key]) => !["attempts", "result"].includes(key))),
      quality: row.result?.ok ? row.result.value.quality : { ok: false, code: row.result?.error?.code, findings: row.result?.findings },
      attempts: row.attempts.map(attempt => ({ purpose: attempt.purpose, status: attempt.status, attemptKey: attempt.attemptKey,
        requestSha256: attempt.trace?.requestSha256, outputSha256: attempt.outputSha256, responseSha256: attempt.accountingEvidence?.responseSha256,
        errorCode: attempt.errorCode, failureDiagnostic: attempt.failureDiagnostic, referenceVnd: attempt.quote?.quoteVnd,
        tokensUnknown: attempt.quote?.tokensUnknown, providerBillingVerified: false, formatStatus: attempt.formatStatus })) })) };
}
export const FD124_ZERO_SEND_HASHES = Object.freeze({
  journal: "af12da0115b02cb6c0a274578085a153c595718fa08e02ac1d4eece827462519",
  ledger: "330ce5dcb92a0375fdfab543cae7d0944102e3426d62cd9e088f5a6f4918590b",
});
export function validateFd124ZeroSendStop({journalText, ledgerText, inputs, expectedHashes = FD124_ZERO_SEND_HASHES}) {
  if (hash(journalText) !== expectedHashes.journal || hash(ledgerText) !== expectedHashes.ledger) fail("FD124_ZERO_SEND_HASH_MISMATCH");
  const stopped = JSON.parse(journalText), lines = ledgerText.trim().split("\n");
  if (lines.length !== 1) fail("FD124_ZERO_SEND_LEDGER_INVALID");
  const config = JSON.parse(lines[0]);
  if (config.type !== "config" || config.version !== 2 || config.totalCapVnd !== FD124_TECHNICAL_CAP_VND ||
      config.allocationVnd !== FD124_TECHNICAL_CAP_VND || config.settleActualUsage !== true || config.referenceContinuation !== FD124_POLICY ||
      stopped.campaign !== FD124_POLICY || stopped.ownerDecision !== "FD-124" || stopped.status !== "stopped" ||
      stopped.manualAccepted !== false || stopped.asOfDate !== "2026-10-09" || stopped.maxPhysicalAttempts !== 12 ||
      stopped.reconciliation || stopped.reports?.length !== 1 || stopped.stopSlot !== FD124_SLOTS[0] ||
      stopped.dispatchPermissions !== 0 || stopped.budget?.totalVnd !== 0 || stopped.budget?.openReservations !== 0 ||
      stopped.budget?.capVnd !== FD124_TECHNICAL_CAP_VND || JSON.stringify(stopped.oldAuthorityHashes) !== JSON.stringify(FD124_OLD_AUTHORITIES)) fail("FD124_ZERO_SEND_STATE_INVALID");
  const row = stopped.reports[0], attempt = row.attempts?.[0];
  if (row.slot !== FD124_SLOTS[0] || row.status !== "rejected" || row.manualAccepted !== false || row.attempts?.length !== 1 ||
      row.result?.ok !== false || row.result?.error?.code !== "AI_PROVIDER_REQUEST_FAILED" || row.result?.error?.retryable !== false ||
      !attempt || Object.keys(attempt).sort().join(",") !== "attemptKey,errorCode,purpose,status" ||
      attempt.attemptKey !== fd124AttemptKey(FD124_SLOTS[0], "report") || attempt.purpose !== "report" ||
      attempt.status !== "stopped" || attempt.errorCode !== "ROUTER_CREDENTIAL_UNAVAILABLE" ||
      JSON.stringify(Object.fromEntries(Object.keys(fd124InputProjection(inputs[0])).map(key => [key, row[key]]))) !== JSON.stringify(fd124InputProjection(inputs[0]))) fail("FD124_ZERO_SEND_ATTEMPT_INVALID");
  return stopped;
}
export function preserveFd124ZeroSendStop({path, journalText, ledgerText, unchanged, oldRoot, newRoot}) {
  unchanged(); assertFd124Path(path, {privateStorage: true, oldRoot, newRoot});
  const fd = openSync(path, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
  try { writeFileSync(fd, JSON.stringify({kind: "FD124-known-zero-send-preflight-v1", journalSha256: hash(journalText),
    ledgerSha256: hash(ledgerText), originalJournalText: journalText, originalLedgerText: ledgerText}, null, 2) + "\n"); fsyncSync(fd); }
  finally { closeSync(fd); }
  const directory = openSync(dirname(path), constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
  try { fsyncSync(directory); } finally { closeSync(directory); }
  unchanged();
}
async function main(args) {
  const { values } = parseArgs({ args, options: { live: { type: "boolean", default: false }, dryRun: { type: "boolean", default: false }, output: { type: "string" }, reconcileZeroSend: {type: "boolean", default: false} } });
  if (values.live === values.dryRun || !values.output || (values.reconcileZeroSend && !values.live)) fail("FD124_MODE_INVALID");
  if (process.getuid() !== 1000) fail("FD124_EXECUTION_IDENTITY_MISMATCH");
  const output = assertFd124Path(values.output);
  assertFd124Authorities();
  const modules = { backend: await import("../packages/backend/dist/index.js"), contracts: await import("../packages/contracts/dist/index.js"), engine: await import("../packages/engine-adapters/dist/index.js") };
  const preflight = JSON.parse(readFileSync(new URL("../plan/evidence/2026-10-09-fd121-paid-trials-preflight.json", import.meta.url), "utf8"));
  const inputs = await buildFd124Inputs(modules, preflight);
  const unchanged = () => assertFd124Authorities();
  if (values.dryRun) {
    durableFd124Save(output, { campaign: FD124_POLICY, status: "dry_run_not_acceptance", asOfDate: "2026-10-09", physicalDispatches: 0,
      maxPhysicalAttempts: 12, inputs: inputs.map(fd124InputProjection), oldAuthorityHashes: FD124_OLD_AUTHORITIES }, { check: unchanged });
    console.log(JSON.stringify({ status: "dry_run_not_acceptance", inputs: inputs.length, physicalDispatches: 0 })); return;
  }
  assertFd124FrozenInputs(inputs, JSON.parse(readFileSync(FROZEN, "utf8")));
  const lockPath = join(FD121_ROOT, "runner.lock"), descriptor = openSync(lockPath, constants.O_RDWR | constants.O_NOFOLLOW);
  try {
    acquireTrialRunnerLock(descriptor, lockPath);
    assertFd124Path(FD124_ROOT, { privateStorage: true });
    if (!existsSync(FD124_ROOT)) mkdirSync(FD124_ROOT, { mode: 0o700 });
    assertFd124Path(FD124_ROOT, { privateStorage: true });
    const markerExists = existsSync(join(FD124_ROOT, "budget.jsonl.lock"));
    const ledgerPath = join(FD124_ROOT, "budget.jsonl"), stopReceipt = join(FD124_ROOT, "known-zero-send-stop.json");
    let zeroSend;
    if (values.reconcileZeroSend) {
      if (!existsSync(JOURNAL) || !existsSync(ledgerPath) || existsSync(`${JOURNAL}.next`) || existsSync(stopReceipt)) fail("FD124_ZERO_SEND_RECONCILIATION_REFUSED");
      const journalText = privateRead(JOURNAL), ledgerText = privateRead(ledgerPath);
      const original = validateFd124ZeroSendStop({journalText, ledgerText, inputs});
      if (original.frozenInputsSha256 !== hash(readFileSync(FROZEN))) fail("FD124_ZERO_SEND_SOURCE_CHANGED");
      zeroSend = {original, journalText, ledgerText};
    }
    if (!values.reconcileZeroSend && (existsSync(JOURNAL) || markerExists || existsSync(`${JOURNAL}.next`) || existsSync(ledgerPath))) fail("FD124_RESTART_REQUIRES_RECONCILIATION");
    const budget = createCampaignBudget({ ledgerPath, totalCapVnd: FD124_TECHNICAL_CAP_VND,
      allocationsVnd: { "v4.2-report": FD124_TECHNICAL_CAP_VND }, settleActualUsage: true, referenceContinuation: FD124_POLICY });
    if (!zeroSend) assertFd124FreshCampaign({ journalExists: false, markerExists, state: budget.status() });
    else {
      const state = budget.status();
      if (state.totalVnd !== 0 || state.openReservations !== 0 || privateRead(ledgerPath) !== zeroSend.ledgerText || privateRead(JOURNAL) !== zeroSend.journalText) fail("FD124_ZERO_SEND_STATE_CHANGED");
      preserveFd124ZeroSendStop({path: stopReceipt, journalText: zeroSend.journalText, ledgerText: zeroSend.ledgerText, unchanged});
    }
    const manifest = { campaign: FD124_POLICY, ownerDecision: "FD-124", status: "running", manualAccepted: false, asOfDate: "2026-10-09",
      frozenInputsSha256: hash(readFileSync(FROZEN)), oldAuthorityHashes: FD124_OLD_AUTHORITIES, maxPhysicalAttempts: 12,
      accountingBasis: "FD114_API_reference_not_provider_invoice", reports: [],
      ...(zeroSend ? {reconciliation: {kind: "FD124-known-zero-send-preflight-v1", reconciledAt: new Date().toISOString(),
        journalSha256: hash(zeroSend.journalText), ledgerSha256: hash(zeroSend.ledgerText), originalManifest: zeroSend.original}} : {}) };
    const save = value => durableFd124Save(JOURNAL, value, { privateStorage: true, check: unchanged });
    save(manifest);
    await runFd124Sequence({ inputs, manifest, save, generate: (input, row) => {
      const provider = fd124Provider({ input, row, manifest, save, budget, modules, unchanged });
      return ["relationship_marriage", "career_wealth"].includes(input.group)
        ? modules.backend.generateZiweiTopicDeepDiveWithQualityLoopV4({ topicId: input.group, facts: input.facts, knowledgePacks: [], provider, maxRewriteAttempts: 1 })
        : modules.backend.writePeriodReading({ facts: input.facts, provider });
    } });
    manifest.budget = budget.status();
    manifest.dispatchPermissions = privateRead(join(FD124_ROOT, "budget.jsonl")).trim().split("\n").map(line => JSON.parse(line)).filter(row => row.type === "dispatch").length;
    save(manifest);
    durableFd124Save(output, fd124RedactedResult(manifest), { check: unchanged });
    console.log(JSON.stringify({ status: manifest.status, reports: manifest.reports.length, budget: manifest.budget }));
  } finally { closeSync(descriptor); unchanged(); }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(error => { console.error(JSON.stringify({ status: "stopped", code: /^\w+$/.test(error.code ?? "") ? error.code : "FD124_RUN_FAILED" })); process.exitCode = 1; });
}
