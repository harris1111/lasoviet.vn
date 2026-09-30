# LSV-64 Membership Execution Brief

Owner authorization: the 2026-09-30 actionable-backlog request, Kaneo #64, and the owner's 2026-09-27 handoff. The founder was notified before UI implementation by the orchestrator on 2026-09-30.

## Scope and precedence

Implement account memberships bought explicitly with Lá: monthly 1,500 / 30 days and yearly 8,000 / 365 days. Purchases and manual renewals use atomic wallet continuations and append subscription periods. Authorization checks use an injected clock and stop at expiry. No background path may initiate a renewal or wallet spend.

The current task and FD-105 explicitly require the better of the membership price and rollover price. They supersede the older proposed architecture example of applying 20% to 720. Lifetime examples: no rollover -> 768; rollover to 720 -> 720; never 576.

Implement mobile membership controls using existing wallet confirmation and balance patterns. Keep unavailable benefits visibly marked as forthcoming. Do not remove the release gate or promise monthly/tool delivery before those implementations are accepted and deployed.

## Dependencies and boundaries

- Daily authorization and purchase infrastructure: PR #213.
- Atomic restoration and once-per-account guarantee: PR #210.
- Notification preference, consent, unsubscribe, and delivery deduplication: PR #212.
- Migration allocation: 0051; reconcile chronological journal entries with preceding allocated migrations before release.
- Dedicated feature branch and PR into master. No direct master writes, production mutations, deployment, or Done transition.

## Deliverables

1. Immutable membership plan terms and wallet-backed subscription periods; verified, non-anonymous accounts only.
2. Idempotent account-level membership intents and explicit purchase/renewal APIs. Renewal appends to the latest eligible period; it does not overwrite history.
3. Read-time access and 20% pricing integrated with immutable wallet intent validation and restored-spend denial. Compare discounts without stacking.
4. Daily benefit authorization through the personal daily service and included monthly reading entitlement with zero-price audit lineage. Monthly generation/read access requires current membership, and expiration permits a separate paid purchase for the same period. Future tool benefits and unaccepted editorial products remain visibly unavailable.
5. One consent-respecting reminder approximately three days before final expiry, with durable deduplication and the existing email delivery retry/unsubscribe behavior. A later renewal suppresses obsolete reminders.
6. Mobile-first membership UI and bilingual message parity; registry coverage for new private API routes.

## Required evidence

Frozen-clock PostgreSQL tests for atomic purchase, insufficient funds, replay/conflict, concurrent renewal, exact expiry, restoration, and discount comparison. Reminder tests for consent, unsubscribe, renewal suppression, duplicate sweeps, and zero automatic spending. Focused UI/API validation plus i18n, lint, typecheck, and schema migration rewind checks.

Release remains gated by independent review, real target deployment, and smoke evidence. Code completion does not establish production readiness.

## Integration evidence

Includes the shared natal reservation authority from PR #227, explicit top-up continuation from PR #230, and monthly/yearly report delivery from PR #232. Dedicated period/topic reports do not use the natal cache. The monthly resolver is forwarded through authenticated top-up settlement; a changed lunar period preserves the credited balance and blocks the stale continuation. Migration entries 0046–0052 remain contiguous.

Frozen-clock wallet integration: 25 tests passed, including concurrent included-monthly replay without debit, exact membership expiry denying generation/read access, standalone paid repurchase, free claims not consuming the guarantee, and discounted paid reports retaining access after membership expiry. Top-up integration: 18 tests passed, including the unchanged and changed lunar-period settlement cases.
