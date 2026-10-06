# Durable native attempt verification

Scope: the isolated lifetime campaign's durable attempt/accounting primitive. Base release `691aca71811d8a311112c43a931fa381b046a26f`; dedicated branch `feat/lsv68-durable-native-attempts`. Independent Sol medium plan-review GO on 2026-10-06. Exact-head review and CI/deployment are subsequent release gates; this record contains pre-release verification only.

## Focused evidence

`node --test --test-reporter=tap scripts/campaign-budget.test.mjs scripts/native-campaign-api-pricing.test.mjs scripts/native-campaign-preflight.test.mjs scripts/native-campaign-transport.test.mjs scripts/native-campaign-attempt.test.mjs`: **58 passed; zero failed/cancelled/skipped** on 2026-10-06. Fourteen new top-level attempt tests, including nine outcome subtests (23 new assertions at the test-runner level), complement 35 existing budget/pricing/preflight/transport tests.

- Six independent child processes raced a single stable key: exactly one actual local TLS POST and one settlement, five durable duplicate rejections. New preflight UUIDs do not authorize replay.
- Two different keys raced an unresolved reservation: one claim succeeds, the other is rejected under the same ledger flock.
- SIGKILL between reserve/dispatch and after an actual local POST preserves exposure across process restart. The same key cannot replay; a fresh key is blocked by unresolved exposure.
- Pre-dispatch release consumes its key permanently. Generic settlement cannot close a keyed dispatched attempt. Successful keyed settlement requires validated complete receipt counters, bounded reference quote and visible-output hash; all reserved money remains charged.
- HTTP errors, body timeout, missing counters, wrong model, invalid/non-STOP candidates, tool parts, thought-only output, multiple candidates and excess cost leave full exposure open and block later keyed attempts.
- Journal allowlists reject secret/extra fields; only trace, counters and hashes are written. Returned output excludes thought text. Pricing is checked immediately before reserve and dispatch, with an injected clock; expiry during reservation results in zero HTTP calls and retained exposure.
- Default real HTTPS produces zero reservation and zero paid upstream calls. All actual test traffic uses a generated local TLS certificate and synthetic credentials.

Required pre-push verification passed: `pnpm i18n:check && pnpm lint && pnpm typecheck`. Lint has zero errors and four existing unrelated image warnings. Producer packages were rebuilt by the root typecheck command before dependent checks. Final lint and whitespace checks also passed.

## Compatibility and limits

Legacy unkeyed v2 journal behavior and corruption/initialization/ownership safeguards remain covered by the original 13 budget tests. New keyed row types extend v2; an older worker fails closed on those new rows rather than losing exposure. Never delete or reinitialize a ledger to resume a blocked attempt or to roll back. No cost refund or automatic retry is introduced.

Attempt identity is supplied by the private caller and must be persisted/reused by a future campaign runner. The driver does not establish the caller-provided reservation's worst-case token bound, prove full report quality, or activate live transport. Injected transports/budget objects are trusted test/implementation seams, not a boundary against a malicious script developer.

The provider-enforced combined thinking/output bound for the exact private Antigravity route remains unverified. The FD114 API tariff is accepted; subscription/invoice evidence is not required. Full LSV68/71 remain In Review pending their real acceptance; no real campaign pass or owner reading acceptance is inferred from this milestone.

Raw logs and release evidence remain outside Git in a private operator evidence directory. Record eventual PR, exact reviewed/merged SHAs, CI, four-service health, installed synthetic smoke and protected operator-file verification in Kaneo after release.
