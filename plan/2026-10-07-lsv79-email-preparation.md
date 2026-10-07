# LSV79 recovery email preparation

## Bounded brief

Owner approval on 2026-10-07 accepts the backlog scope split and authorizes continuing LSV79 email preparation while customer outbound remains off. Complete the pending-top-up VI/EN text/HTML template and use it for private captures; prepare the first-cohort/daily-cap/emergency-stop proposal. This is a template/capture preparation milestone, not a complete production delivery runner or live rollout.

Allowed files: the pending-top-up capture service, a new recovery email renderer and focused tests, its backend export and this plan. No application UI, worker/environment activation, database migration, SMTP call, payment/account mutation or writer campaign. Current disabled/capture modes and capture-only immutable receipts remain unchanged.

## Local acceptance

- Build canonical same-order action links with the matching delivery fragment; no arbitrary host or route input.
- Render the original catalog-approved product/top-up amounts in both locales with real plain-text and escaped HTML action/unsubscribe links.
- Generate a signed owner/email-bound unsubscribe token using an injected clock and existing implementation.
- Reject malformed identifiers, held/unknown products, unsupported locale and inconsistent catalog amounts before producing content.
- Keep existing eligible-owner/consent/privacy and per-order/per-chart capture fences; never turn captured receipts into sendable or sent rows.
- Run focused renderer/preference/SMTP/disabled-mode checks and existing capture PostgreSQL tests if the environment supports an isolated container; record any unavailable verification honestly.
- Rebuild consumed workspace producers, run i18n/lint/typecheck, obtain review and CI before merge; deployment and published smoke remain mandatory before task Done.

## Proposed first live pilot (awaits separate activation approval)

- Cohort: at most five founder/internal test accounts, each verified, explicitly offers-consented and allowlisted by durable account ID. No customer address is selected by this document.
- Limit: five reserved provider attempts per UTC day across workers, at most one attempt per owner in a rolling 24 hours, existing one-per-order and at-most-two-per-chart caps retained. Count unknown outcomes against the cap.
- Use fresh eligible pending orders only; exclude old captured receipts. Hold cards/member/annual/Combo products remain excluded by the catalog.
- Stop: default disabled mode, a shared durable emergency-stop flag checked before each claim and provider call, and pausing the dedicated recovery worker. A stop does not recall an already accepted SMTP message.
- Before sending, recheck current verified/non-anonymous ownership, deletion, latest offers consent, email/global unsubscribe, owned chart/version, order/continuation/intent identity/state/TTL and confirmed catalog terms. Do not use a stale capture as current eligibility.
- Claim a durable notification row and the global daily capacity atomically under the existing coordination fence. Keep the exact delivery ID/idempotency key used by owned click receipts. Never promote historical captured rows into delivery or financial provenance.
- Existing Nodemailer transport does not honor provider idempotency keys. An expired sending lease or ambiguous SMTP result becomes `delivery_unknown`; do not auto-resend it. Exactly-once success is verified for the controlled happy path, not promised across an unknown transport outcome.
- Verify canonical owned links, unsubscribe and stop/cap behavior in isolated SMTP capture first; activate the allowlisted pilot only after the owner explicitly approves its final cohort/cap/stop setup.
- Record actual sent/click/payment allocations by source, excluding QA; do not treat captured payloads or synthetic ledger metrics as real recovery revenue.

## Remaining implementation

A durable outbound queue/claim-cap adapter, consent/ownership recheck immediately before SMTP, operator stop wiring and the controlled SMTP acceptance remain to be implemented/reviewed. This patch only completes reusable template/capture preparation. The owner does not need to revisit model/API/pricing decisions.

## Evidence

- Focused renderer/preference/SMTP-adapter/disabled-mode verification: **36 tests passed** across four files. The SMTP adapter tests use injected transport doubles; no real email was sent.
- Independent reviewer: **GO for local template/capture preparation**, with 29 independently rerun renderer/preference/SMTP tests passing. This is not a merge/deployment GO.
- Producer builds and final full-workspace `i18n:check`, `lint`, `typecheck`: **passed**. Lint retains four existing warnings and zero errors. Exact cached pnpm11.25.0 was used; its dependency auto-install check was disabled only in the command environment because this isolated checkout reuses existing installed dependency links. Producer outputs and task-run state were built in this checkout. Initial pnpm cache/task-state failures were resolved without changing repository configuration or the original checkout.
- Isolated PostgreSQL regression: **not run** because Docker API access was denied at `/var/run/docker.sock`; the capture regression now asserts both text and HTML links, but those integration assertions still require execution before merge.
- The compiled renderer produced a standalone VI/EN preview with synthetic data and disabled clickable actions: `/tmp/lsv79-recovery-email-preview-20261007.html`. No provider call, queue delivery or customer data was used.
- GitHub API access is unavailable and Kaneo refuses even reads under the current approval policy. Branch publication, PR/CI, deployment, published smoke and task updates remain pending. No task closure is claimed.
