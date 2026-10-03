# B20 — Preflight evidence (Phase B, B08–B19)

Date: 2026-10-03. Executed by Claude on a disposable PostgreSQL 16 (Testcontainers, Docker), fake provider only,
no real provider call, no provider spend. Base: `066479f`. Branch stack: #263 → #264 → #265 → #266 → this PR.

## Result

`pnpm vitest run tests/free-ai --reporter=verbose` — **12 files, 98 tests passed** on real Postgres, with two or more
independent connections and a held coordination lock to force genuine contention (`raceBehindLock`), Postgres triggers for
fault injection, a counted fake-`fetch` for physical attempts, and fake clocks that advance *during* a lock wait.

Wider run (`pnpm vitest run packages apps tests`): 3903 passed, 21 failed. All 21 are `tests/deployment/cd-scripts.test.ts`,
which fails identically (21 failed | 7 passed) on the untouched base commit `066479f` in a clean worktree: pre-existing,
unrelated, not caused by Phase B. `pnpm i18n:check`, `pnpm lint` (0 errors, 4 pre-existing warnings),
`pnpm -r --if-present run build` and `typecheck` pass.

## Matrix (handoff `05` §3) → test → status

Legend: ✅ run and passing on real Postgres · 🧪 unit/HTTP-level, run and passing · ⚠️ see note.

| # | Row | Test file | Status |
|---|---|---|---|
| 1 | Two connections, one chart ≤ 3,000 VND | `budget.integration` rows 1, 1 (ceiling), 9 | ✅ |
| 2 | Different charts, same UTC day ≤ 50,000 VND | `budget.integration` row 2 | ✅ |
| 3 | Reserved + resolved + unknown all count | `budget.integration` row 3 | ✅ |
| 4 | Unknown/unreconciled legacy blocks admission | `budget.integration` row 4; `preflight.e2e` cross-producer | ✅ |
| 5 | Legacy outcome imported once | `budget.integration` row 5 | ✅ |
| 6 | Guest 1 / account 3 / 25 h-old not counted | `budget.integration` row 6 | ✅ |
| 7 | Cache hit before any charge, even flag off | `budget.integration` row 7 | ✅ |
| 8 | Fault after each write → no partial rows | `budget.integration` row 8 (8 injected faults) | ✅ |
| 9 | Technical key change never re-grants slot | `budget.integration` rows 1/9 | ✅ |
| 10–15 | Link: union, serialize, idempotent, vs admission, survives auth delete, stale hint | `linking.integration` | ✅ |
| 16 | Fence CAS: two workers → one | `dispatch.integration` row 16 | ✅ |
| 17 | Crash after fence → no send, slot burned | `dispatch.integration` row 17; `outbox.integration` restart | ✅ |
| 18 | Lease expiry / restart / timeout → no second attempt | `dispatch.integration` row 18; `outbox.integration` | ✅ |
| 19 | Lock wait across midnight → day sampled after wait | `dispatch.integration` row 19 (+ admission) | ✅ |
| 20 | Dispatch spanning midnight settles on pinned day | `settlement.integration` row 20 | ✅ |
| 21 | Duplicate settlement idempotent | `settlement.integration` row 21 (×2) | ✅ |
| 22 | Unknown outcome retains hold, blocks ready | `settlement.integration` row 22; `deletion.integration` | ✅ |
| 23 | Quality failure charged, quota consumed | `settlement.integration` row 23; `outbox.integration` | ✅ |
| 24 | Overshoot uncapped, halts, redacted incident | `settlement.integration` row 24 | ✅ |
| 25 | Tariff change between reservation and fence | `dispatch.integration` row 25; `preflight.e2e` tariff change (real port) | ✅ |
| 26 | Deletion before publish blocks it | `deletion.integration` rows 26/27, 26 (race) | ✅ |
| 27 | No resurrection | `deletion.integration` rows 26/27 | ✅ |
| 28 | Guest 24 h TTL purge | `deletion.integration` row 28 | ✅ |
| 29–30 | Account deletion purge; tombstones hold no birth data/prose | `deletion.integration` rows 29/30 (sentinel scan) | ✅ |
| 31 | Non-owner/status reads indistinguishable | `reader.integration` row 45, `free-palace-route.test` row 47 | ✅ / 🧪 |
| 32 | Existing privacy suites green | `packages/backend/src/privacy`, `tests/privacy` | ✅ |
| 33 | Exactly one physical attempt, incl. transport failure | `free-palace-writer.test` (real adapter, counted fetch); `worker.integration` | 🧪 / ✅ |
| 34 | Ready output strict + evidence resolves | `free-palace-writer.test`, `outbox.integration` e2e | 🧪 / ✅ |
| 35 | Invented/wrong palace/date/prohibited → fallback, billed, no 2nd call | `free-palace-quality.test`, `free-palace-writer.test`, `outbox.integration` | 🧪 / ✅ |
| 36 | Paid writer/retry/critic/rewrite unchanged | `git diff 066479f -- packages/backend/src/ai reports outbox` empty; writer import test; `worker.integration` (paid `AI_MAX_RETRIES=3`, gift still 1 attempt) | ✅ |
| 37 | Reserved snapshot verified before call | `free-palace-writer.test` | 🧪 |
| 38 | Gift event claimed by its runner, ignored by paid dispatcher | `outbox.integration` row 38 | ✅ |
| 39 | Duplicate delivery ⇒ ≤ 1 attempt | `outbox.integration` row 39 | ✅ |
| 40 | Flag off at startup ⇒ nothing dispatch-capable constructed | `apps/worker free-palace-worker.test` | 🧪 |
| 41 | Missing pricing/config ⇒ fail closed | `worker.integration` row 41; `free-palace-worker.test` | ✅ / 🧪 |
| 42 | Paid report/PDF runners coexist; health unchanged | `free-palace-worker.test` row 42; full `apps/worker` suite | 🧪 |
| 43 | Reader performs no dispatch/quota mutation | `reader.integration` (write-forbidding DB proxy + row counts) | ✅ |
| 44 | Each status maps correctly | `reader.integration` row 44, `free-palace-read.service.test` | ✅ / 🧪 |
| 45 | Stale/wrong-owner/wrong-locale never exposed | `reader.integration` row 45 | ✅ |
| 46 | Repeated ready read is a free cache hit | `reader.integration`, `preflight.e2e` | ✅ |
| 47 | Endpoint private, no-store, 404-indistinguishable, GET never generates | `apps/api free-palace-route.test` | 🧪 |
| 48 | Loader rejects unsupported/malformed | `load-free-palace-gift.test` | 🧪 |
| 49 | UI renders full one-palace gift; honest fallback; no 11-palace implication | `ziwei-free-result.test`, `ziwei-free-result-model.test`; browser check 375 px / 1280 px | 🧪 ⚠️ |
| 50 | No polling, no 360 px regression | no polling exists by construction; browser check at 375 px | ⚠️ (360 px device pass not run) |
| 51 | Flag off ⇒ calculation byte-identical | `ziwei.service.test`, `request-hook.integration` | ✅ |
| 52 | Hook failure doesn't fail calculation | `ziwei.service.test` | 🧪 |
| 53 | Repeated calculation reuses slot | `request-hook.integration` row 53 | ✅ |
| 54 | Composition builds no paid/synthetic writer, never awaits generation | `apps/api free-palace-composition.test` | 🧪 |
| 55 | Fake-provider end-to-end → authorized cache read | `preflight.e2e` row 55 | ✅ |
| 56 | Kill-switch drill | `preflight.e2e` row 56 | ✅ |
| 57 | Rollback drill (cache-only) | `preflight.e2e` row 57 | ✅ |

### Redacted ledger from the end-to-end run (row 55)

Ids, states and amounts only; the test asserts no prompt, prose, birth data or secret appears in it.

```
request  status=ready  admission_day=dispatch_day=2026-10-03  reserved=240,000,000 µVND
settlement  outcome=resolved  actual=54,000,000 µVND (= 1200×15,000 + 600×60,000, integer, no cached discount)
chart budget   reserved 0 / resolved 54,000,000 / unknown 0
daily budget   reserved 0 / resolved 54,000,000 / unknown 0
outbox  free_palace.generation.requested.v1  status=processed
```

Drill outcomes: **kill switch** — flipping the flag off stops the runner (processed 0), maintenance and the request hook,
admits nothing new, leaves a ready gift readable and a queued request visibly `requested`; flipping it back on resumes the
queued request with exactly one attempt. **Rollback** — with no runner constructed nothing generates, ready stays readable,
the queued event stays `pending`. **Tariff change** — a newer approved tariff cancels the queued request unsent and
releases its hold.

## What is not covered, and why

1. **Real provider / production adapter** — no provider call is allowed in this phase. Behaviour under a real model's
   output, latency, and rate limits is unobserved. The one-palace quality evaluation against real output is still owed.
2. **Token-bound proof (open gate).** No reviewed guarantee of "exact serialized input + enforced max output" exists, so the
   production composition supplies none and every request ends `unproven_bound`. The end-to-end test substitutes a **fake**
   proof supplier to exercise everything downstream; that fake must never be mistaken for a reviewed guarantee.
3. **Deployed environment** — no deployed API/worker/Redis health probe, no private-result smoke, no budget dashboard.
   (A "redacted accounting dashboard" is a release-gate item that does not exist yet; the ledger above is queryable but
   there is no dashboard.)
4. **Phase A browser matrix (A17)** — themes, focus order, history and LCP, and a physical 360 px device pass, were not run.
5. **`tests/deployment/cd-scripts.test.ts`** — 21 pre-existing failures on the base commit; they test deploy shell scripts and
   were not touched.
6. **Single-profile soft delete** (`birth-profile.repository.ts`) does not purge gift payloads (reader still re-authorizes;
   payload clears at TTL or account purge) — see ADDENDA B11.
7. **English gift quality** — English facts, prompt and quality gate are covered by tests (including the label-parity test), but real English model output has not been evaluated.

**Flag stays OFF.** Missing/unbounded gates: token-bound proof, real-provider quality evaluation, dashboard, deployed smoke,
A17 matrix, owner/operational approval, and provider-spend authorization.
