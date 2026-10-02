# Notification completion delivery

FD-105 package 1.11 continues the notification foundation on top of the top-up continuation, shared natal report, daily-reading, and refund branches. No deployment or live email exercise is part of this implementation.

## Delayed unlock

Verified owners explicitly acknowledge presence through POST on the checkout status BFF. Visible checkout and completion receipts send a heartbeat every 30 seconds. The private API checks both account verification and immutable order ownership. GET polling and payment return callbacks remain navigation/read operations; they do not settle orders or alter balances.

The worker scans completed continuations after five minutes and only sends if the owner has not acknowledged completion and has been absent for five minutes. The existing maintenance cadence is 15 minutes, so five minutes is a minimum delay, not an exact delivery deadline. Every candidate is checked against current report authorization and a ready reader projection, or an unexpired persisted daily reading. Corrupt or pending reports do not produce a ready email. The original selected purchase must remain active even if another scope on the shared report survives a refund.

Delivery uses the existing durable notification ledger, lease, retry, and unknown-delivery handling with a stable order key. The send path rechecks owned authority, absence, current recipient, and exact server-generated canonical destination after claiming the delivery. A return/refund/recipient change before retry suppresses delivery. SMTP acceptance racing a later customer return cannot be recalled.

## Sign-in nurture

A durable latest verified-session creation timestamp is recorded by Better Auth's session creation after-hook. The installed Better Auth hook implementation queues this hook after its database transaction. Account creation time is never used as a sign-in substitute, and historical accounts are not backfilled with invented sign-ins. Older event replay cannot rewind the timestamp.

At 48 hours, the worker may enqueue one nurture email per account when no historical paid order or content entitlement exists, current offers consent allows it, and a current owned chart supplies a real palace. The send path repeats these conditions and validates the canonical chart URL and signed unsubscribe link. Missing consent checker fails closed. All dynamic HTML is escaped.

## Computed lunar-month reminders

The annual report catalog gate also gates reminder scanning and dispatch. While `ZIWEI-YEAR-2026-P0` remains reserved pending real-provider stability evidence, no automatic annual reminders are sent. The completed scanner uses the same lunar calendar as the engine and the immutable stored annual report snapshot. It selects only a current lunar year/month/leap flag/day range with genuine obstacle stars included in that period's computed star list. Leap halves retain their distinct identity and are named in the message. It does not infer a warning from prose or invent an uncomputed month.

A ready, still-authorized annual report, verified current owner, active offers consent, and the separate han reminder preference are required. Delivery revalidates all of them, the precise computed period, canonical report destination, and unsubscribe signature. The notification ledger gives one durable delivery key per owner/chart/computed period. Fair bounded scans persist their last-check timestamp so unavailable candidates do not starve later reports.

## Release evidence

Deployment, provider smoke, and final catalog activation gates remain separate. Tests use disposable PostgreSQL and fake email providers only. Related task statuses remain In Review until deployment evidence exists.
