# LSV89 read-only personalized purchase context

Base: master70e84694. Implement approved BE-P1-6 via an additive field on the
existing authorized horoscope response; do not create a route or change any
financial caller. Return actual current local lunar year/month, complete lunar
month intervals remaining after the current month (a future leap month counts as
one additional interval), near-year-end flag with configurable default threshold3,
current/next decadal spans, year k in the current span and R=10-k, current/next
annual palace, and uncertain birth-time flag. Purchase context follows evaluation
date even when the separately selected horoscope target year is next year.

Allowed scope: strict contract in ziwei-horoscope-v1, pure engine projection/helper,
installed lunar-typescript1.8.6 integration using verified local declarations,
focused frozen-calendar/engine/contract/authorized-query tests, reproducible
synthetic acceptance export and this brief.
Existing owner/anonymous-expiry checks remain the response boundary. Provisional
means the existing selected time is tentative; no new birth-time inference.

No frontend, sale/provider activation, financial schema/ledger, outbound, operator
or Nginx change. Missing current cycle means no active-cycle claim; pre-cycle age
can expose the genuine first next cycle. No fabricated cycle or monthly warning.

Validation: at least seven synthetic charts/current and selected-nextyear;
Tet/calendar-year and timezone-local boundaries, normal/leap month counts,
threshold boundary, first/last cycle, provisional flags, safe projection and
existing ownership/expiry tests. Producer rebuild, i18n/lint/typecheck, independent
exact-head review, fresh CI, immutable deploy and read-only smoke precede runtime
acceptance. Full LSV89 remains open for writers, commerce activation and manual
product acceptance.

## Local evidence

Three focused suites passed 38 tests; independent reviewer repeated 39 tests
across the purchase-facts/horoscope/query scope. Producer rebuild, i18n parity,
lint and typecheck passed. Seven deterministic synthetic samples are recorded in
plan/evidence/lsv89/purchase-context-seven.json and regenerated with
node scripts/export-purchase-context-acceptance.mjs after building producers.
They carry ownerManualAccepted=false and make no live/manual acceptance claim.

The default threshold means lunar month 8 of 2026 has four complete months left
and is not near year end; month 9 has three and is near year end. Lunar month 6
of 2025 has seven complete intervals left because leap month 6 is still ahead;
in leap month 6, six intervals remain. At 2027-02-05, current context remains
lunar year 2026 even when the selected paid-report year is 2027.
