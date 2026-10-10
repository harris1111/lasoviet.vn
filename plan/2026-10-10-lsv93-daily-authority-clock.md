# LSV93 daily authority clock

Bounded backend correctness slice: a daily read currently freezes its clock before asynchronous chart/access authorization. If that work crosses Vietnam midnight or grant expiry, it can return yesterday's paid content under an expired grant. Re-sample the injected clock after chart authorization for access lookup, then after access authorization for final grant/date validation. Keep the writer's final date and quality clock consistent. Preserve existing error identities and read-only behavior.

Allowed files: personal-daily-reading.service.ts and its unit test; the existing wallet-unlock.repository.integration.test.ts daily purchase/read regression; this plan and installed synthetic smoke/evidence. No route/SKU/pricing, catalog release, frontend, package/migration, provider, operator setting, wallet write or activation changes. Implement interactively because the configured Flash executor remains unavailable; use independent Sol review.

Verify frozen/injected clocks immediately before/at Vietnam midnight, delayed chart and delayed grant authorization, expiry within one day, valid long grant across midnight and stale stored content rejection. Exercise actual PostgreSQL purchased-read authority and foreign ownership with exact before/after wallet, intent, ledger, allocation, entitlement and stored-unlock equality. Rebuild backend producer, i18n/lint/typecheck, independent exact-head review, fresh CI, final composition and installed-image smoke before release. Hold merge until preceding PR385 deployment completes. Retain LSV93 open for catalog/tiểu hạn and wider calendar/manual acceptance; optional weekly work has no activation in this slice.

## Local verification

69/69 tests across the service and full wallet PostgreSQL suite PASS. Independent targeted replay13/13 PASS, with56 filtered tests explicitly excluded from that reviewer claim. Producer build, i18n/lint/typecheck and diff check PASS. Baseline installed synthetic probe reproduces missing expiry refusal; fixed compiled package smoke PASS. These are isolated/synthetic effects only, not customer acceptance. Exact-head review, fresh CI and actual deployment remain pending.
