# LSV91 private Bazi decadal factual source

## Bounded implementation brief

Complete the missing factual decadal projection over the installed pinned
lunar-typescript 1.8.6 engine, before Bazi writer/commerce work. Read local typings
and actual Yun/DaYun source before implementation. Keep the existing normalized
Bazi v1 output, source/run hashes, mapping versions and immutable persistence
unchanged; this is a separate private draft-source DTO and pure adapter.

Trusted callers supply the actual resolved Bazi input, its stored normalized
chart and explicit stored male/female gender. Recompute that chart at its frozen
calculatedAt and require complete equality. Reject missing gender, unknown hour
or alternatives instead of guessing direction or start time. Ownership and
lifecycle authorization remain the caller's responsibility; the DTO/hash cannot
substitute for the deployed owned Bazi repository.

Use the existing UTC+8 solar-term clock for Yun year/month and direction, retaining
the chart's local-civil day master. The separate Yun minute algorithm (sect=2)
is explicitly versioned as a draft vendor method; it is not inferred from the
existing midnight EightChar sect setting and is not claimed owner/traditional
acceptance. Project the actual computed first start at UTC+8 and all ten genuine
DaYun entries1..10, with original vendor civil-year/counting-age ranges, canonical
stem/branch IDs and actual day-master-relative Ten Gods/hidden stems. Keep vendor
entry0 separate as a pre-cycle interval (including a genuine empty interval).
Do not treat entry0 as a ten-year cycle, assign a current cycle from coarse year
ranges, infer exact later-cycle boundaries, reuse Ziwei lunar ages, invent
fortune/compatibility scores, or expose original birth inputs/start-delay fields.

Add a closed versioned contract, pure engine builder/exports, pinned actual vendor
consistency/reference tests across at least30 synthetic gender/date cases,
timezone/solar-term/late-Zi boundaries, pre-cycle/empty interval and tamper/unknown
refusals. The reference tests establish adapter/vendor consistency; independent
traditional/manual validation remains a distinct full LSV91 gate. Source output
remains draft/manualAccepted=false; no provider, SQL, stored-output rewrite,
commerce/SKU/price, public route/API/UI, outbound or activation changes.

Rebuild producers, run focused source/normalized Bazi regressions and required
i18n/lint/typecheck; independent working/exact-head review and fresh CI precede
merge. Audited deployment and installed pure read-only smoke precede any installed
claim. Full LSV91/66 remain In Progress; Bazi writers, actual full decadal reference
acceptance and840/960/1500La commerce/delivery/FE/manual gates remain explicit.

## Verification receipt

- Producer builds and required i18n, lint and typecheck passed; lint retained four
  existing warnings with zero errors.
- Focused regression run passed 214 tests in six suites, including the 39 new
  source tests and actual PostgreSQL owned decadal admission regressions.
- Independent reviewer replayed all 39 source tests and returned working-tree GO.
- Compiled local installed-export smoke passed the pinned vendor references, ten
  genuine cycles, empty pre-cycle, gender identity and unknown/foreign refusals;
  normalized Bazi v1 remained unchanged. Database/provider/financial/customer
  effects were zero. No independent traditional/manual acceptance was claimed.
- Exact-head review, fresh CI and audited release/install smoke remain release
  gates; full LSV91/66 remain open for their outstanding product scope.
