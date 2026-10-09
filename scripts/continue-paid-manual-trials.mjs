#!/usr/bin/env node
import { parseArgs } from "node:util";
import { createHash } from "node:crypto";
import { closeSync, constants, existsSync, fsyncSync, fstatSync, lstatSync, mkdirSync, openSync, readFileSync, realpathSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, basename, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { FD121_ROOT, paidContinuationBudget, runProdRouterAttempt } from "./lib/prod-9router-attempt.mjs";
import { FD123_POLICY, FD123_MODEL_BOUND_MODE, FD123_SLOTS, fd123AttemptKey, quoteFd123ReferenceSettlement } from "./lib/fd123-reference-continuation.mjs";
import { makePaidTrialInput, acquireTrialRunnerLock, runTrialSequence } from "./run-paid-manual-trials.mjs";

const ROOT = join(FD121_ROOT, "fd123-continuation");
const JOURNAL = join(ROOT, "reports.json");
const hash = text => createHash("sha256").update(text).digest("hex");
const fail = code => { throw Object.assign(new Error(code), { code }); };
export function assertFd123OutputPath(path, authorityRoot = FD121_ROOT) {
  const output = resolve(path), authority = resolve(authorityRoot);
  const inside = (value, root) => value === root || value.startsWith(`${root}${sep}`);
  if (inside(output, authority)) fail("FD123_EXPORT_AUTHORITY_PATH_FORBIDDEN");
  let ancestor = dirname(output);
  const suffix = [];
  while (!existsSync(ancestor)) { suffix.unshift(basename(ancestor)); ancestor = dirname(ancestor); }
  const canonical = resolve(realpathSync(ancestor), ...suffix, basename(output));
  const canonicalAuthority = realpathSync(authority);
  if (inside(canonical, canonicalAuthority) || (existsSync(output) && lstatSync(output).isSymbolicLink())) fail("FD123_EXPORT_AUTHORITY_PATH_FORBIDDEN");
  return canonical;
}
export function normalizeTrialJson(raw) {
  if (typeof raw !== "string") fail("FD123_JSON_INVALID");
  const text = raw.trim();
  const wrapper = /^```(?:json)?[ \t]*\r?\n([\s\S]*?)\r?\n```$/u.exec(text);
  const json = wrapper ? wrapper[1] : text;
  let value;
  try { value = JSON.parse(json); } catch { fail("FD123_JSON_INVALID"); }
  return { value, rawSha256: hash(raw), parsedSha256: hash(JSON.stringify(value)), normalization: wrapper ? "single_json_fence" : "none" };
}
export function assertFd123Original(manifest) {
  const first = manifest?.reports?.[0];
  if (manifest?.campaign !== "FD121-paid-manual-trials-v1" || manifest.status !== "stopped" || manifest.asOfDate !== "2026-10-09" ||
      manifest.reports.length !== 1 || first.slot !== "relationship_marriage:0" || first.attempts?.length !== 1 ||
      manifest.budget?.openReservations !== 1 || manifest.budget.totalVnd !== 33368 || manifest.manualAccepted !== false) fail("FD123_ORIGINAL_FENCE_INVALID");
}
export function assertFd123Resume(manifest, lineage) {
  if (manifest?.campaign !== FD123_POLICY || manifest.manualAccepted !== false || manifest.status !== "complete_pending_manual_review" ||
      manifest.originalJournalSha256 !== lineage.originalJournalSha256 || manifest.originalLedgerSha256 !== lineage.originalLedgerSha256 ||
      manifest.reports?.length !== 9 || manifest.reports.some((row, index) => row.slot !== FD123_SLOTS[index] ||
        row.status !== "quality_passed_pending_manual_review" || row.manualAccepted !== false || row.attempts.length < 1 || row.attempts.length > 2)) fail("FD123_RESTART_REQUIRES_RECONCILIATION");
}
export function prepareFd123RetainedRecovery(manifest, lineage, input, modules, state, { at = new Date() } = {}) {
  const row = manifest?.reports?.[0], attempt = row?.attempts?.[0];
  const observed = JSON.parse(readFileSync(new URL("../plan/evidence/2026-10-09-fd123-first-retained-stop.json", import.meta.url), "utf8"));
  if (hash(JSON.stringify(manifest)) !== hash(JSON.stringify(observed))) fail("FD123_RECOVERY_REQUIRES_RECONCILIATION");
  if (manifest?.campaign !== FD123_POLICY || manifest.status !== "stopped" || manifest.manualAccepted !== false ||
      manifest.asOfDate !== "2026-10-09" || manifest.originalJournalSha256 !== lineage.originalJournalSha256 ||
      manifest.originalLedgerSha256 !== lineage.originalLedgerSha256 || manifest.reports.length !== 1 || manifest.recoveryEvents !== undefined ||
      manifest.stopSlot !== FD123_SLOTS[0] || row.slot !== FD123_SLOTS[0] || row.group !== input.group || row.index !== input.index ||
      row.status !== "failed" || row.manualAccepted !== false || row.attempts.length !== 1 || attempt.status !== "stopped" ||
      attempt.purpose !== "report" || attempt.attemptKey !== fd123AttemptKey(FD123_SLOTS[0], "report") ||
      attempt.errorCode !== "ROUTER_ACCOUNTING_EVIDENCE_INCOMPLETE" || attempt.reserveVnd !== 33368 ||
      typeof attempt.reservationId !== "string" || state.openReservations !== 1 || state.totalVnd !== 33368 || state.capVnd !== 600624 ||
      row.snapshotHash !== input.snapshotHash || row.factsSha256 !== hash(JSON.stringify(input.facts))) fail("FD123_RECOVERY_REQUIRES_RECONCILIATION");
  const normalized = normalizeTrialJson(attempt.visibleUnacceptedOutput);
  // This recovery authorizes only the one observed stop, never another
  // incomplete run or an ambiguous checkpoint left by a crashed recovery.
  if (normalized.rawSha256 !== "64c779ddc128efc1806044357f2a6433c23e268475040c50e06dbb80bdd18344" ||
      attempt.accountingEvidence?.responseSha256 !== "a7f53f31bbe35beeb4416d0017f0f59a2925c1aa47ad5c38dbe2b05859bad63b" ||
      attempt.trace?.requestSha256 !== "f88490536cf0dffb3af25e2523c0124062eed172aa93a9f48b0505d7911ac1c7") fail("FD123_RECOVERY_REQUIRES_RECONCILIATION");
  const content = modules.contracts.ZiweiTopicDeepDiveContentV1Schema.parse(normalized.value);
  const quality = modules.backend.validateZiweiTopicDeepDiveQualityV4(content, input.facts);
  if (!quality.ok) fail("FD123_RECOVERY_QUALITY_FAILED");
  const proof = attempt.accountingEvidence;
  const settlement = { receipt: { modelVersion: proof.modelVersion, usageMetadata: structuredClone(proof.usageMetadata) },
    outputSha256: normalized.rawSha256, accountingEvidence: proof, referenceMode: FD123_MODEL_BOUND_MODE };
  const quote = quoteFd123ReferenceSettlement(settlement, attempt.trace, { at });
  return { settlement, quote, content, quality, rawSha256: normalized.rawSha256,
    parsedSha256: normalized.parsedSha256, normalization: normalized.normalization };
}
function privateRead(path) {
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = fstatSync(fd), named = lstatSync(path);
    if (stat.dev !== named.dev || stat.ino !== named.ino || !stat.isFile() || stat.uid !== 1000 || stat.nlink !== 1 || (stat.mode & 0o077)) fail("FD123_STORAGE_UNSAFE");
    return readFileSync(fd, "utf8");
  } finally { closeSync(fd); }
}
function durableSave(path, value) {
  const temporary = `${path}.next`;
  const fd = openSync(temporary, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
  try { writeFileSync(fd, JSON.stringify(value, null, 2) + "\n"); fsyncSync(fd); } finally { closeSync(fd); }
  renameSync(temporary, path);
  const directory = openSync(dirname(path), constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
  try { fsyncSync(directory); } finally { closeSync(directory); }
}
export async function buildFd123Inputs(original, modules, preflight) {
  assertFd123Original(original);
  const inputs = [];
  for (const slot of ["relationship_marriage:0", ...FD123_SLOTS]) {
    const [group, index] = slot.split(":");
    const input = await makePaidTrialInput(group, Number(index), original.asOfDate, modules);
    const expected = preflight.inputs.find(row => row.group === group && row.index === Number(index));
    if (!expected || input.snapshotHash !== expected.snapshotHash || hash(JSON.stringify(input.facts)) !== expected.factsSha256 ||
        (slot === "relationship_marriage:0" && (input.snapshotHash !== original.reports[0].snapshotHash || hash(JSON.stringify(input.facts)) !== original.reports[0].factsSha256))) fail("FD123_SOURCE_CHANGED");
    if (slot !== "relationship_marriage:0") inputs.push(input);
  }
  return inputs;
}
async function main(args) {
  const { values } = parseArgs({ args, options: { live: { type: "boolean", default: false }, dryRun: { type: "boolean", default: false },
    locked: { type: "boolean", default: false }, resumeReference: { type: "boolean", default: false }, output: { type: "string" } } });
  if (values.live === values.dryRun || process.getuid() !== 1000) fail("FD123_MODE_OR_IDENTITY_INVALID");
  if (values.resumeReference && !values.live) fail("FD123_MODE_OR_IDENTITY_INVALID");
  const output = assertFd123OutputPath(values.output ?? "plan/evidence/2026-10-09-fd123-paid-trials.json");
  const originalText = privateRead(join(FD121_ROOT, "reports.json"));
  const ledgerText = privateRead(join(FD121_ROOT, "budget.jsonl"));
  const original = JSON.parse(originalText); assertFd123Original(original);
  const lineage = { originalJournalSha256: hash(originalText), originalLedgerSha256: hash(ledgerText), originalHeldExposureVnd: 33368 };
  const unchanged = () => {
    if (hash(privateRead(join(FD121_ROOT, "reports.json"))) !== lineage.originalJournalSha256 ||
        hash(privateRead(join(FD121_ROOT, "budget.jsonl"))) !== lineage.originalLedgerSha256) fail("FD123_ORIGINAL_CHANGED");
  };
  if (values.live && !values.locked) {
    const root = lstatSync(FD121_ROOT);
    if (!root.isDirectory() || root.uid !== 1000 || (root.mode & 0o077)) fail("FD123_STORAGE_UNSAFE");
    const fd = openSync(join(FD121_ROOT, "runner.lock"), constants.O_RDWR | constants.O_NOFOLLOW);
    try {
      acquireTrialRunnerLock(fd, join(FD121_ROOT, "runner.lock"));
      execFileSync(process.execPath, [fileURLToPath(import.meta.url), ...args, "--locked"], { stdio: ["inherit", "inherit", "inherit", fd] });
    } finally { closeSync(fd); }
    return;
  }
  if (values.live) acquireTrialRunnerLock(3, join(FD121_ROOT, "runner.lock"));
  const modules = { backend: await import("../packages/backend/dist/index.js"), contracts: await import("../packages/contracts/dist/index.js"),
    engine: await import("../packages/engine-adapters/dist/index.js") };
  const preflight = JSON.parse(readFileSync(new URL("../plan/evidence/2026-10-09-fd121-paid-trials-preflight.json", import.meta.url), "utf8"));
  const inputs = await buildFd123Inputs(original, modules, preflight);
  if (values.dryRun) {
    mkdirSync(dirname(output), { recursive: true }); unchanged();
    durableSave(output, { campaign: FD123_POLICY, status: "dry_run_not_acceptance", ...lineage, manualAccepted: false,
      physicalDispatches: 0, maxNewPhysicalAttempts: 18, slots: FD123_SLOTS, sourceHashesMatch: true }); unchanged();
    console.log(JSON.stringify({ status: "dry_run_not_acceptance", reports: inputs.length, physicalDispatches: 0 })); return;
  }
  if (!existsSync(ROOT)) mkdirSync(ROOT, { recursive: false, mode: 0o700 });
  const storage = lstatSync(ROOT);
  if (!storage.isDirectory() || storage.uid !== 1000 || (storage.mode & 0o077)) fail("FD123_STORAGE_UNSAFE");
  const budget = paidContinuationBudget();
  let manifest, pendingInputs = inputs;
  if (existsSync(JOURNAL)) {
    const priorText = privateRead(JOURNAL);
    manifest = JSON.parse(priorText);
    if (!values.resumeReference) { assertFd123Resume(manifest, lineage); pendingInputs = []; }
    else {
      const recovered = prepareFd123RetainedRecovery(manifest, lineage, inputs[0], modules, budget.status());
      const row = manifest.reports[0], attempt = row.attempts[0];
      unchanged();
      manifest.recoveryEvents = [{ ownerDecision: "FD-123", referenceMode: FD123_MODEL_BOUND_MODE,
        priorManifestSha256: hash(priorText), previousStatus: manifest.status, previousStopSlot: manifest.stopSlot,
        previousRowStatus: row.status, previousAttemptStatus: attempt.status, previousErrorCode: attempt.errorCode,
        requestSha256: attempt.trace.requestSha256, responseSha256: attempt.accountingEvidence.responseSha256,
        rawOutputSha256: recovered.rawSha256, noPhysicalReplay: true, status: "prepared", recordedAt: new Date().toISOString() }];
      manifest.status = "recovery_prepared"; durableSave(JOURNAL, manifest);
      // A crash across this append/update boundary remains fenced; the CLI
      // never automatically settles again or replays the retained response.
      budget.settleAttempt(attempt.reservationId, recovered.settlement);
      Object.assign(attempt, { status: "reference_settled_model_bound", receipt: recovered.settlement.receipt, quote: recovered.quote,
        outputSha256: recovered.rawSha256, outputText: attempt.visibleUnacceptedOutput, rawSha256: recovered.rawSha256,
        parsedSha256: recovered.parsedSha256, normalization: recovered.normalization });
      row.result = { ok: true, value: { content: recovered.content, quality: recovered.quality,
        providerId: "9router-antigravity-native", modelId: "gemini-3.8-flash-medium" } };
      row.status = "quality_passed_pending_manual_review";
      manifest.recoveryEvents.push({ status: "completed", noPhysicalReplay: true, recordedAt: new Date().toISOString() });
      manifest.referenceMode = FD123_MODEL_BOUND_MODE; manifest.status = "running"; manifest.budget = budget.status();
      durableSave(JOURNAL, manifest); unchanged(); pendingInputs = inputs.slice(1);
      console.log(JSON.stringify({ slot: row.slot, status: "retained_response_recovered", physicalProviderCalls: 0,
        heldReferenceVnd: recovered.quote.quoteVnd, actualUsageVerified: false, manualAccepted: false }));
    }
  } else {
    if (values.resumeReference) fail("FD123_RECOVERY_REQUIRES_RECONCILIATION");
    const state = budget.status();
    if (state.totalVnd !== 0 || state.openReservations !== 0) fail("FD123_LEDGER_REQUIRES_RECONCILIATION");
    manifest = { campaign: FD123_POLICY, ownerDecision: "FD-123", status: "running", manualAccepted: false, asOfDate: original.asOfDate,
      ...lineage, maxNewPhysicalAttempts: 18, technicalCeilingVnd: 600624, monetaryBudgetBlockerWaived: true,
      accountingBasis: "FD114_API_reference_not_provider_invoice", reports: [] };
    durableSave(JOURNAL, manifest);
  }
  if (pendingInputs.length) {
    try {
      await runTrialSequence({ inputs: pendingInputs, manifest, save: value => durableSave(JOURNAL, value), generate: async (input, row) => {
        const slot = `${input.group}:${input.index}`;
        const provider = { async generateStructured(request) {
          const purpose = row.attempts.length ? "rewrite" : "report";
          if (row.attempts.length >= 2 || request.purpose !== purpose) return { ok: false, error: { code: "AI_PROVIDER_REQUEST_FAILED", retryable: false } };
          unchanged();
          const attempt = { attemptKey: fd123AttemptKey(slot, purpose), purpose, status: "preparing" };
          row.attempts.push(attempt); durableSave(JOURNAL, manifest);
          try {
            const native = await runProdRouterAttempt({ system: `${request.system}\nAuthoritative JSON schema: ${JSON.stringify(modules.contracts.z.toJSONSchema(request.schema))}`,
              user: request.user, maxOutputTokens: request.maxOutputTokens, attemptKey: attempt.attemptKey, budget, referenceContinuation: true,
              referenceMode: manifest.referenceMode,
              onPrepared: trace => { unchanged(); Object.assign(attempt, trace, { status: "dispatch_pending" }); durableSave(JOURNAL, manifest); },
              onReceipt: receipt => { unchanged(); Object.assign(attempt, receipt, { status: "native_received_pending_accounting" }); durableSave(JOURNAL, manifest); } });
            Object.assign(attempt, native, { status: "reference_settled" }); durableSave(JOURNAL, manifest);
            const normalized = normalizeTrialJson(native.outputText);
            const parsed = request.schema.safeParse(normalized.value);
            const format = { rawSha256: normalized.rawSha256, parsedSha256: normalized.parsedSha256, normalization: normalized.normalization }; Object.assign(attempt, format); durableSave(JOURNAL, manifest);
            if (!parsed.success) return { ok: false, error: { code: "AI_OUTPUT_INVALID", retryable: false } };
            console.log(JSON.stringify({ slot, purpose, status: "reference_settled", referenceVnd: native.quote.quoteVnd, normalization: normalized.normalization }));
            return { ok: true, value: { value: parsed.data, providerId: "9router-antigravity-native", modelId: "gemini-3.8-flash-medium",
              usage: { tokensUnknown: native.quote.tokensUnknown ?? false, costStatus: "resolved", costMicroVnd: native.quote.quoteMicroVnd, costVnd: Number(native.quote.quoteVnd) } } };
          } catch (error) {
            Object.assign(attempt, { status: "stopped", errorCode: error.code ?? "FD123_ATTEMPT_FAILED" });
            if (error.accountingEvidence) attempt.accountingEvidence = error.accountingEvidence;
            if (error.visibleUnacceptedOutput) attempt.visibleUnacceptedOutput = error.visibleUnacceptedOutput;
            durableSave(JOURNAL, manifest);
            return { ok: false, error: { code: "AI_PROVIDER_REQUEST_FAILED", retryable: false } };
          }
        } };
        return ["relationship_marriage", "career_wealth"].includes(input.group)
          ? modules.backend.generateZiweiTopicDeepDiveWithQualityLoopV4({ topicId: input.group, facts: input.facts, knowledgePacks: [], provider, maxRewriteAttempts: 1 })
          : modules.backend.writePeriodReading({ facts: input.facts, provider });
      } });
    } finally { unchanged(); }
    manifest.budget = budget.status(); durableSave(JOURNAL, manifest);
  }
  unchanged(); mkdirSync(dirname(output), { recursive: true }); durableSave(output, manifest); unchanged();
  console.log(JSON.stringify({ status: manifest.status, reports: manifest.reports.length, newReferenceExposureVnd: manifest.budget.totalVnd,
    originalHeldExposureVnd: 33368, openReservations: manifest.budget.openReservations, manualAccepted: false }));
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(error => { console.error(JSON.stringify({ status: "stopped", code: error.code ?? "FD123_RUN_FAILED" })); process.exitCode = 1; });
}
