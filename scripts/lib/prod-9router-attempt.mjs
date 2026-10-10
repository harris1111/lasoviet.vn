import { createHash } from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { ROUTER_IMAGE, inspectNativeAccountingEvidence } from "./prod-9router-child.mjs";
import { createCampaignBudget } from "./campaign-budget.mjs";
import { inspectNativeReceipt } from "./native-campaign-preflight.mjs";
import { nativeApiReferencePricing, quoteNativeApiReference } from "./native-campaign-api-pricing.mjs";
import { FD123_POLICY, FD123_MODEL_BOUND_MODE, FD123_TECHNICAL_CAP_VND, quoteFd123ReferenceSettlement } from "./fd123-reference-continuation.mjs";

export const FD121_ROOT = "/home/debian/.lasoviet/fd121-paid-manual-trials";
export const FD121_LEDGER = `${FD121_ROOT}/budget.jsonl`;
export const FD121_CAP_VND = 180000;
const hash = value => createHash("sha256").update(value).digest("hex");
const fail = code => { throw Object.assign(new Error(code), { code }); };
export const paidTrialAttemptKey = (slot, purpose) => hash(`FD121:paid-manual-trials:v1:${slot}:${purpose}`);
export function paidTrialBudget() {
  if (process.getuid() !== 1000) fail("PAID_TRIAL_EXECUTION_IDENTITY_MISMATCH");
  return createCampaignBudget({ ledgerPath: FD121_LEDGER, totalCapVnd: FD121_CAP_VND,
    allocationsVnd: { "v4.2-report": FD121_CAP_VND }, settleActualUsage: true });
}
export function paidContinuationBudget() {
  if (process.getuid() !== 1000) fail("PAID_TRIAL_EXECUTION_IDENTITY_MISMATCH");
  return createCampaignBudget({ ledgerPath: `${FD121_ROOT}/fd123-continuation/budget.jsonl`, totalCapVnd: FD123_TECHNICAL_CAP_VND,
    allocationsVnd: { "v4.2-report": FD123_TECHNICAL_CAP_VND }, settleActualUsage: true, referenceContinuation: FD123_POLICY });
}
export function conservativeTrialReserve(bounds, at) {
  if (bounds?.inputTokens !== 1048576 || bounds?.outputTokens !== 65536 || bounds?.reasoningTokens !== 65536) fail("ROUTER_BOUND_UNVERIFIED");
  const quote = quoteNativeApiReference({ rawCountersComplete: true, modelVersion: "gemini-3.8-flash-medium",
    inputTokens: bounds.inputTokens, outputTokens: bounds.outputTokens, reasoningTokens: bounds.reasoningTokens,
    cachedTokens: 0, totalTokens: bounds.inputTokens + bounds.outputTokens + bounds.reasoningTokens }, { at });
  return Number(quote.quoteVnd);
}
export function installedRouterProcess() {
  const image = execFileSync("docker", ["inspect", "9router", "--format", "{{.Image}}"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  if (image !== ROUTER_IMAGE) fail("ROUTER_IMAGE_CHANGED");
  const script = readFileSync(new URL("./prod-9router-child.mjs", import.meta.url), "utf8") + "\nawait runBridge(); process.exit(0);\n";
  // Arguments contain code only. Prompts enter private stdin; credentials stay in
  // the child. Discard router warnings instead of persisting arbitrary stderr.
  return spawn("docker", ["exec", "-i", "9router", "node", "--input-type=module", "-e", script], { stdio: ["pipe", "pipe", "ignore"] });
}

export async function runProdRouterAttempt({ system, user, maxOutputTokens, attemptKey, onPrepared = () => {},
  onReceipt = () => {}, budget = paidTrialBudget(), processFactory = installedRouterProcess, now = () => new Date(), referenceContinuation = false, referenceMode }) {
  if (referenceMode !== undefined && (!referenceContinuation || referenceMode !== FD123_MODEL_BOUND_MODE)) fail("FD123_REFERENCE_MODE_INVALID");
  if (referenceContinuation && budget.referenceContinuation !== FD123_POLICY) fail("FD123_LEDGER_POLICY_REQUIRED");
  if (!/^[a-f0-9]{64}$/.test(attemptKey)) fail("ROUTER_ATTEMPT_INVALID");
  const pricing = nativeApiReferencePricing(now());
  nativeApiReferencePricing(new Date(now().getTime() + 120000));
  const child = processFactory();
  const lines = createInterface({ input: child.stdout, crlfDelay: Infinity });
  const iterator = lines[Symbol.asyncIterator]();
  let reservationId, trace, bounds, usageDiagnostic, visibleUnacceptedOutput, accountingEvidence;
  const timer = setTimeout(() => child.kill(), 135000);
  const rejectChildError = () => child.stdout.destroy();
  child.once("error", rejectChildError);
  // A broken pipe is a sanitized ambiguous outcome, never a retry trigger.
  child.stdin.on("error", () => child.kill());
  try {
    child.stdin.write(JSON.stringify({ system, user, maxOutputTokens }) + "\n");
    const prepared = await iterator.next();
    if (prepared.done || prepared.value.length > 10000) fail("ROUTER_PREPARE_FAILED");
    const p = JSON.parse(prepared.value);
    if (p.type !== "prepared" || p.trace?.requestedAlias !== "ag/gemini-3.8-flash" || p.trace?.wireModel !== "gemini-3.8-flash-medium" ||
        p.trace?.effectiveMaxOutputTokens !== Math.max(16384, maxOutputTokens) || !/^[a-f0-9]{64}$/.test(p.trace?.requestSha256) ||
        p.expiresAtMs <= now().getTime() + 120000) fail(p.type === "failure" ? p.code : "ROUTER_PREPARE_UNVERIFIED");
    trace = { pricingVersion: pricing.version, pricingSnapshotSha256: pricing.snapshotSha256, ...p.trace };
    bounds = p.bounds;
    const reserveVnd = conservativeTrialReserve(bounds, now());
    // The caller first persists the report-slot checkpoint. Then both ledger
    // transitions are fsynced before any acknowledgment can reach the child.
    await onPrepared({ attemptKey, trace, reserveVnd });
    reservationId = budget.reserveAttempt("v4.2-report", reserveVnd, { attemptKey, trace });
    budget.markDispatched(reservationId);
    if (p.expiresAtMs <= now().getTime() + 120000 || nativeApiReferencePricing(now()).snapshotSha256 !== pricing.snapshotSha256) fail("ROUTER_DISPATCH_EXPIRED");
    child.stdin.end(JSON.stringify({ type: "dispatch", requestSha256: trace.requestSha256 }) + "\n");
    const result = await iterator.next();
    if (result.done || result.value.length > 2000000) fail("ROUTER_RESULT_MISSING");
    const r = JSON.parse(result.value);
    if (r.type !== "result") fail(r.type === "failure" ? r.code : "ROUTER_RESULT_INVALID");
    accountingEvidence = inspectNativeAccountingEvidence(r.accountingEvidence, { requestSha256: trace.requestSha256,
      outputText: r.outputText, receipt: r.receipt, conflictingUsage: r.conflictingUsage });
    visibleUnacceptedOutput = typeof r.outputText === "string" ? r.outputText : undefined;
    const counterNames = ["promptTokenCount", "candidatesTokenCount", "cachedContentTokenCount", "thoughtsTokenCount", "totalTokenCount"];
    usageDiagnostic = { modelVersion: r.receipt?.modelVersion,
      counterPresence: Object.fromEntries(counterNames.map(key => [key, Object.hasOwn(r.receipt?.usageMetadata ?? {}, key)])),
      counters: Object.fromEntries(counterNames.filter(key => Number.isSafeInteger(r.receipt?.usageMetadata?.[key])).map(key => [key, r.receipt.usageMetadata[key]])) };
    // Durable caller evidence precedes strict counter parsing or settlement.
    // A failed checkpoint retains the whole open reservation and stops.
    await onReceipt({ attemptKey, reservationId, accountingEvidence, visibleUnacceptedOutput });
    if (r.conflictingUsage) fail("ROUTER_USAGE_UNVERIFIED");
    if (!accountingEvidence.envelopeComplete && referenceMode !== FD123_MODEL_BOUND_MODE) fail("ROUTER_ACCOUNTING_EVIDENCE_INCOMPLETE");
    const outputSha256 = typeof r.outputText === "string" ? hash(r.outputText) : undefined;
    const settlement = referenceContinuation ? { receipt: r.receipt, outputSha256, accountingEvidence, ...(referenceMode ? { referenceMode } : {}) }
      : { receipt: inspectNativeReceipt(r.receipt), outputSha256 };
    const receipt = settlement.receipt;
    const quote = referenceContinuation ? quoteFd123ReferenceSettlement(settlement, trace, { at: now() })
      : quoteNativeApiReference(receipt, { at: now() });
    const counters = referenceContinuation ? (quote.tokenBounds ?? quote) : receipt;
    if (counters.inputTokens > bounds.inputTokens || counters.outputTokens > bounds.outputTokens || counters.reasoningTokens > bounds.reasoningTokens ||
        BigInt(quote.quoteVnd) > BigInt(reserveVnd) || typeof r.outputText !== "string" || !r.outputText.trim()) fail("ROUTER_RESULT_UNVERIFIED");
    budget.settleAttempt(reservationId, settlement);
    return { attemptKey, reservationId, trace, receipt, quote, outputSha256, outputText: r.outputText, accountingEvidence };
  } catch (error) {
    throw Object.assign(new Error("PAID_TRIAL_ATTEMPT_STOPPED"), { code: typeof error.code === "string" ? error.code : "ROUTER_ATTEMPT_FAILED", reservationId,
      ...(usageDiagnostic ? { usageDiagnostic, visibleUnacceptedOutput } : {}), ...(accountingEvidence ? { accountingEvidence } : {}) });
  } finally {
    clearTimeout(timer); lines.close(); child.kill();
  }
}
