#!/usr/bin/env node
import { parseArgs } from "node:util";
import { createHash } from "node:crypto";
import { closeSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, writeFileSync, existsSync, constants, fstatSync, lstatSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { FD121_ROOT, paidTrialBudget, paidTrialAttemptKey, runProdRouterAttempt } from "./lib/prod-9router-attempt.mjs";

const GROUPS = ["relationship_marriage", "career_wealth", "monthly", "current_annual", "next_annual"];
const ROOT = FD121_ROOT;
const JOURNAL = join(ROOT, "reports.json");
const hash = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const fail = code => { throw Object.assign(new Error(code), { code }); };
const uuid = key => { const hex = hash(key); return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`; };

export function assertTrialResume(manifest) {
  if (manifest.campaign !== "FD121-paid-manual-trials-v1" || manifest.status !== "complete_pending_manual_review" ||
      manifest.reports?.length !== 10 || manifest.reports.some(row => row.status !== "quality_passed_pending_manual_review")) fail("PAID_TRIAL_RESTART_REQUIRES_RECONCILIATION");
}

export async function runTrialSequence({ inputs, manifest, save, generate }) {
  for (const input of inputs) {
    const row = { slot: `${input.group}:${input.index}`, group: input.group, index: input.index,
      snapshotHash: input.snapshotHash, factsSha256: hash(input.facts), targetYear: input.targetYear,
      timingRuleVersion: input.timingRuleVersion, sourceKind: input.sourceKind, status: "prepared", attempts: [], manualAccepted: false };
    manifest.reports.push(row); await save(manifest);
    const result = await generate(input, row);
    const passed = result.ok && result.value.quality.ok;
    Object.assign(row, { status: passed ? "quality_passed_pending_manual_review" : "failed", result });
    if (!passed) { manifest.status = "stopped"; manifest.stopSlot = row.slot; await save(manifest); return; }
    await save(manifest);
  }
  manifest.status = "complete_pending_manual_review";
  await save(manifest);
}

export async function makePaidTrialInput(group, index, asOfDate, modules) {
  const { backend, contracts, engine } = modules;
  const lineage = backend.deriveReportTimingLineage(new Date(`${asOfDate}T05:00:00Z`));
  if (!GROUPS.includes(group) || ![0, 1].includes(index) || lineage.asOfDate !== asOfDate) fail("PAID_TRIAL_INPUT_INVALID");
  const date = index === 0 ? "1980-01-01" : "1981-02-02", localTime = index === 0 ? "08:30" : "14:30";
  const originalInput = { version: 1, calendar: { kind: "solar", date }, time: { precision: "exact_minute", localTime },
    timezone: { offsetMinutes: 420 }, consentVersion: "synthetic-test", gender: index ? "female" : "male" };
  const birthProfile = contracts.NormalizedBirthProfileV1Schema.parse({ version: 1, originalInput,
    normalizedCalendar: originalInput.calendar, normalizedTime: originalInput.time,
    timezoneProvenance: { source: "offset", offsetMinutes: 420 }, normalizationWarnings: [], limitations: [] });
  const chartVersionId = `fd121-synthetic-chart-${index}`, chartId = `fd121-synthetic-${index}`;
  const targetYear = lineage.targetYear + (group === "next_annual" ? 1 : 0);
  const period = !["relationship_marriage", "career_wealth"].includes(group);
  const chart = await new engine.IztroAdapter().calculate({ birthProfile }, engine.iztroDefaultConfig);
  const snapshot = await engine.calculateIztroReportSnapshot({ chartVersionId, birthProfile, ...lineage, targetYear,
    ...(period ? { periodReading: { chartId, kind: group === "monthly" ? "monthly" : "annual" } } : {}) });
  if (!chart.ok || !snapshot.ok) fail("PAID_TRIAL_ENGINE_FAILED");
  const reportId = uuid(`fd121-${group}-${index}`);
  const source = contracts.ReportSourceSnapshotV1Schema.parse({ version: 1, reportId, reportVersionId: uuid(`${reportId}-v1`), chartVersionId,
    ...lineage, targetYear, snapshotHash: snapshot.value.provenance.snapshotHash, snapshot: snapshot.value });
  const facts = period ? snapshot.value.periodReading : backend.buildComprehensiveZiweiFactsV4(chart.output, source);
  if (!facts) fail("PAID_TRIAL_FACTS_MISSING");
  return { group, index, facts, snapshotHash: source.snapshotHash, targetYear, chartVersionId,
    sourceKind: "synthetic_actual_iztro", timingRuleVersion: lineage.timingRuleVersion };
}

function durableSave(path, value) {
  const temporary = `${path}.next`;
  writeFileSync(temporary, JSON.stringify(value, null, 2) + "\n", { mode: 0o600 });
  const fd = openSync(temporary, "r"); try { fsyncSync(fd); } finally { closeSync(fd); }
  renameSync(temporary, path);
  const directory = openSync(dirname(path), "r"); try { fsyncSync(directory); } finally { closeSync(directory); }
}

export function acquireTrialRunnerLock(descriptor, path) {
  const opened = fstatSync(descriptor), lock = lstatSync(path);
  if (!opened.isFile() || opened.dev !== lock.dev || opened.ino !== lock.ino || opened.uid !== 1000 ||
      opened.nlink !== 1 || (opened.mode & 0o077)) fail("PAID_TRIAL_LOCK_REQUIRED");
  try {
    // Numeric-FD flock locks this inherited open file description. The helper
    // exits, but the caller retains the lock until it closes its descriptor.
    execFileSync("flock", ["--exclusive", "--nonblock", "3"], { stdio: ["ignore", "ignore", "ignore", descriptor] });
  } catch { fail("PAID_TRIAL_RUNNER_BUSY"); }
}

async function main(args) {
  const { values } = parseArgs({ args, options: { live: { type: "boolean", default: false },
    dryRun: { type: "boolean", default: false }, output: { type: "string" }, locked: { type: "boolean", default: false } } });
  if (values.live === values.dryRun) fail("PAID_TRIAL_MODE_REQUIRED");
  if (values.live && process.getuid() !== 1000) fail("PAID_TRIAL_EXECUTION_IDENTITY_MISMATCH");
  if (values.live && !values.locked) {
    mkdirSync(ROOT, { recursive: true, mode: 0o700 });
    const root = lstatSync(ROOT);
    if (!root.isDirectory() || root.uid !== 1000 || (root.mode & 0o077)) fail("PAID_TRIAL_STORAGE_UNSAFE");
    const fd = openSync(join(ROOT, "runner.lock"), constants.O_CREAT | constants.O_RDWR | constants.O_NOFOLLOW, 0o600);
    try {
      acquireTrialRunnerLock(fd, join(ROOT, "runner.lock"));
      execFileSync(process.execPath, [resolve(process.argv[1]), ...args, "--locked"],
        { stdio: ["inherit", "inherit", "inherit", fd] });
    } finally { closeSync(fd); }
    return;
  }
  if (values.live) {
    acquireTrialRunnerLock(3, join(ROOT, "runner.lock"));
  }
  const modules = { backend: await import("../packages/backend/dist/index.js"),
    contracts: await import("../packages/contracts/dist/index.js"), engine: await import("../packages/engine-adapters/dist/index.js") };
  const asOfDate = "2026-10-09";
  const inputs = [];
  for (const group of GROUPS) for (const index of [0, 1]) inputs.push(await makePaidTrialInput(group, index, asOfDate, modules));
  const output = resolve(values.output ?? "plan/evidence/2026-10-09-fd121-paid-trials.json");
  if (values.dryRun) {
    mkdirSync(dirname(output), { recursive: true });
    durableSave(output, { campaign: "FD121-paid-manual-trials-v1", status: "dry_run_not_acceptance", manualAccepted: false,
      physicalDispatches: 0, asOfDate, inputs: inputs.map(({ facts, ...metadata }) => ({ ...metadata, factsSha256: hash(facts) })) });
    console.log(JSON.stringify({ status: "dry_run_not_acceptance", reports: inputs.length, output })); return;
  }
  const budget = paidTrialBudget();
  let manifest;
  if (existsSync(JOURNAL)) {
    manifest = JSON.parse(readFileSync(JOURNAL, "utf8"));
    // A restart can export a receipt, but cannot re-dispatch a settled slot or
    // recover past an unknown/quality/crash fence automatically.
    assertTrialResume(manifest);
  } else {
    if (budget.status().totalVnd !== 0 || budget.status().openReservations !== 0) fail("PAID_TRIAL_LEDGER_REQUIRES_RECONCILIATION");
    manifest = { campaign: "FD121-paid-manual-trials-v1", status: "running", manualAccepted: false, asOfDate,
      capVnd: 180000, accountingBasis: "FD114_owner_approved_API_reference_not_provider_invoice", reports: [] };
    durableSave(JOURNAL, manifest);
    await runTrialSequence({ inputs, manifest, save: value => durableSave(JOURNAL, value), generate: async (input, row) => {
      const slot = `${input.group}:${input.index}`;
      const provider = { async generateStructured(request) {
        // Stop the first campaign on quality failure. Rewrites remain budgeted
        // owner-authorized follow-up work, not automatic retries hidden in a writer.
        if (row.attempts.length) return { ok: false, error: { code: "AI_PROVIDER_REQUEST_FAILED", retryable: false } };
        const attempt = { attemptKey: paidTrialAttemptKey(slot, "report"), status: "preparing" };
        row.attempts.push(attempt); durableSave(JOURNAL, manifest);
        try {
          const native = await runProdRouterAttempt({ system: `${request.system}\nAuthoritative JSON schema: ${JSON.stringify(modules.contracts.z.toJSONSchema(request.schema))}`,
            user: request.user, maxOutputTokens: request.maxOutputTokens, attemptKey: attempt.attemptKey, budget,
            onPrepared: trace => { Object.assign(attempt, trace, { status: "dispatch_pending" }); durableSave(JOURNAL, manifest); } });
          const { outputText, ...receipt } = native;
          Object.assign(attempt, receipt, { outputText, status: "settled" }); durableSave(JOURNAL, manifest);
          let parsed;
          try { parsed = request.schema.safeParse(JSON.parse(outputText)); } catch { parsed = { success: false }; }
          if (!parsed.success) return { ok: false, error: { code: "AI_OUTPUT_INVALID", retryable: false } };
          return { ok: true, value: { value: parsed.data, providerId: "9router-antigravity-native", modelId: "gemini-3.8-flash-medium",
            usage: { tokensUnknown: false, costStatus: "resolved", costMicroVnd: native.quote.quoteMicroVnd, costVnd: Number(native.quote.quoteVnd) } } };
        } catch (error) {
          attempt.status = "stopped"; attempt.errorCode = error.code ?? "PAID_TRIAL_FAILED";
          if (error.usageDiagnostic) Object.assign(attempt, { usageDiagnostic: error.usageDiagnostic,
            visibleUnacceptedOutput: error.visibleUnacceptedOutput });
          durableSave(JOURNAL, manifest); return { ok: false, error: { code: "AI_PROVIDER_REQUEST_FAILED", retryable: false } };
        }
      } };
      return ["relationship_marriage", "career_wealth"].includes(input.group)
        ? await modules.backend.writeZiweiTopicDeepDiveV4({ topicId: input.group, facts: input.facts, knowledgePacks: [], provider })
        : await modules.backend.writePeriodReading({ facts: input.facts, provider });
    } });
    manifest.budget = budget.status(); durableSave(JOURNAL, manifest);
  }
  mkdirSync(dirname(output), { recursive: true }); durableSave(output, manifest);
  console.log(JSON.stringify({ status: manifest.status, reports: manifest.reports.length, budget: manifest.budget, output }));
  if (manifest.status !== "complete_pending_manual_review") process.exitCode = 2;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch(error => { console.error(JSON.stringify({ status: "stopped", code: error.code ?? "PAID_TRIAL_FAILED" })); process.exitCode = 2; });
}
