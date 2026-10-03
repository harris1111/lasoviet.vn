# Phase B (B08–B21) — allowlist addenda and design decisions

Edits outside a card's allowlist, and decisions the handoff required to be explicit. English, append-only.

## Decisions (owner-confirmed 2026-10-03)

- **B08 outbox aggregate type:** extend `WorkflowEnvelopeV1.aggregateType` with `"chart"` (one-line change in `packages/database/src/schema/outbox.ts`). The DB column is plain `text`, so there is no migration. A chart-scoped gift event does not fit `order | report | asset | account`, and no cast was used.
- **B09 shared primitives:** option (A). The transaction-safe primitives (alias hash, lock keys, coordination/subject locks, clock sample, subject resolution) move down into `packages/database/src/free-ai-quota-link.ts`; `packages/backend` imports them from `@lasoviet/database`. The alias hash and lock keys therefore have exactly one definition.

## B08

- New shared test harness `tests/free-ai/free-ai-test-harness.ts` (disposable Postgres, independent pools, held-lock race helper, legacy-attempt seeding). Used by every later `tests/free-ai` integration suite.
- `packages/backend/src/index.ts` export is **deferred to B13**; until then the repository is intentionally unreachable from API/worker.
- Legacy "unique import key": no new table (that would need a migration). Each legacy `free_preview` attempt is imported exactly once because the chart row is locked `FOR UPDATE` under the global coordination lock and `legacy_reconciled_at` is written in the same transaction as the imported amounts. Any attempt without a resolved outcome has no provable bound and blocks admission (`legacy_unreconciled`); that refusal rolls back, so `legacy_reconciled_at` is never written for an unreconciled chart.
- `ai_call_attempts` / `ai_usage_outcomes` are append-only, so integration tests isolate by unique chart ids instead of deleting rows.
- Invariant for every later card: **every free-AI writer (admission, fence, settlement, publication, deletion, linking) takes `lockFreeAiCoordination` first.** Readers of slot state inside those transactions rely on it.
- The admission transaction also stores the frozen call in `free_ai_artifacts.frozen_call` with `content = NULL`. B15's reader must treat an artifact row with null content as "not ready", never as a hit.
- Fault injection is done with Postgres triggers in the test, so no test hook exists in production code.

## B09

- Files outside the allowlist: `packages/database/src/index.ts` (exports the moved primitives and `mergeFreeAiQuotaHistory`) and 🔶 `packages/backend/src/ziwei/free-ai-admission.service.ts` (now imports and re-exports the primitives from `@lasoviet/database`; `checkFreeAiQuota` stays there as a pure helper).
- Guest quota identity is keyed by the **anonymous actor id** (`authAnonymousActors.id`) and account identity by the **user id**. B18's composition must pass exactly those ids as `actor.id`, or linking will not find the guest history.
- Semantics of a merge racing an admission: the merge never deletes admitted history. If an account admission lands before the link, the account may show 4 distinct admissions in the window afterwards (each was legal when it ran); every later admission is refused until the window clears. If the link lands first, the new admission is refused at 3.
- Merging never crosses accounts: a guest subject that has already merged elsewhere is left alone, and a repeated merge returns `merged: false`.

## B10

- 🔶 `packages/backend/src/ziwei/free-ai-budget.repository.ts` (B08 file) was edited again: `clock` test seam (always sampled after the coordination lock), `dispatch_halted` refusal, and the shared day gate `readDailyGateTotal` + `isFreeAiDispatchHalted`, so admission, fence and settlement apply one rule. The day gate now counts the day's own exposure **plus every unresolved hold (reserved or unknown) on an earlier day**; a hold that is re-reserved at fence is moved off its old day row, so nothing is double counted or dropped at midnight.
- `tests/free-ai/free-ai-test-harness.ts` gained `admitRequest`.
- Gift cost recorder wrapper around `ai-cost.ts` stays in **B12** (the writer owns the provider call). B10 only takes an injected `activePricingSnapshotId(tx, now, provider, model)` and refuses to fence when it is not the reserved snapshot. No re-pricing and no re-freeze: a changed tariff **cancels** the unfenced request (hold released, admission stays consumed, no re-admission).
- Status after settlement: `resolved/publishable` stays `dispatching` with `settled_at` set — only B11's deletion-safe publication may move it to `ready`. `resolved/failed` → `terminal_failure`; `unknown` → `cost_unknown` (whole bound moved to unknown exposure).
- Overshoot halt has no new table: it is derived from the ledger (a resolved settlement above its reserved bound with no `free_ai.overshoot.acknowledged` audit row) and lifted only by `acknowledgeOvershoot` (attributed owner action). The incident is an `audit_logs` row `free_ai.overshoot` with ids and amounts only.
- Crash between fence and settlement: `settleAbandoned` converts stale `dispatching` requests to unknown exposure. B14's worker must schedule it (suggest every maintenance tick, `staleAfterMs` ≥ provider timeout + margin).
- Still deferred to B13: exporting these services from `packages/backend/src/index.ts`.
