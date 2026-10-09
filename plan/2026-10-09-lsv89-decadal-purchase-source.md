# LSV89 owned decadal purchase-source admission

## Bounded implementation brief

Implement the private PostgreSQL reader that turns an authenticated, verified
account's exact stored Ziwei chart/version into the already reviewed decadal
source. This is the source-admission dependency for the approved 480 La product
(BE-P1-7), not a quote, purchase, report reservation or activation endpoint.

Accept only chart ID, chart-version ID, current/next selection and an optional
expected period key; never accept birth inputs, an as-of clock or raw chart data.
Read actual verified non-anonymous account authority from the database, obtain
existing free-AI/recovery lifecycle locks in their established order, and retain
owner/profile/chart/version/revision/calculation locks until transaction completion.
Reject deleted profiles, pending/active account deletion, foreign/mismatched
chart-version/revision/run/provenance and unsupported/provisional pinned sources.
Return one generic unavailable error for refusals; do not reveal foreign records.
Use an injected clock sampled after lock waits; calculate the Vietnam date and
lunar year with existing timing lineage. Refuse a changed date during calculation.

Derive the current cycle from the pinned source. BE-P1-6 defines k = lunarYear -
startYear + 1 and R = 10 - k; next admission is allowed only when R <= 2.
Current admission is allowed only during that actual cycle. Freeze selected
period identity as `decade:<ordinal>:<startYear>:<endYear>` and reject a caller's
stale expected key. This identity includes the actual lunar span, not only an age
label. The prepared source remains draft/manualAccepted=false. Unknown/range time
continues to fail closed in this definite-source layer; the full provisional
product flow remains an explicit future requirement.

Scope: new private repository, pure selection/period-key helpers, focused actual
PostgreSQL admission/boundary/lifecycle/concurrency tests, backend exports and this
brief. No SQL/migration, SKU/catalog/price changes, provider calls, finance writes,
public route/API, UI, customer sends, SePay, membership or activation flags.
Caller authentication and later transactional purchase revalidation remain binding;
this returned object cannot itself authorize a debit or async report generation.

Verify actual stored schema/build exports, rebuild producers, run source/writer
and actual PostgreSQL regressions plus i18n/lint/typecheck. Independent working
and exact-head review and fresh CI precede merge; audited deployment and installed
read-only smoke precede any deployed claim. Full LSV89 stays In Progress.

## Local verification receipt

82 focused tests across four suites passed: actual PostgreSQL purchase-source
admission, reviewed actual decadal source and writer, and actual two-person source
coexistence. Independent reviewer replayed all 16 new PostgreSQL admission tests
and returned working-diff GO. Verified exact database authority, no-write owned
projection, R=3 refusal/R=2 admission, lunar Tet and actual-cycle/stale-key checks,
queued-lock fresh clock and verification change, both retained lifecycle locks,
mid-calculation Vietnam midnight refusal, invalid/deleted/foreign/substituted
sources, provisional/unknown and unavailable cycles. Existing database uniqueness
correctly rejected the initial attempted reuse of another chart's calculation
run; the corrected negative fixture substitutes run profile/revision lineage
without bypassing or changing that uniqueness constraint.

Producer rebuild, i18n parity, lint and workspace typecheck passed (four existing
unrelated warnings, zero errors). Exact-head review, fresh CI and deployed
installed smoke remain separate subsequent gates in the PR receipt. No provider,
financial/customer writes or manual/product acceptance is inferred.
