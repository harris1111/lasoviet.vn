# B21 — Final PR handoff and owner gate (Phase B, B08–B19)

Prepared 2026-10-03 by Claude. **An or Lãm controls merge and deploy.** Nothing here is merged, deployed or approved.
The flag `FREE_PALACE_GENERATION_ENABLED` is absent/false by default and stays that way.

## 1. What is being handed over

Five stacked PRs off `master @ 066479f` (merge in this order; each is based on the previous branch):

| PR | Cards | What it adds |
|---|---|---|
| #263 | B08–B11 | Shared atomic budget reservation (3,000 VND/chart, 50,000 VND/UTC day, rolling quota), quota-history merge on linking, dispatch fence + once-only settlement, deletion-safe publication/retention |
| #264 | B12–B14 | Gift-only writer (one attempt), one-palace quality gate, gift outbox claim path + runner, worker composition (fail closed) |
| #265 | B15–B17 | Read-only reader, private endpoint + web loader, mobile-first gift UI |
| #266 | B18–B19 | Optional chart-ready request hook, API composition |
| #267 | B20–B21 | End-to-end preflight test, evidence, this handoff |
| #269 | owner decisions | English gifts (reader's locale), engagement-based guest trust, labels parity test |

Diff vs base (through #266): 64 files, +4,515 / −86. **No migration was added** (`git diff 066479f -- packages/database/drizzle` is empty); migration `0055_free_ai` already shipped with PR #258. **No paid file changed**
(`packages/backend/src/ai`, `…/reports`, `…/outbox` diff is empty).

Behaviour that is live the moment these merge, with the flag off: the free result page and the private
`GET /ziwei/charts/:chartId/free-palace` read path (returns "unavailable" with no gift) and the cache reader. Everything that can
request, fence or call a provider is gated by the flag **and** approved production AI, and additionally by a token-bound proof
that does not exist (§4), so nothing can dispatch even with the flag on.

## 2. Evidence

See `B20-PREFLIGHT-EVIDENCE.md`: 98/98 free-AI tests on real Postgres (races, fault injection, midnight, link, delete, fence,
settlement, end-to-end, kill-switch and rollback drills); wider run 3903 passed, 21 failed, the 21 being
`tests/deployment/cd-scripts.test.ts`, which fails identically on the untouched base commit.

## 3. Migration and backout

- **Migration:** none new. `0055_free_ai` (8 `free_ai_*` tables) is already on master.
- **Backout, in order of increasing blast radius** (each step is independent and safe):
  1. *Kill switch:* unset/false `FREE_PALACE_GENERATION_ENABLED`, restart API and worker. Verified: the runner, maintenance and
     the request hook stop; no new admission; a ready gift stays readable; a queued request stays `requested`.
  2. *Cache-only rollback:* withdraw the worker's gift runner (flag off). Verified: nothing generates, nothing regresses.
  3. *Code rollback:* revert the stack (#266 → #263). Tables are additive and unused by paid flows, so they can stay.
     Exposure rows (`reserved`/`unknown`) are accounting records; do not delete them.
- A failed smoke must **kill new generation** (step 1) and keep safe cache/structural reads.

## 4. Gates still open (flag stays OFF until every one is closed)

1. **Token-bound proof.** No reviewed guarantee exists for "exact serialized input + enforced max output" on the production
   provider. `NO_REVIEWED_TOKEN_BOUND_PROOF` is supplied on purpose. Needs a reviewed adapter and a founder/An sign-off.
2. **Approved active pricing** (VND) for the chosen provider/model, and explicit **provider-spend authorization**.
3. **One-palace quality evaluation** against real model output, plus the paid quality suites passing unchanged.
4. **Redacted accounting dashboard** — does not exist yet (the ledger is queryable; there is no dashboard).
5. **Deployed private-result smoke** and a rehearsed kill-switch/rollback in the target environment.
6. **Phase A A17** browser/theme/focus/history/LCP matrix and a physical 360 px pass.
7. **Prompt wording and brand-voice review** (`RULES` in `free-palace-writer.ts`).
8. Normal technical + operational approval by An or Lãm.

## 5. Phase A (A01–A17) status, for the audit record

A01–A16: implemented and merged in PR #258 (see `EXECUTION-LOG.md`); I re-ran the affected suites in every Phase B run
(web/ziwei suites pass) but did not re-audit each finding against the original audit text, which is not in this repository
folder — the per-finding evidence lives in `EXECUTION-LOG.md`. **A17** (browser/theme/focus/history/LCP matrix): **not run**.

## 6. Proposed amendments (PROPOSALS — none is approved, nothing was added to the tracker)

Per the repository convention these are for the owner to adopt or reject in `rules-and-decisions-tracker.md`:

- **P1 (clarify FD-109a):** record that the legacy "unique import key" for historic free attempts is enforced by locking the
  chart row and writing `legacy_reconciled_at` in the same transaction, and that any legacy attempt without a resolved outcome
  blocks admission for that chart.
- **P2 (DECIDED by the owner 2026-10-03):** English gifts — yes. One gift per chart version, in the reader's locale at request time (see ADDENDA, "Owner decisions of 2026-10-03").
- **P3 (DECIDED by the owner 2026-10-03):** guest trust = real engagement with the free reading (≥ 3 distinct tabs opened), recorded and decided server-side. An must confirm it reads the "no browser effect" rule the way ADDENDA explains.
- **P4 (clarify FD-109a):** an actual cost above its reserved bound is recorded uncapped, halts all free dispatch, and is lifted
  only by an attributed owner acknowledgement (`acknowledgeOvershoot`). Confirm that is the intended operating procedure.
- **P5 (CONFIRMED by the owner 2026-10-03):** a fenced request whose worker dies is settled as *unknown exposure* after (AI timeout + 10 min) and
  its slot is burned, with no refund or re-admission.
- **P6 (clarify privacy):** account-deletion purge of gift payloads happens at the final purge, not at request time (so a
  cancelled deletion does not lose the one-time gift).

## 7. Deployed smoke plan (after an authorized deployment only)

1. With the flag OFF: open a free result page for a guest and a verified account; confirm the page is unchanged (structural),
   `GET …/free-palace` returns `unavailable` with `Cache-Control: private, no-store`, and a stranger/missing chart returns the
   same not-found envelope.
2. Confirm the worker health probe and heartbeat are unchanged.
3. Only if gates 4.1–4.8 are closed: enable the flag for one controlled account, confirm one request → one attempt → ready, read
   the redacted ledger, then run the kill-switch drill. A failed smoke ⇒ flag off.
4. Kaneo: **do not** move any task to Done before steps 1–3 pass in the deployed environment. Reference tickets: #70 (FD-109
   parent), #71 (An's Phase B), #72 (Phase A follow-ups); no tracker IDs were invented.

## 8. Suggested review order

#263 first (money, quota, deletion: highest risk — start with `free-ai-budget.repository.ts`, `free-ai-dispatch.service.ts`,
`free-ai-settlement.service.ts`, `free-palace-artifact.repository.ts`, and the two privacy-repository hooks), then #264, #265,
#266. `ADDENDA.md` lists every edit outside a card's allowlist and every design decision, per card.
