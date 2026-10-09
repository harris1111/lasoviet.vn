import { closeSync, constants, fstatSync, fsyncSync, lstatSync, mkdirSync, openSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FD123_POLICY, FD123_TECHNICAL_CAP_VND } from "./fd123-reference-continuation.mjs";

// FD-112 approves only this campaign; this primitive does not verify provider prices.
export const TOTAL_CAP_VND = 200_000;
export const DEFAULT_ALLOCATIONS_VND = Object.freeze({ "v4.2-report": TOTAL_CAP_VND });
export class CampaignBudgetError extends Error {
  constructor(code) { super(code); this.code = code; }
}
export function defaultLedgerPath() {
  return process.env.CAMPAIGN_BUDGET_LEDGER ?? join(homedir(), ".lasoviet", "campaign-budget.jsonl");
}
function syncDirectory(path) {
  const fd = openSync(path, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
  try { fsyncSync(fd); } finally { closeSync(fd); }
}
function prepareDirectory(path) {
  const parent = dirname(path);
  if (parent !== path) prepareDirectory(parent);
  try {
    if (!lstatSync(path).isDirectory()) throw new CampaignBudgetError("BUDGET_DIRECTORY_UNSAFE");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    try { mkdirSync(path, { mode: 0o700 }); } catch (failure) { if (failure.code !== "EEXIST") throw failure; }
    if (!lstatSync(path).isDirectory()) throw new CampaignBudgetError("BUDGET_DIRECTORY_UNSAFE");
  }
  // Also sync existing ancestors: another process may have just created them.
  syncDirectory(path);
  if (parent !== path) syncDirectory(parent);
}

const worker = fileURLToPath(new URL("./campaign-budget-ledger-worker.mjs", import.meta.url));
export function createCampaignBudget({ ledgerPath = defaultLedgerPath(), totalCapVnd = TOTAL_CAP_VND,
  allocationsVnd = DEFAULT_ALLOCATIONS_VND, now = () => new Date(), settleActualUsage = false, referenceContinuation } = {}) {
  const fd123 = referenceContinuation === FD123_POLICY;
  if (referenceContinuation !== undefined && !fd123) throw new CampaignBudgetError("BUDGET_CONFIG_INVALID");
  if (fd123 && (totalCapVnd !== FD123_TECHNICAL_CAP_VND || allocationsVnd?.["v4.2-report"] !== FD123_TECHNICAL_CAP_VND || settleActualUsage !== true)) throw new CampaignBudgetError("BUDGET_CONFIG_INVALID");
  if (!Number.isSafeInteger(totalCapVnd) || totalCapVnd <= 0 || totalCapVnd > (fd123 ? FD123_TECHNICAL_CAP_VND : TOTAL_CAP_VND) ||
      !allocationsVnd || Object.keys(allocationsVnd).length !== 1 ||
      !Object.hasOwn(allocationsVnd, "v4.2-report") || !Number.isSafeInteger(allocationsVnd["v4.2-report"]) ||
      allocationsVnd["v4.2-report"] <= 0 || allocationsVnd["v4.2-report"] > totalCapVnd ||
      typeof ledgerPath !== "string" || !ledgerPath.trim() || typeof settleActualUsage !== "boolean") throw new CampaignBudgetError("BUDGET_CONFIG_INVALID");
  const path = resolve(ledgerPath);
  // Opt-in is journal-bound and cannot reinterpret an existing FD112 ledger.
  const config = { totalCapVnd, allocationVnd: allocationsVnd["v4.2-report"], ...(settleActualUsage ? { settleActualUsage: true } : {}), ...(fd123 ? { referenceContinuation } : {}) };
  function command(action, fields = {}) {
    let fd;
    try {
      prepareDirectory(dirname(path));
      const directory = lstatSync(dirname(path));
      if (directory.uid !== process.getuid() || (directory.mode & 0o077)) throw new CampaignBudgetError("BUDGET_DIRECTORY_UNSAFE");
      fd = openSync(`${path}.lock`, constants.O_CREAT | constants.O_RDWR | constants.O_NOFOLLOW, 0o600);
      const stat = fstatSync(fd);
      if (!stat.isFile() || stat.nlink !== 1 || stat.uid !== process.getuid() || (stat.mode & 0o077)) {
        throw new CampaignBudgetError("BUDGET_LOCK_UNSAFE");
      }
      const at = now().toISOString();
      const output = execFileSync("flock", ["--exclusive", "--wait", "5", "/proc/self/fd/3", process.execPath, worker], {
        input: JSON.stringify({ path, config, action, at, ...fields }), encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe", fd], timeout: 10_000,
      });
      const result = JSON.parse(output);
      if (result.error) throw new CampaignBudgetError(result.error);
      return result.value;
    } catch (error) {
      if (error instanceof CampaignBudgetError) throw error;
      throw new CampaignBudgetError("BUDGET_STORAGE_UNAVAILABLE");
    } finally { if (fd !== undefined) closeSync(fd); }
  }
  return {
    ledgerPath: path,
    ...(fd123 ? { referenceContinuation } : {}),
    status: () => command("status"),
    reserve: (campaign, vnd) => command("reserve", { campaign, vnd }),
    reserveAttempt: (campaign, vnd, { attemptKey, trace } = {}) => command("reserve-attempt", { campaign, vnd, attemptKey, trace }),
    markDispatched: id => command("dispatch", { id }),
    release: id => command("release", { id }),
    settle: id => command("settle", { id }),
    settleAttempt: (id, settlement) => command("settle-attempt", { id, settlement }),
  };
}
// Bounds must cover ALL underlying retries/fallbacks and come from verified pricing.
// A wrapper cannot establish those facts; callers must verify them before using it.
export function withBudget(budget, campaign, { perCallVnd, maxCalls } = {}, generate) {
  if (!Number.isSafeInteger(perCallVnd) || perCallVnd <= 0 || !Number.isSafeInteger(maxCalls) || maxCalls <= 0 ||
      !Number.isSafeInteger(perCallVnd * maxCalls) || typeof generate !== "function") {
    throw new CampaignBudgetError("BUDGET_BOUND_UNVERIFIED");
  }
  return async input => {
    const id = budget.reserve(campaign, perCallVnd * maxCalls);
    // Durable dispatch permission precedes ANY callback that can contact a provider.
    budget.markDispatched(id);
    try { return await generate(input); } finally { budget.settle(id); }
  };
}
