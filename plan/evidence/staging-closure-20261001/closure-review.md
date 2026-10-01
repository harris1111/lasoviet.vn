# Staging release and independent closure review — 2026-10-01

## Release

- PR #242 merged as `544afaa86b6fbd7bf1697863ef3a2fad57f43511`.
- GitHub run `36836175333`: verify, publish and production promotion passed.
- Existing deployment automation recorded success at `2026-10-01T08:36:27Z`.
- Web, API and worker are healthy on the same immutable revision.
- Previous release: `adeb56d2be7bc51c8866d470edfb6b868d08010d`.
- Canonical-origin and published-loopback build asset sets match.
- Live FD109 browser suite: 17 passed in 59.5 seconds; no fixture interception.

## Verified base smoke

[`runtime-smoke-base-pass.json`](runtime-smoke-base-pass.json) records 12 passing
checks and an overall PASS. SQL connections enforce read-only mode. Normal
welcome-grant and analytics side effects are allowed through actual application
requests; no orders, unlocks, refunds or provider calls were requested. AI-call,
report-job and reservation counts did not increase during the base smoke.

An initial run is retained separately. Harness assumptions about combined pack
totals were wrong; the final test checks real pack IDs. Clearing localStorage
while a notice request was in flight also caused nondeterminism; isolated fresh
browser-local state removes that race. No product assertions were weakened and
no application changes were made.

## Independent Sol review

**LSV-55: approved for Done.** Original focused coverage establishes first grant,
verified-only eligibility and concurrent replay. Deployed smoke establishes
exactly one 60-Lá promotional ledger entry, unchanged balance across concurrent
replays, anonymous denial and VI/EN notice dismissal persisted across reload.

**LSV-69: approved for Done.** Deployed owned full v4.1.2 reader shows all 12
palaces, the trine polygon and opposite line. Mobile sheet keyboard navigation,
Escape/focus restoration, desktop palace navigation and print expansion/state
restoration passed. Reviewer inspected mobile/desktop dark/light screenshots.
Those screenshots contain private staging-account charts and are **not committed**.
Original focused coverage plus runtime evidence closes this scope.

## Remaining gates; no false Done transitions

| Ticket | Remaining gate |
| --- | --- |
| 50 | Actual SePay acceptance. Disabled auto-approved top-ups are not SePay sandbox evidence. |
| 51 | Deployed payment continuation → auto-unlock → exact destination/balance smoke. |
| 52 | Real eligible rollover quote and catalog/rename UI smoke. Baseline quotes alone are insufficient. |
| 53 | Reconcile FD109 scope and verified concern insight, including English fallback semantics. |
| 54 | Existing two-palace purchases, generation reuse, owned partial reader and partial-PDF denial smoke. |
| 57 | Missing production callers for upgrade-purchased, welcome-grant, part-feedback and guarantee-claimed telemetry. Direct ingestion does not prove UI wiring. |
| 59 | Free FD109 insights still lack part-feedback controls. |
| 60 | Actual email/consent/unsubscribe/dedup smoke; annual reminder release depends on 63. |
| 61 | Upgrade excerpt, accurate open/locked counts and exact rollover deadline. |
| 62 | Independent daily content/release acceptance and authenticated expiry/refund smoke. |
| 58, 63, 68 | Required actual-generation/content acceptance; do not substitute short comparisons or fixtures. |
| 65 | Constituent annual/lifetime acceptance and atomic combo smoke. |
| 64, 66 | Owner-approved hold; membership benefits and stable BaZi/consent respectively. |
| 70 | Stage 1 released; complete free palace requires writer/cache/durable budget task 71. |

The opt-in quote/telemetry phase also passed: [`runtime-smoke.json`](runtime-smoke.json)
records 14 checks, including real baseline 120/960 quotes and unchanged replay
IDs, reserved-topic rejection, persisted analytics deduplication and forbidden
property rejection. Wallet balance and AI/job counters were unchanged. Two
pending quote intents and bounded test telemetry were allowed API writes.

The founder account has one historical lifetime wallet spend but **no qualifying
palace/excerpt spends**. It therefore cannot provide a real rollover quote or
two-palace-purchase smoke fixture. No ownership or historical timestamps were
modified to manufacture evidence; LSV-52 and LSV-54 remain open.

Focused follow-up: 20 tests passed across the catalog and isolated PostgreSQL
welcome-grant suites. Private account screenshots are kept outside this report.
