# PR244 deployed feedback validation — 2026-10-01

## Immutable release

- PR243 (evidence) and PR244 (bounded feedback/telemetry wiring) merged.
- PR244 merge revision: `8d483fc49200b43fdf94762aa3dca39a2bc0bde6`.
- GitHub release run `36847434515` completed successfully.
- Web, API and worker are healthy at that exact revision; canonical and
  loopback build asset sets match.

## Runtime findings — not acceptance

The opt-in smoke recorded 16 passing checks and four failed real-feedback
checks. Overall status is **BLOCKED**, not PASS.

- Real free-feedback submissions fail with HTTP403
  `REQUEST_ORIGIN_INVALID` in VI/EN at 390px and 1280px.
- The browser Origin is canonical, while the handler compares it with the
  internal request URL. A bounded trusted-canonical-origin fix is required.
- Repeated `welcome_grant` telemetry returns HTTP409. A prior event exists
  with matching properties; that does **not** establish successful replay.
  Do not delete existing events or change keys to manufacture a PASS.
- Browser-only 401/422/malformed200 feedback fault injection passes; these
  checks do not represent actual backend rejection evidence.
- Wallet balance and real guarantee-claim counts remain unchanged.
- AI attempts, report jobs and reservations remain unchanged.
- Owned reader navigation/print, anonymous denial, notice dismissal and
  account/top-up availability remain passing.

The initial, diagnostic and error-code runs are preserved separately. The
harness requires a new, non-existing output filename for feedback validation,
so earlier release evidence cannot be overwritten accidentally.

## Local, synthetic verification

- Five isolated browser fixtures pass: paid feedback and guarantee telemetry
  in VI/EN; 401/422/malformed200 failures; stable retry keys; no success event
  or refresh on failed claims. Every network call is intercepted locally.
- Twelve focused backend guarantee/service tests pass, including isolated
  database integration. These are not staging refund evidence.
- Thirty focused analytics/feedback/projection tests pass.
- Fast pre-push i18n, lint and monorepo typecheck pass (five existing warnings,
  zero lint errors).

## Closure boundary

LSV-57 and LSV-59 remain **In Review**. LSV-57 additionally lacks the
authoritative `upgrade_purchased` caller and successful telemetry replay.
LSV-59 still requires full free/paid-part scope and deployed guarantee
acceptance. LSV-53 has an independently reviewed structural concern fallback
follow-up; it is not yet a full-scope Done approval. Owner holds on LSV-64 and
LSV-66 are unchanged.
