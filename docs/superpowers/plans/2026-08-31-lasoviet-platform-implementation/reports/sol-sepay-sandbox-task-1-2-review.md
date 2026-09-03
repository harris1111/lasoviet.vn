# Sol SePay Sandbox Tasks 1-2 Review

**Date:** 2026-09-03
**Reviewed range:** `baf6e2bed9229b28d5e0d5bfdb7b16041536c993..200b85222a8b6eedb4692a76f31aed27c73bd214`
**Verdict:** `SAFE_TO_PUSH_AND_RERUN_VPS_GATE`

## Findings

No code findings.

## Verification Evidence

- Test-only correction commit
  `200b85222a8b6eedb4692a76f31aed27c73bd214` aligned migration `0010`
  actor/key/fingerprint receipts and made the outbox-claim fixture derive time
  from persisted `availableAt`, isolate rows, and bind dispatch assertions to
  the target event.
- The scoped re-review returned this verdict with no open findings.
- Focused verification passed 52 tests.
- Scoped ESLint, i18n parity, affected typechecks and builds, a Next production
  build, and `git diff --check` passed.
- The local controller reran the three changed test files: 13 tests passed.
- The Windows host could not run the PostgreSQL Testcontainers suite because
  no container runtime is available. The focused Docker VPS gate subsequently
  passed four test files with 18 tests and zero failures after the workspace
  producer build passed.

## VPS Deployment Evidence

- The branch `feature/paid-flow-admin-operations` deployed at
  `200b85222a8b6eedb4692a76f31aed27c73bd214`. A verified PostgreSQL
  pre-deploy backup existed before deployment.
- Compose deployment succeeded: migration exited `0`; PostgreSQL, Redis, API,
  and web were healthy; and the worker was running. The database reported 12
  applied migrations, the requested commerce/report tables, and both report
  outbox indexes. Loopback and public HTTPS health returned `200`.
- Public synthetic SePay IPN probes returned `401` for a wrong secret and the
  exact HTTP `200` success acknowledgement for an authenticated non-paid
  `TRANSACTION_VOID`. Commerce order, payment, entitlement, and reservation
  aggregate counts were unchanged.
- Browser smoke rendered live VI/EN home pages. Unauthenticated EN checkout
  preserved its `/en/thanh-toan/...` callback to EN login; after locale
  switching, VI checkout preserved its `/thanh-toan/...` callback to VI login.
- Direct production execution of existing Playwright specs failed before the
  tested form flow because their locale cookie domain is `127.0.0.1`. This is
  a local-runtime harness limitation, not passing evidence or a production
  defect.
- No real order, paid notification, real-money payment, production payment
  activation, Nginx/DNS change, or credential output occurred. The sandbox
  endpoint is deployed. The remaining external step is the founder clicking
  SePay dashboard `Send test`; production activation remains
  founder-controlled.

## Rule Evaluation

Candidate: none.

Action: no new `AGENTS.md` rule. Existing workspace producer build-order,
runtime-clock fixture, and payment-boundary rules cover the correction and VPS
gate evidence.

## Open Questions

None.
