import { appendFileSync, mkdirSync, readFileSync, rmSync, existsSync, statSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

// Owner-approved lifetime cap for all real-provider quality campaigns, retries included (FD-082 / LSV-68).
export const TOTAL_CAP_VND = 200_000;
// Proposed split of the cap. Unallocated remainder stays as reserve.
export const DEFAULT_ALLOCATIONS_VND = { "v4.2-report": 80_000, "topic-deep-dive": 45_000, "period-reading": 45_000, "daily-reading": 20_000 };
// Conservative worst case for one provider call. Cost of broker responses is unknown (LSV-71),
// so every reservation is charged in full and never refunded after a call was sent.
export const DEFAULT_PER_CALL_RESERVE_VND = 1_500;

const LOCK_STALE_MS = 30_000;
export class CampaignBudgetError extends Error {
  constructor(code) { super(code); this.code = code; }
}

export function defaultLedgerPath() {
  return process.env.CAMPAIGN_BUDGET_LEDGER ?? join(homedir(), ".lasoviet", "campaign-budget.jsonl");
}

function withLock(path, fn) {
  const lock = `${path}.lock`;
  mkdirSync(dirname(path), { recursive: true });
  for (let attempt = 0; attempt < 200; attempt++) {
    try { mkdirSync(lock); break; } catch (error) {
      if (error.code !== "EEXIST") throw error;
      if (existsSync(lock) && Date.now() - statSync(lock).mtimeMs > LOCK_STALE_MS) rmSync(lock, { recursive: true, force: true });
      else Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 25);
    }
    if (attempt === 199) throw new CampaignBudgetError("BUDGET_LEDGER_LOCK_TIMEOUT");
  }
  try { return fn(); } finally { rmSync(lock, { recursive: true, force: true }); }
}

function replay(path) {
  const totals = { total: 0, byCampaign: {}, open: new Map() };
  if (!existsSync(path)) return totals;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    if (!line.trim()) continue;
    const row = JSON.parse(line);
    if (row.type === "reserve") {
      totals.open.set(row.id, row);
      totals.total += row.vnd;
      totals.byCampaign[row.campaign] = (totals.byCampaign[row.campaign] ?? 0) + row.vnd;
    } else if (row.type === "release" && totals.open.has(row.id)) {
      const open = totals.open.get(row.id);
      totals.open.delete(row.id);
      totals.total -= open.vnd;
      totals.byCampaign[open.campaign] -= open.vnd;
    } else if (row.type === "settle") {
      totals.open.delete(row.id); // a settled reservation stays charged in full
    }
  }
  return totals;
}

export function createCampaignBudget({ ledgerPath = defaultLedgerPath(), totalCapVnd = TOTAL_CAP_VND, allocationsVnd = DEFAULT_ALLOCATIONS_VND } = {}) {
  const append = row => appendFileSync(ledgerPath, JSON.stringify({ ...row, at: new Date().toISOString() }) + "\n", { mode: 0o600 });
  return {
    ledgerPath,
    status() {
      return withLock(ledgerPath, () => { const t = replay(ledgerPath); return { totalVnd: t.total, byCampaign: { ...t.byCampaign }, openReservations: t.open.size, capVnd: totalCapVnd }; });
    },
    // Must be called before the provider is contacted. Throws instead of letting a call overrun the cap.
    reserve(campaign, vnd) {
      if (!Number.isInteger(vnd) || vnd <= 0) throw new CampaignBudgetError("BUDGET_RESERVATION_INVALID");
      if (!(campaign in allocationsVnd)) throw new CampaignBudgetError("BUDGET_CAMPAIGN_UNKNOWN");
      return withLock(ledgerPath, () => {
        const t = replay(ledgerPath);
        if (t.total + vnd > totalCapVnd) throw new CampaignBudgetError("BUDGET_TOTAL_CAP_REACHED");
        if ((t.byCampaign[campaign] ?? 0) + vnd > allocationsVnd[campaign]) throw new CampaignBudgetError("BUDGET_CAMPAIGN_CAP_REACHED");
        const id = randomUUID();
        append({ type: "reserve", id, campaign, vnd });
        return id;
      });
    },
    // Call only when the provider was provably never contacted.
    release(id) { withLock(ledgerPath, () => append({ type: "release", id })); },
    // After a call was sent the reservation stays charged; settle only closes it.
    settle(id) { withLock(ledgerPath, () => append({ type: "settle", id })); },
  };
}

// Wraps one generation (which may call the provider up to 1 + maxRewriteAttempts times).
export function withBudget(budget, campaign, { perCallVnd = DEFAULT_PER_CALL_RESERVE_VND, maxCalls }, generate) {
  return async input => {
    const id = budget.reserve(campaign, perCallVnd * maxCalls);
    try { return await generate(input); } finally { budget.settle(id); }
  };
}
