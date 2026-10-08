# LSV79 durable recovery runner preparation

Owner authorizes all feasible backend preparation on 2026-10-08. Implement a
fresh-order queue with durable shared stop, atomic daily/owner reservations and
pre-provider current eligibility rechecks. No application/worker/env activation,
real SMTP/customer mail, financial mutation or historical-capture promotion.

Proposed controlled pilot defaults: up to 5 explicit internal account IDs, at most
5 reserved attempts per UTC day,1 per owner in rolling 24 hours,1 per order and 2 per
chart. Counts include unknown outcomes; no automatic retry or lease resend.
These defaults prepare the already documented proposal; actual cohort/activation
approval remains a single owner input. Keep old immutable captures isolated.

The delivery runner uses an injected provider only. Production wiring stays off.
The send transaction holds purge/preference coordination across the final current
eligibility read and bounded provider call; emergency stop serializes with that
boundary and cannot recall a provider-accepted message. Exceptions/ambiguous
outcomes persist delivery_unknown and consume the attempt. Two-phase claim/final
read permits consent changes between claim and send. Store only IDs/fingerprint
and delivery outcome, rebuild current message from authoritative records.

Verify isolated PostgreSQL concurrency, UTC rollover/rolling owner window,
consent/delete/unsubscribe/recalculation/payment/stop changes between claim/send,
old capture exclusion, injected provider success and unknown outcome. Never call
an external provider from tests. Required checks, independent review, CI and
actual deploy/smoke precede any runtime closure. Live controlled SMTP acceptance
and final pilot approval stay in LSV85.

## Release dependency

Migration 0063 depends on LSV86/0062 being merged/deployed first. Its reserved journal
idx63 must remain after idx62 when branches reconcile; never deploy 0063 first or the
timestamp migrator could skip 0062. Current default stopped row and empty cohort
remain inactive. Private authorization/audit operator wiring and production
worker composition are separately pending; no unaudited control setter is added.
