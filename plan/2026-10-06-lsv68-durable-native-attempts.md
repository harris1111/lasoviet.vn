# LSV68: Durable native campaign attempts

## Bounded brief

Base: `691aca71811d8a311112c43a931fa381b046a26f` (PR302). FD112 limits execution to the lifetime v4.2 campaign with a 200,000 VND aggregate cap; FD114 accepts the deployed API reference tariff. This milestone removes restart/concurrency replay and unknown-outcome continuation gaps from the isolated native transport. It does not authorize live generation or establish a provider-enforced combined thinking/output bound.

Allowed files: `scripts/lib/campaign-budget.mjs`, `scripts/lib/campaign-budget-ledger-worker.mjs`, new `scripts/lib/native-campaign-attempt.mjs`, new `scripts/native-campaign-attempt.test.mjs`, `package.json`, this plan and `plan/evidence/lsv68-durable-native-attempts/verification.md`. No provider/runtime flags, credentials, public routes, production writer, unrelated campaign or operator configuration changes.

The primary session implements the bounded patch because the prior Flash executor could not run with this Codex account. An independent Sol medium review covers the plan, exact final diff, tests and release evidence.

## Behavior

- A caller supplies a stable opaque attempt key (SHA256 of non-sensitive run/sample/attempt identity). Rebuilding a preflight must reuse this key. Request UUIDs and changing timestamps are not attempt identity.
- Atomically reserve one keyed attempt and its redacted preflight trace under the existing OS flock. The key remains consumed after settlement or pre-dispatch release. Concurrent/restarted callers cannot reclaim it.
- Refuse new keyed attempts while another keyed reservation remains reserved or dispatched. A crash, HTTP error, timeout, malformed native receipt or inconsistent cost leaves full exposure charged and stops further keyed campaign execution. Explicit pre-dispatch release remains possible; dispatched exposure cannot be released.
- Persist dispatch permission before constructing any HTTP request. Use the existing single-POST transport without retry, redirect, refresh or credential rotation. The default real transport remains hard-gated before any reservation.
- Accept only complete native usage at the deployed reference tariff, no missing counters inferred as zero. Preserve full reservation after settlement; known cost is not an automatic refund. Generic settlement cannot close a keyed attempt. Keyed settlement validates allowlisted receipt counters, pricing and visible-output hash under the ledger lock. Reject receipt cost exceeding the caller's reservation and stop the campaign.
- Return only visible text from a single STOP candidate and redacted usage/reference-price evidence. Thought text, access tokens, project identifiers and prompts never enter the durable journal or errors. Full report quality validation remains a later campaign-runner gate.

## Acceptance

Focused tests exercise child-process races and process death/restart against the real flock/journal, consumed keys after settlement/release, durable unknown-outcome stop, complete receipt settlement, over-reservation cost rejection, no refund, privacy projections and zero dispatch with the default live gate. Synthetic transports only; no paid upstream calls. Revalidate the injected clock, pricing interval and credential/deadline immediately before claim/dispatch. Plan-review GO received from independent Sol medium on 2026-10-06; these points are required for exact-head review.

Run the existing budget/pricing/preflight/transport suites plus the new attempt suite, then required i18n/lint/typecheck. Independent exact-head GO and CI precede merge into master and deployment; installed synthetic smoke and protected operator-file integrity precede milestone closure. Full LSV68/71 stay In Review until their respective real acceptance passes.

## Remaining gate

The exact private `daily-cloudcode-pa` / `gemini-3.8-flash-medium` route still lacks verified combined thinking/output enforcement. Model metadata (`thinkingBudget: 4000`, `maxOutputTokens: 65536`) does not prove a thinking hard maximum. No subscription/invoice evidence is required from the owner. Do not turn the transport live or record a real campaign pass on the strength of this milestone.
