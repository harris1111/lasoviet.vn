# PR 297: lifetime campaign budget guard repair

## Bounded authorization

The owner authorized this repair and a public model/pricing lookup on 2026-10-06. FD-112 authorizes only the lifetime v4.2 real-quality campaign, capped at 200,000 VND including retries, after routing and pricing verification. Other campaigns remain deferred. No additional budget approval is required. This PR supplies a durable budget primitive and synthetic verification; it does not activate a provider, change billing tables, or run a campaign.

Allowed changes: the campaign budget library/worker/tests, root script-test registration, and this record. Remove this PR's topic/period wiring because those campaigns are deferred. No UI, production adapter, operator setting, migration, pricing activation or paid call.

## Findings and correction

The previous guard guesses 1,500 VND per call, splits the approved cap among unapproved campaigns, can delete an active lock after 30 seconds, and does not fsync reservations. It also permits arithmetic/configuration and journal transitions that cannot prove a cap. Replace the guessed rate with explicit positive safe-integer bounds supplied by a caller after independent route/rate/retry verification. Enforce the fixed maximum and lifetime-only scope. Use the installed Linux `flock` utility, which releases locks when a process dies; never reclaim a lock by elapsed age. Serialize and fsync a versioned journal before returning a reservation or dispatch permission. Sent/unknown/crashed reservations remain charged. Release is permitted only before a durable dispatch marker. Corrupt/incompatible journals fail closed without resetting exposure. Verify real process concurrency, restart/crash retention, malformed records, permissions, cap exhaustion and dispatch/refund fencing.

## Public pricing lookup and remaining gate

Google's official model catalog lists `gemini-3.8-flash`. Its direct API pricing checked on 2026-10-06 is USD 0.75/million input tokens, 3.75/million output tokens including thinking, and 0.075/million cached input tokens. The page describes these as promotional through 2026-12-31, after which pricing can change. Sources: https://ai.google.dev/gemini-api/docs/models and https://ai.google.dev/gemini-api/docs/pricing .

Read-only inspection of the installed gateway pricing source still reports input 1.5, output 7.5, cached 0.15, reasoning 11.25 and cache-creation 1.875 USD/million. Direct Google prices do not prove this gateway route's actual accounting. Existing AG/Gemini usage quarantine remains binding: authoritative raw usage and a proven whole-request retry/fallback bound are still required. Do not remove quarantine or substitute the public direct rate for active gateway pricing. No paid completion has been sent by this task.

## Release gates

Focused synthetic tests, required i18n/lint/producer-rebuilding typecheck, independent exact-head review and green CI precede merge. Deployment and installed synthetic smoke precede milestone closure. Full LSV68/71 remain In Review; 20 consecutive full real reports plus owner review of five are still required. This guard alone does not establish model quality or verified provider costs.

## Independent review correction

The first independent review returned NO GO for reinitializing a missing/empty journal and insufficient persistence of newly created directory entries. The correction adds a persistent initialization marker to the OS lock file before creating the journal. Existing empty journals and missing initialized journals fail closed without changing exposure. Every newly created directory and its parent entry are fsynced. The original journal/marker must be retained together; all real campaign invocations must use one canonical persistent path and execution identity. Changing the path or deleting both files is not a supported reset or migration. This is a single-host campaign primitive, not a distributed billing database.

Thirteen focused synthetic tests now pass, including real competing processes, crash/restart, held lock, loss/truncation, malformed transitions, nested directory initialization and callback denial at cap. No hardware power-loss test is claimed. Required i18n/lint/producer-rebuilding typecheck passed before this final review correction; repeat verification and independent review are required before push.


A second review rejected a concurrent-bootstrap race: a process could observe an ancestor created by a peer before that peer fsynced its parent entry. Directory preparation now always traverses and synchronizes the entire chain, including existing directories. A six-process nested-bootstrap regression passes; independent working-diff review returned GO after all 13 tests passed independently. Required i18n/lint/producer-rebuilding typecheck pass with zero errors and four existing unrelated lint warnings. Final eslint and exact-head review precede push.
